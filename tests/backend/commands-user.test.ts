import type { Firestore } from 'firebase-admin/firestore';
import { beforeAll, describe, expect, it } from 'vitest';
import { paths } from '../../packages/shared/src/paths.js';
import { userBootstrapProfile } from '../../functions/src/commands/user.js';
import { clearFirestore, OPERATION_ID_A, OPERATION_ID_B, testDb } from './harness.js';

/**
 * C-03 `user.bootstrapProfile` — SELF, no membership involved.
 *
 * `commandReceipts/{orgId}/{operationId}` is keyed by orgId+operationId, not
 * by actor — every call below shares `orgId: 'no-org'`, so each distinct
 * intent needs its own operationId or it collides with an earlier receipt.
 */
const OPERATION_ID_C = '99999999-8888-4777-8666-555544443333';
const OPERATION_ID_D = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

let db: Firestore;

beforeAll(async () => {
  db = testDb();
  await clearFirestore();
});

describe('C-03 user.bootstrapProfile', () => {
  it('creates the user document on first call', async () => {
    const result = await userBootstrapProfile.execute(
      {
        auth: { uid: 'user-1', token: { email: 'User1@Stockmok.test', email_verified: true } },
        data: { orgId: 'no-org', operationId: OPERATION_ID_A, payload: { displayName: 'Nohan' } },
      },
      db,
    );
    expect(result.ok).toBe(true);
    const user = await db.doc(paths.user('user-1')).get();
    expect(user.exists).toBe(true);
    expect(user.get('displayName')).toBe('Nohan');
    expect(user.get('email')).toBe('user1@stockmok.test');
    expect(user.get('status')).toBe('ACTIVE');
    expect(user.get('createdAt')).toBeDefined();
  });

  it('updates displayName/photoUrl on a later call without touching createdAt or email', async () => {
    const before = await db.doc(paths.user('user-1')).get();
    const result = await userBootstrapProfile.execute(
      {
        auth: { uid: 'user-1', token: { email: 'user1@stockmok.test', email_verified: true } },
        data: {
          orgId: 'no-org',
          operationId: OPERATION_ID_B,
          payload: { displayName: 'Nohan Renamed', photoUrl: 'https://example.com/a.png' },
        },
      },
      db,
    );
    expect(result.ok).toBe(true);
    const after = await db.doc(paths.user('user-1')).get();
    expect(after.get('displayName')).toBe('Nohan Renamed');
    expect(after.get('photoUrl')).toBe('https://example.com/a.png');
    expect(after.get('createdAt')).toEqual(before.get('createdAt'));
    expect(after.get('email')).toBe('user1@stockmok.test');
  });

  it('rejects an unauthenticated call', async () => {
    const result = await userBootstrapProfile.execute(
      { data: { orgId: 'no-org', operationId: OPERATION_ID_C, payload: { displayName: 'X' } } },
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('unauthenticated');
  });

  it('a caller can only ever bootstrap their own uid — SELF, structurally', async () => {
    const result = await userBootstrapProfile.execute(
      {
        auth: { uid: 'user-2', token: { email: 'user2@stockmok.test', email_verified: true } },
        data: {
          orgId: 'no-org',
          operationId: OPERATION_ID_D,
          payload: { displayName: 'User Two' },
        },
      },
      db,
    );
    expect(result.ok).toBe(true);
    const user1 = await db.doc(paths.user('user-1')).get();
    expect(user1.get('displayName')).toBe('Nohan Renamed');
    const user2 = await db.doc(paths.user('user-2')).get();
    expect(user2.get('displayName')).toBe('User Two');
  });
});
