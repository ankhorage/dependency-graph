import { opendir } from 'node:fs/promises';
import path from 'node:path';

/*** Collect deterministic TypeScript source files without following symlinks or nested package roots. */
export async function collectTypeScriptFilesAsync(
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

const excludedDirectoryNames = new Set([
  '.git',
  '.next',
  'build',
  'coverage',
  'dist',
  'node_modules',
]);

/*** Recursively collect TypeScript files from one source root. */
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
      } else if (entry.isFile() && isTypeScriptFile(entry.name)) {
        files.push(target);
      }
    }
    return files;
  } catch (error) {
    if (isMissingPathError(error)) return [];
    throw error;
  }
}

/*** Identify TypeScript source suffixes supported by the first analyzer. */
function isTypeScriptFile(file: string): boolean {
  return ['.ts', '.tsx', '.mts', '.cts'].some((extension) => file.endsWith(extension));
}

/*** Treat absent optional detector source roots as empty instead of analysis failures. */
function isMissingPathError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
