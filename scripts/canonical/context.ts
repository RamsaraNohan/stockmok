import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * Seed safety — **fail closed, never guess.**
 *
 * DB-08 §5: the canonical seed targets the emulator. `seed:prod` is a separate,
 * interactively-confirmed script that does not exist yet, and nothing in this
 * module can reach a production project: every check below must pass, and each
 * one refuses rather than defaults.
 *
 * The checks are deliberately redundant. `--target=emulator` states intent; the
 * emulator host variables prove the SDK is actually pointed at a loopback
 * emulator rather than at Google's servers; the project id pins which emulator;
 * and the absence of service-account credentials means that even a
 * misconfigured host has nothing to authenticate with.
 */

export const PROJECT_ID = 'stockmok';
const APP_NAME = 'stockmok-canonical-seed';

function assertLoopback(hostAndPort: string, variable: string): void {
  const url = new URL(`http://${hostAndPort}`);
  if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(url.hostname)) {
    throw new Error(`${variable} must point to a loopback emulator, not ${url.hostname}`);
  }
}

export function assertSeedSafety(argv: readonly string[] = process.argv.slice(2)): void {
  if (!argv.includes('--target=emulator')) {
    throw new Error('The canonical seed requires --target=emulator and refuses to guess.');
  }
  if (argv.some((argument) => argument.includes('production'))) {
    throw new Error('The canonical seed refuses a production target, unconditionally.');
  }
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  if (!firestoreHost) {
    throw new Error('FIRESTORE_EMULATOR_HOST is required — start the emulators first.');
  }
  assertLoopback(firestoreHost, 'FIRESTORE_EMULATOR_HOST');

  const projectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT;
  if (projectId !== PROJECT_ID) {
    throw new Error(`The emulator project must be ${PROJECT_ID}, not ${projectId ?? '(unset)'}.`);
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('Live service-account credentials are forbidden during the canonical seed.');
  }
}

export interface SeedContext {
  readonly app: App;
  readonly db: Firestore;
  /** Present only when the Auth emulator is running; the seed works without it. */
  readonly auth: Auth | undefined;
}

export function getSeedContext(argv?: readonly string[]): SeedContext {
  assertSeedSafety(argv);
  const app =
    getApps().find((candidate) => candidate.name === APP_NAME) ??
    initializeApp({ projectId: PROJECT_ID }, APP_NAME);
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (authHost) assertLoopback(authHost, 'FIREBASE_AUTH_EMULATOR_HOST');
  return { app, db: getFirestore(app), auth: authHost ? getAuth(app) : undefined };
}
