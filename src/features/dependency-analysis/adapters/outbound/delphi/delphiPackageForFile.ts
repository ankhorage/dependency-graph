import path from 'node:path';

import { toPortablePath } from '@ankhorage/utility/node/path';

/*** Derive a Delphi package path from unit namespace or the owning source directory. */
export function delphiPackageForFile(
  rootPath: string,
  sourceRoots: readonly string[],
  file: string,
  unitName: string,
): string {
  if (unitName.includes('.')) return unitName.split('.').slice(0, -1).join('.');
  const roots = sourceRoots
    .map((sourceRoot) => (sourceRoot === '.' ? rootPath : path.resolve(rootPath, sourceRoot)))
    .filter((sourceRoot) => file === sourceRoot || file.startsWith(`${sourceRoot}${path.sep}`))
    .sort((left, right) => right.length - left.length);
  const analysisRoot = roots[0] ?? rootPath;
  const relativeDirectory = path.dirname(path.relative(analysisRoot, file));
  if (relativeDirectory === '.') return '';
  return toPortablePath(relativeDirectory).split('/').join('.');
}
