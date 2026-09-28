import { inspectProjectAsync } from '@ankhorage/project-detector/node';

import type { CreateSourceGraphInput, SourceGraph } from '../../../types/sourceGraph.js';
import { createSourceGraphFromInspectionsAsync } from './createSourceGraphFromInspectionsAsync.js';

/*** Inspect project roots, then build the canonical source graph from their bounded scan. */
export async function createSourceGraphAsync(input: CreateSourceGraphInput): Promise<SourceGraph> {
  const projects = await Promise.all(
    input.projects.map(async ({ id, rootPath }) => ({
      id,
      inspection: await inspectProjectAsync(rootPath, {
        ...(input.signal === undefined ? {} : { signal: input.signal }),
      }),
    })),
  );
  return createSourceGraphFromInspectionsAsync({
    projects,
    ...(input.signal === undefined ? {} : { signal: input.signal }),
  });
}
