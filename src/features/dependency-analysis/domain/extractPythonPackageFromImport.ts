/*** Reduce a Python import specifier to its PKGViz-compatible package target. */
export function extractPythonPackageFromImport(specifier: string): string {
  if (specifier.startsWith('.')) return '';
  return specifier.split('.')[0] ?? specifier;
}
