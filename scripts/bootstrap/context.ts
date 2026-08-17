import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const PROJECT_ID = 'stockmok';

function assertLoopback(hostAndPort: string, variable: string): void {
  const url = new URL(`http://${hostAndPort}`);
  if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(url.hostname)) {
    throw new Error(`${variable} must point to a loopback emulator`);
  }
}

export function assertBootstrapSafety(argv = process.argv.slice(2)): void {
  if (!argv.includes('--target=emulator') || argv.some((arg) => arg.includes('production'))) {
    throw new Error('Bootstrap scripts require --target=emulator and refuse production');
  }
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!firestoreHost || !authHost) {
    throw new Error('Both Firestore and Auth emulator host variables are required');
  }
  assertLoopback(firestoreHost, 'FIRESTORE_EMULATOR_HOST');
  assertLoopback(authHost, 'FIREBASE_AUTH_EMULATOR_HOST');
  const projectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT;
  if (projectId !== PROJECT_ID) throw new Error(`Emulator project must be ${PROJECT_ID}`);
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('Live service-account credentials are forbidden during C1 bootstrap');
  }
}

export interface BootstrapContext {
  readonly app: App;
  readonly db: ReturnType<typeof getFirestore>;
  readonly auth: ReturnType<typeof getAuth>;
}

export function getBootstrapContext(): BootstrapContext {
  assertBootstrapSafety();
  const app =
    getApps().find((candidate) => candidate.name === 'stockmok-bootstrap') ??
    initializeApp({ projectId: PROJECT_ID }, 'stockmok-bootstrap');
  return { app, db: getFirestore(app), auth: getAuth(app) };
}

export function emulatorUrl(environmentName: string, path: string): string {
  const host = process.env[environmentName];
  if (!host) throw new Error(`${environmentName} is required`);
  assertLoopback(host, environmentName);
  return `http://${host}${path}`;
}
