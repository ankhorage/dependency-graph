import type { DependencyGraphAnalyzer } from '../../../../../types/dependencyGraph.js';
import { analyzeKotlinProjectAsync } from './analyzeKotlinProjectAsync.js';

/*** Kotlin analyzer adapter selected from project-detector language evidence. */
export const kotlinDependencyGraphAnalyzer: DependencyGraphAnalyzer = {
  id: 'kotlin',
  supports: (detection) => detection.languages.some(({ id }) => id === 'kotlin'),
  analyzeAsync: analyzeKotlinProjectAsync,
};
