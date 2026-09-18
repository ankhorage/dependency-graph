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
import { collectJavaFilesAsync } from './collectJavaFilesAsync.js';
import { extractJavaDependencies } from './extractJavaDependencies.js';
import { extractJavaPackageFromImport } from './extractJavaPackageFromImport.js';

/*** Analyze one detected Java package into package/import dependency evidence. */
export async function analyzeJavaProjectAsync(
  context: DependencyGraphAnalyzerContext,
): Promise<DependencyGraphFragment> {
  const language = context.package.detection.languages.find(({ id }) => id === 'java');
  const files = await collectJavaFilesAsync(
    context.package.rootPath,
    language?.sourceRoots ?? ['src/main/java', '.'],
    context.excludedRoots,
    context.signal,
  );
  const sources = await Promise.all(
    files.map(async (file) => ({
      file,
      dependencies: extractJavaDependencies(await readFile(file, 'utf8')),
    })),
  );
  const intrinsicPackages = new Set(
    sources
      .map(({ dependencies }) => dependencies.packageName)
      .filter((packageName) => packageName !== ''),
  );
  const nodes = new Map<string, GraphNode<DependencyGraphNodeData>>();
  for (const packageName of intrinsicPackages) addIntrinsicHierarchy(context, packageName, nodes);
  const edges = new Map<string, GraphEdge<DependencyGraphEdgeData>>();

  for (const { file, dependencies } of sources) {
    context.signal?.throwIfAborted();
    const sourceNodeId = nodeIdForPackage(context, dependencies.packageName);
    for (const specifier of dependencies.imports) {
      addImport(context, file, sourceNodeId, specifier, intrinsicPackages, nodes, edges);
    }
  }
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

/*** Aggregate one Java import into stable target nodes and weighted evidence. */
function addImport(
  context: DependencyGraphAnalyzerContext,
  sourceFile: string,
  sourceNodeId: string,
  specifier: string,
  intrinsicPackages: ReadonlySet<string>,
  nodes: Map<string, GraphNode<DependencyGraphNodeData>>,
  edges: Map<string, GraphEdge<DependencyGraphEdgeData>>,
): void {
  const targetPackage = extractJavaPackageFromImport(specifier);
  if (targetPackage === '') return;
  const intrinsic = intrinsicPackages.has(targetPackage);
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
      analyzerId: 'java',
      weight: (existing?.data.weight ?? 0) + 1,
      evidence: [...(existing?.data.evidence ?? []), evidence],
    },
  });
}

/*** Materialize a Java package and all ancestor package nodes. */
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

/*** Resolve a Java package node inside the current focus package. */
function nodeIdForPackage(context: DependencyGraphAnalyzerContext, packageName: string): string {
  return packageName === '' ? context.package.nodeId : `${context.package.nodeId}#${packageName}`;
}
