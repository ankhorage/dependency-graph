import type { GraphEdge, GraphNode } from '@ankhorage/graph';

import type {
  SourceEdgeData,
  SourceGraph,
  SourceGraphIndex,
  SourceNodeData,
} from '../../../types/sourceGraph.js';

/*** Build reusable semantic and adjacency indexes once from observed source facts. */
export function createSourceGraphIndex(sourceGraph: SourceGraph): SourceGraphIndex {
  const nodeById = new Map<number, GraphNode<SourceNodeData, number>>();
  const nodeBySemanticPath = new Map<string, GraphNode<SourceNodeData, number>>();
  const fileByPath = new Map<string, GraphNode<SourceNodeData, number>>();
  const symbolsByFileAndName = new Map<string, GraphNode<SourceNodeData, number>[]>();
  const incomingByNodeId = new Map<number, GraphEdge<SourceEdgeData, number, number>[]>();
  const outgoingByNodeId = new Map<number, GraphEdge<SourceEdgeData, number, number>[]>();
  const parentByNodeId = new Map<number, number>();

  // Local map mutation constructs lookup tables without rescanning on consumer queries.
  for (const node of sourceGraph.graph.nodes) {
    nodeById.set(node.id, node);
    nodeBySemanticPath.set(node.data.semanticPath, node);
    incomingByNodeId.set(node.id, []);
    outgoingByNodeId.set(node.id, []);
    if (node.data.kind === 'file' && node.data.path !== undefined) {
      fileByPath.set(fileKey(node.data.projectId, node.data.path), node);
    }
    if (node.data.filePath !== undefined && isDeclaration(node.data.kind)) {
      const key = symbolKey(node.data.projectId, node.data.filePath, node.data.name);
      symbolsByFileAndName.set(key, [...(symbolsByFileAndName.get(key) ?? []), node]);
    }
  }

  for (const edge of sourceGraph.graph.edges) {
    outgoingByNodeId.get(edge.source)?.push(edge);
    incomingByNodeId.get(edge.target)?.push(edge);
    if (edge.data.kind === 'contains') {
      const existing = parentByNodeId.get(edge.target);
      if (existing !== undefined && existing !== edge.source) {
        throw new Error(`Source node ${edge.target} has multiple containment parents.`);
      }
      parentByNodeId.set(edge.target, edge.source);
    }
  }

  return {
    nodeById,
    nodeBySemanticPath,
    fileByPath,
    symbolsByFileAndName,
    incomingByNodeId,
    outgoingByNodeId,
    parentByNodeId,
  };
}

/*** Distinguish declarations from container and external-package nodes. */
function isDeclaration(kind: SourceNodeData['kind']): boolean {
  return kind !== 'project' && kind !== 'package' && kind !== 'directory' && kind !== 'file';
}

/*** Scope a path lookup to one observed project. */
function fileKey(projectId: string, path: string): string {
  return `${projectId}\u0000${path}`;
}

/*** Scope a symbol lookup to its project, file, and human-readable name. */
function symbolKey(projectId: string, path: string, name: string): string {
  return `${fileKey(projectId, path)}\u0000${name}`;
}
