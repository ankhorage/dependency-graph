export interface DelphiDependencies {
  readonly unitName: string;
  readonly imports: readonly string[];
}

/*** Extract a Delphi unit declaration and uses-clause dependencies. */
export function extractDelphiDependencies(content: string): DelphiDependencies {
  const unitName = /\bunit\s+([A-Za-z_][A-Za-z0-9_.]*)\s*;/iu.exec(content)?.[1] ?? '';
  const imports = Array.from(content.matchAll(/\buses\s+([\s\S]*?);/giu)).flatMap((match) => {
    const clause = match[1] ?? '';
    return clause
      .split(',')
      .map((unit) => unit.replace(/\s+in\s+['"].*?['"]/giu, '').trim())
      .filter(Boolean);
  });
  return { unitName, imports };
}
