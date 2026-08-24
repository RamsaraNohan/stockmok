import type { DocumentData } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';

import { verifyAuthority } from '../../scripts/qa/verify/authority.js';
import { verifyNetwork } from '../../scripts/qa/verify/network.js';
import {
  documentField,
  field,
  mutatedSnapshot,
  pathsUnder,
  smokeFixture,
} from './dataset-fixture.js';

interface OrderRow {
  readonly path: string;
  readonly read: (key: string) => unknown;
}

function connectedOrders(): readonly OrderRow[] {
  const fixture = smokeFixture();
  return pathsUnder(
    fixture,
    (parts) => parts[0] === 'organizations' && parts[2] === 'purchaseOrders' && parts.length === 4,
  )
    .map((path) => ({ path, read: (key: string) => documentField(fixture, path, key) }))
    .filter((entry) => entry.read('supplierKind') === 'CONNECTED');
}

describe('QA connected network', () => {
  it('reconciles projections, conversions and mappings', () => {
    expect(verifyNetwork(smokeFixture().snapshot)).toEqual([]);
  });

  it('covers the connected order lifecycle', () => {
    const statuses = new Set(connectedOrders().map((order) => order.read('status')));
    expect(statuses).toEqual(
      new Set([
        'DRAFT',
        'SUBMITTED',
        'ACCEPTED',
        'REJECTED',
        'SHIPPED',
        'PARTIALLY_RECEIVED',
        'RECEIVED',
        'CANCELLED',
      ]),
    );
  });

  it('gives a submitted order a canonical record and two projections', () => {
    const fixture = smokeFixture();
    const submitted = connectedOrders().filter((order) => order.read('status') !== 'DRAFT');
    expect(submitted.length).toBeGreaterThan(0);
    for (const order of submitted) {
      const purchaseOrderId = order.path.split('/')[3] ?? '';
      expect(fixture.snapshot.documents.has(`connectedPurchaseOrders/${purchaseOrderId}`)).toBe(
        true,
      );
      expect(order.read('isProjection')).toBe(true);
    }
  });

  it('leaves a draft with no canonical record and no supplier projection', () => {
    const fixture = smokeFixture();
    const drafts = connectedOrders().filter((order) => order.read('status') === 'DRAFT');
    expect(drafts).toHaveLength(1);
    for (const draft of drafts) {
      const purchaseOrderId = draft.path.split('/')[3] ?? '';
      // `cpo.submit` is what creates the shared record, so before it there is
      // nothing to be a projection of.
      expect(fixture.snapshot.documents.has(`connectedPurchaseOrders/${purchaseOrderId}`)).toBe(
        false,
      );
      expect(draft.read('isProjection')).toBe(false);
      expect(draft.read('viewRole')).toBe('BUYER');
    }
  });

  it('marks the canonical record as the non-projection', () => {
    const fixture = smokeFixture();
    const canonical = pathsUnder(
      fixture,
      (parts) => parts[0] === 'connectedPurchaseOrders' && parts.length === 2,
    );
    expect(canonical.length).toBeGreaterThan(0);
    for (const path of canonical) {
      expect(field(fixture.snapshot.documents.get(path), 'isProjection')).toBe(false);
    }
  });

  it('keeps both view roles present on submitted orders', () => {
    const roles = new Set(
      connectedOrders()
        .filter((order) => order.read('status') !== 'DRAFT')
        .map((order) => order.read('viewRole')),
    );
    expect(roles).toEqual(new Set(['BUYER', 'SUPPLIER']));
  });
});

/** The buyer-side connected order document carrying the given status. */
function connectedOrder(status: string): { readonly path: string; readonly data: DocumentData } {
  const fixture = smokeFixture();
  const path = connectedOrders().find((order) => order.read('status') === status)?.path;
  if (path === undefined) throw new Error(`no connected order carries status ${status}`);
  const data = fixture.snapshot.documents.get(path);
  if (data === undefined) throw new Error(`no document at ${path}`);
  return { path, data };
}

function orderIds(data: DocumentData): {
  readonly purchaseOrderId: string;
  readonly buyerOrgId: string;
  readonly supplierOrgId: string;
} {
  const purchaseOrderId = String(data['purchaseOrderId']);
  const canonical = smokeFixture().snapshot.documents.get(
    `connectedPurchaseOrders/${purchaseOrderId}`,
  );
  if (canonical === undefined) throw new Error(`no canonical record for ${purchaseOrderId}`);
  return {
    purchaseOrderId,
    buyerOrgId: String(canonical['buyerOrgId']),
    supplierOrgId: String(canonical['supplierOrgId']),
  };
}

describe('QA connected network — negative coverage (regressions for DV review findings)', () => {
  it('QA-2: catches a supplier dispatch quantity written in the wrong domain', () => {
    const fixture = smokeFixture();
    const { data } = connectedOrder('SHIPPED');
    const { purchaseOrderId, supplierOrgId } = orderIds(data);
    const dispatchPath = pathsUnder(
      fixture,
      (parts) =>
        parts[0] === 'organizations' && parts[1] === supplierOrgId && parts[2] === 'stockMovements',
    ).find((path) => {
      const movement = fixture.snapshot.documents.get(path);
      return (
        movement?.['movementType'] === 'CONNECTED_DISPATCH_OUT' &&
        movement['sourceId'] === purchaseOrderId
      );
    });
    expect(dispatchPath).toBeDefined();
    if (dispatchPath === undefined) return;
    const movement = fixture.snapshot.documents.get(dispatchPath);
    const corrupted = (movement?.['signedQuantityMilli'] as number) * 5;
    const failures = verifyNetwork(
      mutatedSnapshot(fixture, dispatchPath, { signedQuantityMilli: corrupted }),
    );
    expect(failures.some((f) => f.includes('CONNECTED_DISPATCH_DOMAIN'))).toBe(true);
  });

  it('QA-3: catches a history row whose transition no cpo.* command can produce', () => {
    const fixture = smokeFixture();
    const { data } = connectedOrder('RECEIVED');
    const { purchaseOrderId } = orderIds(data);
    const firstHistoryPath = `connectedPurchaseOrders/${purchaseOrderId}/history/qa-cpoh-${purchaseOrderId}-01`;
    expect(fixture.snapshot.documents.has(firstHistoryPath)).toBe(true);
    const failures = verifyNetwork(
      mutatedSnapshot(fixture, firstHistoryPath, { toStatus: 'RECEIVED' }),
    );
    expect(failures.some((f) => f.includes('ILLEGAL_HISTORY_TRANSITION'))).toBe(true);
  });

  it('QA-3/QA-5: catches a missing organization mirror of a canonical history row', () => {
    const fixture = smokeFixture();
    const { data } = connectedOrder('SUBMITTED');
    const { purchaseOrderId, buyerOrgId } = orderIds(data);
    const historyId = `qa-cpoh-${purchaseOrderId}-01`;
    const mirrorPath = `organizations/${buyerOrgId}/purchaseOrders/${purchaseOrderId}/history/${historyId}`;
    expect(fixture.snapshot.documents.has(mirrorPath)).toBe(true);
    const failures = verifyNetwork(mutatedSnapshot(fixture, mirrorPath, undefined));
    expect(
      failures.some((f) => f.includes('CONNECTED_HISTORY_PARITY') && f.includes('missing')),
    ).toBe(true);
  });

  it('QA-5: catches a history row that disagrees between organizations', () => {
    const fixture = smokeFixture();
    const { data } = connectedOrder('ACCEPTED');
    const { purchaseOrderId, supplierOrgId } = orderIds(data);
    const historyId = `qa-cpoh-${purchaseOrderId}-02`;
    const mirrorPath = `organizations/${supplierOrgId}/purchaseOrders/${purchaseOrderId}/history/${historyId}`;
    expect(fixture.snapshot.documents.has(mirrorPath)).toBe(true);
    const failures = verifyNetwork(
      mutatedSnapshot(fixture, mirrorPath, { actorName: 'Someone Else' }),
    );
    expect(failures.some((f) => f.includes('CONNECTED_HISTORY_PARITY'))).toBe(true);
  });

  it('QA-5: catches a corrupted supplier item quantity (the exact DV finding)', () => {
    const fixture = smokeFixture();
    const { data } = connectedOrder('RECEIVED');
    const { purchaseOrderId, supplierOrgId } = orderIds(data);
    const itemPath = `organizations/${supplierOrgId}/purchaseOrders/${purchaseOrderId}/items/line-01`;
    expect(fixture.snapshot.documents.has(itemPath)).toBe(true);
    const failures = verifyNetwork(
      mutatedSnapshot(fixture, itemPath, { receivedBuyerBaseMilli: 5_000 }),
    );
    expect(failures.some((f) => f.includes('CONNECTED_ITEM_PARITY'))).toBe(true);
  });

  it('QA-5: catches a corrupted buyer item quantity', () => {
    const fixture = smokeFixture();
    const { data } = connectedOrder('RECEIVED');
    const { purchaseOrderId, buyerOrgId } = orderIds(data);
    const itemPath = `organizations/${buyerOrgId}/purchaseOrders/${purchaseOrderId}/items/line-01`;
    expect(fixture.snapshot.documents.has(itemPath)).toBe(true);
    const failures = verifyNetwork(
      mutatedSnapshot(fixture, itemPath, { orderedBuyerBaseMilli: 1 }),
    );
    expect(failures.some((f) => f.includes('CONNECTED_ITEM_PARITY'))).toBe(true);
  });

  it('QA-5: catches a corrupted canonical item quantity', () => {
    const fixture = smokeFixture();
    const { data } = connectedOrder('RECEIVED');
    const { purchaseOrderId } = orderIds(data);
    const itemPath = `connectedPurchaseOrders/${purchaseOrderId}/items/line-01`;
    expect(fixture.snapshot.documents.has(itemPath)).toBe(true);
    const failures = verifyNetwork(mutatedSnapshot(fixture, itemPath, { orderedSupplierMilli: 1 }));
    expect(failures.some((f) => f.includes('CONNECTED_ITEM_PARITY'))).toBe(true);
  });

  it('QA-5: catches a mismatched shared header field between projections', () => {
    const fixture = smokeFixture();
    const { path } = connectedOrder('SHIPPED');
    const failures = verifyNetwork(mutatedSnapshot(fixture, path, { totalMinor: 1 }));
    expect(failures.some((f) => f.includes('CONNECTED_HEADER_PARITY'))).toBe(true);
  });

  it('QA-4: catches receivingWarehouseId pinned before any receipt happened', () => {
    const fixture = smokeFixture();
    const { path } = connectedOrder('SUBMITTED');
    const failures = verifyNetwork(
      mutatedSnapshot(fixture, path, { receivingWarehouseId: 'main-store' }),
    );
    expect(
      failures.some((f) => f.includes('receivingWarehouseId') && f.includes('SUBMITTED')),
    ).toBe(true);
  });

  it('QA-4: catches receivingWarehouseId leaking onto the canonical record', () => {
    const fixture = smokeFixture();
    const { data } = connectedOrder('RECEIVED');
    const { purchaseOrderId } = orderIds(data);
    const canonicalPath = `connectedPurchaseOrders/${purchaseOrderId}`;
    const failures = verifyNetwork(
      mutatedSnapshot(fixture, canonicalPath, { receivingWarehouseId: 'main-store' }),
    );
    expect(failures.some((f) => f.includes('must not carry receivingWarehouseId'))).toBe(true);
  });
});

describe('QA authority preservation', () => {
  it('writes no invalid enum value', () => {
    expect(verifyAuthority(smokeFixture().snapshot).invalidEnumFailures).toEqual([]);
  });

  it('adds no production authority', () => {
    expect(verifyAuthority(smokeFixture().snapshot).authorityViolations).toEqual([]);
  });

  it('preserves the C-34 and notification mark-read gaps', () => {
    const report = verifyAuthority(smokeFixture().snapshot);
    // No command ran, so no command receipt and no audit log may claim one did.
    expect(report.c34GapPreserved).toBe(true);
    expect(report.notificationMarkReadGapPreserved).toBe(true);
  });
});
