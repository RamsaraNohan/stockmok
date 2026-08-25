import type { User as SharedUser, UserMembership } from '@stockmok/shared';
import { createReadClient } from '@stockmok/data';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

import { auth, db } from '../firebase/client';

export interface AuthUser {
  readonly uid: string;
  readonly email: string | null;
  readonly displayName: string | null;
}

export type AuthStateChangeHandler = (user: AuthUser | null) => void;

function mapFirebaseUser(user: FirebaseUser | null): AuthUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  };
}

export function subscribeToAuthState(callback: AuthStateChangeHandler): () => void {
  return onAuthStateChanged(auth, (fbUser) => {
    callback(mapFirebaseUser(fbUser));
  });
}

export async function loginWithEmail(email: string, pass: string): Promise<AuthUser> {
  const credential = await signInWithEmailAndPassword(auth, email, pass);
  const mapped = mapFirebaseUser(credential.user);
  if (!mapped) throw new Error('User mapping failed after login.');
  return mapped;
}

export async function registerWithEmail(email: string, pass: string): Promise<AuthUser> {
  const credential = await createUserWithEmailAndPassword(auth, email, pass);
  const mapped = mapFirebaseUser(credential.user);
  if (!mapped) throw new Error('User mapping failed after registration.');
  return mapped;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// Q-002: Fetch current user self document users/{uid}
export async function fetchUserSelfDoc(uid: string): Promise<SharedUser | null> {
  const client = createReadClient(db, { uid });
  return await client.get<SharedUser>('Q-002');
}

// Safe direct write: Update self user document fields (displayName, photoUrl)
export async function updateUserSelfProfile(
  uid: string,
  fields: { readonly displayName?: string; readonly photoUrl?: string },
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, fields);
}

// Q-003: Fetch ACTIVE user memberships from users/{uid}/memberships
export async function fetchUserMemberships(uid: string): Promise<readonly UserMembership[]> {
  const client = createReadClient(db, { uid });
  const result = await client.list<UserMembership>('Q-003');
  return result.items;
}

// Q-003, forced to the server: for callers where "zero memberships" must be
// an authoritative fact (the post-login onboarding-vs-workspace decision),
// not a possibly-premature empty read from cache.
export async function fetchUserMembershipsFromServer(
  uid: string,
): Promise<readonly UserMembership[]> {
  const client = createReadClient(db, { uid });
  return client.listFromServer<UserMembership>('Q-003');
}
