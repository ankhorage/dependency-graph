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
  if (
    typeof value !== 'object' ||
    value === null ||
    !('id' in value) ||
    typeof value.id !== 'string' ||
    value.id.length === 0
  )
    return false;
  if ('inspection' in value) return isProjectInspection(value.inspection);
  return 'rootPath' in value && typeof value.rootPath === 'string' && value.rootPath.length > 0;
}

/*** Validate the inspection fields read by canonical graph analysis. */
function isProjectInspection(value: unknown): boolean {
  return isInspectionScope(value) && isInspectionMetadata(value);
}

/*** Validate the bounded filesystem scope used by source readers. */
function isInspectionScope(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'rootPath' in value &&
    typeof value.rootPath === 'string' &&
    value.rootPath.length > 0 &&
    'complete' in value &&
    typeof value.complete === 'boolean' &&
    'directories' in value &&
    Array.isArray(value.directories) &&
    value.directories.every((entry: unknown) => typeof entry === 'string') &&
    'files' in value &&
    Array.isArray(value.files) &&
    value.files.every((entry: unknown) => typeof entry === 'string')
  );
}

/*** Validate metadata collections required for graph projection. */
function isInspectionMetadata(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'detection' in value &&
    typeof value.detection === 'object' &&
    value.detection !== null &&
    'packages' in value &&
    Array.isArray(value.packages) &&
    'workspaces' in value &&
    Array.isArray(value.workspaces) &&
    'manifests' in value &&
    Array.isArray(value.manifests) &&
    'diagnostics' in value &&
    Array.isArray(value.diagnostics)
  );
}
