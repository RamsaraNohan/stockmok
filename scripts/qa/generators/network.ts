import { convertMilli, deriveStockValueMinor } from '../../../packages/shared/src/domain.js';
import { paths } from '../../../packages/shared/src/paths.js';
import type { PoStatus } from '../../../packages/shared/src/primitives.js';
import {
  CanonicalConnectionSchema,
  ConnectedHistorySchema,
  ConnectedPurchaseOrderItemSchema,
  ConnectedPurchaseOrderSchema,
  ConnectionProjectionSchema,
} from '../../../packages/shared/src/schemas/network.js';
import {
  ProductMappingSchema,
  PurchaseOrderItemSchema,
  PurchaseOrderSchema,
} from '../../../packages/shared/src/schemas/procurement.js';
import { serverPaths } from '../../../packages/shared/src/server/paths.js';
import type { DatasetBuilder, QaOrg, QaPlan, QaProduct } from '../dataset.js';
import { epochPlus, ordinal } from '../deterministic.js';
import { totalOnHandMilli } from './inventory.js';
import { orderedPoCount, partnerCatalogItemId, publishedCatalogProducts } from './procurement.js';

/**
 * The connected lane: one buyer/supplier connection, the product mappings that
 * make it orderable, and one connected order per lifecycle status.
 *
 * Three documents describe a submitted connected order - the shared canonical
 * record plus a projection in each organization. `isProjection` follows the
 * production rule from `functions/src/commands/connected-po.ts`: the canonical
 * record and an unsubmitted buyer draft are `false`, both projections are
 * `true`. A DRAFT has no canonical record at all, because `cpo.submit` is what
 * creates one.
 */

const CONNECTION_REQUESTED = epochPlus(11, 8);
const CONNECTION_RESPONDED = epochPlus(11, 9);
const CPO_CREATED = epochPlus(12, 9);
const CPO_SUBMITTED = epochPlus(13, 9);

/** One supplier order unit is five buyer base units. */
const FACTOR_MILLI = 5_000;

/** Statuses past DRAFT that a projection pair exists for. */
const CONNECTED_STATUSES: readonly PoStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'ACCEPTED',
  'REJECTED',
  'SHIPPED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED',
];

const STATUS_TIMESTAMPS: Readonly<Record<string, Record<string, ReturnType<typeof epochPlus>>>> = {
  DRAFT: {},
  SUBMITTED: { submittedAt: CPO_SUBMITTED, orderedAt: CPO_SUBMITTED },
  ACCEPTED: { submittedAt: CPO_SUBMITTED, orderedAt: CPO_SUBMITTED, acceptedAt: epochPlus(14, 9) },
  REJECTED: { submittedAt: CPO_SUBMITTED, orderedAt: CPO_SUBMITTED },
  SHIPPED: {
    submittedAt: CPO_SUBMITTED,
    orderedAt: CPO_SUBMITTED,
    acceptedAt: epochPlus(14, 9),
    shippedAt: epochPlus(15, 9),
  },
  PARTIALLY_RECEIVED: {
    submittedAt: CPO_SUBMITTED,
    orderedAt: CPO_SUBMITTED,
    acceptedAt: epochPlus(14, 9),
    shippedAt: epochPlus(15, 9),
  },
  RECEIVED: {
    submittedAt: CPO_SUBMITTED,
    orderedAt: CPO_SUBMITTED,
    acceptedAt: epochPlus(14, 9),
    shippedAt: epochPlus(15, 9),
    receivedAt: epochPlus(16, 9),
  },
  CANCELLED: {
    submittedAt: CPO_SUBMITTED,
    orderedAt: CPO_SUBMITTED,
    cancelledAt: epochPlus(14, 9),
  },
};

export interface QaMapping {
  readonly mappingId: string;
  readonly buyerProduct: QaProduct;
  readonly supplierProduct: QaProduct;
  readonly supplierCatalogItemId: string;
}

export interface QaConnectedLine {
  readonly itemId: string;
  readonly mapping: QaMapping;
  readonly orderedSupplierMilli: number;
  readonly receivedSupplierMilli: number;
  readonly orderedBuyerBaseMilli: number;
  readonly receivedBuyerBaseMilli: number;
  readonly unitPriceMinor: number;
}

export interface QaConnectedOrder {
  readonly purchaseOrderId: string;
  readonly orderNumber: string | undefined;
  readonly status: PoStatus;
  readonly receivingWarehouseId: string;
  readonly lines: readonly QaConnectedLine[];
}

export interface QaNetwork {
  readonly connectionId: string;
  readonly buyer: QaOrg;
  readonly supplier: QaOrg;
  readonly mappings: readonly QaMapping[];
  readonly orders: readonly QaConnectedOrder[];
}

function findOrg(plan: QaPlan, role: QaOrg['networkRole']): QaOrg | undefined {
  return plan.organizations.find((org) => org.networkRole === role);
}

function buildMappings(buyer: QaOrg, supplier: QaOrg): readonly QaMapping[] {
  const catalog = publishedCatalogProducts(supplier).slice(0, 4);
  // A mapped buyer product receives connected stock, so it has to be one whose
  // balance can absorb a receipt without implying a negative opening balance.
  // Matching base units is what keeps the conversion factor meaningful.
  const available = buyer.products.filter(
    (product) => product.status === 'ACTIVE' && totalOnHandMilli(product) >= 15_000,
  );
  const taken = new Set<string>();
  return catalog.map((supplierProduct, index) => {
    const buyerProduct = available.find(
      (candidate) =>
        !taken.has(candidate.productId) && candidate.baseUnit === supplierProduct.baseUnit,
    );
    if (buyerProduct === undefined) {
      throw new Error(
        `no well-stocked ${supplierProduct.baseUnit} buyer product is left to map onto ${supplierProduct.productId}`,
      );
    }
    taken.add(buyerProduct.productId);
    return {
      mappingId: `qa-mapping-${ordinal(index + 1)}`,
      buyerProduct,
      supplierProduct,
      supplierCatalogItemId: partnerCatalogItemId(supplierProduct),
    };
  });
}

function buildOrders(buyer: QaOrg, mappings: readonly QaMapping[]): readonly QaConnectedOrder[] {
  let allocated = orderedPoCount(buyer);
  const orders: QaConnectedOrder[] = [];

  CONNECTED_STATUSES.forEach((status, index) => {
    const mapping = mappings[index % mappings.length];
    if (mapping === undefined) throw new Error('connected order needs a mapping');
    const orderedSupplierMilli = 1_000 + index * 200;
    const settled = status === 'RECEIVED';
    const partial = status === 'PARTIALLY_RECEIVED';
    const receivedSupplierMilli = settled
      ? orderedSupplierMilli
      : partial
        ? Math.floor(orderedSupplierMilli / 2)
        : 0;

    // DRAFT never reaches the counter; every later status has been submitted.
    let orderNumber: string | undefined;
    if (status !== 'DRAFT') {
      allocated += 1;
      orderNumber = `${buyer.purchaseOrderPrefix}-2026-${ordinal(allocated, 3)}`;
    }

    const receivingWarehouseId = mapping.buyerProduct.warehouseIds[0];
    if (receivingWarehouseId === undefined) throw new Error('mapped product has no warehouse');

    orders.push({
      purchaseOrderId: `qa-cpo-${ordinal(index + 1)}`,
      orderNumber,
      status,
      receivingWarehouseId,
      lines: [
        {
          itemId: 'line-01',
          mapping,
          orderedSupplierMilli,
          receivedSupplierMilli,
          orderedBuyerBaseMilli: convertMilli(orderedSupplierMilli, FACTOR_MILLI),
          receivedBuyerBaseMilli: convertMilli(receivedSupplierMilli, FACTOR_MILLI),
          unitPriceMinor: mapping.supplierProduct.purchaseCostMinor * 5,
        },
      ],
    });
  });

  return orders;
}

/** The connected lane exists only when both a buyer and a supplier organization do. */
export function connectedNetworkPlan(plan: QaPlan): QaNetwork | undefined {
  const buyer = findOrg(plan, 'BUYER');
  const supplier = findOrg(plan, 'SUPPLIER');
  if (buyer === undefined || supplier === undefined) return undefined;
  const mappings = buildMappings(buyer, supplier);
  if (mappings.length === 0) return undefined;
  return {
    connectionId: `${buyer.orgId}__${supplier.orgId}`,
    buyer,
    supplier,
    mappings,
    orders: buildOrders(buyer, mappings),
  };
}

/** Connected orders that consumed a number from the buyer's shared counter. */
export function connectedNumberedCount(network: QaNetwork | undefined): number {
  if (network === undefined) return 0;
  return network.orders.filter((order) => order.orderNumber !== undefined).length;
}

function connectionFields(network: QaNetwork): Record<string, unknown> {
  return {
    connectionId: network.connectionId,
    buyerOrgId: network.buyer.orgId,
    supplierOrgId: network.supplier.orgId,
    buyerHandle: network.buyer.handle,
    buyerName: network.buyer.name,
    supplierHandle: network.supplier.handle,
    supplierName: network.supplier.name,
    status: 'ACTIVE',
    requestedByUid: network.buyer.ownerUid,
    requestedAt: CONNECTION_REQUESTED,
    respondedByUid: network.supplier.ownerUid,
    respondedAt: CONNECTION_RESPONDED,
    updatedAt: CONNECTION_RESPONDED,
  };
}

function writeConnection(builder: DatasetBuilder, network: QaNetwork): void {
  const fields = connectionFields(network);
  builder.add(
    serverPaths.canonicalConnection(network.buyer.orgId, network.supplier.orgId),
    CanonicalConnectionSchema,
    fields,
  );
  const ordersPlacedCount = connectedNumberedCount(network);
  for (const org of [network.buyer, network.supplier]) {
    builder.add(
      paths.connectionProjection(org.orgId, network.connectionId),
      ConnectionProjectionSchema,
      { ...fields, ordersPlacedCount },
    );
  }
}

function writeMappings(builder: DatasetBuilder, network: QaNetwork): void {
  for (const mapping of network.mappings) {
    builder.add(
      paths.productMapping(network.buyer.orgId, mapping.mappingId),
      ProductMappingSchema,
      {
        mappingId: mapping.mappingId,
        connectionId: network.connectionId,
        buyerOrgId: network.buyer.orgId,
        buyerProductId: mapping.buyerProduct.productId,
        buyerProductNameSnapshot: mapping.buyerProduct.name,
        buyerSkuSnapshot: mapping.buyerProduct.internalSku,
        supplierOrgId: network.supplier.orgId,
        supplierCatalogItemId: mapping.supplierCatalogItemId,
        supplierPartnerSkuSnapshot: `PACK-${mapping.supplierProduct.internalSku}`,
        supplierDisplayNameSnapshot: `${mapping.supplierProduct.name} 5 ${mapping.supplierProduct.baseUnit} Pack`,
        buyerBaseUnit: mapping.buyerProduct.baseUnit,
        supplierOrderUnit: 'PACK',
        supplierToBuyerBaseFactorMilli: FACTOR_MILLI,
        semanticConfirmedByUid: network.buyer.ownerUid,
        semanticConfirmedByName: 'Dana Owner',
        semanticConfirmedAt: epochPlus(12, 8),
        status: 'VERIFIED',
        createdAt: epochPlus(12, 8),
      },
    );
  }
}

function itemFields(line: QaConnectedLine): Record<string, unknown> {
  return {
    itemId: line.itemId,
    buyerProductId: line.mapping.buyerProduct.productId,
    buyerProductNameSnapshot: line.mapping.buyerProduct.name,
    buyerSkuSnapshot: line.mapping.buyerProduct.internalSku,
    buyerBaseUnitSnapshot: line.mapping.buyerProduct.baseUnit,
    orderedBuyerBaseMilli: line.orderedBuyerBaseMilli,
    receivedBuyerBaseMilli: line.receivedBuyerBaseMilli,
    unitPriceMinor: line.unitPriceMinor,
    lineTotalMinor: deriveStockValueMinor(line.orderedSupplierMilli, line.unitPriceMinor),
    currency: 'LKR',
    mappingId: line.mapping.mappingId,
    supplierCatalogItemId: line.mapping.supplierCatalogItemId,
    supplierProductNameSnapshot: line.mapping.supplierProduct.name,
    supplierSkuSnapshot: `PACK-${line.mapping.supplierProduct.internalSku}`,
    supplierOrderUnitSnapshot: 'PACK',
    orderedSupplierMilli: line.orderedSupplierMilli,
    receivedSupplierMilli: line.receivedSupplierMilli,
    supplierToBuyerBaseFactorMilliSnapshot: FACTOR_MILLI,
  };
}

function orderTotal(order: QaConnectedOrder): number {
  return order.lines.reduce(
    (sum, line) => sum + deriveStockValueMinor(line.orderedSupplierMilli, line.unitPriceMinor),
    0,
  );
}

function writeOrders(builder: DatasetBuilder, network: QaNetwork): void {
  for (const order of network.orders) {
    const totalMinor = orderTotal(order);
    const base = {
      purchaseOrderId: order.purchaseOrderId,
      ...(order.orderNumber !== undefined ? { orderNumber: order.orderNumber } : {}),
      supplierKind: 'CONNECTED' as const,
      connectionId: network.connectionId,
      status: order.status,
      currency: 'LKR',
      totalMinor,
      createdBy: network.buyer.ownerUid,
      createdAt: CPO_CREATED,
      ...(STATUS_TIMESTAMPS[order.status] ?? {}),
    };

    const buyerSide = {
      ...base,
      viewRole: 'BUYER' as const,
      counterpartyName: network.supplier.name,
      counterpartyOrgId: network.supplier.orgId,
      counterpartyHandle: network.supplier.handle,
      receivingWarehouseId: order.receivingWarehouseId,
      // A draft is not a projection of anything: no canonical record exists yet.
      isProjection: order.status !== 'DRAFT',
    };

    builder.add(
      paths.purchaseOrder(network.buyer.orgId, order.purchaseOrderId),
      PurchaseOrderSchema,
      buyerSide,
    );
    for (const line of order.lines) {
      builder.add(
        paths.purchaseOrderItem(network.buyer.orgId, order.purchaseOrderId, line.itemId),
        PurchaseOrderItemSchema,
        itemFields(line),
      );
    }

    // Below DRAFT there is no supplier projection and no canonical record.
    if (order.status === 'DRAFT') continue;

    builder.add(
      paths.purchaseOrder(network.supplier.orgId, order.purchaseOrderId),
      PurchaseOrderSchema,
      {
        ...base,
        viewRole: 'SUPPLIER',
        counterpartyName: network.buyer.name,
        counterpartyOrgId: network.buyer.orgId,
        counterpartyHandle: network.buyer.handle,
        isProjection: true,
      },
    );
    for (const line of order.lines) {
      builder.add(
        paths.purchaseOrderItem(network.supplier.orgId, order.purchaseOrderId, line.itemId),
        PurchaseOrderItemSchema,
        itemFields(line),
      );
    }

    builder.add(
      serverPaths.connectedPurchaseOrder(order.purchaseOrderId),
      ConnectedPurchaseOrderSchema,
      {
        ...base,
        viewRole: 'BUYER',
        counterpartyName: network.supplier.name,
        counterpartyOrgId: network.supplier.orgId,
        counterpartyHandle: network.supplier.handle,
        buyerOrgId: network.buyer.orgId,
        supplierOrgId: network.supplier.orgId,
        receivingWarehouseId: order.receivingWarehouseId,
        isProjection: false,
      },
    );
    for (const line of order.lines) {
      builder.add(
        serverPaths.connectedPurchaseOrderItem(order.purchaseOrderId, line.itemId),
        ConnectedPurchaseOrderItemSchema,
        itemFields(line),
      );
    }

    const historyId = `qa-cpoh-${order.purchaseOrderId}-01`;
    builder.add(
      serverPaths.connectedPurchaseOrderHistory(order.purchaseOrderId, historyId),
      ConnectedHistorySchema,
      {
        historyId,
        fromStatus: 'DRAFT',
        toStatus: order.status === 'SUBMITTED' ? 'SUBMITTED' : order.status,
        actorUid: network.buyer.ownerUid,
        actorName: 'Dana Owner',
        actorOrgId: network.buyer.orgId,
        actorOrgName: network.buyer.name,
        ...(order.status === 'CANCELLED' ? {} : { operationId: `qa-op-${historyId}` }),
        note: `QA connected transition to ${order.status}`,
        createdAt: CPO_SUBMITTED,
      },
    );
  }
}

export function generateNetwork(builder: DatasetBuilder, plan: QaPlan): void {
  const network = connectedNetworkPlan(plan);
  if (network === undefined) return;
  writeConnection(builder, network);
  writeMappings(builder, network);
  writeOrders(builder, network);
}
