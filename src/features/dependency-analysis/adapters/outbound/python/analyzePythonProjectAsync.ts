import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { GraphEdge, GraphNode } from '@ankhorage/graph';
import { toPortablePath } from '@ankhorage/utility/node/path';

import type {
  DependencyGraphAnalyzerContext,
  DependencyGraphEdgeData,
  DependencyGraphFragment,
  DependencyGraphNodeData,
  DependencyImportEvidence,
} from '../../../../../types/dependencyGraph.js';
import { collectPythonFilesAsync } from './collectPythonFilesAsync.js';
import { extractPythonDependencies } from './extractPythonDependencies.js';
import { extractPythonPackageFromImport } from './extractPythonPackageFromImport.js';
import { pythonPackageForFile } from './pythonPackageForFile.js';

/*** Analyze one detected Python package into package/import dependency evidence. */
export async function analyzePythonProjectAsync(
  context: DependencyGraphAnalyzerContext,
): Promise<DependencyGraphFragment> {
  const language = context.package.detection.languages.find(({ id }) => id === 'python');
  const sourceRoots = language?.sourceRoots ?? ['src', 'app', '.'];
  const files = await collectPythonFilesAsync(
    context.package.rootPath,
    sourceRoots,
    context.excludedRoots,
    context.signal,
  );
  const sources = await Promise.all(
    files.map(async (file) => ({
      file,
      packageName: pythonPackageForFile(context.package.rootPath, sourceRoots, file),
      dependencies: extractPythonDependencies(await readFile(file, 'utf8')),
    })),
  );
  const intrinsicPackages = new Set(
    sources.map(({ packageName }) => packageName).filter((packageName) => packageName !== ''),
  );
  const topLevelPackages = new Set(
    [...intrinsicPackages].map((packageName) => packageName.split('.')[0] ?? packageName),
  );
  const nodes = new Map<string, GraphNode<DependencyGraphNodeData>>();
  for (const packageName of intrinsicPackages) addIntrinsicHierarchy(context, packageName, nodes);
  const edges = new Map<string, GraphEdge<DependencyGraphEdgeData>>();

  for (const { file, packageName, dependencies } of sources) {
    context.signal?.throwIfAborted();
    const sourceNodeId = nodeIdForPackage(context, packageName);
    for (const specifier of dependencies.imports) {
      addImport(context, file, sourceNodeId, specifier, topLevelPackages, nodes, edges);
    }
  }
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

/*** Aggregate one Python import into stable target nodes and weighted evidence. */
function addImport(
  context: DependencyGraphAnalyzerContext,
  sourceFile: string,
  sourceNodeId: string,
  specifier: string,
  topLevelPackages: ReadonlySet<string>,
  nodes: Map<string, GraphNode<DependencyGraphNodeData>>,
  edges: Map<string, GraphEdge<DependencyGraphEdgeData>>,
): void {
  const targetPackage = extractPythonPackageFromImport(specifier);
  if (targetPackage === '') return;
  const intrinsic = topLevelPackages.has(targetPackage);
  const targetNodeId = intrinsic
    ? nodeIdForPackage(context, targetPackage)
    : `unknown:${targetPackage}`;
  if (targetNodeId === sourceNodeId) return;
  if (!intrinsic && !nodes.has(targetNodeId)) {
    nodes.set(targetNodeId, {
      id: targetNodeId,
      data: {
        kind: 'package',
        classification: 'unknown',
        focus: false,
        label: targetPackage,
        packageName: targetPackage,
      },
    });
  }
  const edgeId = `${sourceNodeId}->${targetNodeId}`;
  const existing = edges.get(edgeId);
  const evidence: DependencyImportEvidence = {
    sourceFile: toPortablePath(path.relative(context.package.rootPath, sourceFile)),
    specifier,
    classification: intrinsic ? 'intrinsic' : 'unknown',
    declarations: [],
  };
  edges.set(edgeId, {
    id: edgeId,
    source: sourceNodeId,
    target: targetNodeId,
    data: {
      kind: 'import',
      analyzerId: 'python',
      weight: (existing?.data.weight ?? 0) + 1,
      evidence: [...(existing?.data.evidence ?? []), evidence],
    },
  });
}

/*** Materialize a Python package and all ancestor package nodes. */
function addIntrinsicHierarchy(
  context: DependencyGraphAnalyzerContext,
  packageName: string,
  nodes: Map<string, GraphNode<DependencyGraphNodeData>>,
): void {
  const segments = packageName.split('.');
  segments.forEach((_, index) => {
    const current = segments.slice(0, index + 1).join('.');
    const id = nodeIdForPackage(context, current);
    if (nodes.has(id)) return;
    nodes.set(id, {
      id,
      data: {
        kind: 'module',
        classification: 'intrinsic',
        focus: true,
        label: current.split('.').at(-1) ?? current,
        projectId: context.package.projectId,
        ...(context.package.name === undefined ? {} : { packageName: context.package.name }),
        path: current,
        parentPath: current.includes('.') ? current.split('.').slice(0, -1).join('.') : '',
      },
    });
  });
}

/*** Resolve a Python package node inside the current focus package. */
function nodeIdForPackage(context: DependencyGraphAnalyzerContext, packageName: string): string {
  return packageName === '' ? context.package.nodeId : `${context.package.nodeId}#${packageName}`;
}
