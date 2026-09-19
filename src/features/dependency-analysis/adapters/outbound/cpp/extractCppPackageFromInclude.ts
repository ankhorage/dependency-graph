/*** Reduce a C++ include path to PKGViz-compatible package notation. */
export function extractCppPackageFromInclude(specifier: string): string {
  const withoutExtension = specifier.replace(/\.(h|hpp|hxx)$/u, '');
  const segments = withoutExtension.split('/');
  if (segments.length <= 1) return '';
  return segments.slice(0, -1).join('.');
}
