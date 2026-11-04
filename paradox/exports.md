# Public API

## createDependencyGraphAsync

Kind: `function`
Module: `src/features/dependency-analysis/composition/createDependencyGraphAsync.ts`
Source: `src/features/dependency-analysis/composition/createDependencyGraphAsync.ts:11:1`

Inspect project roots, then delegate dependency topology construction to the inspection API.

### Signatures

- `(input: CreateDependencyGraphInput) => Promise<DependencyGraph>`
  - input: `CreateDependencyGraphInput`
  - returns: `Promise<DependencyGraph>`

## createDependencyGraphFromInspectionsAsync

Kind: `function`
Module: `src/features/dependency-analysis/composition/createDependencyGraphFromInspectionsAsync.ts`
Source: `src/features/dependency-analysis/composition/createDependencyGraphFromInspectionsAsync.ts:10:1`

Build the established dependency view from one canonical source analysis.

### Signatures

- `(input: CreateDependencyGraphFromInspectionsInput) => Promise<DependencyGraph>`
  - input: `CreateDependencyGraphFromInspectionsInput`
  - returns: `Promise<DependencyGraph>`

## CreateDependencyGraphFromInspectionsInput

Kind: `type`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:72:1`

### Members

| Name     | Kind     | Type                                               | Required | Description |
| -------- | -------- | -------------------------------------------------- | -------- | ----------- |
| projects | property | `readonly DependencyGraphInspectionProjectInput[]` | yes      |             |
| signal   | property | `AbortSignal`                                      | no       |             |

## createDependencyGraphFromProjectAnalysisSnapshots

Kind: `function`
Module: `src/features/dependency-analysis/composition/createDependencyGraphFromProjectAnalysisSnapshots.ts`
Source: `src/features/dependency-analysis/composition/createDependencyGraphFromProjectAnalysisSnapshots.ts:7:1`

Recompose portable project snapshots into the canonical dependency graph.

### Signatures

- `(snapshots: readonly ProjectAnalysisSnapshot[]) => DependencyGraph`
  - snapshots: `readonly ProjectAnalysisSnapshot[]`
  - returns: `DependencyGraph`

## CreateDependencyGraphInput

Kind: `type`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:65:1`

### Members

| Name     | Kind     | Type                                                                               | Required | Description |
| -------- | -------- | ---------------------------------------------------------------------------------- | -------- | ----------- |
| projects | property | `readonly (DependencyGraphProjectInput \| DependencyGraphInspectedProjectInput)[]` | yes      |             |
| signal   | property | `AbortSignal`                                                                      | no       |             |

## createProjectAnalysisSnapshotAsync

Kind: `function`
Module: `src/features/source-graph/composition/createProjectAnalysisSnapshotAsync.ts`
Source: `src/features/source-graph/composition/createProjectAnalysisSnapshotAsync.ts:20:1`

Analyze one bounded project into facts that remain valid after its source root is removed.

### Signatures

- `(input: CreateProjectAnalysisSnapshotInput & { readonly signal?: AbortSignal; }) => Promise<ProjectAnalysisSnapshot>`
  - input: `CreateProjectAnalysisSnapshotInput & { readonly signal?: AbortSignal; }`
  - returns: `Promise<ProjectAnalysisSnapshot>`

## CreateProjectAnalysisSnapshotInput

Kind: `unknown`
Module: `src/types/projectAnalysisSnapshot.ts`
Source: `src/types/projectAnalysisSnapshot.ts:44:1`

A project root or its already-bounded inspection may create a portable analysis snapshot.

## createSourceGraph

Kind: `function`
Module: `src/features/source-graph/domain/createSourceGraph.ts`
Source: `src/features/source-graph/domain/createSourceGraph.ts:12:1`

Assign dense numeric IDs to deterministic factual source nodes and edges.

### Signatures

- `(draft: SourceGraphDraft) => SourceGraph`
  - draft: `SourceGraphDraft`
  - returns: `SourceGraph`

## createSourceGraphAsync

Kind: `function`
Module: `src/features/source-graph/composition/createSourceGraphAsync.ts`
Source: `src/features/source-graph/composition/createSourceGraphAsync.ts:7:1`

Inspect project roots, then build the canonical source graph from their bounded scan.

### Signatures

- `(input: CreateSourceGraphInput) => Promise<SourceGraph>`
  - input: `CreateSourceGraphInput`
  - returns: `Promise<SourceGraph>`

## createSourceGraphFromInspectionsAsync

Kind: `function`
Module: `src/features/source-graph/composition/createSourceGraphFromInspectionsAsync.ts`
Source: `src/features/source-graph/composition/createSourceGraphFromInspectionsAsync.ts:9:1`

Analyze inspected files once into a language-neutral factual source graph.

### Signatures

- `(input: CreateSourceGraphFromInspectionsInput) => Promise<SourceGraph>`
  - input: `CreateSourceGraphFromInspectionsInput`
  - returns: `Promise<SourceGraph>`

## CreateSourceGraphFromInspectionsInput

Kind: `type`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:148:1`

### Members

| Name     | Kind     | Type                                      | Required | Description |
| -------- | -------- | ----------------------------------------- | -------- | ----------- |
| projects | property | `readonly SourceInspectionProjectInput[]` | yes      |             |
| signal   | property | `AbortSignal`                             | no       |             |

## createSourceGraphFromProjectAnalysisSnapshots

Kind: `function`
Module: `src/features/source-graph/composition/createSourceGraphFromProjectAnalysisSnapshots.ts`
Source: `src/features/source-graph/composition/createSourceGraphFromProjectAnalysisSnapshots.ts:9:1`

Recompose portable project facts through the canonical structure and relation pipeline.

### Signatures

- `(snapshots: readonly ProjectAnalysisSnapshot[]) => SourceGraph`
  - snapshots: `readonly ProjectAnalysisSnapshot[]`
  - returns: `SourceGraph`

## createSourceGraphIndex

Kind: `function`
Module: `src/features/source-graph/domain/createSourceGraphIndex.ts`
Source: `src/features/source-graph/domain/createSourceGraphIndex.ts:11:1`

Build reusable semantic and adjacency indexes once from observed source facts.

### Signatures

- `(sourceGraph: SourceGraph) => SourceGraphIndex`
  - sourceGraph: `SourceGraph`
  - returns: `SourceGraphIndex`

## CreateSourceGraphInput

Kind: `type`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:153:1`

### Members

| Name     | Kind     | Type                                                             | Required | Description |
| -------- | -------- | ---------------------------------------------------------------- | -------- | ----------- |
| projects | property | `readonly { readonly id: string; readonly rootPath: string; }[]` | yes      |             |
| signal   | property | `AbortSignal`                                                    | no       |             |

## createSourceRollupIndex

Kind: `function`
Module: `src/features/source-graph/domain/createSourceRollupIndex.ts`
Source: `src/features/source-graph/domain/createSourceRollupIndex.ts:4:1`

Index one computed rollup so repeated semantic dependency queries avoid graph scans.

### Signatures

- `(rollups: readonly SourceRollupEdge[]) => SourceRollupIndex`
  - rollups: `readonly SourceRollupEdge[]`
  - returns: `SourceRollupIndex`

## DependencyDeclaration

Kind: `type`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:10:1`

### Members

| Name  | Kind     | Type                        | Required | Description |
| ----- | -------- | --------------------------- | -------- | ----------- |
| kind  | property | `DependencyDeclarationKind` | yes      |             |
| range | property | `string`                    | yes      |             |

## DependencyDeclarationKind

Kind: `unknown`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:7:1`

## DependencyGraph

Kind: `unknown`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:40:1`

## dependencyGraphApi

Kind: `value`
Module: `src/features/dependency-analysis/adapters/inbound/api/dependencyGraphApi.ts`
Source: `src/features/dependency-analysis/adapters/inbound/api/dependencyGraphApi.ts:7:14`

Expose dependency graph creation through the canonical framework-neutral Ankhorage API action.

## DependencyGraphApiInput

Kind: `type`
Module: `src/types/dependencyGraphApi.ts`
Source: `src/types/dependencyGraphApi.ts:6:1`

### Members

| Name     | Kind     | Type                                                                               | Required | Description |
| -------- | -------- | ---------------------------------------------------------------------------------- | -------- | ----------- |
| projects | property | `readonly (DependencyGraphProjectInput \| DependencyGraphInspectedProjectInput)[]` | yes      |             |

## DependencyGraphEdgeData

Kind: `type`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:33:1`

### Members

| Name       | Kind     | Type                                  | Required | Description |
| ---------- | -------- | ------------------------------------- | -------- | ----------- |
| analyzerId | property | `string`                              | yes      |             |
| evidence   | property | `readonly DependencyImportEvidence[]` | yes      |             |
| kind       | property | `"import"`                            | yes      |             |
| weight     | property | `number`                              | yes      |             |

## DependencyGraphInspectionProjectInput

Kind: `type`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:52:1`

### Members

| Name       | Kind     | Type                | Required | Description |
| ---------- | -------- | ------------------- | -------- | ----------- |
| id         | property | `string`            | yes      |             |
| inspection | property | `ProjectInspection` | yes      |             |

## DependencyGraphNodeData

Kind: `type`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:22:1`

### Members

| Name           | Kind     | Type                           | Required | Description |
| -------------- | -------- | ------------------------------ | -------- | ----------- |
| classification | property | `DependencyNodeClassification` | yes      |             |
| focus          | property | `boolean`                      | yes      |             |
| kind           | property | `DependencyNodeKind`           | yes      |             |
| label          | property | `string`                       | yes      |             |
| packageName    | property | `string`                       | no       |             |
| parentPath     | property | `string`                       | no       |             |
| path           | property | `string`                       | no       |             |
| projectId      | property | `string`                       | no       |             |

## DependencyGraphPackage

Kind: `type`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:57:1`

### Members

| Name         | Kind     | Type     | Required | Description |
| ------------ | -------- | -------- | -------- | ----------- |
| id           | property | `string` | yes      |             |
| name         | property | `string` | no       |             |
| nodeId       | property | `string` | yes      |             |
| projectId    | property | `string` | yes      |             |
| relativeRoot | property | `string` | yes      |             |

## DependencyGraphProjectInput

Kind: `type`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:42:1`

### Members

| Name     | Kind     | Type     | Required | Description |
| -------- | -------- | -------- | -------- | ----------- |
| id       | property | `string` | yes      |             |
| rootPath | property | `string` | yes      |             |

## DependencyImportEvidence

Kind: `type`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:15:1`

### Members

| Name           | Kind     | Type                                | Required | Description |
| -------------- | -------- | ----------------------------------- | -------- | ----------- |
| classification | property | `DependencyReferenceClassification` | yes      |             |
| declarations   | property | `readonly DependencyDeclaration[]`  | yes      |             |
| sourceFile     | property | `string`                            | yes      |             |
| specifier      | property | `string`                            | yes      |             |

## DependencyNodeClassification

Kind: `unknown`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:4:1`

## DependencyNodeKind

Kind: `unknown`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:6:1`

## DependencyReferenceClassification

Kind: `unknown`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:5:1`

## deserializeProjectAnalysisSnapshot

Kind: `function`
Module: `src/features/source-graph/domain/deserializeProjectAnalysisSnapshot.ts`
Source: `src/features/source-graph/domain/deserializeProjectAnalysisSnapshot.ts:5:1`

Restore and validate one portable project analysis snapshot before it enters recomposition.

### Signatures

- `(serialized: string) => ProjectAnalysisSnapshot`
  - serialized: `string`
  - returns: `ProjectAnalysisSnapshot`

## deserializeSourceGraph

Kind: `function`
Module: `src/features/source-graph/domain/serializeSourceGraph.ts`
Source: `src/features/source-graph/domain/serializeSourceGraph.ts:28:1`

Restore the complete factual graph before constructing any derived index.

### Signatures

- `(serialized: string) => SourceGraph`
  - serialized: `string`
  - returns: `SourceGraph`

## findRolledUpDependency

Kind: `function`
Module: `src/features/source-graph/domain/createSourceRollupIndex.ts`
Source: `src/features/source-graph/domain/createSourceRollupIndex.ts:17:1`

Look up an aggregate dependency using stable semantic identities.

### Signatures

- `(index: SourceRollupIndex, sourceSemanticPath: string, targetSemanticPath: string) => SourceRollupEdge | undefined`
  - index: `SourceRollupIndex`
  - sourceSemanticPath: `string`
  - targetSemanticPath: `string`
  - returns: `SourceRollupEdge | undefined`

## findSourceFile

Kind: `function`
Module: `src/features/source-graph/domain/querySourceGraph.ts`
Source: `src/features/source-graph/domain/querySourceGraph.ts:19:1`

Resolve a file in one project by its project-relative portable path.

### Signatures

- `(index: SourceGraphIndex, projectId: string, path: string) => GraphNode<SourceNodeData, number> | undefined`
  - index: `SourceGraphIndex`
  - path: `string`
  - projectId: `string`
  - returns: `GraphNode<SourceNodeData, number> | undefined`

## findSourceNode

Kind: `function`
Module: `src/features/source-graph/domain/querySourceGraph.ts`
Source: `src/features/source-graph/domain/querySourceGraph.ts:11:1`

Resolve a stable semantic identity without exposing its local numeric ID.

### Signatures

- `(index: SourceGraphIndex, semanticPath: string) => GraphNode<SourceNodeData, number> | undefined`
  - index: `SourceGraphIndex`
  - semanticPath: `string`
  - returns: `GraphNode<SourceNodeData, number> | undefined`

## findSourceRelationsBetween

Kind: `function`
Module: `src/features/source-graph/domain/querySourceGraph.ts`
Source: `src/features/source-graph/domain/querySourceGraph.ts:60:1`

Resolve direct observed relationships between two stable semantic identities.

### Signatures

- `(index: SourceGraphIndex, sourceSemanticPath: string, targetSemanticPath: string) => readonly SourceRelationView[]`
  - index: `SourceGraphIndex`
  - sourceSemanticPath: `string`
  - targetSemanticPath: `string`
  - returns: `readonly SourceRelationView[]`

## findSourceSymbols

Kind: `function`
Module: `src/features/source-graph/domain/querySourceGraph.ts`
Source: `src/features/source-graph/domain/querySourceGraph.ts:28:1`

Resolve declarations by project, file, and source-level name.

### Signatures

- `(index: SourceGraphIndex, projectId: string, path: string, name: string) => readonly GraphNode<SourceNodeData, number>[]`
  - index: `SourceGraphIndex`
  - name: `string`
  - path: `string`
  - projectId: `string`
  - returns: `readonly GraphNode<SourceNodeData, number>[]`

## incomingSourceRelations

Kind: `function`
Module: `src/features/source-graph/domain/querySourceGraph.ts`
Source: `src/features/source-graph/domain/querySourceGraph.ts:49:1`

Read relationships targeting a semantic node in index time.

### Signatures

- `(index: SourceGraphIndex, semanticPath: string) => readonly SourceRelationView[]`
  - index: `SourceGraphIndex`
  - semanticPath: `string`
  - returns: `readonly SourceRelationView[]`

## outgoingRolledUpDependencies

Kind: `function`
Module: `src/features/source-graph/domain/createSourceRollupIndex.ts`
Source: `src/features/source-graph/domain/createSourceRollupIndex.ts:26:1`

List aggregate dependencies leaving one semantic container.

### Signatures

- `(index: SourceRollupIndex, sourceSemanticPath: string) => readonly SourceRollupEdge[]`
  - index: `SourceRollupIndex`
  - sourceSemanticPath: `string`
  - returns: `readonly SourceRollupEdge[]`

## outgoingSourceRelations

Kind: `function`
Module: `src/features/source-graph/domain/querySourceGraph.ts`
Source: `src/features/source-graph/domain/querySourceGraph.ts:38:1`

Read relationships emitted from a semantic node in index time.

### Signatures

- `(index: SourceGraphIndex, semanticPath: string) => readonly SourceRelationView[]`
  - index: `SourceGraphIndex`
  - semanticPath: `string`
  - returns: `readonly SourceRelationView[]`

## ProjectAnalysisAnalyzer

Kind: `type`
Module: `src/types/projectAnalysisSnapshot.ts`
Source: `src/types/projectAnalysisSnapshot.ts:30:1`

Analyzer provenance and available factual capabilities captured at analysis time.

### Members

| Name         | Kind     | Type                          | Required | Description |
| ------------ | -------- | ----------------------------- | -------- | ----------- |
| capabilities | property | `readonly SourceCapability[]` | yes      |             |
| id           | property | `string`                      | yes      |             |

## ProjectAnalysisPackage

Kind: `type`
Module: `src/types/projectAnalysisSnapshot.ts`
Source: `src/types/projectAnalysisSnapshot.ts:18:1`

One detected package expressed only with project-relative identity.

### Members

| Name     | Kind     | Type     | Required | Description |
| -------- | -------- | -------- | -------- | ----------- |
| name     | property | `string` | no       |             |
| rootPath | property | `string` | yes      |             |

## ProjectAnalysisSnapshot

Kind: `type`
Module: `src/types/projectAnalysisSnapshot.ts`
Source: `src/types/projectAnalysisSnapshot.ts:6:1`

Versioned, filesystem-independent facts required to recompose one analyzed project.

### Members

| Name          | Kind     | Type                                   | Required | Description |
| ------------- | -------- | -------------------------------------- | -------- | ----------- |
| analyzedFiles | property | `readonly ProjectAnalysisSourceFile[]` | yes      |             |
| analyzers     | property | `readonly ProjectAnalysisAnalyzer[]`   | yes      |             |
| directories   | property | `readonly string[]`                    | yes      |             |
| files         | property | `readonly string[]`                    | yes      |             |
| packages      | property | `readonly ProjectAnalysisPackage[]`    | yes      |             |
| projectId     | property | `string`                               | yes      |             |
| version       | property | `1`                                    | yes      |             |
| workspaces    | property | `readonly ProjectAnalysisWorkspace[]`  | yes      |             |

## ProjectAnalysisSourceFile

Kind: `type`
Module: `src/types/projectAnalysisSnapshot.ts`
Source: `src/types/projectAnalysisSnapshot.ts:36:1`

One project-relative source file and its language-neutral analyzer output.

### Members

| Name                 | Kind     | Type                                                                                                     | Required | Description |
| -------------------- | -------- | -------------------------------------------------------------------------------------------------------- | -------- | ----------- |
| analyzerId           | property | `string`                                                                                                 | yes      |             |
| declaredDependencies | property | `Readonly<Record<string, readonly import("./dependencyGraph.js").DependencyDeclaration[]>> \| undefined` | no       |             |
| facts                | property | `SourceFileFacts`                                                                                        | yes      |             |
| path                 | property | `string`                                                                                                 | yes      |             |

## ProjectAnalysisWorkspace

Kind: `type`
Module: `src/types/projectAnalysisSnapshot.ts`
Source: `src/types/projectAnalysisSnapshot.ts:24:1`

Workspace membership required to retain the established focus-package selection.

### Members

| Name         | Kind     | Type                | Required | Description |
| ------------ | -------- | ------------------- | -------- | ----------- |
| packagePaths | property | `readonly string[]` | yes      |             |
| rootPath     | property | `string`            | yes      |             |

## projectDependencyGraphFromInspections

Kind: `function`
Module: `src/features/dependency-analysis/application/projectDependencyGraphFromInspections.ts`
Source: `src/features/dependency-analysis/application/projectDependencyGraphFromInspections.ts:13:1`

Project a previously analyzed source graph into the established package/module view.

### Signatures

- `(sourceGraph: SourceGraph, projects: readonly DependencyGraphInspectionProjectInput[]) => DependencyGraph`
  - projects: `readonly DependencyGraphInspectionProjectInput[]`
  - sourceGraph: `SourceGraph`
  - returns: `DependencyGraph`

## projectDependencyGraphFromProjectAnalysisSnapshots

Kind: `function`
Module: `src/features/dependency-analysis/application/projectDependencyGraphFromProjectAnalysisSnapshots.ts`
Source: `src/features/dependency-analysis/application/projectDependencyGraphFromProjectAnalysisSnapshots.ts:7:1`

Project recomposed portable source facts through the established package/module graph view.

### Signatures

- `(sourceGraph: SourceGraph, snapshots: readonly ProjectAnalysisSnapshot[]) => DependencyGraph`
  - snapshots: `readonly ProjectAnalysisSnapshot[]`
  - sourceGraph: `SourceGraph`
  - returns: `DependencyGraph`

## rollupSourceRelations

Kind: `function`
Module: `src/features/source-graph/domain/rollupSourceRelations.ts`
Source: `src/features/source-graph/domain/rollupSourceRelations.ts:8:1`

Aggregate observed relationships at the requested containment level, preserving edge IDs.

### Signatures

- `(sourceGraph: SourceGraph, index: SourceGraphIndex, aggregateKind: "project" | "package" | "directory" | "file", relationKind?: "imports" | "exports" | "extends" | "implements") => readonly SourceRollupEdge[]`
  - aggregateKind: `"project" | "package" | "directory" | "file"`
  - index: `SourceGraphIndex`
  - relationKind: `"imports" | "exports" | "extends" | "implements"` (optional)
  - sourceGraph: `SourceGraph`
  - returns: `readonly SourceRollupEdge[]`

## serializeProjectAnalysisSnapshot

Kind: `function`
Module: `src/features/source-graph/domain/serializeProjectAnalysisSnapshot.ts`
Source: `src/features/source-graph/domain/serializeProjectAnalysisSnapshot.ts:5:1`

Serialize a validated portable project analysis snapshot for cache storage or transfer.

### Signatures

- `(snapshot: ProjectAnalysisSnapshot) => string`
  - snapshot: `ProjectAnalysisSnapshot`
  - returns: `string`

## serializeSourceGraph

Kind: `function`
Module: `src/features/source-graph/domain/serializeSourceGraph.ts`
Source: `src/features/source-graph/domain/serializeSourceGraph.ts:12:1`

Intern repeated source strings while retaining a lossless JSON interchange format.

### Signatures

- `(sourceGraph: SourceGraph) => string`
  - sourceGraph: `SourceGraph`
  - returns: `string`

## SourceAnalyzedFile

Kind: `type`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:135:1`

Parsed source fact associated with a project-relative path.

### Members

| Name                 | Kind     | Type                                                         | Required | Description |
| -------------------- | -------- | ------------------------------------------------------------ | -------- | ----------- |
| analyzerId           | property | `string`                                                     | yes      |             |
| declaredDependencies | property | `Readonly<Record<string, readonly DependencyDeclaration[]>>` | no       |             |
| facts                | property | `SourceFileFacts`                                            | yes      |             |
| path                 | property | `string`                                                     | yes      |             |
| projectId            | property | `string`                                                     | yes      |             |

## SourceCapability

Kind: `unknown`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:54:1`

Analyzer capabilities whose absence must not be interpreted as a negative fact.

## SourceCapabilityReport

Kind: `type`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:67:1`

### Members

| Name       | Kind     | Type                          | Required | Description |
| ---------- | -------- | ----------------------------- | -------- | ----------- |
| analyzerId | property | `string`                      | yes      |             |
| available  | property | `readonly SourceCapability[]` | yes      |             |
| projectId  | property | `string`                      | yes      |             |

## SourceDeclarationFact

Kind: `type`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:21:1`

A source declaration before graph-wide identity and relationship resolution.

### Members

| Name          | Kind     | Type                               | Required | Description |
| ------------- | -------- | ---------------------------------- | -------- | ----------- |
| children      | property | `readonly SourceDeclarationFact[]` | yes      |             |
| documentation | property | `SourceDocumentation`              | no       |             |
| exported      | property | `boolean`                          | no       |             |
| extends       | property | `readonly string[]`                | yes      |             |
| implements    | property | `readonly string[]`                | yes      |             |
| kind          | property | `SourceDeclarationKind`            | yes      |             |
| location      | property | `SourceLocation`                   | yes      |             |
| modifiers     | property | `readonly string[]`                | yes      |             |
| name          | property | `string`                           | yes      |             |
| signature     | property | `string`                           | no       |             |
| typeOnly      | property | `boolean`                          | no       |             |
| visibility    | property | `SourceVisibility`                 | yes      |             |

## SourceDocumentation

Kind: `type`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:10:1`

Analyzer-observed source documentation, distinct from consumer interpretation.

### Members

| Name | Kind     | Type                                          | Required | Description |
| ---- | -------- | --------------------------------------------- | -------- | ----------- |
| tags | property | `Readonly<Record<string, readonly string[]>>` | yes      |             |
| text | property | `string`                                      | yes      |             |

## SourceEdgeData

Kind: `type`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:106:1`

### Members

| Name     | Kind     | Type                                | Required | Description |
| -------- | -------- | ----------------------------------- | -------- | ----------- |
| evidence | property | `readonly SourceRelationEvidence[]` | yes      |             |
| kind     | property | `SourceRelationKind`                | yes      |             |

## SourceEdgeDraft

Kind: `type`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:122:1`

### Members

| Name   | Kind     | Type             | Required | Description |
| ------ | -------- | ---------------- | -------- | ----------- |
| data   | property | `SourceEdgeData` | yes      |             |
| source | property | `string`         | yes      |             |
| target | property | `string`         | yes      |             |

## SourceFileFacts

Kind: `type`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:47:1`

Portable facts extracted from one source file by its language analyzer.

### Members

| Name         | Kind     | Type                               | Required | Description |
| ------------ | -------- | ---------------------------------- | -------- | ----------- |
| declarations | property | `readonly SourceDeclarationFact[]` | yes      |             |
| imports      | property | `readonly SourceImportFact[]`      | yes      |             |
| packageName  | property | `string`                           | no       |             |

## SourceGraph

Kind: `type`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:112:1`

Compact serializable source graph; its indexes and rollups are derived separately.

### Members

| Name         | Kind     | Type                                                    | Required | Description |
| ------------ | -------- | ------------------------------------------------------- | -------- | ----------- |
| capabilities | property | `readonly SourceCapabilityReport[]`                     | yes      |             |
| graph        | property | `Graph<SourceNodeData, SourceEdgeData, number, number>` | yes      |             |
| version      | property | `1`                                                     | yes      |             |

## SourceGraphDraft

Kind: `type`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:128:1`

### Members

| Name         | Kind     | Type                                | Required | Description |
| ------------ | -------- | ----------------------------------- | -------- | ----------- |
| capabilities | property | `readonly SourceCapabilityReport[]` | yes      |             |
| edges        | property | `readonly SourceEdgeDraft[]`        | yes      |             |
| nodes        | property | `readonly SourceNodeDraft[]`        | yes      |             |

## SourceGraphIndex

Kind: `type`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:159:1`

Indexed semantic access built from a serializable source graph snapshot.

### Members

| Name                 | Kind     | Type                                                                        | Required | Description |
| -------------------- | -------- | --------------------------------------------------------------------------- | -------- | ----------- |
| fileByPath           | property | `ReadonlyMap<string, GraphNode<SourceNodeData, number>>`                    | yes      |             |
| incomingByNodeId     | property | `ReadonlyMap<number, readonly GraphEdge<SourceEdgeData, number, number>[]>` | yes      |             |
| nodeById             | property | `ReadonlyMap<number, GraphNode<SourceNodeData, number>>`                    | yes      |             |
| nodeBySemanticPath   | property | `ReadonlyMap<string, GraphNode<SourceNodeData, number>>`                    | yes      |             |
| outgoingByNodeId     | property | `ReadonlyMap<number, readonly GraphEdge<SourceEdgeData, number, number>[]>` | yes      |             |
| parentByNodeId       | property | `ReadonlyMap<number, number>`                                               | yes      |             |
| symbolsByFileAndName | property | `ReadonlyMap<string, readonly GraphNode<SourceNodeData, number>[]>`         | yes      |             |

## SourceImportFact

Kind: `type`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:37:1`

An import observed at an exact source position.

### Members

| Name         | Kind     | Type                     | Required | Description |
| ------------ | -------- | ------------------------ | -------- | ----------- |
| kind         | property | `"import" \| "reexport"` | no       |             |
| local        | property | `boolean`                | no       |             |
| location     | property | `SourceLocation`         | no       |             |
| resolvedPath | property | `string`                 | no       |             |
| specifier    | property | `string`                 | yes      |             |
| typeOnly     | property | `boolean`                | no       |             |

## SourceInspectionProjectInput

Kind: `type`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:143:1`

### Members

| Name       | Kind     | Type                | Required | Description |
| ---------- | -------- | ------------------- | -------- | ----------- |
| id         | property | `string`            | yes      |             |
| inspection | property | `ProjectInspection` | yes      |             |

## SourceLocation

Kind: `type`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:2:1`

A portable one-based source span emitted by a language analyzer.

### Members

| Name      | Kind     | Type     | Required | Description |
| --------- | -------- | -------- | -------- | ----------- |
| column    | property | `number` | yes      |             |
| endColumn | property | `number` | yes      |             |
| endLine   | property | `number` | yes      |             |
| line      | property | `number` | yes      |             |

## SourceNodeData

Kind: `type`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:78:1`

Factual node data with a stable semantic key independent from its dense local ID.

### Members

| Name           | Kind     | Type                                   | Required | Description |
| -------------- | -------- | -------------------------------------- | -------- | ----------- |
| analyzerId     | property | `string`                               | no       |             |
| classification | property | `"intrinsic" \| "unknown" \| "vendor"` | no       |             |
| documentation  | property | `SourceDocumentation`                  | no       |             |
| filePath       | property | `string`                               | no       |             |
| kind           | property | `SourceNodeKind`                       | yes      |             |
| location       | property | `SourceLocation`                       | no       |             |
| modifiers      | property | `readonly string[]`                    | no       |             |
| name           | property | `string`                               | yes      |             |
| packageName    | property | `string`                               | no       |             |
| path           | property | `string`                               | no       |             |
| projectId      | property | `string`                               | yes      |             |
| semanticPath   | property | `string`                               | yes      |             |
| signature      | property | `string`                               | no       |             |
| typeOnly       | property | `boolean`                              | no       |             |
| visibility     | property | `SourceVisibility`                     | no       |             |

## SourceNodeDraft

Kind: `type`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:118:1`

### Members

| Name | Kind     | Type             | Required | Description |
| ---- | -------- | ---------------- | -------- | ----------- |
| data | property | `SourceNodeData` | yes      |             |

## SourceNodeKind

Kind: `unknown`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:73:1`

## SourceNodeSummary

Kind: `type`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:200:1`

### Members

| Name              | Kind     | Type                                                                 | Required | Description |
| ----------------- | -------- | -------------------------------------------------------------------- | -------- | ----------- |
| dependencies      | property | `Readonly<Record<"intrinsic" \| "unknown" \| "vendor", number>>`     | yes      |             |
| descendants       | property | `Readonly<Partial<Record<SourceNodeKind, number>>>`                  | yes      |             |
| exports           | property | `Readonly<{ readonly runtime: number; readonly typeOnly: number; }>` | yes      |             |
| incomingRelations | property | `number`                                                             | yes      |             |
| nodeId            | property | `number`                                                             | yes      |             |
| outgoingRelations | property | `number`                                                             | yes      |             |

## SourceRelationEvidence

Kind: `type`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:97:1`

Evidence for one observed relationship, including analyzer provenance.

### Members

| Name         | Kind     | Type                               | Required | Description |
| ------------ | -------- | ---------------------------------- | -------- | ----------- |
| analyzerId   | property | `string`                           | yes      |             |
| declarations | property | `readonly DependencyDeclaration[]` | no       |             |
| location     | property | `SourceLocation`                   | no       |             |
| sourcePath   | property | `string`                           | yes      |             |
| specifier    | property | `string`                           | no       |             |
| typeOnly     | property | `boolean`                          | no       |             |

## SourceRelationKind

Kind: `unknown`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:74:1`

## SourceRelationView

Kind: `type`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:176:1`

Semantic relation view with source evidence and no required ID lookup.

### Members

| Name     | Kind     | Type                                | Required | Description |
| -------- | -------- | ----------------------------------- | -------- | ----------- |
| edgeId   | property | `number`                            | yes      |             |
| evidence | property | `readonly SourceRelationEvidence[]` | yes      |             |
| kind     | property | `SourceRelationKind`                | yes      |             |
| source   | property | `SourceNodeData`                    | yes      |             |
| target   | property | `SourceNodeData`                    | yes      |             |

## SourceRollupEdge

Kind: `type`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:185:1`

Pairwise projected dependency with references to canonical observed edges.

### Members

| Name               | Kind     | Type                | Required | Description |
| ------------------ | -------- | ------------------- | -------- | ----------- |
| evidenceEdgeIds    | property | `readonly number[]` | yes      |             |
| source             | property | `number`            | yes      |             |
| sourceSemanticPath | property | `string`            | yes      |             |
| target             | property | `number`            | yes      |             |
| targetSemanticPath | property | `string`            | yes      |             |
| weight             | property | `number`            | yes      |             |

## SourceRollupIndex

Kind: `type`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:195:1`

Cached semantic queries for one deterministic projection level.

### Members

| Name             | Kind     | Type                                               | Required | Description |
| ---------------- | -------- | -------------------------------------------------- | -------- | ----------- |
| byPair           | property | `ReadonlyMap<string, SourceRollupEdge>`            | yes      |             |
| outgoingBySource | property | `ReadonlyMap<string, readonly SourceRollupEdge[]>` | yes      |             |

## SourceVisibility

Kind: `unknown`
Module: `src/types/sourceGraph.ts`
Source: `src/types/sourceGraph.ts:18:1`

## summarizeSourceNode

Kind: `function`
Module: `src/features/source-graph/domain/summarizeSourceNode.ts`
Source: `src/features/source-graph/domain/summarizeSourceNode.ts:9:1`

Recompute one container summary from canonical containment and observed relations.

### Signatures

- `(sourceGraph: SourceGraph, index: SourceGraphIndex, semanticPath: string) => SourceNodeSummary | undefined`
  - index: `SourceGraphIndex`
  - semanticPath: `string`
  - sourceGraph: `SourceGraph`
  - returns: `SourceNodeSummary | undefined`
