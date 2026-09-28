import { inspectProjectAsync } from '@ankhorage/project-detector/node';

import type {
  CreateDependencyGraphInput,
  DependencyGraph,
} from '../../../types/dependencyGraph.js';
import { assertDependencyGraphProjectIds } from '../application/assertDependencyGraphProjectIds.js';
import { createDependencyGraphFromInspectionsAsync } from './createDependencyGraphFromInspectionsAsync.js';

/*** Inspect project roots, then delegate dependency topology construction to the inspection API. */
export async function createDependencyGraphAsync(
  input: CreateDependencyGraphInput,
): Promise<DependencyGraph> {
  assertDependencyGraphProjectIds(input.projects);
  const projects = await Promise.all(
    input.projects.map(async (project) => ({
      id: project.id,
      inspection: await inspectProjectAsync(project.rootPath, {
        ...(input.signal === undefined ? {} : { signal: input.signal }),
      }),
    })),
  );

  return createDependencyGraphFromInspectionsAsync({
    projects,
    ...(input.signal === undefined ? {} : { signal: input.signal }),
  });
}
