import type {
  SourceFeature,
  SourceFeaturePage,
  SourceFeatureProjectionIndex,
} from '../../../types/sourceGraph.js';

/*** Resolve one stable feature identity in constant time. */
export function findSourceFeature(
  index: SourceFeatureProjectionIndex,
  id: string,
): SourceFeature | undefined {
  return index.featureById.get(id);
}

/*** Return a bounded deterministic page of evidenced features. */
export function listSourceFeatures(
  index: SourceFeatureProjectionIndex,
  input: { readonly cursor?: string; readonly limit: number },
): SourceFeaturePage<SourceFeature> {
  return page(index.projection.features, index.featureOffsetById, input);
}

/*** Return bounded component or module evidence for one resolved feature. */
export function listSourceFeatureMembers(
  index: SourceFeatureProjectionIndex,
  featureId: string,
  input: { readonly cursor?: string; readonly limit: number },
): SourceFeaturePage<SourceFeature['members'][number]> {
  return page(
    index.featureById.get(featureId)?.members ?? [],
    index.memberOffsetByFeatureId.get(featureId) ?? new Map(),
    input,
  );
}

/*** Enforce finite query bounds and use the last returned stable identity as the cursor. */
function page<T extends { readonly semanticPath?: string; readonly id?: string }>(
  values: readonly T[],
  offsets: ReadonlyMap<string, number>,
  input: { readonly cursor?: string; readonly limit: number },
): SourceFeaturePage<T> {
  if (!Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > 1000)
    throw new Error('Feature projection query limit must be between 1 and 1000.');
  const offset = input.cursor === undefined ? undefined : offsets.get(input.cursor);
  if (input.cursor !== undefined && offset === undefined)
    throw new Error('Feature projection cursor is invalid.');
  const start = offset === undefined ? 0 : offset + 1;
  const items = values.slice(start, start + input.limit);
  const last = items.at(-1);
  return {
    items,
    ...(last !== undefined && start + items.length < values.length
      ? { nextCursor: identity(last) }
      : {}),
  };
}

/*** Use canonical feature or member identities as opaque pagination cursors. */
function identity(value: { readonly semanticPath?: string; readonly id?: string }): string {
  return value.id ?? value.semanticPath ?? '';
}
