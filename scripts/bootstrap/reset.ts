import { pathToFileURL } from 'node:url';
import { assertBootstrapSafety, emulatorUrl, PROJECT_ID } from './context.js';

async function deleteEmulatorState(url: string, label: string): Promise<void> {
  const response = await fetch(url, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(`${label} reset failed: ${String(response.status)} ${await response.text()}`);
  }
}

export async function resetEmulator(): Promise<void> {
  assertBootstrapSafety();
  await deleteEmulatorState(
    emulatorUrl(
      'FIRESTORE_EMULATOR_HOST',
      `/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    ),
    'Firestore emulator',
  );
  await deleteEmulatorState(
    emulatorUrl('FIREBASE_AUTH_EMULATOR_HOST', `/emulator/v1/projects/${PROJECT_ID}/accounts`),
    'Auth emulator',
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await resetEmulator();
  console.log('EMULATOR_RESET=PASS');
}
