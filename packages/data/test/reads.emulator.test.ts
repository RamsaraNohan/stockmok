import {
  ConnectionProjectionSchema,
  ProductStockSummarySchema,
  type Member,
  type PurchaseOrder,
} from '@stockmok/shared';
import {
  deleteApp as deleteAdminApp,
  initializeApp as initializeAdminApp,
} from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Timestamp } from 'firebase-admin/firestore';
import { deleteApp, initializeApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  terminate,
  type Unsubscribe,
} from 'firebase/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { aConnection, aMember, aPrivatePO } from '../../../tests/factories/index.js';
import { createStockmokRepositories } from '../src/repositories.js';

const PROJECT_ID = 'stockmok';
const ORG_A = 'c2-org-a';
const ORG_B = 'c2-org-b';
const UID = 'c2-user';
const NOW = Timestamp.fromMillis(1_700_000_000_000);

const adminApp = initializeAdminApp({ projectId: PROJECT_ID }, 'c2-data-emulator-admin');
const adminDb = getAdminFirestore(adminApp);
const clientApp = initializeApp(
  { projectId: PROJECT_ID, apiKey: 'emulator-only' },
  'c2-data-client',
);
const clientDb = initializeFirestore(clientApp, { experimentalForceLongPolling: true });

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
if (!emulatorHost) throw new Error('FIRESTORE_EMULATOR_HOST is required');
const [host, portText] = emulatorHost.split(':');
if (!host || !portText) throw new Error('FIRESTORE_EMULATOR_HOST must be host:port');
connectFirestoreEmulator(clientDb, host, Number.parseInt(portText, 10));

const repositoriesA = createStockmokRepositories(clientDb, { orgId: ORG_A, uid: UID });

function summary(index: number, organizationMarker = 'A') {
  const productId = `product-${String(index).padStart(2, '0')}`;
  const stockStatus = index === 1 ? 'OUT_OF_STOCK' : index === 2 ? 'LOW_STOCK' : 'IN_STOCK';
  const onHandMilli = index === 1 ? 0 : index * 1_000;
  const minimumStockMilli = index === 2 ? 5_000 : 0;
  const stockValueMinor = index * 1_000;
  return ProductStockSummarySchema.parse({
    productId,
    productName: organizationMarker === 'A' ? 'Repeated Name' : 'Other Tenant Product',
    internalSku: `${organizationMarker}-SKU-${String(index)}`,
    internalSkuNormalized: `${organizationMarker}-SKU-${String(index)}`,
    categoryId: index % 2 === 0 ? 'category-even' : 'category-odd',
    productStatus: 'ACTIVE',
    baseUnitPriceMinor: 1_000,
    productUpdatedAt: NOW,
    onHandMilli,
    reservedMilli: 0,
    availableMilli: onHandMilli,
    minimumStockMilli,
    stockStatus,
    stockValueMinor,
    shortfallMilli: Math.max(0, minimumStockMilli - onHandMilli),
    unit: 'KG',
    updatedAt: NOW,
  });
}

function balance(index: number, warehouseId: string) {
  const item = summary(index);
  return {
    productId: item.productId,
    warehouseId,
    onHandMilli: item.onHandMilli,
    unit: item.unit,
    productName: item.productName,
    internalSku: item.internalSku,
    internalSkuNormalized: item.internalSkuNormalized,
    categoryId: item.categoryId,
    productStatus: item.productStatus,
    baseUnitPriceMinor: item.baseUnitPriceMinor,
    minimumStockMilli: item.minimumStockMilli,
    productUpdatedAt: item.productUpdatedAt,
    stockValueMinor: item.stockValueMinor,
    stockStatus: item.stockStatus,
    shortfallMilli: item.shortfallMilli,
    updatedAt: item.updatedAt,
  };
}

async function seed(): Promise<void> {
  const writes: Promise<unknown>[] = [];
  for (let index = 1; index <= 6; index += 1) {
    const warehouseId = index <= 3 ? 'warehouse-a' : 'warehouse-b';
    writes.push(
      adminDb
        .doc(
          `organizations/${ORG_A}/productStockSummaries/product-${String(index).padStart(2, '0')}`,
        )
        .set(summary(index)),
      adminDb
        .doc(
          `organizations/${ORG_A}/stockBalances/product-${String(index).padStart(2, '0')}__${warehouseId}`,
        )
        .set(balance(index, warehouseId)),
    );
  }
  writes.push(
    adminDb.doc(`organizations/${ORG_B}/productStockSummaries/product-01`).set(summary(1, 'B')),
    adminDb.doc(`organizations/${ORG_A}/members/${UID}`).set(aMember('OWNER', { uid: UID })),
    adminDb.doc(`organizations/${ORG_B}/members/${UID}`).set(aMember('OWNER', { uid: UID })),
    adminDb.doc(`organizations/${ORG_A}/purchaseOrders/po-live`).set(aPrivatePO().order),
    adminDb.doc(`organizations/${ORG_B}/purchaseOrders/po-live`).set(aPrivatePO().order),
    adminDb.doc(`organizations/${ORG_A}/connections/connection-live`).set(
      ConnectionProjectionSchema.parse({
        ...aConnection(),
        connectionId: 'connection-live',
        ordersPlacedCount: 0,
      }),
    ),
    adminDb.doc(`organizations/${ORG_B}/connections/connection-live`).set(
      ConnectionProjectionSchema.parse({
        ...aConnection(),
        connectionId: 'connection-live',
        ordersPlacedCount: 0,
      }),
    ),
  );
  await Promise.all(writes);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

beforeAll(seed);

afterAll(async () => {
  await terminate(clientDb);
  await deleteApp(clientApp);
  await deleteAdminApp(adminApp);
});

describe('C2 emulator-backed read layer', () => {
  it('paginates repeated sort values without duplicates or skips', async () => {
    const first = await repositoriesA.inventory.listProducts({
      productStatus: 'ACTIVE',
      sort: 'name',
      limit: 2,
    });
    if (!first.nextCursor) throw new Error('First page must expose a cursor');
    const second = await repositoriesA.inventory.listProducts({
      productStatus: 'ACTIVE',
      sort: 'name',
      limit: 2,
      cursor: first.nextCursor,
    });
    if (!second.nextCursor) throw new Error('Second page must expose a cursor');
    const third = await repositoriesA.inventory.listProducts({
      productStatus: 'ACTIVE',
      sort: 'name',
      limit: 2,
      cursor: second.nextCursor,
    });
    if (!third.nextCursor) throw new Error('Exact-boundary page must expose a cursor');
    const finalEmpty = await repositoriesA.inventory.listProducts({
      productStatus: 'ACTIVE',
      sort: 'name',
      limit: 2,
      cursor: third.nextCursor,
    });
    const ids = [...first.items, ...second.items, ...third.items].map(({ productId }) => productId);
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(6);
    expect(finalEmpty.items).toEqual([]);
    expect(finalEmpty.nextCursor).toBeNull();
  });

  it('rejects a cursor reused with a different matrix order', async () => {
    const first = await repositoriesA.inventory.listProducts({
      productStatus: 'ACTIVE',
      sort: 'name',
      limit: 2,
    });
    if (!first.nextCursor) throw new Error('First page must expose a cursor');
    await expect(
      repositoriesA.inventory.listProducts({
        productStatus: 'ACTIVE',
        sort: 'onHand',
        limit: 2,
        cursor: first.nextCursor,
      }),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('keeps tenant-local paths isolated even when document ids overlap', async () => {
    const page = await repositoriesA.inventory.listProducts({
      productStatus: 'ACTIVE',
      sort: 'name',
      limit: 25,
    });
    expect(page.items).toHaveLength(6);
    expect(page.items.every(({ productName }) => productName === 'Repeated Name')).toBe(true);
  });

  it('executes exact integer aggregations and reconciles Q-053 with Q-060', async () => {
    const kpis = await repositoriesA.dashboard.getKpis(false);
    const locations = await repositoriesA.dashboard.getInventoryByLocation([
      'warehouse-a',
      'warehouse-b',
    ]);
    expect(kpis.activeSkus).toBe(6);
    expect(kpis.lowStock).toBe(1);
    expect(kpis.outOfStock).toBe(1);
    expect(kpis.inventoryValueMinor).toBe(21_000);
    expect(locations).toEqual([
      { warehouseId: 'warehouse-a', stockValueMinor: 6_000 },
      { warehouseId: 'warehouse-b', stockValueMinor: 15_000 },
    ]);
    expect(locations.reduce((total, current) => total + current.stockValueMinor, 0)).toBe(
      kpis.inventoryValueMinor,
    );
  });

  it('rejects a malformed persisted document through the shared schema converter', async () => {
    await adminDb
      .doc(`organizations/${ORG_A}/productStockSummaries/corrupt-product`)
      .set({ productId: 'corrupt-product' });
    await expect(repositoriesA.inventory.getSummary('corrupt-product')).rejects.toThrow();
  });

  it('delivers and cleanly unsubscribes the three feasible realtime reads', async () => {
    const memberEvents: Member[] = [];
    let unsubscribeMember: Unsubscribe = () => undefined;
    const memberInitial = new Promise<void>((resolve) => {
      unsubscribeMember = repositoriesA.shell.subscribeMember((member) => {
        if (!member) return;
        memberEvents.push(member);
        if (memberEvents.length === 1) resolve();
      });
    });
    await memberInitial;

    await adminDb.doc(`organizations/${ORG_B}/members/${UID}`).update({ status: 'SUSPENDED' });
    await delay(250);
    expect(memberEvents).toHaveLength(1);

    let resolveMemberUpdate: (() => void) | undefined;
    const memberUpdate = new Promise<void>((resolve) => {
      resolveMemberUpdate = resolve;
    });
    const unsubscribeUpdatedMember = repositoriesA.shell.subscribeMember((member) => {
      if (member?.status === 'SUSPENDED') resolveMemberUpdate?.();
    });
    await adminDb.doc(`organizations/${ORG_A}/members/${UID}`).update({ status: 'SUSPENDED' });
    await memberUpdate;

    const orderEvents: PurchaseOrder[] = [];
    let resolveOrderInitial: (() => void) | undefined;
    const orderInitial = new Promise<void>((resolve) => {
      resolveOrderInitial = resolve;
    });
    const unsubscribeOrder = repositoriesA.procurement.subscribeOrder('po-live', (order) => {
      if (!order) return;
      orderEvents.push(order);
      if (orderEvents.length === 1) resolveOrderInitial?.();
    });
    await orderInitial;

    const connectionStatuses: string[] = [];
    let resolveConnectionInitial: (() => void) | undefined;
    const connectionInitial = new Promise<void>((resolve) => {
      resolveConnectionInitial = resolve;
    });
    const unsubscribeConnection = repositoriesA.network.subscribeConnection(
      'connection-live',
      (connection) => {
        if (!connection) return;
        connectionStatuses.push(connection.status);
        if (connectionStatuses.length === 1) resolveConnectionInitial?.();
      },
    );
    await connectionInitial;

    await adminDb
      .doc(`organizations/${ORG_B}/purchaseOrders/po-live`)
      .update({ status: 'ORDERED' });
    await delay(250);
    expect(orderEvents).toHaveLength(1);

    let resolveOrderUpdate: (() => void) | undefined;
    const orderUpdate = new Promise<void>((resolve) => {
      resolveOrderUpdate = resolve;
    });
    const unsubscribeUpdatedOrder = repositoriesA.procurement.subscribeOrder('po-live', (order) => {
      if (order?.status === 'ORDERED') resolveOrderUpdate?.();
    });
    await adminDb
      .doc(`organizations/${ORG_A}/purchaseOrders/po-live`)
      .update({ status: 'ORDERED' });
    await orderUpdate;

    let resolveConnectionUpdate: (() => void) | undefined;
    const connectionUpdate = new Promise<void>((resolve) => {
      resolveConnectionUpdate = resolve;
    });
    const unsubscribeUpdatedConnection = repositoriesA.network.subscribeConnection(
      'connection-live',
      (connection) => {
        if (connection?.status === 'DISABLED') resolveConnectionUpdate?.();
      },
    );
    await adminDb
      .doc(`organizations/${ORG_A}/connections/connection-live`)
      .update({ status: 'DISABLED' });
    await connectionUpdate;

    unsubscribeOrder();
    unsubscribeOrder();
    unsubscribeUpdatedOrder();
    unsubscribeConnection();
    unsubscribeConnection();
    unsubscribeUpdatedConnection();
    unsubscribeMember();
    unsubscribeMember();
    unsubscribeUpdatedMember();
    const orderCount = orderEvents.length;
    const memberCount = memberEvents.length;
    await adminDb
      .doc(`organizations/${ORG_A}/purchaseOrders/po-live`)
      .update({ status: 'RECEIVED' });
    await adminDb.doc(`organizations/${ORG_A}/members/${UID}`).update({ status: 'ACTIVE' });
    await delay(250);
    expect(orderEvents).toHaveLength(orderCount);
    expect(memberEvents).toHaveLength(memberCount);
  });
});
