import { createApiRuntime } from '@ankhorage/api';

import type { DependencyGraphApiInput } from '../../../../../types/dependencyGraphApi.js';
import { createDependencyGraphAsync } from '../../../composition/createDependencyGraphAsync.js';

/*** Expose dependency graph creation through the canonical framework-neutral Ankhorage API action. */
export const dependencyGraphApi = createApiRuntime({
  definition: {
    id: 'dependency-graph',
    origin: 'internal',
    protocol: 'rest',
    basePath: '/api',
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
    'dependency-graph': async (request) => {
      const input = readDependencyGraphApiInput(request.body);
      if (input === undefined) {
        return {
          status: 400,
          body: {
            error: {
              code: 'invalid_dependency_graph_input',
              operationId: 'dependency-graph',
            },
          },
        };
      }

      return {
        body: await createDependencyGraphAsync({ projects: input.projects }),
      };
    },
  },
});

/*** Validate the transport-neutral input before invoking filesystem-backed dependency analysis. */
function readDependencyGraphApiInput(input: unknown): DependencyGraphApiInput | undefined {
  if (
    typeof input !== 'object' ||
    input === null ||
    !('projects' in input) ||
    !Array.isArray(input.projects) ||
    !input.projects.every(isDependencyGraphProjectInput)
  ) {
    return undefined;
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
