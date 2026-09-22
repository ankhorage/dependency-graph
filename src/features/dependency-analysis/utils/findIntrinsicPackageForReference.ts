/*** Resolve the longest source-declared package that contains one dotted import reference. */
export function findIntrinsicPackageForReference(
  reference: string,
  intrinsicPackages: ReadonlySet<string>,
): string | undefined {
  return [...intrinsicPackages]
    .filter((packageName) => reference === packageName || reference.startsWith(`${packageName}.`))
    .sort((left, right) => right.length - left.length)
    .at(0);
}
