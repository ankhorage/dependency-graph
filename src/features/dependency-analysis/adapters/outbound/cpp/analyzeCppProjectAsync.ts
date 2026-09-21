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
import type { CppInclude } from './extractCppDependencies.js';
import { extractCppDependencies } from './extractCppDependencies.js';
import { extractCppPackageFromInclude } from './extractCppPackageFromInclude.js';

/*** Analyze one detected C++ package into namespace/include dependency evidence. */
export async function analyzeCppProjectAsync(
  context: DependencyGraphAnalyzerContext,
): Promise<DependencyGraphFragment> {
  const language = context.package.detection.languages.find(({ id }) => id === 'cpp');
  const files = collectInspectedSourceFiles(
    context,
    language?.sourceRoots ?? ['src', '.'],
    (file) =>
      ['.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx'].some((extension) => file.endsWith(extension)),
    ['.git', 'build', 'coverage', 'dist', 'out'],
  );
  const sources = await Promise.all(
    files.map(async (file) => ({
      file,
      dependencies: extractCppDependencies(await readFile(file, 'utf8')),
    })),
  );
  const intrinsicNamespaces = new Set(
    sources
      .map(({ dependencies }) => dependencies.namespace)
      .filter((namespace) => namespace !== ''),
  );
  const nodes = new Map<string, GraphNode<DependencyGraphNodeData>>();
  for (const namespace of intrinsicNamespaces) addIntrinsicHierarchy(context, namespace, nodes);
  const edges = new Map<string, GraphEdge<DependencyGraphEdgeData>>();

  for (const { file, dependencies } of sources) {
    context.signal?.throwIfAborted();
    const sourceNodeId = nodeIdForNamespace(context, dependencies.namespace);
    for (const include of dependencies.includes) {
      addInclude(context, file, sourceNodeId, include, nodes, edges);
    }
  }
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

/*** Aggregate one C++ include into stable target nodes and weighted evidence. */
function addInclude(
  context: DependencyGraphAnalyzerContext,
  sourceFile: string,
  sourceNodeId: string,
  include: CppInclude,
  nodes: Map<string, GraphNode<DependencyGraphNodeData>>,
  edges: Map<string, GraphEdge<DependencyGraphEdgeData>>,
): void {
  const targetPackage = extractCppPackageFromInclude(include.specifier);
  if (targetPackage === '') return;
  const targetNodeId = include.local
    ? nodeIdForNamespace(context, targetPackage)
    : `unknown:${targetPackage}`;
  if (targetNodeId === sourceNodeId) return;

  if (include.local) {
    addIntrinsicHierarchy(context, targetPackage, nodes);
  } else if (!nodes.has(targetNodeId)) {
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
    specifier: include.specifier,
    classification: include.local ? 'intrinsic' : 'unknown',
    declarations: [],
  };
  edges.set(edgeId, {
    id: edgeId,
    source: sourceNodeId,
    target: targetNodeId,
    data: {
      kind: 'import',
      analyzerId: 'cpp',
      weight: (existing?.data.weight ?? 0) + 1,
      evidence: [...(existing?.data.evidence ?? []), evidence],
    },
  });
}

/*** Materialize a C++ namespace/package and all ancestor nodes. */
function addIntrinsicHierarchy(
  context: DependencyGraphAnalyzerContext,
  namespace: string,
  nodes: Map<string, GraphNode<DependencyGraphNodeData>>,
): void {
  const segments = namespace.split('.');
  segments.forEach((_, index) => {
    const current = segments.slice(0, index + 1).join('.');
    const id = nodeIdForNamespace(context, current);
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

/*** Resolve a C++ namespace/package node inside the current focus package. */
function nodeIdForNamespace(context: DependencyGraphAnalyzerContext, namespace: string): string {
  return namespace === '' ? context.package.nodeId : `${context.package.nodeId}#${namespace}`;
}
