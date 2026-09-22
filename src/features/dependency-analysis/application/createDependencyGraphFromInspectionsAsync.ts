import path from 'node:path';

import { createGraph } from '@ankhorage/graph';
import type { InspectedPackage, ProjectInspection } from '@ankhorage/project-detector/types';

import type {
  CreateDependencyGraphFromInspectionsInput,
  DependencyGraph,
  DependencyGraphAnalyzer,
  DependencyGraphFragment,
  DependencyGraphInspectionProjectInput,
  DependencyGraphPackage,
} from '../../../types/dependencyGraph.js';
import { cppDependencyGraphAnalyzer } from '../adapters/outbound/cpp/cppDependencyGraphAnalyzer.js';
import { delphiDependencyGraphAnalyzer } from '../adapters/outbound/delphi/delphiDependencyGraphAnalyzer.js';
import { javaDependencyGraphAnalyzer } from '../adapters/outbound/java/javaDependencyGraphAnalyzer.js';
import { kotlinDependencyGraphAnalyzer } from '../adapters/outbound/kotlin/kotlinDependencyGraphAnalyzer.js';
import { pythonDependencyGraphAnalyzer } from '../adapters/outbound/python/pythonDependencyGraphAnalyzer.js';
import { typescriptDependencyGraphAnalyzer } from '../adapters/outbound/typescript/typescriptDependencyGraphAnalyzer.js';
import { createFocusPackageNode } from '../domain/createFocusPackageNode.js';
import { readDependencyDeclarationsAsync } from '../domain/readDependencyDeclarationsAsync.js';
import { assertDependencyGraphProjectIds } from './assertDependencyGraphProjectIds.js';

/***
 * Build one canonical dependency graph from already-inspected projects without rescanning them.
 */
export async function createDependencyGraphFromInspectionsAsync(
  input: CreateDependencyGraphFromInspectionsInput
): Promise<DependencyGraph> {
  assertDependencyGraphProjectIds(input.projects);
  const analyzers = input.analyzers ?? [
    typescriptDependencyGraphAnalyzer,
    cppDependencyGraphAnalyzer,
    delphiDependencyGraphAnalyzer,
    javaDependencyGraphAnalyzer,
    kotlinDependencyGraphAnalyzer,
    pythonDependencyGraphAnalyzer,
  ];
  const inspected = await Promise.all(input.projects.map(createInspectedInputAsync));
  const packages = inspected.flatMap(({ packages: projectPackages }) => projectPackages);
  const focusPackages = createFocusPackageMap(packages);
  const fragments = await analyzePackagesAsync(inspected, analyzers, focusPackages, input.signal);
  const nodes = new Map(
    packages.map(packageContext => {
      const node = createFocusPackageNode(packageContext);
      return [node.id, node] as const;
    })
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

/*** Normalize one supplied inspection into dependency-analysis package contexts. */
async function createInspectedInputAsync(
  project: DependencyGraphInspectionProjectInput
): Promise<InspectedInput> {
  const { inspection } = project;
  if (!inspection.complete) {
    throw new Error(
      `Dependency graph inspection is incomplete for "${project.id}": ${inspection.diagnostics
        .map(({ message }) => message)
        .join('; ')}`
    );
  }

  const detectedPackages: readonly InspectedPackage[] =
    inspection.packages.length > 0
      ? inspection.packages
      : [{ rootPath: '.', detection: inspection.detection, manifestPath: '' }];

  const packages = await Promise.all(
    detectedPackages.map(async detected => {
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
    })
  );

  return { inspection, packages };
}

/*** Analyze each package with the first compatible analyzer while preserving mixed-language inputs. */
async function analyzePackagesAsync(
  inspected: readonly InspectedInput[],
  analyzers: readonly DependencyGraphAnalyzer[],
  focusPackages: ReadonlyMap<string, string>,
  signal: AbortSignal | undefined
): Promise<readonly DependencyGraphFragment[]> {
  const tasks = inspected.flatMap(({ inspection, packages }) =>
    packages.flatMap(packageContext => {
      const analyzer = analyzers.find(({ supports }) => supports(packageContext.detection));
      if (analyzer === undefined) return [];

      const excludedRoots = packages
        .filter(
          candidate =>
            candidate.id !== packageContext.id &&
            candidate.rootPath.startsWith(`${packageContext.rootPath}${path.sep}`)
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
    })
  );

  if (tasks.length === 0) {
    throw new Error('No dependency graph analyzer supports the supplied projects.');
  }
  return Promise.all(tasks);
}

/*** Build a unique package-name map for focus routing across repositories and workspaces. */
function createFocusPackageMap(
  packages: readonly DependencyGraphPackage[]
): ReadonlyMap<string, string> {
  const named = packages.filter(
    (
      packageContext
    ): packageContext is DependencyGraphPackage & { readonly name: string } =>
      packageContext.name !== undefined
  );
  const duplicates = named.filter(
    (item, index) => named.findIndex(({ name }) => name === item.name) !== index
  );
  if (duplicates.length > 0) {
    throw new Error(`Duplicate focus package name: ${duplicates[0]?.name ?? 'unknown'}.`);
  }
  return new Map(named.map(({ name, nodeId }) => [name, nodeId]));
}
