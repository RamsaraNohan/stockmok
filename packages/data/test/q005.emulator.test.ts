import { NotificationSchema } from '@stockmok/shared';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  deleteApp as deleteAdminApp,
  initializeApp as initializeAdminApp,
} from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Timestamp } from 'firebase-admin/firestore';
import { type Firestore, type Unsubscribe } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { formatUnreadBadge } from '../src/client.js';
import { createStockmokRepositories } from '../src/repositories.js';

const PROJECT_ID = 'stockmok';
const UID = 'q005-user-a';
const OTHER_UID = 'q005-user-b';
const adminApp = initializeAdminApp({ projectId: PROJECT_ID }, 'c2-q005-emulator-admin');
const adminDb = getAdminFirestore(adminApp);

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
if (!emulatorHost) throw new Error('FIRESTORE_EMULATOR_HOST is required');
const [host, portText] = emulatorHost.split(':');
if (!host || !portText) throw new Error('FIRESTORE_EMULATOR_HOST must be host:port');

let rulesEnvironment: RulesTestEnvironment;
let repositories: ReturnType<typeof createStockmokRepositories>;

function notification(index: number, read = false) {
  return NotificationSchema.parse({
    organizationId: 'q005-org',
    organizationName: 'Q005 Organization',
    type: 'LOW_STOCK',
    category: 'STOCK',
    title: `Unread ${String(index)}`,
    message: `Unread notification ${String(index)}`,
    referenceType: 'PRODUCT',
    referenceId: `product-${String(index)}`,
    read,
    createdAt: Timestamp.fromMillis(1_700_000_000_000 + index),
  });
}

async function replaceUnread(uid: string, count: number): Promise<void> {
  const collection = adminDb.collection(`users/${uid}/notifications`);
  const existing = await collection.get();
  if (!existing.empty) {
    const deletion = adminDb.batch();
    for (const current of existing.docs) deletion.delete(current.ref);
    await deletion.commit();
  }
  if (count === 0) return;
  const insertion = adminDb.batch();
  for (let index = 0; index < count; index += 1) {
    insertion.set(
      collection.doc(`notification-${String(index).padStart(3, '0')}`),
      notification(index),
    );
  }
  await insertion.commit();
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

beforeAll(async () => {
  rulesEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host, port: Number.parseInt(portText, 10) },
  });
  const clientDb = rulesEnvironment
    .authenticatedContext(UID, { email: `${UID}@stockmok.test` })
    .firestore() as unknown as Firestore;
  repositories = createStockmokRepositories(clientDb, { uid: UID });
});

async function readBadgeOnce(): Promise<{ readonly count: number; readonly capped: boolean }> {
  return new Promise((resolve, reject) => {
    const state: { unsubscribe?: Unsubscribe } = {};
    const timeout = setTimeout(() => {
      state.unsubscribe?.();
      reject(new Error('Timed out waiting for the Q-005 realtime badge'));
    }, 5_000);
    state.unsubscribe = repositories.notifications.subscribeUnreadBadge(
      (value) => {
        clearTimeout(timeout);
        state.unsubscribe?.();
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        state.unsubscribe?.();
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

beforeEach(async () => {
  await replaceUnread(UID, 0);
  await replaceUnread(OTHER_UID, 0);
});

afterAll(async () => {
  await rulesEnvironment.cleanup();
  await deleteAdminApp(adminApp);
});

describe('Q-005 owner-ruling transports', () => {
  it.each([
    { actual: 0, badgeCount: 0, capped: false, display: '0' },
    { actual: 1, badgeCount: 1, capped: false, display: '1' },
    { actual: 49, badgeCount: 49, capped: false, display: '49' },
    { actual: 50, badgeCount: 50, capped: true, display: '50+' },
    { actual: 57, badgeCount: 50, capped: true, display: '50+' },
  ])(
    'keeps exact=$actual distinct from the bounded realtime badge',
    async ({ actual, badgeCount, capped, display }) => {
      await replaceUnread(UID, actual);
      await expect(repositories.notifications.getUnreadCount()).resolves.toEqual({
        count: actual,
        capped: false,
      });
      const badge = await readBadgeOnce();
      expect(badge).toEqual({ count: badgeCount, capped });
      expect(badge.count).toBeLessThanOrEqual(50);
      expect(formatUnreadBadge(badge)).toBe(display);
    },
  );

  it('updates when an unread notification is added and then marked read', async () => {
    await replaceUnread(UID, 1);
    let sawTwo = false;
    let resolveInitial: (() => void) | undefined;
    let resolveAdded: (() => void) | undefined;
    let resolveRead: (() => void) | undefined;
    const initial = new Promise<void>((resolve) => {
      resolveInitial = resolve;
    });
    const added = new Promise<void>((resolve) => {
      resolveAdded = resolve;
    });
    const markedRead = new Promise<void>((resolve) => {
      resolveRead = resolve;
    });
    const events: { readonly count: number; readonly capped: boolean }[] = [];
    const unsubscribe = repositories.notifications.subscribeUnreadBadge((value) => {
      events.push(value);
      if (events.length === 1) resolveInitial?.();
      if (value.count === 2) {
        sawTwo = true;
        resolveAdded?.();
      }
      if (sawTwo && value.count === 1) resolveRead?.();
    });

    await initial;
    const addedReference = adminDb.doc(`users/${UID}/notifications/notification-new`);
    await addedReference.set(notification(100));
    await added;
    await addedReference.update({ read: true });
    await markedRead;
    unsubscribe();

    expect(events).toContainEqual({ count: 2, capped: false });
    expect(events.at(-1)).toEqual({ count: 1, capped: false });
  });

  it('binds both transports to the constructed uid', async () => {
    await replaceUnread(UID, 1);
    await replaceUnread(OTHER_UID, 57);
    await expect(repositories.notifications.getUnreadCount()).resolves.toEqual({
      count: 1,
      capped: false,
    });
    await expect(readBadgeOnce()).resolves.toEqual({ count: 1, capped: false });

    const events: { readonly count: number; readonly capped: boolean }[] = [];
    let resolveInitial: (() => void) | undefined;
    const initial = new Promise<void>((resolve) => {
      resolveInitial = resolve;
    });
    const unsubscribe = repositories.notifications.subscribeUnreadBadge((value) => {
      events.push(value);
      if (events.length === 1) resolveInitial?.();
    });
    await initial;
    await adminDb.doc(`users/${OTHER_UID}/notifications/other-new`).set(notification(200));
    await delay(250);
    unsubscribe();
    expect(events).toEqual([{ count: 1, capped: false }]);
  });

  it('does not deliver callbacks after idempotent unsubscribe', async () => {
    await replaceUnread(UID, 1);
    const events: { readonly count: number; readonly capped: boolean }[] = [];
    let resolveInitial: (() => void) | undefined;
    const initial = new Promise<void>((resolve) => {
      resolveInitial = resolve;
    });
    const unsubscribe = repositories.notifications.subscribeUnreadBadge((value) => {
      events.push(value);
      if (events.length === 1) resolveInitial?.();
    });
    await initial;
    unsubscribe();
    unsubscribe();
    await adminDb.doc(`users/${UID}/notifications/after-unsubscribe`).set(notification(300));
    await delay(250);
    expect(events).toEqual([{ count: 1, capped: false }]);
  });
});
