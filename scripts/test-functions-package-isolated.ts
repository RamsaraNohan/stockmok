import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

import {
  EXPECTED_FUNCTION_EXPORT_NAMES,
  EXPECTED_FUNCTION_EXPORTS,
  runCommand,
  runNpm,
} from './functions-package-lib.js';

const sourceDirectory = resolve('functions');
const isolatedParent = await mkdtemp(join(tmpdir(), 'stockmok-functions-isolated-'));
const isolatedSource = join(isolatedParent, 'functions');

try {
  await cp(sourceDirectory, isolatedSource, {
    recursive: true,
    filter: (source) => !['node_modules', '.git'].includes(basename(source)),
  });
  await writeFile(
    join(isolatedSource, '.npmrc'),
    [
      '@stockmok:registry=http://127.0.0.1:9',
      'registry=https://registry.npmjs.org/',
      'audit=false',
      'fund=false',
      'update-notifier=false',
      '',
    ].join('\n'),
    'utf8',
  );

  const install = await runNpm(
    ['ci', '--omit=dev', '--workspaces=false', '--no-audit', '--no-fund', '--loglevel=http'],
    isolatedSource,
  );
  const installLog = `${install.stdout}\n${install.stderr}`;
  const scopedRegistryLookups = installLog.match(/127\.0\.0\.1:9|@stockmok%2f/gi)?.length ?? 0;
  if (scopedRegistryLookups !== 0) {
    throw new Error(`Unexpected @stockmok registry lookup count: ${String(scopedRegistryLookups)}`);
  }

  const loadScript = [
    "const loaded = await import('./lib/index.js');",
    'console.log(JSON.stringify(Object.keys(loaded).sort()));',
  ].join(' ');
  const loaded = await runCommand(
    process.execPath,
    ['--input-type=module', '-e', loadScript],
    isolatedSource,
    { ...process.env, NODE_PATH: '' },
  );
  const exportNames = JSON.parse(loaded.stdout.trim()) as string[];
  if (
    exportNames.length !== EXPECTED_FUNCTION_EXPORTS ||
    exportNames.join('\n') !== [...EXPECTED_FUNCTION_EXPORT_NAMES].sort().join('\n')
  ) {
    throw new Error(
      `Isolated Functions entrypoint exported ${String(exportNames.length)} callables.`,
    );
  }

  console.log(`ISOLATED_ARTIFACT_PARENT=${isolatedParent}`);
  console.log('ISOLATED_FUNCTIONS_INSTALL=PASS');
  console.log('STOCKMOK_SHARED_NETWORK_LOOKUP=0');
  console.log('SHARED_RESOLUTION=LOCAL_SELF_CONTAINED');
  console.log(`ISOLATED_FUNCTION_EXPORTS=${String(exportNames.length)}`);
  console.log('FUNCTION_ENTRYPOINT_LOAD=PASS');
} finally {
  await rm(isolatedParent, { recursive: true, force: true });
}
