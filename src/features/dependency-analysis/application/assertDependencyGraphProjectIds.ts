/*** Reject empty or duplicate dependency-graph project IDs before analysis. */
export function assertDependencyGraphProjectIds(
  projects: readonly { readonly id: string }[],
): void {
  if (projects.length === 0) {
    throw new Error('At least one dependency graph project is required.');
  }

  const ids = projects.map(({ id }) => id);
  if (ids.some((id) => id.trim() === '')) {
    throw new Error('Dependency graph project IDs must be non-empty.');
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error('Dependency graph project IDs must be unique.');
  }
}
