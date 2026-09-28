import type { InspectedPackage, ProjectInspection } from '@ankhorage/project-detector/types';

import type {
  CreateDependencyGraphFromInspectionsInput,
  DependencyGraph,
  DependencyGraphInspectionProjectInput,
  DependencyGraphPackage,
} from '../../../types/dependencyGraph.js';
import { createSourceGraphFromInspectionsAsync } from '../../source-graph/composition/createSourceGraphFromInspectionsAsync.js';
import { assertDependencyGraphProjectIds } from '../application/assertDependencyGraphProjectIds.js';
import { projectDependencyGraphFromSourceGraph } from '../domain/projectDependencyGraphFromSourceGraph.js';

/***
 * Build one canonical dependency graph from already-inspected projects without rescanning them.
 */
export async function createDependencyGraphFromInspectionsAsync(
  input: CreateDependencyGraphFromInspectionsInput,
): Promise<DependencyGraph> {
  assertDependencyGraphProjectIds(input.projects);
  const inspected = input.projects.map(createInspectedInput);
  const packages = inspected.flatMap(({ packages: projectPackages }) => projectPackages);
  assertUniqueFocusNames(packages);
  const sourceGraph = await createSourceGraphFromInspectionsAsync({
    projects: input.projects,
    ...(input.signal === undefined ? {} : { signal: input.signal }),
  });
  return projectDependencyGraphFromSourceGraph(sourceGraph, packages, input.projects);
}

interface InspectedInput {
  readonly packages: readonly DependencyGraphPackage[];
}

/*** Normalize one supplied inspection into dependency-analysis package contexts. */
function createInspectedInput(project: DependencyGraphInspectionProjectInput): InspectedInput {
  const { inspection } = project;
  if (!inspection.complete) {
    throw new Error(
      `Dependency graph inspection is incomplete for "${project.id}": ${inspection.diagnostics
        .map(({ message }) => message)
        .join('; ')}`,
    );
  }

  const detectedPackages = selectFocusPackages(inspection);
  const packages = detectedPackages.map((detected) => {
    const relativeRoot = detected.rootPath;
    const id = `${project.id}:${relativeRoot}`;
    return {
      id,
      nodeId: `package:${id}`,
      projectId: project.id,
      relativeRoot,
      ...(detected.name === undefined ? {} : { name: detected.name }),
    } satisfies DependencyGraphPackage;
  });

  return { packages };
}

/*** Select the repository root plus packages declared by root workspace metadata as graph focus. */
function selectFocusPackages(inspection: ProjectInspection): readonly InspectedPackage[] {
  const rootPackage = inspection.packages.find(({ rootPath }) => rootPath === '.');
  const workspaceRoots = new Set(
    inspection.workspaces
      .filter(({ rootPath }) => rootPath === '.')
      .flatMap(({ packagePaths }) => packagePaths),
  );
  const workspacePackages = inspection.packages.filter(
    ({ rootPath }) => rootPath !== '.' && workspaceRoots.has(rootPath),
  );
  const root = rootPackage ?? { rootPath: '.', detection: inspection.detection, manifestPath: '' };
  return [root, ...workspacePackages];
}

/*** Reject ambiguous package names before resolving cross-project source imports. */
function assertUniqueFocusNames(packages: readonly DependencyGraphPackage[]): void {
  const named = packages.filter(
    (packageContext): packageContext is DependencyGraphPackage & { readonly name: string } =>
      packageContext.name !== undefined,
  );
  const duplicates = named.filter(
    (item, index) => named.findIndex(({ name }) => name === item.name) !== index,
  );
  if (duplicates.length > 0) {
    throw new Error(`Duplicate focus package name: ${duplicates[0]?.name ?? 'unknown'}.`);
  }
}
