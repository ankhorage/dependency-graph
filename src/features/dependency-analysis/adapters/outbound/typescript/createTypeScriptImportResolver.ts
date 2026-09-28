import path from 'node:path';

import ts from 'typescript';

import type { SourceFileFacts } from '../../../../../types/sourceGraph.js';

/*** Resolve TypeScript imports with the package's own compiler configuration. */
export function createTypeScriptImportResolver(projectRoot: string) {
  const configByPackageRoot = new Map<string, string | undefined>();
  const optionsByConfig = new Map<string, ts.CompilerOptions>();

  return (sourcePath: string, packageRoot: string, facts: SourceFileFacts): SourceFileFacts => {
    const configPath = configByPackageRoot.has(packageRoot)
      ? configByPackageRoot.get(packageRoot)
      : ts.findConfigFile(
          packageRoot,
          (candidate) => ts.sys.fileExists(candidate),
          'tsconfig.json',
        );
    configByPackageRoot.set(packageRoot, configPath);
    if (configPath === undefined || !isInside(projectRoot, configPath)) return facts;
    const options = optionsByConfig.get(configPath) ?? readOptions(configPath);
    optionsByConfig.set(configPath, options);

    return {
      ...facts,
      imports: facts.imports.map((item) => {
        const resolved = ts.resolveModuleName(item.specifier, sourcePath, options, ts.sys)
          .resolvedModule?.resolvedFileName;
        if (resolved === undefined || !isInside(projectRoot, resolved)) return item;
        return {
          ...item,
          resolvedPath: path.relative(projectRoot, resolved).split(path.sep).join('/'),
        };
      }),
    };
  };
}

/*** Parse compiler options once per configuration, including extends and path aliases. */
function readOptions(configPath: string): ts.CompilerOptions {
  const config = ts.readConfigFile(configPath, (candidate) => ts.sys.readFile(candidate));
  if (config.error !== undefined) {
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  }
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
  return parsed.options;
}

/*** Keep resolved targets inside the inspected project rather than following host files. */
function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
