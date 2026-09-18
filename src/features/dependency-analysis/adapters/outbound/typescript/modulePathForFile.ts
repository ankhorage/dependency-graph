import path from 'node:path';

import { toPortablePath } from '@ankhorage/utility/node/path';

/*** Return the package-level dotted path owning one source file. */
export function modulePathForFile(rootPath: string, file: string): string {
  const relativeDirectory = toPortablePath(path.relative(rootPath, path.dirname(file)));
  return relativeDirectory === '.' ? '' : relativeDirectory.split('/').join('.');
}
