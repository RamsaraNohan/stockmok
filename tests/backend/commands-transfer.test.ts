import type { Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { paths } from '../../packages/shared/src/paths.js';
import { stockTransfer } from '../../functions/src/commands/stock.js';
import {
  callable,
  clearFirestore,
  collectionOf,
  ORG_A,
  ORG_B,
  OPERATION_ID_A,
  OPERATION_ID_B,
  seedMember,
  seedOrganization,
  seedProduct,
  seedProductStockSummary,
  seedSettings,
  seedStockBalance,
  seedWarehouse,
  testDb,
  uidFor,
} from './harness.js';

let db: Firestore;

const PRODUCT = 'product-rice';
const MAIN = 'warehouse-main';
const COLD = 'warehouse-cold';

/**
 * `C-33 stock.transfer` — the A1 command. DB-06 §2, `T-XFER-01 … T-XFER-12`,
 * `T-CONC-07`/`T-CONC-08`.
 *
 * The fixture deliberately uses a cost of **333 minor per base unit** against a
 * balance of **10 500 milli**, because that is a quantity whose value does *not*
 * survive being split: 10 500 rounds to 3 497, while 5 250 + 5 250 rounds to
 * 1 748 + 1 748 = 3 496. That one-minor divergence is the entire reason
 * `A3R-05` moved `productStockSummaries.stockValueMinor` into the transfer
 * write set and grew it from six documents to seven. A fixture with a round
 * cost would pass `INV-27` by accident and prove nothing.
 */
const COST_MINOR = 333;
const SOURCE_MILLI = 10_500;
const SOURCE_VALUE_MINOR = 3497; // roundHalfUp(10 500 × 333 / 1000)

function reasonOf(result: { ok: boolean; details?: unknown }): string {
  return (result.details as { reason?: string } | undefined)?.reason ?? '';
}

const ALL_ROLES = [
  'OWNER',
  'ADMIN',
  'INVENTORY_MANAGER',
  'PROCUREMENT_MANAGER',
  'STOREKEEPER',
  'ANALYST',
  'VIEWER',
] as const;

async function seedBase(): Promise<void> {
  await clearFirestore();
  await seedOrganization(db, ORG_A);
  await seedOrganization(db, ORG_B);
  await seedSettings(db, ORG_A);
  for (const role of ALL_ROLES) await seedMember(db, ORG_A, role);
  await seedMember(db, ORG_B, 'OWNER');
  await seedWarehouse(db, ORG_A, MAIN, { name: 'Main Store' });
  await seedWarehouse(db, ORG_A, COLD, { name: 'Cold Room' });
  await seedWarehouse(db, ORG_B, 'warehouse-other', { name: 'Other Org Store' });
  await seedProduct(db, ORG_A, PRODUCT, { name: 'Basmati Rice', purchaseCostMinor: COST_MINOR });
  await seedStockBalance(db, ORG_A, PRODUCT, MAIN, {
    onHandMilli: SOURCE_MILLI,
    baseUnitPriceMinor: COST_MINOR,
    stockValueMinor: SOURCE_VALUE_MINOR,
    stockStatus: 'IN_STOCK',
    shortfallMilli: 0,
    productName: 'Basmati Rice',
  });
  await seedProductStockSummary(db, ORG_A, PRODUCT, {
    productName: 'Basmati Rice',
    baseUnitPriceMinor: COST_MINOR,
    onHandMilli: SOURCE_MILLI,
    availableMilli: SOURCE_MILLI,
    stockValueMinor: SOURCE_VALUE_MINOR,
    stockStatus: 'IN_STOCK',
    shortfallMilli: 0,
  });
}

const transfer = (uid: string, payload: unknown, operationId = OPERATION_ID_A) =>
  stockTransfer.execute(callable(uid, { orgId: ORG_A, operationId, payload }), db);

const move = (quantityMilli: number, from = MAIN, to = COLD) => ({
  productId: PRODUCT,
  sourceWarehouseId: from,
  destinationWarehouseId: to,
  quantityMilli,
});

beforeAll(() => {
  db = testDb();
});

describe('C-33 stock.transfer — the write set', () => {
  beforeEach(seedBase);

  // T-XFER-01, T-XFER-02, T-XFER-03, T-XFER-04
  it('writes exactly seven documents: 2 movements, 2 balances, the summary value, audit, receipt', async () => {
    const result = await transfer(uidFor(ORG_A, 'INVENTORY_MANAGER'), move(5250));
    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok) return;

    const movements = await collectionOf(db, ORG_A, 'stockMovements');
    expect(movements).toHaveLength(2);
    const out = movements.find((m) => m.get('movementType') === 'TRANSFER_OUT');
    const into = movements.find((m) => m.get('movementType') === 'TRANSFER_IN');
    expect(out).toBeDefined();
    expect(into).toBeDefined();

    // T-XFER-02 — one transferId, equal magnitude, opposite sign, different rooms.
    expect(out?.get('transferId')).toBe(into?.get('transferId'));
    expect(out?.get('transferId')).toBe((result.data as { transferId: string }).transferId);
    expect(out?.get('signedQuantityMilli')).toBe(-5250);
    expect(into?.get('signedQuantityMilli')).toBe(5250);
    expect(out?.get('warehouseId')).toBe(MAIN);
    expect(into?.get('warehouseId')).toBe(COLD);
    expect(out?.get('counterpartWarehouseId')).toBe(COLD);
    expect(into?.get('counterpartWarehouseId')).toBe(MAIN);
    expect(out?.get('counterpartWarehouseNameSnapshot')).toBe('Cold Room');
    expect(into?.get('counterpartWarehouseNameSnapshot')).toBe('Main Store');
    expect(out?.get('sourceType')).toBe('TRANSFER');
    // INV-24 — each half records its own room's balance after the move.
    expect(out?.get('balanceAfterMilli')).toBe(5250);
    expect(into?.get('balanceAfterMilli')).toBe(5250);

    const source = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    const destination = await db.doc(paths.stockBalance(ORG_A, PRODUCT, COLD)).get();
    expect(source.get('onHandMilli')).toBe(5250);
    expect(destination.get('onHandMilli')).toBe(5250);
    expect(source.get('stockValueMinor')).toBe(1748);
    expect(destination.get('stockValueMinor')).toBe(1748);
    // The destination row is created with its DV-11 fields from the product.
    expect(destination.get('productName')).toBe('Basmati Rice');
    expect(destination.get('baseUnitPriceMinor')).toBe(COST_MINOR);

    // T-XFER-03 / INV-23 — quantity half untouched; value half moved by the
    // rounding delta only. T-XFER-04 — the organization total is unchanged.
    const summary = await db.doc(paths.productStockSummary(ORG_A, PRODUCT)).get();
    expect(summary.get('onHandMilli')).toBe(SOURCE_MILLI);
    expect(summary.get('availableMilli')).toBe(SOURCE_MILLI);
    expect(summary.get('stockStatus')).toBe('IN_STOCK');
    // INV-27 — exactly the sum of the balances just written, not a re-rounding.
    expect(summary.get('stockValueMinor')).toBe(3496);
    expect(summary.get('stockValueMinor')).toBe(
      (source.get('stockValueMinor') as number) + (destination.get('stockValueMinor') as number),
    );

    expect(await collectionOf(db, ORG_A, 'auditLogs')).toHaveLength(1);
    expect(await collectionOf(db, ORG_A, 'commandReceipts')).toHaveLength(1);
  });

  it('emits no notification — a transfer cannot change a product total', async () => {
    // Move everything out of Main Store; the product total, and therefore the
    // product's stock status, is still exactly what it was.
    const result = await transfer(uidFor(ORG_A, 'OWNER'), move(SOURCE_MILLI));
    expect(result.ok, JSON.stringify(result)).toBe(true);
    for (const role of ALL_ROLES) {
      const notifications = await db
        .collection(`${paths.user(uidFor(ORG_A, role))}/notifications`)
        .get();
      expect(notifications.docs, role).toHaveLength(0);
    }
  });

  it('audits the transfer against the command name', async () => {
    await transfer(uidFor(ORG_A, 'ADMIN'), move(1000));
    const audits = await collectionOf(db, ORG_A, 'auditLogs');
    expect(audits).toHaveLength(1);
    expect(audits[0]?.get('action')).toBe('stock.transfer');
    expect(audits[0]?.get('actorRole')).toBe('ADMIN');
    expect(audits[0]?.get('organizationId')).toBe(ORG_A);
  });
});

// T-XFER-12 — the whole seven-role matrix, both directions.
describe('C-33 stock.transfer — authorization', () => {
  beforeEach(seedBase);

  it.each(['OWNER', 'ADMIN', 'INVENTORY_MANAGER'] as const)('%s may transfer', async (role) => {
    const result = await transfer(uidFor(ORG_A, role), move(1000));
    expect(result.ok, JSON.stringify(result)).toBe(true);
  });

  it.each(['PROCUREMENT_MANAGER', 'STOREKEEPER', 'ANALYST', 'VIEWER'] as const)(
    '%s is denied',
    async (role) => {
      const result = await transfer(uidFor(ORG_A, role), move(1000));
      expect(reasonOf(result)).toBe('ROLE_NOT_PERMITTED');
      expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(0);
    },
  );

  it('denies an unauthenticated caller', async () => {
    const result = await stockTransfer.execute(
      { data: { orgId: ORG_A, operationId: OPERATION_ID_A, payload: move(1000) } },
      db,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('unauthenticated');
  });

  it('denies a non-member and a member of another organization', async () => {
    const stranger = await transfer('nobody-at-all', move(1000));
    expect(reasonOf(stranger)).toBe('NOT_A_MEMBER');

    const otherOrg = await transfer(uidFor(ORG_B, 'OWNER'), move(1000));
    expect(reasonOf(otherOrg)).toBe('NOT_A_MEMBER');
    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(0);
  });

  it('denies a suspended member', async () => {
    await seedMember(db, ORG_A, 'INVENTORY_MANAGER', { status: 'SUSPENDED' });
    const result = await transfer(uidFor(ORG_A, 'INVENTORY_MANAGER'), move(1000));
    expect(reasonOf(result)).toBe('MEMBERSHIP_NOT_ACTIVE');
  });

  // T-XFER-11 — no document is written in either organization.
  it('denies a store room belonging to another organization', async () => {
    const result = await transfer(uidFor(ORG_A, 'OWNER'), move(1000, MAIN, 'warehouse-other'));
    expect(reasonOf(result)).toBe('CROSS_TENANT_REFERENCE');
    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(0);
    expect(await collectionOf(db, ORG_B, 'stockMovements')).toHaveLength(0);
    expect(await collectionOf(db, ORG_B, 'auditLogs')).toHaveLength(0);
    const source = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    expect(source.get('onHandMilli')).toBe(SOURCE_MILLI);
  });
});

describe('C-33 stock.transfer — preconditions', () => {
  beforeEach(seedBase);

  // T-XFER-05
  it('refuses a transfer to the same store room', async () => {
    const result = await transfer(uidFor(ORG_A, 'OWNER'), move(1000, MAIN, MAIN));
    expect(reasonOf(result)).toBe('SAME_WAREHOUSE');
    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(0);
  });

  // T-XFER-06
  it('refuses a zero or negative quantity', async () => {
    for (const quantity of [0, -1]) {
      const result = await transfer(uidFor(ORG_A, 'OWNER'), move(quantity));
      expect(result.ok, String(quantity)).toBe(false);
      if (!result.ok) expect(result.code).toBe('invalid-argument');
    }
    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(0);
  });

  // T-XFER-10
  it('refuses an archived product or an archived store room on either side', async () => {
    await seedProduct(db, ORG_A, 'product-archived', { status: 'ARCHIVED' });
    await seedWarehouse(db, ORG_A, 'warehouse-archived', { status: 'ARCHIVED' });

    const archivedProduct = await transfer(uidFor(ORG_A, 'OWNER'), {
      ...move(1000),
      productId: 'product-archived',
    });
    expect(reasonOf(archivedProduct)).toBe('PRODUCT_NOT_ACTIVE');

    const archivedSource = await transfer(
      uidFor(ORG_A, 'OWNER'),
      move(1000, 'warehouse-archived', COLD),
    );
    expect(reasonOf(archivedSource)).toBe('WAREHOUSE_NOT_ACTIVE');

    const archivedDestination = await transfer(
      uidFor(ORG_A, 'OWNER'),
      move(1000, MAIN, 'warehouse-archived'),
    );
    expect(reasonOf(archivedDestination)).toBe('WAREHOUSE_NOT_ACTIVE');
    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(0);
  });

  // T-XFER-07 — no negative balance, nothing written.
  it('refuses a quantity exceeding the source balance', async () => {
    const result = await transfer(uidFor(ORG_A, 'OWNER'), move(SOURCE_MILLI + 1));
    expect(reasonOf(result)).toBe('INSUFFICIENT_STOCK');
    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(0);
    expect(await collectionOf(db, ORG_A, 'auditLogs')).toHaveLength(0);
    const source = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    expect(source.get('onHandMilli')).toBe(SOURCE_MILLI);
    const destination = await db.doc(paths.stockBalance(ORG_A, PRODUCT, COLD)).get();
    expect(destination.exists).toBe(false);
  });

  it('allows exactly the available quantity, leaving the source at exactly zero', async () => {
    const result = await transfer(uidFor(ORG_A, 'OWNER'), move(SOURCE_MILLI));
    expect(result.ok, JSON.stringify(result)).toBe(true);
    const source = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    expect(source.get('onHandMilli')).toBe(0);
    expect(source.get('stockValueMinor')).toBe(0);
    expect(source.get('stockStatus')).toBe('OUT_OF_STOCK');
    const destination = await db.doc(paths.stockBalance(ORG_A, PRODUCT, COLD)).get();
    expect(destination.get('onHandMilli')).toBe(SOURCE_MILLI);
    const summary = await db.doc(paths.productStockSummary(ORG_A, PRODUCT)).get();
    expect(summary.get('onHandMilli')).toBe(SOURCE_MILLI);
    expect(summary.get('stockStatus')).toBe('IN_STOCK');
  });
});

describe('C-33 stock.transfer — idempotency', () => {
  beforeEach(seedBase);

  // T-XFER-08
  it('replays an identical payload without moving stock twice', async () => {
    const first = await transfer(uidFor(ORG_A, 'OWNER'), move(2000));
    const replay = await transfer(uidFor(ORG_A, 'OWNER'), move(2000));
    expect(first.ok && replay.ok, JSON.stringify(replay)).toBe(true);
    if (first.ok && replay.ok) expect(replay.data).toEqual(first.data);

    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(2);
    expect(await collectionOf(db, ORG_A, 'auditLogs')).toHaveLength(1);
    const source = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    expect(source.get('onHandMilli')).toBe(SOURCE_MILLI - 2000);
    const destination = await db.doc(paths.stockBalance(ORG_A, PRODUCT, COLD)).get();
    expect(destination.get('onHandMilli')).toBe(2000);
  });

  // T-XFER-09
  it('rejects the same operationId carrying a different quantity', async () => {
    await transfer(uidFor(ORG_A, 'OWNER'), move(2000));
    const changed = await transfer(uidFor(ORG_A, 'OWNER'), move(3000));
    expect(reasonOf(changed)).toBe('OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD');
    const source = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    expect(source.get('onHandMilli')).toBe(SOURCE_MILLI - 2000);
  });

  it('treats a distinct operationId as a second, real transfer', async () => {
    await transfer(uidFor(ORG_A, 'OWNER'), move(2000));
    const second = await transfer(uidFor(ORG_A, 'OWNER'), move(3000), OPERATION_ID_B);
    expect(second.ok, JSON.stringify(second)).toBe(true);
    expect(await collectionOf(db, ORG_A, 'stockMovements')).toHaveLength(4);
    const source = await db.doc(paths.stockBalance(ORG_A, PRODUCT, MAIN)).get();
    const destination = await db.doc(paths.stockBalance(ORG_A, PRODUCT, COLD)).get();
    expect(source.get('onHandMilli')).toBe(SOURCE_MILLI - 5000);
    expect(destination.get('onHandMilli')).toBe(5000);
    const summary = await db.doc(paths.productStockSummary(ORG_A, PRODUCT)).get();
    expect(summary.get('onHandMilli')).toBe(SOURCE_MILLI);
  });
});
