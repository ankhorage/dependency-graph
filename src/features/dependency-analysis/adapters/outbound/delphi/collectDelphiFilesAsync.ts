import { opendir } from 'node:fs/promises';
import path from 'node:path';

/*** Collect deterministic Delphi source files without following symlinks or nested package roots. */
export async function collectDelphiFilesAsync(
  rootPath: string,
  sourceRoots: readonly string[],
  excludedRoots: readonly string[],
  signal: AbortSignal | undefined,
): Promise<readonly string[]> {
  const files = await Promise.all(
    sourceRoots.map((sourceRoot) =>
      visitDirectoryAsync(
        sourceRoot === '.' ? rootPath : path.resolve(rootPath, sourceRoot),
        new Set(excludedRoots),
        signal,
      ),
    ),
  );
  return [...new Set(files.flat())].sort();
}

const excludedDirectoryNames = new Set(['.git', 'build', 'coverage', 'dist', 'lib']);

const delphiExtensions = ['.pas', '.pp', '.dpr'];

/*** Recursively collect supported Delphi files from one source root. */
async function visitDirectoryAsync(
  directory: string,
  excludedRoots: ReadonlySet<string>,
  signal: AbortSignal | undefined,
): Promise<readonly string[]> {
  signal?.throwIfAborted();
  try {
    const handle = await opendir(directory);
    const files: string[] = [];
    for await (const entry of handle) {
      signal?.throwIfAborted();
      const target = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (excludedDirectoryNames.has(entry.name) || excludedRoots.has(target)) continue;
        files.push(...(await visitDirectoryAsync(target, excludedRoots, signal)));
      } else if (
        entry.isFile() &&
        delphiExtensions.some((extension) => entry.name.toLowerCase().endsWith(extension))
      ) {
        files.push(target);
      }
    }
    return files;
  } catch (error) {
    if (isMissingPathError(error)) return [];
    throw error;
  }
}

/*** Treat absent optional detector source roots as empty instead of analysis failures. */
function isMissingPathError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
