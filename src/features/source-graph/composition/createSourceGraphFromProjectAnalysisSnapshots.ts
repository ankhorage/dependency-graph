import type { ProjectAnalysisSnapshot } from '../../../types/projectAnalysisSnapshot.js';
import type { SourceAnalyzedFile, SourceGraph } from '../../../types/sourceGraph.js';
import { createSourceGraph } from '../domain/createSourceGraph.js';
import { createSourceRelationDraft } from '../domain/createSourceRelationDraft.js';
import { createSourceStructureDraft } from '../domain/createSourceStructureDraft.js';
import { assertProjectAnalysisSnapshot } from '../domain/projectAnalysisSnapshot.js';

/*** Recompose portable project facts through the canonical structure and relation pipeline. */
export function createSourceGraphFromProjectAnalysisSnapshots(
  snapshots: readonly ProjectAnalysisSnapshot[],
): SourceGraph {
  assertSnapshots(snapshots);
  const files = snapshots.flatMap((snapshot) =>
    snapshot.analyzedFiles.map((file): SourceAnalyzedFile => ({
      projectId: snapshot.projectId,
      analyzerId: file.analyzerId,
      facts: file.facts,
      path: file.path,
      ...(file.declaredDependencies === undefined
        ? {}
        : { declaredDependencies: file.declaredDependencies }),
    })),
  );
  const structure = createSourceStructureDraft(snapshots, files);
  return createSourceGraph(createSourceRelationDraft(structure, files));
}

/*** Reject duplicate identities and unsupported snapshot contracts before any relation is resolved. */
function assertSnapshots(snapshots: readonly ProjectAnalysisSnapshot[]): void {
  const ids = new Set<string>();
  for (const snapshot of snapshots) {
    assertProjectAnalysisSnapshot(snapshot);
    if (ids.has(snapshot.projectId)) {
      throw new Error(`Duplicate project analysis snapshot ID: ${snapshot.projectId}.`);
    }
    ids.add(snapshot.projectId);
  }
}
