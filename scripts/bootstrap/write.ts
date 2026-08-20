import type { Auth } from 'firebase-admin/auth';
import type { DocumentData, Firestore, WriteBatch } from 'firebase-admin/firestore';
import type { z } from 'zod';

export function setValidated<T extends DocumentData>(
  db: Firestore,
  batch: WriteBatch,
  path: string,
  schema: z.ZodType<T>,
  value: unknown,
): void {
  batch.set(db.doc(path), schema.parse(value));
}

export async function upsertAuthUser(
  auth: Auth,
  user: { uid: string; email: string; displayName: string },
): Promise<void> {
  try {
    await auth.getUser(user.uid);
    await auth.updateUser(user.uid, {
      ...user,
      password: 'password123',
      emailVerified: true,
      disabled: false,
    });
  } catch (error) {
    if (
      typeof error !== 'object' ||
      error === null ||
      !('code' in error) ||
      error.code !== 'auth/user-not-found'
    ) {
      throw error;
    }
    await auth.createUser({
      ...user,
      password: 'password123',
      emailVerified: true,
      disabled: false,
    });
  }
}
