export { createDependencyGraphAsync } from './features/dependency-analysis/composition/createDependencyGraphAsync.js';
export { createDependencyGraphFromInspectionsAsync } from './features/dependency-analysis/composition/createDependencyGraphFromInspectionsAsync.js';
export { createSourceGraphAsync } from './features/source-graph/composition/createSourceGraphAsync.js';
export { createSourceGraphFromInspectionsAsync } from './features/source-graph/composition/createSourceGraphFromInspectionsAsync.js';
export { createSourceGraph } from './features/source-graph/domain/createSourceGraph.js';
export { createSourceGraphIndex } from './features/source-graph/domain/createSourceGraphIndex.js';
export {
  createSourceRollupIndex,
  findRolledUpDependency,
  outgoingRolledUpDependencies,
} from './features/source-graph/domain/createSourceRollupIndex.js';
export {
  findSourceFile,
  findSourceNode,
  findSourceRelationsBetween,
  findSourceSymbols,
  incomingSourceRelations,
  outgoingSourceRelations,
} from './features/source-graph/domain/querySourceGraph.js';
export { rollupSourceRelations } from './features/source-graph/domain/rollupSourceRelations.js';
export {
  deserializeSourceGraph,
  serializeSourceGraph,
} from './features/source-graph/domain/serializeSourceGraph.js';
export { summarizeSourceNode } from './features/source-graph/domain/summarizeSourceNode.js';
export type {
  CreateDependencyGraphFromInspectionsInput,
  CreateDependencyGraphInput,
  DependencyDeclaration,
  DependencyDeclarationKind,
  DependencyGraph,
  DependencyGraphEdgeData,
  DependencyGraphInspectionProjectInput,
  DependencyGraphNodeData,
  DependencyGraphPackage,
  DependencyGraphProjectInput,
  DependencyImportEvidence,
  DependencyNodeClassification,
  DependencyNodeKind,
  DependencyReferenceClassification,
} from './types/dependencyGraph.js';
export type {
  CreateSourceGraphFromInspectionsInput,
  CreateSourceGraphInput,
  SourceAnalyzedFile,
  SourceCapability,
  SourceCapabilityReport,
  SourceDeclarationFact,
  SourceDocumentation,
  SourceEdgeData,
  SourceEdgeDraft,
  SourceFileFacts,
  SourceGraph,
  SourceGraphDraft,
  SourceGraphIndex,
  SourceImportFact,
  SourceInspectionProjectInput,
  SourceLocation,
  SourceNodeData,
  SourceNodeDraft,
  SourceNodeKind,
  SourceNodeSummary,
  SourceRelationEvidence,
  SourceRelationKind,
  SourceRelationView,
  SourceRollupEdge,
  SourceRollupIndex,
  SourceVisibility,
} from './types/sourceGraph.js';
