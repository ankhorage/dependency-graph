import { createApi } from '@ankhorage/api';

import type { DependencyGraphApiInput } from '../../../../../types/dependencyGraphApi.js';
import { createDependencyGraphAsync } from '../../../composition/createDependencyGraphAsync.js';

/*** Expose dependency graph creation through the canonical framework-neutral Ankhorage API action. */
export const dependencyGraphApi = createApi({
  definition: {
    id: 'dependency-graph',
    origin: 'internal',
    protocol: 'rest',
    basePath: '/api/dependency-graph',
    endpoints: {
      actions: {
        id: 'actions',
        kind: 'http',
        operations: {
          'dependency-graph': {
            id: 'dependency-graph',
            endpointId: 'actions',
            protocol: 'http',
            intent: 'action',
            method: 'POST',
            path: '/dependency-graph',
          },
        },
      },
    },
  },
  handlers: {
    'dependency-graph': async ({ input, signal }) =>
      createDependencyGraphAsync({
        projects: readDependencyGraphApiInput(input).projects,
        ...(signal === undefined ? {} : { signal }),
      }),
  },
});

/*** Validate the transport-neutral input before invoking filesystem-backed dependency analysis. */
function readDependencyGraphApiInput(input: unknown): DependencyGraphApiInput {
  if (
    typeof input !== 'object' ||
    input === null ||
    !('projects' in input) ||
    !Array.isArray(input.projects) ||
    !input.projects.every(isDependencyGraphProjectInput)
  ) {
    throw new TypeError('dependency-graph action requires a projects array.');
  }

  return { projects: input.projects };
}

/*** Validate one project identity/root pair accepted by dependency graph analysis. */
function isDependencyGraphProjectInput(
  value: unknown,
): value is DependencyGraphApiInput['projects'][number] {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    'rootPath' in value &&
    typeof value.rootPath === 'string' &&
    value.rootPath.length > 0
  );
}
