import { describe, expect, it } from 'vitest';

import { verifyAuthority } from '../../scripts/qa/verify/authority.js';
import { verifyNetwork } from '../../scripts/qa/verify/network.js';
import { documentField, field, pathsUnder, smokeFixture } from './dataset-fixture.js';

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
