import type { CstElement, CstNode, IToken } from 'java-parser';
import { parse } from 'java-parser';

import type {
  SourceDeclarationFact,
  SourceDocumentation,
  SourceFileFacts,
  SourceImportFact,
  SourceLocation,
  SourceVisibility,
} from '../../../../../types/sourceGraph.js';

/*** Extract portable source facts from a parser-validated Java compilation unit. */
export function extractJavaSourceFacts(source: string): SourceFileFacts {
  const root = parse(source);
  const unit = firstChild(root, 'ordinaryCompilationUnit');
  if (unit === undefined) return { imports: [], declarations: [] };

  const comments = root.comments ?? [];
  const packageName = tokens(firstChild(unit, 'packageDeclaration'), 'Identifier')
    .map(({ image }) => image)
    .join('.');
  const imports = children(unit, 'importDeclaration').map((node) => extractImport(node, source));
  const declarations = children(unit, 'typeDeclaration').flatMap((node) =>
    extractTypeDeclaration(node, source, comments),
  );

  return {
    imports,
    declarations,
    ...(packageName === '' ? {} : { packageName }),
  };
}

/*** Keep an import's exact specifier and source location. */
function extractImport(node: CstNode, source: string): SourceImportFact {
  const text = sourceText(node, source);
  const specifier = /^import\s+(?:static\s+)?([^;\s]+)\s*;/u.exec(text)?.[1] ?? '';
  return { specifier, location: sourceLocation(node) };
}

/*** Map Java class and interface declarations into a common declaration vocabulary. */
function extractTypeDeclaration(
  node: CstNode,
  source: string,
  comments: readonly IToken[],
): readonly SourceDeclarationFact[] {
  const classNode = firstChild(node, 'classDeclaration');
  if (classNode !== undefined) return extractClassDeclaration(node, classNode, source, comments);

  const interfaceNode = firstChild(node, 'interfaceDeclaration');
  if (interfaceNode === undefined) return [];
  return extractInterfaceDeclaration(node, interfaceNode, source, comments);
}

/*** Extract a Java class and its implemented or extended boundaries. */
function extractClassDeclaration(
  node: CstNode,
  classNode: CstNode,
  source: string,
  comments: readonly IToken[],
): readonly SourceDeclarationFact[] {
  const declaration = firstChild(classNode, 'normalClassDeclaration');
  if (declaration === undefined) return [];
  const modifiers = extractModifiers(children(classNode, 'classModifier'));
  return [
    {
      kind: 'class',
      name: identifier(firstChild(declaration, 'typeIdentifier')),
      visibility: visibility(modifiers),
      modifiers,
      exported: modifiers.includes('public'),
      location: sourceLocation(node),
      extends: children(firstChild(declaration, 'classExtends'), 'classType').map((type) =>
        sourceText(type, source),
      ),
      implements: children(
        firstChild(firstChild(declaration, 'classImplements'), 'interfaceTypeList'),
        'interfaceType',
      ).map((type) => sourceText(type, source)),
      children: extractMembers(firstChild(declaration, 'classBody'), source, comments),
      ...documentation(node, source, comments),
    },
  ];
}

/*** Extract a Java interface and its inherited interfaces. */
function extractInterfaceDeclaration(
  node: CstNode,
  interfaceNode: CstNode,
  source: string,
  comments: readonly IToken[],
): readonly SourceDeclarationFact[] {
  const declaration = firstChild(interfaceNode, 'normalInterfaceDeclaration');
  if (declaration === undefined) return [];
  const modifiers = extractModifiers(children(interfaceNode, 'interfaceModifier'));
  return [
    {
      kind: 'interface',
      name: identifier(firstChild(declaration, 'typeIdentifier')),
      visibility: visibility(modifiers),
      modifiers,
      exported: modifiers.includes('public'),
      location: sourceLocation(node),
      extends: children(
        firstChild(firstChild(declaration, 'interfaceExtends'), 'interfaceTypeList'),
        'interfaceType',
      ).map((type) => sourceText(type, source)),
      implements: [],
      children: extractMembers(firstChild(declaration, 'interfaceBody'), source, comments),
      ...documentation(node, source, comments),
    },
  ];
}

/*** Extract methods and nested types from a Java type body. */
function extractMembers(
  body: CstNode | undefined,
  source: string,
  comments: readonly IToken[],
): readonly SourceDeclarationFact[] {
  const entries = [
    ...children(body, 'classBodyDeclaration'),
    ...children(body, 'interfaceMemberDeclaration'),
  ];
  return entries.flatMap((entry) => {
    const member = firstChild(entry, 'classMemberDeclaration') ?? entry;
    const classMethod = firstChild(member, 'methodDeclaration');
    if (classMethod !== undefined) return extractMethod(classMethod, source, comments, 'package');
    const interfaceMethod = firstChild(member, 'interfaceMethodDeclaration');
    if (interfaceMethod !== undefined) {
      return extractMethod(interfaceMethod, source, comments, 'public');
    }
    return extractTypeDeclaration(member, source, comments);
  });
}

/*** Preserve one Java method's signature, modifiers, location, and documentation. */
function extractMethod(
  node: CstNode,
  source: string,
  comments: readonly IToken[],
  defaultVisibility: SourceVisibility,
): readonly SourceDeclarationFact[] {
  const header = firstChild(node, 'methodHeader');
  if (header === undefined) return [];
  const declarator = firstChild(header, 'methodDeclarator');
  const modifiers = extractModifiers(children(node, 'methodModifier'));
  return [
    {
      kind: 'method',
      name: tokens(declarator, 'Identifier')[0]?.image ?? '',
      signature: sourceText(header, source).replace(/\s+/gu, ' ').trim(),
      visibility: visibility(modifiers, defaultVisibility),
      modifiers,
      exported: visibility(modifiers, defaultVisibility) === 'public',
      location: sourceLocation(node),
      extends: [],
      implements: [],
      children: [],
      ...documentation(node, source, comments),
    },
  ];
}

/*** Attach the nearest immediately preceding Javadoc comment without inferring meaning. */
function documentation(
  node: CstNode,
  source: string,
  comments: readonly IToken[],
): { readonly documentation?: SourceDocumentation } {
  const start = node.location.startOffset;
  const preceding = comments.filter(
    (comment) =>
      comment.image.startsWith('/**') &&
      comment.endOffset < start &&
      source.slice(comment.endOffset + 1, start).trim() === '',
  );
  const comment = preceding.at(-1);
  if (comment === undefined) return {};
  const lines = comment.image
    .replace(/^\/\*\*/u, '')
    .replace(/\*\/$/u, '')
    .split(/\r?\n/u)
    .map((line) => line.replace(/^\s*\*\s?/u, '').trim());
  const tagLines = lines.filter((line) => line.startsWith('@'));
  const tags = Object.fromEntries(
    [...new Set(tagLines.map((line) => /^@([^\s]+)/u.exec(line)?.[1] ?? ''))]
      .filter((name) => name !== '')
      .map((name) => [
        name,
        tagLines
          .filter((line) => line.startsWith(`@${name} `) || line === `@${name}`)
          .map((line) => line.slice(name.length + 1).trim()),
      ]),
  );
  return {
    documentation: {
      text: lines
        .filter((line) => !line.startsWith('@'))
        .join('\n')
        .trim(),
      tags,
    },
  };
}

/*** Convert a parser span into portable one-based coordinates. */
function sourceLocation(node: CstNode): SourceLocation {
  return {
    line: node.location.startLine,
    column: node.location.startColumn,
    endLine: node.location.endLine,
    endColumn: node.location.endColumn,
  };
}

/*** Read exact source text for a parser node. */
function sourceText(node: CstNode, source: string): string {
  return source.slice(node.location.startOffset, node.location.endOffset + 1);
}

/*** Read one identifier token from a declaration node. */
function identifier(node: CstNode | undefined): string {
  return tokens(node, 'Identifier')[0]?.image ?? '';
}

/*** Collect source-level modifiers while leaving annotations as source evidence. */
function extractModifiers(nodes: readonly CstNode[]): readonly string[] {
  return nodes.flatMap((node) =>
    Object.keys(node.children)
      .filter((key) => key !== 'annotation')
      .map((key) => key.toLowerCase()),
  );
}

/*** Resolve declaration visibility without treating package-private as public. */
function visibility(
  modifiers: readonly string[],
  fallback: SourceVisibility = 'package',
): SourceVisibility {
  if (modifiers.includes('public')) return 'public';
  if (modifiers.includes('protected')) return 'protected';
  if (modifiers.includes('private')) return 'private';
  return fallback;
}

/*** Return parser children with the requested grammar role. */
function children(node: CstNode | undefined, key: string): readonly CstNode[] {
  return elements(node, key).filter(
    (item): item is Exclude<CstElement, IToken> => 'children' in item,
  );
}

/*** Return the first parser child with the requested grammar role. */
function firstChild(node: CstNode | undefined, key: string): CstNode | undefined {
  return children(node, key)[0];
}

/*** Return lexical tokens with the requested grammar role. */
function tokens(node: CstNode | undefined, key: string): readonly IToken[] {
  return elements(node, key).filter((item): item is IToken => 'image' in item);
}

/*** Resolve a grammar role without trusting arbitrary keys as object properties. */
function elements(node: CstNode | undefined, key: string): readonly CstElement[] {
  return Object.entries(node?.children ?? {}).find(([name]) => name === key)?.[1] ?? [];
}
