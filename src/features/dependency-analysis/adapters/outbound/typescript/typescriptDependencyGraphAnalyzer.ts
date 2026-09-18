import type { DependencyGraphAnalyzer } from '../../../../../types/dependencyGraph.js';
import { analyzeTypeScriptProjectAsync } from './analyzeTypeScriptProjectAsync.js';

/*** TypeScript analyzer adapter selected from project-detector language evidence. */
export const typescriptDependencyGraphAnalyzer: DependencyGraphAnalyzer = {
  id: 'typescript',
  supports: (detection) => detection.languages.some(({ id }) => id === 'typescript'),
  analyzeAsync: analyzeTypeScriptProjectAsync,
};
