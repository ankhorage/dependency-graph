import { isRecord } from '@ankhorage/utility/object';

import type { ProjectAnalysisSnapshot } from '../../../types/projectAnalysisSnapshot.js';

/*** Reject unsupported or malformed snapshot contracts before canonical graph construction. */
export function assertProjectAnalysisSnapshot(
  value: unknown,
): asserts value is ProjectAnalysisSnapshot {
  if (!isProjectAnalysisSnapshot(value)) throw new Error('Invalid project analysis snapshot.');
}

/*** Check the complete JSON-safe public snapshot envelope and its recursively analyzed facts. */
function isProjectAnalysisSnapshot(value: unknown): value is ProjectAnalysisSnapshot {
  if (!isRecord(value) || value.version !== 1 || !isProjectId(value.projectId)) return false;
  return (
    isTextArray(value.directories) &&
    isTextArray(value.files) &&
    Array.isArray(value.packages) &&
    value.packages.every(isPackage) &&
    Array.isArray(value.workspaces) &&
    value.workspaces.every(isWorkspace) &&
    Array.isArray(value.analyzers) &&
    value.analyzers.every(isAnalyzer) &&
    Array.isArray(value.analyzedFiles) &&
    value.analyzedFiles.every(isAnalyzedFile)
  );
}

/*** Check project-relative package metadata. */
function isPackage(value: unknown): boolean {
  return (
    isRecord(value) && isText(value.rootPath) && (value.name === undefined || isText(value.name))
  );
}

/*** Check workspace membership without accepting absolute or executable values. */
function isWorkspace(value: unknown): boolean {
  return isRecord(value) && isText(value.rootPath) && isTextArray(value.packagePaths);
}

/*** Check analyzer provenance and its explicit capability list. */
function isAnalyzer(value: unknown): boolean {
  return isRecord(value) && isText(value.id) && isTextArray(value.capabilities);
}

/*** Check portable parser output without retaining ASTs, paths, or arbitrary runtime values. */
function isAnalyzedFile(value: unknown): boolean {
  return (
    isRecord(value) &&
    isText(value.analyzerId) &&
    isText(value.path) &&
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
    value.declarations.every(isJsonValue) &&
    Array.isArray(value.imports) &&
    value.imports.every(isJsonValue) &&
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
        entries.every((entry) => isRecord(entry) && isText(entry.kind) && isText(entry.range)),
    )
  );
}

/*** Accept only recursively JSON-safe analyzer facts. */
function isJsonValue(value: unknown): boolean {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || isText(value))
    return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isRecord(value) && Object.values(value).every(isJsonValue);
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
