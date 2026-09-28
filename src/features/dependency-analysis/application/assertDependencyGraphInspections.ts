import type { DependencyGraphInspectionProjectInput } from '../../../types/dependencyGraph.js';
import { assertDependencyGraphProjectIds } from './assertDependencyGraphProjectIds.js';

/*** Preserve dependency projection preconditions before reading source files. */
export function assertDependencyGraphInspections(
  projects: readonly DependencyGraphInspectionProjectInput[],
): void {
  assertDependencyGraphProjectIds(projects);
  for (const { id, inspection } of projects) {
    if (inspection.complete) continue;
    throw new Error(
      `Dependency graph inspection is incomplete for "${id}": ${inspection.diagnostics
        .map(({ message }) => message)
        .join('; ')}`,
    );
  }
}
