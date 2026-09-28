import { expect, test } from 'bun:test';

import { extractJavaSourceFacts } from './extractJavaSourceFacts.js';

const source = [
  'package com.example.app;',
  'import com.example.port.Reader;',
  'import java.util.List;',
  '/** Service description. @since 1 */',
  'public final class Service extends BaseService implements Reader {',
  '  /** Executes the service.',
  '   * @param input source value',
  '   * @return result',
  '   */',
  '  public String execute(String input) { return input; }',
  '}',
  'interface LocalReader extends Reader {',
  '  String read();',
  '}',
].join('\n');

test('extracts portable Java declarations, relations, imports, and Javadoc', () => {
  const facts = extractJavaSourceFacts(source);

  expect(facts.packageName).toBe('com.example.app');
  expect(facts.imports.map(({ specifier }) => specifier)).toEqual([
    'com.example.port.Reader',
    'java.util.List',
  ]);
  expect(facts.imports[0]?.location?.line).toBe(2);
  expect(facts.declarations[0]).toMatchObject({
    kind: 'class',
    name: 'Service',
    visibility: 'public',
    modifiers: ['public', 'final'],
    extends: ['BaseService'],
    implements: ['Reader'],
    location: { line: 5 },
  });
  expect(facts.declarations[0]?.documentation?.text).toContain('Service description.');
  expect(facts.declarations[0]?.children[0]).toMatchObject({
    kind: 'method',
    name: 'execute',
    visibility: 'public',
    signature: 'String execute(String input)',
    location: { line: 10 },
  });
  expect(facts.declarations[0]?.children[0]?.documentation?.tags).toEqual({
    param: ['input source value'],
    return: ['result'],
  });
  expect(facts.declarations[1]).toMatchObject({
    kind: 'interface',
    name: 'LocalReader',
    visibility: 'package',
    extends: ['Reader'],
  });
  expect(facts.declarations[1]?.children[0]).toMatchObject({
    kind: 'method',
    name: 'read',
    visibility: 'public',
  });
});
