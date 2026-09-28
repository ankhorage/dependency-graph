import type { GraphEdge, GraphNode } from '@ankhorage/graph';
import { createGraph } from '@ankhorage/graph';

import type {
  DependencyGraph,
  DependencyGraphEdgeData,
  DependencyGraphInspectionProjectInput,
  DependencyGraphNodeData,
  DependencyGraphPackage,
  DependencyImportEvidence,
  DependencyReferenceClassification,
} from '../../../types/dependencyGraph.js';
import type {
  SourceGraph,
  SourceNodeData,
  SourceRelationEvidence,
} from '../../../types/sourceGraph.js';
import { createFocusPackageNode } from './createFocusPackageNode.js';

/*** Derive the established module/package dependency view from canonical source facts. */
export function projectDependencyGraphFromSourceGraph(
  sourceGraph: SourceGraph,
  packages: readonly DependencyGraphPackage[],
  projects: readonly DependencyGraphInspectionProjectInput[],
): DependencyGraph {
  const detectedRoots = new Map(
    projects.map(
      ({ id, inspection }) => [id, inspection.packages.map(({ rootPath }) => rootPath)] as const,
    ),
  );
  const nodes = new Map<string, GraphNode<DependencyGraphNodeData>>(
    packages.map((item) => [item.nodeId, createFocusPackageNode(item)]),
  );
  const edges = new Map<string, GraphEdge<DependencyGraphEdgeData>>();
  const sourceNodes = new Map(sourceGraph.graph.nodes.map((node) => [node.id, node.data]));
  const files = sourceGraph.graph.nodes.filter(
    ({ data }) => data.kind === 'file' && data.analyzerId !== undefined,
  );
  for (const { data } of files) {
    const owner = packageForFile(packages, detectedRoots, data);
    if (owner !== undefined) addModuleHierarchy(nodes, owner, moduleForFile(data, owner));
  }
  for (const edge of sourceGraph.graph.edges) {
    if (edge.data.kind !== 'imports') continue;
    const source = sourceNodes.get(edge.source);
    const target = sourceNodes.get(edge.target);
    if (source === undefined || target === undefined) continue;
    const owner = packageForFile(packages, detectedRoots, source);
    if (owner === undefined || source.analyzerId === undefined) continue;
    const sourceId = moduleNodeId(owner, moduleForFile(source, owner));
    const targetId = projectTarget(target, owner, packages, detectedRoots, nodes);
    if (targetId === undefined || targetId === sourceId) continue;
    addProjectedEdge(
      edges,
      sourceId,
      targetId,
      source.analyzerId,
      owner,
      edge.data.evidence,
      target,
    );
  }
  return createGraph({ nodes: [...nodes.values()], edges: [...edges.values()] });
}

/*** Select the deepest focus package root containing one project-relative source file. */
function packageForFile(
  packages: readonly DependencyGraphPackage[],
  detectedRoots: ReadonlyMap<string, readonly string[]>,
  file: SourceNodeData,
): DependencyGraphPackage | undefined {
  if (file.filePath === undefined) return undefined;
  const { filePath } = file;
  const detected =
    (detectedRoots.get(file.projectId) ?? ['.'])
      .filter((root) => root === '.' || filePath === root || filePath.startsWith(`${root}/`))
      .sort((left, right) => right.length - left.length)[0] ?? '.';
  if (!packages.some((item) => item.projectId === file.projectId && item.relativeRoot === detected))
    return undefined;
  return packages
    .filter(
      (item) =>
        item.projectId === file.projectId &&
        (item.relativeRoot === '.' ||
          filePath === item.relativeRoot ||
          filePath.startsWith(`${item.relativeRoot}/`)),
    )
    .sort((left, right) => right.relativeRoot.length - left.relativeRoot.length)[0];
}

/*** Read the established dotted module path from one analyzed source file. */
function moduleForFile(file: SourceNodeData, owner: DependencyGraphPackage): string {
  if (file.analyzerId !== 'typescript') return file.packageName ?? '';
  const relative =
    owner.relativeRoot === '.'
      ? (file.filePath ?? '')
      : (file.filePath ?? '').slice(owner.relativeRoot.length + 1);
  const directory = relative.split('/').slice(0, -1).join('/');
  return directory.split('/').filter(Boolean).join('.');
}

/*** Preserve the existing package/module node identity and dotted ancestor structure. */
function addModuleHierarchy(
  nodes: Map<string, GraphNode<DependencyGraphNodeData>>,
  owner: DependencyGraphPackage,
  modulePath: string,
): void {
  const parts = modulePath.split('.').filter(Boolean);
  parts.forEach((_, index) => {
    const current = parts.slice(0, index + 1).join('.');
    const id = moduleNodeId(owner, current);
    if (nodes.has(id)) return;
    nodes.set(id, {
      id,
      data: {
        kind: 'module',
        classification: 'intrinsic',
        focus: true,
        label: parts.at(index) ?? current,
        projectId: owner.projectId,
        ...(owner.name === undefined ? {} : { packageName: owner.name }),
        path: current,
        parentPath: index === 0 ? '' : parts.slice(0, index).join('.'),
      },
    });
  });
}

/*** Resolve canonical import targets to stable package/module projection identities. */
function projectTarget(
  target: SourceNodeData,
  sourceOwner: DependencyGraphPackage,
  packages: readonly DependencyGraphPackage[],
  detectedRoots: ReadonlyMap<string, readonly string[]>,
  nodes: Map<string, GraphNode<DependencyGraphNodeData>>,
): string | undefined {
  if (target.classification === 'vendor' || target.classification === 'unknown') {
    const name = target.packageName ?? target.name;
    const id = `${target.classification}:${name}`;
    if (!nodes.has(id))
      nodes.set(id, {
        id,
        data: {
          kind: 'package',
          classification: target.classification,
          focus: false,
          label: name,
          packageName: name,
        },
      });
    return id;
  }
  if (target.kind === 'package' && target.path !== undefined) {
    return packages.find(
      (item) => item.projectId === target.projectId && item.relativeRoot === target.path,
    )?.nodeId;
  }
  const owner =
    target.filePath === undefined ? sourceOwner : packageForFile(packages, detectedRoots, target);
  if (owner === undefined) return undefined;
  const modulePath =
    target.analyzerId === 'typescript' || target.kind === 'file'
      ? moduleForFile(target, owner)
      : (target.packageName ?? '');
  addModuleHierarchy(nodes, owner, modulePath);
  return moduleNodeId(owner, modulePath);
}

/*** Add one canonical import to a weighted package edge with original evidence. */
function addProjectedEdge(
  edges: Map<string, GraphEdge<DependencyGraphEdgeData>>,
  sourceId: string,
  targetId: string,
  analyzerId: string,
  owner: DependencyGraphPackage,
  evidence: readonly SourceRelationEvidence[],
  target: SourceNodeData,
): void {
  const id = `${sourceId}->${targetId}`;
  const previous = edges.get(id);
  const classification: DependencyReferenceClassification =
    target.kind === 'package' && target.path !== undefined
      ? 'focus'
      : (target.classification ?? 'unknown');
  const observed = evidence.map((item): DependencyImportEvidence => ({
    sourceFile:
      owner.relativeRoot === '.'
        ? item.sourcePath
        : item.sourcePath.slice(owner.relativeRoot.length + 1),
    specifier: item.specifier ?? '',
    classification,
    declarations: item.declarations ?? [],
  }));
  edges.set(id, {
    id,
    source: sourceId,
    target: targetId,
    data: {
      kind: 'import',
      analyzerId,
      weight: (previous?.data.weight ?? 0) + observed.length,
      evidence: [...(previous?.data.evidence ?? []), ...observed],
    },
  });
}

/*** Preserve the legacy projection's readable package/module node ID. */
function moduleNodeId(owner: DependencyGraphPackage, modulePath: string): string {
  return modulePath === '' ? owner.nodeId : `${owner.nodeId}#${modulePath}`;
}
