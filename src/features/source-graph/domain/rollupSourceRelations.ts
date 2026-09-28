import type {
  SourceGraph,
  SourceGraphIndex,
  SourceRollupEdge,
} from '../../../types/sourceGraph.js';

/*** Aggregate observed relationships at the requested containment level, preserving edge IDs. */
export function rollupSourceRelations(
  sourceGraph: SourceGraph,
  index: SourceGraphIndex,
  aggregateKind: 'project' | 'package' | 'directory' | 'file',
  relationKind: 'imports' | 'exports' | 'extends' | 'implements' = 'imports',
): readonly SourceRollupEdge[] {
  const nodesById = new Map(sourceGraph.graph.nodes.map((node) => [node.id, node.data]));
  const namespaceByFileId = new Map(
    sourceGraph.graph.edges.flatMap((edge) =>
      edge.data.kind === 'declares-in' ? [[edge.source, edge.target] as const] : [],
    ),
  );
  const pairs = new Map<string, SourceRollupEdge>();
  for (const edge of sourceGraph.graph.edges) {
    if (edge.data.kind !== relationKind) continue;
    const source = ancestorOfKind(edge.source, aggregateKind, nodesById, namespaceByFileId, index);
    const target = ancestorOfKind(edge.target, aggregateKind, nodesById, namespaceByFileId, index);
    if (source === undefined || target === undefined || source === target) continue;
    const sourceSemanticPath = nodesById.get(source)?.semanticPath;
    const targetSemanticPath = nodesById.get(target)?.semanticPath;
    if (sourceSemanticPath === undefined || targetSemanticPath === undefined) continue;
    const key = `${source}\u0000${target}`;
    const previous = pairs.get(key);
    pairs.set(key, {
      source,
      target,
      sourceSemanticPath,
      targetSemanticPath,
      weight: (previous?.weight ?? 0) + 1,
      evidenceEdgeIds: [...(previous?.evidenceEdgeIds ?? []), edge.id],
    });
  }
  return [...pairs.values()].sort(
    (left, right) => left.source - right.source || left.target - right.target,
  );
}

/*** Ascend factual containment to one requested projection level. */
function ancestorOfKind(
  nodeId: number,
  kind: 'project' | 'package' | 'directory' | 'file',
  nodes: ReadonlyMap<number, SourceGraph['graph']['nodes'][number]['data']>,
  namespaces: ReadonlyMap<number, number>,
  index: SourceGraphIndex,
): number | undefined {
  let current: number | undefined = nodeId;
  while (current !== undefined) {
    if (kind === 'package' && nodes.get(current)?.kind === 'file') {
      const namespace = namespaces.get(current);
      if (namespace !== undefined) return namespace;
    }
    if (nodes.get(current)?.kind === kind) return current;
    current = index.parentByNodeId.get(current);
  }
  const classification = nodes.get(nodeId)?.classification;
  return classification === 'vendor' || classification === 'unknown' ? nodeId : undefined;
}
