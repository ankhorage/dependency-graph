import ts from 'typescript';

/*** Extract static import module specifiers from TypeScript source text. */
export function extractTypeScriptImports(
  filePath: string,
  content: string,
): readonly string[] {
  const source = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  return source.statements.flatMap((statement) =>
    ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)
      ? [statement.moduleSpecifier.text]
      : [],
  );
}
