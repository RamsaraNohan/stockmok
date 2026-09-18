import type { Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  connectionDisable,
  connectionRequest,
  connectionRespond,
} from '../../functions/src/commands/connection.js';
import { paths } from '../../packages/shared/src/paths.js';
import { serverPaths } from '../../packages/shared/src/server/paths.js';
import {
  callable,
  clearFirestore,
  collectionOf,
  connectionIdFor,
  notificationsOf,
  ORG_A,
  ORG_B,
  OPERATION_ID_A,
  OPERATION_ID_B,
  seedConnection,
  seedMember,
  seedOrganization,
  seedOrganizationDirectory,
  seedProduct,
  seedSettings,
  seedStockBalance,
  testDb,
  uidFor,
} from './harness.js';

let db: Firestore;

/**
 * `C-18`, `C-19`, `C-20` — DB-06 §4, DB-07 §6, `T-CONC-06`.
 *
 * `ORG_A` is the buyer (Grand Ocean), `ORG_B` the supplier (Fresh Foods),
 * matching DB-08 §1. Every assertion inspects **persisted state** — the
 * canonical zone-4 record and both zone-3 projections — rather than the returned
 * `{ ok: true }`, because `INV-19` is a claim about three documents and a return
 * value cannot evidence it.
 */

const CONNECTION_ID = connectionIdFor(ORG_A, ORG_B);
const THIRD_ORG = 'org-third-party';

const ALL_ROLES = [
  'OWNER',
  'ADMIN',
  'INVENTORY_MANAGER',
  'PROCUREMENT_MANAGER',
  'STOREKEEPER',
  'ANALYST',
  'VIEWER',
] as const;

function reasonOf(result: { ok: boolean; details?: unknown }): string {
  return (result.details as { reason?: string } | undefined)?.reason ?? '';
}

async function seedBase(): Promise<void> {
  await clearFirestore();
  for (const orgId of [ORG_A, ORG_B, THIRD_ORG]) {
    await seedOrganization(db, orgId);
    await seedSettings(db, orgId);
    await seedOrganizationDirectory(db, orgId, orgId, orgId);
    for (const role of ALL_ROLES) await seedMember(db, orgId, role);
  }
}

async function canonical(): Promise<FirebaseFirestore.DocumentSnapshot> {
  return db.doc(serverPaths.canonicalConnection(ORG_A, ORG_B)).get();
}

async function projection(orgId: string): Promise<FirebaseFirestore.DocumentSnapshot> {
  return db.doc(paths.connectionProjection(orgId, CONNECTION_ID)).get();
}

const requestBy = (role: (typeof ALL_ROLES)[number] = 'PROCUREMENT_MANAGER', op = OPERATION_ID_A) =>
  connectionRequest.execute(
    callable(uidFor(ORG_A, role), {
      orgId: ORG_A,
      operationId: op,
      payload: { supplierHandle: ORG_B },
    }),
    db,
  );

const respondBy = (
  role: (typeof ALL_ROLES)[number],
  response: 'ACCEPT' | 'REJECT',
  op = OPERATION_ID_B,
) =>
  connectionRespond.execute(
    callable(uidFor(ORG_B, role), {
      orgId: ORG_B,
      operationId: op,
      payload: { connectionId: CONNECTION_ID, response },
    }),
    db,
  );

beforeAll(() => {
  db = testDb();
});
beforeEach(seedBase);

// ───────────────────────────────────────────────────────────────────────────
describe('C-18 connection.request', () => {
  it('writes the canonical record and BOTH projections in one transaction', async () => {
    const result = await requestBy();
    expect(result.ok).toBe(true);

    const record = await canonical();
    expect(record.exists).toBe(true);
    expect(record.id).toBe(CONNECTION_ID);
    expect(record.get('status')).toBe('PENDING');
    expect(record.get('buyerOrgId')).toBe(ORG_A);
    expect(record.get('supplierOrgId')).toBe(ORG_B);
    expect(record.get('requestedByUid')).toBe(uidFor(ORG_A, 'PROCUREMENT_MANAGER'));

    for (const orgId of [ORG_A, ORG_B]) {
      const view = await projection(orgId);
      expect(view.exists).toBe(true);
      expect(view.get('status')).toBe('PENDING');
      expect(view.get('buyerOrgId')).toBe(ORG_A);
      expect(view.get('supplierOrgId')).toBe(ORG_B);
      expect(view.get('ordersPlacedCount')).toBe(0);
    }
  });

  it('is directional — the id is {buyer}__{supplier} and the reverse is a different document', async () => {
    await requestBy();
    const reverse = await db.doc(serverPaths.canonicalConnection(ORG_B, ORG_A)).get();
    expect(reverse.exists).toBe(false);
  });

  it('rejects a self-connection by handle and by resolved organization', async () => {
    const result = await connectionRequest.execute(
      callable(uidFor(ORG_A, 'PROCUREMENT_MANAGER'), {
        orgId: ORG_A,
        operationId: OPERATION_ID_A,
        payload: { supplierHandle: ORG_A },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('SELF_CONNECTION');
    expect((await canonical()).exists).toBe(false);
  });

  it('refuses a duplicate request while PENDING or ACTIVE, and writes nothing', async () => {
    await requestBy();
    for (const status of ['PENDING', 'ACTIVE'] as const) {
      await db.doc(serverPaths.canonicalConnection(ORG_A, ORG_B)).update({ status });
      const result = await connectionRequest.execute(
        callable(uidFor(ORG_A, 'OWNER'), {
          orgId: ORG_A,
          operationId: '22222222-3333-4444-8555-666666666666',
          payload: { supplierHandle: ORG_B },
        }),
        db,
      );
      expect(result.ok).toBe(false);
      expect(reasonOf(result)).toBe('CONNECTION_EXISTS');
      expect((await canonical()).get('status')).toBe(status);
    }
  });

  it('permits a fresh request from REJECTED or DISABLED and clears the stale response fields', async () => {
    await requestBy();
    await respondBy('OWNER', 'REJECT');
    expect((await canonical()).get('respondedAt')).toBeDefined();

    const again = await connectionRequest.execute(
      callable(uidFor(ORG_A, 'OWNER'), {
        orgId: ORG_A,
        operationId: '33333333-4444-4555-8666-777777777777',
        payload: { supplierHandle: ORG_B },
      }),
      db,
    );
    expect(again.ok).toBe(true);
    const record = await canonical();
    expect(record.get('status')).toBe('PENDING');
    // A re-request is not a re-enable: nothing survives from the old answer.
    expect(record.get('respondedAt')).toBeUndefined();
    expect(record.get('respondedByUid')).toBeUndefined();
  });

  it('carries ordersPlacedCount forward across a re-request', async () => {
    await requestBy();
    await respondBy('OWNER', 'REJECT');
    for (const orgId of [ORG_A, ORG_B]) {
      await db
        .doc(paths.connectionProjection(orgId, CONNECTION_ID))
        .update({ ordersPlacedCount: 4 });
    }
    await connectionRequest.execute(
      callable(uidFor(ORG_A, 'OWNER'), {
        orgId: ORG_A,
        operationId: '44444444-5555-4666-8777-888888888888',
        payload: { supplierHandle: ORG_B },
      }),
      db,
    );
    for (const orgId of [ORG_A, ORG_B]) {
      expect((await projection(orgId)).get('ordersPlacedCount')).toBe(4);
    }
  });

  it('is not-found for an unregistered handle, and reveals nothing else', async () => {
    const result = await connectionRequest.execute(
      callable(uidFor(ORG_A, 'OWNER'), {
        orgId: ORG_A,
        operationId: OPERATION_ID_A,
        payload: { supplierHandle: 'fresh-foods-lk' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('RESOURCE_NOT_FOUND');
  });

  it('audits in BOTH organizations and notifies the supplier ADMINS only', async () => {
    await requestBy();

    for (const orgId of [ORG_A, ORG_B]) {
      const audits = await collectionOf(db, orgId, 'auditLogs');
      expect(audits).toHaveLength(1);
      expect(audits[0]?.get('action')).toBe('connection.request');
      expect(audits[0]?.get('organizationId')).toBe(orgId);
      expect(audits[0]?.get('actorUid')).toBe(uidFor(ORG_A, 'PROCUREMENT_MANAGER'));
    }

    for (const role of ['OWNER', 'ADMIN'] as const) {
      const notes = await notificationsOf(db, uidFor(ORG_B, role));
      expect(notes).toHaveLength(1);
      expect(notes[0]?.get('type')).toBe('CONNECTION_REQUESTED');
      expect(notes[0]?.get('category')).toBe('NETWORK');
      expect(notes[0]?.get('organizationId')).toBe(ORG_B);
      expect(notes[0]?.get('read')).toBe(false);
    }
    // Not the Procurement Manager, and not anyone in the requesting organization.
    expect(await notificationsOf(db, uidFor(ORG_B, 'PROCUREMENT_MANAGER'))).toHaveLength(0);
    for (const role of ALL_ROLES) {
      expect(await notificationsOf(db, uidFor(ORG_A, role))).toHaveLength(0);
    }
  });

  it('replaying one operationId writes no second projection or audit', async () => {
    await requestBy();
    const replay = await requestBy();
    expect(replay.ok).toBe(true);
    expect(await collectionOf(db, ORG_A, 'auditLogs')).toHaveLength(1);
    expect(await collectionOf(db, ORG_B, 'auditLogs')).toHaveLength(1);
    expect(await notificationsOf(db, uidFor(ORG_B, 'OWNER'))).toHaveLength(1);
  });

  it('the same operationId with a different payload is refused', async () => {
    await requestBy();
    const result = await connectionRequest.execute(
      callable(uidFor(ORG_A, 'PROCUREMENT_MANAGER'), {
        orgId: ORG_A,
        operationId: OPERATION_ID_A,
        payload: { supplierHandle: THIRD_ORG },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD');
  });

  it('PARTNER_WRITERS may request; the other four roles may not', async () => {
    for (const role of ['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER'] as const) {
      await seedBase();
      const result = await requestBy(role);
      expect(result.ok, role).toBe(true);
    }
    for (const role of ['INVENTORY_MANAGER', 'STOREKEEPER', 'ANALYST', 'VIEWER'] as const) {
      await seedBase();
      const result = await requestBy(role);
      expect(result.ok, role).toBe(false);
      expect(reasonOf(result), role).toBe('ROLE_NOT_PERMITTED');
      expect((await canonical()).exists, role).toBe(false);
    }
  });

  it('denies an unauthenticated caller, a non-member and a suspended member', async () => {
    const anonymous = await connectionRequest.execute(
      { data: { orgId: ORG_A, operationId: OPERATION_ID_A, payload: { supplierHandle: ORG_B } } },
      db,
    );
    expect(anonymous.ok).toBe(false);
    expect(reasonOf(anonymous)).toBe('NOT_SIGNED_IN');

    const stranger = await connectionRequest.execute(
      callable('nobody', {
        orgId: ORG_A,
        operationId: OPERATION_ID_A,
        payload: { supplierHandle: ORG_B },
      }),
      db,
    );
    expect(reasonOf(stranger)).toBe('NOT_A_MEMBER');

    await seedMember(db, ORG_A, 'PROCUREMENT_MANAGER', { status: 'SUSPENDED' });
    const suspended = await requestBy();
    expect(reasonOf(suspended)).toBe('MEMBERSHIP_NOT_ACTIVE');
    expect((await canonical()).exists).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('C-19 connection.respond', () => {
  beforeEach(async () => {
    await requestBy();
  });

  it('accepting moves the canonical record and both projections to ACTIVE together', async () => {
    const result = await respondBy('PROCUREMENT_MANAGER', 'ACCEPT');
    expect(result.ok).toBe(true);

    expect((await canonical()).get('status')).toBe('ACTIVE');
    expect((await canonical()).get('respondedByUid')).toBe(uidFor(ORG_B, 'PROCUREMENT_MANAGER'));
    for (const orgId of [ORG_A, ORG_B]) {
      expect((await projection(orgId)).get('status')).toBe('ACTIVE');
      expect((await projection(orgId)).get('respondedByUid')).toBe(
        uidFor(ORG_B, 'PROCUREMENT_MANAGER'),
      );
      // The projection keeps the field this command has no business touching.
      expect((await projection(orgId)).get('ordersPlacedCount')).toBe(0);
    }
  });

  it('rejecting moves all three to REJECTED', async () => {
    await respondBy('OWNER', 'REJECT');
    expect((await canonical()).get('status')).toBe('REJECTED');
    for (const orgId of [ORG_A, ORG_B]) {
      expect((await projection(orgId)).get('status')).toBe('REJECTED');
    }
  });

  it('the BUYER cannot answer its own request — denied by side, not by role', async () => {
    const result = await connectionRespond.execute(
      callable(uidFor(ORG_A, 'OWNER'), {
        orgId: ORG_A,
        operationId: OPERATION_ID_B,
        payload: { connectionId: CONNECTION_ID, response: 'ACCEPT' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('CROSS_TENANT_REFERENCE');
    expect((await canonical()).get('status')).toBe('PENDING');
  });

  it('a third organization cannot answer at all', async () => {
    const result = await connectionRespond.execute(
      callable(uidFor(THIRD_ORG, 'OWNER'), {
        orgId: THIRD_ORG,
        operationId: OPERATION_ID_B,
        payload: { connectionId: CONNECTION_ID, response: 'ACCEPT' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('CROSS_TENANT_REFERENCE');
    expect((await canonical()).get('status')).toBe('PENDING');
  });

  it('refuses every non-PENDING state', async () => {
    for (const status of ['ACTIVE', 'REJECTED', 'DISABLED'] as const) {
      await db.doc(serverPaths.canonicalConnection(ORG_A, ORG_B)).update({ status });
      const result = await respondBy('OWNER', 'ACCEPT', '55555555-6666-4777-8888-999999999999');
      expect(result.ok, status).toBe(false);
      expect(reasonOf(result), status).toBe('INVALID_TRANSITION');
      expect((await canonical()).get('status'), status).toBe(status);
    }
  });

  it('notifies the requester, and only the requester', async () => {
    await respondBy('OWNER', 'ACCEPT');
    const requester = await notificationsOf(db, uidFor(ORG_A, 'PROCUREMENT_MANAGER'));
    expect(requester).toHaveLength(1);
    expect(requester[0]?.get('type')).toBe('CONNECTION_RESPONDED');
    expect(requester[0]?.get('organizationId')).toBe(ORG_A);
    for (const role of ['OWNER', 'ADMIN', 'VIEWER'] as const) {
      expect(await notificationsOf(db, uidFor(ORG_A, role))).toHaveLength(0);
    }
  });

  it('does not notify a requester who has since left the organization', async () => {
    await seedMember(db, ORG_A, 'PROCUREMENT_MANAGER', { status: 'REMOVED' });
    const result = await respondBy('OWNER', 'ACCEPT');
    expect(result.ok).toBe(true);
    expect(await notificationsOf(db, uidFor(ORG_A, 'PROCUREMENT_MANAGER'))).toHaveLength(0);
  });

  it('audits in both organizations and is idempotent on replay', async () => {
    await respondBy('OWNER', 'ACCEPT');
    const replay = await respondBy('OWNER', 'ACCEPT');
    expect(replay.ok).toBe(true);
    // One request audit + one respond audit per organization, and no more.
    expect(await collectionOf(db, ORG_A, 'auditLogs')).toHaveLength(2);
    expect(await collectionOf(db, ORG_B, 'auditLogs')).toHaveLength(2);
    expect(await notificationsOf(db, uidFor(ORG_A, 'PROCUREMENT_MANAGER'))).toHaveLength(1);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('C-20 connection.disable', () => {
  beforeEach(async () => {
    await seedConnection(db, ORG_A, ORG_B, 'ACTIVE');
  });

  const disableBy = (orgId: string, role: (typeof ALL_ROLES)[number]) =>
    connectionDisable.execute(
      callable(uidFor(orgId, role), {
        orgId,
        payload: { connectionId: CONNECTION_ID },
      }),
      db,
    );

  it('either party may disable, and all three documents move together', async () => {
    for (const orgId of [ORG_A, ORG_B]) {
      await seedConnection(db, ORG_A, ORG_B, 'ACTIVE');
      const result = await disableBy(orgId, 'OWNER');
      expect(result.ok, orgId).toBe(true);
      expect((await canonical()).get('status'), orgId).toBe('DISABLED');
      expect((await canonical()).get('disabledAt'), orgId).toBeDefined();
      for (const side of [ORG_A, ORG_B]) {
        expect((await projection(side)).get('status'), `${orgId}->${side}`).toBe('DISABLED');
      }
    }
  });

  it('is ADMINS only — a Procurement Manager that may request cannot disable', async () => {
    const result = await disableBy(ORG_A, 'PROCUREMENT_MANAGER');
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('ROLE_NOT_PERMITTED');
    expect((await canonical()).get('status')).toBe('ACTIVE');
  });

  it('a third organization cannot disable someone else’s connection', async () => {
    const result = await disableBy(THIRD_ORG, 'OWNER');
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('CROSS_TENANT_REFERENCE');
    expect((await canonical()).get('status')).toBe('ACTIVE');
  });

  it('there is no re-enable — a DISABLED connection cannot be disabled or answered again', async () => {
    await disableBy(ORG_A, 'OWNER');
    const twice = await disableBy(ORG_A, 'OWNER');
    expect(reasonOf(twice)).toBe('INVALID_TRANSITION');
    const answer = await respondBy('OWNER', 'ACCEPT');
    expect(reasonOf(answer)).toBe('INVALID_TRANSITION');
    expect((await canonical()).get('status')).toBe('DISABLED');
  });

  it('carries no operationId — it is non-idempotent and writes no receipt', async () => {
    await disableBy(ORG_A, 'OWNER');
    expect(await collectionOf(db, ORG_A, 'commandReceipts')).toHaveLength(0);
    expect(await collectionOf(db, ORG_B, 'commandReceipts')).toHaveLength(0);
  });

  it('audits in both organizations and emits no notification', async () => {
    await disableBy(ORG_A, 'OWNER');
    for (const orgId of [ORG_A, ORG_B]) {
      const audits = await collectionOf(db, orgId, 'auditLogs');
      expect(audits).toHaveLength(1);
      expect(audits[0]?.get('action')).toBe('connection.disable');
      expect(audits[0]?.get('organizationId')).toBe(orgId);
    }
    for (const orgId of [ORG_A, ORG_B]) {
      for (const role of ALL_ROLES) {
        expect(await notificationsOf(db, uidFor(orgId, role))).toHaveLength(0);
      }
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('a connection is collaboration, not access (INV-14)', () => {
  it('an ACTIVE connection writes nothing into the counterparty’s private inventory', async () => {
    await seedProduct(db, ORG_B, 'product-supplier-only', { name: 'Supplier Only' });
    await seedStockBalance(db, ORG_B, 'product-supplier-only', 'warehouse-main', {
      onHandMilli: 50_000,
    });

    await requestBy();
    await respondBy('OWNER', 'ACCEPT');

    // The whole point: connecting changed no stock document in either tenant.
    for (const orgId of [ORG_A, ORG_B]) {
      expect(await collectionOf(db, orgId, 'stockMovements')).toHaveLength(0);
      expect(await collectionOf(db, orgId, 'productStockSummaries')).toHaveLength(0);
    }
    const balance = await db
      .doc(paths.stockBalance(ORG_B, 'product-supplier-only', 'warehouse-main'))
      .get();
    expect(balance.get('onHandMilli')).toBe(50_000);

    // And the buyer's projection carries only the connection field set — no
    // supplier product, stock, cost or member data rode along with it.
    const view = await projection(ORG_A);
    expect(Object.keys(view.data() ?? {}).sort()).toEqual(
      [
        'buyerHandle',
        'buyerName',
        'buyerOrgId',
        'connectionId',
        'ordersPlacedCount',
        'requestedAt',
        'requestedByUid',
        'respondedAt',
        'respondedByUid',
        'status',
        'supplierHandle',
        'supplierName',
        'supplierOrgId',
        'updatedAt',
      ].sort(),
    );
  });
});
