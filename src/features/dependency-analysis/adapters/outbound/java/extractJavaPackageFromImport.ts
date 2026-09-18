/*** Reduce a Java import specifier to its package path using PKGViz-compatible semantics. */
export function extractJavaPackageFromImport(specifier: string): string {
  const cleaned = specifier.replace(/\\.\\*$/u, '');
  const segments = cleaned.split('.').reverse();
  if (segments.length < 2) return cleaned;
  const first = segments[0] ?? '';
  if (first.toLowerCase() === first) return cleaned;

  const packageSegments = segments.filter((segment, index) => {
    const prior = segments.slice(0, index);
    return prior.every((candidate) => /^[A-Z]/u.test(candidate));
  });
  return packageSegments.reverse().join('.');
}
