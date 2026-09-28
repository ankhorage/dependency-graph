import type {
  CreateDependencyGraphFromInspectionsInput,
  DependencyGraph,
} from '../../../types/dependencyGraph.js';
import { createSourceGraphFromInspectionsAsync } from '../../source-graph/composition/createSourceGraphFromInspectionsAsync.js';
import { assertDependencyGraphInspections } from '../application/assertDependencyGraphInspections.js';
import { projectDependencyGraphFromInspections } from '../application/projectDependencyGraphFromInspections.js';

/*** Build the established dependency view from one canonical source analysis. */
export async function createDependencyGraphFromInspectionsAsync(
  input: CreateDependencyGraphFromInspectionsInput,
): Promise<DependencyGraph> {
  assertDependencyGraphInspections(input.projects);
  const sourceGraph = await createSourceGraphFromInspectionsAsync({
    projects: input.projects,
    ...(input.signal === undefined ? {} : { signal: input.signal }),
  });
  return projectDependencyGraphFromInspections(sourceGraph, input.projects);
}
