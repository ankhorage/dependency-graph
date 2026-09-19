export interface KotlinDependencies {
  readonly packageName: string;
  readonly imports: readonly string[];
}

/*** Extract a Kotlin package declaration and import specifiers from source text. */
export function extractKotlinDependencies(content: string): KotlinDependencies {
  const packageName = /^\s*package\s+([\w.]+)/mu.exec(content)?.[1] ?? '';
  const imports = Array.from(content.matchAll(/^\s*import\s+([\w.]+(?:\.\*)?)/gmu)).map(
    (match) => match[1] ?? '',
  );
  return { packageName, imports: imports.filter((value) => value !== '') };
}
