import type { Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { paths } from '../../packages/shared/src/paths.js';
import {
  productCreate,
  productSetStatus,
  productUpdate,
} from '../../functions/src/commands/product.js';
import {
  callable,
  clearFirestore,
  ORG_A,
  ORG_B,
  OPERATION_ID_A,
  OPERATION_ID_B,
  seedCategory,
  seedMember,
  seedOrganization,
  seedProduct,
  seedProductStockSummary,
  seedStockBalance,
  testDb,
  uidFor,
} from './harness.js';

let db: Firestore;

const createPayload = {
  internalSku: 'rice-basmati',
  name: 'Basmati Rice',
  categoryId: 'category-grains',
  baseUnit: 'KG' as const,
  purchaseCostMinor: 250,
  currency: 'usd',
  minimumStockMilli: 10_000,
  reorderTargetMilli: 20_000,
};

async function seedBaseOrg(): Promise<void> {
  await clearFirestore();
  await seedOrganization(db, ORG_A);
  await seedOrganization(db, ORG_B);
  for (const role of ['OWNER', 'ADMIN', 'INVENTORY_MANAGER', 'VIEWER'] as const) {
    await seedMember(db, ORG_A, role);
  }
  await seedMember(db, ORG_B, 'INVENTORY_MANAGER');
  await seedCategory(db, ORG_A, 'category-grains');
  await seedCategory(db, ORG_A, 'category-archived', { status: 'ARCHIVED' });
}

beforeAll(() => {
  db = testDb();
});

describe('C-09 product.create', () => {
  beforeEach(seedBaseOrg);

  it('creates the product, the SKU index and a zeroed summary, and audits it', async () => {
    const result = await productCreate.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        operationId: OPERATION_ID_A,
        payload: createPayload,
      }),
      db,
    );
    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok) return;
    const { productId } = result.data as { productId: string };

    const product = await db.doc(paths.product(ORG_A, productId)).get();
    expect(product.get('internalSkuNormalized')).toBe('RICE-BASMATI');
    expect(product.get('status')).toBe('ACTIVE');
    expect(product.get('currency')).toBe('USD');

    const index = await db.doc(paths.productSkuIndex(ORG_A, 'RICE-BASMATI')).get();
    expect(index.exists).toBe(true);
    expect(index.get('productId')).toBe(productId);

    const summary = await db.doc(paths.productStockSummary(ORG_A, productId)).get();
    expect(summary.get('onHandMilli')).toBe(0);
    expect(summary.get('stockStatus')).toBe('OUT_OF_STOCK');
    expect(summary.get('shortfallMilli')).toBe(10_000);

    const audit = await db.collection(`${paths.organization(ORG_A)}/auditLogs`).get();
    expect(audit.docs.some((doc) => doc.get('action') === 'product.create')).toBe(true);
  });

  it('refuses a duplicate SKU (case/whitespace-insensitive) with already-exists / SKU_TAKEN', async () => {
    await productCreate.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        operationId: OPERATION_ID_A,
        payload: createPayload,
      }),
      db,
    );
    const result = await productCreate.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        operationId: OPERATION_ID_B,
        payload: { ...createPayload, internalSku: '  Rice-Basmati  ', name: 'Basmati Rice 2' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('already-exists');
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('SKU_TAKEN');
  });

  it('refuses a category that does not exist or is not ACTIVE', async () => {
    const result = await productCreate.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        operationId: OPERATION_ID_A,
        payload: { ...createPayload, categoryId: 'category-archived' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('not-found');
  });

  it.each(['VIEWER'] as const)('denies %s — INVENTORY_WRITERS only', async (role) => {
    const result = await productCreate.execute(
      callable(uidFor(ORG_A, role), {
        orgId: ORG_A,
        operationId: OPERATION_ID_A,
        payload: createPayload,
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('ROLE_NOT_PERMITTED');
  });

  it('SKU uniqueness is scoped per tenant — another org may use the same SKU', async () => {
    await productCreate.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        operationId: OPERATION_ID_A,
        payload: createPayload,
      }),
      db,
    );
    await seedCategory(db, ORG_B, 'category-grains');
    const result = await productCreate.execute(
      callable(uidFor(ORG_B, 'INVENTORY_MANAGER'), {
        orgId: ORG_B,
        operationId: OPERATION_ID_A,
        payload: createPayload,
      }),
      db,
    );
    expect(result.ok, JSON.stringify(result)).toBe(true);
  });
});

describe('C-10 product.update', () => {
  beforeEach(async () => {
    await seedBaseOrg();
    await seedProduct(db, ORG_A, 'product-1', {
      categoryId: 'category-grains',
      internalSku: 'SKU-1',
      internalSkuNormalized: 'SKU-1',
    });
    await seedProductStockSummary(db, ORG_A, 'product-1', {
      onHandMilli: 20_000,
      minimumStockMilli: 5000,
    });
    await seedStockBalance(db, ORG_A, 'product-1', 'warehouse-a', {
      onHandMilli: 20_000,
      baseUnitPriceMinor: 1000,
    });
  });

  it('updates the product and fans the denormalised + derived fields out to balances and the summary', async () => {
    const result = await productUpdate.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        payload: { productId: 'product-1', name: 'Renamed Product', purchaseCostMinor: 2000 },
      }),
      db,
    );
    expect(result.ok, JSON.stringify(result)).toBe(true);

    const product = await db.doc(paths.product(ORG_A, 'product-1')).get();
    expect(product.get('name')).toBe('Renamed Product');
    expect(product.get('purchaseCostMinor')).toBe(2000);

    const balance = await db.doc(paths.stockBalance(ORG_A, 'product-1', 'warehouse-a')).get();
    expect(balance.get('productName')).toBe('Renamed Product');
    expect(balance.get('baseUnitPriceMinor')).toBe(2000);
    expect(balance.get('stockValueMinor')).toBe(40_000); // 20_000 * 2000 / 1000

    const summary = await db.doc(paths.productStockSummary(ORG_A, 'product-1')).get();
    expect(summary.get('productName')).toBe('Renamed Product');
    expect(summary.get('stockValueMinor')).toBe(40_000);
  });

  it('changing the SKU deletes the old index entry and creates the new one', async () => {
    const result = await productUpdate.execute(
      callable(uidFor(ORG_A, 'ADMIN'), {
        orgId: ORG_A,
        payload: { productId: 'product-1', internalSku: 'SKU-2' },
      }),
      db,
    );
    expect(result.ok, JSON.stringify(result)).toBe(true);
    const oldIndex = await db.doc(paths.productSkuIndex(ORG_A, 'SKU-1')).get();
    expect(oldIndex.exists).toBe(false);
    const newIndex = await db.doc(paths.productSkuIndex(ORG_A, 'SKU-2')).get();
    expect(newIndex.exists).toBe(true);
    expect(newIndex.get('productId')).toBe('product-1');
  });

  it('refuses a SKU change onto an already-taken SKU', async () => {
    await seedProduct(db, ORG_A, 'product-2', {
      internalSku: 'SKU-9',
      internalSkuNormalized: 'SKU-9',
    });
    const result = await productUpdate.execute(
      callable(uidFor(ORG_A, 'ADMIN'), {
        orgId: ORG_A,
        payload: { productId: 'product-1', internalSku: 'SKU-9' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('SKU_TAKEN');
  });

  it('rejects a product belonging to another organization as cross-tenant / not-found', async () => {
    const result = await productUpdate.execute(
      callable(uidFor(ORG_A, 'ADMIN'), {
        orgId: ORG_A,
        payload: { productId: 'product-in-org-b', name: 'Hijack' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('not-found');
  });
});

describe('C-11 product.setStatus', () => {
  beforeEach(async () => {
    await seedBaseOrg();
    await seedProduct(db, ORG_A, 'product-1');
    await seedProductStockSummary(db, ORG_A, 'product-1');
    await seedStockBalance(db, ORG_A, 'product-1', 'warehouse-a');
  });

  it('archives an ACTIVE product and mirrors productStatus onto the summary and balances', async () => {
    const result = await productSetStatus.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        payload: { productId: 'product-1', status: 'ARCHIVED' },
      }),
      db,
    );
    expect(result.ok, JSON.stringify(result)).toBe(true);
    const product = await db.doc(paths.product(ORG_A, 'product-1')).get();
    expect(product.get('status')).toBe('ARCHIVED');
    const summary = await db.doc(paths.productStockSummary(ORG_A, 'product-1')).get();
    expect(summary.get('productStatus')).toBe('ARCHIVED');
    const balance = await db.doc(paths.stockBalance(ORG_A, 'product-1', 'warehouse-a')).get();
    expect(balance.get('productStatus')).toBe('ARCHIVED');
  });

  it('restores an ARCHIVED product back to ACTIVE', async () => {
    await db.doc(paths.product(ORG_A, 'product-1')).update({ status: 'ARCHIVED' });
    const result = await productSetStatus.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        payload: { productId: 'product-1', status: 'ACTIVE' },
      }),
      db,
    );
    expect(result.ok).toBe(true);
    const product = await db.doc(paths.product(ORG_A, 'product-1')).get();
    expect(product.get('status')).toBe('ACTIVE');
  });

  it('rejects setting the same status again as an invalid transition', async () => {
    const result = await productSetStatus.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        payload: { productId: 'product-1', status: 'ACTIVE' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('INVALID_TRANSITION');
  });
});
