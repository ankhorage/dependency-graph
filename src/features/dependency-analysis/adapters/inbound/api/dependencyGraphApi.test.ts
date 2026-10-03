import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from 'bun:test';

import { dependencyGraphApi } from '../../../../../dependencyGraphApi.js';

test('executes dependency-graph through the canonical API action', async () => {
  const root = await createFixtureAsync({
    'package.json': JSON.stringify({ name: 'fixture', dependencies: { react: '^19.0.0' } }),
    'src/index.ts': "import React from 'react';\nexport { React };\n",
  });

  try {
    const result = await dependencyGraphApi.executeAsync({
      operationId: 'dependency-graph',
      input: { projects: [{ id: 'fixture', rootPath: root }] },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const graph = result.data as {
      readonly nodes: readonly { readonly data: { readonly packageName?: string } }[];
    };
    expect(graph.nodes.some(({ data }) => data.packageName === 'react')).toBe(true);
  } finally {
    await rm(root, { recursive: true });
  }
});

/*** Create an isolated project fixture for the dependency-graph API action. */
async function createFixtureAsync(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dependency-graph-api-test-'));
  await Promise.all(
    Object.entries(files).map(async ([file, content]) => {
      const target = path.join(root, file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
    }),
  );
  return root;
}
