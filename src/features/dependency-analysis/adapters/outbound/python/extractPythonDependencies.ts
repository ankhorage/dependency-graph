export interface PythonDependencies {
  readonly imports: readonly string[];
}

/*** Extract Python import specifiers from import and from-import statements. */
export function extractPythonDependencies(content: string): PythonDependencies {
  const imports: string[] = [];
  const importRegex =
    /(?:^|\n)\s*(?:from\s+([\w.]+)\s+)?import\s+([\w\s,*]+?)(?:\s+as\s+\w+)?(?:\s|$|#)/gmu;

  for (const match of content.matchAll(importRegex)) {
    const [, fromModule, importedItems = ''] = match;
    if (fromModule !== undefined) {
      imports.push(fromModule);
      continue;
    }
    imports.push(
      ...importedItems
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    );
  }
  return { imports };
}
