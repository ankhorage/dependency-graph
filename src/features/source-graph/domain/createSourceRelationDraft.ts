import type {
  SourceAnalyzedFile,
  SourceDeclarationFact,
  SourceEdgeDraft,
  SourceGraphDraft,
  SourceNodeDraft,
  SourceRelationEvidence,
} from '../../../types/sourceGraph.js';
import { fileKey } from './createSourceStructureDraft.js';
import { resolveImport } from './resolveSourceImport.js';
import { sourceSemanticPath } from './sourceSemanticPath.js';

/*** Resolve source imports and inheritance after all declarations have been indexed. */
export function createSourceRelationDraft(
  structure: SourceGraphDraft,
  files: readonly SourceAnalyzedFile[],
): SourceGraphDraft {
  const nodes = new Map(structure.nodes.map((node) => [node.data.semanticPath, node]));
  const edges = [...structure.edges];
  const symbolIndex = buildSymbolIndex(structure.nodes);
  const declarationIndex = buildDeclarationIndex(structure.nodes);
  const namespaceIndex = buildNamespaceIndex(structure.nodes);
  const focusPackages = new Map(
    structure.nodes.flatMap(({ data }) =>
      data.kind === 'package' && data.path !== undefined && data.classification === 'intrinsic'
        ? [[data.name, data.semanticPath] as const]
        : [],
    ),
  );
  for (const file of files) {
    for (const imported of file.facts.imports) {
      const resolved = resolveImport(
        file,
        imported.specifier,
        imported.local,
        imported.resolvedPath,
        nodes,
        symbolIndex,
        namespaceIndex,
        focusPackages,
      );
      addRelation(
        edges,
        fileKey(file.projectId, file.path),
        resolved.target,
        imported.kind === 'reexport' ? 'exports' : 'imports',
        {
          analyzerId: file.analyzerId,
          sourcePath: file.path,
          ...(imported.location === undefined ? {} : { location: imported.location }),
          specifier: imported.specifier,
          ...(imported.typeOnly === undefined ? {} : { typeOnly: imported.typeOnly }),
          ...(resolved.declarations.length === 0 ? {} : { declarations: resolved.declarations }),
        },
      );
    }
    for (const declaration of file.facts.declarations) {
      addInheritance(file, declaration, nodes, edges, symbolIndex, declarationIndex);
    }
  }
  return { nodes: [...nodes.values()], edges, capabilities: structure.capabilities };
}

/*** Index intrinsic namespaces once for import resolution. */
function buildNamespaceIndex(
  nodes: readonly SourceNodeDraft[],
): ReadonlyMap<string, readonly string[]> {
  const names = new Map<string, string[]>();
  for (const { data } of nodes) {
    if (
      data.kind !== 'package' ||
      data.packageName === undefined ||
      data.classification !== 'intrinsic'
    )
      continue;
    names.set(data.projectId, [...(names.get(data.projectId) ?? []), data.packageName]);
  }
  return new Map(
    [...names].map(([projectId, values]) => [
      projectId,
      values.sort((left, right) => right.length - left.length),
    ]),
  );
}

/*** Index declaration locations once for evidence relationship resolution. */
function buildDeclarationIndex(nodes: readonly SourceNodeDraft[]): ReadonlyMap<string, string> {
  const index = new Map<string, string>();
  for (const { data } of nodes) {
    if (data.filePath === undefined || data.location === undefined) continue;
    const key = sourceSemanticPath(
      data.projectId,
      data.filePath,
      data.kind,
      data.name,
      `${data.location.line}:${data.location.column}`,
    );
    index.set(key, data.semanticPath);
  }
  return index;
}

/*** Index source types by project, namespace, and simple name for language-neutral resolution. */
function buildSymbolIndex(nodes: readonly SourceNodeDraft[]): ReadonlyMap<string, string> {
  const index = new Map<string, string>();
  for (const { data } of nodes) {
    if (data.kind !== 'class' && data.kind !== 'interface' && data.kind !== 'type') continue;
    index.set(symbolKey(data.projectId, data.packageName ?? '', data.name), data.semanticPath);
    index.set(symbolKey(data.projectId, '', data.name), data.semanticPath);
  }
  return index;
}

/*** Resolve observed extends/implements references with exact source evidence. */
function addInheritance(
  file: SourceAnalyzedFile,
  declaration: SourceDeclarationFact,
  nodes: Map<string, SourceNodeDraft>,
  edges: SourceEdgeDraft[],
  symbols: ReadonlyMap<string, string>,
  declarations: ReadonlyMap<string, string>,
): void {
  const source = declarations.get(
    sourceSemanticPath(
      file.projectId,
      file.path,
      declaration.kind,
      declaration.name,
      `${declaration.location.line}:${declaration.location.column}`,
    ),
  );
  if (source !== undefined) {
    for (const [kind, names] of [
      ['extends', declaration.extends],
      ['implements', declaration.implements],
    ] as const) {
      for (const name of names) {
        const simpleName = name.replace(/<.*$/u, '').split('.').at(-1) ?? name;
        const resolved =
          symbols.get(symbolKey(file.projectId, file.facts.packageName ?? '', simpleName)) ??
          symbols.get(symbolKey(file.projectId, '', simpleName));
        const target = resolved ?? unresolvedType(file, name, nodes);
        addRelation(edges, source, target, kind, {
          analyzerId: file.analyzerId,
          sourcePath: file.path,
          location: declaration.location,
          specifier: name,
        });
      }
    }
  }
  for (const child of declaration.children) {
    addInheritance(file, child, nodes, edges, symbols, declarations);
  }
}

/*** Preserve a base-type reference even when its declaration is outside the scan. */
function unresolvedType(
  file: SourceAnalyzedFile,
  name: string,
  nodes: Map<string, SourceNodeDraft>,
): string {
  const key = sourceSemanticPath('external-type', file.projectId, name);
  if (!nodes.has(key)) {
    nodes.set(key, {
      data: {
        semanticPath: key,
        kind: 'type',
        name,
        projectId: file.projectId,
        classification: 'unknown',
      },
    });
  }
  return key;
}

/*** Scope type names without confusing same names in separate Java packages. */
function symbolKey(projectId: string, packageName: string, name: string): string {
  return sourceSemanticPath(projectId, packageName, name);
}

/*** Preserve each observed relation as one traceable canonical edge. */
function addRelation(
  edges: SourceEdgeDraft[],
  source: string,
  target: string,
  kind: SourceEdgeDraft['data']['kind'],
  evidence: SourceRelationEvidence,
): void {
  edges.push({ source, target, data: { kind, evidence: [evidence] } });
}
