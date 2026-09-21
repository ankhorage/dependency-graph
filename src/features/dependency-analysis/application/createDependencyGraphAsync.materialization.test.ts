import { rejects } from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from 'bun:test';

import { createDependencyGraphAsync } from '../../../dependencyGraph.js';

test('ignores canonical generated Ankh materialization during public dependency analysis', async () => {
  const root = await createFixtureAsync({
    'package.json': JSON.stringify({ name: 'fixture' }),
    'src/a/index.ts': "import { value } from '../b/index';\nexport { value };\n",
    'src/b/index.ts': 'export const value = 1;\n',
    '.ankh/zora/.web-gen-1/src/generated.ts': "import 'generated-only';\n",
  });

  try {
    await symlink(
      path.join(root, '.ankh/zora/.web-gen-1'),
      path.join(root, '.ankh/zora/web'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );

    const graph = await createDependencyGraphAsync({
      projects: [{ id: 'current', rootPath: root }],
    });
    const evidence = graph.edges.flatMap(({ data }) => data.evidence);

    expect(graph.nodes.some(({ data }) => data.path === 'src.a')).toBe(true);
    expect(graph.nodes.some(({ data }) => data.path === 'src.b')).toBe(true);
    expect(evidence).toContainEqual({
      sourceFile: 'src/a/index.ts',
      specifier: '../b/index',
      classification: 'intrinsic',
      declarations: [],
    });
    expect(graph.nodes.some(({ data }) => data.path?.includes('.ankh'))).toBe(false);
    expect(graph.nodes.some(({ data }) => data.packageName === 'generated-only')).toBe(false);
    expect(evidence.some(({ sourceFile }) => sourceFile.includes('.ankh'))).toBe(false);
  } finally {
    await rm(root, { recursive: true });
  }
});

test('rejects incomplete inspection for a symlink outside generated Ankh materialization', async () => {
  const root = await createFixtureAsync({
    'package.json': JSON.stringify({ name: 'fixture' }),
    'src/index.ts': 'export const value = 1;\n',
  });

  try {
    await symlink(
      root,
      path.join(root, 'linked'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );

    await rejects(
      createDependencyGraphAsync({ projects: [{ id: 'current', rootPath: root }] }),
      /Dependency graph inspection is incomplete.*Symbolic links are not followed/u,
    );
  } finally {
    await rm(root, { recursive: true });
  }
});

/*** Create an isolated fixture for public dependency graph inspection tests. */
async function createFixtureAsync(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dependency-graph-materialization-test-'));
  await Promise.all(
    Object.entries(files).map(async ([file, content]) => {
      const target = path.join(root, file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
    }),
  );
  return root;
}
