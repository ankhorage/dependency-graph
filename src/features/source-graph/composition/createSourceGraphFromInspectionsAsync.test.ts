import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { inspectProjectAsync } from '@ankhorage/project-detector/node';
import { afterAll, expect, test } from 'bun:test';

import {
  createSourceGraphFromInspectionsAsync,
  createSourceGraphIndex,
  createSourceRollupIndex,
  deserializeSourceGraph,
  findRolledUpDependency,
  findSourceFile,
  findSourceRelationsBetween,
  findSourceSymbols,
  outgoingSourceRelations,
  rollupSourceRelations,
  serializeSourceGraph,
  summarizeSourceNode,
} from '../../../dependencyGraph.js';
import { sourceSemanticPath } from '../domain/sourceSemanticPath.js';

const roots: string[] = [];
afterAll(async () => Promise.all(roots.map((root) => rm(root, { recursive: true, force: true }))));

test('preserves Java facts through serialization and indexed relations', async () => {
  const graph = await createFixtureGraphAsync();
  const restored = deserializeSourceGraph(serializeSourceGraph(graph));
  expect(restored).toEqual(graph);
  const index = createSourceGraphIndex(restored);
  const javaFile = 'src/main/java/demo/Adapter.java';
  expect(findSourceFile(index, 'java', javaFile)?.data.kind).toBe('file');
  const [adapter] = findSourceSymbols(index, 'java', javaFile, 'Adapter');
  expect(adapter?.data.documentation?.text).toBe('Adapter documentation.');
  expect(adapter?.data.visibility).toBe('public');
  expect(findSourceSymbols(index, 'java', javaFile, 'run')[0]?.data.signature).toContain(
    'void run()',
  );
  expect(
    restored.graph.edges.some(
      ({ data }) => data.kind === 'implements' && data.evidence[0]?.analyzerId === 'java',
    ),
  ).toBe(true);
  expect(
    restored.graph.edges.some(
      ({ data }) => data.kind === 'imports' && data.evidence[0]?.specifier === 'java.util.List',
    ),
  ).toBe(true);
  expect(
    restored.capabilities.find(({ analyzerId }) => analyzerId === 'java')?.available,
  ).toContain('documentation');
});

test('resolves semantic Java relations without numeric ID lookups', async () => {
  const graph = await createFixtureGraphAsync();
  const index = createSourceGraphIndex(graph);
  const javaFile = 'src/main/java/demo/Adapter.java';
  const adapterFile = findSourceFile(index, 'java', javaFile);
  const source = adapterFile?.data.semanticPath ?? '';
  const javaImports = outgoingSourceRelations(index, source).filter(
    ({ kind }) => kind === 'imports',
  );
  expect(javaImports[0]?.target.semanticPath).toContain('java.util');
  expect(
    findSourceRelationsBetween(index, source, javaImports[0]?.target.semanticPath ?? '')[0]
      ?.evidence[0]?.sourcePath,
  ).toBe(javaFile);
});

test('projects TypeScript and Java facts with reproducible summaries and rollups', async () => {
  const graph = await createFixtureGraphAsync();
  const index = createSourceGraphIndex(graph);
  expect(findSourceSymbols(index, 'typescript', 'src/a.ts', 'A')[0]?.data.documentation?.text).toBe(
    'A description.',
  );
  expect(
    rollupSourceRelations(graph, index, 'file').some(
      ({ weight, evidenceEdgeIds }) => weight === 1 && evidenceEdgeIds.length === 1,
    ),
  ).toBe(true);
  expect(
    rollupSourceRelations(graph, index, 'package').some(
      ({ sourceSemanticPath: source, targetSemanticPath: target }) =>
        source === sourceSemanticPath('namespace', 'java', 'demo') && target.includes('java.util'),
    ),
  ).toBe(true);
  const packageRollups = createSourceRollupIndex(rollupSourceRelations(graph, index, 'package'));
  expect(
    findRolledUpDependency(
      packageRollups,
      sourceSemanticPath('namespace', 'java', 'demo'),
      sourceSemanticPath('external', 'java', 'java.util'),
    )?.weight,
  ).toBe(1);
  expect(
    summarizeSourceNode(graph, index, sourceSemanticPath('project', 'java'))?.descendants.class,
  ).toBe(1);
  expect(
    summarizeSourceNode(graph, index, sourceSemanticPath('project', 'typescript'))?.exports,
  ).toEqual({ runtime: 1, typeOnly: 1 });
  expect(
    graph.capabilities.find(({ analyzerId }) => analyzerId === 'typescript')?.available,
  ).toContain('exports');
});

test('reports declared vendor and unknown imports with distinct evidence', async () => {
  const graph = await createFixtureGraphAsync();
  const targetById = new Map(graph.graph.nodes.map((node) => [node.id, node.data]));
  const imports = graph.graph.edges.filter(({ data }) => data.kind === 'imports');
  const vendor = imports.find(({ data }) => data.evidence[0]?.specifier === 'declared-package');
  const unknown = imports.find(({ data }) => data.evidence[0]?.specifier === 'missing-package');
  expect(targetById.get(vendor?.target ?? -1)?.classification).toBe('vendor');
  expect(vendor?.data.evidence[0]?.declarations).toEqual([{ kind: 'dependency', range: '^1.0.0' }]);
  expect(targetById.get(unknown?.target ?? -1)?.classification).toBe('unknown');
  expect(unknown?.data.evidence[0]?.declarations).toBeUndefined();
  const index = createSourceGraphIndex(graph);
  const fileRollup = rollupSourceRelations(graph, index, 'file');
  expect(
    fileRollup.some(({ targetSemanticPath }) => targetSemanticPath.includes('declared-package')),
  ).toBe(true);
  expect(
    fileRollup.some(({ targetSemanticPath }) => targetSemanticPath.includes('missing-package')),
  ).toBe(true);
});

test('distinguishes unavailable documentation from undocumented declarations', async () => {
  const javaGraph = await createFixtureGraphAsync();
  const javaIndex = createSourceGraphIndex(javaGraph);
  const [undocumented] = findSourceSymbols(
    javaIndex,
    'java',
    'src/main/java/demo/Port.java',
    'Port',
  );
  expect(undocumented?.data.documentation).toBeUndefined();
  expect(
    javaGraph.capabilities.find(({ analyzerId }) => analyzerId === 'java')?.available,
  ).toContain('documentation');

  const root = await mkdtemp('/tmp/dependency-graph-python-');
  roots.push(root);
  await mkdir(path.join(root, 'src'));
  await writeFile(
    path.join(root, 'pyproject.toml'),
    '[project]\nname = "sample"\nversion = "0.1.0"\n',
  );
  await writeFile(path.join(root, 'src/main.py'), 'import requests\nclass Demo: pass\n');
  const graph = await createSourceGraphFromInspectionsAsync({
    projects: [{ id: 'python', inspection: await inspectProjectAsync(root) }],
  });
  expect(graph.capabilities.find(({ analyzerId }) => analyzerId === 'python')?.available).toEqual([
    'imports',
  ]);
  expect(
    graph.graph.edges.some(
      ({ data }) => data.kind === 'imports' && data.evidence[0]?.specifier === 'requests',
    ),
  ).toBe(true);
  expect(graph.graph.nodes.some(({ data }) => data.kind === 'class')).toBe(false);
});

/*** Create two real scanned projects through the public inspection boundary. */
async function createFixtureGraphAsync() {
  const javaRoot = await mkdtemp('/tmp/dependency-graph-java-');
  const typescriptRoot = await mkdtemp('/tmp/dependency-graph-typescript-');
  roots.push(javaRoot, typescriptRoot);
  await mkdir(path.join(javaRoot, 'src/main/java/demo'), { recursive: true });
  await mkdir(path.join(typescriptRoot, 'src'), { recursive: true });
  await writeFile(path.join(javaRoot, 'build.gradle'), 'plugins { id "java" }');
  await writeFile(
    path.join(javaRoot, 'src/main/java/demo/Port.java'),
    'package demo; public interface Port { void run(); }',
  );
  await writeFile(
    path.join(javaRoot, 'src/main/java/demo/Adapter.java'),
    [
      'package demo;',
      'import java.util.List;',
      '/** Adapter documentation. */',
      'public class Adapter implements Port {',
      '  public void run() {}',
      '}',
    ].join('\n'),
  );
  await writeFile(
    path.join(typescriptRoot, 'package.json'),
    JSON.stringify({
      name: 'sample',
      dependencies: { 'declared-package': '^1.0.0' },
    }),
  );
  await writeFile(path.join(typescriptRoot, 'src/b.ts'), 'export interface B {}');
  await writeFile(
    path.join(typescriptRoot, 'src/a.ts'),
    [
      "import { B } from './b';",
      "import 'declared-package';",
      "import 'missing-package';",
      '/** A description. */',
      'export class A implements B {',
      '  public run(value: string): void {}',
      '}',
    ].join('\n'),
  );
  const projects = await Promise.all(
    [
      { id: 'java', root: javaRoot },
      { id: 'typescript', root: typescriptRoot },
    ].map(async ({ id, root }) => ({ id, inspection: await inspectProjectAsync(root) })),
  );
  return createSourceGraphFromInspectionsAsync({ projects });
}
