/*** Encode semantic identity components without ambiguity from punctuation in source names. */
export function sourceSemanticPath(...parts: readonly string[]): string {
  return parts.map(encodeURIComponent).join(':');
}
