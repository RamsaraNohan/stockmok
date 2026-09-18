import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import {
  createSharedRuntimeArchive,
  runNpm,
  sha256,
  SHARED_ARCHIVE_NAME,
  SHARED_VENDOR_PATH,
} from './functions-package-lib.js';

if (!process.argv.includes('--write')) {
  throw new Error('Refusing to replace the vendored package without the explicit --write flag.');
}

const output = await mkdtemp(join(tmpdir(), 'stockmok-functions-vendor-'));
try {
  const archive = await createSharedRuntimeArchive(output);
  await mkdir(dirname(SHARED_VENDOR_PATH), { recursive: true });
  await copyFile(archive, SHARED_VENDOR_PATH);

  const standalonePackage = join(output, 'standalone-functions');
  const standaloneVendor = join(standalonePackage, 'vendor');
  await mkdir(standaloneVendor, { recursive: true });
  await copyFile('functions/package.json', join(standalonePackage, 'package.json'));
  await copyFile(archive, join(standaloneVendor, SHARED_ARCHIVE_NAME));
  await runNpm(
    ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'],
    standalonePackage,
  );
  await copyFile(join(standalonePackage, 'package-lock.json'), 'functions/package-lock.json');

  console.log(`FUNCTIONS_SHARED_ARCHIVE=${SHARED_VENDOR_PATH}`);
  console.log(`FUNCTIONS_SHARED_SHA256=${await sha256(SHARED_VENDOR_PATH)}`);
  console.log('FUNCTIONS_STANDALONE_LOCK=functions/package-lock.json');
} finally {
  await rm(output, { recursive: true, force: true });
}
