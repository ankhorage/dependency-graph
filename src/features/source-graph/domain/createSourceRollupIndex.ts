import type { SourceRollupEdge, SourceRollupIndex } from '../../../types/sourceGraph.js';

/*** Index one computed rollup so repeated semantic dependency queries avoid graph scans. */
export function createSourceRollupIndex(rollups: readonly SourceRollupEdge[]): SourceRollupIndex {
  const byPair = new Map<string, SourceRollupEdge>();
  const outgoingBySource = new Map<string, SourceRollupEdge[]>();
  for (const edge of rollups) {
    byPair.set(pairKey(edge.sourceSemanticPath, edge.targetSemanticPath), edge);
    const outgoing = outgoingBySource.get(edge.sourceSemanticPath);
    if (outgoing === undefined) outgoingBySource.set(edge.sourceSemanticPath, [edge]);
    else outgoing.push(edge);
  }
  return { byPair, outgoingBySource };
}

/*** Look up an aggregate dependency using stable semantic identities. */
export function findRolledUpDependency(
  index: SourceRollupIndex,
  sourceSemanticPath: string,
  targetSemanticPath: string,
): SourceRollupEdge | undefined {
  return index.byPair.get(pairKey(sourceSemanticPath, targetSemanticPath));
}

/*** List aggregate dependencies leaving one semantic container. */
export function outgoingRolledUpDependencies(
  index: SourceRollupIndex,
  sourceSemanticPath: string,
): readonly SourceRollupEdge[] {
  return index.outgoingBySource.get(sourceSemanticPath) ?? [];
}

/*** Preserve pair identity even when paths contain punctuation. */
function pairKey(source: string, target: string): string {
  return `${source}\u0000${target}`;
}
