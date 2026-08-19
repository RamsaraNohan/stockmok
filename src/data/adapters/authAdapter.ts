import type { User as SharedUser, UserMembership } from '@stockmok/shared';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';

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
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return snap.data() as SharedUser;
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
  const membershipsRef = collection(db, 'users', uid, 'memberships');
  const q = query(membershipsRef, where('status', '==', 'ACTIVE'));
  const snap = await getDocs(q);
  const results: UserMembership[] = [];
  snap.forEach((docSnap) => {
    results.push(docSnap.data() as UserMembership);
  });
  return results;
}
