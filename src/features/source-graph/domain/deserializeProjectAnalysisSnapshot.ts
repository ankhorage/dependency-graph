import type { ProjectAnalysisSnapshot } from '../../../types/projectAnalysisSnapshot.js';
import { assertProjectAnalysisSnapshot } from './projectAnalysisSnapshot.js';

/*** Restore and validate one portable project analysis snapshot before it enters recomposition. */
export function deserializeProjectAnalysisSnapshot(serialized: string): ProjectAnalysisSnapshot {
  const value: unknown = JSON.parse(serialized);
  assertProjectAnalysisSnapshot(value);
  return value;
}
