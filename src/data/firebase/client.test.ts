import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const firebaseMocks = vi.hoisted(() => ({
  app: { marker: 'app' },
  auth: { marker: 'auth' },
  db: { marker: 'firestore' },
  functions: { marker: 'functions' },
  connectAuthEmulator: vi.fn(),
  connectFirestoreEmulator: vi.fn(),
  connectFunctionsEmulator: vi.fn(),
  getApp: vi.fn(),
  getApps: vi.fn(),
  getAuth: vi.fn(),
  getFirestore: vi.fn(),
  getFunctions: vi.fn(),
  initializeApp: vi.fn(),
}));

vi.mock('firebase/app', () => ({
  getApp: firebaseMocks.getApp,
  getApps: firebaseMocks.getApps,
  initializeApp: firebaseMocks.initializeApp,
}));

vi.mock('firebase/auth', () => ({
  connectAuthEmulator: firebaseMocks.connectAuthEmulator,
  getAuth: firebaseMocks.getAuth,
}));

vi.mock('firebase/firestore', () => ({
  connectFirestoreEmulator: firebaseMocks.connectFirestoreEmulator,
  getFirestore: firebaseMocks.getFirestore,
}));

vi.mock('firebase/functions', () => ({
  connectFunctionsEmulator: firebaseMocks.connectFunctionsEmulator,
  getFunctions: firebaseMocks.getFunctions,
}));

async function loadClient(dev: boolean, useEmulators: 'true' | 'false') {
  vi.stubEnv('DEV', dev);
  vi.stubEnv('VITE_USE_EMULATORS', useEmulators);
  vi.stubGlobal('window', {});
  return import('./client');
}

describe('Firebase client emulator bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();

    firebaseMocks.getApps.mockReturnValue([]);
    firebaseMocks.initializeApp.mockReturnValue(firebaseMocks.app);
    firebaseMocks.getApp.mockReturnValue(firebaseMocks.app);
    firebaseMocks.getAuth.mockReturnValue(firebaseMocks.auth);
    firebaseMocks.getFirestore.mockReturnValue(firebaseMocks.db);
    firebaseMocks.getFunctions.mockReturnValue(firebaseMocks.functions);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('connects Auth, Firestore, and Functions to the governed local emulators', async () => {
    await loadClient(true, 'true');

    expect(firebaseMocks.connectAuthEmulator).toHaveBeenCalledWith(
      firebaseMocks.auth,
      'http://127.0.0.1:9099',
      { disableWarnings: true },
    );
    expect(firebaseMocks.connectFirestoreEmulator).toHaveBeenCalledWith(
      firebaseMocks.db,
      '127.0.0.1',
      8080,
    );
    expect(firebaseMocks.connectFunctionsEmulator).toHaveBeenCalledWith(
      firebaseMocks.functions,
      '127.0.0.1',
      5001,
    );
  });

  it('does not connect emulator services when emulator mode is disabled', async () => {
    await loadClient(true, 'false');

    expect(firebaseMocks.connectAuthEmulator).not.toHaveBeenCalled();
    expect(firebaseMocks.connectFirestoreEmulator).not.toHaveBeenCalled();
    expect(firebaseMocks.connectFunctionsEmulator).not.toHaveBeenCalled();
  });

  it('does not connect emulator services in production even if the flag is enabled', async () => {
    await loadClient(false, 'true');

    expect(firebaseMocks.connectAuthEmulator).not.toHaveBeenCalled();
    expect(firebaseMocks.connectFirestoreEmulator).not.toHaveBeenCalled();
    expect(firebaseMocks.connectFunctionsEmulator).not.toHaveBeenCalled();
  });

  it('connects only once when the client module is re-evaluated during HMR', async () => {
    await loadClient(true, 'true');
    vi.resetModules();
    await import('./client');

    expect(firebaseMocks.connectAuthEmulator).toHaveBeenCalledTimes(1);
    expect(firebaseMocks.connectFirestoreEmulator).toHaveBeenCalledTimes(1);
    expect(firebaseMocks.connectFunctionsEmulator).toHaveBeenCalledTimes(1);
  });
});
