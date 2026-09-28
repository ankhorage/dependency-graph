import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { ProjectInspection } from '@ankhorage/project-detector/types';

import type {
  CreateSourceGraphFromInspectionsInput,
  SourceAnalyzedFile,
  SourceGraph,
} from '../../../types/sourceGraph.js';
import { extractJavaSourceFacts } from '../../dependency-analysis/adapters/outbound/java/extractJavaSourceFacts.js';
import { createTypeScriptImportResolver } from '../../dependency-analysis/adapters/outbound/typescript/createTypeScriptImportResolver.js';
import { extractTypeScriptSourceFacts } from '../../dependency-analysis/adapters/outbound/typescript/extractTypeScriptSourceFacts.js';
import { readDependencyDeclarationsAsync } from '../../dependency-analysis/domain/readDependencyDeclarationsAsync.js';
import { extractOtherLanguageFacts } from '../adapters/outbound/extractOtherLanguageFacts.js';
import { createSourceGraph } from '../domain/createSourceGraph.js';
import { createSourceRelationDraft } from '../domain/createSourceRelationDraft.js';
import { createSourceStructureDraft } from '../domain/createSourceStructureDraft.js';

/*** Analyze inspected files once into a language-neutral factual source graph. */
export async function createSourceGraphFromInspectionsAsync(
  input: CreateSourceGraphFromInspectionsInput,
): Promise<SourceGraph> {
  assertProjects(input);
  const files = (
    await Promise.all(
      input.projects.map(({ id, inspection }) =>
        readProjectFilesAsync(id, inspection, input.signal),
      ),
    )
  ).flat();
  const structure = createSourceStructureDraft(input.projects, files);
  return createSourceGraph(createSourceRelationDraft(structure, files));
}

/*** Read package declarations once and associate them with their owning source files. */
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

/*** Preserve manifest declaration evidence at the package that owns each source file. */
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

/*** Read one inspected source path and map its parser facts into the common contract. */
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

/*** Declare supported parsers without attributing their capabilities to other languages. */
function analyzerForPath(
  file: string,
): 'java' | 'typescript' | 'cpp' | 'delphi' | 'kotlin' | 'python' | undefined {
  if (file.endsWith('.java')) return 'java';
  if (['.ts', '.tsx', '.mts', '.cts'].some((extension) => file.endsWith(extension))) {
    return 'typescript';
  }
  if (file.endsWith('.kt') || file.endsWith('.kts')) return 'kotlin';
  if (file.endsWith('.py') || file.endsWith('.pyi')) return 'python';
  if (['.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx'].some((extension) => file.endsWith(extension)))
    return 'cpp';
  if (['.pas', '.pp', '.dpr'].some((extension) => file.toLowerCase().endsWith(extension)))
    return 'delphi';
  return undefined;
}

/*** Preserve existing analyzer source-root defaults for import-only languages. */
function defaultSourceRoots(analyzerId: string): readonly string[] {
  if (analyzerId === 'java') return ['src/main/java', '.'];
  if (analyzerId === 'kotlin') return ['src/main/kotlin', 'src', '.'];
  if (analyzerId === 'python') return ['src', 'app', '.'];
  if (analyzerId === 'delphi') return ['src', 'Source', '.'];
  return ['.'];
}

/*** Reject duplicate project identities and incomplete scans before reading any source. */
function assertProjects(input: CreateSourceGraphFromInspectionsInput): void {
  const ids = new Set<string>();
  for (const project of input.projects) {
    if (project.id.trim() === '' || ids.has(project.id)) {
      throw new Error(`Invalid or duplicate source graph project ID: ${project.id}.`);
    }
    if (!project.inspection.complete) {
      throw new Error(`Source graph inspection is incomplete for ${project.id}.`);
    }
    ids.add(project.id);
  }
}
