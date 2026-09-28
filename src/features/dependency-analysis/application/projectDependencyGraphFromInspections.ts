import type { InspectedPackage, ProjectInspection } from '@ankhorage/project-detector/types';

import type {
  DependencyGraph,
  DependencyGraphInspectionProjectInput,
  DependencyGraphPackage,
} from '../../../types/dependencyGraph.js';
import type { SourceGraph } from '../../../types/sourceGraph.js';
import { projectDependencyGraphFromSourceGraph } from '../domain/projectDependencyGraphFromSourceGraph.js';
import { assertDependencyGraphInspections } from './assertDependencyGraphInspections.js';

/*** Project a previously analyzed source graph into the established package/module view. */
export function projectDependencyGraphFromInspections(
  sourceGraph: SourceGraph,
  projects: readonly DependencyGraphInspectionProjectInput[],
): DependencyGraph {
  assertDependencyGraphInspections(projects);
  const packages = projects.flatMap(createInspectedPackages);
  assertUniqueFocusNames(packages);
  return projectDependencyGraphFromSourceGraph(sourceGraph, packages, projects);
}

/*** Normalize one supplied inspection into dependency-analysis package contexts. */
function createInspectedPackages(
  project: DependencyGraphInspectionProjectInput,
): readonly DependencyGraphPackage[] {
  const { inspection } = project;
  return selectFocusPackages(inspection).map((detected) => {
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
}

/*** Select the root plus packages declared by root workspace metadata as graph focus. */
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
