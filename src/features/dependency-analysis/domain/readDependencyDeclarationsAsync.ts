import { readFile } from 'node:fs/promises';

import { isRecord } from '@ankhorage/utility/object';

import type {
  DependencyDeclaration,
  DependencyDeclarationKind,
} from '../../../types/dependencyGraph.js';

/*** Read dependency declarations from one already-inspected package manifest. */
export async function readDependencyDeclarationsAsync(
  manifestPath: string | undefined,
): Promise<Readonly<Record<string, readonly DependencyDeclaration[]>>> {
  if (manifestPath === undefined) return {};
  const value: unknown = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    [
      ...declarationsFor(value.dependencies, 'dependency'),
      ...declarationsFor(value.devDependencies, 'devDependency'),
      ...declarationsFor(value.optionalDependencies, 'optionalDependency'),
      ...declarationsFor(value.peerDependencies, 'peerDependency'),
    ].reduce<Map<string, DependencyDeclaration[]>>((byName, [name, declaration]) => {
      const current = byName.get(name) ?? [];
      byName.set(name, [...current, declaration]);
      return byName;
    }, new Map()),
  );
}

/*** Normalize one package.json dependency section into named declarations. */
function declarationsFor(
  value: unknown,
  kind: DependencyDeclarationKind,
): readonly (readonly [string, DependencyDeclaration])[] {
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([name, range]) =>
    typeof range === 'string' ? [[name, { kind, range }] as const] : [],
  );
}
