import { describe, expect, it } from 'vitest';

import { verifyProcurement } from '../../scripts/qa/verify/procurement.js';
import {
  documentField,
  mutatedSnapshot,
  pathsUnder,
  smokeFixture,
  withAddedDocument,
} from './dataset-fixture.js';

function privateOrders(): { path: string; status: unknown; viewRole: unknown }[] {
  const fixture = smokeFixture();
  return pathsUnder(
    fixture,
    (parts) => parts[0] === 'organizations' && parts[2] === 'purchaseOrders' && parts.length === 4,
  )
    .filter((path) => documentField(fixture, path, 'supplierKind') === 'PRIVATE')
    .map((path) => ({
      path,
      status: documentField(fixture, path, 'status'),
      viewRole: documentField(fixture, path, 'viewRole'),
    }));
}

describe('QA private procurement', () => {
  it('reconciles totals, receipts and both order counters', () => {
    expect(verifyProcurement(smokeFixture().snapshot)).toEqual([]);
  });

  it('covers the private order lifecycle', () => {
    const statuses = new Set(privateOrders().map((order) => order.status));
    expect(statuses).toEqual(
      new Set(['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED']),
    );
  });

  it('keeps every private order on the buyer side', () => {
    // `PrivatePurchaseOrderDraftClientWriteSchema` pins `viewRole` to the literal
    // 'BUYER', so a supplier-side private order is not a shape this system has.
    expect(new Set(privateOrders().map((order) => order.viewRole))).toEqual(new Set(['BUYER']));
  });

  it('represents private buyers as partners rather than as orders', () => {
    const fixture = smokeFixture();
    const partnerTypes = pathsUnder(
      fixture,
      (parts) => parts[0] === 'organizations' && parts[2] === 'privatePartners',
    ).flatMap((path) => {
      const types = documentField(fixture, path, 'partnerTypes');
      return Array.isArray(types) ? (types as readonly string[]) : [];
    });
    expect(new Set(partnerTypes)).toEqual(new Set(['SUPPLIER', 'BUYER']));
  });

  it('covers both active and deactivated partners', () => {
    const fixture = smokeFixture();
    const statuses = new Set(
      pathsUnder(
        fixture,
        (parts) => parts[0] === 'organizations' && parts[2] === 'privatePartners',
      ).map((path) => documentField(fixture, path, 'status')),
    );
    expect(statuses).toEqual(new Set(['ACTIVE', 'DEACTIVATED']));
  });

  it('holds a genuinely partial receipt', () => {
    const fixture = smokeFixture();
    const partial = privateOrders().find((order) => order.status === 'PARTIALLY_RECEIVED');
    expect(partial).toBeDefined();
    if (partial === undefined) return;

    const lines = pathsUnder(
      fixture,
      (parts) => parts.length === 6 && parts.slice(0, 4).join('/') === partial.path,
    );

    const received = lines.map((path) =>
      Number(documentField(fixture, path, 'receivedBuyerBaseMilli') ?? 0),
    );
    const ordered = lines.map((path) =>
      Number(documentField(fixture, path, 'orderedBuyerBaseMilli') ?? 0),
    );
    expect(received.some((value) => value > 0)).toBe(true);
    expect(received.every((value, index) => value === ordered[index])).toBe(false);
  });

  it('publishes a supplier partner catalog', () => {
    const fixture = smokeFixture();
    const catalog = pathsUnder(
      fixture,
      (parts) => parts[0] === 'organizations' && parts[2] === 'partnerCatalog',
    );
    expect(catalog.length).toBeGreaterThan(0);
    for (const path of catalog) {
      expect(documentField(fixture, path, 'published')).toBe(true);
    }
  });

  it("gives every catalog item an orderUnit equal to its source product's baseUnit (INV-17)", () => {
    const fixture = smokeFixture();
    const catalog = pathsUnder(
      fixture,
      (parts) => parts[0] === 'organizations' && parts[2] === 'partnerCatalog',
    );
    expect(catalog.length).toBeGreaterThan(0);
    for (const path of catalog) {
      const org = path.split('/')[1];
      const sourceProductId = documentField(fixture, path, 'sourceProductId');
      const product = fixture.snapshot.documents.get(
        `organizations/${String(org)}/products/${String(sourceProductId)}`,
      );
      expect(documentField(fixture, path, 'orderUnit')).toBe(product?.['baseUnit']);
    }
  });
});

describe('QA private procurement — negative coverage (regressions for DV review findings)', () => {
  it('QA-1: catches a catalog orderUnit that disagrees with its source product baseUnit (INV-17)', () => {
    const fixture = smokeFixture();
    const catalogPath = pathsUnder(
      fixture,
      (parts) => parts[0] === 'organizations' && parts[2] === 'partnerCatalog',
    )[0];
    expect(catalogPath).toBeDefined();
    if (catalogPath === undefined) return;
    const currentUnit = documentField(fixture, catalogPath, 'orderUnit');
    const wrongUnit = currentUnit === 'PACK' ? 'KG' : 'PACK';
    const failures = verifyProcurement(
      mutatedSnapshot(fixture, catalogPath, { orderUnit: wrongUnit }),
    );
    expect(failures.some((f) => f.includes('INV-17'))).toBe(true);
  });

  it('QA-7: a colliding sourceId/productId pair in another organization does not corrupt reconciliation', () => {
    const fixture = smokeFixture();
    const [receiptPath, receiptData] =
      [...fixture.snapshot.documents.entries()].find(
        ([path, data]) =>
          path.split('/')[2] === 'stockMovements' && data['movementType'] === 'PURCHASE_RECEIPT',
      ) ?? [];
    expect(receiptPath).toBeDefined();
    if (receiptPath === undefined || receiptData === undefined) return;

    const org = receiptPath.split('/')[1];
    const otherOrg = pathsUnder(
      fixture,
      (parts) => parts[0] === 'organizations' && parts.length === 2,
    )
      .map((path) => path.split('/')[1])
      .find((candidate) => candidate !== org);
    expect(otherOrg).toBeDefined();
    if (otherOrg === undefined) return;

    // Same sourceId + productId as a real receipt, but living under a
    // *different* tenant — the pre-fix unscoped key would have summed this
    // into the original organization's reconciliation and doubled it.
    const snapshot = withAddedDocument(
      fixture,
      `organizations/${otherOrg}/stockMovements/qa-mv-tenant-collision-test`,
      { ...receiptData, movementId: 'qa-mv-tenant-collision-test' },
    );
    expect(verifyProcurement(snapshot)).toEqual([]);
  });
});
