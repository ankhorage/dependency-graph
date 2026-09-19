import path from 'node:path';

import { toPortablePath } from '@ankhorage/utility/node/path';

/*** Derive the PKGViz-compatible Python package path for a source file. */
export function pythonPackageForFile(
  rootPath: string,
  sourceRoots: readonly string[],
  file: string,
): string {
  const roots = sourceRoots
    .map((sourceRoot) => (sourceRoot === '.' ? rootPath : path.resolve(rootPath, sourceRoot)))
    .filter((sourceRoot) => file === sourceRoot || file.startsWith(`${sourceRoot}${path.sep}`))
    .sort((left, right) => right.length - left.length);
  const analysisRoot = roots[0] ?? rootPath;
  const relativeDirectory = path.dirname(path.relative(analysisRoot, file));
  if (relativeDirectory === '.') return '';
  return toPortablePath(relativeDirectory).split('/').join('.');
}
