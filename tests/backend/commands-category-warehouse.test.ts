import type { Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { paths } from '../../packages/shared/src/paths.js';
import { categoryArchive, categoryRestore } from '../../functions/src/commands/category.js';
import {
  warehouseArchive,
  warehouseRestore,
  warehouseSetDefault,
} from '../../functions/src/commands/warehouse.js';
import {
  callable,
  clearFirestore,
  ORG_A,
  ORG_B,
  seedCategory,
  seedMember,
  seedOrganization,
  seedProduct,
  seedPurchaseOrder,
  seedSettings,
  seedStockBalance,
  seedWarehouse,
  testDb,
  uidFor,
} from './harness.js';

let db: Firestore;

async function seedBaseOrg(): Promise<void> {
  await clearFirestore();
  await seedOrganization(db, ORG_A);
  await seedOrganization(db, ORG_B);
  for (const role of ['OWNER', 'ADMIN', 'INVENTORY_MANAGER', 'VIEWER'] as const) {
    await seedMember(db, ORG_A, role);
  }
}

beforeAll(() => {
  db = testDb();
});

describe('C-35a/C-35b category.archive / category.restore', () => {
  beforeEach(async () => {
    await seedBaseOrg();
    await seedCategory(db, ORG_A, 'category-1');
  });

  it('archives an ACTIVE category with no ACTIVE product referencing it, and audits it', async () => {
    const result = await categoryArchive.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        payload: { categoryId: 'category-1' },
      }),
      db,
    );
    expect(result.ok, JSON.stringify(result)).toBe(true);
    const category = await db.doc(paths.category(ORG_A, 'category-1')).get();
    expect(category.get('status')).toBe('ARCHIVED');
    const audit = await db.collection(`${paths.organization(ORG_A)}/auditLogs`).get();
    expect(audit.docs.some((doc) => doc.get('action') === 'category.archive')).toBe(true);
  });

  it('refuses to archive a category an ACTIVE product still references (Q-072)', async () => {
    await seedProduct(db, ORG_A, 'product-1', { categoryId: 'category-1' });
    const result = await categoryArchive.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        payload: { categoryId: 'category-1' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('failed-precondition');
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('INVALID_TRANSITION');
  });

  it('allows archiving when the only product referencing the category is ARCHIVED', async () => {
    await seedProduct(db, ORG_A, 'product-1', { categoryId: 'category-1', status: 'ARCHIVED' });
    const result = await categoryArchive.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        payload: { categoryId: 'category-1' },
      }),
      db,
    );
    expect(result.ok, JSON.stringify(result)).toBe(true);
  });

  it('restores an ARCHIVED category unconditionally', async () => {
    await seedCategory(db, ORG_A, 'category-2', { status: 'ARCHIVED' });
    const result = await categoryRestore.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        payload: { categoryId: 'category-2' },
      }),
      db,
    );
    expect(result.ok, JSON.stringify(result)).toBe(true);
    const category = await db.doc(paths.category(ORG_A, 'category-2')).get();
    expect(category.get('status')).toBe('ACTIVE');
  });

  it('rejects restoring an already-ACTIVE category', async () => {
    const result = await categoryRestore.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        payload: { categoryId: 'category-1' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('INVALID_TRANSITION');
  });

  it.each(['VIEWER'] as const)('denies %s — INVENTORY_WRITERS only', async (role) => {
    const result = await categoryArchive.execute(
      callable(uidFor(ORG_A, role), { orgId: ORG_A, payload: { categoryId: 'category-1' } }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('ROLE_NOT_PERMITTED');
  });

  it('rejects a category belonging to another organization', async () => {
    await seedCategory(db, ORG_B, 'category-in-b');
    const result = await categoryArchive.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        payload: { categoryId: 'category-in-b' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('not-found');
  });
});

describe('C-12/C-36/C-37 warehouse.archive / warehouse.setDefault / warehouse.restore', () => {
  beforeEach(async () => {
    await seedBaseOrg();
    await seedWarehouse(db, ORG_A, 'warehouse-main');
    await seedWarehouse(db, ORG_A, 'warehouse-cold');
    await seedSettings(db, ORG_A, { defaultWarehouseId: 'warehouse-main' });
  });

  it('archives an empty, non-default warehouse with no open receiving PO, and audits it', async () => {
    const result = await warehouseArchive.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        payload: { warehouseId: 'warehouse-cold' },
      }),
      db,
    );
    expect(result.ok, JSON.stringify(result)).toBe(true);
    const warehouse = await db.doc(paths.warehouse(ORG_A, 'warehouse-cold')).get();
    expect(warehouse.get('status')).toBe('ARCHIVED');
    const audit = await db.collection(`${paths.organization(ORG_A)}/auditLogs`).get();
    expect(audit.docs.some((doc) => doc.get('action') === 'warehouse.archive')).toBe(true);
  });

  it('refuses to archive the default warehouse', async () => {
    const result = await warehouseArchive.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        payload: { warehouseId: 'warehouse-main' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('INVALID_TRANSITION');
  });

  it('refuses to archive a warehouse holding stock — WAREHOUSE_HAS_STOCK (Q-056)', async () => {
    await seedProduct(db, ORG_A, 'product-1');
    await seedStockBalance(db, ORG_A, 'product-1', 'warehouse-cold', { onHandMilli: 5000 });
    const result = await warehouseArchive.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        payload: { warehouseId: 'warehouse-cold' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.details as { reason?: string } | undefined)?.reason).toBe('WAREHOUSE_HAS_STOCK');
  });

  it('refuses to archive a warehouse with an open receiving PO — WAREHOUSE_HAS_OPEN_RECEIPT (Q-057)', async () => {
    await seedPurchaseOrder(db, ORG_A, 'po-1', {
      status: 'ORDERED',
      receivingWarehouseId: 'warehouse-cold',
    });
    const result = await warehouseArchive.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        payload: { warehouseId: 'warehouse-cold' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.details as { reason?: string } | undefined)?.reason).toBe(
      'WAREHOUSE_HAS_OPEN_RECEIPT',
    );
  });

  it('a zero-balance row does not block archiving (only a positive balance does)', async () => {
    await seedProduct(db, ORG_A, 'product-1');
    await seedStockBalance(db, ORG_A, 'product-1', 'warehouse-cold', { onHandMilli: 0 });
    const result = await warehouseArchive.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        payload: { warehouseId: 'warehouse-cold' },
      }),
      db,
    );
    expect(result.ok, JSON.stringify(result)).toBe(true);
  });

  it('sets a new default warehouse, writing only settings.defaultWarehouseId', async () => {
    const result = await warehouseSetDefault.execute(
      callable(uidFor(ORG_A, 'ADMIN'), {
        orgId: ORG_A,
        payload: { warehouseId: 'warehouse-cold' },
      }),
      db,
    );
    expect(result.ok, JSON.stringify(result)).toBe(true);
    const settings = await db.doc(paths.settings(ORG_A)).get();
    expect(settings.get('defaultWarehouseId')).toBe('warehouse-cold');
    const warehouse = await db.doc(paths.warehouse(ORG_A, 'warehouse-cold')).get();
    expect(warehouse.get('isDefault')).toBeUndefined();
  });

  it('refuses to set a non-ACTIVE warehouse as default', async () => {
    await seedWarehouse(db, ORG_A, 'warehouse-archived', { status: 'ARCHIVED' });
    const result = await warehouseSetDefault.execute(
      callable(uidFor(ORG_A, 'ADMIN'), {
        orgId: ORG_A,
        payload: { warehouseId: 'warehouse-archived' },
      }),
      db,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect((result.details as { reason?: string } | undefined)?.reason).toBe(
      'WAREHOUSE_NOT_ACTIVE',
    );
  });

  it('restores an ARCHIVED warehouse unconditionally', async () => {
    await seedWarehouse(db, ORG_A, 'warehouse-archived', { status: 'ARCHIVED' });
    const result = await warehouseRestore.execute(
      callable(uidFor(ORG_A, 'INVENTORY_MANAGER'), {
        orgId: ORG_A,
        payload: { warehouseId: 'warehouse-archived' },
      }),
      db,
    );
    expect(result.ok, JSON.stringify(result)).toBe(true);
    const warehouse = await db.doc(paths.warehouse(ORG_A, 'warehouse-archived')).get();
    expect(warehouse.get('status')).toBe('ACTIVE');
  });

  it.each(['VIEWER'] as const)(
    'denies %s on warehouse.archive — INVENTORY_WRITERS only',
    async (role) => {
      const result = await warehouseArchive.execute(
        callable(uidFor(ORG_A, role), { orgId: ORG_A, payload: { warehouseId: 'warehouse-cold' } }),
        db,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect((result.details as { reason?: string } | undefined)?.reason).toBe(
        'ROLE_NOT_PERMITTED',
      );
    },
  );
});
