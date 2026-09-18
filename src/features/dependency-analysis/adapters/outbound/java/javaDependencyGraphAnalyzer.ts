import type { DependencyGraphAnalyzer } from '../../../../../types/dependencyGraph.js';
import { analyzeJavaProjectAsync } from './analyzeJavaProjectAsync.js';

/*** Java analyzer adapter selected from project-detector language evidence. */
export const javaDependencyGraphAnalyzer: DependencyGraphAnalyzer = {
  id: 'java',
  supports: (detection) => detection.languages.some(({ id }) => id === 'java'),
  analyzeAsync: analyzeJavaProjectAsync,
};
