import { normalizePortablePath } from '@ankhorage/utility/node/path';
import { isRecord } from '@ankhorage/utility/object';

import type {
  ProjectAnalysisAnalyzer,
  ProjectAnalysisPackage,
  ProjectAnalysisSnapshot,
  ProjectAnalysisSourceFile,
  ProjectAnalysisWorkspace,
} from '../../../types/projectAnalysisSnapshot.js';
import { isSourceAnalyzerId, sourceAnalyzerCapabilities } from './sourceAnalyzerCapabilities.js';

/*** Reject unsupported or malformed snapshot contracts before canonical graph construction. */
export function assertProjectAnalysisSnapshot(
  value: unknown,
): asserts value is ProjectAnalysisSnapshot {
  if (!isProjectAnalysisSnapshot(value)) throw new Error('Invalid project analysis snapshot.');
}

/*** Check the complete JSON-safe public snapshot envelope and its recursively analyzed facts. */
function isProjectAnalysisSnapshot(value: unknown): value is ProjectAnalysisSnapshot {
  if (!isSnapshotEnvelope(value)) return false;
  return hasSnapshotContents(
    value.directories,
    value.files,
    value.packages,
    value.workspaces,
    value.analyzers,
    value.analyzedFiles,
  );
}

/*** Check the versioned identity fields that distinguish one public snapshot. */
function isSnapshotEnvelope(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.version === 1 && isProjectId(value.projectId);
}

/*** Check all collection entries and the identities that canonical graph construction consumes. */
function hasSnapshotContents(
  directories: unknown,
  files: unknown,
  packages: unknown,
  workspaces: unknown,
  analyzers: unknown,
  analyzedFiles: unknown,
): boolean {
  if (!isProjectRelativePathArray(directories, true)) return false;
  if (!isProjectRelativePathArray(files)) return false;
  if (!Array.isArray(packages) || !packages.every(isPackage)) return false;
  if (!Array.isArray(workspaces) || !workspaces.every(isWorkspace)) return false;
  if (!Array.isArray(analyzers) || !analyzers.every(isAnalyzer)) return false;
  if (!Array.isArray(analyzedFiles) || !analyzedFiles.every(isAnalyzedFile)) return false;
  return hasUniqueSnapshotIdentities(packages, workspaces, analyzers, analyzedFiles, files);
}

/*** Reject identities that would otherwise collapse or conflict during recomposition. */
function hasUniqueSnapshotIdentities(
  packages: readonly ProjectAnalysisPackage[],
  workspaces: readonly ProjectAnalysisWorkspace[],
  analyzers: readonly ProjectAnalysisAnalyzer[],
  analyzedFiles: readonly ProjectAnalysisSourceFile[],
  files: readonly string[],
): boolean {
  return (
    hasUniqueValues(packages.map(({ rootPath }) => rootPath)) &&
    hasUniqueValues(packages.flatMap(({ name }) => (name === undefined ? [] : [name]))) &&
    hasUniqueValues(workspaces.map(({ rootPath }) => rootPath)) &&
    hasUniqueValues(analyzers.map(({ id }) => id)) &&
    hasUniqueValues(analyzedFiles.map(({ path }) => path)) &&
    analyzedFiles.every(
      ({ analyzerId, path }) =>
        analyzers.some(({ id }) => id === analyzerId) && files.includes(path),
    )
  );
}

/*** Check project-relative package metadata. */
function isPackage(value: unknown): value is ProjectAnalysisPackage {
  return (
    isRecord(value) &&
    isProjectRelativePath(value.rootPath, true) &&
    (value.name === undefined || isText(value.name))
  );
}

/*** Check workspace membership without accepting absolute or executable values. */
function isWorkspace(value: unknown): value is ProjectAnalysisWorkspace {
  return (
    isRecord(value) &&
    isProjectRelativePath(value.rootPath, true) &&
    isProjectRelativePathArray(value.packagePaths, true)
  );
}

/*** Check analyzer provenance and its explicit capability list. */
function isAnalyzer(value: unknown): value is ProjectAnalysisAnalyzer {
  if (!isRecord(value) || !isText(value.id) || !isTextArray(value.capabilities)) return false;
  const supported = sourceAnalyzerCapabilities(value.id);
  return isSourceAnalyzerId(value.id) && hasSameValues(value.capabilities, supported);
}

/*** Check portable parser output without retaining ASTs, paths, or arbitrary runtime values. */
function isAnalyzedFile(value: unknown): value is ProjectAnalysisSourceFile {
  return (
    isRecord(value) &&
    isText(value.analyzerId) &&
    isProjectRelativePath(value.path) &&
    isSourceFacts(value.facts) &&
    (value.declaredDependencies === undefined ||
      isDependencyDeclarations(value.declaredDependencies))
  );
}

/*** Check the serializable language-neutral facts used by canonical relation resolution. */
function isSourceFacts(value: unknown): boolean {
  return (
    isRecord(value) &&
    Array.isArray(value.declarations) &&
    value.declarations.every(isSourceDeclaration) &&
    Array.isArray(value.imports) &&
    value.imports.every(isSourceImport) &&
    (value.packageName === undefined || isText(value.packageName))
  );
}

/*** Check dependency evidence maps before projecting package-level graph edges. */
function isDependencyDeclarations(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (entries) =>
        Array.isArray(entries) &&
        entries.every(
          (entry) =>
            isRecord(entry) &&
            ['dependency', 'devDependency', 'optionalDependency', 'peerDependency'].includes(
              entry.kind as string,
            ) &&
            isText(entry.range),
        ),
    )
  );
}

/*** Check a recursive declaration fact before it becomes a semantic graph node. */
function isSourceDeclaration(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return hasSourceDeclarationStructure(value) && hasSourceDeclarationMetadata(value);
}

/*** Check recursive declaration structure before graph-node construction. */
function hasSourceDeclarationStructure(value: Record<string, unknown>): boolean {
  return (
    Array.isArray(value.children) &&
    value.children.every(isSourceDeclaration) &&
    isTextArray(value.extends) &&
    isTextArray(value.implements) &&
    isSourceLocation(value.location) &&
    isTextArray(value.modifiers)
  );
}

/*** Check declaration attributes that establish its stable source identity. */
function hasSourceDeclarationMetadata(value: Record<string, unknown>): boolean {
  return (
    (value.documentation === undefined || isSourceDocumentation(value.documentation)) &&
    (value.exported === undefined || typeof value.exported === 'boolean') &&
    (value.typeOnly === undefined || typeof value.typeOnly === 'boolean') &&
    ['class', 'constant', 'enum', 'function', 'interface', 'method', 'type', 'variable'].includes(
      value.kind as string,
    ) &&
    isText(value.name) &&
    (value.signature === undefined || isText(value.signature)) &&
    ['package', 'private', 'protected', 'public'].includes(value.visibility as string)
  );
}

/*** Check one portable import fact without admitting host paths into recomposition. */
function isSourceImport(value: unknown): boolean {
  return (
    isRecord(value) &&
    (value.kind === undefined || value.kind === 'import' || value.kind === 'reexport') &&
    (value.local === undefined || typeof value.local === 'boolean') &&
    (value.location === undefined || isSourceLocation(value.location)) &&
    isText(value.specifier) &&
    (value.resolvedPath === undefined || isProjectRelativePath(value.resolvedPath)) &&
    (value.typeOnly === undefined || typeof value.typeOnly === 'boolean')
  );
}

/*** Check serializable documentation facts without retaining parser-owned values. */
function isSourceDocumentation(value: unknown): boolean {
  return (
    isRecord(value) &&
    isText(value.text) &&
    isRecord(value.tags) &&
    Object.values(value.tags).every(isTextArray)
  );
}

/*** Check one finite, one-based source span. */
function isSourceLocation(value: unknown): boolean {
  return (
    isRecord(value) &&
    [value.line, value.column, value.endLine, value.endColumn].every(
      (part) => typeof part === 'number' && Number.isSafeInteger(part) && part > 0,
    ) &&
    (value.endLine as number) >= (value.line as number) &&
    ((value.endLine as number) !== (value.line as number) ||
      (value.endColumn as number) >= (value.column as number))
  );
}

/*** Accept a canonical portable path that cannot escape its project snapshot. */
function isProjectRelativePath(value: unknown, allowRoot = false): value is string {
  return (
    isText(value) &&
    (allowRoot || value !== '.') &&
    !value.includes('\\') &&
    !value.startsWith('/') &&
    !/^[a-z]:\//iu.test(value) &&
    !value.split('/').some((segment) => segment === '..') &&
    normalizePortablePath(value) === value
  );
}

/*** Check a duplicate-free list of canonical project-relative paths. */
function isProjectRelativePathArray(value: unknown, allowRoot = false): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => isProjectRelativePath(item, allowRoot)) &&
    hasUniqueValues(value)
  );
}

/*** Compare one analyzer declaration with its canonical capability contract. */
function hasSameValues(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.join('\u0000') === expected.join('\u0000');
}

/*** Reject duplicate identities before they collapse into one canonical graph node. */
function hasUniqueValues(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

/*** Check a project identity without rejecting valid empty optional analyzer facts. */
function isProjectId(value: unknown): value is string {
  return isText(value) && value.trim() !== '';
}

/*** Distinguish portable text fields from arbitrary values. */
function isText(value: unknown): value is string {
  return typeof value === 'string';
}

/*** Check a JSON-safe list of portable identifiers. */
function isTextArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(isText);
}
