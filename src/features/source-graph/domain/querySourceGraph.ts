import type { GraphEdge, GraphNode } from '@ankhorage/graph';

import type {
  SourceEdgeData,
  SourceGraphIndex,
  SourceNodeData,
  SourceRelationView,
} from '../../../types/sourceGraph.js';

/*** Resolve a stable semantic identity without exposing its local numeric ID. */
export function findSourceNode(
  index: SourceGraphIndex,
  semanticPath: string,
): GraphNode<SourceNodeData, number> | undefined {
  return index.nodeBySemanticPath.get(semanticPath);
}

/*** Resolve a file in one project by its project-relative portable path. */
export function findSourceFile(
  index: SourceGraphIndex,
  projectId: string,
  path: string,
): GraphNode<SourceNodeData, number> | undefined {
  return index.fileByPath.get(`${projectId}\u0000${path}`);
}

/*** Resolve declarations by project, file, and source-level name. */
export function findSourceSymbols(
  index: SourceGraphIndex,
  projectId: string,
  path: string,
  name: string,
): readonly GraphNode<SourceNodeData, number>[] {
  return index.symbolsByFileAndName.get(`${projectId}\u0000${path}\u0000${name}`) ?? [];
}

/*** Read relationships emitted from a semantic node in index time. */
export function outgoingSourceRelations(
  index: SourceGraphIndex,
  semanticPath: string,
): readonly SourceRelationView[] {
  const node = findSourceNode(index, semanticPath);
  return node === undefined
    ? []
    : (index.outgoingByNodeId.get(node.id) ?? []).map((edge) => relationView(index, edge));
}

/*** Read relationships targeting a semantic node in index time. */
export function incomingSourceRelations(
  index: SourceGraphIndex,
  semanticPath: string,
): readonly SourceRelationView[] {
  const node = findSourceNode(index, semanticPath);
  return node === undefined
    ? []
    : (index.incomingByNodeId.get(node.id) ?? []).map((edge) => relationView(index, edge));
}

/*** Resolve direct observed relationships between two stable semantic identities. */
export function findSourceRelationsBetween(
  index: SourceGraphIndex,
  sourceSemanticPath: string,
  targetSemanticPath: string,
): readonly SourceRelationView[] {
  return outgoingSourceRelations(index, sourceSemanticPath).filter(
    ({ target }) => target.semanticPath === targetSemanticPath,
  );
}

/*** Join an indexed edge to semantic endpoint data in constant time. */
function relationView(
  index: SourceGraphIndex,
  edge: GraphEdge<SourceEdgeData, number, number>,
): SourceRelationView {
  const source = index.nodeById.get(edge.source)?.data;
  const target = index.nodeById.get(edge.target)?.data;
  if (source === undefined || target === undefined) {
    throw new Error(`Source relation ${edge.id} has an unknown endpoint.`);
  }
  return { edgeId: edge.id, kind: edge.data.kind, source, target, evidence: edge.data.evidence };
}
