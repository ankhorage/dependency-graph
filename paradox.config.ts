import { defineParadoxConfig } from '@ankhorage/paradox';

export default defineParadoxConfig({
  mode: 'write',
  docs: {
    title: '@ankhorage/dependency-graph',
    description: 'Project-aware dependency analysis that produces canonical Ankhorage graphs.',
  },
  package: {
    root: '.',
    entrypoints: ['src/dependencyGraph.ts'],
  },
  output: { dir: './paradox' },
});
