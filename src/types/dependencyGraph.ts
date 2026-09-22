import type { Graph, GraphEdge, GraphNode } from '@ankhorage/graph';
import type { ProjectDetection, ProjectInspection } from '@ankhorage/project-detector/types';

export type DependencyNodeClassification = 'intrinsic' | 'unknown' | 'vendor';
export type DependencyReferenceClassification = DependencyNodeClassification | 'focus';
export type DependencyNodeKind = 'module' | 'package';
export type DependencyDeclarationKind =
  'dependency' | 'devDependency' | 'optionalDependency' | 'peerDependency';

export interface DependencyDeclaration {
  readonly kind: DependencyDeclarationKind;
  readonly range: string;
}

export interface DependencyImportEvidence {
  readonly sourceFile: string;
  readonly specifier: string;
  readonly classification: DependencyReferenceClassification;
  readonly declarations: readonly DependencyDeclaration[];
}

export interface DependencyGraphNodeData {
  readonly kind: DependencyNodeKind;
  readonly classification: DependencyNodeClassification;
  readonly focus: boolean;
  readonly label: string;
  readonly projectId?: string;
  readonly packageName?: string;
  readonly path?: string;
  readonly parentPath?: string;
}

export interface DependencyGraphEdgeData {
  readonly kind: 'import';
  readonly analyzerId: string;
  readonly weight: number;
  readonly evidence: readonly DependencyImportEvidence[];
}

export type DependencyGraph = Graph<DependencyGraphNodeData, DependencyGraphEdgeData>;

export interface DependencyGraphProjectInput {
  readonly id: string;
  readonly rootPath: string;
}

export interface DependencyGraphInspectionProjectInput {
  readonly id: string;
  readonly inspection: ProjectInspection;
}

export interface DependencyGraphPackage {
  readonly id: string;
  readonly nodeId: string;
  readonly projectId: string;
  readonly rootPath: string;
  readonly relativeRoot: string;
  readonly name?: string;
  readonly detection: ProjectDetection;
  readonly declarations: Readonly<Record<string, readonly DependencyDeclaration[]>>;
}

export interface DependencyGraphFragment {
  readonly nodes: readonly GraphNode<DependencyGraphNodeData>[];
  readonly edges: readonly GraphEdge<DependencyGraphEdgeData>[];
}

export interface DependencyGraphAnalyzerContext {
  readonly package: DependencyGraphPackage;
  readonly inspection: ProjectInspection;
  readonly focusPackages: ReadonlyMap<string, string>;
  readonly excludedRoots: readonly string[];
  readonly signal?: AbortSignal;
}

export interface DependencyGraphAnalyzer {
  readonly id: string;
  readonly supports: (detection: ProjectDetection) => boolean;
  readonly analyzeAsync: (
    context: DependencyGraphAnalyzerContext,
  ) => Promise<DependencyGraphFragment>;
}

export interface CreateDependencyGraphInput {
  readonly projects: readonly DependencyGraphProjectInput[];
  readonly analyzers?: readonly DependencyGraphAnalyzer[];
  readonly signal?: AbortSignal;
}

export interface CreateDependencyGraphFromInspectionsInput {
  readonly projects: readonly DependencyGraphInspectionProjectInput[];
  readonly analyzers?: readonly DependencyGraphAnalyzer[];
  readonly signal?: AbortSignal;
}
