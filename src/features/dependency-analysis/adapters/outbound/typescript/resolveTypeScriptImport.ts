import path from 'node:path';

import { toPortablePath } from '@ankhorage/utility/node/path';

import type {
  DependencyDeclaration,
  DependencyGraphPackage,
  DependencyReferenceClassification,
} from '../../../../../types/dependencyGraph.js';

export interface ResolvedTypeScriptImport {
  readonly targetNodeId: string;
  readonly classification: DependencyReferenceClassification;
  readonly targetPath?: string;
  readonly packageName?: string;
  readonly declarations: readonly DependencyDeclaration[];
}

/*** Resolve one TypeScript import to an intrinsic module, focus package, vendor or unknown node. */
export function resolveTypeScriptImport(
  packageContext: DependencyGraphPackage,
  sourceFile: string,
  specifier: string,
  sourceFiles: ReadonlySet<string>,
  focusPackages: ReadonlyMap<string, string>,
): ResolvedTypeScriptImport {
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    return resolveIntrinsic(
      packageContext,
      path.resolve(path.dirname(sourceFile), specifier),
      sourceFiles,
    );
  }
  if (specifier.startsWith('@/')) {
    return resolveIntrinsic(
      packageContext,
      path.resolve(packageContext.rootPath, 'src', specifier.slice(2)),
      sourceFiles,
    );
  }

  const packageName = barePackageName(specifier);
  if (packageName !== undefined) {
    const focusNodeId = focusPackages.get(packageName);
    if (focusNodeId !== undefined) {
      return {
        targetNodeId: focusNodeId,
        classification: 'focus',
        packageName,
        declarations: declarationsFor(packageContext.declarations, packageName),
      };
    }

    const declarations = declarationsFor(packageContext.declarations, packageName);
    return {
      targetNodeId: declarations.length > 0 ? `vendor:${packageName}` : `unknown:${packageName}`,
      classification: declarations.length > 0 ? 'vendor' : 'unknown',
      packageName,
      declarations,
    };
  }

  return {
    targetNodeId: `unknown:${specifier}`,
    classification: 'unknown',
    declarations: [],
  };
}

/*** Resolve a source-like path to the containing intrinsic package module. */
function resolveIntrinsic(
  packageContext: DependencyGraphPackage,
  unresolvedPath: string,
  sourceFiles: ReadonlySet<string>,
): ResolvedTypeScriptImport {
  const targetFile = sourceCandidates(unresolvedPath).find((candidate) =>
    sourceFiles.has(candidate),
  );
  const target = targetFile ?? unresolvedPath;
  const relative = toPortablePath(path.relative(packageContext.rootPath, target));
  if (relative === '..' || relative.startsWith('../')) {
    return {
      targetNodeId: `unknown:${relative}`,
      classification: 'unknown',
      declarations: [],
    };
  }

  const modulePath = toPortablePath(path.dirname(relative));
  const normalizedPath = modulePath === '.' ? '' : modulePath.split('/').join('.');
  return {
    targetNodeId:
      normalizedPath === '' ? packageContext.nodeId : `${packageContext.nodeId}#${normalizedPath}`,
    classification: 'intrinsic',
    targetPath: normalizedPath,
    declarations: [],
  };
}

/*** Read dependency declarations without dynamic object-key access. */
function declarationsFor(
  declarations: Readonly<Record<string, readonly DependencyDeclaration[]>>,
  packageName: string,
): readonly DependencyDeclaration[] {
  const entry = Object.entries(declarations).find(([name]) => name === packageName);
  return entry === undefined ? [] : entry[1];
}

/*** Generate deterministic TypeScript module resolution candidates without executing project config. */
function sourceCandidates(base: string): readonly string[] {
  const extensions = ['.ts', '.tsx', '.mts', '.cts'];
  return [
    base,
    ...extensions.map((extension) => `${base}${extension}`),
    ...extensions.map((extension) => path.join(base, `index${extension}`)),
  ];
}

/*** Extract the npm package identity from a bare module specifier. */
function barePackageName(specifier: string): string | undefined {
  if (
    specifier === '' ||
    specifier.startsWith('#') ||
    specifier.startsWith('/') ||
    specifier.startsWith('~')
  ) {
    return undefined;
  }

  const segments = specifier.split('/');
  if (specifier.startsWith('@')) {
    return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : undefined;
  }
  return segments[0];
}
