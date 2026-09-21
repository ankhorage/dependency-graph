import path from 'node:path';

import { toPortablePath } from '@ankhorage/utility/node/path';

import type { DependencyGraphAnalyzerContext } from '../../../types/dependencyGraph.js';

/*** Select source files from Project Detector's pruned scan without traversing the filesystem again. */
export function collectInspectedSourceFiles(
  context: DependencyGraphAnalyzerContext,
  sourceRoots: readonly string[],
  isSourceFile: (file: string) => boolean,
  ignoredDirectoryNames: readonly string[],
): readonly string[] {
  const ignored = new Set(ignoredDirectoryNames);
  return context.inspection.files
    .flatMap((file) => {
      context.signal?.throwIfAborted();
      const absolute = path.resolve(context.inspection.rootPath, ...file.split('/'));
      const relative = path.relative(context.package.rootPath, absolute);
      if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        return [];
      }
      const portable = toPortablePath(relative);
      if (!isSourceFile(portable)) return [];
      if (context.excludedRoots.some((root) => absolute.startsWith(`${root}${path.sep}`))) {
        return [];
      }
      if (!sourceRoots.some((root) => isWithinSourceRoot(portable, root, ignored))) return [];
      return [absolute];
    })
    .sort();
}

/*** Apply an analyzer's source-root and ignored-directory rules to one inspected file. */
function isWithinSourceRoot(
  relative: string,
  sourceRoot: string,
  ignored: ReadonlySet<string>,
): boolean {
  if (sourceRoot !== '.' && !relative.startsWith(`${sourceRoot}/`)) return false;
  const withinRoot = sourceRoot === '.' ? relative : relative.slice(sourceRoot.length + 1);
  return !withinRoot
    .split('/')
    .slice(0, -1)
    .some((directory) => ignored.has(directory));
}
