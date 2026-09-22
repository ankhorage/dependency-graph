# @ankhorage/dependency-graph

## 0.7.2

### Patch Changes

- eee8614: Classify TypeScript vendors only from declared dependency evidence and resolve Java/Kotlin intrinsic member imports from source-declared package ownership before falling back to unknown references.

## 0.7.1

### Patch Changes

- 6d555e3: Scope dependency-analysis focus packages to the selected root and root-declared workspaces while retaining unrelated nested package roots as analysis boundaries.

## 0.7.0

### Minor Changes

- 3587a10: Allow dependency analysis to consume existing Project Detector inspections without rescanning project roots, while keeping the path-based API as a convenience wrapper.

## 0.6.2

### Patch Changes

- 1a0544d: Select analyzer sources from Project Detector's released, pruned inspection file list so generated `.ankh` materialization stays out of dependency graphs, including projects with root-level source files.

## 0.6.1

### Patch Changes

- 7bda07e: Ignore the generated `.ankh` root during project inspection and dependency source collection so materialized Ankh artifacts do not interrupt graph analysis or become graph evidence.

## 0.6.0

### Minor Changes

- c037021: Add canonical Delphi unit/import dependency analysis.

## 0.5.0

### Minor Changes

- 7174cf6: Add canonical C++ include/dependency analysis.

## 0.4.0

### Minor Changes

- 668b594: Add canonical Python package/import dependency analysis.

## 0.3.0

### Minor Changes

- 836b3e2: Add canonical Kotlin package/import dependency analysis.

## 0.2.0

### Minor Changes

- f6d3ea2: Add canonical Java package/import dependency analysis alongside the existing TypeScript analyzer.

## 0.1.0

### Minor Changes

- b528b28: Add project-aware dependency graph analysis with a first TypeScript import analyzer.
