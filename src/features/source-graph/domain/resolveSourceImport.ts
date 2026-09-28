import path from 'node:path';

import type { DependencyDeclaration } from '../../../types/dependencyGraph.js';
import type { SourceAnalyzedFile, SourceNodeDraft } from '../../../types/sourceGraph.js';
import { extractCppPackageFromInclude } from '../../dependency-analysis/domain/extractCppPackageFromInclude.js';
import { extractDelphiPackageFromImport } from '../../dependency-analysis/domain/extractDelphiPackageFromImport.js';
import { extractJavaPackageFromImport } from '../../dependency-analysis/domain/extractJavaPackageFromImport.js';
import { extractKotlinPackageFromImport } from '../../dependency-analysis/domain/extractKotlinPackageFromImport.js';
import { extractPythonPackageFromImport } from '../../dependency-analysis/domain/extractPythonPackageFromImport.js';
import { fileKey } from './createSourceStructureDraft.js';
import { sourceSemanticPath } from './sourceSemanticPath.js';

export interface ResolvedImport {
  readonly target: string;
  readonly declarations: readonly DependencyDeclaration[];
}

/*** Resolve a source import to an observed file/type or explicit unresolved target. */
export function resolveImport(
  file: SourceAnalyzedFile,
  specifier: string,
  local: boolean | undefined,
  resolvedPath: string | undefined,
  nodes: Map<string, SourceNodeDraft>,
  symbols: ReadonlyMap<string, string>,
  namespaces: ReadonlyMap<string, readonly string[]>,
  focusPackages: ReadonlyMap<string, string>,
): ResolvedImport {
  const intrinsic = resolveIntrinsicImport(
    file,
    specifier,
    local,
    resolvedPath,
    nodes,
    symbols,
    namespaces,
  );
  if (intrinsic !== undefined) return { target: intrinsic, declarations: [] };
  return resolveExternalImport(file, specifier, nodes, focusPackages);
}

/*** Route language-specific reference syntax into one observed intrinsic target. */
function resolveIntrinsicImport(
  file: SourceAnalyzedFile,
  specifier: string,
  local: boolean | undefined,
  resolvedPath: string | undefined,
  nodes: Map<string, SourceNodeDraft>,
  symbols: ReadonlyMap<string, string>,
  namespaces: ReadonlyMap<string, readonly string[]>,
): string | undefined {
  if (file.analyzerId === 'java')
    return resolveJavaImport(file, specifier, nodes, symbols, namespaces);
  if (file.analyzerId === 'typescript')
    return resolveTypeScriptFileImport(file, specifier, resolvedPath, nodes);
  if (file.analyzerId === 'cpp')
    return local ? resolveLocalCppInclude(file, specifier, nodes) : undefined;
  return resolveNamespaceImport(file, specifier, namespaces);
}

/*** Resolve a local C++ include to its existing or newly observed namespace. */
function resolveLocalCppInclude(
  file: SourceAnalyzedFile,
  specifier: string,
  nodes: Map<string, SourceNodeDraft>,
): string | undefined {
  const packageName = extractCppPackageFromInclude(specifier);
  if (packageName === '') return undefined;
  const key = sourceSemanticPath('namespace', file.projectId, packageName);
  if (!nodes.has(key)) {
    nodes.set(key, {
      data: {
        semanticPath: key,
        kind: 'package',
        name: packageName,
        projectId: file.projectId,
        packageName,
        classification: 'intrinsic',
      },
    });
  }
  return key;
}

/*** Resolve imports against namespaces declared by Kotlin, Python, and Delphi source files. */
function resolveNamespaceImport(
  file: SourceAnalyzedFile,
  specifier: string,
  namespaces: ReadonlyMap<string, readonly string[]>,
): string | undefined {
  const candidates = namespaces.get(file.projectId) ?? [];
  const matching =
    file.analyzerId === 'python'
      ? candidates.find((name) => name === extractPythonPackageFromImport(specifier))
      : file.analyzerId === 'delphi'
        ? candidates.find((name) => name === extractDelphiPackageFromImport(specifier))
        : candidates.find((name) => specifier === name || specifier.startsWith(`${name}.`));
  return matching === undefined
    ? undefined
    : sourceSemanticPath('namespace', file.projectId, matching);
}

/*** Resolve an imported Java type or package from observed declarations. */
function resolveJavaImport(
  file: SourceAnalyzedFile,
  specifier: string,
  nodes: ReadonlyMap<string, SourceNodeDraft>,
  symbols: ReadonlyMap<string, string>,
  namespaces: ReadonlyMap<string, readonly string[]>,
): string | undefined {
  const name = specifier.replace(/\.\*$/u, '');
  const separator = name.lastIndexOf('.');
  const packageName = separator < 0 ? '' : name.slice(0, separator);
  const simpleName = name.slice(separator + 1);
  const symbol = symbols.get(symbolKey(file.projectId, packageName, simpleName));
  if (symbol !== undefined) return symbol;
  const namespace = sourceSemanticPath('namespace', file.projectId, name);
  if (nodes.has(namespace)) return namespace;
  return resolveNamespaceImport(file, specifier, namespaces);
}

/*** Resolve a relative TypeScript import to a scanned source file. */
function resolveTypeScriptFileImport(
  file: SourceAnalyzedFile,
  specifier: string,
  resolvedPath: string | undefined,
  nodes: ReadonlyMap<string, SourceNodeDraft>,
): string | undefined {
  if (resolvedPath !== undefined) {
    const resolved = fileKey(file.projectId, resolvedPath);
    if (nodes.has(resolved)) return resolved;
  }
  if (!specifier.startsWith('.')) return undefined;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(file.path), specifier));
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    `${base}.cts`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ];
  return candidates
    .map((candidate) => fileKey(file.projectId, candidate))
    .find((key) => nodes.has(key));
}

/*** Distinguish declared vendor imports, focus packages, and unresolved imports. */
function resolveExternalImport(
  file: SourceAnalyzedFile,
  specifier: string,
  nodes: Map<string, SourceNodeDraft>,
  focusPackages: ReadonlyMap<string, string>,
): ResolvedImport {
  const packageName = packageFromSpecifier(file.analyzerId, specifier);
  const declarations =
    packageName === undefined
      ? []
      : (Object.entries(file.declaredDependencies ?? {}).find(
          ([name]) => name === packageName,
        )?.[1] ?? []);
  const focus = packageName === undefined ? undefined : focusPackages.get(packageName);
  if (focus !== undefined) return { target: focus, declarations };
  const external = sourceSemanticPath('external', file.projectId, packageName ?? specifier);
  if (!nodes.has(external)) {
    nodes.set(external, {
      data: {
        semanticPath: external,
        kind: 'package',
        name: packageName ?? specifier,
        projectId: file.projectId,
        packageName: packageName ?? specifier,
        classification:
          file.analyzerId === 'typescript' && declarations.length > 0 ? 'vendor' : 'unknown',
      },
    });
  }
  return { target: external, declarations };
}

/*** Project an unresolved reference onto the established package naming semantics. */
function packageFromSpecifier(analyzerId: string, specifier: string): string | undefined {
  if (analyzerId === 'java') return extractJavaPackageFromImport(specifier);
  if (analyzerId === 'kotlin') return extractKotlinPackageFromImport(specifier);
  if (analyzerId === 'python') return extractPythonPackageFromImport(specifier);
  if (analyzerId === 'delphi') return extractDelphiPackageFromImport(specifier);
  if (analyzerId === 'cpp') return extractCppPackageFromInclude(specifier);
  return barePackageName(specifier);
}

/*** Extract the declared npm package identity from a bare module specifier. */
function barePackageName(specifier: string): string | undefined {
  if (
    specifier === '' ||
    specifier.startsWith('.') ||
    specifier.startsWith('#') ||
    specifier.startsWith('/')
  )
    return undefined;
  const segments = specifier.split('/');
  return specifier.startsWith('@')
    ? segments.length >= 2
      ? `${segments[0]}/${segments[1]}`
      : undefined
    : segments[0];
}

/*** Scope type names without confusing same names in separate Java packages. */
function symbolKey(projectId: string, packageName: string, name: string): string {
  return sourceSemanticPath(projectId, packageName, name);
}
