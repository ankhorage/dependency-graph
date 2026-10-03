import type { DependencyGraphProjectInput } from './dependencyGraph.js';

export interface DependencyGraphApiInput {
  readonly projects: readonly DependencyGraphProjectInput[];
}
