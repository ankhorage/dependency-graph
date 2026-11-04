import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from 'bun:test';

import type { ProjectAnalysisSnapshot } from '../../../dependencyGraph.js';
import {
  createDependencyGraphAsync,
  createDependencyGraphFromProjectAnalysisSnapshots,
  createProjectAnalysisSnapshotAsync,
  createSourceGraphAsync,
  createSourceGraphFromProjectAnalysisSnapshots,
  deserializeProjectAnalysisSnapshot,
  serializeProjectAnalysisSnapshot,
} from '../../../dependencyGraph.js';

test('recomposes deleted independent project snapshots into the fresh multi-project graphs', async () => {
  const roots = await createConnectedProjectsAsync();
  try {
    const projects = [
      { id: 'alpha', rootPath: roots.alpha },
      { id: 'beta', rootPath: roots.beta },
    ] as const;
    const [sourceGraph, dependencyGraph, alphaGraph, alphaSnapshot, betaSnapshot] =
      await Promise.all([
        createSourceGraphAsync({ projects }),
        createDependencyGraphAsync({ projects }),
        createDependencyGraphAsync({ projects: [projects[0]] }),
        createProjectAnalysisSnapshotAsync(projects[0]),
        createProjectAnalysisSnapshotAsync(projects[1]),
      ]);
    const restored = [alphaSnapshot, betaSnapshot].map((snapshot) =>
      deserializeProjectAnalysisSnapshot(serializeProjectAnalysisSnapshot(snapshot)),
    );

    expect(JSON.stringify(restored)).not.toContain(roots.alpha);
    expect(JSON.stringify(restored)).not.toContain(roots.beta);
    await Promise.all(
      Object.values(roots).map((root) => rm(root, { recursive: true, force: true })),
    );

    expect(createSourceGraphFromProjectAnalysisSnapshots(restored)).toEqual(sourceGraph);
    expect(createDependencyGraphFromProjectAnalysisSnapshots(restored)).toEqual(dependencyGraph);
    expect(createSourceGraphFromProjectAnalysisSnapshots([...restored].reverse())).toEqual(
      sourceGraph,
    );
    expect(createDependencyGraphFromProjectAnalysisSnapshots([...restored].reverse())).toEqual(
      dependencyGraph,
    );
    expect(createDependencyGraphFromProjectAnalysisSnapshots(restored.slice(0, 1))).toEqual(
      alphaGraph,
    );
  } finally {
    await Promise.all(
      Object.values(roots).map((root) => rm(root, { recursive: true, force: true })),
    );
  }
});

test('retains workspace focus packages and distinct same-named root modules', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dependency-graph-snapshot-workspace-'));
  try {
    await writeFixtureAsync(root, {
      'package.json': JSON.stringify({ name: 'root', workspaces: ['packages/*'] }),
      'src/index.ts': 'export const root = 1;\n',
      'packages/first/package.json': JSON.stringify({ name: '@fixture/first' }),
      'packages/first/src/index.ts': 'export const first = 1;\n',
    });
    const snapshot = await createProjectAnalysisSnapshotAsync({ id: 'workspace', rootPath: root });
    const fresh = await createDependencyGraphAsync({
      projects: [{ id: 'workspace', rootPath: root }],
    });
    await rm(root, { recursive: true, force: true });

    const recomposed = createDependencyGraphFromProjectAnalysisSnapshots([
      deserializeProjectAnalysisSnapshot(serializeProjectAnalysisSnapshot(snapshot)),
    ]);
    expect(recomposed).toEqual(fresh);
    expect(recomposed.nodes.map(({ id }) => id)).toContain('package:workspace:packages/first');
    expect(recomposed.nodes.map(({ id }) => id)).toContain('package:workspace:.#src');
    expect(recomposed.nodes.map(({ id }) => id)).toContain('package:workspace:packages/first#src');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects unsupported snapshot versions before recomposition', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'dependency-graph-snapshot-version-'));
  try {
    await writeFixtureAsync(root, {
      'package.json': JSON.stringify({ name: 'versioned' }),
      'src/index.ts': 'export const versioned = 1;\n',
    });
    const snapshot = await createProjectAnalysisSnapshotAsync({ id: 'versioned', rootPath: root });
    const serialized = serializeProjectAnalysisSnapshot(snapshot).replace(
      '"version":1',
      '"version":2',
    );
    expect(() => deserializeProjectAnalysisSnapshot(serialized)).toThrow(
      'Invalid project analysis snapshot.',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('accepts the portable root package identity', () => {
  const restored = deserializeProjectAnalysisSnapshot(JSON.stringify(validSnapshot()));

  expect(restored.packages[0]?.rootPath).toBe('.');
});

test('rejects absolute and traversal project-relative paths throughout a snapshot', () => {
  const snapshot = validSnapshot();
  const invalidSnapshots = [
    { ...snapshot, files: ['/outside/index.ts'] },
    { ...snapshot, packages: [{ rootPath: '../package', name: 'fixture' }] },
    { ...snapshot, workspaces: [{ rootPath: '.', packagePaths: ['../package'] }] },
    {
      ...snapshot,
      analyzedFiles: [
        {
          ...snapshot.analyzedFiles[0],
          facts: {
            declarations: [],
            imports: [{ specifier: './other', resolvedPath: '../other.ts' }],
          },
        },
      ],
    },
  ];

  for (const invalid of invalidSnapshots) {
    expect(() => deserializeProjectAnalysisSnapshot(JSON.stringify(invalid))).toThrow(
      'Invalid project analysis snapshot.',
    );
  }
});

test('rejects unsupported analyzer metadata and capability declarations', () => {
  const snapshot = validSnapshot();
  const invalidSnapshots = [
    { ...snapshot, analyzers: [{ id: 'untrusted', capabilities: [] }] },
    {
      ...snapshot,
      analyzers: [snapshot.analyzers[0], { id: 'typescript', capabilities: ['imports'] }],
    },
  ];

  for (const invalid of invalidSnapshots) {
    expect(() => deserializeProjectAnalysisSnapshot(JSON.stringify(invalid))).toThrow(
      'Invalid project analysis snapshot.',
    );
  }
});

test('rejects malformed dependency evidence and source facts', () => {
  const snapshot = validSnapshot();
  const invalidSnapshots = [
    {
      ...snapshot,
      analyzedFiles: [
        {
          ...snapshot.analyzedFiles[0],
          declaredDependencies: { package: [{ kind: 'runtime', range: '^1.0.0' }] },
        },
      ],
    },
    {
      ...snapshot,
      analyzedFiles: [
        {
          ...snapshot.analyzedFiles[0],
          facts: { declarations: [], imports: [{ specifier: 1 }] },
        },
      ],
    },
  ];

  for (const invalid of invalidSnapshots) {
    expect(() => deserializeProjectAnalysisSnapshot(JSON.stringify(invalid))).toThrow(
      'Invalid project analysis snapshot.',
    );
  }
});

test('rejects duplicate package, file, and workspace identities', () => {
  const snapshot = validSnapshot();
  const workspaceSnapshot = {
    ...snapshot,
    directories: [...snapshot.directories, 'packages', 'packages/fixture'],
    packages: [...snapshot.packages, { rootPath: 'packages/fixture', name: '@fixture/package' }],
    workspaces: [{ rootPath: '.', packagePaths: ['packages/fixture'] }],
  };
  const invalidSnapshots = [
    { ...snapshot, packages: [...snapshot.packages, { rootPath: '.', name: 'other' }] },
    { ...snapshot, files: [...snapshot.files, snapshot.files[0] ?? 'src/index.ts'] },
    {
      ...workspaceSnapshot,
      workspaces: [...workspaceSnapshot.workspaces, workspaceSnapshot.workspaces[0]],
    },
  ];

  for (const invalid of invalidSnapshots) {
    expect(() => deserializeProjectAnalysisSnapshot(JSON.stringify(invalid))).toThrow(
      'Invalid project analysis snapshot.',
    );
  }
});

/*** Create a complete, already valid portable snapshot independent of a checkout. */
function validSnapshot(): ProjectAnalysisSnapshot {
  return {
    version: 1,
    projectId: 'fixture',
    directories: ['src'],
    files: ['src/index.ts'],
    packages: [{ rootPath: '.', name: '@fixture/root' }],
    workspaces: [],
    analyzers: [
      { id: 'project-detector', capabilities: ['containment'] },
      {
        id: 'typescript',
        capabilities: [
          'containment',
          'declarations',
          'documentation',
          'exports',
          'extends',
          'implements',
          'imports',
          'signatures',
          'source-locations',
          'visibility',
        ],
      },
    ],
    analyzedFiles: [
      {
        analyzerId: 'typescript',
        path: 'src/index.ts',
        facts: { declarations: [], imports: [] },
      },
    ],
  };
}

/*** Materialize two independent repositories whose package imports form a cross-project cycle. */
async function createConnectedProjectsAsync(): Promise<{
  readonly alpha: string;
  readonly beta: string;
}> {
  const alpha = await mkdtemp(path.join(os.tmpdir(), 'dependency-graph-snapshot-alpha-'));
  const beta = await mkdtemp(path.join(os.tmpdir(), 'dependency-graph-snapshot-beta-'));
  await Promise.all([
    writeFixtureAsync(alpha, {
      'package.json': JSON.stringify({
        name: '@fixture/alpha',
        dependencies: { '@fixture/beta': '^1.0.0' },
      }),
      'src/index.ts': "import { beta } from '@fixture/beta';\nexport { beta };\n",
    }),
    writeFixtureAsync(beta, {
      'package.json': JSON.stringify({
        name: '@fixture/beta',
        dependencies: { '@fixture/alpha': '^1.0.0' },
      }),
      'src/index.ts': "import { alpha } from '@fixture/alpha';\nexport { alpha };\n",
    }),
  ]);
  return { alpha, beta };
}

/*** Write a deterministic project fixture without exposing its temporary root to snapshots. */
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
