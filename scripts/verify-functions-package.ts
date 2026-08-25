import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  collectStrings,
  createSharedRuntimeArchive,
  EXPECTED_FUNCTION_EXPORT_NAMES,
  EXPECTED_FUNCTION_EXPORTS,
  sha256,
  SHARED_DEPENDENCY_SPEC,
  SHARED_VENDOR_PATH,
} from './functions-package-lib.js';

interface FunctionsManifest {
  readonly main?: string;
  readonly dependencies?: Readonly<Record<string, string>>;
}

interface FirebaseConfiguration {
  readonly functions?: { readonly source?: string; readonly runtime?: string };
}

interface LockPackage {
  readonly resolved?: string;
  readonly link?: boolean;
  readonly dependencies?: Readonly<Record<string, string>>;
}

interface PackageLock {
  readonly packages?: Readonly<Record<string, LockPackage>>;
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? await listFiles(path) : [path];
      }),
    )
  ).flat();
}

const firebase = JSON.parse(await readFile('firebase.json', 'utf8')) as FirebaseConfiguration;
if (firebase.functions?.source !== 'functions' || firebase.functions.runtime !== 'nodejs22') {
  throw new Error('Firebase Functions deployment source must remain functions/ on Node 22.');
}

const manifest = JSON.parse(
  await readFile(resolve('functions', 'package.json'), 'utf8'),
) as FunctionsManifest;
if (manifest.main !== 'lib/index.js') {
  throw new Error(`Unexpected Functions entrypoint: ${String(manifest.main)}`);
}
const internalDependencies = Object.entries(manifest.dependencies ?? {}).filter(([name]) =>
  name.startsWith('@stockmok/'),
);
if (
  internalDependencies.length !== 1 ||
  internalDependencies[0]?.[0] !== '@stockmok/shared' ||
  internalDependencies[0]?.[1] !== SHARED_DEPENDENCY_SPEC
) {
  throw new Error(
    `Internal Functions dependencies are not self-contained: ${JSON.stringify(internalDependencies)}`,
  );
}

const lock = JSON.parse(
  await readFile(resolve('functions', 'package-lock.json'), 'utf8'),
) as PackageLock;
const lockRoot = lock.packages?.[''];
const lockShared = lock.packages?.['node_modules/@stockmok/shared'];
if (lockRoot?.dependencies?.['@stockmok/shared'] !== SHARED_DEPENDENCY_SPEC) {
  throw new Error('Functions lockfile root does not pin the vendored shared archive.');
}
if (lockShared?.resolved !== SHARED_DEPENDENCY_SPEC || lockShared.link === true) {
  throw new Error('Functions lockfile resolves @stockmok/shared outside the vendored archive.');
}
const leakedReferences = collectStrings(lock).filter(
  (value) =>
    value.startsWith('workspace:') ||
    value.includes('../packages/') ||
    value.includes('..\\packages\\'),
);
if (leakedReferences.length > 0) {
  throw new Error(
    `Workspace-only references leaked into Functions lockfile: ${leakedReferences.join(', ')}`,
  );
}

const comparisonDirectory = await mkdtemp(join(tmpdir(), 'stockmok-functions-verify-'));
try {
  const expectedArchive = await createSharedRuntimeArchive(comparisonDirectory);
  const expectedHash = await sha256(expectedArchive);
  const vendoredHash = await sha256(SHARED_VENDOR_PATH);
  if (vendoredHash !== expectedHash) {
    throw new Error(
      `Vendored shared archive is stale: expected ${expectedHash}, found ${vendoredHash}. ` +
        'Run npm run package:functions-shared and regenerate functions/package-lock.json.',
    );
  }

  const source = await readFile(resolve('functions', 'src', 'index.ts'), 'utf8');
  const sourceExports = [...source.matchAll(/^export const (\w+) = toCallable\(/gm)].map(
    (match) => match[1],
  );
  const compiled = await readFile(resolve('functions', 'lib', 'index.js'), 'utf8');
  const compiledExports = [...compiled.matchAll(/^export const (\w+) = toCallable\(/gm)].map(
    (match) => match[1],
  );
  const expectedExportSet = [...EXPECTED_FUNCTION_EXPORT_NAMES].sort().join('\n');
  if (
    sourceExports.length !== EXPECTED_FUNCTION_EXPORTS ||
    compiledExports.length !== EXPECTED_FUNCTION_EXPORTS ||
    [...sourceExports].sort().join('\n') !== expectedExportSet ||
    [...compiledExports].sort().join('\n') !== expectedExportSet
  ) {
    throw new Error(
      `Functions export drift: source=${String(sourceExports.length)}, compiled=${String(compiledExports.length)}`,
    );
  }

  const compiledFiles = (await listFiles(resolve('functions', 'lib'))).filter((path) =>
    path.endsWith('.js'),
  );
  let retainedSharedImports = 0;
  for (const file of compiledFiles) {
    const contents = await readFile(file, 'utf8');
    retainedSharedImports +=
      contents.match(/from ['"]@stockmok\/shared(?:\/[^'"]*)?['"]/g)?.length ?? 0;
  }
  if (retainedSharedImports === 0) {
    throw new Error('Expected compiled Functions to retain runtime @stockmok/shared imports.');
  }

  console.log('FUNCTIONS_DEPLOY_SOURCE=functions');
  console.log('DEPLOY_SOURCE_SELF_CONTAINED=YES');
  console.log('PUBLIC_NPM_REQUIRED_FOR_STOCKMOK_SHARED=NO');
  console.log('PARENT_WORKSPACE_REQUIRED=NO');
  console.log('WORKSPACE_ONLY_REFERENCES=NONE');
  console.log(`COMPILED_SHARED_IMPORTS=${String(retainedSharedImports)}`);
  console.log(`FUNCTION_EXPORT_COUNT=${String(compiledExports.length)}`);
  console.log(`FUNCTIONS_SHARED_SHA256=${vendoredHash}`);
  console.log('FUNCTIONS_PACKAGE_VERIFICATION=PASS');
} finally {
  await rm(comparisonDirectory, { recursive: true, force: true });
}
