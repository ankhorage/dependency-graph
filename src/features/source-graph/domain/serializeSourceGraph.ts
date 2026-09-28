import { isRecord } from '@ankhorage/utility/object';

import type { SourceGraph } from '../../../types/sourceGraph.js';

interface PackedSourceGraph {
  readonly version: 1;
  readonly strings: readonly string[];
  readonly data: unknown;
}

/*** Intern repeated source strings while retaining a lossless JSON interchange format. */
export function serializeSourceGraph(sourceGraph: SourceGraph): string {
  const strings: string[] = [];
  const ids = new Map<string, number>();
  const data = transform(sourceGraph, (value) => {
    let id = ids.get(value);
    if (id === undefined) {
      id = strings.length;
      strings.push(value);
      ids.set(value, id);
    }
    return `#${id}`;
  });
  return JSON.stringify({ version: 1, strings, data } satisfies PackedSourceGraph);
}

/*** Restore the complete factual graph before constructing any derived index. */
export function deserializeSourceGraph(serialized: string): SourceGraph {
  const packed: unknown = JSON.parse(serialized);
  if (!isPackedSourceGraph(packed)) throw new Error('Invalid source graph serialization.');
  const data = transform(packed.data, (value) => {
    if (!/^#\d+$/u.test(value)) throw new Error('Invalid source graph string reference.');
    const restored = packed.strings[Number(value.slice(1))];
    if (restored === undefined) throw new Error('Unknown source graph string reference.');
    return restored;
  });
  if (!isSourceGraph(data)) throw new Error('Invalid source graph payload.');
  return data;
}

/*** Traverse plain JSON values and intern repeated keys as well as string values. */
function transform(value: unknown, mapString: (value: string) => string): unknown {
  if (typeof value === 'string') return mapString(value);
  if (Array.isArray(value)) return value.map((item) => transform(item, mapString));
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [mapString(key), transform(item, mapString)]),
    );
  }
  return value;
}

/*** Validate the envelope before decoding dictionary references. */
function isPackedSourceGraph(value: unknown): value is PackedSourceGraph {
  if (!isRecord(value)) return false;
  const { version, strings } = value;
  return (
    version === 1 && Array.isArray(strings) && strings.every((item) => typeof item === 'string')
  );
}

/*** Check the portable graph envelope after restoration. */
function isSourceGraph(value: unknown): value is SourceGraph {
  if (!isRecord(value)) return false;
  const { version, graph, capabilities } = value;
  if (!isRecord(graph)) return false;
  return (
    version === 1 &&
    Array.isArray(capabilities) &&
    Array.isArray(graph.nodes) &&
    Array.isArray(graph.edges)
  );
}
