import type { Graph } from '@ankhorage/graph';
import type { ProjectInspection } from '@ankhorage/project-detector/types';

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

export interface DependencyGraphInspectedProjectInput {
  readonly id: string;
  readonly inspection: ProjectInspection;
}

export interface DependencyGraphInspectionProjectInput {
  readonly id: string;
  readonly inspection: ProjectInspection;
}

export interface DependencyGraphPackage {
  readonly id: string;
  readonly nodeId: string;
  readonly projectId: string;
  readonly relativeRoot: string;
  readonly name?: string;
}

export interface CreateDependencyGraphInput {
  readonly projects: readonly (
    DependencyGraphProjectInput | DependencyGraphInspectedProjectInput
  )[];
  readonly signal?: AbortSignal;
}

export interface CreateDependencyGraphFromInspectionsInput {
  readonly projects: readonly DependencyGraphInspectionProjectInput[];
  readonly signal?: AbortSignal;
}
