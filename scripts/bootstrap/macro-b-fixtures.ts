import { pathToFileURL } from 'node:url';

import { Timestamp } from 'firebase-admin/firestore';

import {
  PurchaseOrderItemSchema,
  PurchaseOrderSchema,
} from '../../packages/shared/src/schemas/procurement.js';
import {
  ConnectedPurchaseOrderItemSchema,
  ConnectedPurchaseOrderSchema,
} from '../../packages/shared/src/schemas/network.js';
import { paths } from '../../packages/shared/src/paths.js';
import { serverPaths } from '../../packages/shared/src/server/paths.js';
import { getBootstrapContext } from './context.js';
import { CLOCK, IDS } from './fixtures.js';
import { setValidated } from './write.js';

const T = Timestamp.fromDate(new Date('2026-08-15T09:00:00.000Z'));

interface ConnectedPoScenario {
  readonly purchaseOrderId: string;
  readonly orderNumber: string;
  readonly status:
    | 'DRAFT'
    | 'SUBMITTED'
    | 'ACCEPTED'
    | 'SHIPPED'
    | 'RECEIVED'
    | 'PARTIALLY_RECEIVED'
    | 'CANCELLED'
    | 'REJECTED';
  readonly orderedSupplierMilli: number;
  readonly receivedSupplierMilli: number;
  readonly receivingWarehouse: boolean;
}

const FACTOR_MILLI = 5_000;

function buyerEquivalentMilli(supplierMilli: number): number {
  return Math.round((supplierMilli * FACTOR_MILLI) / 1000);
}

const SCENARIOS: readonly ConnectedPoScenario[] = [
  {
    purchaseOrderId: 'cpo-draft-submit',
    orderNumber: 'CPO-2026-101',
    status: 'DRAFT',
    orderedSupplierMilli: 5_000,
    receivedSupplierMilli: 0,
    receivingWarehouse: false,
  },
  {
    purchaseOrderId: 'cpo-draft-cancel',
    orderNumber: 'CPO-2026-102',
    status: 'DRAFT',
    orderedSupplierMilli: 3_000,
    receivedSupplierMilli: 0,
    receivingWarehouse: false,
  },
  {
    purchaseOrderId: 'cpo-submitted-accept',
    orderNumber: 'CPO-2026-103',
    status: 'SUBMITTED',
    orderedSupplierMilli: 4_000,
    receivedSupplierMilli: 0,
    receivingWarehouse: false,
  },
  {
    purchaseOrderId: 'cpo-submitted-reject',
    orderNumber: 'CPO-2026-104',
    status: 'SUBMITTED',
    orderedSupplierMilli: 2_000,
    receivedSupplierMilli: 0,
    receivingWarehouse: false,
  },
  {
    purchaseOrderId: 'cpo-accepted-ship',
    orderNumber: 'CPO-2026-105',
    status: 'ACCEPTED',
    orderedSupplierMilli: 6_000,
    receivedSupplierMilli: 0,
    receivingWarehouse: false,
  },
  {
    purchaseOrderId: 'cpo-shipped-receive',
    orderNumber: 'CPO-2026-106',
    status: 'SHIPPED',
    orderedSupplierMilli: 5_000,
    receivedSupplierMilli: 0,
    receivingWarehouse: true,
  },
  {
    purchaseOrderId: 'cpo-shipped-over',
    orderNumber: 'CPO-2026-107',
    status: 'SHIPPED',
    orderedSupplierMilli: 5_000,
    receivedSupplierMilli: 0,
    receivingWarehouse: true,
  },
];

const STATUS_TIMESTAMPS: Record<ConnectedPoScenario['status'], Record<string, Timestamp>> = {
  DRAFT: {},
  SUBMITTED: { submittedAt: T, orderedAt: T },
  ACCEPTED: { submittedAt: T, orderedAt: T, acceptedAt: T },
  SHIPPED: { submittedAt: T, orderedAt: T, acceptedAt: T, shippedAt: T },
  RECEIVED: { submittedAt: T, orderedAt: T, acceptedAt: T, shippedAt: T, receivedAt: T },
  PARTIALLY_RECEIVED: { submittedAt: T, orderedAt: T, acceptedAt: T, shippedAt: T },
  CANCELLED: { cancelledAt: T },
  REJECTED: { submittedAt: T },
};

export async function seedMacroBFixtures(): Promise<void> {
  const { db } = getBootstrapContext();
  const batch = db.batch();

  for (const scenario of SCENARIOS) {
    const unitPriceMinor = 250_000;
    const orderedBuyerBaseMilli = buyerEquivalentMilli(scenario.orderedSupplierMilli);
    const receivedBuyerBaseMilli = buyerEquivalentMilli(scenario.receivedSupplierMilli);
    const lineTotalMinor = Math.round((unitPriceMinor * scenario.orderedSupplierMilli) / 1000);

    const buyerCopy = {
      orgId: IDS.grandOrg,
      viewRole: 'BUYER' as const,
      counterpartyName: 'Fresh Foods Ltd',
      counterpartyOrgId: IDS.freshOrg,
      counterpartyHandle: 'freshfoods',
    };
    const supplierCopy = {
      orgId: IDS.freshOrg,
      viewRole: 'SUPPLIER' as const,
      counterpartyName: 'Grand Ocean Hotel',
      counterpartyOrgId: IDS.grandOrg,
      counterpartyHandle: 'grand-ocean',
    };
    // A DRAFT connected order only exists on the buyer side: the supplier's
    // projection is created for the first time by cpoSubmit's scope.create()
    // (functions/src/commands/connected-po.ts), which throws ALREADY_EXISTS if
    // that document is pre-seeded. Every later status implies submit already ran.
    const perOrg = scenario.status === 'DRAFT' ? [buyerCopy] : [buyerCopy, supplierCopy];

    const itemFields = {
      itemId: 'line-1',
      buyerProductId: 'meat-001',
      buyerProductNameSnapshot: 'Chicken Breast',
      buyerSkuSnapshot: 'MEAT-001',
      buyerBaseUnitSnapshot: 'KG' as const,
      orderedBuyerBaseMilli,
      receivedBuyerBaseMilli,
      unitPriceMinor,
      lineTotalMinor,
      currency: 'LKR' as const,
      mappingId: IDS.mapping,
      supplierCatalogItemId: 'catalog-ckn-b5',
      supplierProductNameSnapshot: 'Chicken Breast 5 KG Pack',
      supplierSkuSnapshot: 'CKN-B5',
      supplierOrderUnitSnapshot: 'PACK' as const,
      orderedSupplierMilli: scenario.orderedSupplierMilli,
      receivedSupplierMilli: scenario.receivedSupplierMilli,
      supplierToBuyerBaseFactorMilliSnapshot: FACTOR_MILLI,
    };

    for (const org of perOrg) {
      setValidated(
        db,
        batch,
        paths.purchaseOrder(org.orgId, scenario.purchaseOrderId),
        PurchaseOrderSchema,
        {
          purchaseOrderId: scenario.purchaseOrderId,
          orderNumber: scenario.orderNumber,
          viewRole: org.viewRole,
          supplierKind: 'CONNECTED',
          counterpartyName: org.counterpartyName,
          counterpartyOrgId: org.counterpartyOrgId,
          counterpartyHandle: org.counterpartyHandle,
          connectionId: IDS.connection,
          status: scenario.status,
          currency: 'LKR',
          ...(scenario.receivingWarehouse && org.orgId === IDS.grandOrg
            ? { receivingWarehouseId: IDS.mainWarehouse }
            : {}),
          totalMinor: lineTotalMinor,
          isProjection: false,
          createdBy: 'grand-procurement',
          createdAt: CLOCK.t0,
          ...STATUS_TIMESTAMPS[scenario.status],
        },
      );
      setValidated(
        db,
        batch,
        paths.purchaseOrderItem(org.orgId, scenario.purchaseOrderId, 'line-1'),
        PurchaseOrderItemSchema,
        itemFields,
      );
    }

    // readCanonicalOrder/readCanonicalOrderItems (functions/src/commands/connected-lib.ts)
    // read the SHARED canonical record, not either org's projection. cpoSubmit creates
    // it for the first time; every scenario that starts past DRAFT must pre-seed it too,
    // or cpoRespond/cpoShip/cpoReceive fail with RESOURCE_NOT_FOUND.
    if (scenario.status !== 'DRAFT') {
      setValidated(
        db,
        batch,
        serverPaths.connectedPurchaseOrder(scenario.purchaseOrderId),
        ConnectedPurchaseOrderSchema,
        {
          purchaseOrderId: scenario.purchaseOrderId,
          orderNumber: scenario.orderNumber,
          viewRole: 'BUYER',
          supplierKind: 'CONNECTED',
          counterpartyName: buyerCopy.counterpartyName,
          counterpartyOrgId: buyerCopy.counterpartyOrgId,
          counterpartyHandle: buyerCopy.counterpartyHandle,
          connectionId: IDS.connection,
          buyerOrgId: IDS.grandOrg,
          supplierOrgId: IDS.freshOrg,
          status: scenario.status,
          currency: 'LKR',
          totalMinor: lineTotalMinor,
          isProjection: false,
          createdBy: 'grand-procurement',
          createdAt: CLOCK.t0,
          ...STATUS_TIMESTAMPS[scenario.status],
        },
      );
      setValidated(
        db,
        batch,
        serverPaths.connectedPurchaseOrderItem(scenario.purchaseOrderId, 'line-1'),
        ConnectedPurchaseOrderItemSchema,
        itemFields,
      );
    }
  }

  await batch.commit();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await seedMacroBFixtures();
  console.log('MACRO_B_PREREQUISITE_FIXTURES=PASS');
}
