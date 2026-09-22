# Public API

## cppDependencyGraphAnalyzer

Kind: `value`
Module: `src/features/dependency-analysis/adapters/outbound/cpp/cppDependencyGraphAnalyzer.ts`
Source: `src/features/dependency-analysis/adapters/outbound/cpp/cppDependencyGraphAnalyzer.ts:5:14`

C++ analyzer adapter selected from project-detector language evidence.

## createDependencyGraphAsync

Kind: `function`
Module: `src/features/dependency-analysis/application/createDependencyGraphAsync.ts`
Source: `src/features/dependency-analysis/application/createDependencyGraphAsync.ts:11:1`

Inspect project roots, then delegate dependency topology construction to the inspection API.

### Signatures

- `(input: CreateDependencyGraphInput) => Promise<DependencyGraph>`
  - input: `CreateDependencyGraphInput`
  - returns: `Promise<DependencyGraph>`

## createDependencyGraphFromInspectionsAsync

Kind: `function`
Module: `src/features/dependency-analysis/application/createDependencyGraphFromInspectionsAsync.ts`
Source: `src/features/dependency-analysis/application/createDependencyGraphFromInspectionsAsync.ts:27:1`

Build one canonical dependency graph from already-inspected projects without rescanning them.

### Signatures

- `(input: CreateDependencyGraphFromInspectionsInput) => Promise<DependencyGraph>`
  - input: `CreateDependencyGraphFromInspectionsInput`
  - returns: `Promise<DependencyGraph>`

## CreateDependencyGraphFromInspectionsInput

Kind: `type`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:90:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| analyzers | property | `readonly DependencyGraphAnalyzer[]` | no |  |
| projects | property | `readonly DependencyGraphInspectionProjectInput[]` | yes |  |
| signal | property | `AbortSignal` | no |  |

## CreateDependencyGraphInput

Kind: `type`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:84:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| analyzers | property | `readonly DependencyGraphAnalyzer[]` | no |  |
| projects | property | `readonly DependencyGraphProjectInput[]` | yes |  |
| signal | property | `AbortSignal` | no |  |

## delphiDependencyGraphAnalyzer

Kind: `value`
Module: `src/features/dependency-analysis/adapters/outbound/delphi/delphiDependencyGraphAnalyzer.ts`
Source: `src/features/dependency-analysis/adapters/outbound/delphi/delphiDependencyGraphAnalyzer.ts:5:14`

Delphi analyzer adapter selected from project-detector language evidence.

## DependencyDeclaration

Kind: `type`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:10:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| kind | property | `DependencyDeclarationKind` | yes |  |
| range | property | `string` | yes |  |

## DependencyDeclarationKind

Kind: `unknown`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:7:1`

## DependencyGraph

Kind: `unknown`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:40:1`

## DependencyGraphAnalyzer

Kind: `type`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:76:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| analyzeAsync | property | `(context: DependencyGraphAnalyzerContext) => Promise<DependencyGraphFragment>` | yes |  |
| id | property | `string` | yes |  |
| supports | property | `(detection: ProjectDetection) => boolean` | yes |  |

## DependencyGraphAnalyzerContext

Kind: `type`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:68:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| excludedRoots | property | `readonly string[]` | yes |  |
| focusPackages | property | `ReadonlyMap<string, string>` | yes |  |
| inspection | property | `ProjectInspection` | yes |  |
| package | property | `DependencyGraphPackage` | yes |  |
| signal | property | `AbortSignal` | no |  |

## DependencyGraphEdgeData

Kind: `type`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:33:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| analyzerId | property | `string` | yes |  |
| evidence | property | `readonly DependencyImportEvidence[]` | yes |  |
| kind | property | `"import"` | yes |  |
| weight | property | `number` | yes |  |

## DependencyGraphFragment

Kind: `type`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:63:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| edges | property | `readonly GraphEdge<DependencyGraphEdgeData>[]` | yes |  |
| nodes | property | `readonly GraphNode<DependencyGraphNodeData>[]` | yes |  |

## DependencyGraphInspectionProjectInput

Kind: `type`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:47:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| id | property | `string` | yes |  |
| inspection | property | `ProjectInspection` | yes |  |

## DependencyGraphNodeData

Kind: `type`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:22:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| classification | property | `DependencyNodeClassification` | yes |  |
| focus | property | `boolean` | yes |  |
| kind | property | `DependencyNodeKind` | yes |  |
| label | property | `string` | yes |  |
| packageName | property | `string` | no |  |
| parentPath | property | `string` | no |  |
| path | property | `string` | no |  |
| projectId | property | `string` | no |  |

## DependencyGraphPackage

Kind: `type`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:52:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| declarations | property | `Readonly<Record<string, readonly DependencyDeclaration[]>>` | yes |  |
| detection | property | `ProjectDetection` | yes |  |
| id | property | `string` | yes |  |
| name | property | `string` | no |  |
| nodeId | property | `string` | yes |  |
| projectId | property | `string` | yes |  |
| relativeRoot | property | `string` | yes |  |
| rootPath | property | `string` | yes |  |

## DependencyGraphProjectInput

Kind: `type`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:42:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| id | property | `string` | yes |  |
| rootPath | property | `string` | yes |  |

## DependencyImportEvidence

Kind: `type`
Module: `src/types/dependencyGraph.ts`
Source: `src/types/dependencyGraph.ts:15:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| classification | property | `DependencyReferenceClassification` | yes |  |
| declarations | property | `readonly DependencyDeclaration[]` | yes |  |
| sourceFile | property | `string` | yes |  |
| specifier | property | `string` | yes |  |

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

## javaDependencyGraphAnalyzer

Kind: `value`
Module: `src/features/dependency-analysis/adapters/outbound/java/javaDependencyGraphAnalyzer.ts`
Source: `src/features/dependency-analysis/adapters/outbound/java/javaDependencyGraphAnalyzer.ts:5:14`

Java analyzer adapter selected from project-detector language evidence.

## kotlinDependencyGraphAnalyzer

Kind: `value`
Module: `src/features/dependency-analysis/adapters/outbound/kotlin/kotlinDependencyGraphAnalyzer.ts`
Source: `src/features/dependency-analysis/adapters/outbound/kotlin/kotlinDependencyGraphAnalyzer.ts:5:14`

Kotlin analyzer adapter selected from project-detector language evidence.

## pythonDependencyGraphAnalyzer

Kind: `value`
Module: `src/features/dependency-analysis/adapters/outbound/python/pythonDependencyGraphAnalyzer.ts`
Source: `src/features/dependency-analysis/adapters/outbound/python/pythonDependencyGraphAnalyzer.ts:5:14`

Python analyzer adapter selected from project-detector language evidence.

## typescriptDependencyGraphAnalyzer

Kind: `value`
Module: `src/features/dependency-analysis/adapters/outbound/typescript/typescriptDependencyGraphAnalyzer.ts`
Source: `src/features/dependency-analysis/adapters/outbound/typescript/typescriptDependencyGraphAnalyzer.ts:5:14`

TypeScript analyzer adapter selected from project-detector language evidence.
