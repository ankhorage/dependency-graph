import type { ProjectInspection } from '@ankhorage/project-detector/types';

import type { SourceAnalyzedFile, SourceCapability, SourceFileFacts } from './sourceGraph.js';

/*** Versioned, filesystem-independent facts required to recompose one analyzed project. */
export interface ProjectAnalysisSnapshot {
  readonly version: 1;
  readonly projectId: string;
  readonly directories: readonly string[];
  readonly files: readonly string[];
  readonly packages: readonly ProjectAnalysisPackage[];
  readonly workspaces: readonly ProjectAnalysisWorkspace[];
  readonly analyzers: readonly ProjectAnalysisAnalyzer[];
  readonly analyzedFiles: readonly ProjectAnalysisSourceFile[];
}

/*** One detected package expressed only with project-relative identity. */
export interface ProjectAnalysisPackage {
  readonly rootPath: string;
  readonly name?: string;
}

/*** Workspace membership required to retain the established focus-package selection. */
export interface ProjectAnalysisWorkspace {
  readonly rootPath: string;
  readonly packagePaths: readonly string[];
}

/*** Analyzer provenance and available factual capabilities captured at analysis time. */
export interface ProjectAnalysisAnalyzer {
  readonly id: string;
  readonly capabilities: readonly SourceCapability[];
}

/*** One project-relative source file and its language-neutral analyzer output. */
export interface ProjectAnalysisSourceFile {
  readonly analyzerId: string;
  readonly facts: SourceFileFacts;
  readonly path: string;
  readonly declaredDependencies?: SourceAnalyzedFile['declaredDependencies'];
}

/*** A project root or its already-bounded inspection may create a portable analysis snapshot. */
export type CreateProjectAnalysisSnapshotInput =
  | { readonly id: string; readonly rootPath: string }
  | {
      readonly id: string;
      readonly inspection: ProjectInspection;
    };
