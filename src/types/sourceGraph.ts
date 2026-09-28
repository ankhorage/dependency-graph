/*** A portable one-based source span emitted by a language analyzer. */
export interface SourceLocation {
  readonly column: number;
  readonly endColumn: number;
  readonly endLine: number;
  readonly line: number;
}

/*** Analyzer-observed source documentation, distinct from consumer interpretation. */
export interface SourceDocumentation {
  readonly text: string;
  readonly tags: Readonly<Record<string, readonly string[]>>;
}

type SourceDeclarationKind =
  'class' | 'constant' | 'enum' | 'function' | 'interface' | 'method' | 'type' | 'variable';

export type SourceVisibility = 'package' | 'private' | 'protected' | 'public';

/*** A source declaration before graph-wide identity and relationship resolution. */
export interface SourceDeclarationFact {
  readonly children: readonly SourceDeclarationFact[];
  readonly documentation?: SourceDocumentation;
  readonly extends: readonly string[];
  readonly implements: readonly string[];
  readonly kind: SourceDeclarationKind;
  readonly location: SourceLocation;
  readonly modifiers: readonly string[];
  readonly name: string;
  readonly signature?: string;
  readonly visibility: SourceVisibility;
}

/*** An import observed at an exact source position. */
export interface SourceImportFact {
  readonly location: SourceLocation;
  readonly specifier: string;
}

/*** Portable facts extracted from one source file by its language analyzer. */
export interface SourceFileFacts {
  readonly declarations: readonly SourceDeclarationFact[];
  readonly imports: readonly SourceImportFact[];
  readonly packageName?: string;
}
