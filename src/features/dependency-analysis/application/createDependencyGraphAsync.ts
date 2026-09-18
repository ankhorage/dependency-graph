import path from 'node:path';

import { createGraph } from '@ankhorage/graph';
import { inspectProjectAsync } from '@ankhorage/project-detector/node';
import type { InspectedPackage, ProjectInspection } from '@ankhorage/project-detector/types';

import type {
  CreateDependencyGraphInput,
  DependencyGraph,
  DependencyGraphAnalyzer,
  DependencyGraphFragment,
  DependencyGraphPackage,
  DependencyGraphProjectInput,
} from '../../../types/dependencyGraph.js';
import { javaDependencyGraphAnalyzer } from '../adapters/outbound/java/javaDependencyGraphAnalyzer.js';
import { typescriptDependencyGraphAnalyzer } from '../adapters/outbound/typescript/typescriptDependencyGraphAnalyzer.js';
import { createFocusPackageNode } from '../domain/createFocusPackageNode.js';
import { readDependencyDeclarationsAsync } from '../domain/readDependencyDeclarationsAsync.js';

/*** Inspect projects, run supported analyzers and combine their evidence into one canonical graph. */
export async function createDependencyGraphAsync(
  input: CreateDependencyGraphInput,
): Promise<DependencyGraph> {
  assertProjectInputs(input.projects);
  const analyzers = input.analyzers ?? [typescriptDependencyGraphAnalyzer, javaDependencyGraphAnalyzer];
  const inspected = await Promise.all(
    input.projects.map((project) => inspectProjectInputAsync(project, input.signal)),
  );
  const packages = inspected.flatMap(({ packages }) => packages);
  const focusPackages = createFocusPackageMap(packages);
  const fragments = await analyzePackagesAsync(inspected, analyzers, focusPackages, input.signal);
  const nodes = new Map(
    packages.map((packageContext) => {
      const node = createFocusPackageNode(packageContext);
      return [node.id, node] as const;
    }),
  );

  for (const node of fragments.flatMap(({ nodes: fragmentNodes }) => fragmentNodes)) {
    if (!nodes.has(node.id)) nodes.set(node.id, node);
  }

  const edges = fragments.flatMap(({ edges: fragmentEdges }) => fragmentEdges);
  return createGraph({ nodes: [...nodes.values()], edges });
}

interface InspectedInput {
  readonly inspection: ProjectInspection;
  readonly packages: readonly DependencyGraphPackage[];
}

/*** Inspect one input and normalize its package/workspace contexts. */
async function inspectProjectInputAsync(
  project: DependencyGraphProjectInput,
  signal: AbortSignal | undefined,
): Promise<InspectedInput> {
  const inspection = await inspectProjectAsync(project.rootPath, {
    ...(signal === undefined ? {} : { signal }),
  });
  if (!inspection.complete) {
    throw new Error(
      `Dependency graph inspection is incomplete for "${project.id}": ${inspection.diagnostics
        .map(({ message }) => message)
        .join('; ')}`,
    );
  }

  const detectedPackages: readonly InspectedPackage[] =
    inspection.packages.length > 0
      ? inspection.packages
      : [{ rootPath: '.', detection: inspection.detection, manifestPath: '' }];

  const packages = await Promise.all(
    detectedPackages.map(async (detected) => {
      const relativeRoot = detected.rootPath;
      const id = `${project.id}:${relativeRoot}`;
      const manifestPath =
        detected.manifestPath === ''
          ? undefined
          : path.join(inspection.rootPath, detected.manifestPath);

      return {
        id,
        nodeId: `package:${id}`,
        projectId: project.id,
        rootPath: path.resolve(inspection.rootPath, relativeRoot),
        relativeRoot,
        ...(detected.name === undefined ? {} : { name: detected.name }),
        detection: detected.detection,
        declarations: await readDependencyDeclarationsAsync(manifestPath),
      } satisfies DependencyGraphPackage;
    }),
  );
  return { inspection, packages };
}

/*** Analyze each package with the first compatible analyzer and retain mixed-language packages safely. */
async function analyzePackagesAsync(
  inspected: readonly InspectedInput[],
  analyzers: readonly DependencyGraphAnalyzer[],
  focusPackages: ReadonlyMap<string, string>,
  signal: AbortSignal | undefined,
): Promise<readonly DependencyGraphFragment[]> {
  const tasks = inspected.flatMap(({ inspection, packages }) =>
    packages.flatMap((packageContext) => {
      const analyzer = analyzers.find(({ supports }) => supports(packageContext.detection));
      if (analyzer === undefined) return [];

      const excludedRoots = packages
        .filter(
          (candidate) =>
            candidate.id !== packageContext.id &&
            candidate.rootPath.startsWith(`${packageContext.rootPath}${path.sep}`),
        )
        .map(({ rootPath }) => rootPath);

      return [
        analyzer.analyzeAsync({
          package: packageContext,
          inspection,
          focusPackages,
          excludedRoots,
          ...(signal === undefined ? {} : { signal }),
        }),
      ];
    }),
  );

  if (tasks.length === 0) {
    throw new Error('No dependency graph analyzer supports the supplied projects.');
  }
  return Promise.all(tasks);
}

/*** Build a unique package-name map for focus routing across repositories and workspaces. */
function createFocusPackageMap(
  packages: readonly DependencyGraphPackage[],
): ReadonlyMap<string, string> {
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
  return new Map(named.map(({ name, nodeId }) => [name, nodeId]));
}

/*** Reject ambiguous project IDs before filesystem inspection. */
function assertProjectInputs(projects: readonly DependencyGraphProjectInput[]): void {
  if (projects.length === 0) {
    throw new Error('At least one dependency graph project is required.');
  }

  const ids = projects.map(({ id }) => id);
  if (ids.some((id) => id.trim() === '')) {
    throw new Error('Dependency graph project IDs must be non-empty.');
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error('Dependency graph project IDs must be unique.');
  }
}
