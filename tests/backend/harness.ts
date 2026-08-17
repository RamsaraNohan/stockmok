import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { paths } from '../../packages/shared/src/paths.js';
import type { Role } from '../../packages/shared/src/primitives.js';
import type { TrustedMembership } from '../../functions/src/guards/membership.js';

/**
 * The trusted-backend test harness.
 *
 * These tests run the **Admin SDK** against the Firestore emulator, which is the
 * point: the Admin SDK bypasses `firestore.rules` entirely, so what they prove
 * is that the guards in `functions/src/guards/**` and the frame in
 * `defineCommand()` deny on their own.
 */

export const PROJECT_ID = 'stockmok';
export const ORG_A = 'org-grand-ocean';
export const ORG_B = 'org-fresh-foods';

const APP_NAME = 'stockmok-backend-tests';

export function assertEmulator(): void {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host) {
    throw new Error('FIRESTORE_EMULATOR_HOST is required — run these tests through emulators:exec');
  }
  const hostname = new URL(`http://${host}`).hostname;
  if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(hostname)) {
    throw new Error('FIRESTORE_EMULATOR_HOST must point to a loopback emulator');
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('Live service-account credentials are forbidden in the B1 test run');
  }
}

export function testDb(): Firestore {
  assertEmulator();
  const app =
    getApps().find((candidate) => candidate.name === APP_NAME) ??
    initializeApp({ projectId: PROJECT_ID }, APP_NAME);
  return getFirestore(app);
}

export async function clearFirestore(): Promise<void> {
  assertEmulator();
  const response = await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST ?? ''}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  if (!response.ok) {
    throw new Error(`Failed to clear the Firestore emulator: ${String(response.status)}`);
  }
}

export function uidFor(orgId: string, role: Role): string {
  return `${orgId}--${role.toLowerCase()}`;
}

export interface SeedMemberOptions {
  readonly status?: 'ACTIVE' | 'SUSPENDED' | 'REMOVED';
  readonly displayName?: string;
}

export async function seedOrganization(db: Firestore, orgId: string): Promise<void> {
  await db.doc(paths.organization(orgId)).set({
    organizationId: orgId,
    name: orgId,
    handle: orgId,
    status: 'ACTIVE',
    ownerUid: uidFor(orgId, 'OWNER'),
    schemaVersion: 1,
  });
}

export async function seedMember(
  db: Firestore,
  orgId: string,
  role: Role,
  options: SeedMemberOptions = {},
): Promise<string> {
  const uid = uidFor(orgId, role);
  await db.doc(paths.member(orgId, uid)).set({
    uid,
    role,
    status: options.status ?? 'ACTIVE',
    displayName: options.displayName ?? `${role} of ${orgId}`,
    email: `${uid}@stockmok.test`,
  });
  return uid;
}

export function membershipOf(orgId: string, role: Role): TrustedMembership {
  return {
    orgId,
    uid: uidFor(orgId, role),
    role,
    status: 'ACTIVE',
    displayName: `${role} of ${orgId}`,
    email: `${uidFor(orgId, role)}@stockmok.test`,
  };
}

export function callable(uid: string, data: unknown): { auth: { uid: string }; data: unknown } {
  return { auth: { uid }, data };
}

export const OPERATION_ID_A = '11111111-2222-4333-8444-555555555555';
export const OPERATION_ID_B = '66666666-7777-4888-8999-aaaaaaaaaaaa';
