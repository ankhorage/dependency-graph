export interface JavaDependencies {
  readonly packageName: string;
  readonly imports: readonly string[];
}

/*** Extract a Java package declaration and static import specifiers from source text. */
export function extractJavaDependencies(content: string): JavaDependencies {
  const packageName = /^package\s+([a-zA-Z0-9_.]+);/mu.exec(content)?.[1] ?? '';
  const imports = Array.from(content.matchAll(/^import\s+(?:static\s+)?([a-zA-Z0-9_.*]+);/gmu)).map(
    (match) => match[1] ?? '',
  );
  return { packageName, imports: imports.filter((value) => value !== '') };
}
