import { rejects } from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from 'bun:test';

import { createDependencyGraphAsync } from './createDependencyGraphAsync.js';

test('builds weighted intrinsic and vendor TypeScript dependencies with declaration evidence', async () => {
  const root = await createFixtureAsync({
    'package.json': JSON.stringify({ name: 'fixture', dependencies: { react: '^19.0.0' } }),
    'src/features/one.ts': "import '../shared/value';\nimport React from 'react';\n",
    'src/features/two.ts': "import React from 'react';\n",
    'src/shared/value.ts': 'export const value = 1;\n',
  });
  try {
    const graph = await createDependencyGraphAsync({
      projects: [{ id: 'fixture', rootPath: root }],
    });
    const vendor = graph.nodes.find(({ data }) => data.packageName === 'react');
    const vendorEdge = graph.edges.find(({ target }) => target === vendor?.id);
    const intrinsicEdge = graph.edges.find(({ data }) =>
      data.evidence.some(({ classification }) => classification === 'intrinsic'),
    );

    expect(vendor?.data).toMatchObject({ classification: 'vendor', focus: false });
    expect(vendorEdge?.data.weight).toBe(2);
    expect(vendorEdge?.data.evidence[0]?.declarations).toEqual([
      { kind: 'dependency', range: '^19.0.0' },
    ]);
    expect(intrinsicEdge?.data.weight).toBe(1);
    expect(graph.nodes.some(({ data }) => data.path === 'src.features')).toBe(true);
    expect(graph.nodes.some(({ data }) => data.path === 'src.shared')).toBe(true);
  } finally {
    await rm(root, { recursive: true });
  }
});

test('routes imports between supplied focus packages without creating vendor duplicates', async () => {
  const first = await createFixtureAsync({
    'package.json': JSON.stringify({
      name: '@fixture/first',
      dependencies: { '@fixture/second': '^1.0.0' },
    }),
    'src/index.ts': "import { second } from '@fixture/second';\nexport { second };\n",
  });
  const second = await createFixtureAsync({
    'package.json': JSON.stringify({ name: '@fixture/second' }),
    'src/index.ts': 'export const second = 2;\n',
  });

  try {
    const graph = await createDependencyGraphAsync({
      projects: [
        { id: 'first', rootPath: first },
        { id: 'second', rootPath: second },
      ],
    });
    const secondNode = graph.nodes.find(({ data }) => data.packageName === '@fixture/second');
    const focusEdge = graph.edges.find(({ target }) => target === secondNode?.id);

    expect(secondNode?.data.focus).toBe(true);
    expect(focusEdge?.data.evidence[0]?.classification).toBe('focus');
    expect(graph.nodes.some(({ id }) => id === 'vendor:@fixture/second')).toBe(false);
  } finally {
    await Promise.all([rm(first, { recursive: true }), rm(second, { recursive: true })]);
  }
});

test('rejects duplicate project identities before analysis', async () => {
  const root = await createFixtureAsync({
    'package.json': JSON.stringify({ name: 'fixture' }),
    'src/index.ts': 'export {};\n',
  });

  try {
    await rejects(
      createDependencyGraphAsync({
        projects: [
          { id: 'duplicate', rootPath: root },
          { id: 'duplicate', rootPath: root },
        ],
      }),
      /must be unique/u,
    );
  } finally {
    await rm(root, { recursive: true });
  }
});

/*** Create an isolated filesystem fixture for dependency graph integration tests. */
async function createFixtureAsync(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dependency-graph-test-'));
  await Promise.all(
    Object.entries(files).map(async ([file, content]) => {
      const target = path.join(root, file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
    }),
  );
  return root;
}
