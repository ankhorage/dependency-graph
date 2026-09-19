import type { DependencyGraphAnalyzer } from '../../../../../types/dependencyGraph.js';
import { analyzePythonProjectAsync } from './analyzePythonProjectAsync.js';

/*** Python analyzer adapter selected from project-detector language evidence. */
export const pythonDependencyGraphAnalyzer: DependencyGraphAnalyzer = {
  id: 'python',
  supports: (detection) => detection.languages.some(({ id }) => id === 'python'),
  analyzeAsync: analyzePythonProjectAsync,
};
