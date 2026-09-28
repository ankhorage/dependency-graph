import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  createSourceGraphAsync,
  createSourceGraphIndex,
  deserializeSourceGraph,
  findSourceFile,
  rollupSourceRelations,
  serializeSourceGraph,
} from '../src/dependencyGraph.js';

/*** Measure analysis, storage, indexing, lookup, rollup, and heap on a repeatable source fixture. */
async function benchmarkAsync(): Promise<void> {
  const root = await mkdtemp('/tmp/dependency-graph-benchmark-');
  const count = 1_000;
  try {
    await mkdir(path.join(root, 'src'));
    await writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'graph-benchmark' }));
    await Promise.all(
      Array.from({ length: count }, async (_, index) => {
        const previous =
          index === 0 ? '' : `import { Module${index - 1} } from './module${index - 1}';\n`;
        const parent = index === 0 ? '' : ` extends Module${index - 1}`;
        await writeFile(
          path.join(root, `src/module${index}.ts`),
          `${previous}/** Module ${index}. */\nexport class Module${index}${parent} { run(): void {} }\n`,
        );
      }),
    );
    const started = performance.now();
    const graph = await createSourceGraphAsync({ projects: [{ id: 'bench', rootPath: root }] });
    const analyzed = performance.now();
    const rawBytes = Buffer.byteLength(JSON.stringify(graph));
    const serialized = serializeSourceGraph(graph);
    const stored = performance.now();
    const restored = deserializeSourceGraph(serialized);
    const index = createSourceGraphIndex(restored);
    const indexed = performance.now();
    for (let iteration = 0; iteration < count; iteration += 1) {
      if (findSourceFile(index, 'bench', `src/module${iteration}.ts`) === undefined) {
        throw new Error(`Missing benchmark file ${iteration}.`);
      }
    }
    const lookedUp = performance.now();
    const rollup = rollupSourceRelations(restored, index, 'file');
    const projected = performance.now();
    process.stdout.write(
      `${JSON.stringify({
        files: count,
        nodes: graph.graph.nodes.length,
        edges: graph.graph.edges.length,
        rollupEdges: rollup.length,
        serializedBytes: Buffer.byteLength(serialized),
        rawBytes,
        analyzeMs: analyzed - started,
        serializeMs: stored - analyzed,
        deserializeAndIndexMs: indexed - stored,
        lookupMs: lookedUp - indexed,
        rollupMs: projected - lookedUp,
        heapBytes: process.memoryUsage().heapUsed,
      })}\n`,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

await benchmarkAsync();
