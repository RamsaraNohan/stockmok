import type { Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { paths } from '../../packages/shared/src/paths.js';
import { partnerSetStatus } from '../../functions/src/commands/partner.js';
import {
  callable,
  clearFirestore,
  ORG_A,
  ORG_B,
  seedMember,
  seedOrganization,
  seedPrivatePartner,
  seedPurchaseOrder,
  testDb,
  uidFor,
} from './harness.js';

let db: Firestore;

async function seedBaseOrg(): Promise<void> {
  await clearFirestore();
  await seedOrganization(db, ORG_A);
  await seedOrganization(db, ORG_B);
  for (const role of ['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER', 'VIEWER'] as const) {
    await seedMember(db, ORG_A, role);
  }
  await seedPrivatePartner(db, ORG_A, 'partner-1');
}

beforeAll(() => {
  db = testDb();
});

describe('C-38 partner.setStatus', () => {
  beforeEach(seedBaseOrg);

  it('deactivates an ACTIVE partner with no open purchase order, and audits it', async () => {
    const result = await partnerSetStatus.execute(
      callable(uidFor(ORG_A, 'PROCUREMENT_MANAGER'), {
        orgId: ORG_A,
        payload: { partnerId: 'partner-1', status: 'DEACTIVATED' },
      }),
      db,
    );
    expect(result.ok, JSON.stringify(result)).toBe(true);
    const partner = await db.doc(paths.privatePartner(ORG_A, 'partner-1')).get();
    expect(partner.get('status')).toBe('DEACTIVATED');
    const audit = await db.collection(`${paths.organization(ORG_A)}/auditLogs`).get();
    expect(audit.docs.some((doc) => doc.get('action') === 'partner.setStatus')).toBe(true);
  });

  it.each(['ORDERED', 'PARTIALLY_RECEIVED', 'ACCEPTED', 'SHIPPED'] as const)(
    'refuses to deactivate a partner with an open %s purchase order (Q-080)',
    async (status) => {
      await seedPurchaseOrder(db, ORG_A, 'po-1', { status, privateSupplierId: 'partner-1' });
      const result = await partnerSetStatus.execute(
        callable(uidFor(ORG_A, 'PROCUREMENT_MANAGER'), {
          orgId: ORG_A,
          payload: { partnerId: 'partner-1', status: 'DEACTIVATED' },
        }),
        db,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect((result.details as { reason?: string } | undefined)?.reason).toBe(
        'INVALID_TRANSITION',
      );
      const partner = await db.doc(paths.privatePartner(ORG_A, 'partner-1')).get();
      expect(partner.get('status')).toBe('ACTIVE');
    },
  );

  it('allows deactivating when the only purchase order is CANCELLED (not an open status)', async () => {
    await seedPurchaseOrder(db, ORG_A, 'po-2', {
      status: 'CANCELLED',
      privateSupplierId: 'partner-1',
    });
    const result = await partnerSetStatus.execute(
      callable(uidFor(ORG_A, 'PROCUREMENT_MANAGER'), {
        orgId: ORG_A,
        payload: { partnerId: 'partner-1', status: 'DEACTIVATED' },
      }),
      db,
    );
    expect(result.ok, JSON.stringify(result)).toBe(true);
  });

  it('restores a DEACTIVATED partner unconditionally, even with an open order', async () => {
    await seedPrivatePartner(db, ORG_A, 'partner-2', { status: 'DEACTIVATED' });
    await seedPurchaseOrder(db, ORG_A, 'po-3', {
      status: 'ORDERED',
      privateSupplierId: 'partner-2',
    });
    const result = await partnerSetStatus.execute(
      callable(uidFor(ORG_A, 'PROCUREMENT_MANAGER'), {
        orgId: ORG_A,
        payload: { partnerId: 'partner-2', status: 'ACTIVE' },
      }),
      db,
    );
    expect(result.ok, JSON.stringify(result)).toBe(true);
    const partner = await db.doc(paths.privatePartner(ORG_A, 'partner-2')).get();
    expect(partner.get('status')).toBe('ACTIVE');
  });

  it('rejects setting the same status again as an invalid transition', async () => {
    const result = await partnerSetStatus.execute(
      callable(uidFor(ORG_A, 'PROCUREMENT_MANAGER'), {
        orgId: ORG_A,
        payload: { partnerId: 'partner-1', status: 'ACTIVE' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('INVALID_TRANSITION');
  });

  it.each(['VIEWER'] as const)('denies %s — PARTNER_WRITERS only', async (role) => {
    const result = await partnerSetStatus.execute(
      callable(uidFor(ORG_A, role), {
        orgId: ORG_A,
        payload: { partnerId: 'partner-1', status: 'DEACTIVATED' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('ROLE_NOT_PERMITTED');
  });

  it('rejects a partner belonging to another organization', async () => {
    await seedPrivatePartner(db, ORG_B, 'partner-in-b');
    const result = await partnerSetStatus.execute(
      callable(uidFor(ORG_A, 'PROCUREMENT_MANAGER'), {
        orgId: ORG_A,
        payload: { partnerId: 'partner-in-b', status: 'DEACTIVATED' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('not-found');
  });
});
