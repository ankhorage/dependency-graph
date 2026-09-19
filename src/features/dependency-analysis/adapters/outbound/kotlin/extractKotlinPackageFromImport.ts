/*** Reduce a Kotlin import specifier to its package path using PKGViz-compatible semantics. */
export function extractKotlinPackageFromImport(specifier: string): string {
  const cleaned = specifier.replace(/\.\*$/u, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) return cleaned;
  return parts.slice(0, -1).join('.');
}
