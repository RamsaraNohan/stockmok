import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { paths } from '../../packages/shared/src/paths.js';
import {
  asUnauthenticated,
  asUser,
  closeTestEnvironment,
  getTestEnvironment,
  HANDLE_A,
  IDS,
  NON_MEMBER_UID,
  ORG_A,
  seedFixtures,
  uidFor,
} from './harness.js';

/** DB-05 §2 and §3 — zone 1 (public) and zone 2 (user-private). */

let env: RulesTestEnvironment;

const OWNER_A = uidFor(ORG_A, 'OWNER');

function db(uid?: string): Firestore {
  const context = uid === undefined ? asUnauthenticated(env) : asUser(env, uid);
  return context.firestore() as unknown as Firestore;
}

beforeAll(async () => {
  env = await getTestEnvironment();
  await seedFixtures(env);
});

afterAll(async () => {
  await closeTestEnvironment();
});

describe('zone 1 — organizationDirectory', () => {
  it('T-SEC-20 · allows an unauthenticated exact-handle get', async () => {
    await assertSucceeds(getDoc(doc(db(), paths.organizationDirectory(HANDLE_A))));
  });

  it('T-SEC-20 · denies list to every principal, which is the anti-enumeration control', async () => {
    for (const caller of [undefined, NON_MEMBER_UID, OWNER_A]) {
      await assertFails(getDocs(collection(db(caller), 'organizationDirectory')));
    }
  });

  it('denies every client write, including the Owner', async () => {
    await assertFails(
      setDoc(doc(db(OWNER_A), paths.organizationDirectory('invented-handle')), { name: 'x' }),
    );
    await assertFails(
      updateDoc(doc(db(OWNER_A), paths.organizationDirectory(HANDLE_A)), { name: 'x' }),
    );
    await assertFails(deleteDoc(doc(db(OWNER_A), paths.organizationDirectory(HANDLE_A))));
  });
});

describe('zone 1 — storefrontCatalog is declared and inert (Release C)', () => {
  it('denies read and write for every principal', async () => {
    const path = 'storefrontCatalog/grand-ocean/items/item-1';
    await assertFails(getDoc(doc(db(), path)));
    await assertFails(getDoc(doc(db(OWNER_A), path)));
    await assertFails(setDoc(doc(db(OWNER_A), path), { name: 'x' }));
  });
});

describe('zone 2 — users/{uid}', () => {
  it('allows self get and denies every other principal', async () => {
    await assertSucceeds(getDoc(doc(db(OWNER_A), paths.user(OWNER_A))));
    await assertFails(getDoc(doc(db(NON_MEMBER_UID), paths.user(OWNER_A))));
    await assertFails(getDoc(doc(db(), paths.user(OWNER_A))));
  });

  it('denies list on the users collection', async () => {
    await assertFails(getDocs(collection(db(OWNER_A), 'users')));
  });

  it('allows self update of displayName, photoUrl and lastSeenAt only', async () => {
    await assertSucceeds(
      updateDoc(doc(db(OWNER_A), paths.user(OWNER_A)), { displayName: 'Nohan Fernando' }),
    );
    await assertSucceeds(
      updateDoc(doc(db(OWNER_A), paths.user(OWNER_A)), { lastSeenAt: new Date() }),
    );
  });

  it('denies a self update of the backend-written email and status fields', async () => {
    await assertFails(
      updateDoc(doc(db(OWNER_A), paths.user(OWNER_A)), { email: 'attacker@stockmok.test' }),
    );
    await assertFails(updateDoc(doc(db(OWNER_A), paths.user(OWNER_A)), { status: 'DISABLED' }));
  });

  it('allows a self create carrying only the client-writable keys', async () => {
    const fresh = 'brand-new-user';
    await assertSucceeds(
      setDoc(doc(db(fresh), paths.user(fresh)), {
        uid: fresh,
        displayName: 'Brand New',
        createdAt: new Date(),
      }),
    );
  });

  it('denies a self create that forges email or status', async () => {
    const forger = 'forging-user';
    await assertFails(
      setDoc(doc(db(forger), paths.user(forger)), {
        uid: forger,
        displayName: 'Forger',
        createdAt: new Date(),
        status: 'ACTIVE',
        email: 'forger@stockmok.test',
      }),
    );
  });

  it('denies client delete', async () => {
    await assertFails(deleteDoc(doc(db(OWNER_A), paths.user(OWNER_A))));
  });
});

describe('zone 2 — memberships mirror', () => {
  it('allows self read and denies another user', async () => {
    await assertSucceeds(getDoc(doc(db(OWNER_A), paths.membership(OWNER_A, ORG_A))));
    await assertFails(getDoc(doc(db(NON_MEMBER_UID), paths.membership(OWNER_A, ORG_A))));
  });

  it('denies every client write — the mirror is written with its Membership (INV-20)', async () => {
    await assertFails(
      setDoc(doc(db(OWNER_A), paths.membership(OWNER_A, ORG_A)), { role: 'OWNER' }),
    );
    await assertFails(
      updateDoc(doc(db(OWNER_A), paths.membership(OWNER_A, ORG_A)), { role: 'ADMIN' }),
    );
    await assertFails(deleteDoc(doc(db(OWNER_A), paths.membership(OWNER_A, ORG_A))));
  });

  it('T-SEC-39 · bounds the membership list at 100', async () => {
    const memberships = collection(db(OWNER_A), `${paths.user(OWNER_A)}/memberships`);
    await assertSucceeds(getDocs(query(memberships, limit(100))));
    await assertSucceeds(getDocs(query(memberships, limit(25))));
    await assertFails(getDocs(query(memberships, limit(101))));
    await assertFails(getDocs(memberships));
  });
});

describe('zone 2 — notifications', () => {
  const notification = paths.notification(OWNER_A, IDS.notification);

  it('allows self read and denies another user', async () => {
    await assertSucceeds(getDoc(doc(db(OWNER_A), notification)));
    await assertFails(getDoc(doc(db(NON_MEMBER_UID), notification)));
  });

  it('T-SEC-23 · allows the recipient to flip `read` and nothing else', async () => {
    await assertSucceeds(updateDoc(doc(db(OWNER_A), notification), { read: true }));
    await assertFails(updateDoc(doc(db(OWNER_A), notification), { title: 'Rewritten' }));
    await assertFails(
      updateDoc(doc(db(OWNER_A), notification), { read: false, message: 'Rewritten' }),
    );
  });

  it('denies self create — a user cannot fabricate their own notification', async () => {
    await assertFails(
      setDoc(doc(db(OWNER_A), paths.notification(OWNER_A, 'forged')), {
        organizationId: ORG_A,
        type: 'LOW_STOCK',
        read: false,
      }),
    );
  });

  it('denies self delete', async () => {
    await assertFails(deleteDoc(doc(db(OWNER_A), notification)));
  });

  it('leaves the notification list unbounded, because Q-005 aggregates it', async () => {
    await assertSucceeds(getDocs(collection(db(OWNER_A), `${paths.user(OWNER_A)}/notifications`)));
  });
});
