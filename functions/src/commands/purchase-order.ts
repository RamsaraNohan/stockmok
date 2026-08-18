import { deriveStockValueMinor, paths, type PoStatus, type StockStatus } from '@stockmok/shared';
import type { DocumentSnapshot, Firestore } from 'firebase-admin/firestore';
import { requireMembership } from './lib.js';
import {
  assertSafeQuantity,
  isNotifiableTransition,
  prospectiveSummaryStatus,
  readActiveProduct,
  readActiveWarehouse,
  readBalanceState,
  readStockNotificationContext,
  readSummaryState,
  requireOperationId,
  writeBalance,
  writeMovement,
  writeStockStatusNotification,
  writeSummary,
  type BalanceState,
  type SummaryState,
  type TrustedProduct,
} from './stock-lib.js';
import { writeAudit } from '../core/audit.js';
import { defineCommand } from '../core/define-command.js';
import { fail, untypedFailure } from '../core/errors.js';
import { serverNow, serverTimestamp } from '../core/time.js';
import type { TransactionScope } from '../core/transaction.js';
import type { TrustedMembership } from '../guards/membership.js';
import { INVENTORY_WRITERS, PO_WRITERS, RECEIVERS } from '../guards/roles.js';

/**
 * B3 owns **private** procurement only — `DRAFT → ORDERED → PARTIALLY_RECEIVED
 * → RECEIVED`, plus `CANCELLED` (DB-07 §8). `SUBMITTED`, `ACCEPTED`, `SHIPPED`
 * and `REJECTED` are connected-order states and belong to B4: an external
 * private supplier is not a Stockmok user and can perform no in-platform
 * action, so nothing in this file may produce one of them, and nothing here
 * touches `connectedPurchaseOrders/**`.
 */

/** A purchase order carries a bounded number of lines; DB-04 §8 caps any in-transaction query. */
const MAX_PO_ITEMS = 100;

/** `settings.purchaseOrderPrefix`'s frozen default (DB-02 §3.3, "e.g. `PO`"). */
const DEFAULT_PO_PREFIX = 'PO';

interface LoadedPurchaseOrder {
  readonly snapshot: DocumentSnapshot;
  readonly status: PoStatus;
  readonly privateSupplierId: string | undefined;
  readonly orderNumber: string | undefined;
  readonly receivingWarehouseId: string | undefined;
}

/**
 * Reads the order and proves it is this organization's **private** order.
 * `supplierKind` is immutable after create, so a connected order arriving at a
 * private command is a routing error rather than a state error.
 */
async function readPrivatePurchaseOrder(
  scope: TransactionScope,
  db: Firestore,
  actor: TrustedMembership,
  purchaseOrderId: string,
): Promise<LoadedPurchaseOrder> {
  const snapshot = await scope.get(db.doc(paths.purchaseOrder(actor.orgId, purchaseOrderId)));
  if (!snapshot.exists) {
    fail('CROSS_TENANT_REFERENCE', 'The purchase order does not belong to this organization.');
  }
  if (snapshot.get('supplierKind') !== 'PRIVATE') {
    fail('INVALID_TRANSITION', 'This is not a private purchase order.');
  }
  const privateSupplierId: unknown = snapshot.get('privateSupplierId');
  const orderNumber: unknown = snapshot.get('orderNumber');
  const receivingWarehouseId: unknown = snapshot.get('receivingWarehouseId');
  return {
    snapshot,
    status: snapshot.get('status') as PoStatus,
    privateSupplierId: typeof privateSupplierId === 'string' ? privateSupplierId : undefined,
    orderNumber: typeof orderNumber === 'string' ? orderNumber : undefined,
    receivingWarehouseId:
      typeof receivingWarehouseId === 'string' ? receivingWarehouseId : undefined,
  };
}

async function readOrderItems(
  scope: TransactionScope,
  db: Firestore,
  orgId: string,
  purchaseOrderId: string,
): Promise<readonly DocumentSnapshot[]> {
  const snapshot = await scope.query(
    db.collection(`${paths.purchaseOrder(orgId, purchaseOrderId)}/items`),
    MAX_PO_ITEMS,
  );
  return snapshot.docs;
}

async function readOrganizationName(
  scope: TransactionScope,
  db: Firestore,
  orgId: string,
): Promise<string> {
  const snapshot = await scope.get(db.doc(paths.organization(orgId)));
  const name: unknown = snapshot.get('name');
  return typeof name === 'string' ? name : orgId;
}

function orderedMilliOf(item: DocumentSnapshot): number {
  const value = item.get('orderedBuyerBaseMilli') as number;
  assertSafeQuantity(value, 'An ordered quantity');
  return value;
}

function receivedMilliOf(item: DocumentSnapshot): number {
  const value = (item.get('receivedBuyerBaseMilli') as number | undefined) ?? 0;
  assertSafeQuantity(value, 'A received quantity');
  return value;
}

function supplierOrderCount(supplier: DocumentSnapshot): number {
  const value: unknown = supplier.get('ordersPlacedCount');
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

/**
 * `…/purchaseOrders/{poId}/history/{historyId}` — immutable, one row per
 * transition. `operationId` is present only when the command that caused the
 * transition is idempotent; `po.cancel` is not, and a fabricated receipt id
 * would be worse than an absent one.
 */
function writeHistory(
  scope: TransactionScope,
  db: Firestore,
  actor: TrustedMembership,
  organizationName: string,
  purchaseOrderId: string,
  fromStatus: PoStatus | null,
  toStatus: PoStatus,
  operationId: string | undefined,
): void {
  const historyId = db
    .collection(`${paths.purchaseOrder(actor.orgId, purchaseOrderId)}/history`)
    .doc().id;
  scope.create(db.doc(paths.purchaseOrderHistory(actor.orgId, purchaseOrderId, historyId)), {
    historyId,
    fromStatus,
    toStatus,
    actorUid: actor.uid,
    actorName: actor.displayName,
    actorOrgId: actor.orgId,
    actorOrgName: organizationName,
    ...(operationId !== undefined ? { operationId } : {}),
    createdAt: serverTimestamp(),
  });
}

/**
 * C-15 `po.order` — `PO_WRITERS`, idempotent, transactional, audited.
 *
 * `DRAFT → ORDERED` for a private order: at least one line, an ACTIVE supplier,
 * every referenced product ACTIVE, an `orderNumber` allocated from
 * `counters/purchaseOrder` **inside** the transaction so order numbers stay
 * unique under concurrency (DB-06 §5), and every line snapshot frozen — after
 * this point a line renders from its snapshot and never by joining to the live
 * product, which is why renaming a product later leaves the order unchanged.
 *
 * **Ordering creates no stock.** No movement, no balance, no summary: goods
 * have been ordered, not received. `PURCHASE_RECEIPT` belongs to `C-17` alone.
 *
 * `privatePartners.ordersPlacedCount` is incremented here and decremented by
 * `po.cancel`, so it counts non-cancelled orders **placed** (DV-13).
 */
export const poOrder = defineCommand({
  id: 'C-15',
  authorization: { kind: 'MEMBER_ROLE', roles: PO_WRITERS },
  handler: async ({ db, scope, membership, orgId, payload, operationId }) => {
    const actor = requireMembership(membership);
    const opId = requireOperationId(operationId);
    const purchaseOrderId = payload.purchaseOrderId;

    const order = await readPrivatePurchaseOrder(scope, db, actor, purchaseOrderId);
    if (order.status !== 'DRAFT') {
      fail('INVALID_TRANSITION', `A ${order.status} order cannot be ordered.`);
    }
    if (order.privateSupplierId === undefined) {
      fail('INVALID_TRANSITION', 'A private order needs a supplier before it can be ordered.');
    }

    const supplier = await scope.get(db.doc(paths.privatePartner(orgId, order.privateSupplierId)));
    if (!supplier.exists) {
      fail('CROSS_TENANT_REFERENCE', 'The supplier does not belong to this organization.');
    }
    if (supplier.get('status') !== 'ACTIVE') {
      fail('INVALID_TRANSITION', 'The supplier is not active.');
    }

    const items = await readOrderItems(scope, db, orgId, purchaseOrderId);
    if (items.length === 0) {
      fail('INVALID_TRANSITION', 'An order needs at least one line.');
    }

    // Every referenced product must be ACTIVE at the moment of ordering; its
    // display fields are what the frozen line snapshots capture.
    const products = new Map<string, TrustedProduct>();
    for (const item of items) {
      if (orderedMilliOf(item) <= 0) {
        fail('INVALID_QUANTITY', 'Every order line must carry a positive quantity.');
      }
      const productId = item.get('buyerProductId') as string;
      if (!products.has(productId)) {
        products.set(productId, await readActiveProduct(scope, db, actor, productId));
      }
    }

    const counterRef = db.doc(paths.counter(orgId, 'purchaseOrder'));
    const counter = await scope.get(counterRef);
    const settings = await scope.get(db.doc(paths.settings(orgId)));
    const organizationName = await readOrganizationName(scope, db, orgId);

    const currentValue = counter.exists ? (counter.get('value') as number) : 0;
    const nextValue = currentValue + 1;
    const configuredPrefix: unknown = settings.get('purchaseOrderPrefix');
    const prefix =
      typeof configuredPrefix === 'string' && configuredPrefix.length > 0
        ? configuredPrefix
        : DEFAULT_PO_PREFIX;
    const year = serverNow().toDate().getUTCFullYear();
    const orderNumber = `${prefix}-${String(year)}-${String(nextValue).padStart(3, '0')}`;

    const now = serverTimestamp();
    let totalMinor = 0;
    for (const item of items) {
      const productId = item.get('buyerProductId') as string;
      const product = products.get(productId);
      if (!product) untypedFailure('internal', 'An order line lost its product.');
      // A client total is never trusted: every line is recomputed from its own
      // snapshot at the one frozen rounding point.
      const lineTotalMinor = deriveStockValueMinor(
        orderedMilliOf(item),
        item.get('unitPriceMinor') as number,
      );
      totalMinor += lineTotalMinor;
      scope.update(item.ref, {
        buyerProductNameSnapshot: product.name,
        buyerSkuSnapshot: product.internalSku,
        buyerBaseUnitSnapshot: product.baseUnit,
        receivedBuyerBaseMilli: receivedMilliOf(item),
        lineTotalMinor,
      });
    }

    scope.set(counterRef, { value: nextValue, updatedAt: now }, { merge: true });
    scope.update(order.snapshot.ref, {
      status: 'ORDERED',
      orderNumber,
      totalMinor,
      orderedAt: now,
      lastOperationId: opId,
    });
    scope.update(supplier.ref, { ordersPlacedCount: supplierOrderCount(supplier) + 1 });
    writeHistory(scope, db, actor, organizationName, purchaseOrderId, 'DRAFT', 'ORDERED', opId);

    writeAudit(scope, db, actor, {
      action: 'po.order',
      entityType: 'PURCHASE_ORDER',
      entityId: purchaseOrderId,
      operationId: opId,
      summary: `Placed order ${orderNumber} with ${supplier.get('name') as string}.`,
    });

    return { purchaseOrderId, orderNumber, status: 'ORDERED', totalMinor };
  },
});

/**
 * C-16 `po.cancel` — `PO_WRITERS`, **not** idempotent, transactional, audited.
 *
 * Legal from `DRAFT`, and from `ORDERED` **only while nothing has been
 * received** (DB-07 §8). Cancellation after any receipt is `INVALID_TRANSITION`
 * — the received stock is already in the ledger and no command in this
 * architecture un-receives it. `PARTIALLY_RECEIVED` and `RECEIVED` are
 * therefore refused outright, and the line quantities are re-checked as well,
 * so a status that somehow disagreed with its own lines still cannot slip a
 * receipt past the guard.
 *
 * No stock movement is written, in either direction.
 *
 * `ordersPlacedCount` is decremented **only when the order had actually been
 * placed** — `po.order` is what incremented it (DV-13). Cancelling a `DRAFT`
 * decrements nothing, which is what keeps the counter non-negative and equal to
 * "non-cancelled orders placed".
 */
export const poCancel = defineCommand({
  id: 'C-16',
  authorization: { kind: 'MEMBER_ROLE', roles: PO_WRITERS },
  handler: async ({ db, scope, membership, orgId, payload }) => {
    const actor = requireMembership(membership);
    const purchaseOrderId = payload.purchaseOrderId;

    const order = await readPrivatePurchaseOrder(scope, db, actor, purchaseOrderId);
    if (order.status !== 'DRAFT' && order.status !== 'ORDERED') {
      fail('INVALID_TRANSITION', `A ${order.status} order cannot be cancelled.`);
    }

    const items = await readOrderItems(scope, db, orgId, purchaseOrderId);
    const receivedTotal = items.reduce((sum, item) => sum + receivedMilliOf(item), 0);
    if (receivedTotal !== 0) {
      fail('INVALID_TRANSITION', 'An order that has received stock cannot be cancelled.');
    }

    const wasPlaced = order.status === 'ORDERED';
    const supplier =
      wasPlaced && order.privateSupplierId !== undefined
        ? await scope.get(db.doc(paths.privatePartner(orgId, order.privateSupplierId)))
        : undefined;
    const organizationName = await readOrganizationName(scope, db, orgId);

    const now = serverTimestamp();
    scope.update(order.snapshot.ref, { status: 'CANCELLED', cancelledAt: now });
    if (supplier?.exists) {
      scope.update(supplier.ref, {
        ordersPlacedCount: Math.max(0, supplierOrderCount(supplier) - 1),
      });
    }
    writeHistory(
      scope,
      db,
      actor,
      organizationName,
      purchaseOrderId,
      order.status,
      'CANCELLED',
      undefined,
    );

    writeAudit(scope, db, actor, {
      action: 'po.cancel',
      entityType: 'PURCHASE_ORDER',
      entityId: purchaseOrderId,
      summary: `Cancelled order ${order.orderNumber ?? purchaseOrderId}.`,
    });

    return { purchaseOrderId, status: 'CANCELLED' };
  },
});

interface ReceiptLine {
  readonly item: DocumentSnapshot;
  readonly productId: string;
  readonly quantityMilli: number;
}

interface ProductReceipt {
  readonly product: TrustedProduct;
  readonly balance: BalanceState;
  readonly summary: SummaryState;
}

/**
 * C-17 `po.receive` — `RECEIVERS`, idempotent, transactional, audited, and
 * notifying on a stock-status transition only. The highest-risk B3 command: it
 * is the one place where a purchase order and the stock ledger move together.
 *
 * Quantities are in the product's **base unit** — a private supplier is not a
 * Stockmok tenant, so there is no supplier order unit and no conversion
 * (DB-06 §3.3). Per line `0 < receiveMilli <= orderedMilli − receivedMilli`,
 * derived from the **persisted** received quantity and never from the payload,
 * so over-receipt is `OVER_RECEIPT` and impossible by construction — including
 * under concurrency, because two receipts of the same outstanding quantity
 * serialise on the same item document and the loser re-reads it (`T-CONC-04`).
 *
 * One `PURCHASE_RECEIPT` movement **per line per receipt event**, so two lines
 * of the same product produce two ledger rows carrying sequential
 * `balanceAfterMilli` values (`INV-24`) over a single balance write.
 *
 * The order becomes `RECEIVED` once every line is complete, otherwise
 * `PARTIALLY_RECEIVED`. `receivingWarehouseId` is recorded at the **first**
 * receipt and every later receipt must target that same store room: the field
 * is singular and `warehouse.archive`'s open-receipt guard reads it, so letting
 * later receipts wander would silently break that guard.
 */
export const poReceive = defineCommand({
  id: 'C-17',
  authorization: { kind: 'MEMBER_ROLE', roles: RECEIVERS },
  handler: async ({ db, scope, membership, orgId, payload, operationId }) => {
    const actor = requireMembership(membership);
    const opId = requireOperationId(operationId);
    const purchaseOrderId = payload.purchaseOrderId;

    const order = await readPrivatePurchaseOrder(scope, db, actor, purchaseOrderId);
    if (order.status !== 'ORDERED' && order.status !== 'PARTIALLY_RECEIVED') {
      fail('INVALID_TRANSITION', `A ${order.status} order cannot receive stock.`);
    }
    if (
      order.receivingWarehouseId !== undefined &&
      order.receivingWarehouseId !== payload.warehouseId
    ) {
      fail('INVALID_TRANSITION', 'This order is already being received into another store room.');
    }

    const warehouse = await readActiveWarehouse(scope, db, actor, payload.warehouseId);

    const seen = new Set<string>();
    for (const line of payload.lines) {
      if (seen.has(line.itemId)) {
        fail('SCHEMA_INVALID', 'Each order line may appear only once per receipt.', {
          path: 'lines',
        });
      }
      seen.add(line.itemId);
    }

    const items = await readOrderItems(scope, db, orgId, purchaseOrderId);
    const itemsById = new Map(items.map((item) => [item.id, item]));

    const receiptLines: ReceiptLine[] = [];
    for (const line of payload.lines) {
      const item = itemsById.get(line.itemId);
      if (!item) fail('RESOURCE_NOT_FOUND', 'An order line was not found on this order.');
      const quantityMilli = line.quantityMilli as number;
      assertSafeQuantity(quantityMilli, 'A received quantity');
      if (quantityMilli <= 0) {
        fail('INVALID_QUANTITY', 'A receipt line must carry a positive quantity.');
      }
      if (quantityMilli > orderedMilliOf(item) - receivedMilliOf(item)) {
        fail('OVER_RECEIPT', 'That is more than this line still has outstanding.');
      }
      receiptLines.push({ item, productId: item.get('buyerProductId') as string, quantityMilli });
    }

    // One product / balance / summary read per distinct product, whatever the
    // line count — all lines of one receipt land in the same store room.
    const receipts = new Map<string, ProductReceipt>();
    const totalsByProduct = new Map<string, number>();
    for (const line of receiptLines) {
      totalsByProduct.set(
        line.productId,
        (totalsByProduct.get(line.productId) ?? 0) + line.quantityMilli,
      );
      if (receipts.has(line.productId)) continue;
      const product = await readActiveProduct(scope, db, actor, line.productId);
      const balance = await readBalanceState(scope, db, actor, product, warehouse.warehouseId);
      const summary = await readSummaryState(scope, db, actor, product);
      receipts.set(line.productId, { product, balance, summary });
    }

    const transitions: { readonly product: TrustedProduct; readonly to: StockStatus }[] = [];
    for (const [productId, delta] of totalsByProduct) {
      const receipt = receipts.get(productId);
      if (!receipt) untypedFailure('internal', 'A receipt line lost its product.');
      const after = prospectiveSummaryStatus(receipt.summary, delta);
      if (isNotifiableTransition(receipt.summary.stockStatus, after)) {
        transitions.push({ product: receipt.product, to: after });
      }
    }
    const notification =
      transitions.length > 0
        ? await readStockNotificationContext(scope, db, actor, INVENTORY_WRITERS)
        : undefined;

    const organizationName = await readOrganizationName(scope, db, orgId);

    // ─── every read is done; the write phase begins here ────────────────────
    const now = serverTimestamp();

    // Each line's own balanceAfterMilli, in line order, so INV-24 holds even
    // when two lines of one receipt carry the same product.
    const balanceAfterByItemId = new Map<string, number>();
    const runningByProduct = new Map<string, number>();
    for (const line of receiptLines) {
      const receipt = receipts.get(line.productId);
      if (!receipt) untypedFailure('internal', 'A receipt line lost its product.');
      const running =
        (runningByProduct.get(line.productId) ?? receipt.balance.onHandMilli) + line.quantityMilli;
      runningByProduct.set(line.productId, running);
      balanceAfterByItemId.set(line.item.id, running);
    }

    for (const [productId, receipt] of receipts) {
      const afterMilli = runningByProduct.get(productId);
      if (afterMilli === undefined) untypedFailure('internal', 'A product received nothing.');
      const mutation = writeBalance(
        scope,
        receipt.product,
        warehouse.warehouseId,
        receipt.balance,
        afterMilli,
        now,
      );
      writeSummary(
        scope,
        receipt.product,
        receipt.summary,
        mutation.onHandDeltaMilli,
        mutation.valueDeltaMinor,
        now,
      );
    }

    let movementCount = 0;
    for (const line of receiptLines) {
      const receipt = receipts.get(line.productId);
      if (!receipt) untypedFailure('internal', 'A receipt line lost its product.');
      const balanceAfterMilli = balanceAfterByItemId.get(line.item.id);
      if (balanceAfterMilli === undefined) {
        untypedFailure('internal', 'A receipt line lost its balance.');
      }
      writeMovement(scope, db, actor, {
        product: receipt.product,
        warehouse,
        movementType: 'PURCHASE_RECEIPT',
        signedQuantityMilli: line.quantityMilli,
        balanceAfterMilli,
        sourceType: 'PRIVATE_PO',
        sourceId: purchaseOrderId,
        sourceReferenceSnapshot: order.orderNumber,
        operationId: opId,
        effectiveAt: now,
      });
      movementCount += 1;
      scope.update(line.item.ref, {
        receivedBuyerBaseMilli: receivedMilliOf(line.item) + line.quantityMilli,
      });
    }

    // Completeness is judged over EVERY line of the order, not only the lines
    // in this receipt, and includes the quantities just applied.
    const appliedByItemId = new Map(receiptLines.map((line) => [line.item.id, line.quantityMilli]));
    const complete = items.every(
      (item) => receivedMilliOf(item) + (appliedByItemId.get(item.id) ?? 0) >= orderedMilliOf(item),
    );
    const nextStatus: PoStatus = complete ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

    scope.update(order.snapshot.ref, {
      status: nextStatus,
      receivingWarehouseId: order.receivingWarehouseId ?? warehouse.warehouseId,
      lastOperationId: opId,
      ...(complete ? { receivedAt: now } : {}),
    });
    writeHistory(
      scope,
      db,
      actor,
      organizationName,
      purchaseOrderId,
      order.status,
      nextStatus,
      opId,
    );

    writeAudit(scope, db, actor, {
      action: 'po.receive',
      entityType: 'PURCHASE_ORDER',
      entityId: purchaseOrderId,
      operationId: opId,
      summary: `Received ${String(receiptLines.length)} line(s) into ${warehouse.name} against ${order.orderNumber ?? purchaseOrderId}.`,
    });

    if (notification) {
      for (const transition of transitions) {
        writeStockStatusNotification(
          scope,
          db,
          actor,
          notification,
          transition.product,
          transition.to,
        );
      }
    }

    return { purchaseOrderId, status: nextStatus, movementCount };
  },
});
