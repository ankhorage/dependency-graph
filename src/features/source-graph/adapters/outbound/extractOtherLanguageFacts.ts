import type { SourceFileFacts } from '../../../../types/sourceGraph.js';
import { extractCppDependencies } from '../../../dependency-analysis/adapters/outbound/cpp/extractCppDependencies.js';
import { delphiPackageForFile } from '../../../dependency-analysis/adapters/outbound/delphi/delphiPackageForFile.js';
import { extractDelphiDependencies } from '../../../dependency-analysis/adapters/outbound/delphi/extractDelphiDependencies.js';
import { extractKotlinDependencies } from '../../../dependency-analysis/adapters/outbound/kotlin/extractKotlinDependencies.js';
import { extractPythonDependencies } from '../../../dependency-analysis/adapters/outbound/python/extractPythonDependencies.js';
import { pythonPackageForFile } from '../../../dependency-analysis/adapters/outbound/python/pythonPackageForFile.js';

/*** Map existing import-only analyzers into the canonical factual vocabulary. */
export function extractOtherLanguageFacts(
  analyzerId: 'cpp' | 'delphi' | 'kotlin' | 'python',
  content: string,
  file: string,
  packageRoot: string,
  sourceRoots: readonly string[],
): SourceFileFacts {
  if (analyzerId === 'kotlin') {
    const { packageName, imports } = extractKotlinDependencies(content);
    return { packageName, imports: imports.map((specifier) => ({ specifier })), declarations: [] };
  }
  if (analyzerId === 'python') {
    const { imports } = extractPythonDependencies(content);
    return {
      packageName: pythonPackageForFile(packageRoot, sourceRoots, file),
      imports: imports.map((specifier) => ({ specifier })),
      declarations: [],
    };
  }
  if (analyzerId === 'cpp') {
    const { namespace, includes } = extractCppDependencies(content);
    return {
      packageName: namespace,
      imports: includes.map(({ specifier, local }) => ({ specifier, local })),
      declarations: [],
    };
  }
  const { imports, unitName } = extractDelphiDependencies(content);
  return {
    packageName: delphiPackageForFile(packageRoot, sourceRoots, file, unitName),
    imports: imports.map((specifier) => ({ specifier })),
    declarations: [],
  };
}
