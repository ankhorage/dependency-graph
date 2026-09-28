import type {
  SourceGraph,
  SourceGraphIndex,
  SourceNodeKind,
  SourceNodeSummary,
} from '../../../types/sourceGraph.js';

/*** Recompute one container summary from canonical containment and observed relations. */
export function summarizeSourceNode(
  sourceGraph: SourceGraph,
  index: SourceGraphIndex,
  semanticPath: string,
): SourceNodeSummary | undefined {
  const root = index.nodeBySemanticPath.get(semanticPath);
  if (root === undefined) return undefined;
  const nodesById = new Map(sourceGraph.graph.nodes.map((node) => [node.id, node]));
  const descendantCounts = new Map<SourceNodeKind, number>();
  const dependencies = { intrinsic: 0, vendor: 0, unknown: 0 };
  const exports = { runtime: 0, typeOnly: 0 };
  let incomingRelations = 0;
  let outgoingRelations = 0;

  for (const node of sourceGraph.graph.nodes) {
    if (node.id === root.id || !isDescendant(node.id, root.id, index)) continue;
    descendantCounts.set(node.data.kind, (descendantCounts.get(node.data.kind) ?? 0) + 1);
  }

  for (const edge of sourceGraph.graph.edges) {
    if (containsNode(edge.source, root.id, index)) {
      outgoingRelations += 1;
      if (edge.data.kind === 'imports') {
        countDependency(dependencies, nodesById.get(edge.target)?.data.classification);
      }
      if (edge.data.kind === 'exports') {
        if (nodesById.get(edge.target)?.data.typeOnly === true) exports.typeOnly += 1;
        else exports.runtime += 1;
      }
    }
    if (containsNode(edge.target, root.id, index)) incomingRelations += 1;
  }

  const descendants = Object.fromEntries(descendantCounts) as Partial<
    Record<SourceNodeKind, number>
  >;
  return {
    nodeId: root.id,
    descendants,
    exports,
    incomingRelations,
    outgoingRelations,
    dependencies,
  };
}

/*** Include a container itself as well as its descendants. */
function containsNode(nodeId: number, rootId: number, index: SourceGraphIndex): boolean {
  return nodeId === rootId || isDescendant(nodeId, rootId, index);
}

/*** Count a factual import target using its known classification. */
function countDependency(
  counts: { intrinsic: number; vendor: number; unknown: number },
  classification: 'intrinsic' | 'vendor' | 'unknown' | undefined,
): void {
  if (classification === 'intrinsic') counts.intrinsic += 1;
  else if (classification === 'vendor') counts.vendor += 1;
  else counts.unknown += 1;
}

/*** Follow indexed parents rather than rescanning containment edges. */
function isDescendant(nodeId: number, ancestorId: number, index: SourceGraphIndex): boolean {
  let current = index.parentByNodeId.get(nodeId);
  while (current !== undefined) {
    if (current === ancestorId) return true;
    current = index.parentByNodeId.get(current);
  }
  return false;
}
