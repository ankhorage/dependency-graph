import type { GraphNode } from '@ankhorage/graph';
import type {
  DependencyGraphNodeData,
  DependencyGraphPackage,
} from '../../../../../types/dependencyGraph.js';
import { modulePathForFile } from './modulePathForFile.js';

/*** Create intrinsic module nodes, including ancestor directories, for TypeScript source files. */
export function createTypeScriptModuleNodes(
  packageContext: DependencyGraphPackage,
  files: readonly string[],
): readonly GraphNode<DependencyGraphNodeData>[] {
  const paths = new Set(
    files.flatMap((file) => ancestorModulePaths(modulePathForFile(packageContext.rootPath, file))),
  );
  return [...paths]
    .sort()
    .filter((modulePath) => modulePath !== '')
    .map((modulePath) => ({
      id: `${packageContext.nodeId}#${modulePath}`,
      data: {
        kind: 'module',
        classification: 'intrinsic',
        focus: true,
        label: modulePath.split('.').at(-1) ?? modulePath,
        projectId: packageContext.projectId,
        ...(packageContext.name === undefined ? {} : { packageName: packageContext.name }),
        path: modulePath,
        parentPath: modulePath.includes('.')
          ? modulePath.split('.').slice(0, -1).join('.')
          : '',
      },
    }));
}

/*** Expand a module path into the hierarchy required for package-level graph projections. */
function ancestorModulePaths(modulePath: string): readonly string[] {
  if (modulePath === '') return [''];
  const segments = modulePath.split('.');
  return segments.map((_, index) => segments.slice(0, index + 1).join('.'));
}
