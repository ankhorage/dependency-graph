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

test('builds Java package dependencies with intrinsic and external import evidence', async () => {
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
    const graph = await createDependencyGraphAsync({
      projects: [{ id: 'java-fixture', rootPath: root }],
    });
    const intrinsic = graph.edges.find(({ data }) =>
      data.evidence.some(({ specifier }) => specifier === 'com.example.shared.Value'),
    );
    const external = graph.edges.find(({ data }) =>
      data.evidence.some(({ specifier }) => specifier === 'java.util.List'),
    );

    expect(intrinsic?.data.analyzerId).toBe('java');
    expect(intrinsic?.data.evidence[0]?.classification).toBe('intrinsic');
    expect(external?.data.evidence[0]?.classification).toBe('unknown');
    expect(graph.nodes.some(({ data }) => data.path === 'com.example.app')).toBe(true);
    expect(graph.nodes.some(({ data }) => data.path === 'com.example.shared')).toBe(true);
  } finally {
    await rm(root, { recursive: true });
  }
});

test('builds Kotlin package dependencies with intrinsic and external import evidence', async () => {
  const root = await createFixtureAsync({
    'build.gradle.kts': 'plugins { kotlin("jvm") version "2.0.0" }',
    'src/main/kotlin/com/example/app/App.kt': [
      'package com.example.app',
      'import com.example.shared.Value',
      'import kotlinx.coroutines.launch',
      'class App',
      '',
    ].join('\n'),
    'src/main/kotlin/com/example/shared/Value.kt': [
      'package com.example.shared',
      'class Value',
      '',
    ].join('\n'),
  });

  try {
    const graph = await createDependencyGraphAsync({
      projects: [{ id: 'kotlin-fixture', rootPath: root }],
    });
    const intrinsic = graph.edges.find(({ data }) =>
      data.evidence.some(({ specifier }) => specifier === 'com.example.shared.Value'),
    );
    const external = graph.edges.find(({ data }) =>
      data.evidence.some(({ specifier }) => specifier === 'kotlinx.coroutines.launch'),
    );

    expect(intrinsic?.data.analyzerId).toBe('kotlin');
    expect(intrinsic?.data.evidence[0]?.classification).toBe('intrinsic');
    expect(external?.data.evidence[0]?.classification).toBe('unknown');
    expect(graph.nodes.some(({ data }) => data.path === 'com.example.app')).toBe(true);
    expect(graph.nodes.some(({ data }) => data.path === 'com.example.shared')).toBe(true);
  } finally {
    await rm(root, { recursive: true });
  }
});

test('builds Python package dependencies with intrinsic and external import evidence', async () => {
  const root = await createFixtureAsync({
    'pyproject.toml': '[project]\nname = "python-fixture"\nversion = "1.0.0"\n',
    'src/services/app.py': [
      'from models.user import User',
      'import requests',
      'class App:',
      '    pass',
      '',
    ].join('\n'),
    'src/models/user.py': [
      'class User:',
      '    pass',
      '',
    ].join('\n'),
  });

  try {
    const graph = await createDependencyGraphAsync({
      projects: [{ id: 'python-fixture', rootPath: root }],
    });
    const intrinsic = graph.edges.find(({ data }) =>
      data.evidence.some(({ specifier }) => specifier === 'models.user'),
    );
    const external = graph.edges.find(({ data }) =>
      data.evidence.some(({ specifier }) => specifier === 'requests'),
    );

    expect(intrinsic?.data.analyzerId).toBe('python');
    expect(intrinsic?.data.evidence[0]?.classification).toBe('intrinsic');
    expect(external?.data.evidence[0]?.classification).toBe('unknown');
    expect(graph.nodes.some(({ data }) => data.path === 'services')).toBe(true);
    expect(graph.nodes.some(({ data }) => data.path === 'models')).toBe(true);
  } finally {
    await rm(root, { recursive: true });
  }
});

/*** Create an isolated filesystem fixture for dependency graph integration tests. */
async function createFixtureAsync(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dependency-graph-test-'));
  await Promise.all(
    Object.entries(files).map(async ([file, fileContent]) => {
      const target = path.join(root, file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, fileContent);
    }),
  );
  return root;
}
