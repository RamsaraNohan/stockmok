import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { commandContracts, commandDefinitions } from '../packages/shared/src/commands.js';
import { ACTIVE_QUERY_IDS } from '../packages/shared/src/query-ids.js';
import { converters } from '../packages/shared/src/converters.js';

describe('frozen public registries and package boundary', () => {
  it('exports the exact catalog sizes with no duplicate ids', () => {
    expect(ACTIVE_QUERY_IDS).toHaveLength(92);
    expect(new Set(ACTIVE_QUERY_IDS).size).toBe(92);
    expect(Object.keys(commandDefinitions)).toHaveLength(38);
    expect(Object.keys(commandContracts)).toEqual(Object.keys(commandDefinitions));
    expect(Object.keys(converters)).toHaveLength(30);
  });

  it('reserves canonical seed and replay script names', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts.seed).toBeUndefined();
    expect(packageJson.scripts.replay).toBeUndefined();
    expect(packageJson.scripts['seed:bootstrap']).toBeDefined();
    expect(packageJson.scripts['replay:bootstrap']).toBeDefined();
    expect(packageJson.scripts['reset:emulator']).toBeDefined();
    expect(packageJson.scripts['reseed:bootstrap']).toBeDefined();
  });

  it('denies the Zone-4 server path entry under browser resolution', () => {
    const compilerOptions: ts.CompilerOptions = {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      customConditions: ['browser'],
    };
    const resolved = ts.resolveModuleName(
      '@stockmok/shared/server/paths',
      `${process.cwd()}/client-entry.ts`,
      compilerOptions,
      ts.sys,
    ).resolvedModule;
    expect(resolved).toBeUndefined();
    const sharedPackage = JSON.parse(readFileSync('packages/shared/package.json', 'utf8')) as {
      browser: Record<string, boolean>;
    };
    expect(sharedPackage.browser['./dist/server/paths.js']).toBe(false);
  });
});
