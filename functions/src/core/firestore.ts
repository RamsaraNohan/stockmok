import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';

/**
 * Trusted server access to Firestore.
 *
 * The Admin SDK bypasses `firestore.rules` completely (DB-05 §7), so nothing in
 * this module is an authorization boundary. It exists so a single initialized
 * app is shared by every command, and so the emulator path never depends on a
 * production credential.
 */

const APP_NAME = 'stockmok-server';

/** Emulator host variables the Firebase tooling injects. Never set in production. */
export function isEmulated(): boolean {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}

function resolveProjectId(): string | undefined {
  return (
    process.env.GCLOUD_PROJECT ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.FIREBASE_PROJECT_ID ??
    undefined
  );
}

/**
 * The one Admin app. Idempotent: repeated calls return the same instance, so a
 * module imported by several commands cannot double-initialize.
 *
 * No credential is ever passed explicitly. Deployed functions use the runtime
 * service account; the emulator uses the host variables above. A committed
 * service-account key is therefore impossible by construction.
 */
export function getServerApp(): App {
  const existing = getApps().find((candidate) => candidate.name === APP_NAME);
  if (existing) return existing;
  const projectId = resolveProjectId();
  return initializeApp(projectId === undefined ? {} : { projectId }, APP_NAME);
}

let firestore: Firestore | undefined;

export function getDb(): Firestore {
  firestore ??= getFirestore(getServerApp());
  return firestore;
}

/** Test-only reset so a suite can rebind the app between emulator runs. */
export function resetServerFirestoreForTests(): void {
  firestore = undefined;
}

export { FieldValue, Timestamp };
export type { Firestore };
