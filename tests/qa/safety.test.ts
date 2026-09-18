import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Emulator-only guard.
 *
 * Every case runs in its own child process. `assertBootstrapSafety` reads
 * `process.argv` and four environment variables, so mutating them in-process
 * would leak between parallel Vitest workers and make one case's environment
 * decide another's result. A child process gives each case an environment it
 * fully owns, and it exercises the real `scripts/qa/seed.ts` entrypoint rather
 * than the guard in isolation.
 *
 * `--dry-run` stops the seeder after the guard and the offline build, so the
 * permitted case proves the guard let it through without needing an emulator.
 */

const SEED_ENTRYPOINT = path.resolve('scripts/qa/seed.ts');

const VALID_ENVIRONMENT: Readonly<Record<string, string>> = {
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  GCLOUD_PROJECT: 'stockmok',
};

interface ProbeResult {
  readonly status: number;
  readonly output: string;
}

function runSeed(
  environmentOverrides: Readonly<Record<string, string | undefined>>,
  args: readonly string[] = ['--target=emulator', '--dry-run'],
): ProbeResult {
  // Built by filtering rather than by mutating a copy: the child gets exactly
  // the variables this case declares, and nothing leaks in from the parent.
  const removed = new Set(
    Object.entries(environmentOverrides)
      .filter(([, value]) => value === undefined)
      .map(([key]) => key),
  );
  removed.add('GOOGLE_APPLICATION_CREDENTIALS');

  const environment: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && !removed.has(key)) environment[key] = value;
  }
  // Start from a known-good configuration, then apply the case's overrides.
  for (const [key, value] of Object.entries(VALID_ENVIRONMENT)) {
    if (!removed.has(key)) environment[key] = value;
  }
  for (const [key, value] of Object.entries(environmentOverrides)) {
    if (value !== undefined) environment[key] = value;
  }

  try {
    const output = execFileSync(process.execPath, ['--import', 'tsx', SEED_ENTRYPOINT, ...args], {
      env: environment,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { status: 0, output };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return {
      status: failure.status ?? 1,
      output: `${failure.stdout ?? ''}${failure.stderr ?? ''}`,
    };
  }
}

describe('QA seeder emulator-only guard', () => {
  it('permits a correctly configured emulator run', () => {
    const result = runSeed({});
    expect(result.output).toContain('QA_SEED_RESULT=DRY_RUN');
    expect(result.status).toBe(0);
  }, 60_000);

  it('rejects a run without --target=emulator', () => {
    const result = runSeed({}, ['--dry-run']);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('--target=emulator');
  }, 60_000);

  it('rejects a non-loopback Firestore host', () => {
    const result = runSeed({ FIRESTORE_EMULATOR_HOST: 'firestore.googleapis.com:443' });
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('FIRESTORE_EMULATOR_HOST');
  }, 60_000);

  it('rejects a non-loopback Auth host', () => {
    const result = runSeed({ FIREBASE_AUTH_EMULATOR_HOST: 'identitytoolkit.googleapis.com:443' });
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('FIREBASE_AUTH_EMULATOR_HOST');
  }, 60_000);

  it('rejects a missing emulator host', () => {
    const result = runSeed({ FIRESTORE_EMULATOR_HOST: undefined });
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('emulator host');
  }, 60_000);

  it('rejects the wrong project', () => {
    const result = runSeed({ GCLOUD_PROJECT: 'stockmok-production' });
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('stockmok');
  }, 60_000);

  it('rejects live service account credentials', () => {
    const result = runSeed({ GOOGLE_APPLICATION_CREDENTIALS: 'C:/keys/service-account.json' });
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('credentials');
  }, 60_000);

  it('refuses an argument mentioning production', () => {
    const result = runSeed({}, ['--target=emulator', '--dry-run', '--allow-production']);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('production');
  }, 60_000);
});
