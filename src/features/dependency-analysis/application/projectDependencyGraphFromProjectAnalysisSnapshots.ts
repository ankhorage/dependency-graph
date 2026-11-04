import type { DependencyGraph, DependencyGraphPackage } from '../../../types/dependencyGraph.js';
import type { ProjectAnalysisSnapshot } from '../../../types/projectAnalysisSnapshot.js';
import type { SourceGraph } from '../../../types/sourceGraph.js';
import { projectDependencyGraphFromSourceGraph } from '../domain/projectDependencyGraphFromSourceGraph.js';

/*** Project recomposed portable source facts through the established package/module graph view. */
export function projectDependencyGraphFromProjectAnalysisSnapshots(
  sourceGraph: SourceGraph,
  snapshots: readonly ProjectAnalysisSnapshot[],
): DependencyGraph {
  const packages = snapshots.flatMap(createSnapshotPackages);
  assertUniqueFocusNames(packages);
  return projectDependencyGraphFromSourceGraph(
    sourceGraph,
    packages,
    snapshots.map(({ projectId: id, packages: detected }) => ({ id, packages: detected })),
  );
}

/*** Normalize portable package and workspace facts into dependency projection contexts. */
function createSnapshotPackages(
  snapshot: ProjectAnalysisSnapshot,
): readonly DependencyGraphPackage[] {
  const rootPackage = snapshot.packages.find(({ rootPath }) => rootPath === '.');
  const workspaceRoots = new Set(
    snapshot.workspaces
      .filter(({ rootPath }) => rootPath === '.')
      .flatMap(({ packagePaths }) => packagePaths),
  );
  const workspacePackages = snapshot.packages.filter(
    ({ rootPath }) => rootPath !== '.' && workspaceRoots.has(rootPath),
  );
  const root = rootPackage ?? { rootPath: '.' };
  return [root, ...workspacePackages].map(({ rootPath: relativeRoot, name }) => {
    const id = `${snapshot.projectId}:${relativeRoot}`;
    return {
      id,
      nodeId: `package:${id}`,
      projectId: snapshot.projectId,
      relativeRoot,
      ...(name === undefined ? {} : { name }),
    } satisfies DependencyGraphPackage;
  });
}

/*** Reject ambiguous package names before resolving cross-project source imports. */
function assertUniqueFocusNames(packages: readonly DependencyGraphPackage[]): void {
  const named = packages.filter(
    (item): item is DependencyGraphPackage & { readonly name: string } => item.name !== undefined,
  );
  const duplicates = named.filter(
    (item, index) => named.findIndex(({ name }) => name === item.name) !== index,
  );
  if (duplicates.length > 0) {
    throw new Error(`Duplicate focus package name: ${duplicates[0]?.name ?? 'unknown'}.`);
  }
}
