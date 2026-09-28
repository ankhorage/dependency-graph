/*** A portable one-based source span emitted by a language analyzer. */
export interface SourceLocation {
  readonly column: number;
  readonly endColumn: number;
  readonly endLine: number;
  readonly line: number;
}

/*** Analyzer-observed source documentation, distinct from consumer interpretation. */
export interface SourceDocumentation {
  readonly text: string;
  readonly tags: Readonly<Record<string, readonly string[]>>;
}

type SourceDeclarationKind =
  'class' | 'constant' | 'enum' | 'function' | 'interface' | 'method' | 'type' | 'variable';

export type SourceVisibility = 'package' | 'private' | 'protected' | 'public';

/*** A source declaration before graph-wide identity and relationship resolution. */
export interface SourceDeclarationFact {
  readonly children: readonly SourceDeclarationFact[];
  readonly documentation?: SourceDocumentation;
  readonly exported?: boolean;
  readonly typeOnly?: boolean;
  readonly extends: readonly string[];
  readonly implements: readonly string[];
  readonly kind: SourceDeclarationKind;
  readonly location: SourceLocation;
  readonly modifiers: readonly string[];
  readonly name: string;
  readonly signature?: string;
  readonly visibility: SourceVisibility;
}

/*** An import observed at an exact source position. */
export interface SourceImportFact {
  readonly kind?: 'import' | 'reexport';
  readonly local?: boolean;
  readonly location?: SourceLocation;
  readonly specifier: string;
  readonly resolvedPath?: string;
  readonly typeOnly?: boolean;
}

/*** Portable facts extracted from one source file by its language analyzer. */
export interface SourceFileFacts {
  readonly declarations: readonly SourceDeclarationFact[];
  readonly imports: readonly SourceImportFact[];
  readonly packageName?: string;
}

/*** Analyzer capabilities whose absence must not be interpreted as a negative fact. */
export type SourceCapability =
  | 'calls'
  | 'containment'
  | 'declarations'
  | 'documentation'
  | 'exports'
  | 'extends'
  | 'implements'
  | 'imports'
  | 'signatures'
  | 'source-locations'
  | 'visibility';

export interface SourceCapabilityReport {
  readonly analyzerId: string;
  readonly available: readonly SourceCapability[];
  readonly projectId: string;
}

export type SourceNodeKind = 'project' | 'package' | 'directory' | 'file' | SourceDeclarationKind;
export type SourceRelationKind =
  'contains' | 'declares-in' | 'exports' | 'extends' | 'implements' | 'imports';

/*** Factual node data with a stable semantic key independent from its dense local ID. */
export interface SourceNodeData {
  readonly analyzerId?: string;
  readonly kind: SourceNodeKind;
  readonly semanticPath: string;
  readonly name: string;
  readonly projectId: string;
  readonly filePath?: string;
  readonly path?: string;
  readonly packageName?: string;
  readonly classification?: 'intrinsic' | 'unknown' | 'vendor';
  readonly location?: SourceLocation;
  readonly visibility?: SourceVisibility;
  readonly modifiers?: readonly string[];
  readonly signature?: string;
  readonly documentation?: SourceDocumentation;
  readonly typeOnly?: boolean;
}

/*** Evidence for one observed relationship, including analyzer provenance. */
export interface SourceRelationEvidence {
  readonly analyzerId: string;
  readonly sourcePath: string;
  readonly location?: SourceLocation;
  readonly specifier?: string;
  readonly typeOnly?: boolean;
  readonly declarations?: readonly DependencyDeclaration[];
}

export interface SourceEdgeData {
  readonly kind: SourceRelationKind;
  readonly evidence: readonly SourceRelationEvidence[];
}

/*** Compact serializable source graph; its indexes and rollups are derived separately. */
export interface SourceGraph {
  readonly version: 1;
  readonly graph: Graph<SourceNodeData, SourceEdgeData, number, number>;
  readonly capabilities: readonly SourceCapabilityReport[];
}

export interface SourceNodeDraft {
  readonly data: SourceNodeData;
}

export interface SourceEdgeDraft {
  readonly source: string;
  readonly target: string;
  readonly data: SourceEdgeData;
}

export interface SourceGraphDraft {
  readonly nodes: readonly SourceNodeDraft[];
  readonly edges: readonly SourceEdgeDraft[];
  readonly capabilities: readonly SourceCapabilityReport[];
}

/*** Parsed source fact associated with a project-relative path. */
export interface SourceAnalyzedFile {
  readonly analyzerId: string;
  readonly facts: SourceFileFacts;
  readonly path: string;
  readonly projectId: string;
  readonly declaredDependencies?: Readonly<Record<string, readonly DependencyDeclaration[]>>;
}

export interface SourceInspectionProjectInput {
  readonly id: string;
  readonly inspection: ProjectInspection;
}

export interface CreateSourceGraphFromInspectionsInput {
  readonly projects: readonly SourceInspectionProjectInput[];
  readonly signal?: AbortSignal;
}

export interface CreateSourceGraphInput {
  readonly projects: readonly { readonly id: string; readonly rootPath: string }[];
  readonly signal?: AbortSignal;
}

/*** Indexed semantic access built from a serializable source graph snapshot. */
export interface SourceGraphIndex {
  readonly nodeById: ReadonlyMap<number, GraphNode<SourceNodeData, number>>;
  readonly nodeBySemanticPath: ReadonlyMap<string, GraphNode<SourceNodeData, number>>;
  readonly fileByPath: ReadonlyMap<string, GraphNode<SourceNodeData, number>>;
  readonly symbolsByFileAndName: ReadonlyMap<string, readonly GraphNode<SourceNodeData, number>[]>;
  readonly incomingByNodeId: ReadonlyMap<
    number,
    readonly GraphEdge<SourceEdgeData, number, number>[]
  >;
  readonly outgoingByNodeId: ReadonlyMap<
    number,
    readonly GraphEdge<SourceEdgeData, number, number>[]
  >;
  readonly parentByNodeId: ReadonlyMap<number, number>;
}

/*** Semantic relation view with source evidence and no required ID lookup. */
export interface SourceRelationView {
  readonly edgeId: number;
  readonly kind: SourceRelationKind;
  readonly source: SourceNodeData;
  readonly target: SourceNodeData;
  readonly evidence: readonly SourceRelationEvidence[];
}

/*** Pairwise projected dependency with references to canonical observed edges. */
export interface SourceRollupEdge {
  readonly source: number;
  readonly target: number;
  readonly sourceSemanticPath: string;
  readonly targetSemanticPath: string;
  readonly weight: number;
  readonly evidenceEdgeIds: readonly number[];
}

/*** Cached semantic queries for one deterministic projection level. */
export interface SourceRollupIndex {
  readonly byPair: ReadonlyMap<string, SourceRollupEdge>;
  readonly outgoingBySource: ReadonlyMap<string, readonly SourceRollupEdge[]>;
}

export interface SourceNodeSummary {
  readonly nodeId: number;
  readonly descendants: Readonly<Partial<Record<SourceNodeKind, number>>>;
  readonly exports: Readonly<{ readonly runtime: number; readonly typeOnly: number }>;
  readonly incomingRelations: number;
  readonly outgoingRelations: number;
  readonly dependencies: Readonly<Record<'intrinsic' | 'unknown' | 'vendor', number>>;
}
import type { Graph, GraphEdge, GraphNode } from '@ankhorage/graph';
import type { ProjectInspection } from '@ankhorage/project-detector/types';

import type { DependencyDeclaration } from './dependencyGraph.js';
