import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

const env = import.meta.env as Record<string, string | undefined>;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'demo-stockmok-key',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'stockmok.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'stockmok',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'stockmok.appspot.com',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

const useEmulators = env.VITE_USE_EMULATORS === 'true';

if (useEmulators && typeof window !== 'undefined') {
  const globalAny = window as unknown as { _firebaseEmulatorsConnected?: boolean };
  if (!globalAny._firebaseEmulatorsConnected) {
    globalAny._firebaseEmulatorsConnected = true;
    try {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
    } catch {
      // Ignore reconnect errors in HMR
    }
  }
}
