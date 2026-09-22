import { rejects } from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from 'bun:test';
import { inspectProjectAsync } from '@ankhorage/project-detector/node';
import type { ProjectInspection } from '@ankhorage/project-detector/types';

import {
  createDependencyGraphAsync,
  createDependencyGraphFromInspectionsAsync,
  type DependencyGraphAnalyzer,
} from '../../../dependencyGraph.js';

test('matches filesystem analysis for an inspected TypeScript workspace', async () => {
  const root = await createFixtureAsync({
    'package.json': JSON.stringify({ name: 'root', workspaces: ['packages/*'] }),
    'packages/first/package.json': JSON.stringify({
      name: '@fixture/first',
      dependencies: { '@fixture/second': '^1.0.0', react: '^19.0.0' },
    }),
    'packages/first/src/index.ts':
      "import { second } from '@fixture/second';\nimport React from 'react';\nexport { second, React };\n",
    'packages/second/package.json': JSON.stringify({ name: '@fixture/second' }),
    'packages/second/src/index.ts': 'export const second = 2;\n',
  });

  try {
    await expectEquivalentGraphsAsync('workspace', root);
  } finally {
    await rm(root, { recursive: true });
  }
});

test('matches filesystem analysis for an inspected Java project', async () => {
  const root = await createFixtureAsync({
    'pom.xml': [
      '<project>',
      '<modelVersion>4.0.0</modelVersion>',
      '<groupId>fixture</groupId>',
      '<artifactId>java-fixture</artifactId>',
      '<version>1.0.0</version>',
      '</project>',
    ].join(''),
    'src/main/java/com/example/app/App.java': [
      'package com.example.app;',
      'import com.example.shared.Value;',
      'import java.util.List;',
      'public class App {}',
      '',
    ].join('\n'),
    'src/main/java/com/example/shared/Value.java': [
      'package com.example.shared;',
      'public class Value {}',
      '',
    ].join('\n'),
  });

  try {
    await expectEquivalentGraphsAsync('java', root);
  } finally {
    await rm(root, { recursive: true });
  }
});

test('uses a supplied inspection without touching its missing root', async () => {
  const inspection = virtualInspection();
  let analyzed = false;
  const analyzer: DependencyGraphAnalyzer = {
    id: 'virtual',
    supports: () => true,
    analyzeAsync: () => {
      analyzed = true;
      return Promise.resolve({ nodes: [], edges: [] });
    },
  };

  const graph = await createDependencyGraphFromInspectionsAsync({
    projects: [{ id: 'virtual', inspection }],
    analyzers: [analyzer],
  });

  expect(analyzed).toBe(true);
  expect(graph.nodes).toHaveLength(1);
  expect(graph.edges).toEqual([]);
});

test('rejects duplicate supplied project identities before analysis', async () => {
  const inspection = virtualInspection();

  await rejects(
    createDependencyGraphFromInspectionsAsync({
      projects: [
        { id: 'duplicate', inspection },
        { id: 'duplicate', inspection },
      ],
      analyzers: [],
    }),
    /must be unique/u
  );
});

/*** Compare path-based and pre-inspected analysis through the public package API. */
async function expectEquivalentGraphsAsync(id: string, root: string): Promise<void> {
  const inspection = await inspectProjectAsync(root);
  const [fromFilesystem, fromInspection] = await Promise.all([
    createDependencyGraphAsync({ projects: [{ id, rootPath: root }] }),
    createDependencyGraphFromInspectionsAsync({ projects: [{ id, inspection }] }),
  ]);

  expect(fromInspection).toEqual(fromFilesystem);
}

/*** Build a complete inspection whose root deliberately does not exist on disk. */
function virtualInspection(): ProjectInspection {
  return {
    rootPath: path.join(os.tmpdir(), 'dependency-graph-intentionally-missing-root'),
    complete: true,
    directories: [],
    files: [],
    detection: {
      traits: new Set(['virtual']),
      languages: [],
      packageManagers: [],
      buildTools: [],
      findings: [],
      diagnostics: [],
    },
    packages: [],
    workspaces: [],
    manifests: [],
    diagnostics: [],
  };
}

/*** Create an isolated filesystem fixture for inspection API tests. */
async function createFixtureAsync(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dependency-graph-inspection-test-'));
  await Promise.all(
    Object.entries(files).map(async ([file, fileContent]) => {
      const target = path.join(root, file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, fileContent);
    })
  );
  return root;
}
