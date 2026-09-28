import { createGraph } from '@ankhorage/graph';

import type {
  SourceCapabilityReport,
  SourceEdgeDraft,
  SourceGraph,
  SourceGraphDraft,
  SourceNodeDraft,
} from '../../../types/sourceGraph.js';

/*** Assign dense numeric IDs to deterministic factual source nodes and edges. */
export function createSourceGraph(draft: SourceGraphDraft): SourceGraph {
  const nodes = [...draft.nodes].sort(compareNodeDrafts);
  assertUniqueSemanticPaths(nodes);
  const idBySemanticPath = new Map(nodes.map((node, id) => [node.data.semanticPath, id] as const));
  const edges = [...draft.edges].sort(compareEdgeDrafts).map((edge, id) => ({
    id,
    source: requiredNodeId(idBySemanticPath, edge.source),
    target: requiredNodeId(idBySemanticPath, edge.target),
    data: edge.data,
  }));

  return {
    version: 1,
    graph: createGraph({
      nodes: nodes.map((node, id) => ({ id, data: node.data })),
      edges,
    }),
    capabilities: [...draft.capabilities].map(sortCapabilities).sort(compareCapabilityReports),
  };
}

/*** Reject ambiguous stable identities before assigning compact IDs. */
function assertUniqueSemanticPaths(nodes: readonly SourceNodeDraft[]): void {
  const seen = new Set<string>();
  for (const node of nodes) {
    const key = node.data.semanticPath;
    if (key.trim() === '') throw new Error('Source nodes require a semantic path.');
    if (seen.has(key)) throw new Error(`Duplicate source semantic path: ${key}.`);
    seen.add(key);
  }
}

/*** Resolve one edge endpoint from the semantic identity index. */
function requiredNodeId(ids: ReadonlyMap<string, number>, semanticPath: string): number {
  const id = ids.get(semanticPath);
  if (id === undefined) throw new Error(`Unknown source semantic path: ${semanticPath}.`);
  return id;
}

/*** Order semantic nodes without host-locale behavior. */
function compareNodeDrafts(left: SourceNodeDraft, right: SourceNodeDraft): number {
  return compareText(left.data.semanticPath, right.data.semanticPath);
}

/*** Order observed relations by semantic endpoints, kind, and evidence. */
function compareEdgeDrafts(left: SourceEdgeDraft, right: SourceEdgeDraft): number {
  return (
    compareText(left.source, right.source) ||
    compareText(left.target, right.target) ||
    compareText(left.data.kind, right.data.kind) ||
    compareText(evidenceKey(left), evidenceKey(right))
  );
}

/*** Build a stable ordering key from exact analyzer evidence. */
function evidenceKey(edge: SourceEdgeDraft): string {
  return edge.data.evidence
    .map(
      ({ analyzerId, sourcePath, location, specifier }) =>
        `${analyzerId}\u0000${sourcePath}\u0000${location?.line ?? ''}\u0000${location?.column ?? ''}\u0000${specifier ?? ''}`,
    )
    .sort(compareText)
    .join('\u0001');
}

/*** Canonicalize each analyzer's explicit available-capability list. */
function sortCapabilities(report: SourceCapabilityReport): SourceCapabilityReport {
  return { ...report, available: [...report.available].sort(compareText) };
}

/*** Keep analyzer provenance order stable in serialized snapshots. */
function compareCapabilityReports(
  left: SourceCapabilityReport,
  right: SourceCapabilityReport,
): number {
  return (
    compareText(left.projectId, right.projectId) || compareText(left.analyzerId, right.analyzerId)
  );
}

/*** Compare portable identities by code unit rather than process locale. */
function compareText(left: string, right: string): number {
  if (left < right) return -1;
  return left > right ? 1 : 0;
}
