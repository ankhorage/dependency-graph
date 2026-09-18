import { readFile } from 'node:fs/promises';

import type { GraphEdge, GraphNode } from '@ankhorage/graph';
import { toPortablePath } from '@ankhorage/utility/node/path';

import type {
  DependencyGraphAnalyzerContext,
  DependencyGraphEdgeData,
  DependencyGraphFragment,
  DependencyGraphNodeData,
  DependencyImportEvidence,
} from '../../../../../types/dependencyGraph.js';
import { collectTypeScriptFilesAsync } from './collectTypeScriptFilesAsync.js';
import {
  createTypeScriptModuleNodes,
  modulePathForFile,
} from './createTypeScriptModuleNodes.js';
import { extractTypeScriptImports } from './extractTypeScriptImports.js';
import { resolveTypeScriptImport } from './resolveTypeScriptImport.js';

/*** Analyze one detected TypeScript package into module/import dependency evidence. */
export async function analyzeTypeScriptProjectAsync(
  context: DependencyGraphAnalyzerContext,
): Promise<DependencyGraphFragment> {
  const language = context.package.detection.languages.find(({ id }) => id === 'typescript');
  const files = await collectTypeScriptFilesAsync(
    context.package.rootPath,
    language?.sourceRoots ?? ['.'],
    context.excludedRoots,
    context.signal,
  );
  const sourceFiles = new Set(files);
  const nodes = new Map(
    createTypeScriptModuleNodes(context.package, files).map((node) => [node.id, node] as const),
  );
  const edges = new Map<string, GraphEdge<DependencyGraphEdgeData>>();

  for (const file of files) {
    context.signal?.throwIfAborted();
    const sourceNodeId = nodeIdForFile(context, file);
    const imports = extractTypeScriptImports(file, await readFile(file, 'utf8'));
    for (const specifier of imports) {
      addImport(context, file, sourceNodeId, specifier, sourceFiles, nodes, edges);
    }
  }

  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

/*** Aggregate one import into stable target nodes and weighted evidence. */
function addImport(
  context: DependencyGraphAnalyzerContext,
  sourceFile: string,
  sourceNodeId: string,
  specifier: string,
  sourceFiles: ReadonlySet<string>,
  nodes: Map<string, GraphNode<DependencyGraphNodeData>>,
  edges: Map<string, GraphEdge<DependencyGraphEdgeData>>,
): void {
  const resolved = resolveTypeScriptImport(
    context.package,
    sourceFile,
    specifier,
    sourceFiles,
    context.focusPackages,
  );
  if (resolved.targetNodeId === sourceNodeId) return;
  addExternalNode(context, resolved, nodes);
  const edgeId = `${sourceNodeId}->${resolved.targetNodeId}`;
  const evidence: DependencyImportEvidence = {
    sourceFile: toPortablePath(pathRelative(context.package.rootPath, sourceFile)),
    specifier,
    classification: resolved.classification,
    declarations: resolved.declarations,
  };
  const existing = edges.get(edgeId);
  edges.set(edgeId, {
    id: edgeId,
    source: sourceNodeId,
    target: resolved.targetNodeId,
    data: {
      kind: 'import',
      analyzerId: 'typescript',
      weight: (existing?.data.weight ?? 0) + 1,
      evidence: [...(existing?.data.evidence ?? []), evidence],
    },
  });
}

/*** Materialize vendor and unknown targets while focus/intrinsic targets are owned elsewhere. */
function addExternalNode(
  context: DependencyGraphAnalyzerContext,
  resolved: ReturnType<typeof resolveTypeScriptImport>,
  nodes: Map<string, GraphNode<DependencyGraphNodeData>>,
): void {
  if (resolved.classification === 'intrinsic' || resolved.classification === 'focus') return;
  if (nodes.has(resolved.targetNodeId)) return;
  nodes.set(resolved.targetNodeId, {
    id: resolved.targetNodeId,
    data: {
      kind: 'package',
      classification: resolved.classification,
      focus: false,
      label: resolved.packageName ?? resolved.targetNodeId.replace(/^unknown:/u, ''),
      ...(resolved.packageName === undefined ? {} : { packageName: resolved.packageName }),
    },
  });
}

/*** Resolve the source node at package granularity, using the package root for root-level files. */
function nodeIdForFile(context: DependencyGraphAnalyzerContext, file: string): string {
  const modulePath = modulePathForFile(context.package.rootPath, file);
  return modulePath === '' ? context.package.nodeId : `${context.package.nodeId}#${modulePath}`;
}

/*** Keep path.relative isolated so dependency evidence stays platform-neutral. */
function pathRelative(rootPath: string, file: string): string {
  return new URL(file, `file://${rootPath.endsWith('/') ? rootPath : `${rootPath}/`}`).pathname;
}
