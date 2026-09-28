import ts from 'typescript';

import type {
  SourceDeclarationFact,
  SourceDocumentation,
  SourceFileFacts,
  SourceImportFact,
  SourceLocation,
  SourceVisibility,
} from '../../../../../types/sourceGraph.js';

/*** Map TypeScript syntax into portable facts without exposing compiler ASTs to consumers. */
export function extractTypeScriptSourceFacts(filePath: string, content: string): SourceFileFacts {
  const source = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const imports = source.statements.flatMap<SourceImportFact>((statement) => {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      return [
        {
          specifier: statement.moduleSpecifier.text,
          location: location(statement, source),
          kind: 'import' as const,
          typeOnly: statement.importClause?.isTypeOnly ?? false,
        },
      ];
    }
    if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier !== undefined &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      return [
        {
          specifier: statement.moduleSpecifier.text,
          location: location(statement, source),
          kind: 'reexport' as const,
          typeOnly: statement.isTypeOnly,
        },
      ];
    }
    return [];
  });
  return {
    imports,
    declarations: source.statements.flatMap((statement) => declarations(statement, source)),
  };
}

/*** Extract supported declarations recursively while retaining declaration nesting. */
function declarations(node: ts.Node, source: ts.SourceFile): readonly SourceDeclarationFact[] {
  if (ts.isVariableStatement(node)) {
    const exported = modifierNames(node).includes('export');
    return node.declarationList.declarations.flatMap((declaration) =>
      declarations(declaration, source).map((fact) => ({ ...fact, exported })),
    );
  }
  const kind = declarationKind(node);
  if (kind === undefined) return [];
  const name = declarationName(node);
  if (name === '') return [];
  const modifiers = modifierNames(node);
  const children = childDeclarations(node, source);
  const heritage =
    ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)
      ? (node.heritageClauses ?? [])
      : [];
  const inherited = (token: ts.SyntaxKind) =>
    heritage
      .filter((clause) => clause.token === token)
      .flatMap((clause) => clause.types.map((type) => type.getText(source)));
  const signature = isCallable(node)
    ? node.getText(source).split('{', 1)[0]?.replace(/\s+/gu, ' ').trim()
    : undefined;
  return [
    {
      kind,
      name,
      visibility: visibility(modifiers),
      modifiers,
      location: location(node, source),
      extends: inherited(ts.SyntaxKind.ExtendsKeyword),
      implements: inherited(ts.SyntaxKind.ImplementsKeyword),
      children,
      exported: modifiers.includes('export'),
      typeOnly: kind === 'interface' || kind === 'type',
      ...(signature === undefined ? {} : { signature }),
      ...documentation(node, source),
    },
  ];
}

/*** Read direct members and variable bindings as child declarations. */
function childDeclarations(node: ts.Node, source: ts.SourceFile): readonly SourceDeclarationFact[] {
  if (
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isEnumDeclaration(node)
  ) {
    return node.members.flatMap((member) => declarations(member, source));
  }
  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations.flatMap((declaration) =>
      declarations(declaration, source),
    );
  }
  return [];
}

/*** Normalize supported syntax categories into the common source vocabulary. */
function declarationKind(node: ts.Node): SourceDeclarationFact['kind'] | undefined {
  if (ts.isClassDeclaration(node)) return 'class';
  if (ts.isInterfaceDeclaration(node)) return 'interface';
  if (ts.isEnumDeclaration(node)) return 'enum';
  if (ts.isTypeAliasDeclaration(node)) return 'type';
  if (ts.isFunctionDeclaration(node)) return 'function';
  if (ts.isMethodDeclaration(node) || ts.isMethodSignature(node)) return 'method';
  if (ts.isVariableDeclaration(node)) return 'variable';
  return undefined;
}

/*** Read the source name only when a declaration has a portable textual name. */
function declarationName(node: ts.Node): string {
  if ('name' in node && node.name !== undefined && ts.isIdentifier(node.name as ts.Node)) {
    return (node.name as ts.Identifier).text;
  }
  return '';
}

/*** Normalize explicit declaration modifiers. */
function modifierNames(node: ts.Node): readonly string[] {
  return ts.canHaveModifiers(node)
    ? (ts.getModifiers(node) ?? []).map((modifier) => modifier.getText().toLowerCase())
    : [];
}

/*** Preserve explicit TypeScript visibility, defaulting to language public scope. */
function visibility(modifiers: readonly string[]): SourceVisibility {
  if (modifiers.includes('private')) return 'private';
  if (modifiers.includes('protected')) return 'protected';
  return 'public';
}

/*** Report the exact one-based source span for a syntax node. */
function location(node: ts.Node, source: ts.SourceFile): SourceLocation {
  const start = source.getLineAndCharacterOfPosition(node.getStart(source));
  const end = source.getLineAndCharacterOfPosition(node.getEnd());
  return {
    line: start.line + 1,
    column: start.character + 1,
    endLine: end.line + 1,
    endColumn: end.character + 1,
  };
}

/*** Extract source description and structured JSDoc tags without interpreting their meaning. */
function documentation(
  node: ts.Node,
  source: ts.SourceFile,
): { readonly documentation?: SourceDocumentation } {
  const comments = ts.getJSDocCommentsAndTags(node).filter(ts.isJSDoc);
  const comment = comments.at(-1);
  if (comment === undefined) return {};
  const grouped = new Map<string, string[]>();
  for (const tag of comment.tags ?? []) {
    const value =
      typeof tag.comment === 'string'
        ? tag.comment
        : (tag.comment ?? []).map((part) => part.getText(source)).join('');
    grouped.set(tag.tagName.text, [...(grouped.get(tag.tagName.text) ?? []), value]);
  }
  const tags = Object.fromEntries(grouped);
  return {
    documentation: { text: typeof comment.comment === 'string' ? comment.comment : '', tags },
  };
}

/*** Restrict portable signatures to callable declarations. */
function isCallable(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isMethodSignature(node)
  );
}
