import type { DependencyGraphAnalyzer } from '../../../../../types/dependencyGraph.js';
import { analyzeDelphiProjectAsync } from './analyzeDelphiProjectAsync.js';

/*** Delphi analyzer adapter selected from project-detector language evidence. */
export const delphiDependencyGraphAnalyzer: DependencyGraphAnalyzer = {
  id: 'delphi',
  supports: (detection) => detection.languages.some(({ id }) => id === 'delphi'),
  analyzeAsync: analyzeDelphiProjectAsync,
};
