import type {
  SourceFeature,
  SourceFeatureCapability,
  SourceFeatureDiagnostic,
  SourceFeatureProjection,
  SourceGraph,
  SourceNodeData,
} from '../../../types/sourceGraph.js';
import { sourceSemanticPath } from '../domain/sourceSemanticPath.js';

/*** Project only explicit TypeScript `@feature <name>` declaration evidence from a SourceGraph. */
export function projectSourceFeatures(sourceGraph: SourceGraph): SourceFeatureProjection {
  const analyzersByFile = new Map(
    sourceGraph.graph.nodes
      .filter(({ data }) => data.kind === 'file' && data.filePath !== undefined)
      .map(({ data }) => [fileKey(data.projectId, data.filePath), data.analyzerId]),
  );
  const evidence = sourceGraph.graph.nodes.flatMap(({ data }) =>
    featureEvidence(data, analyzersByFile.get(fileKey(data.projectId, data.filePath))),
  );
  const diagnostics = evidence.flatMap(({ diagnostic }) =>
    diagnostic === undefined ? [] : [diagnostic],
  );
  const members = evidence.flatMap(({ member }) => (member === undefined ? [] : [member]));
  return {
    version: 1,
    capabilities: featureCapabilities(sourceGraph),
    diagnostics: diagnostics.sort(compareDiagnostic),
    features: featuresFromMembers(members),
  };
}

interface FeatureEvidence {
  readonly diagnostic?: SourceFeatureDiagnostic;
  readonly member?: {
    readonly featureName: string;
    readonly featureId: string;
    readonly member: SourceFeature['members'][number];
  };
}

/*** Accept only the published one-token feature tag contract from TypeScript declarations. */
function featureEvidence(data: SourceNodeData, analyzerId: string | undefined): FeatureEvidence {
  if (analyzerId !== 'typescript' || data.filePath === undefined || data.location === undefined)
    return {};
  const tags = data.documentation?.tags.feature ?? [];
  if (tags.length === 0) return {};
  const names = tags.map((tag) => tag.trim());
  const [name] = names;
  if (names.length !== 1 || name === undefined || !isFeatureName(name)) {
    return {
      diagnostic: {
        analyzerId,
        projectId: data.projectId,
        filePath: data.filePath,
        location: data.location,
        semanticPath: data.semanticPath,
        message: 'A TypeScript feature declaration must have exactly one @feature <name> tag.',
      },
    };
  }
  return {
    member: {
      featureName: name,
      featureId: sourceSemanticPath('feature', data.projectId, name),
      member: {
        analyzerId,
        filePath: data.filePath,
        evidence: data.location,
        semanticPath: data.semanticPath,
      },
    },
  };
}

/*** Build deterministic project-scoped features without treating absent tags as negative evidence. */
function featuresFromMembers(
  members: readonly NonNullable<FeatureEvidence['member']>[],
): readonly SourceFeature[] {
  const grouped = new Map<
    string,
    {
      readonly id: string;
      readonly name: string;
      readonly projectId: string;
      readonly members: SourceFeature['members'][number][];
    }
  >();
  for (const item of members) {
    const existing = grouped.get(item.featureId);
    if (existing === undefined) {
      grouped.set(item.featureId, {
        id: item.featureId,
        name: item.featureName,
        projectId: projectIdFromFeatureId(item.featureId),
        members: [item.member],
      });
    } else existing.members.push(item.member);
  }
  return [...grouped.values()]
    .map(({ members: groupedMembers, ...feature }) => ({
      ...feature,
      members: [...groupedMembers].sort((left, right) =>
        compareText(left.semanticPath, right.semanticPath),
      ),
    }))
    .sort((left, right) => compareText(left.id, right.id));
}

/*** Preserve analyzer-level unavailable states instead of guessing feature support from source shape. */
function featureCapabilities(sourceGraph: SourceGraph): readonly SourceFeatureCapability[] {
  return sourceGraph.capabilities
    .map(({ analyzerId, projectId, available }) => ({
      analyzerId,
      projectId,
      state:
        analyzerId === 'typescript' &&
        available.includes('declarations') &&
        available.includes('documentation') &&
        available.includes('source-locations')
          ? ('available' as const)
          : ('unavailable' as const),
    }))
    .sort((left, right) =>
      compareText(`${left.projectId}:${left.analyzerId}`, `${right.projectId}:${right.analyzerId}`),
    );
}

/*** Reject spaces and prose so a feature identity remains portable and stable. */
function isFeatureName(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9._/-]*$/u.test(value);
}

/*** Recover the encoded project identity already embedded in the canonical feature semantic path. */
function projectIdFromFeatureId(id: string): string {
  return decodeURIComponent(id.split(':')[1] ?? '');
}

/*** Scope an analyzed file lookup without conflating equally named project files. */
function fileKey(projectId: string, filePath: string | undefined): string {
  return `${projectId}\u0000${filePath ?? ''}`;
}

/*** Keep diagnostic order reproducible across fresh and restored source snapshots. */
function compareDiagnostic(left: SourceFeatureDiagnostic, right: SourceFeatureDiagnostic): number {
  return compareText(
    `${left.semanticPath}:${left.message}`,
    `${right.semanticPath}:${right.message}`,
  );
}

/*** Compare portable identities without host locale effects. */
function compareText(left: string, right: string): number {
  if (left < right) return -1;
  return left > right ? 1 : 0;
}
