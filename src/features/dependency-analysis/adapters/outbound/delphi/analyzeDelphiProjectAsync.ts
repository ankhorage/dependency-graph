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
import { collectInspectedSourceFiles } from '../../../utils/collectInspectedSourceFiles.js';
import { delphiPackageForFile } from './delphiPackageForFile.js';
import { extractDelphiDependencies } from './extractDelphiDependencies.js';
import { extractDelphiPackageFromImport } from './extractDelphiPackageFromImport.js';

/*** Analyze one detected Delphi package into unit/import dependency evidence. */
export async function analyzeDelphiProjectAsync(
  context: DependencyGraphAnalyzerContext,
): Promise<DependencyGraphFragment> {
  const language = context.package.detection.languages.find(({ id }) => id === 'delphi');
  const sourceRoots = language?.sourceRoots ?? ['src', 'Source', '.'];
  const files = collectInspectedSourceFiles(
    context,
    sourceRoots,
    (file) => ['.pas', '.pp', '.dpr'].some((extension) => file.toLowerCase().endsWith(extension)),
    ['.git', 'build', 'coverage', 'dist', 'lib'],
  );
  const sources = await Promise.all(
    files.map(async (file) => {
      const dependencies = extractDelphiDependencies(await readFile(file, 'utf8'));
      return {
        file,
        dependencies,
        packageName: delphiPackageForFile(
          context.package.rootPath,
          sourceRoots,
          file,
          dependencies.unitName,
        ),
      };
    }),
  );
  const intrinsicPackages = new Set(
    sources.map(({ packageName }) => packageName).filter((packageName) => packageName !== ''),
  );
  const nodes = new Map<string, GraphNode<DependencyGraphNodeData>>();
  for (const packageName of intrinsicPackages) addIntrinsicHierarchy(context, packageName, nodes);
  const edges = new Map<string, GraphEdge<DependencyGraphEdgeData>>();

  for (const { file, packageName, dependencies } of sources) {
    context.signal?.throwIfAborted();
    const sourceNodeId = nodeIdForPackage(context, packageName);
    for (const specifier of dependencies.imports) {
      addImport(context, file, sourceNodeId, specifier, intrinsicPackages, nodes, edges);
    }
  }
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

/*** Aggregate one Delphi uses-clause import into stable target nodes and weighted evidence. */
function addImport(
  context: DependencyGraphAnalyzerContext,
  sourceFile: string,
  sourceNodeId: string,
  specifier: string,
  intrinsicPackages: ReadonlySet<string>,
  nodes: Map<string, GraphNode<DependencyGraphNodeData>>,
  edges: Map<string, GraphEdge<DependencyGraphEdgeData>>,
): void {
  const targetPackage = extractDelphiPackageFromImport(specifier);
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
      analyzerId: 'delphi',
      weight: (existing?.data.weight ?? 0) + 1,
      evidence: [...(existing?.data.evidence ?? []), evidence],
    },
  });
}

/*** Materialize a Delphi package and all ancestor package nodes. */
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

/*** Resolve a Delphi package node inside the current focus package. */
function nodeIdForPackage(context: DependencyGraphAnalyzerContext, packageName: string): string {
  return packageName === '' ? context.package.nodeId : `${context.package.nodeId}#${packageName}`;
}
