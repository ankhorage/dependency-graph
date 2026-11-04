import type { SourceCapability } from '../../../types/sourceGraph.js';

/*** Check whether an analyzer identity belongs to the portable snapshot contract. */
export function isSourceAnalyzerId(value: string): boolean {
  return [
    'cpp',
    'delphi',
    'java',
    'javascript',
    'kotlin',
    'project-detector',
    'python',
    'typescript',
  ].includes(value);
}

/*** Declare the factual capabilities each supported analyzer contract can emit. */
export function sourceAnalyzerCapabilities(analyzerId: string): readonly SourceCapability[] {
  if (analyzerId === 'project-detector') return ['containment'];
  if (analyzerId === 'java')
    return [
      'containment',
      'declarations',
      'documentation',
      'extends',
      'implements',
      'imports',
      'signatures',
      'source-locations',
      'visibility',
    ];
  if (analyzerId === 'typescript')
    return [
      'containment',
      'declarations',
      'documentation',
      'exports',
      'extends',
      'implements',
      'imports',
      'signatures',
      'source-locations',
      'visibility',
    ];
  if (['cpp', 'delphi', 'kotlin', 'python'].includes(analyzerId)) return ['imports'];
  return [];
}
