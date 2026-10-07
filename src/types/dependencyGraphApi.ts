import type {
  DependencyGraphInspectedProjectInput,
  DependencyGraphProjectInput,
} from './dependencyGraph.js';

export interface DependencyGraphApiInput {
  readonly projects: readonly (
    DependencyGraphProjectInput | DependencyGraphInspectedProjectInput
  )[];
}
