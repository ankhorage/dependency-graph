import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from 'bun:test';

import {
  createSourceFeatureProjectionIndex,
  createSourceGraphAsync,
  deserializeSourceGraph,
  findSourceFeature,
  listSourceFeatureMembers,
  listSourceFeatures,
  projectSourceFeatures,
  serializeSourceGraph,
} from '../../../dependencyGraph.js';

test('projects only explicit TypeScript feature declarations with stable evidence and bounded queries', async () => {
  const root = await featureFixtureAsync();
  try {
    const graph = await createSourceGraphAsync({ projects: [{ id: 'fixture', rootPath: root }] });
    const projection = projectSourceFeatures(graph);
    const restored = projectSourceFeatures(deserializeSourceGraph(serializeSourceGraph(graph)));
    const index = createSourceFeatureProjectionIndex(projection);
    const feature = projection.features.find(({ name }) => name === 'checkout');

    if (feature === undefined) throw new Error('Expected explicit checkout feature evidence.');

    expect(restored).toEqual(projection);
    expect(projection.features).toHaveLength(2);
    expect(feature).toMatchObject({
      id: 'feature:fixture:checkout',
      name: 'checkout',
      projectId: 'fixture',
      members: [
        {
          analyzerId: 'typescript',
          filePath: 'src/Checkout.ts',
          evidence: { line: 2, column: 1, endLine: 4, endColumn: 2 },
        },
      ],
    });
    expect(findSourceFeature(index, 'feature:fixture:checkout')).toEqual(feature);
    const firstPage = listSourceFeatures(index, { limit: 1 });
    expect(firstPage).toMatchObject({
      items: [{ id: 'feature:fixture:cart' }],
      nextCursor: 'feature:fixture:cart',
    });
    if (firstPage.nextCursor === undefined) throw new Error('Expected a second feature page.');
    expect(listSourceFeatures(index, { limit: 1, cursor: firstPage.nextCursor })).toEqual({
      items: [feature],
    });
    expect(listSourceFeatureMembers(index, 'feature:fixture:checkout', { limit: 1 }).items).toEqual(
      feature.members,
    );
    expect(projection.capabilities).toContainEqual({
      projectId: 'fixture',
      analyzerId: 'typescript',
      state: 'available',
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('retains malformed feature tags as diagnostics and never guesses from source paths', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dependency-graph-feature-invalid-'));
  try {
    await writeFixtureAsync(root, {
      'package.json': JSON.stringify({ name: 'fixture' }),
      'src/features/guessed.ts': 'export class Guessed {}\n',
      'src/invalid.ts': '/** @feature checkout @feature cart */\nexport class Invalid {}\n',
    });
    const graph = await createSourceGraphAsync({ projects: [{ id: 'fixture', rootPath: root }] });
    const projection = projectSourceFeatures(graph);

    expect(projection.features).toEqual([]);
    expect(projection.diagnostics).toHaveLength(1);
    expect(projection.diagnostics[0]).toMatchObject({
      filePath: 'src/invalid.ts',
      projectId: 'fixture',
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('reports non-TypeScript analyzers as unavailable rather than absent feature evidence', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dependency-graph-feature-java-'));
  try {
    await writeFixtureAsync(root, {
      'pom.xml': '<project/>',
      'src/main/java/example/Checkout.java': 'package example; public class Checkout {}',
    });
    const graph = await createSourceGraphAsync({ projects: [{ id: 'fixture', rootPath: root }] });

    expect(projectSourceFeatures(graph).capabilities).toContainEqual({
      projectId: 'fixture',
      analyzerId: 'java',
      state: 'unavailable',
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

/*** Materialize a representative TypeScript package without relying on directory naming as evidence. */
async function featureFixtureAsync(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dependency-graph-feature-'));
  await writeFixtureAsync(root, {
    'package.json': JSON.stringify({ name: 'fixture' }),
    'src/Checkout.ts': '/** @feature checkout */\nexport class Checkout {\n  submit() {}\n}\n',
    'src/Cart.ts': '/** @feature cart */\nexport class Cart {}\n',
  });
  return root;
}

/*** Create one fixture tree using only project-relative source paths. */
async function writeFixtureAsync(
  root: string,
  files: Readonly<Record<string, string>>,
): Promise<void> {
  await Promise.all(
    Object.entries(files).map(async ([file, content]) => {
      const target = path.join(root, file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
    }),
  );
}
