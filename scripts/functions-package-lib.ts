import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export const EXPECTED_FUNCTION_EXPORT_NAMES = [
  'categoryArchive',
  'categoryRestore',
  'connectionDisable',
  'connectionRequest',
  'connectionRespond',
  'cpoCancel',
  'cpoDraftSave',
  'cpoReceive',
  'cpoRespond',
  'cpoShip',
  'cpoSubmit',
  'mappingCreate',
  'mappingDisable',
  'orgCreate',
  'orgUpdateSettings',
  'partnerCatalogList',
  'partnerCatalogLookupBySku',
  'partnerCatalogPublish',
  'partnerCatalogUnpublish',
  'partnerSetStatus',
  'poCancel',
  'poOrder',
  'poReceive',
  'productCreate',
  'productSetStatus',
  'productUpdate',
  'stockAdjust',
  'stockRecordOpeningBalance',
  'stockTransfer',
  'teamAcceptInvitation',
  'teamChangeMemberRole',
  'teamCreateInvitation',
  'teamRevokeInvitation',
  'teamSetMemberStatus',
  'userBootstrapProfile',
  'warehouseArchive',
  'warehouseRestore',
  'warehouseSetDefault',
] as const;
export const EXPECTED_FUNCTION_EXPORTS = EXPECTED_FUNCTION_EXPORT_NAMES.length;
export const SHARED_ARCHIVE_NAME = 'stockmok-shared-0.1.0.tgz';
export const SHARED_DEPENDENCY_SPEC = `file:vendor/${SHARED_ARCHIVE_NAME}`;
export const SHARED_VENDOR_PATH = resolve('functions', 'vendor', SHARED_ARCHIVE_NAME);

interface SharedPackageManifest {
  readonly name: string;
  readonly version: string;
  readonly type: string;
  readonly main: string;
  readonly types: string;
  readonly exports: unknown;
  readonly browser: unknown;
  readonly dependencies: Readonly<Record<string, string>>;
}

interface CommandResult {
  readonly stdout: string;
  readonly stderr: string;
}

export async function runCommand(
  command: string,
  arguments_: readonly string[],
  cwd: string,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<CommandResult> {
  return await new Promise((resolvePromise, reject) => {
    const child = spawn(command, arguments_, {
      cwd,
      env: environment,
      shell: false,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          `${command} ${arguments_.join(' ')} failed with exit ${String(code)}\n${stdout}\n${stderr}`,
        ),
      );
    });
  });
}

function npmInvocation(arguments_: readonly string[]): { command: string; arguments_: string[] } {
  const npmCli = process.env.npm_execpath;
  if (npmCli) return { command: process.execPath, arguments_: [npmCli, ...arguments_] };
  return {
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    arguments_: [...arguments_],
  };
}

export async function runNpm(arguments_: readonly string[], cwd: string): Promise<CommandResult> {
  const invocation = npmInvocation(arguments_);
  return await runCommand(invocation.command, invocation.arguments_, cwd);
}

export async function createSharedRuntimeArchive(outputDirectory: string): Promise<string> {
  const sourceManifest = JSON.parse(
    await readFile(resolve('packages', 'shared', 'package.json'), 'utf8'),
  ) as SharedPackageManifest;
  const sharedDist = resolve('packages', 'shared', 'dist');
  await readFile(join(sharedDist, 'index.js'));
  await readFile(join(sharedDist, 'server', 'paths.js'));

  const stagingRoot = await mkdtemp(join(tmpdir(), 'stockmok-shared-runtime-'));
  try {
    const stagingPackage = join(stagingRoot, 'package');
    await mkdir(stagingPackage, { recursive: true });
    await cp(sharedDist, join(stagingPackage, 'dist'), { recursive: true });

    const runtimeManifest = {
      name: sourceManifest.name,
      version: sourceManifest.version,
      private: true,
      type: sourceManifest.type,
      main: sourceManifest.main,
      types: sourceManifest.types,
      exports: sourceManifest.exports,
      browser: sourceManifest.browser,
      dependencies: sourceManifest.dependencies,
    };
    await writeFile(
      join(stagingPackage, 'package.json'),
      `${JSON.stringify(runtimeManifest, null, 2)}\n`,
      'utf8',
    );

    await mkdir(outputDirectory, { recursive: true });
    await runNpm(
      ['pack', stagingPackage, '--pack-destination', outputDirectory, '--ignore-scripts', '--json'],
      process.cwd(),
    );
    const archive = join(outputDirectory, SHARED_ARCHIVE_NAME);
    await readFile(archive);
    return archive;
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}

export async function sha256(path: string): Promise<string> {
  const contents = await readFile(path);
  return createHash('sha256').update(contents).digest('hex');
}

export function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap((entry) => collectStrings(entry));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, entry]) => [key, ...collectStrings(entry)]);
  }
  return [];
}
