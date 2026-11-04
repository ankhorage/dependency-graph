import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { inspectProjectAsync } from '@ankhorage/project-detector/node';
import type { ProjectInspection } from '@ankhorage/project-detector/types';

import type {
  CreateProjectAnalysisSnapshotInput,
  ProjectAnalysisSnapshot,
} from '../../../types/projectAnalysisSnapshot.js';
import type { SourceAnalyzedFile } from '../../../types/sourceGraph.js';
import { extractJavaSourceFacts } from '../../dependency-analysis/adapters/outbound/java/extractJavaSourceFacts.js';
import { createTypeScriptImportResolver } from '../../dependency-analysis/adapters/outbound/typescript/createTypeScriptImportResolver.js';
import { extractTypeScriptSourceFacts } from '../../dependency-analysis/adapters/outbound/typescript/extractTypeScriptSourceFacts.js';
import { readDependencyDeclarationsAsync } from '../../dependency-analysis/domain/readDependencyDeclarationsAsync.js';
import { extractOtherLanguageFacts } from '../adapters/outbound/extractOtherLanguageFacts.js';
import { sourceAnalyzerCapabilities } from '../domain/sourceAnalyzerCapabilities.js';

/*** Analyze one bounded project into facts that remain valid after its source root is removed. */
export async function createProjectAnalysisSnapshotAsync(
  input: CreateProjectAnalysisSnapshotInput & { readonly signal?: AbortSignal },
): Promise<ProjectAnalysisSnapshot> {
  const inspection =
    'inspection' in input
      ? input.inspection
      : await inspectProjectAsync(input.rootPath, {
          ...(input.signal === undefined ? {} : { signal: input.signal }),
        });
  if (!inspection.complete)
    throw new Error(`Project analysis inspection is incomplete for ${input.id}.`);
  const analyzedFiles = await readProjectFilesAsync(input.id, inspection, input.signal);
  const analyzerIds = new Set([
    'project-detector',
    ...inspection.detection.languages.map(({ id }) => id),
    ...analyzedFiles.map(({ analyzerId }) => analyzerId),
  ]);
  return {
    version: 1,
    projectId: input.id,
    directories: [...inspection.directories].sort(compareText),
    files: [...inspection.files].sort(compareText),
    packages: inspection.packages
      .map(({ rootPath, name }) => ({ rootPath, ...(name === undefined ? {} : { name }) }))
      .sort((left, right) => compareText(left.rootPath, right.rootPath)),
    workspaces: inspection.workspaces
      .map(({ rootPath, packagePaths }) => ({
        rootPath,
        packagePaths: [...packagePaths].sort(compareText),
      }))
      .sort((left, right) => compareText(left.rootPath, right.rootPath)),
    analyzers: [...analyzerIds]
      .sort(compareText)
      .map((id) => ({ id, capabilities: sourceAnalyzerCapabilities(id) })),
    analyzedFiles: analyzedFiles
      .map(({ projectId: _, ...file }) => file)
      .sort((left, right) => compareText(left.path, right.path)),
  };
}

/*** Read project-relative source files once and retain only portable analyzer facts. */
async function readProjectFilesAsync(
  projectId: string,
  inspection: ProjectInspection,
  signal: AbortSignal | undefined,
): Promise<readonly SourceAnalyzedFile[]> {
  const declarations = await readPackageDeclarationsAsync(inspection);
  const resolveTypeScriptImports = createTypeScriptImportResolver(inspection.rootPath);
  return Promise.all(
    inspection.files.flatMap((file) => {
      const analyzerId = analyzerForPath(file);
      if (analyzerId === undefined) return [];
      const [owner] = inspection.packages
        .filter(({ rootPath }) => rootPath === '.' || file.startsWith(`${rootPath}/`))
        .sort((left, right) => right.rootPath.length - left.rootPath.length);
      const root = owner?.rootPath ?? '.';
      const sourceRoots =
        owner?.detection.languages.find(({ id }) => id === analyzerId)?.sourceRoots ??
        defaultSourceRoots(analyzerId);
      const relative = root === '.' ? file : file.slice(root.length + 1);
      if (
        !sourceRoots.some(
          (sourceRoot) => sourceRoot === '.' || relative.startsWith(`${sourceRoot}/`),
        )
      )
        return [];
      return [
        readAnalyzedFileAsync({
          projectId,
          file,
          analyzerId,
          projectRoot: inspection.rootPath,
          packageRoot: path.resolve(inspection.rootPath, root),
          sourceRoots,
          declaredDependencies: declarations.get(root),
          resolveTypeScriptImports,
          signal,
        }),
      ];
    }),
  );
}

/*** Preserve manifest declarations as project-relative import evidence. */
async function readPackageDeclarationsAsync(
  inspection: ProjectInspection,
): Promise<ReadonlyMap<string, SourceAnalyzedFile['declaredDependencies']>> {
  const entries = await Promise.all(
    inspection.packages.map(
      async (item) =>
        [
          item.rootPath,
          item.manifestPath.endsWith('.json')
            ? await readDependencyDeclarationsAsync(
                path.join(inspection.rootPath, item.manifestPath),
              )
            : {},
        ] as const,
    ),
  );
  return new Map(entries);
}

interface ReadSourceFileInput {
  readonly projectId: string;
  readonly projectRoot: string;
  readonly packageRoot: string;
  readonly sourceRoots: readonly string[];
  readonly file: string;
  readonly analyzerId: Exclude<ReturnType<typeof analyzerForPath>, undefined>;
  readonly declaredDependencies: SourceAnalyzedFile['declaredDependencies'];
  readonly resolveTypeScriptImports: ReturnType<typeof createTypeScriptImportResolver>;
  readonly signal: AbortSignal | undefined;
}

/*** Read one source file at the materialization boundary and discard its absolute path afterward. */
async function readAnalyzedFileAsync(input: ReadSourceFileInput): Promise<SourceAnalyzedFile> {
  input.signal?.throwIfAborted();
  const absolute = path.resolve(input.projectRoot, ...input.file.split('/'));
  const content = await readFile(absolute, 'utf8');
  input.signal?.throwIfAborted();
  return {
    projectId: input.projectId,
    path: input.file,
    analyzerId: input.analyzerId,
    ...(input.declaredDependencies === undefined
      ? {}
      : { declaredDependencies: input.declaredDependencies }),
    facts:
      input.analyzerId === 'java'
        ? extractJavaSourceFacts(content)
        : input.analyzerId === 'typescript'
          ? input.resolveTypeScriptImports(
              absolute,
              input.packageRoot,
              extractTypeScriptSourceFacts(input.file, content),
            )
          : extractOtherLanguageFacts(
              input.analyzerId,
              content,
              absolute,
              input.packageRoot,
              input.sourceRoots,
            ),
  };
}

/*** Select the implemented language analyzer from a project-relative source filename. */
function analyzerForPath(
  file: string,
): 'java' | 'typescript' | 'cpp' | 'delphi' | 'kotlin' | 'python' | undefined {
  if (file.endsWith('.java')) return 'java';
  if (['.ts', '.tsx', '.mts', '.cts'].some((extension) => file.endsWith(extension)))
    return 'typescript';
  if (file.endsWith('.kt') || file.endsWith('.kts')) return 'kotlin';
  if (file.endsWith('.py') || file.endsWith('.pyi')) return 'python';
  if (['.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx'].some((extension) => file.endsWith(extension)))
    return 'cpp';
  if (['.pas', '.pp', '.dpr'].some((extension) => file.toLowerCase().endsWith(extension)))
    return 'delphi';
  return undefined;
}

/*** Keep established default source roots for analyzers without explicit project metadata. */
function defaultSourceRoots(analyzerId: string): readonly string[] {
  if (analyzerId === 'java') return ['src/main/java', '.'];
  if (analyzerId === 'kotlin') return ['src/main/kotlin', 'src', '.'];
  if (analyzerId === 'python') return ['src', 'app', '.'];
  if (analyzerId === 'delphi') return ['src', 'Source', '.'];
  return ['.'];
}

/*** Compare portable identities deterministically without host locale rules. */
function compareText(left: string, right: string): number {
  if (left < right) return -1;
  return left > right ? 1 : 0;
}
