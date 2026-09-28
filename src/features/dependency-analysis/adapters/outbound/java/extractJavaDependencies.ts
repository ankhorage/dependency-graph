export interface JavaDependencies {
  readonly packageName: string;
  readonly imports: readonly string[];
}

/*** Extract a Java package declaration and static import specifiers from source text. */
export function extractJavaDependencies(content: string): JavaDependencies {
  const facts = extractJavaSourceFacts(content);
  return {
    packageName: facts.packageName ?? '',
    imports: facts.imports.map(({ specifier }) => specifier),
  };
}
import { extractJavaSourceFacts } from './extractJavaSourceFacts.js';
