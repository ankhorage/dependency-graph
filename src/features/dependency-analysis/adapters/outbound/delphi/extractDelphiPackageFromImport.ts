/*** Reduce a Delphi unit import to its PKGViz-compatible package target. */
export function extractDelphiPackageFromImport(specifier: string): string {
  const trimmed = specifier.trim();
  return trimmed.split('.')[0] ?? trimmed;
}
