import type { DependencyGraphAnalyzer } from '../../../../../types/dependencyGraph.js';
import { analyzeCppProjectAsync } from './analyzeCppProjectAsync.js';

/*** C++ analyzer adapter selected from project-detector language evidence. */
export const cppDependencyGraphAnalyzer: DependencyGraphAnalyzer = {
  id: 'cpp',
  supports: (detection) => detection.languages.some(({ id }) => id === 'cpp'),
  analyzeAsync: analyzeCppProjectAsync,
};
