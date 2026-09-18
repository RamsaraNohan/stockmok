import type { Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { paths } from '../../packages/shared/src/paths.js';
import { writeAudit } from '../../functions/src/core/audit.js';
import { CommandFailure } from '../../functions/src/core/errors.js';
import {
  NOTIFICATION_FANOUT_LIMIT,
  resolveNotificationRecipients,
  writeNotifications,
} from '../../functions/src/core/notify.js';
import {
  MAX_TRANSACTION_QUERY_LIMIT,
  runTrustedTransaction,
} from '../../functions/src/core/transaction.js';
import { ROLE_GROUPS } from '../../functions/src/guards/roles.js';
import {
  clearFirestore,
  membershipOf,
  ORG_A,
  seedMember,
  seedOrganization,
  testDb,
  uidFor,
} from './harness.js';

/**
 * Transaction, audit and notification infrastructure, plus the property the
 * whole of B1 rests on: **the Admin SDK bypasses `firestore.rules`**, so the
 * server guards are the only authorization a command has.
 */

let db: Firestore;

beforeAll(async () => {
  db = testDb();
  await clearFirestore();
  await seedOrganization(db, ORG_A);
  for (const role of [
    'OWNER',
    'ADMIN',
    'INVENTORY_MANAGER',
    'PROCUREMENT_MANAGER',
    'STOREKEEPER',
    'ANALYST',
    'VIEWER',
  ] as const) {
    await seedMember(db, ORG_A, role);
  }
});

describe('ADMIN_SDK_REAUTHORIZATION_FOUNDATION', () => {
  it('writes a rules-denied document straight through, which is why guards exist', async () => {
    // firestore.rules denies auditLogs create to every client including the Owner
    // (tests/rules/write-surfaces.test.ts). The Admin SDK is not a client.
    await db.doc(paths.auditLog(ORG_A, 'admin-sdk-proof')).set({
      auditId: 'admin-sdk-proof',
      actorUid: 'system',
      action: 'test.probe',
      summary: 'Rules did not run.',
    });
    expect((await db.doc(paths.auditLog(ORG_A, 'admin-sdk-proof')).get()).exists).toBe(true);
  });

  it('reads a zone-4 canonical document that no client may read', async () => {
    await db.doc('connections/a__b').set({ status: 'ACTIVE' });
    expect((await db.doc('connections/a__b').get()).exists).toBe(true);
  });
});

describe('TRANSACTION_FOUNDATION', () => {
  it('commits the whole write set or nothing', async () => {
    await expect(
      runTrustedTransaction(db, async (scope) => {
        scope.create(db.doc(paths.category(ORG_A, 'atomic-1')), { name: 'One' });
        scope.create(db.doc(paths.category(ORG_A, 'atomic-2')), { name: 'Two' });
        await Promise.resolve();
        throw new Error('abort after both writes were staged');
      }),
    ).rejects.toThrow(/abort after both writes/);
    expect((await db.doc(paths.category(ORG_A, 'atomic-1')).get()).exists).toBe(false);
    expect((await db.doc(paths.category(ORG_A, 'atomic-2')).get()).exists).toBe(false);
  });

  it('refuses a read issued after a write — all reads precede all writes', async () => {
    await expect(
      runTrustedTransaction(db, async (scope) => {
        scope.create(db.doc(paths.category(ORG_A, 'phase-probe')), { name: 'Probe' });
        await scope.get(db.doc(paths.organization(ORG_A)));
      }),
    ).rejects.toThrow(/reads must precede/);
  });

  it('tracks the phase and the write count', async () => {
    await runTrustedTransaction(db, async (scope) => {
      expect(scope.phase).toBe('READ');
      await scope.get(db.doc(paths.organization(ORG_A)));
      scope.create(db.doc(paths.category(ORG_A, 'counted')), { name: 'Counted' });
      expect(scope.phase).toBe('WRITE');
      expect(scope.writeCount).toBe(1);
    });
  });

  it('applies the bound itself, so an unbounded in-transaction query cannot be written', async () => {
    const members = db.collection(`${paths.organization(ORG_A)}/members`);
    const bounded = await runTrustedTransaction(db, (scope) => scope.query(members, 2));
    expect(bounded.size).toBe(2);

    for (const badLimit of [0, -1, MAX_TRANSACTION_QUERY_LIMIT + 1, 1.5]) {
      await expect(
        runTrustedTransaction(db, (scope) => scope.query(members, badLimit)),
      ).rejects.toThrow(/query limit must be between/);
    }
  });

  it('permits a delete only on a productSkuIndex entry', async () => {
    await db.doc(paths.productSkuIndex(ORG_A, 'SKU-OLD')).set({ productId: 'p-1' });
    await runTrustedTransaction(db, (scope) => {
      scope.deleteIndexDocument(db.doc(paths.productSkuIndex(ORG_A, 'SKU-OLD')));
      return Promise.resolve();
    });
    expect((await db.doc(paths.productSkuIndex(ORG_A, 'SKU-OLD')).get()).exists).toBe(false);

    await expect(
      runTrustedTransaction(db, (scope) => {
        scope.deleteIndexDocument(db.doc(paths.product(ORG_A, 'p-1')));
        return Promise.resolve();
      }),
    ).rejects.toThrow(/only a productSkuIndex entry may be deleted/i);
  });
});

describe('AUDIT_FOUNDATION against the database', () => {
  beforeEach(async () => {
    const existing = await db.collection(`${paths.organization(ORG_A)}/auditLogs`).get();
    await Promise.all(existing.docs.map((snapshot) => snapshot.ref.delete()));
  });

  it('writes a record whose actor, role, organization and time are all server-derived', async () => {
    const actor = membershipOf(ORG_A, 'INVENTORY_MANAGER');
    const auditId = await runTrustedTransaction(db, (scope) =>
      Promise.resolve(
        writeAudit(scope, db, actor, {
          action: 'stock.transfer',
          entityType: 'STOCK_MOVEMENT',
          entityId: 'mv-1',
          operationId: '11111111-2222-4333-8444-555555555555',
          summary: 'Transferred 50.000 KG from Main Store to Cold Room',
          metadata: { quantityMilli: 50_000 },
        }),
      ),
    );

    const record = (await db.doc(paths.auditLog(ORG_A, auditId)).get()).data() ?? {};
    expect(record.actorUid).toBe(actor.uid);
    expect(record.actorRole).toBe('INVENTORY_MANAGER');
    expect(record.organizationId).toBe(ORG_A);
    expect(record.action).toBe('stock.transfer');
    expect(record.metadata).toEqual({ quantityMilli: 50_000 });
    // A Firestore server timestamp, not a client clock.
    expect(typeof (record.createdAt as { toMillis?: unknown } | undefined)?.toMillis).toBe(
      'function',
    );
  });

  it('generates the audit id server-side, so a caller cannot choose or overwrite one', async () => {
    const actor = membershipOf(ORG_A, 'OWNER');
    const request = {
      action: 'org.create',
      entityType: 'ORGANIZATION',
      entityId: ORG_A,
      summary: 'Created the workspace.',
    };
    const first = await runTrustedTransaction(db, (scope) =>
      Promise.resolve(writeAudit(scope, db, actor, request)),
    );
    const second = await runTrustedTransaction(db, (scope) =>
      Promise.resolve(writeAudit(scope, db, actor, request)),
    );
    expect(first).not.toBe(second);
    const all = await db.collection(`${paths.organization(ORG_A)}/auditLogs`).get();
    expect(all.size).toBe(2);
  });

  it('rejects a forged actor before anything is written', async () => {
    const actor = membershipOf(ORG_A, 'VIEWER');
    await expect(
      runTrustedTransaction(db, (scope) =>
        Promise.resolve(
          writeAudit(scope, db, actor, {
            action: 'stock.transfer',
            entityType: 'STOCK_MOVEMENT',
            entityId: 'mv-2',
            summary: 'Forged',
            actorUid: uidFor(ORG_A, 'OWNER'),
          } as never),
        ),
      ),
    ).rejects.toBeInstanceOf(CommandFailure);
    expect((await db.collection(`${paths.organization(ORG_A)}/auditLogs`).get()).size).toBe(0);
  });
});

describe('NOTIFICATION_FOUNDATION against the database', () => {
  beforeEach(async () => {
    for (const role of ROLE_GROUPS.INVENTORY_WRITERS) {
      const existing = await db
        .collection(`${paths.user(uidFor(ORG_A, role))}/notifications`)
        .get();
      await Promise.all(existing.docs.map((snapshot) => snapshot.ref.delete()));
    }
  });

  it('Q-059 · resolves ACTIVE members holding the named roles, and no others', async () => {
    const recipients = await resolveNotificationRecipients(
      db,
      ORG_A,
      ROLE_GROUPS.INVENTORY_WRITERS,
    );
    expect([...recipients].sort()).toEqual(
      ROLE_GROUPS.INVENTORY_WRITERS.map((role) => uidFor(ORG_A, role)).sort(),
    );
    expect(recipients).not.toContain(uidFor(ORG_A, 'VIEWER'));
  });

  it('excludes a suspended member from the recipient set', async () => {
    await seedMember(db, ORG_A, 'ANALYST', { status: 'SUSPENDED' });
    const recipients = await resolveNotificationRecipients(db, ORG_A, ['ANALYST']);
    expect(recipients).toHaveLength(0);
    await seedMember(db, ORG_A, 'ANALYST');
  });

  it('writes one server-controlled document per recipient', async () => {
    const recipients = ROLE_GROUPS.INVENTORY_WRITERS.map((role) => uidFor(ORG_A, role));
    const outcome = await runTrustedTransaction(db, (scope) =>
      Promise.resolve(
        writeNotifications(scope, db, {
          recipients,
          orgId: ORG_A,
          organizationName: 'Grand Ocean Hotel',
          type: 'LOW_STOCK',
          title: 'Chicken Breast is low',
          message: 'Chicken Breast fell below its minimum in Cold Room.',
          referenceType: 'PRODUCT',
          referenceId: 'prod-1',
        }),
      ),
    );
    expect(outcome).toMatchObject({ written: 3, skipped: false });

    for (const uid of recipients) {
      const inbox = await db.collection(`${paths.user(uid)}/notifications`).get();
      expect(inbox.size).toBe(1);
      const record = inbox.docs[0]?.data() ?? {};
      expect(record.organizationId).toBe(ORG_A);
      expect(record.type).toBe('LOW_STOCK');
      expect(record.category).toBe('STOCK');
      expect(record.read).toBe(false);
      expect(typeof (record.createdAt as { toMillis?: unknown } | undefined)?.toMillis).toBe(
        'function',
      );
    }
  });

  it('skips and logs rather than aborting when the fan-out bound is exceeded', async () => {
    const recipients = Array.from(
      { length: NOTIFICATION_FANOUT_LIMIT + 1 },
      (_, index) => `bulk-user-${String(index)}`,
    );
    const outcome = await runTrustedTransaction(db, (scope) =>
      Promise.resolve(
        writeNotifications(scope, db, {
          recipients,
          orgId: ORG_A,
          organizationName: 'Grand Ocean Hotel',
          type: 'MEMBERSHIP_CHANGED',
          title: 'Access changed',
          message: 'Your role changed.',
          referenceType: 'MEMBERSHIP',
          referenceId: 'member-1',
        }),
      ),
    );
    expect(outcome.skipped).toBe(true);
    expect(outcome.written).toBe(0);
    expect((await db.collection(`${paths.user('bulk-user-0')}/notifications`).get()).size).toBe(0);
  });

  it('rejects an invalid recipient before writing anything', async () => {
    await expect(
      runTrustedTransaction(db, (scope) =>
        Promise.resolve(
          writeNotifications(scope, db, {
            recipients: [uidFor(ORG_A, 'OWNER'), 'bad/uid'],
            orgId: ORG_A,
            organizationName: 'Grand Ocean Hotel',
            type: 'LOW_STOCK',
            title: 'Low',
            message: 'Low',
            referenceType: 'PRODUCT',
            referenceId: 'prod-1',
          }),
        ),
      ),
    ).rejects.toBeInstanceOf(CommandFailure);
    expect(
      (await db.collection(`${paths.user(uidFor(ORG_A, 'OWNER'))}/notifications`).get()).size,
    ).toBe(0);
  });
});
