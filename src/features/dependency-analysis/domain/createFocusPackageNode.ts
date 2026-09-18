import type { GraphNode } from '@ankhorage/graph';

import type {
  DependencyGraphNodeData,
  DependencyGraphPackage,
} from '../../../types/dependencyGraph.js';

/*** Create the focus package node representing one inspected package root. */
export function createFocusPackageNode(
  packageContext: DependencyGraphPackage,
): GraphNode<DependencyGraphNodeData> {
  return {
    id: packageContext.nodeId,
    data: {
      kind: 'package',
      classification: 'intrinsic',
      focus: true,
      label: packageContext.name ?? packageContext.id,
      projectId: packageContext.projectId,
      ...(packageContext.name === undefined ? {} : { packageName: packageContext.name }),
      path: packageContext.relativeRoot,
    },
  };
}
