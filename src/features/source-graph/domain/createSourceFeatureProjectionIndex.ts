import type {
  SourceFeatureProjection,
  SourceFeatureProjectionIndex,
} from '../../../types/sourceGraph.js';

/*** Index a completed feature projection for interaction-time lookup without source graph traversal. */
export function createSourceFeatureProjectionIndex(
  projection: SourceFeatureProjection,
): SourceFeatureProjectionIndex {
  return {
    projection,
    featureById: new Map(projection.features.map((feature) => [feature.id, feature])),
    featureOffsetById: offsets(projection.features, (feature) => feature.id),
    memberOffsetByFeatureId: new Map(
      projection.features.map((feature) => [
        feature.id,
        offsets(feature.members, (member) => member.semanticPath),
      ]),
    ),
  };
}

/*** Materialize stable cursor offsets once so later page traversal never linearly searches evidence. */
function offsets<T>(
  values: readonly T[],
  identity: (value: T) => string,
): ReadonlyMap<string, number> {
  return new Map(values.map((value, offset) => [identity(value), offset]));
}
