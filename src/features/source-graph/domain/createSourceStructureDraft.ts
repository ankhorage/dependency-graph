import path from 'node:path';

import type { ProjectInspection } from '@ankhorage/project-detector/types';

import type {
  SourceAnalyzedFile,
  SourceEdgeDraft,
  SourceGraphDraft,
  SourceNodeData,
  SourceNodeDraft,
  SourceRelationEvidence,
} from '../../../types/sourceGraph.js';
import { sourceSemanticPath } from './sourceSemanticPath.js';

interface SourceProject {
  readonly id: string;
  readonly inspection: ProjectInspection;
}

/*** Preserve scanned projects, packages, empty directories, files, and nested declarations. */
export function createSourceStructureDraft(
  projects: readonly SourceProject[],
  files: readonly SourceAnalyzedFile[],
): SourceGraphDraft {
  const nodes = new Map<string, SourceNodeDraft>();
  const edges: SourceEdgeDraft[] = [];
  for (const project of projects) addProject(project, files, nodes, edges);
  return {
    nodes: [...nodes.values()],
    edges,
    capabilities: projects.flatMap(({ id, inspection }) => {
      const analyzers = new Set([
        'project-detector',
        ...inspection.detection.languages.map(({ id: languageId }) => languageId),
        ...files.filter((file) => file.projectId === id).map((file) => file.analyzerId),
      ]);
      return [...analyzers].map((analyzerId) => ({
        projectId: id,
        analyzerId,
        available: analyzerCapabilities(analyzerId),
      }));
    }),
  };
}

/*** Add the physical containment tree for one inspected project. */
function addProject(
  project: SourceProject,
  analyzedFiles: readonly SourceAnalyzedFile[],
  nodes: Map<string, SourceNodeDraft>,
  edges: SourceEdgeDraft[],
): void {
  const { id, inspection } = project;
  if (!inspection.complete) throw new Error(`Source graph inspection is incomplete for ${id}.`);
  const projectKey = sourceSemanticPath('project', id);
  addNode(nodes, { semanticPath: projectKey, kind: 'project', name: id, projectId: id });
  const packageRoots = new Set(['.', ...inspection.packages.map(({ rootPath }) => rootPath)]);
  addPackages(project, packageRoots, projectKey, nodes, edges);
  addDirectories(project, packageRoots, nodes, edges);
  addFiles(project, packageRoots, nodes, edges);
  for (const file of analyzedFiles.filter((item) => item.projectId === id)) {
    addFileFacts(file, nodes, edges);
  }
}

/*** Preserve package and workspace roots as explicit containment boundaries. */
function addPackages(
  project: SourceProject,
  packageRoots: ReadonlySet<string>,
  projectKey: string,
  nodes: Map<string, SourceNodeDraft>,
  edges: SourceEdgeDraft[],
): void {
  const { id, inspection } = project;
  for (const root of packageRoots) {
    const key = packageKey(id, root);
    const name = inspection.packages.find(({ rootPath }) => rootPath === root)?.name ?? root;
    addNode(nodes, {
      semanticPath: key,
      kind: 'package',
      name,
      projectId: id,
      path: root,
      classification: 'intrinsic',
    });
    addContains(edges, projectKey, key, 'project-detector', root);
  }
}

/*** Preserve empty directories and their exact scanned hierarchy. */
function addDirectories(
  project: SourceProject,
  packageRoots: ReadonlySet<string>,
  nodes: Map<string, SourceNodeDraft>,
  edges: SourceEdgeDraft[],
): void {
  const { id, inspection } = project;
  for (const directory of inspection.directories.filter((item) => item !== '.')) {
    const root = owningPackageRoot(directory, packageRoots);
    if (directory === root) continue;
    const key = directoryKey(id, directory);
    addNode(nodes, {
      semanticPath: key,
      kind: 'directory',
      name: path.posix.basename(directory),
      projectId: id,
      path: directory,
      classification: 'intrinsic',
    });
    const parent = path.posix.dirname(directory);
    addContains(
      edges,
      parent === root ? packageKey(id, root) : directoryKey(id, parent),
      key,
      'project-detector',
      directory,
    );
  }
}

/*** Preserve all inspected files, including files without an implemented language parser. */
function addFiles(
  project: SourceProject,
  packageRoots: ReadonlySet<string>,
  nodes: Map<string, SourceNodeDraft>,
  edges: SourceEdgeDraft[],
): void {
  const { id, inspection } = project;
  for (const file of inspection.files) {
    const root = owningPackageRoot(file, packageRoots);
    const parent = path.posix.dirname(file);
    const key = fileKey(id, file);
    addNode(nodes, {
      semanticPath: key,
      kind: 'file',
      name: path.posix.basename(file),
      projectId: id,
      path: file,
      filePath: file,
      classification: 'intrinsic',
    });
    addContains(
      edges,
      parent === root || parent === '.' ? packageKey(id, root) : directoryKey(id, parent),
      key,
      'project-detector',
      file,
    );
  }
}

/*** Attach portable declarations and their observed documentation to a source file. */
function addFileFacts(
  file: SourceAnalyzedFile,
  nodes: Map<string, SourceNodeDraft>,
  edges: SourceEdgeDraft[],
): void {
  const parent = fileKey(file.projectId, file.path);
  const fileNode = nodes.get(parent);
  if (fileNode === undefined)
    throw new Error(`Analyzed source file was not inspected: ${file.path}.`);
  if (file.facts.packageName !== undefined && file.facts.packageName !== '') {
    nodes.set(parent, {
      data: { ...fileNode.data, analyzerId: file.analyzerId, packageName: file.facts.packageName },
    });
    const packagePath = addNamespaceHierarchy(file, nodes, edges);
    addRelation(edges, parent, packagePath, 'declares-in', {
      analyzerId: file.analyzerId,
      sourcePath: file.path,
    });
  } else nodes.set(parent, { data: { ...fileNode.data, analyzerId: file.analyzerId } });
  for (const declaration of file.facts.declarations) {
    addDeclaration(file, declaration, parent, nodes, edges);
  }
}

/*** Materialize each observed namespace ancestor once for package-level queries. */
function addNamespaceHierarchy(
  file: SourceAnalyzedFile,
  nodes: Map<string, SourceNodeDraft>,
  edges: SourceEdgeDraft[],
): string {
  const segments = file.facts.packageName?.split('.') ?? [];
  let parent = sourceSemanticPath('project', file.projectId);
  let current = '';
  for (const segment of segments) {
    current = current === '' ? segment : `${current}.${segment}`;
    const key = sourceSemanticPath('namespace', file.projectId, current);
    if (!nodes.has(key)) {
      addNode(nodes, {
        semanticPath: key,
        kind: 'package',
        name: current,
        projectId: file.projectId,
        packageName: current,
        classification: 'intrinsic',
      });
      addContains(edges, parent, key, file.analyzerId, file.path);
    }
    parent = key;
  }
  return parent;
}

/*** Materialize one nested declaration with a location-qualified stable identity. */
function addDeclaration(
  file: SourceAnalyzedFile,
  declaration: SourceAnalyzedFile['facts']['declarations'][number],
  parent: string,
  nodes: Map<string, SourceNodeDraft>,
  edges: SourceEdgeDraft[],
): void {
  const key = sourceSemanticPath(
    parent,
    declaration.kind,
    declaration.name,
    `${declaration.location.line}:${declaration.location.column}`,
  );
  addNode(nodes, {
    semanticPath: key,
    kind: declaration.kind,
    name: declaration.name,
    projectId: file.projectId,
    filePath: file.path,
    ...(file.facts.packageName === undefined ? {} : { packageName: file.facts.packageName }),
    classification: 'intrinsic',
    location: declaration.location,
    visibility: declaration.visibility,
    modifiers: declaration.modifiers,
    ...(declaration.signature === undefined ? {} : { signature: declaration.signature }),
    ...(declaration.documentation === undefined
      ? {}
      : { documentation: declaration.documentation }),
    ...(declaration.typeOnly === undefined ? {} : { typeOnly: declaration.typeOnly }),
  });
  addContains(edges, parent, key, file.analyzerId, file.path, declaration.location);
  if (declaration.exported === true) {
    addRelation(edges, parent, key, 'exports', {
      analyzerId: file.analyzerId,
      sourcePath: file.path,
      location: declaration.location,
    });
  }
  for (const child of declaration.children) addDeclaration(file, child, key, nodes, edges);
}

/*** Define source facts that each parser actually emits. */
function analyzerCapabilities(
  analyzerId: string,
): SourceGraphDraft['capabilities'][number]['available'] {
  if (analyzerId === 'project-detector') return ['containment'];
  if (analyzerId === 'java')
    return [
      'containment',
      'declarations',
      'documentation',
      'extends',
      'implements',
      'imports',
      'signatures',
      'source-locations',
      'visibility',
    ];
  if (analyzerId === 'typescript')
    return [
      'containment',
      'declarations',
      'documentation',
      'exports',
      'extends',
      'implements',
      'imports',
      'signatures',
      'source-locations',
      'visibility',
    ];
  if (['cpp', 'delphi', 'kotlin', 'python'].includes(analyzerId)) return ['imports'];
  return [];
}

/*** Select the deepest workspace/package root that owns a portable source path. */
function owningPackageRoot(file: string, roots: ReadonlySet<string>): string {
  return (
    [...roots]
      .filter((root) => root === '.' || file === root || file.startsWith(`${root}/`))
      .sort((left, right) => right.length - left.length)[0] ?? '.'
  );
}

/*** Keep node insertion idempotent when multiple files share one namespace. */
function addNode(nodes: Map<string, SourceNodeDraft>, data: SourceNodeData): void {
  if (!nodes.has(data.semanticPath)) nodes.set(data.semanticPath, { data });
}

/*** Record physical or syntactic containment with provenance. */
function addContains(
  edges: SourceEdgeDraft[],
  source: string,
  target: string,
  analyzerId: string,
  sourcePath: string,
  location?: SourceRelationEvidence['location'],
): void {
  addRelation(edges, source, target, 'contains', {
    analyzerId,
    sourcePath,
    ...(location === undefined ? {} : { location }),
  });
}

/*** Append one observed relation without pre-aggregating its evidence. */
function addRelation(
  edges: SourceEdgeDraft[],
  source: string,
  target: string,
  kind: SourceEdgeDraft['data']['kind'],
  evidence: SourceRelationEvidence,
): void {
  edges.push({ source, target, data: { kind, evidence: [evidence] } });
}

function packageKey(projectId: string, root: string): string {
  return sourceSemanticPath('package', projectId, root);
}

function directoryKey(projectId: string, directory: string): string {
  return sourceSemanticPath('directory', projectId, directory);
}

export function fileKey(projectId: string, file: string): string {
  return sourceSemanticPath('file', projectId, file);
}
