import type { ProjectAnalysisSnapshot } from '../../../types/projectAnalysisSnapshot.js';
import { assertProjectAnalysisSnapshot } from './projectAnalysisSnapshot.js';

/*** Serialize a validated portable project analysis snapshot for cache storage or transfer. */
export function serializeProjectAnalysisSnapshot(snapshot: ProjectAnalysisSnapshot): string {
  assertProjectAnalysisSnapshot(snapshot);
  return JSON.stringify(snapshot);
}
