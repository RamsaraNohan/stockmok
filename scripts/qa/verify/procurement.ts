import type { DocumentData } from 'firebase-admin/firestore';

import { deriveStockValueMinor } from '../../../packages/shared/src/domain.js';
import type { QaSnapshot } from './integrity.js';

/**
 * Private procurement reconciliation.
 *
 * Order totals are re-derived from their own lines at the single frozen rounding
 * point (`deriveStockValueMinor`), received quantities are checked against what
 * was ordered and against the receipt movements that must accompany them, and
 * the two counters that track ordering - `counters/purchaseOrder` and
 * `privatePartners.ordersPlacedCount` - are recomputed from the orders on disk.
 */

function numberField(data: DocumentData, key: string): number | undefined {
  const value: unknown = data[key];
  return typeof value === 'number' ? value : undefined;
}

function stringField(data: DocumentData, key: string): string | undefined {
  const value: unknown = data[key];
  return typeof value === 'string' ? value : undefined;
}

interface OrderLine {
  readonly path: string;
  readonly data: DocumentData;
}

export function verifyProcurement(snapshot: QaSnapshot): readonly string[] {
  const failures: string[] = [];

  // poPath -> lines
  const linesByOrder = new Map<string, OrderLine[]>();
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts[2] !== 'purchaseOrders' || parts[4] !== 'items')
      continue;
    const orderPath = parts.slice(0, 4).join('/');
    const bucket = linesByOrder.get(orderPath);
    if (bucket === undefined) linesByOrder.set(orderPath, [{ path, data }]);
    else bucket.push({ path, data });
  }

  // (org, poId, productId) -> summed PURCHASE_RECEIPT quantity. `sourceId`
  // (a purchase order id) and `productId` are both tenant-scoped identifiers
  // that repeat across organizations by design (the QA fixtures deliberately
  // reuse ids as isolation traps, and a connected order's shared
  // `purchaseOrderId` is not org-prefixed at all) - so the org the movement
  // actually lives in must be part of the key, or two different tenants'
  // receipts collide into one total.
  const receipts = new Map<string, number>();
  for (const [path, data] of snapshot.documents) {
    if (stringField(data, 'movementType') !== 'PURCHASE_RECEIPT') continue;
    const sourceId = stringField(data, 'sourceId');
    const productId = stringField(data, 'productId');
    const org = path.split('/')[1];
    if (sourceId === undefined || productId === undefined || org === undefined) continue;
    const key = `${org}|${sourceId}|${productId}`;
    receipts.set(key, (receipts.get(key) ?? 0) + (numberField(data, 'signedQuantityMilli') ?? 0));
  }

  const numberedByOrg = new Map<string, number>();
  const placedByPartner = new Map<string, number>();

  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts[2] !== 'purchaseOrders' || parts.length !== 4)
      continue;
    const org = parts[1];
    const purchaseOrderId = parts[3];
    if (org === undefined || purchaseOrderId === undefined) continue;

    const status = stringField(data, 'status');
    const orderNumber = stringField(data, 'orderNumber');
    const supplierKind = stringField(data, 'supplierKind');
    const lines = linesByOrder.get(path) ?? [];

    if (lines.length === 0) {
      failures.push(`PRIVATE_PO_RECONCILIATION ${path} has no order lines`);
    }

    // Order numbering: a DRAFT has never been through the allocator.
    if (status === 'DRAFT' && orderNumber !== undefined) {
      failures.push(
        `PRIVATE_PO_RECONCILIATION ${path} is DRAFT but carries orderNumber ${orderNumber}`,
      );
    }
    if (status !== 'DRAFT' && orderNumber === undefined) {
      failures.push(
        `PRIVATE_PO_RECONCILIATION ${path} is ${String(status)} but carries no orderNumber`,
      );
    }
    if (orderNumber !== undefined) {
      // A connected order draws its number from the *buyer's* counter, so only
      // the buyer projection is counted once.
      const isSupplierProjection = stringField(data, 'viewRole') === 'SUPPLIER';
      if (!isSupplierProjection) {
        numberedByOrg.set(org, (numberedByOrg.get(org) ?? 0) + 1);
      }
    }

    let expectedTotal = 0;
    let allFull = lines.length > 0;
    let anyReceived = false;
    for (const line of lines) {
      const ordered = numberField(line.data, 'orderedBuyerBaseMilli');
      const received = numberField(line.data, 'receivedBuyerBaseMilli');
      const unitPrice = numberField(line.data, 'unitPriceMinor');
      const lineTotal = numberField(line.data, 'lineTotalMinor');
      if (
        ordered === undefined ||
        received === undefined ||
        unitPrice === undefined ||
        lineTotal === undefined
      ) {
        failures.push(`PRIVATE_PO_RECONCILIATION ${line.path} is missing a reconciliation field`);
        allFull = false;
        continue;
      }
      if (received > ordered) {
        failures.push(
          `PRIVATE_PO_RECONCILIATION ${line.path} received ${String(received)} of ${String(ordered)} ordered`,
        );
      }
      if (received > 0) anyReceived = true;
      if (received !== ordered) allFull = false;
      expectedTotal += lineTotal;

      if (supplierKind === 'PRIVATE') {
        // Private line totals price the buyer-base quantity directly.
        const expectedLineTotal = deriveStockValueMinor(ordered, unitPrice);
        if (lineTotal !== expectedLineTotal) {
          failures.push(
            `PRIVATE_PO_RECONCILIATION ${line.path} lineTotalMinor=${String(lineTotal)} expected ${String(expectedLineTotal)}`,
          );
        }
      }

      const productId = stringField(line.data, 'buyerProductId');
      if (productId !== undefined && stringField(data, 'viewRole') !== 'SUPPLIER') {
        const receipted = receipts.get(`${org}|${purchaseOrderId}|${productId}`) ?? 0;
        if (receipted !== received) {
          failures.push(
            `PRIVATE_PO_RECONCILIATION ${line.path} received ${String(received)} but PURCHASE_RECEIPT movements total ${String(receipted)}`,
          );
        }
      }
    }

    const totalMinor = numberField(data, 'totalMinor');
    if (totalMinor !== expectedTotal) {
      failures.push(
        `PRIVATE_PO_RECONCILIATION ${path} totalMinor=${String(totalMinor)} but its lines sum to ${String(expectedTotal)}`,
      );
    }

    // Status must agree with what the lines actually received.
    if (status === 'RECEIVED' && !allFull) {
      failures.push(`PRIVATE_PO_RECONCILIATION ${path} is RECEIVED with lines still outstanding`);
    }
    if (status === 'PARTIALLY_RECEIVED' && (!anyReceived || allFull)) {
      failures.push(
        `PRIVATE_PO_RECONCILIATION ${path} is PARTIALLY_RECEIVED without a partial receipt`,
      );
    }
    if ((status === 'DRAFT' || status === 'ORDERED' || status === 'CANCELLED') && anyReceived) {
      failures.push(`PRIVATE_PO_RECONCILIATION ${path} is ${status} but has received stock`);
    }

    if (supplierKind === 'PRIVATE' && orderNumber !== undefined && status !== 'CANCELLED') {
      const supplierId = stringField(data, 'privateSupplierId');
      if (supplierId !== undefined) {
        const key = `${org}|${supplierId}`;
        placedByPartner.set(key, (placedByPartner.get(key) ?? 0) + 1);
      }
    }
  }

  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts[2] !== 'counters' || parts[3] !== 'purchaseOrder')
      continue;
    const org = parts[1];
    if (org === undefined) continue;
    const value = numberField(data, 'value');
    const expected = numberedByOrg.get(org) ?? 0;
    if (value !== expected) {
      failures.push(
        `PRIVATE_PO_RECONCILIATION ${path} value=${String(value)} but ${String(expected)} orders carry a number`,
      );
    }
  }

  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts[2] !== 'privatePartners' || parts.length !== 4)
      continue;
    const org = parts[1];
    const partnerId = parts[3];
    if (org === undefined || partnerId === undefined) continue;
    const actual = numberField(data, 'ordersPlacedCount');
    const expected = placedByPartner.get(`${org}|${partnerId}`) ?? 0;
    if (actual !== expected) {
      failures.push(
        `PRIVATE_PO_RECONCILIATION ${path} ordersPlacedCount=${String(actual)} but ${String(expected)} non-cancelled orders were placed`,
      );
    }
  }

  // INV-17 (`partner-catalog.ts`, `partnerCatalog.publish`) — a catalog
  // item's orderUnit must equal its source product's baseUnit. A catalog row
  // that disagrees could never have been published by the real command.
  for (const [path, data] of snapshot.documents) {
    const parts = path.split('/');
    if (parts[0] !== 'organizations' || parts[2] !== 'partnerCatalog' || parts.length !== 4)
      continue;
    const org = parts[1];
    const sourceProductId = stringField(data, 'sourceProductId');
    const orderUnit = stringField(data, 'orderUnit');
    if (org === undefined || sourceProductId === undefined) continue;
    const product = snapshot.documents.get(`organizations/${org}/products/${sourceProductId}`);
    const baseUnit = product === undefined ? undefined : stringField(product, 'baseUnit');
    if (orderUnit !== baseUnit) {
      failures.push(
        `PRIVATE_PO_RECONCILIATION ${path} orderUnit=${String(orderUnit)} disagrees with source product baseUnit=${String(baseUnit)} (INV-17)`,
      );
    }
  }

  return failures;
}
