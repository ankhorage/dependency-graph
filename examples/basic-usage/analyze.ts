import { createDependencyGraphAsync } from '@ankhorage/dependency-graph';

/***
 * Analyze the current project and print its canonical dependency graph.
 *
 * @usage
 * @readme
 */
const graph = await createDependencyGraphAsync({
  projects: [{ id: 'current', rootPath: process.cwd() }],
});

console.log(graph);
