import type { Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  partnerCatalogList,
  partnerCatalogLookupBySku,
  partnerCatalogPublish,
  partnerCatalogUnpublish,
} from '../../functions/src/commands/partner-catalog.js';
import { paths } from '../../packages/shared/src/paths.js';
import {
  callable,
  clearFirestore,
  collectionOf,
  connectionIdFor,
  ORG_A,
  ORG_B,
  seedConnection,
  seedMember,
  seedOrganization,
  seedPartnerCatalogItem,
  seedProduct,
  seedProductStockSummary,
  seedSettings,
  seedStockBalance,
  seedWarehouse,
  testDb,
  uidFor,
} from './harness.js';

let db: Firestore;

/**
 * `C-21` … `C-24` — DB-02 §6.1, DB-04 §6 (`Q-046`/`Q-047`), `INV-13`, `INV-17`,
 * `T-SEC-38`.
 *
 * `ORG_B` is the supplier and `ORG_A` the connected buyer, so every privacy
 * assertion is made against **a connected party** — the more interesting
 * attacker than an unrelated organization (DB-05 §8).
 */

const CONNECTION_ID = connectionIdFor(ORG_A, ORG_B);
const SUPPLIER_PRODUCT = 'product-chicken-pack';
const CATALOG_ITEM = 'catalog-chicken';

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

function dataOf(result: { ok: boolean; data?: unknown }): Record<string, unknown> {
  return (result.data ?? {}) as Record<string, unknown>;
}

async function seedBase(): Promise<void> {
  await clearFirestore();
  for (const orgId of [ORG_A, ORG_B]) {
    await seedOrganization(db, orgId);
    await seedSettings(db, orgId);
    await seedWarehouse(db, orgId, 'warehouse-main', { name: 'Main Store' });
    for (const role of ALL_ROLES) await seedMember(db, orgId, role);
  }
  // The supplier's private product — exact cost, exact stock, both of which
  // must remain invisible to the connected buyer.
  await seedProduct(db, ORG_B, SUPPLIER_PRODUCT, {
    name: 'Chicken Breast 5 KG Pack',
    internalSku: 'FF-CHK-05',
    internalSkuNormalized: 'FF-CHK-05',
    baseUnit: 'PACK',
    purchaseCostMinor: 550_000,
    currency: 'LKR',
    minimumStockMilli: 20_000,
  });
  await seedStockBalance(db, ORG_B, SUPPLIER_PRODUCT, 'warehouse-main', {
    onHandMilli: 200_000,
    unit: 'PACK',
    baseUnitPriceMinor: 550_000,
    stockValueMinor: 110_000_000,
    stockStatus: 'IN_STOCK',
    shortfallMilli: 0,
  });
  await seedProductStockSummary(db, ORG_B, SUPPLIER_PRODUCT, {
    onHandMilli: 200_000,
    availableMilli: 200_000,
    unit: 'PACK',
    baseUnitPriceMinor: 550_000,
    stockValueMinor: 110_000_000,
    stockStatus: 'IN_STOCK',
    minimumStockMilli: 20_000,
    shortfallMilli: 0,
  });
  await seedConnection(db, ORG_A, ORG_B, 'ACTIVE');
}

const publishBy = (
  role: (typeof ALL_ROLES)[number] = 'PROCUREMENT_MANAGER',
  overrides: Record<string, unknown> = {},
) =>
  partnerCatalogPublish.execute(
    callable(uidFor(ORG_B, role), {
      orgId: ORG_B,
      payload: {
        sourceProductId: SUPPLIER_PRODUCT,
        partnerSku: 'CKN-B5',
        displayName: 'Chicken Breast 5 KG Pack',
        orderUnit: 'PACK',
        packDescription: '5 KG',
        ...overrides,
      },
    }),
    db,
  );

const listBy = (orgId: string, role: (typeof ALL_ROLES)[number], limit = 25) =>
  partnerCatalogList.execute(
    callable(uidFor(orgId, role), { orgId, payload: { connectionId: CONNECTION_ID, limit } }),
    db,
  );

const lookupBy = (orgId: string, role: (typeof ALL_ROLES)[number], partnerSku: string) =>
  partnerCatalogLookupBySku.execute(
    callable(uidFor(orgId, role), { orgId, payload: { connectionId: CONNECTION_ID, partnerSku } }),
    db,
  );

beforeAll(() => {
  db = testDb();
});
beforeEach(seedBase);

// ───────────────────────────────────────────────────────────────────────────
describe('C-21 partnerCatalog.publish', () => {
  it('creates the item, flags the product and audits once', async () => {
    const result = await publishBy();
    expect(result.ok).toBe(true);
    const catalogItemId = dataOf(result).catalogItemId as string;

    const item = await db.doc(paths.partnerCatalogItem(ORG_B, catalogItemId)).get();
    expect(item.get('published')).toBe(true);
    expect(item.get('partnerSku')).toBe('CKN-B5');
    expect(item.get('partnerSkuNormalized')).toBe('CKN-B5');
    expect(item.get('orderUnit')).toBe('PACK');
    expect(item.get('availabilityState')).toBe('IN_STOCK');
    expect(item.get('sourceProductId')).toBe(SUPPLIER_PRODUCT);

    const product = await db.doc(paths.product(ORG_B, SUPPLIER_PRODUCT)).get();
    expect(product.get('partnerPublished')).toBe(true);

    const audits = await collectionOf(db, ORG_B, 'auditLogs');
    expect(audits).toHaveLength(1);
    expect(audits[0]?.get('action')).toBe('partnerCatalog.publish');
    // Non-idempotent: no receipt is written.
    expect(await collectionOf(db, ORG_B, 'commandReceipts')).toHaveLength(0);
  });

  it('INV-17 — an orderUnit that is not the product’s baseUnit is refused, nothing written', async () => {
    const result = await publishBy('OWNER', { orderUnit: 'KG' });
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('SCHEMA_INVALID');
    expect(await collectionOf(db, ORG_B, 'partnerCatalog')).toHaveLength(0);
    expect(
      (await db.doc(paths.product(ORG_B, SUPPLIER_PRODUCT)).get()).get('partnerPublished'),
    ).toBe(false);
  });

  it('refuses a duplicate partner SKU among PUBLISHED items, case-insensitively', async () => {
    await publishBy();
    await seedProduct(db, ORG_B, 'product-other', { baseUnit: 'PACK', name: 'Other Pack' });
    const clash = await partnerCatalogPublish.execute(
      callable(uidFor(ORG_B, 'OWNER'), {
        orgId: ORG_B,
        payload: {
          sourceProductId: 'product-other',
          partnerSku: 'ckn-b5',
          displayName: 'Other Pack',
          orderUnit: 'PACK',
        },
      }),
      db,
    );
    expect(clash.ok).toBe(false);
    expect(reasonOf(clash)).toBe('SKU_TAKEN');
    expect(await collectionOf(db, ORG_B, 'partnerCatalog')).toHaveLength(1);
  });

  it('an UNPUBLISHED item does not hold its SKU — uniqueness is scoped to the published catalog', async () => {
    const first = await publishBy();
    const catalogItemId = dataOf(first).catalogItemId as string;
    await partnerCatalogUnpublish.execute(
      callable(uidFor(ORG_B, 'OWNER'), { orgId: ORG_B, payload: { catalogItemId } }),
      db,
    );
    await seedProduct(db, ORG_B, 'product-other', { baseUnit: 'PACK', name: 'Other Pack' });
    const reuse = await partnerCatalogPublish.execute(
      callable(uidFor(ORG_B, 'OWNER'), {
        orgId: ORG_B,
        payload: {
          sourceProductId: 'product-other',
          partnerSku: 'CKN-B5',
          displayName: 'Other Pack',
          orderUnit: 'PACK',
        },
      }),
      db,
    );
    expect(reuse.ok).toBe(true);
  });

  it('refuses an already-published product and an archived one', async () => {
    await publishBy();
    const again = await publishBy('OWNER', { partnerSku: 'CKN-B6' });
    expect(reasonOf(again)).toBe('INVALID_TRANSITION');

    await db.doc(paths.product(ORG_B, SUPPLIER_PRODUCT)).update({ status: 'ARCHIVED' });
    await db.doc(paths.product(ORG_B, SUPPLIER_PRODUCT)).update({ partnerPublished: false });
    const archived = await publishBy('OWNER', { partnerSku: 'CKN-B7' });
    expect(reasonOf(archived)).toBe('PRODUCT_NOT_ACTIVE');
  });

  it('refuses a product belonging to another organization', async () => {
    await seedProduct(db, ORG_A, 'product-buyer-only', { baseUnit: 'PACK' });
    const result = await publishBy('OWNER', { sourceProductId: 'product-buyer-only' });
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('CROSS_TENANT_REFERENCE');
  });

  it('is PARTNER_WRITERS only', async () => {
    for (const role of ['INVENTORY_MANAGER', 'STOREKEEPER', 'ANALYST', 'VIEWER'] as const) {
      await seedBase();
      const result = await publishBy(role);
      expect(result.ok, role).toBe(false);
      expect(reasonOf(result), role).toBe('ROLE_NOT_PERMITTED');
    }
  });

  it('records availability as OUT_OF_STOCK when the supplier holds none — and never a quantity', async () => {
    await db.doc(paths.productStockSummary(ORG_B, SUPPLIER_PRODUCT)).update({ onHandMilli: 0 });
    const result = await publishBy();
    const item = await db
      .doc(paths.partnerCatalogItem(ORG_B, dataOf(result).catalogItemId as string))
      .get();
    expect(item.get('availabilityState')).toBe('OUT_OF_STOCK');
    const keys = Object.keys(item.data() ?? {});
    expect(keys).not.toContain('onHandMilli');
    expect(keys).not.toContain('stockValueMinor');
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('C-22 partnerCatalog.unpublish', () => {
  it('keeps the document and clears both flags (INV-15)', async () => {
    const published = await publishBy();
    const catalogItemId = dataOf(published).catalogItemId as string;

    const result = await partnerCatalogUnpublish.execute(
      callable(uidFor(ORG_B, 'PROCUREMENT_MANAGER'), { orgId: ORG_B, payload: { catalogItemId } }),
      db,
    );
    expect(result.ok).toBe(true);

    const item = await db.doc(paths.partnerCatalogItem(ORG_B, catalogItemId)).get();
    // Not deleted — a mapping and every historical order line must still resolve.
    expect(item.exists).toBe(true);
    expect(item.get('published')).toBe(false);
    expect(
      (await db.doc(paths.product(ORG_B, SUPPLIER_PRODUCT)).get()).get('partnerPublished'),
    ).toBe(false);
  });

  it('refuses an already-unpublished item and a foreign item', async () => {
    const published = await publishBy();
    const catalogItemId = dataOf(published).catalogItemId as string;
    await partnerCatalogUnpublish.execute(
      callable(uidFor(ORG_B, 'OWNER'), { orgId: ORG_B, payload: { catalogItemId } }),
      db,
    );
    const again = await partnerCatalogUnpublish.execute(
      callable(uidFor(ORG_B, 'OWNER'), { orgId: ORG_B, payload: { catalogItemId } }),
      db,
    );
    expect(reasonOf(again)).toBe('INVALID_TRANSITION');

    const foreign = await partnerCatalogUnpublish.execute(
      callable(uidFor(ORG_A, 'OWNER'), { orgId: ORG_A, payload: { catalogItemId } }),
      db,
    );
    expect(reasonOf(foreign)).toBe('CROSS_TENANT_REFERENCE');
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('C-23 / C-24 — the buyer’s only view of a supplier’s inventory', () => {
  beforeEach(async () => {
    await seedPartnerCatalogItem(db, ORG_B, CATALOG_ITEM, {
      sourceProductId: SUPPLIER_PRODUCT,
      wholesalePriceMinor: 600_000,
      currency: 'LKR',
    });
  });

  it('lists published items ordered by normalised SKU', async () => {
    await seedPartnerCatalogItem(db, ORG_B, 'catalog-butter', {
      partnerSku: 'BTR-1K',
      displayName: 'Butter Block 1 KG',
      orderUnit: 'KG',
      sourceProductId: 'product-butter',
    });
    const result = await listBy(ORG_A, 'PROCUREMENT_MANAGER');
    expect(result.ok).toBe(true);
    const items = dataOf(result).items as Record<string, unknown>[];
    expect(items.map((item) => item.partnerSku)).toEqual(['BTR-1K', 'CKN-B5']);
    expect(dataOf(result).count).toBe(2);
  });

  it('excludes unpublished items', async () => {
    await db.doc(paths.partnerCatalogItem(ORG_B, CATALOG_ITEM)).update({ published: false });
    const result = await listBy(ORG_A, 'OWNER');
    expect((dataOf(result).items as unknown[]).length).toBe(0);
  });

  it('T-SEC-38 — the response carries no supplier-private field whatsoever', async () => {
    const result = await listBy(ORG_A, 'OWNER');
    const [item] = dataOf(result).items as Record<string, unknown>[];
    expect(item).toBeDefined();
    // The complete allow-list, asserted as an exact key set: a field added to
    // the stored document cannot silently join the projection.
    expect(Object.keys(item ?? {}).sort()).toEqual(
      [
        'catalogItemId',
        'partnerSku',
        'displayName',
        'orderUnit',
        'availabilityState',
        'packDescription',
        'wholesalePriceMinor',
        'currency',
      ].sort(),
    );
    for (const forbidden of [
      'internalProductNameSnapshot',
      'internalSkuSnapshot',
      'sourceProductId',
      'published',
      'partnerSkuNormalized',
      'onHandMilli',
      'purchaseCostMinor',
      'stockValueMinor',
      'warehouseId',
    ]) {
      expect(Object.keys(item ?? {}), forbidden).not.toContain(forbidden);
    }
  });

  it('lookupBySku resolves case-insensitively and returns the same allow-list', async () => {
    const result = await lookupBy(ORG_A, 'PROCUREMENT_MANAGER', 'ckn-b5');
    expect(result.ok).toBe(true);
    const item = dataOf(result).item as Record<string, unknown>;
    expect(item.catalogItemId).toBe(CATALOG_ITEM);
    expect(Object.keys(item)).not.toContain('internalSkuSnapshot');
  });

  it('an unknown SKU is SKU_NOT_FOUND', async () => {
    const result = await lookupBy(ORG_A, 'OWNER', 'NOPE-1');
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('SKU_NOT_FOUND');
  });

  it('an unpublished item is invisible to lookup as well as to list', async () => {
    await db.doc(paths.partnerCatalogItem(ORG_B, CATALOG_ITEM)).update({ published: false });
    const result = await lookupBy(ORG_A, 'OWNER', 'CKN-B5');
    expect(reasonOf(result)).toBe('SKU_NOT_FOUND');
  });

  it('the SUPPLIER cannot read the catalog through the buyer callables — wrong side', async () => {
    for (const call of [listBy(ORG_B, 'OWNER'), lookupBy(ORG_B, 'OWNER', 'CKN-B5')]) {
      const result = await call;
      expect(result.ok).toBe(false);
      expect(reasonOf(result)).toBe('CROSS_TENANT_REFERENCE');
    }
  });

  it('a DISABLED or PENDING connection closes the catalog immediately', async () => {
    for (const status of ['PENDING', 'REJECTED', 'DISABLED'] as const) {
      await seedConnection(db, ORG_A, ORG_B, status);
      const list = await listBy(ORG_A, 'OWNER');
      expect(list.ok, status).toBe(false);
      expect(reasonOf(list), status).toBe('CONNECTION_NOT_ACTIVE');
      const lookup = await lookupBy(ORG_A, 'OWNER', 'CKN-B5');
      expect(reasonOf(lookup), status).toBe('CONNECTION_NOT_ACTIVE');
    }
  });

  it('is PARTNER_WRITERS only, and persists nothing at all', async () => {
    for (const role of ['INVENTORY_MANAGER', 'STOREKEEPER', 'ANALYST', 'VIEWER'] as const) {
      const result = await listBy(ORG_A, role);
      expect(result.ok, role).toBe(false);
      expect(reasonOf(result), role).toBe('ROLE_NOT_PERMITTED');
    }
    await listBy(ORG_A, 'OWNER');
    await lookupBy(ORG_A, 'OWNER', 'CKN-B5');
    // A read that logged would be a read that wrote.
    for (const orgId of [ORG_A, ORG_B]) {
      expect(await collectionOf(db, orgId, 'auditLogs')).toHaveLength(0);
      expect(await collectionOf(db, orgId, 'commandReceipts')).toHaveLength(0);
    }
  });

  it('the page is hard-bounded server-side however large a limit is asked for', async () => {
    for (let index = 0; index < 5; index += 1) {
      await seedPartnerCatalogItem(db, ORG_B, `catalog-bulk-${String(index)}`, {
        partnerSku: `BULK-${String(index)}`,
        sourceProductId: `product-bulk-${String(index)}`,
      });
    }
    const result = await listBy(ORG_A, 'OWNER', 100);
    expect(result.ok).toBe(true);
    expect(dataOf(result).count).toBe(6);

    const overLimit = await partnerCatalogList.execute(
      callable(uidFor(ORG_A, 'OWNER'), {
        orgId: ORG_A,
        payload: { connectionId: CONNECTION_ID, limit: 101 },
      }),
      db,
    );
    expect(overLimit.ok).toBe(false);
    expect(reasonOf(overLimit)).toBe('SCHEMA_INVALID');

    const paged = await listBy(ORG_A, 'OWNER', 2);
    expect(dataOf(paged).count).toBe(2);
  });
});
