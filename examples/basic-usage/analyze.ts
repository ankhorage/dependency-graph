import { createDependencyGraphAsync } from '@ankhorage/dependency-graph';

const graph = await createDependencyGraphAsync({
  projects: [{ id: 'current', rootPath: process.cwd() }],
});

console.log(graph);
