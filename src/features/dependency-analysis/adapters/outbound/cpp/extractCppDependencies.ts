export interface CppInclude {
  readonly specifier: string;
  readonly local: boolean;
}

export interface CppDependencies {
  readonly namespace: string;
  readonly includes: readonly CppInclude[];
}

/*** Extract C++ namespace and include directives from source text. */
export function extractCppDependencies(content: string): CppDependencies {
  const namespace =
    /namespace\s+([a-zA-Z0-9_:]+)\s*\{/u.exec(content)?.[1]?.replace(/::/gu, '.') ?? '';
  const includes = Array.from(content.matchAll(/#include\s+(["<])([^">]+)[">]/gu)).map((match) => ({
    local: match[1] === '"',
    specifier: match[2] ?? '',
  }));
  return { namespace, includes: includes.filter(({ specifier }) => specifier !== '') };
}
