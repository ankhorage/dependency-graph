import type {
  CreateSourceGraphFromInspectionsInput,
  SourceGraph,
} from '../../../types/sourceGraph.js';
import { createProjectAnalysisSnapshotAsync } from './createProjectAnalysisSnapshotAsync.js';
import { createSourceGraphFromProjectAnalysisSnapshots } from './createSourceGraphFromProjectAnalysisSnapshots.js';

/*** Analyze inspected files once into a language-neutral factual source graph. */
export async function createSourceGraphFromInspectionsAsync(
  input: CreateSourceGraphFromInspectionsInput,
): Promise<SourceGraph> {
  const snapshots = await Promise.all(
    input.projects.map(({ id, inspection }) =>
      createProjectAnalysisSnapshotAsync({
        id,
        inspection,
        ...(input.signal === undefined ? {} : { signal: input.signal }),
      }),
    ),
  );
  return createSourceGraphFromProjectAnalysisSnapshots(snapshots);
}
