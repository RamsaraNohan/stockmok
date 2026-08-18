import type { Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mappingCreate, mappingDisable } from '../../functions/src/commands/mapping.js';
import { paths } from '../../packages/shared/src/paths.js';
import {
  callable,
  clearFirestore,
  collectionOf,
  connectionIdFor,
  ORG_A,
  ORG_B,
  OPERATION_ID_A,
  seedConnection,
  seedMember,
  seedOrganization,
  seedPartnerCatalogItem,
  seedProduct,
  seedSettings,
  testDb,
  uidFor,
} from './harness.js';

let db: Firestore;

/**
 * `C-25`, `C-26` — DB-07 §7's seven server re-validations, `Q-070` on `IDX-32`,
 * DB-02 §6.2.
 *
 * The canonical pairing throughout: the buyer's **Chicken Breast (KG)** mapped to
 * the supplier's **Chicken Breast 5 KG Pack (PACK)** at `1 PACK = 5 KG`, i.e.
 * `supplierToBuyerBaseFactorMilli = 5 000` (DB-08 §3/§4).
 */

const CONNECTION_ID = connectionIdFor(ORG_A, ORG_B);
const BUYER_PRODUCT = 'product-chicken';
const CATALOG_ITEM = 'catalog-chicken';
const FACTOR_MILLI = 5000;

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
    for (const role of ALL_ROLES) await seedMember(db, orgId, role);
  }
  await seedProduct(db, ORG_A, BUYER_PRODUCT, {
    name: 'Chicken Breast',
    internalSku: 'MEAT-001',
    internalSkuNormalized: 'MEAT-001',
    baseUnit: 'KG',
    purchaseCostMinor: 125_000,
    currency: 'LKR',
  });
  // The supplier's PRIVATE product carries the exact internal facts a mapping
  // must never copy.
  await seedProduct(db, ORG_B, 'product-chicken-pack', {
    name: 'Chicken Breast 5 KG Pack',
    internalSku: 'FF-CHK-05',
    internalSkuNormalized: 'FF-CHK-05',
    baseUnit: 'PACK',
    purchaseCostMinor: 550_000,
    currency: 'LKR',
  });
  await seedPartnerCatalogItem(db, ORG_B, CATALOG_ITEM);
  await seedConnection(db, ORG_A, ORG_B, 'ACTIVE');
}

const createBy = (
  role: (typeof ALL_ROLES)[number] = 'PROCUREMENT_MANAGER',
  overrides: Record<string, unknown> = {},
  operationId = OPERATION_ID_A,
) =>
  mappingCreate.execute(
    callable(uidFor(ORG_A, role), {
      orgId: ORG_A,
      operationId,
      payload: {
        connectionId: CONNECTION_ID,
        buyerProductId: BUYER_PRODUCT,
        supplierCatalogItemId: CATALOG_ITEM,
        typedPartnerSku: 'CKN-B5',
        supplierToBuyerBaseFactorMilli: FACTOR_MILLI,
        semanticConfirmed: true,
        ...overrides,
      },
    }),
    db,
  );

beforeAll(() => {
  db = testDb();
});
beforeEach(seedBase);

// ───────────────────────────────────────────────────────────────────────────
describe('C-25 mapping.create — the seven server re-validations', () => {
  it('creates a VERIFIED mapping under the BUYER organization', async () => {
    const result = await createBy();
    expect(result.ok).toBe(true);
    const mappingId = dataOf(result).mappingId as string;

    const mapping = await db.doc(paths.productMapping(ORG_A, mappingId)).get();
    expect(mapping.get('status')).toBe('VERIFIED');
    expect(mapping.get('buyerOrgId')).toBe(ORG_A);
    expect(mapping.get('supplierOrgId')).toBe(ORG_B);
    expect(mapping.get('supplierCatalogItemId')).toBe(CATALOG_ITEM);
    expect(mapping.get('buyerBaseUnit')).toBe('KG');
    expect(mapping.get('supplierOrderUnit')).toBe('PACK');
    expect(mapping.get('supplierToBuyerBaseFactorMilli')).toBe(FACTOR_MILLI);
    expect(mapping.get('semanticConfirmedByUid')).toBe(uidFor(ORG_A, 'PROCUREMENT_MANAGER'));

    // Stored under the buyer, and nowhere else: the factor is the buyer's
    // commercial data and the supplier has no need of it.
    expect(await collectionOf(db, ORG_B, 'productMappings')).toHaveLength(0);
  });

  it('stores only catalog-derived supplier snapshots — never the private product', async () => {
    const result = await createBy();
    const mapping = await db
      .doc(paths.productMapping(ORG_A, dataOf(result).mappingId as string))
      .get();
    expect(mapping.get('supplierPartnerSkuSnapshot')).toBe('CKN-B5');
    expect(mapping.get('supplierDisplayNameSnapshot')).toBe('Chicken Breast 5 KG Pack');
    // The supplier's internal SKU and cost exist on the private product and on
    // the catalog item's supplier-only snapshots; neither reaches the buyer.
    const values = Object.values(mapping.data() ?? {});
    expect(values).not.toContain('FF-CHK-05');
    expect(values).not.toContain(550_000);
    expect(Object.keys(mapping.data() ?? {})).not.toContain('sourceProductId');
  });

  it('2 — refuses a connection that is not ACTIVE', async () => {
    for (const status of ['PENDING', 'REJECTED', 'DISABLED'] as const) {
      await seedConnection(db, ORG_A, ORG_B, status);
      const result = await createBy();
      expect(result.ok, status).toBe(false);
      expect(reasonOf(result), status).toBe('CONNECTION_NOT_ACTIVE');
      expect(await collectionOf(db, ORG_A, 'productMappings'), status).toHaveLength(0);
    }
  });

  it('2 — refuses the SUPPLIER acting as buyer on its own connection', async () => {
    const result = await mappingCreate.execute(
      callable(uidFor(ORG_B, 'OWNER'), {
        orgId: ORG_B,
        operationId: OPERATION_ID_A,
        payload: {
          connectionId: CONNECTION_ID,
          buyerProductId: 'product-chicken-pack',
          supplierCatalogItemId: CATALOG_ITEM,
          typedPartnerSku: 'CKN-B5',
          supplierToBuyerBaseFactorMilli: FACTOR_MILLI,
          semanticConfirmed: true,
        },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('CROSS_TENANT_REFERENCE');
  });

  it('3 — refuses a foreign or archived buyer product', async () => {
    const foreign = await createBy('OWNER', { buyerProductId: 'product-chicken-pack' });
    expect(reasonOf(foreign)).toBe('CROSS_TENANT_REFERENCE');

    await db.doc(paths.product(ORG_A, BUYER_PRODUCT)).update({ status: 'ARCHIVED' });
    const archived = await createBy('OWNER');
    expect(reasonOf(archived)).toBe('PRODUCT_NOT_ACTIVE');
  });

  it('4 — refuses an unpublished catalog item', async () => {
    await db.doc(paths.partnerCatalogItem(ORG_B, CATALOG_ITEM)).update({ published: false });
    const result = await createBy();
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('CATALOG_ITEM_NOT_PUBLISHED');
  });

  it('4 — refuses a typed SKU that does not match the resolved item', async () => {
    const result = await createBy('OWNER', { typedPartnerSku: 'BTR-1K' });
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('SKU_NOT_FOUND');
    expect(await collectionOf(db, ORG_A, 'productMappings')).toHaveLength(0);
  });

  it('4 — the typed SKU is a lookup key, not the stored link: casing does not matter', async () => {
    const result = await createBy('OWNER', { typedPartnerSku: 'ckn-b5' });
    expect(result.ok).toBe(true);
    const mapping = await db
      .doc(paths.productMapping(ORG_A, dataOf(result).mappingId as string))
      .get();
    // What is persisted is the resolved id, never the string that was typed.
    expect(mapping.get('supplierCatalogItemId')).toBe(CATALOG_ITEM);
  });

  it('4 — a catalog item belonging to a different supplier does not resolve', async () => {
    await seedOrganization(db, 'org-other-supplier');
    await seedPartnerCatalogItem(db, 'org-other-supplier', 'catalog-elsewhere', {
      partnerSku: 'CKN-B5',
    });
    const result = await createBy('OWNER', { supplierCatalogItemId: 'catalog-elsewhere' });
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('RESOURCE_NOT_FOUND');
  });

  it('6 — a zero or negative factor is refused by the payload schema', async () => {
    for (const factor of [0, -5000]) {
      const result = await createBy('OWNER', { supplierToBuyerBaseFactorMilli: factor });
      expect(result.ok, String(factor)).toBe(false);
      expect(reasonOf(result), String(factor)).toBe('SCHEMA_INVALID');
      expect(await collectionOf(db, ORG_A, 'productMappings')).toHaveLength(0);
    }
  });

  it('5 — semanticConfirmed must be exactly true; a valid SKU alone is not sufficient', async () => {
    const result = await createBy('OWNER', { semanticConfirmed: false });
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe('SCHEMA_INVALID');
    expect(await collectionOf(db, ORG_A, 'productMappings')).toHaveLength(0);
  });

  it('7 — Q-070 refuses a second VERIFIED mapping for the same pair', async () => {
    await createBy();
    const duplicate = await createBy('OWNER', {}, '77777777-8888-4999-8aaa-bbbbbbbbbbbb');
    expect(duplicate.ok).toBe(false);
    expect(reasonOf(duplicate)).toBe('MAPPING_EXISTS');
    expect(await collectionOf(db, ORG_A, 'productMappings')).toHaveLength(1);
  });

  it('7 — a DISABLED mapping does not block a fresh one for the same pair', async () => {
    const first = await createBy();
    await mappingDisable.execute(
      callable(uidFor(ORG_A, 'OWNER'), {
        orgId: ORG_A,
        payload: { mappingId: dataOf(first).mappingId as string },
      }),
      db,
    );
    const again = await createBy('OWNER', {}, '88888888-9999-4aaa-8bbb-cccccccccccc');
    expect(again.ok).toBe(true);
    expect(await collectionOf(db, ORG_A, 'productMappings')).toHaveLength(2);
  });

  it('is PARTNER_WRITERS only', async () => {
    for (const role of ['INVENTORY_MANAGER', 'STOREKEEPER', 'ANALYST', 'VIEWER'] as const) {
      await seedBase();
      const result = await createBy(role);
      expect(result.ok, role).toBe(false);
      expect(reasonOf(result), role).toBe('ROLE_NOT_PERMITTED');
    }
  });

  it('is idempotent: replay returns the stored result and writes no second mapping', async () => {
    const first = await createBy();
    const replay = await createBy();
    expect(replay.ok).toBe(true);
    expect(dataOf(replay).mappingId).toBe(dataOf(first).mappingId);
    expect(await collectionOf(db, ORG_A, 'productMappings')).toHaveLength(1);
    expect(await collectionOf(db, ORG_A, 'auditLogs')).toHaveLength(1);
  });

  it('the same operationId with a different factor is refused', async () => {
    await createBy();
    const changed = await createBy('PROCUREMENT_MANAGER', {
      supplierToBuyerBaseFactorMilli: 6000,
    });
    expect(changed.ok).toBe(false);
    expect(reasonOf(changed)).toBe('OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD');
    const mappings = await collectionOf(db, ORG_A, 'productMappings');
    expect(mappings).toHaveLength(1);
    expect(mappings[0]?.get('supplierToBuyerBaseFactorMilli')).toBe(FACTOR_MILLI);
  });

  it('audits in the buyer organization only — a mapping is not the supplier’s business', async () => {
    await createBy();
    const buyerAudits = await collectionOf(db, ORG_A, 'auditLogs');
    expect(buyerAudits).toHaveLength(1);
    expect(buyerAudits[0]?.get('action')).toBe('mapping.create');
    expect(await collectionOf(db, ORG_B, 'auditLogs')).toHaveLength(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
describe('C-26 mapping.disable', () => {
  it('VERIFIED → DISABLED, keeping the document (INV-15)', async () => {
    const created = await createBy();
    const mappingId = dataOf(created).mappingId as string;

    const result = await mappingDisable.execute(
      callable(uidFor(ORG_A, 'PROCUREMENT_MANAGER'), { orgId: ORG_A, payload: { mappingId } }),
      db,
    );
    expect(result.ok).toBe(true);

    const mapping = await db.doc(paths.productMapping(ORG_A, mappingId)).get();
    expect(mapping.exists).toBe(true);
    expect(mapping.get('status')).toBe('DISABLED');
    expect(mapping.get('disabledAt')).toBeDefined();
    // Still carries its factor, so a historical order line renders unchanged.
    expect(mapping.get('supplierToBuyerBaseFactorMilli')).toBe(FACTOR_MILLI);
  });

  it('DISABLED is terminal, and a foreign mapping is refused', async () => {
    const created = await createBy();
    const mappingId = dataOf(created).mappingId as string;
    await mappingDisable.execute(
      callable(uidFor(ORG_A, 'OWNER'), { orgId: ORG_A, payload: { mappingId } }),
      db,
    );
    const again = await mappingDisable.execute(
      callable(uidFor(ORG_A, 'OWNER'), { orgId: ORG_A, payload: { mappingId } }),
      db,
    );
    expect(reasonOf(again)).toBe('INVALID_TRANSITION');

    const foreign = await mappingDisable.execute(
      callable(uidFor(ORG_B, 'OWNER'), { orgId: ORG_B, payload: { mappingId } }),
      db,
    );
    expect(reasonOf(foreign)).toBe('CROSS_TENANT_REFERENCE');
  });

  it('carries no operationId and writes no receipt', async () => {
    const created = await createBy();
    await mappingDisable.execute(
      callable(uidFor(ORG_A, 'OWNER'), {
        orgId: ORG_A,
        payload: { mappingId: dataOf(created).mappingId as string },
      }),
      db,
    );
    // One receipt only — mapping.create's. mapping.disable writes none.
    expect(await collectionOf(db, ORG_A, 'commandReceipts')).toHaveLength(1);
  });
});
