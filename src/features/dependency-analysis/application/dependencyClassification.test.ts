import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from 'bun:test';

import { createDependencyGraphAsync } from '../../../dependencyGraph.js';

test('classifies only declared TypeScript package roots as vendors', async () => {
  const root = await createFixtureAsync({
    'package.json': JSON.stringify({
      name: 'fixture',
      dependencies: {
        '@ankhorage/zora': '^21.0.0',
        react: '^19.0.0',
      },
    }),
    'src/index.ts': [
      "import '@ankhorage/zora/tree-view';",
      "import 'react/jsx-runtime';",
      "import 'mystery/subpath';",
      'export {};',
      '',
    ].join('\n'),
  });

  try {
    const graph = await createDependencyGraphAsync({
      projects: [{ id: 'fixture', rootPath: root }],
    });
    const zora = graph.nodes.find(({ data }) => data.packageName === '@ankhorage/zora');
    const react = graph.nodes.find(({ data }) => data.packageName === 'react');
    const mystery = graph.nodes.find(({ data }) => data.packageName === 'mystery');

    expect(zora?.data.classification).toBe('vendor');
    expect(react?.data.classification).toBe('vendor');
    expect(mystery?.data.classification).toBe('unknown');
    expect(graph.nodes.some(({ id }) => id === 'vendor:mystery')).toBe(false);
    expect(graph.nodes.some(({ id }) => id === 'unknown:mystery')).toBe(true);
  } finally {
    await rm(root, { recursive: true });
  }
});

test('resolves Java static members through source-declared intrinsic packages', async () => {
  const root = await createFixtureAsync({
    'pom.xml': [
      '<project>',
      '<modelVersion>4.0.0</modelVersion>',
      '<groupId>fixture</groupId>',
      '<artifactId>java-static-fixture</artifactId>',
      '<version>1.0.0</version>',
      '</project>',
    ].join(''),
    'src/main/java/io/reflectoring/coderadar/app/ScanProjectScheduler.java': [
      'package io.reflectoring.coderadar.app;',
      'import static io.reflectoring.coderadar.project.CreateProjectService.getProjectDateRange;',
      'public class ScanProjectScheduler {}',
      '',
    ].join('\n'),
    'src/main/java/io/reflectoring/coderadar/project/CreateProjectService.java': [
      'package io.reflectoring.coderadar.project;',
      'public class CreateProjectService {',
      '  public static void getProjectDateRange() {}',
      '}',
      '',
    ].join('\n'),
  });

  try {
    const graph = await createDependencyGraphAsync({
      projects: [{ id: 'java-static-fixture', rootPath: root }],
    });
    const edge = graph.edges.find(({ data }) =>
      data.evidence.some(({ specifier }) =>
        specifier.endsWith('CreateProjectService.getProjectDateRange'),
      ),
    );

    expect(edge?.data.evidence[0]?.classification).toBe('intrinsic');
    expect(
      graph.nodes.some(
        ({ data }) => data.path === 'io.reflectoring.coderadar.project' && data.classification === 'intrinsic',
      ),
    ).toBe(true);
    expect(
      graph.nodes.some(({ data }) =>
        data.packageName?.includes('CreateProjectService.getProjectDateRange'),
      ),
    ).toBe(false);
  } finally {
    await rm(root, { recursive: true });
  }
});

test('resolves Kotlin member imports through source-declared intrinsic packages', async () => {
  const root = await createFixtureAsync({
    'build.gradle.kts': 'plugins { kotlin("jvm") version "2.0.0" }',
    'src/main/kotlin/io/example/app/App.kt': [
      'package io.example.app',
      'import io.example.shared.Service.value',
      'class App',
      '',
    ].join('\n'),
    'src/main/kotlin/io/example/shared/Service.kt': [
      'package io.example.shared',
      'object Service { const val value = 1 }',
      '',
    ].join('\n'),
  });

  try {
    const graph = await createDependencyGraphAsync({
      projects: [{ id: 'kotlin-member-fixture', rootPath: root }],
    });
    const edge = graph.edges.find(({ data }) =>
      data.evidence.some(({ specifier }) => specifier === 'io.example.shared.Service.value'),
    );

    expect(edge?.data.evidence[0]?.classification).toBe('intrinsic');
    expect(graph.nodes.some(({ data }) => data.path === 'io.example.shared')).toBe(true);
    expect(graph.nodes.some(({ id }) => id === 'unknown:io.example.shared.Service')).toBe(false);
  } finally {
    await rm(root, { recursive: true });
  }
});

/*** Create one isolated project fixture for dependency-classification integration tests. */
async function createFixtureAsync(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dependency-classification-test-'));
  await Promise.all(
    Object.entries(files).map(async ([file, content]) => {
      const target = path.join(root, file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
    }),
  );
  return root;
}
