import type { DocumentData } from 'firebase-admin/firestore';

import { convertMilli } from '../../../packages/shared/src/domain.js';
import type { QaSnapshot } from './integrity.js';

/**
 * Connected-network reconciliation.
 *
 * A submitted connected order exists three times: once canonically and once in
 * each organization. This verifier proves the three agree, that `isProjection`
 * follows the production rule, that a DRAFT has neither a canonical record nor a
 * supplier projection, and that supplier-to-buyer unit conversion round-trips
 * through the factor snapshot the line itself carries.
 *
 * Parity is checked at three grains — header, item and history — because each
 * is written from one shared object in the same transaction
 * (`connected-po.ts`'s `sharedHeader`, `frozenLine`, and
 * `connected-lib.ts`'s `writeConnectedHistory` row): a mutation to any single
 * copy is a corruption a schema-only check cannot see.
 */

function numberField(data: DocumentData, key: string): number | undefined {
  const value: unknown = data[key];
  return typeof value === 'number' ? value : undefined;
}

function stringField(data: DocumentData, key: string): string | undefined {
  const value: unknown = data[key];
  return typeof value === 'string' ? value : undefined;
}

function boolField(data: DocumentData, key: string): boolean | undefined {
  const value: unknown = data[key];
  return typeof value === 'boolean' ? value : undefined;
}

function parityValue(data: DocumentData, key: string): unknown {
  return data[key];
}

function isTimestampLike(value: unknown): value is { toMillis: () => number } {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as { toMillis?: unknown }).toMillis === 'function'
  );
}

/**
 * Value equality across a Firestore round-trip. Two documents built from the
 * same in-memory field set carry the identical object reference offline, but
 * the emulator hands back a freshly-constructed `Timestamp` per document, so
 * `a !== b` would false-positive on every shared timestamp field.
 */
function fieldsEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (isTimestampLike(a) && isTimestampLike(b)) return a.toMillis() === b.toMillis();
  return false;
}

const SHARED_CONNECTION_FIELDS = [
  'connectionId',
  'buyerOrgId',
  'supplierOrgId',
  'buyerHandle',
  'buyerName',
  'supplierHandle',
  'supplierName',
  'status',
  'requestedByUid',
] as const;

/**
 * The connected order's `sharedHeader` (`connected-po.ts`) — every field a
 * `cpo.*` command writes identically to the canonical record and both
 * projections. `viewRole`, `counterpartyName`, `counterpartyOrgId`,
 * `counterpartyHandle`, `isProjection` and `receivingWarehouseId` are
 * deliberately excluded: they differ by projection role/context by design.
 */
const HEADER_PARITY_FIELDS = [
  'purchaseOrderId',
  'orderNumber',
  'supplierKind',
  'connectionId',
  'status',
  'currency',
  'totalMinor',
  'expectedDate',
  'lastOperationId',
  'createdBy',
  'createdAt',
  'submittedAt',
  'acceptedAt',
  'shippedAt',
  'receivedAt',
  'cancelledAt',
] as const;

/**
 * The frozen line object (`frozenLine`, `connected-po.ts`) written
 * identically to the canonical item, the buyer item and the supplier item at
 * submit, and to the same three locations again at receive.
 */
const ITEM_PARITY_FIELDS = [
  'itemId',
  'buyerProductId',
  'buyerProductNameSnapshot',
  'buyerSkuSnapshot',
  'buyerBaseUnitSnapshot',
  'orderedBuyerBaseMilli',
  'receivedBuyerBaseMilli',
  'unitPriceMinor',
  'lineTotalMinor',
  'currency',
  'mappingId',
  'supplierCatalogItemId',
  'supplierProductNameSnapshot',
  'supplierSkuSnapshot',
  'supplierOrderUnitSnapshot',
  'orderedSupplierMilli',
  'receivedSupplierMilli',
  'supplierToBuyerBaseFactorMilliSnapshot',
] as const;

/** The `row` object `writeConnectedHistory` (`connected-lib.ts`) triple-writes. */
const HISTORY_PARITY_FIELDS = [
  'historyId',
  'fromStatus',
  'toStatus',
  'actorUid',
  'actorName',
  'actorOrgId',
  'actorOrgName',
  'operationId',
  'note',
  'createdAt',
] as const;

/**
 * Every edge a `cpo.*` command can actually produce (`connected-po.ts`):
 * `submit`, `respond` (ACCEPT or REJECT), `ship`, `receive` (twice — a
 * partial receipt or a completing one), `cancel` (only from SUBMITTED; a
 * DRAFT cancellation never creates a canonical record or a history row).
 * Any other (fromStatus, toStatus) pair could not have been written by a
 * real command.
 */
const LEGAL_TRANSITIONS: ReadonlySet<string> = new Set([
  'DRAFT>SUBMITTED',
  'SUBMITTED>ACCEPTED',
  'SUBMITTED>REJECTED',
  'SUBMITTED>CANCELLED',
  'ACCEPTED>SHIPPED',
  'SHIPPED>PARTIALLY_RECEIVED',
  'SHIPPED>RECEIVED',
  'PARTIALLY_RECEIVED>RECEIVED',
]);

export function verifyNetwork(snapshot: QaSnapshot): readonly string[] {
  const failures: string[] = [];

  // Connection projections must mirror the canonical record.
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts[2] !== 'connections' || parts.length !== 4) continue;
    const connectionId = parts[3];
    if (connectionId === undefined) continue;
    const canonical = snapshot.documents.get(`connections/${connectionId}`);
    if (canonical === undefined) {
      failures.push(`NETWORK_RECONCILIATION ${path} has no canonical connection`);
      continue;
    }
    for (const field of SHARED_CONNECTION_FIELDS) {
      const projected: unknown = data[field];
      const authority: unknown = canonical[field];
      if (projected !== authority) {
        failures.push(
          `NETWORK_RECONCILIATION ${path} ${field}=${String(projected)} disagrees with canonical ${String(authority)}`,
        );
      }
    }
  }

  // Count numbered connected orders per connection, from the canonical records.
  const numberedByConnection = new Map<string, number>();
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'connectedPurchaseOrders' || parts.length !== 2) continue;
    const connectionId = stringField(data, 'connectionId');
    if (connectionId === undefined) continue;
    if (stringField(data, 'orderNumber') !== undefined) {
      numberedByConnection.set(connectionId, (numberedByConnection.get(connectionId) ?? 0) + 1);
    }
    if (boolField(data, 'isProjection') !== false) {
      failures.push(
        `NETWORK_RECONCILIATION ${path} canonical record must carry isProjection=false`,
      );
    }

    const buyerOrgId = stringField(data, 'buyerOrgId');
    const supplierOrgId = stringField(data, 'supplierOrgId');
    const purchaseOrderId = parts[1];
    if (buyerOrgId === undefined || supplierOrgId === undefined || purchaseOrderId === undefined)
      continue;

    for (const [org, expectedRole] of [
      [buyerOrgId, 'BUYER'],
      [supplierOrgId, 'SUPPLIER'],
    ] as const) {
      const projectionPath = `organizations/${org}/purchaseOrders/${purchaseOrderId}`;
      const projection = snapshot.documents.get(projectionPath);
      if (projection === undefined) {
        failures.push(
          `NETWORK_RECONCILIATION ${path} has no ${expectedRole} projection at ${projectionPath}`,
        );
        continue;
      }
      if (stringField(projection, 'viewRole') !== expectedRole) {
        failures.push(
          `NETWORK_RECONCILIATION ${projectionPath} should carry viewRole=${expectedRole}`,
        );
      }
      if (boolField(projection, 'isProjection') !== true) {
        failures.push(`NETWORK_RECONCILIATION ${projectionPath} must carry isProjection=true`);
      }
      for (const field of HEADER_PARITY_FIELDS) {
        if (!fieldsEqual(parityValue(projection, field), parityValue(data, field))) {
          failures.push(
            `CONNECTED_HEADER_PARITY ${projectionPath} ${field}=${String(projection[field])} disagrees with canonical ${String(data[field])}`,
          );
        }
      }
    }
  }

  // A connected DRAFT lives only on the buyer side and has no canonical record.
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts[2] !== 'purchaseOrders' || parts.length !== 4)
      continue;
    if (stringField(data, 'supplierKind') !== 'CONNECTED') continue;
    const purchaseOrderId = parts[3];
    if (purchaseOrderId === undefined) continue;
    const status = stringField(data, 'status');
    const canonicalExists = snapshot.documents.has(`connectedPurchaseOrders/${purchaseOrderId}`);

    if (status === 'DRAFT') {
      if (canonicalExists) {
        failures.push(`NETWORK_RECONCILIATION ${path} is a DRAFT with a canonical record`);
      }
      if (stringField(data, 'viewRole') !== 'BUYER') {
        failures.push(
          `NETWORK_RECONCILIATION ${path} is a connected DRAFT outside the buyer organization`,
        );
      }
      if (boolField(data, 'isProjection') !== false) {
        failures.push(
          `NETWORK_RECONCILIATION ${path} is a DRAFT and projects nothing, so isProjection must be false`,
        );
      }
      // `cpo.draftSave` never writes `receivingWarehouseId` — only
      // `cpo.receive` does, onto an order that has already been submitted.
      if (stringField(data, 'receivingWarehouseId') !== undefined) {
        failures.push(`NETWORK_RECONCILIATION ${path} is a DRAFT but carries receivingWarehouseId`);
      }
    } else if (!canonicalExists) {
      failures.push(`NETWORK_RECONCILIATION ${path} is ${String(status)} with no canonical record`);
    }

    // `receivingWarehouseId` is pinned only by `cpo.receive`, so it cannot
    // exist before a receipt has happened, and it never crosses onto the
    // canonical record (checked separately below).
    const received = status === 'PARTIALLY_RECEIVED' || status === 'RECEIVED';
    if (!received && stringField(data, 'receivingWarehouseId') !== undefined) {
      failures.push(
        `NETWORK_RECONCILIATION ${path} is ${String(status)} but already carries receivingWarehouseId`,
      );
    }
  }

  // `receivingWarehouseId` never crosses onto the canonical record or the
  // supplier's projection (DB-05 §8) — warehouse identity is buyer-private.
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    const isCanonicalOrder = parts[0] === 'connectedPurchaseOrders' && parts.length === 2;
    const isSupplierProjection =
      parts[0] === 'organizations' &&
      parts[2] === 'purchaseOrders' &&
      parts.length === 4 &&
      stringField(data, 'supplierKind') === 'CONNECTED' &&
      stringField(data, 'viewRole') === 'SUPPLIER';
    if (!isCanonicalOrder && !isSupplierProjection) continue;
    if (stringField(data, 'receivingWarehouseId') !== undefined) {
      failures.push(`NETWORK_RECONCILIATION ${path} must not carry receivingWarehouseId`);
    }
  }

  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts[2] !== 'connections' || parts.length !== 4) continue;
    const connectionId = parts[3];
    if (connectionId === undefined) continue;
    const actual = numberField(data, 'ordersPlacedCount');
    const expected = numberedByConnection.get(connectionId) ?? 0;
    if (actual !== expected) {
      failures.push(
        `NETWORK_RECONCILIATION ${path} ordersPlacedCount=${String(actual)} but ${String(expected)} connected orders carry a number`,
      );
    }
  }

  // Item parity: the canonical line and both projected lines must agree on
  // every field the frozen line carries.
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'connectedPurchaseOrders' || parts[2] !== 'items' || parts.length !== 4)
      continue;
    const purchaseOrderId = parts[1];
    const itemId = parts[3];
    if (purchaseOrderId === undefined || itemId === undefined) continue;
    const order = snapshot.documents.get(`connectedPurchaseOrders/${purchaseOrderId}`);
    const buyerOrgId = order === undefined ? undefined : stringField(order, 'buyerOrgId');
    const supplierOrgId = order === undefined ? undefined : stringField(order, 'supplierOrgId');
    if (buyerOrgId === undefined || supplierOrgId === undefined) continue;

    for (const org of [buyerOrgId, supplierOrgId]) {
      const projectionPath = `organizations/${org}/purchaseOrders/${purchaseOrderId}/items/${itemId}`;
      const projection = snapshot.documents.get(projectionPath);
      if (projection === undefined) {
        failures.push(
          `CONNECTED_ITEM_PARITY ${projectionPath} is missing while canonical ${path} exists`,
        );
        continue;
      }
      for (const field of ITEM_PARITY_FIELDS) {
        if (!fieldsEqual(parityValue(projection, field), parityValue(data, field))) {
          failures.push(
            `CONNECTED_ITEM_PARITY ${projectionPath} ${field}=${String(projection[field])} disagrees with canonical ${String(data[field])}`,
          );
        }
      }
    }
  }

  // History parity: every canonical row must exist, byte-for-byte, at both
  // organization mirrors, and every non-DRAFT order must carry at least one.
  const historyPresent = new Set<string>();
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'connectedPurchaseOrders' || parts[2] !== 'history' || parts.length !== 4)
      continue;
    const purchaseOrderId = parts[1];
    const historyId = parts[3];
    if (purchaseOrderId === undefined || historyId === undefined) continue;
    historyPresent.add(purchaseOrderId);

    const fromStatus = data['fromStatus'] === null ? 'null' : stringField(data, 'fromStatus');
    const toStatus = stringField(data, 'toStatus');
    if (toStatus === undefined || !LEGAL_TRANSITIONS.has(`${String(fromStatus)}>${toStatus}`)) {
      failures.push(
        `ILLEGAL_HISTORY_TRANSITION ${path} ${String(fromStatus)} -> ${String(toStatus)} is not a transition any cpo.* command produces`,
      );
    }

    const order = snapshot.documents.get(`connectedPurchaseOrders/${purchaseOrderId}`);
    const buyerOrgId = order === undefined ? undefined : stringField(order, 'buyerOrgId');
    const supplierOrgId = order === undefined ? undefined : stringField(order, 'supplierOrgId');
    if (buyerOrgId === undefined || supplierOrgId === undefined) continue;

    for (const org of [buyerOrgId, supplierOrgId]) {
      const projectionPath = `organizations/${org}/purchaseOrders/${purchaseOrderId}/history/${historyId}`;
      const projection = snapshot.documents.get(projectionPath);
      if (projection === undefined) {
        failures.push(
          `CONNECTED_HISTORY_PARITY ${projectionPath} is missing while canonical ${path} exists`,
        );
        continue;
      }
      for (const field of HISTORY_PARITY_FIELDS) {
        if (!fieldsEqual(parityValue(projection, field), parityValue(data, field))) {
          failures.push(
            `CONNECTED_HISTORY_PARITY ${projectionPath} ${field}=${String(projection[field])} disagrees with canonical ${String(data[field])}`,
          );
        }
      }
    }
  }
  for (const [path] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'connectedPurchaseOrders' || parts.length !== 2) continue;
    const purchaseOrderId = parts[1];
    if (purchaseOrderId === undefined) continue;
    if (!historyPresent.has(purchaseOrderId)) {
      failures.push(
        `CONNECTED_HISTORY_PARITY connectedPurchaseOrders/${purchaseOrderId} has no history row`,
      );
    }
  }

  // Unit conversion must round-trip through the factor the line carries.
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    const isOrgLine = parts[0] === 'organizations' && parts[4] === 'items';
    const isCanonicalLine = parts[0] === 'connectedPurchaseOrders' && parts[2] === 'items';
    if (!isOrgLine && !isCanonicalLine) continue;

    const factor = numberField(data, 'supplierToBuyerBaseFactorMilliSnapshot');
    if (factor === undefined) continue;
    if (factor <= 0) {
      failures.push(`NETWORK_RECONCILIATION ${path} carries a non-positive conversion factor`);
      continue;
    }
    for (const [supplierKey, buyerKey] of [
      ['orderedSupplierMilli', 'orderedBuyerBaseMilli'],
      ['receivedSupplierMilli', 'receivedBuyerBaseMilli'],
    ] as const) {
      const supplierValue = numberField(data, supplierKey);
      const buyerValue = numberField(data, buyerKey);
      if (supplierValue === undefined || buyerValue === undefined) continue;
      const expected = convertMilli(supplierValue, factor);
      if (buyerValue !== expected) {
        failures.push(
          `NETWORK_RECONCILIATION ${path} ${buyerKey}=${String(buyerValue)} but converting ${supplierKey} gives ${String(expected)}`,
        );
      }
    }
  }

  // Supplier dispatch is in the SUPPLIER's own order-unit domain (INV-17
  // makes that the supplier's baseUnit) — never the buyer-base-converted
  // quantity. `cpo.ship` deducts `orderedSupplierMilli` directly, once, in
  // full, the moment an order reaches SHIPPED.
  const dispatchByOrderProduct = new Map<string, number>();
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts[2] !== 'stockMovements' || parts.length !== 4)
      continue;
    if (stringField(data, 'movementType') !== 'CONNECTED_DISPATCH_OUT') continue;
    const org = parts[1];
    const sourceId = stringField(data, 'sourceId');
    const productId = stringField(data, 'productId');
    if (org === undefined || sourceId === undefined || productId === undefined) continue;
    const key = `${sourceId}|${org}|${productId}`;
    dispatchByOrderProduct.set(
      key,
      (dispatchByOrderProduct.get(key) ?? 0) + (numberField(data, 'signedQuantityMilli') ?? 0),
    );
  }
  const canonicalItemsByOrder = new Map<string, DocumentData[]>();
  for (const [itemPath, itemData] of snapshot.documents) {
    const itemParts = itemPath.split('/');
    if (itemParts[0] !== 'connectedPurchaseOrders' || itemParts[2] !== 'items') continue;
    const purchaseOrderId = itemParts[1];
    if (purchaseOrderId === undefined) continue;
    const bucket = canonicalItemsByOrder.get(purchaseOrderId);
    if (bucket === undefined) canonicalItemsByOrder.set(purchaseOrderId, [itemData]);
    else bucket.push(itemData);
  }
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'connectedPurchaseOrders' || parts.length !== 2) continue;
    const purchaseOrderId = parts[1];
    const supplierOrgId = stringField(data, 'supplierOrgId');
    const status = stringField(data, 'status');
    if (purchaseOrderId === undefined || supplierOrgId === undefined) continue;
    const dispatched =
      status === 'SHIPPED' || status === 'PARTIALLY_RECEIVED' || status === 'RECEIVED';

    const expectedByProduct = new Map<string, number>();
    for (const itemData of canonicalItemsByOrder.get(purchaseOrderId) ?? []) {
      const catalogItemId = stringField(itemData, 'supplierCatalogItemId');
      const orderedSupplierMilli = numberField(itemData, 'orderedSupplierMilli');
      if (catalogItemId === undefined || orderedSupplierMilli === undefined) continue;
      const catalogItem = snapshot.documents.get(
        `organizations/${supplierOrgId}/partnerCatalog/${catalogItemId}`,
      );
      const sourceProductId =
        catalogItem === undefined ? undefined : stringField(catalogItem, 'sourceProductId');
      if (sourceProductId === undefined) continue;
      expectedByProduct.set(
        sourceProductId,
        (expectedByProduct.get(sourceProductId) ?? 0) + orderedSupplierMilli,
      );
    }

    for (const [productId, orderedTotal] of expectedByProduct) {
      const key = `${purchaseOrderId}|${supplierOrgId}|${productId}`;
      const actual = dispatchByOrderProduct.get(key) ?? 0;
      const expected = dispatched ? -orderedTotal : 0;
      if (actual !== expected) {
        failures.push(
          `CONNECTED_DISPATCH_DOMAIN ${path} product ${productId}: CONNECTED_DISPATCH_OUT movements total ${String(actual)} but orderedSupplierMilli implies ${String(expected)}`,
        );
      }
    }
  }

  // Mappings must be usable: a verified status and a positive factor.
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts[2] !== 'productMappings' || parts.length !== 4)
      continue;
    const factor = numberField(data, 'supplierToBuyerBaseFactorMilli');
    if (factor === undefined || factor <= 0) {
      failures.push(`NETWORK_RECONCILIATION ${path} has a non-positive conversion factor`);
    }
    const status = stringField(data, 'status');
    if (status !== 'VERIFIED' && status !== 'DISABLED') {
      failures.push(
        `NETWORK_RECONCILIATION ${path} has an unexpected mapping status ${String(status)}`,
      );
    }
  }

  return failures;
}
