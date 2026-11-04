import type { DependencyGraph } from '../../../types/dependencyGraph.js';
import type { ProjectAnalysisSnapshot } from '../../../types/projectAnalysisSnapshot.js';
import { createSourceGraphFromProjectAnalysisSnapshots } from '../../source-graph/composition/createSourceGraphFromProjectAnalysisSnapshots.js';
import { projectDependencyGraphFromProjectAnalysisSnapshots } from '../application/projectDependencyGraphFromProjectAnalysisSnapshots.js';

/*** Recompose portable project snapshots into the canonical dependency graph. */
export function createDependencyGraphFromProjectAnalysisSnapshots(
  snapshots: readonly ProjectAnalysisSnapshot[],
): DependencyGraph {
  return projectDependencyGraphFromProjectAnalysisSnapshots(
    createSourceGraphFromProjectAnalysisSnapshots(snapshots),
    snapshots,
  );
}
