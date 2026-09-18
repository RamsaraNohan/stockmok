import { deriveStockValueMinor } from '../../../packages/shared/src/domain.js';
import { paths } from '../../../packages/shared/src/paths.js';
import type { PoStatus, Role } from '../../../packages/shared/src/primitives.js';
import {
  PartnerCatalogItemSchema,
  PrivatePartnerSchema,
  PurchaseOrderHistorySchema,
  PurchaseOrderItemSchema,
  PurchaseOrderSchema,
} from '../../../packages/shared/src/schemas/procurement.js';
import type { DatasetBuilder, QaOrg, QaPlan, QaProduct } from '../dataset.js';
import { epochPlus, ordinal } from '../deterministic.js';
import { totalOnHandMilli } from './inventory.js';

/**
 * Private procurement: partners, orders, lines, and history.
 *
 * A private purchase order is always `viewRole: 'BUYER'` and
 * `supplierKind: 'PRIVATE'` - both are literals in
 * `PrivatePurchaseOrderDraftClientWriteSchema`, so the supplier-side private
 * order is not a shape this system has. Private *buyers* therefore appear as
 * partner records with a `BUYER` partner type, not as orders.
 */

const PO_CREATED = epochPlus(8, 9);
const PO_ORDERED = epochPlus(9, 9);
const PO_CANCELLED = epochPlus(10, 9);
const PO_RECEIVED = epochPlus(11, 9);
const PO_EXPECTED = epochPlus(16, 9);

/** Partner ids and names repeat across organizations: another isolation trap. */
interface PartnerBlueprint {
  readonly partnerId: string;
  readonly name: string;
  readonly partnerTypes: readonly ('SUPPLIER' | 'BUYER')[];
  readonly status: 'ACTIVE' | 'DEACTIVATED';
}

const PARTNERS: readonly PartnerBlueprint[] = [
  {
    partnerId: 'qa-partner-01',
    name: 'Green Farm Produce',
    partnerTypes: ['SUPPLIER'],
    status: 'ACTIVE',
  },
  {
    partnerId: 'qa-partner-02',
    name: 'Harbour Cold Chain',
    partnerTypes: ['SUPPLIER'],
    status: 'DEACTIVATED',
  },
  {
    partnerId: 'qa-partner-03',
    name: 'Lakeside Catering',
    partnerTypes: ['BUYER'],
    status: 'ACTIVE',
  },
  {
    partnerId: 'qa-partner-04',
    name: 'Metro Trading House',
    partnerTypes: ['SUPPLIER', 'BUYER'],
    status: 'ACTIVE',
  },
];

/** Every private order in the smoke profile is placed against this partner. */
const ORDERING_PARTNER = 'qa-partner-01';

function partnersForOrg(org: QaOrg): readonly PartnerBlueprint[] {
  if (org.profile === 'smoke') return PARTNERS;
  if (org.specialKind === 'EMPTY' || org.specialKind === 'TINY') return [];
  return Array.from({ length: 48 }, (_, index) => {
    const supplier = index < 24;
    const partnerId = `qa-partner-${ordinal(index + 1)}`;
    return {
      partnerId,
      // The first four names deliberately repeat across every tenant.
      name:
        index < PARTNERS.length
          ? (PARTNERS[index]?.name ?? `QA Partner ${ordinal(index + 1)}`)
          : `QA ${supplier ? 'Supplier' : 'Buyer'} ${ordinal(index + 1, 2)}`,
      partnerTypes: supplier ? (['SUPPLIER'] as const) : (['BUYER'] as const),
      status: index % 11 === 0 ? 'DEACTIVATED' : 'ACTIVE',
    };
  });
}

export interface QaPoLine {
  readonly itemId: string;
  readonly productId: string;
  readonly orderedMilli: number;
  readonly receivedMilli: number;
  readonly unitPriceMinor: number;
}

export interface QaPrivateOrder {
  readonly purchaseOrderId: string;
  readonly orderNumber: string | undefined;
  readonly status: PoStatus;
  readonly receivingWarehouseId: string;
  readonly lines: readonly QaPoLine[];
}

function actorUid(org: QaOrg, role: Role): string {
  const user = org.users.find((candidate) => candidate.role === role);
  if (user === undefined) throw new Error(`${org.orgId} has no ${role}`);
  return user.uid;
}

function actorName(org: QaOrg, role: Role): string {
  const user = org.users.find((candidate) => candidate.role === role);
  if (user === undefined) throw new Error(`${org.orgId} has no ${role}`);
  return user.displayName;
}

function productById(org: QaOrg, productId: string): QaProduct {
  const product = org.products.find((candidate) => candidate.productId === productId);
  if (product === undefined) throw new Error(`${org.orgId} has no product ${productId}`);
  return product;
}

/**
 * Order lines only ever target well-stocked ACTIVE products held in the order's
 * receiving warehouse. That keeps the receipt movement landing on a balance that
 * exists, and keeps the opening balance behind it comfortably positive.
 */
function orderCandidates(org: QaOrg, warehouseId: string): readonly QaProduct[] {
  return org.products.filter(
    (product) =>
      product.status === 'ACTIVE' &&
      (org.profile === 'wide'
        ? product.warehouseIds.includes(warehouseId)
        : product.warehouseIds[0] === warehouseId) &&
      totalOnHandMilli(product) >= 15_000,
  );
}

export function privateProcurementPlan(org: QaOrg): readonly QaPrivateOrder[] {
  if (org.specialKind !== undefined && org.specialKind !== 'HIGH_VOLUME') return [];
  const mainCandidates = orderCandidates(org, 'main-store');
  const coldCandidates = orderCandidates(org, 'cold-room');
  if (org.profile === 'wide' && (mainCandidates.length < 4 || coldCandidates.length < 4)) return [];
  if (mainCandidates.length < 4 || coldCandidates.length < 4) {
    throw new Error(
      `${org.orgId} cannot host the private procurement fixtures: ` +
        `main-store=${String(mainCandidates.length)} cold-room=${String(coldCandidates.length)} (need 4 each)`,
    );
  }

  function line(product: QaProduct, index: number, receivedMilli: number): QaPoLine {
    return {
      itemId: `line-${ordinal(index + 1)}`,
      productId: product.productId,
      orderedMilli: 1_000 + index * 500,
      receivedMilli,
      unitPriceMinor: product.purchaseCostMinor,
    };
  }

  function candidate(pool: readonly QaProduct[], index: number): QaProduct {
    const product = pool[index];
    if (product === undefined) throw new Error('procurement candidate lookup failed');
    return product;
  }

  const prefix = org.purchaseOrderPrefix;
  if (org.profile === 'wide') {
    const statuses: readonly PoStatus[] = [
      'DRAFT',
      'ORDERED',
      'PARTIALLY_RECEIVED',
      'RECEIVED',
      'CANCELLED',
    ];
    let numbered = 0;
    return Array.from({ length: 50 }, (_, orderIndex) => {
      const status = statuses[orderIndex % statuses.length];
      if (status === undefined) throw new Error('wide private status lookup failed');
      const pool = orderIndex % 2 === 0 ? mainCandidates : coldCandidates;
      const receivingWarehouseId = orderIndex % 2 === 0 ? 'main-store' : 'cold-room';
      const lines = Array.from({ length: 5 }, (_, lineIndex) => {
        const product = candidate(pool, (orderIndex + lineIndex) % pool.length);
        const orderedMilli = 1_000 + lineIndex * 500;
        const receivedMilli =
          status === 'RECEIVED'
            ? orderedMilli
            : status === 'PARTIALLY_RECEIVED' && lineIndex === 0
              ? Math.floor(orderedMilli / 2)
              : 0;
        return line(product, lineIndex, receivedMilli);
      });
      const orderNumber =
        status === 'DRAFT' ? undefined : `${prefix}-2026-${ordinal(++numbered, 3)}`;
      return {
        purchaseOrderId: `qa-po-${org.handle}-${ordinal(orderIndex + 1)}`,
        orderNumber,
        status,
        receivingWarehouseId,
        lines,
      };
    });
  }
  return [
    {
      purchaseOrderId: `qa-po-${org.handle}-01`,
      orderNumber: undefined,
      status: 'DRAFT',
      receivingWarehouseId: 'main-store',
      lines: [line(candidate(mainCandidates, 0), 0, 0), line(candidate(mainCandidates, 1), 1, 0)],
    },
    {
      purchaseOrderId: `qa-po-${org.handle}-02`,
      orderNumber: `${prefix}-2026-001`,
      status: 'ORDERED',
      receivingWarehouseId: 'main-store',
      lines: [line(candidate(mainCandidates, 2), 0, 0), line(candidate(mainCandidates, 3), 1, 0)],
    },
    {
      // Partial: the first line is short-received, the second untouched.
      purchaseOrderId: `qa-po-${org.handle}-03`,
      orderNumber: `${prefix}-2026-002`,
      status: 'PARTIALLY_RECEIVED',
      receivingWarehouseId: 'cold-room',
      lines: [line(candidate(coldCandidates, 0), 0, 600), line(candidate(coldCandidates, 1), 1, 0)],
    },
    {
      // Full: every line received exactly what was ordered.
      purchaseOrderId: `qa-po-${org.handle}-04`,
      orderNumber: `${prefix}-2026-003`,
      status: 'RECEIVED',
      receivingWarehouseId: 'cold-room',
      lines: [
        line(candidate(coldCandidates, 2), 0, 1_000),
        line(candidate(coldCandidates, 3), 1, 1_500),
      ],
    },
    {
      // Cancelled after ordering, so it holds an order number but received nothing.
      purchaseOrderId: `qa-po-${org.handle}-05`,
      orderNumber: `${prefix}-2026-004`,
      status: 'CANCELLED',
      receivingWarehouseId: 'main-store',
      lines: [line(candidate(mainCandidates, 0), 0, 0), line(candidate(mainCandidates, 1), 1, 0)],
    },
  ];
}

/** Orders that reached ORDERED, which is what `counters/purchaseOrder` counts. */
export function orderedPoCount(org: QaOrg): number {
  return privateProcurementPlan(org).filter((order) => order.orderNumber !== undefined).length;
}

/** Non-cancelled placed orders, which is what `privatePartners.ordersPlacedCount` counts. */
function ordersPlacedCount(org: QaOrg): number {
  return privateProcurementPlan(org).filter(
    (order) => order.orderNumber !== undefined && order.status !== 'CANCELLED',
  ).length;
}

const STATUS_TIMESTAMPS: Readonly<Record<string, Record<string, ReturnType<typeof epochPlus>>>> = {
  DRAFT: {},
  ORDERED: { orderedAt: PO_ORDERED },
  PARTIALLY_RECEIVED: { orderedAt: PO_ORDERED },
  RECEIVED: { orderedAt: PO_ORDERED, receivedAt: PO_RECEIVED },
  CANCELLED: { orderedAt: PO_ORDERED, cancelledAt: PO_CANCELLED },
};

/** The transition chain each terminal status implies. */
const HISTORY_CHAIN: Readonly<Record<string, readonly (PoStatus | null)[]>> = {
  DRAFT: [null],
  ORDERED: [null, 'DRAFT'],
  PARTIALLY_RECEIVED: [null, 'DRAFT', 'ORDERED'],
  RECEIVED: [null, 'DRAFT', 'ORDERED'],
  CANCELLED: [null, 'DRAFT', 'ORDERED'],
};

const HISTORY_TARGETS: Readonly<Record<string, readonly PoStatus[]>> = {
  DRAFT: ['DRAFT'],
  ORDERED: ['DRAFT', 'ORDERED'],
  PARTIALLY_RECEIVED: ['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED'],
  RECEIVED: ['DRAFT', 'ORDERED', 'RECEIVED'],
  CANCELLED: ['DRAFT', 'ORDERED', 'CANCELLED'],
};

function writePartners(builder: DatasetBuilder, org: QaOrg): void {
  const placed = ordersPlacedCount(org);
  for (const partner of partnersForOrg(org)) {
    builder.add(paths.privatePartner(org.orgId, partner.partnerId), PrivatePartnerSchema, {
      partnerId: partner.partnerId,
      partnerTypes: partner.partnerTypes,
      name: partner.name,
      contactPerson: 'Chris Contact',
      email: `${partner.partnerId}@example.com`,
      phone: '+94112000000',
      address: `12 Market Road, ${org.name}`,
      notes: `QA partner fixture for ${org.name}`,
      status: partner.status,
      ordersPlacedCount: partner.partnerId === ORDERING_PARTNER ? placed : 0,
      createdAt: PO_CREATED,
      createdBy: actorUid(org, 'PROCUREMENT_MANAGER'),
      updatedAt: PO_CREATED,
      updatedBy: actorUid(org, 'PROCUREMENT_MANAGER'),
    });
  }
}

function writeOrders(builder: DatasetBuilder, org: QaOrg): void {
  const orders = privateProcurementPlan(org);
  if (orders.length === 0) return;
  const partner = partnersForOrg(org).find((entry) => entry.partnerId === ORDERING_PARTNER);
  if (partner === undefined) throw new Error(`${org.orgId} ordering partner blueprint is missing`);
  const createdBy = actorUid(org, 'PROCUREMENT_MANAGER');
  const createdByName = actorName(org, 'PROCUREMENT_MANAGER');

  for (const order of orders) {
    let totalMinor = 0;
    for (const orderLine of order.lines) {
      totalMinor += deriveStockValueMinor(orderLine.orderedMilli, orderLine.unitPriceMinor);
    }

    builder.add(paths.purchaseOrder(org.orgId, order.purchaseOrderId), PurchaseOrderSchema, {
      purchaseOrderId: order.purchaseOrderId,
      ...(order.orderNumber !== undefined ? { orderNumber: order.orderNumber } : {}),
      viewRole: 'BUYER',
      supplierKind: 'PRIVATE',
      counterpartyName: partner.name,
      privateSupplierId: partner.partnerId,
      status: order.status,
      currency: org.currency,
      expectedDate: PO_EXPECTED,
      receivingWarehouseId: order.receivingWarehouseId,
      totalMinor,
      isProjection: false,
      createdBy,
      createdAt: PO_CREATED,
      ...(STATUS_TIMESTAMPS[order.status] ?? {}),
    });

    for (const orderLine of order.lines) {
      const product = productById(org, orderLine.productId);
      builder.add(
        paths.purchaseOrderItem(org.orgId, order.purchaseOrderId, orderLine.itemId),
        PurchaseOrderItemSchema,
        {
          itemId: orderLine.itemId,
          buyerProductId: product.productId,
          buyerProductNameSnapshot: product.name,
          buyerSkuSnapshot: product.internalSku,
          buyerBaseUnitSnapshot: product.baseUnit,
          orderedBuyerBaseMilli: orderLine.orderedMilli,
          receivedBuyerBaseMilli: orderLine.receivedMilli,
          unitPriceMinor: orderLine.unitPriceMinor,
          lineTotalMinor: deriveStockValueMinor(orderLine.orderedMilli, orderLine.unitPriceMinor),
          currency: org.currency,
        },
      );
    }

    const froms = HISTORY_CHAIN[order.status] ?? [];
    const tos = HISTORY_TARGETS[order.status] ?? [];
    for (let step = 0; step < tos.length; step += 1) {
      const toStatus = tos[step];
      if (toStatus === undefined) continue;
      const historyId = `qa-poh-${order.purchaseOrderId}-${ordinal(step + 1)}`;
      // `po.cancel` is NON-idempotent (DB-06 s1), so its history row provably
      // carries no receipt id. Fabricating one would point at nothing.
      const cancelStep = toStatus === 'CANCELLED';
      builder.add(
        paths.purchaseOrderHistory(org.orgId, order.purchaseOrderId, historyId),
        PurchaseOrderHistorySchema,
        {
          historyId,
          fromStatus: froms[step] ?? null,
          toStatus,
          actorUid: createdBy,
          actorName: createdByName,
          actorOrgId: org.orgId,
          actorOrgName: org.name,
          ...(cancelStep ? {} : { operationId: `qa-op-${historyId}` }),
          note: `QA transition to ${toStatus}`,
          createdAt: epochPlus(8 + step, 9),
        },
      );
    }
  }
}

/**
 * The supplier organization publishes a partner catalog. Buyers map their own
 * products onto these entries, which is what makes a connected order possible.
 */
export function partnerCatalogItemId(product: QaProduct): string {
  return `qa-catalog-${product.productId}`;
}

export function publishedCatalogProducts(org: QaOrg): readonly QaProduct[] {
  return org.products.filter((product) => product.partnerPublished);
}

function writePartnerCatalog(builder: DatasetBuilder, org: QaOrg): void {
  if (org.profile === 'smoke' && org.networkRole !== 'SUPPLIER') return;
  for (const product of publishedCatalogProducts(org)) {
    const catalogItemId = partnerCatalogItemId(product);
    const partnerSku = `PACK-${product.internalSku}`;
    builder.add(paths.partnerCatalogItem(org.orgId, catalogItemId), PartnerCatalogItemSchema, {
      catalogItemId,
      sourceProductId: product.productId,
      internalProductNameSnapshot: product.name,
      internalSkuSnapshot: product.internalSku,
      partnerSku,
      partnerSkuNormalized: partnerSku.toUpperCase(),
      displayName: `${product.name} (${product.baseUnit})`,
      // INV-17 (partner-catalog.ts) — a catalog item's orderUnit must equal
      // its source product's baseUnit; a catalog cannot invent a distinct
      // ordering unit.
      orderUnit: product.baseUnit,
      availabilityState: totalOnHandMilli(product) > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
      wholesalePriceMinor: product.purchaseCostMinor * 5,
      currency: org.currency,
      published: true,
      updatedAt: epochPlus(10, 9),
    });
  }
}

export function generateProcurement(builder: DatasetBuilder, plan: QaPlan): void {
  for (const org of plan.organizations) {
    writePartners(builder, org);
    writeOrders(builder, org);
    writePartnerCatalog(builder, org);
  }
}
