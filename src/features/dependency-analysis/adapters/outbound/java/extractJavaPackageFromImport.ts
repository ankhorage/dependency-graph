/*** Reduce a Java import specifier to its package path using PKGViz-compatible semantics. */
export function extractJavaPackageFromImport(specifier: string): string {
  const cleaned = specifier.replace(/\.\*$/u, '');
  const segments = cleaned.split('.').reverse();
  if (segments.length < 2) return cleaned;
  const firstPackageIndex = segments.findIndex((segment) => !/^[A-Z]/u.test(segment));
  if (firstPackageIndex < 0) return cleaned;
  return segments.slice(firstPackageIndex).reverse().join('.');
}
