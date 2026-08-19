import {
  convertMilli,
  deriveStockValueMinor,
  paths,
  type PoStatus,
  type StockStatus,
  type Unit,
} from '@stockmok/shared';
import { serverPaths } from '@stockmok/shared/server/paths';
import { FieldValue, type DocumentSnapshot, type Firestore } from 'firebase-admin/firestore';
import {
  MAX_CPO_ITEMS,
  readCanonicalConnection,
  readCanonicalOrder,
  readCanonicalOrderItems,
  readOrganizationName,
  requireBuyerSide,
  requireConnectionActive,
  requireSupplierSide,
  resolveCounterpartyNotification,
  updateConnectedOrderEverywhere,
  writeConnectedHistory,
  writeCounterpartyNotification,
  type CanonicalOrderState,
} from './connected-lib.js';
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
import { writeAudit, writeAuditFor } from '../core/audit.js';
import { defineCommand } from '../core/define-command.js';
import { fail, untypedFailure } from '../core/errors.js';
import { serverNow, serverTimestamp } from '../core/time.js';
import type { TransactionScope } from '../core/transaction.js';
import { INVENTORY_WRITERS, PO_WRITERS, RECEIVERS } from '../guards/roles.js';

/**
 * `C-34`, `C-27` … `C-31` — the connected purchase-order lifecycle.
 *
 * ```text
 * DRAFT ──submit──▶ SUBMITTED ──accept──▶ ACCEPTED ──ship──▶ SHIPPED
 *   │                  │ └──reject──▶ REJECTED                  │
 *   └─cancel─▶ CANCELLED ◀──cancel──┘                           ▼
 *                                         PARTIALLY_RECEIVED ⇄ (more receipts)
 *                                                     └──▶ RECEIVED
 * ```
 *
 * This is **not** the private machine (DB-07 §8) and shares no code with it.
 * `ORDERED` never appears here; `SUBMITTED`, `ACCEPTED`, `SHIPPED` and
 * `REJECTED` never appear there.
 *
 * Four rules hold across every command in this file:
 *
 *  · **Side is derived, never claimed.** `buyerOrgId`/`supplierOrgId` come from
 *    the canonical record read inside the transaction, so a buyer cannot ship
 *    and a supplier cannot receive — and could not even if the same person held
 *    `PO_WRITERS` in both organizations (DB-05 §7.2).
 *  · **The connection is re-read inside the transaction**, so one disabled
 *    between page load and submit is refused (`ATTACK-09`).
 *  · **Canonical and both projections move together**, which is `INV-19` by
 *    construction rather than by reconciliation.
 *  · **Each side's ledger is its own.** Supplier ship changes supplier stock
 *    only (`INV-10`); buyer receive changes buyer stock only (`INV-11`). There
 *    is no code path in this file that writes stock into the counterparty.
 */

const CPO_ENTITY = 'PURCHASE_ORDER';

/**
 * `CPO-2026-003` in the canonical chain (DB-08 §6.5) against the private
 * `PO-2026-001`, from one shared `counters/purchaseOrder` in the **buyer's**
 * organization — the buyer is who places the order and whose sequence it is.
 * The configurable `settings.purchaseOrderPrefix` is honoured rather than
 * ignored: its frozen default `PO` yields exactly the canonical `CPO`.
 */
const CONNECTED_PREFIX = 'C';
const DEFAULT_PO_PREFIX = 'PO';

// ─── line reading ───────────────────────────────────────────────────────────

interface ConnectedLine {
  readonly snapshot: DocumentSnapshot;
  readonly itemId: string;
  readonly buyerProductId: string;
  readonly mappingId: string;
  readonly supplierCatalogItemId: string;
  readonly orderedSupplierMilli: number;
  readonly receivedSupplierMilli: number;
  readonly orderedBuyerBaseMilli: number;
  readonly receivedBuyerBaseMilli: number;
  readonly unitPriceMinor: number;
  readonly factorMilli: number;
}

function readLine(snapshot: DocumentSnapshot): ConnectedLine {
  const mappingId: unknown = snapshot.get('mappingId');
  const supplierCatalogItemId: unknown = snapshot.get('supplierCatalogItemId');
  if (typeof mappingId !== 'string' || typeof supplierCatalogItemId !== 'string') {
    fail('INVALID_TRANSITION', 'A connected order line must carry a mapping and a catalog item.');
  }
  const orderedSupplierMilli = (snapshot.get('orderedSupplierMilli') as number | undefined) ?? 0;
  const receivedSupplierMilli = (snapshot.get('receivedSupplierMilli') as number | undefined) ?? 0;
  const orderedBuyerBaseMilli = (snapshot.get('orderedBuyerBaseMilli') as number | undefined) ?? 0;
  const receivedBuyerBaseMilli =
    (snapshot.get('receivedBuyerBaseMilli') as number | undefined) ?? 0;
  const factorMilli =
    (snapshot.get('supplierToBuyerBaseFactorMilliSnapshot') as number | undefined) ?? 0;
  assertSafeQuantity(orderedSupplierMilli, 'An ordered supplier quantity');
  assertSafeQuantity(receivedSupplierMilli, 'A received supplier quantity');
  assertSafeQuantity(orderedBuyerBaseMilli, 'An ordered quantity');
  assertSafeQuantity(receivedBuyerBaseMilli, 'A received quantity');
  return {
    snapshot,
    itemId: snapshot.id,
    buyerProductId: snapshot.get('buyerProductId') as string,
    mappingId,
    supplierCatalogItemId,
    orderedSupplierMilli,
    receivedSupplierMilli,
    orderedBuyerBaseMilli,
    receivedBuyerBaseMilli,
    unitPriceMinor: (snapshot.get('unitPriceMinor') as number | undefined) ?? 0,
    factorMilli,
  };
}

async function readBuyerDraftItems(
  scope: TransactionScope,
  db: Firestore,
  buyerOrgId: string,
  purchaseOrderId: string,
): Promise<readonly DocumentSnapshot[]> {
  const snapshot = await scope.query(
    db.collection(`${paths.purchaseOrder(buyerOrgId, purchaseOrderId)}/items`),
    MAX_CPO_ITEMS,
  );
  return snapshot.docs;
}

// ─── C-34 cpo.draftSave ─────────────────────────────────────────────────────

/**
 * C-34 `cpo.draftSave` — buyer `PO_WRITERS`, **not** idempotent, transactional,
 * **no audit and no receipt**.
 *
 * DB-06 §0 explains the missing receipt at length and it is not an oversight: a
 * draft save is an upsert with last-write-wins semantics and no side effect, so
 * it is idempotent *by nature*. Giving it an `operationId` would create one
 * permanent `commandReceipt` per keystroke-batch — receipts are never deleted in
 * A/B — turning ordinary editing into unbounded storage growth. It takes a
 * transaction only because it must re-validate the connection, the mappings and
 * the products server-side before persisting (DB-CR-010 / DB-CR-014).
 *
 * A connected draft is `COMMAND_ONLY` (DB-05 §4.1): `isEditableDraft()` pins
 * `supplierKind == 'PRIVATE'` on both `resource` and `request.resource`, so a
 * client can neither create a connected draft nor flip a private one into it.
 * This command is the only writer, and it refuses a document whose
 * `supplierKind` is anything but `CONNECTED`, because that field is immutable
 * after create (DB-02 §5.2).
 *
 * **It mutates no stock**, writes nothing outside the buyer's own tenant, and
 * touches no canonical document — a draft exists only in the buyer's tenant
 * until submission (DB-05 §8).
 */
export const cpoDraftSave = defineCommand({
  id: 'C-34',
  authorization: { kind: 'MEMBER_ROLE', roles: PO_WRITERS },
  handler: async ({ db, scope, membership, orgId, payload }) => {
    const actor = requireMembership(membership);
    const purchaseOrderId = payload.purchaseOrderId;

    const connection = await readCanonicalConnection(scope, db, payload.connectionId);
    requireBuyerSide(actor, connection);
    requireConnectionActive(connection);

    const orderRef = db.doc(paths.purchaseOrder(orgId, purchaseOrderId));
    const existing = await scope.get(orderRef);
    if (existing.exists) {
      if (existing.get('supplierKind') !== 'CONNECTED') {
        fail('INVALID_TRANSITION', 'That purchase order is not a connected order.');
      }
      if (existing.get('status') !== 'DRAFT') {
        fail('INVALID_TRANSITION', 'Only a draft connected order can be edited.');
      }
      if (existing.get('connectionId') !== connection.connectionId) {
        fail('INVALID_TRANSITION', 'That draft belongs to a different connection.');
      }
    }

    const items = await readBuyerDraftItems(scope, db, orgId, purchaseOrderId);
    const settings = await scope.get(db.doc(paths.settings(orgId)));

    // Every line is re-validated against live state: a VERIFIED mapping on this
    // connection, and an ACTIVE buyer product. A mapping disabled since the line
    // was added stops the draft saving rather than surviving to submission.
    const revalidated: {
      readonly line: ConnectedLine;
      readonly product: TrustedProduct;
      readonly mapping: DocumentSnapshot;
    }[] = [];
    const products = new Map<string, TrustedProduct>();
    for (const snapshot of items) {
      const line = readLine(snapshot);
      if (line.orderedSupplierMilli <= 0) {
        fail('INVALID_QUANTITY', 'Every connected order line must carry a positive quantity.');
      }
      const mapping = await scope.get(db.doc(paths.productMapping(orgId, line.mappingId)));
      if (!mapping.exists) {
        fail('RESOURCE_NOT_FOUND', 'An order line references a mapping that no longer exists.');
      }
      if (mapping.get('status') !== 'VERIFIED') {
        fail('INVALID_TRANSITION', 'An order line uses a mapping that is no longer verified.');
      }
      if (mapping.get('connectionId') !== connection.connectionId) {
        fail('CROSS_TENANT_REFERENCE', 'An order line uses a mapping from another connection.');
      }
      if (mapping.get('supplierCatalogItemId') !== line.supplierCatalogItemId) {
        fail(
          'INVALID_TRANSITION',
          'An order line disagrees with its mapping about the supplier item.',
        );
      }
      let product = products.get(line.buyerProductId);
      if (!product) {
        product = await readActiveProduct(scope, db, actor, line.buyerProductId);
        products.set(line.buyerProductId, product);
      }
      revalidated.push({ line, product, mapping });
    }

    // ─── every read is done; the write phase begins here ────────────────────
    const now = serverTimestamp();
    const currency: unknown = settings.get('currency');
    let totalMinor = 0;

    for (const { line, product, mapping } of revalidated) {
      const factorMilli = mapping.get('supplierToBuyerBaseFactorMilli') as number;
      // Both derived quantities are recomputed server-side from the live
      // mapping; a client value for either is discarded.
      const orderedBuyerBaseMilli = convertMilli(line.orderedSupplierMilli, factorMilli);
      const lineTotalMinor = deriveStockValueMinor(line.orderedSupplierMilli, line.unitPriceMinor);
      totalMinor += lineTotalMinor;
      scope.update(line.snapshot.ref, {
        buyerProductNameSnapshot: product.name,
        buyerSkuSnapshot: product.internalSku,
        buyerBaseUnitSnapshot: product.baseUnit,
        supplierProductNameSnapshot: mapping.get('supplierDisplayNameSnapshot') as string,
        supplierSkuSnapshot: mapping.get('supplierPartnerSkuSnapshot') as string,
        supplierOrderUnitSnapshot: mapping.get('supplierOrderUnit') as Unit,
        supplierToBuyerBaseFactorMilliSnapshot: factorMilli,
        orderedBuyerBaseMilli,
        receivedBuyerBaseMilli: line.receivedBuyerBaseMilli,
        receivedSupplierMilli: line.receivedSupplierMilli,
        lineTotalMinor,
      });
    }

    const header = {
      purchaseOrderId,
      viewRole: 'BUYER',
      supplierKind: 'CONNECTED',
      counterpartyName: connection.supplierName,
      counterpartyOrgId: connection.supplierOrgId,
      counterpartyHandle: connection.supplierHandle,
      connectionId: connection.connectionId,
      status: 'DRAFT',
      currency: typeof currency === 'string' ? currency : 'LKR',
      totalMinor,
      // A draft is not yet a projection of anything — there is no canonical
      // record until `cpo.submit` creates one (DB-02 §5.2).
      isProjection: false,
      updatedAt: now,
    };
    if (existing.exists) {
      scope.set(orderRef, header, { merge: true });
    } else {
      scope.create(orderRef, { ...header, createdBy: actor.uid, createdAt: now });
    }

    return { purchaseOrderId, status: 'DRAFT', lineCount: items.length, totalMinor };
  },
});

// ─── C-27 cpo.submit ────────────────────────────────────────────────────────

/**
 * The projection field set for one side. The two projections are **not** copies
 * of each other: each names the *other* organization as its counterparty and
 * carries its own `viewRole`, which is what lets one list, one KPI and one
 * report serve both sides (DB-02 §5.2). Everything the invariant cares about —
 * status, quantities, totals — is written identically to all three documents.
 */
function projectionHeader(
  side: 'BUYER' | 'SUPPLIER',
  base: Record<string, unknown>,
  connection: {
    readonly connectionId: string;
    readonly buyerOrgId: string;
    readonly supplierOrgId: string;
    readonly buyerName: string;
    readonly buyerHandle: string;
    readonly supplierName: string;
    readonly supplierHandle: string;
  },
): Record<string, unknown> {
  const buyerSide = side === 'BUYER';
  return {
    ...base,
    viewRole: side,
    counterpartyName: buyerSide ? connection.supplierName : connection.buyerName,
    counterpartyOrgId: buyerSide ? connection.supplierOrgId : connection.buyerOrgId,
    counterpartyHandle: buyerSide ? connection.supplierHandle : connection.buyerHandle,
    isProjection: true,
  };
}

/**
 * C-27 `cpo.submit` — buyer `PO_WRITERS`, idempotent, transactional, audited in
 * both organizations, notifies the supplier.
 *
 * `DRAFT → SUBMITTED`, and the moment the shared record comes into existence.
 * The canonical document and **both** projections, with their items and one
 * history row each, are created in a single transaction — `INV-19` and `INV-08`
 * hold because there is no window in which one exists without the others.
 *
 * **Snapshots are frozen here** (`INV-09`). After this point a line renders from
 * its own snapshot and never by joining to the live product, mapping or catalog
 * item, which is why renaming any of them later leaves the order unchanged. The
 * supplier catalog item is re-read and re-checked as published in the same
 * transaction, so an item unpublished between drafting and submitting is
 * refused rather than frozen into a shared record.
 *
 * **No stock moves.** Goods have been asked for, not shipped.
 */
export const cpoSubmit = defineCommand({
  id: 'C-27',
  authorization: { kind: 'MEMBER_ROLE', roles: PO_WRITERS },
  handler: async ({ db, scope, membership, orgId, payload, operationId }) => {
    const actor = requireMembership(membership);
    const opId = requireOperationId(operationId);
    const purchaseOrderId = payload.purchaseOrderId;

    const draftRef = db.doc(paths.purchaseOrder(orgId, purchaseOrderId));
    const draft = await scope.get(draftRef);
    if (!draft.exists) {
      fail('CROSS_TENANT_REFERENCE', 'The purchase order does not belong to this organization.');
    }
    if (draft.get('supplierKind') !== 'CONNECTED') {
      fail('INVALID_TRANSITION', 'That purchase order is not a connected order.');
    }
    if (draft.get('status') !== 'DRAFT') {
      fail('INVALID_TRANSITION', `A ${draft.get('status') as string} order cannot be submitted.`);
    }
    const connectionId: unknown = draft.get('connectionId');
    if (typeof connectionId !== 'string') {
      fail('INVALID_TRANSITION', 'That draft is not bound to a connection.');
    }

    const connection = await readCanonicalConnection(scope, db, connectionId);
    requireBuyerSide(actor, connection);
    requireConnectionActive(connection);

    const items = await readBuyerDraftItems(scope, db, orgId, purchaseOrderId);
    if (items.length === 0) {
      fail('INVALID_TRANSITION', 'A connected order needs at least one line.');
    }

    // Re-validate every mapping and every supplier catalog item, then freeze.
    const frozen: {
      readonly line: ConnectedLine;
      readonly product: TrustedProduct;
      readonly mapping: DocumentSnapshot;
      readonly catalogItem: DocumentSnapshot;
    }[] = [];
    const products = new Map<string, TrustedProduct>();
    for (const snapshot of items) {
      const line = readLine(snapshot);
      if (line.orderedSupplierMilli <= 0) {
        fail('INVALID_QUANTITY', 'Every connected order line must carry a positive quantity.');
      }
      const mapping = await scope.get(db.doc(paths.productMapping(orgId, line.mappingId)));
      if (!mapping.exists || mapping.get('status') !== 'VERIFIED') {
        fail('INVALID_TRANSITION', 'An order line uses a mapping that is no longer verified.');
      }
      if (mapping.get('connectionId') !== connection.connectionId) {
        fail('CROSS_TENANT_REFERENCE', 'An order line uses a mapping from another connection.');
      }
      if (mapping.get('supplierCatalogItemId') !== line.supplierCatalogItemId) {
        fail(
          'INVALID_TRANSITION',
          'An order line disagrees with its mapping about the supplier item.',
        );
      }
      const catalogItem = await scope.get(
        db.doc(paths.partnerCatalogItem(connection.supplierOrgId, line.supplierCatalogItemId)),
      );
      if (!catalogItem.exists) {
        fail('RESOURCE_NOT_FOUND', 'A supplier catalog item on this order no longer exists.');
      }
      if (catalogItem.get('published') !== true) {
        fail(
          'CATALOG_ITEM_NOT_PUBLISHED',
          'A supplier catalog item on this order is not published.',
        );
      }
      let product = products.get(line.buyerProductId);
      if (!product) {
        product = await readActiveProduct(scope, db, actor, line.buyerProductId);
        products.set(line.buyerProductId, product);
      }
      frozen.push({ line, product, mapping, catalogItem });
    }

    const counterRef = db.doc(paths.counter(orgId, 'purchaseOrder'));
    const counter = await scope.get(counterRef);
    const settings = await scope.get(db.doc(paths.settings(orgId)));
    const buyerOrgName = await readOrganizationName(scope, db, orgId);
    const supplierNotify = await resolveCounterpartyNotification(
      scope,
      db,
      connection.supplierOrgId,
      PO_WRITERS,
    );

    // ─── every read is done; the write phase begins here ────────────────────
    const now = serverTimestamp();
    const nextValue = (counter.exists ? (counter.get('value') as number) : 0) + 1;
    const configuredPrefix: unknown = settings.get('purchaseOrderPrefix');
    const prefix =
      typeof configuredPrefix === 'string' && configuredPrefix.length > 0
        ? configuredPrefix
        : DEFAULT_PO_PREFIX;
    const year = serverNow().toDate().getUTCFullYear();
    const orderNumber = `${CONNECTED_PREFIX}${prefix}-${String(year)}-${String(nextValue).padStart(3, '0')}`;

    const expectedDate: unknown = draft.get('expectedDate');
    const createdAt: unknown = draft.get('createdAt');
    const currency = draft.get('currency') as string;
    let totalMinor = 0;

    const canonicalRef = db.doc(serverPaths.connectedPurchaseOrder(purchaseOrderId));

    for (const { line, product, mapping, catalogItem } of frozen) {
      const factorMilli = mapping.get('supplierToBuyerBaseFactorMilli') as number;
      const orderedBuyerBaseMilli = convertMilli(line.orderedSupplierMilli, factorMilli);
      const lineTotalMinor = deriveStockValueMinor(line.orderedSupplierMilli, line.unitPriceMinor);
      totalMinor += lineTotalMinor;

      const frozenLine = {
        itemId: line.itemId,
        buyerProductId: line.buyerProductId,
        buyerProductNameSnapshot: product.name,
        buyerSkuSnapshot: product.internalSku,
        buyerBaseUnitSnapshot: product.baseUnit,
        orderedBuyerBaseMilli,
        receivedBuyerBaseMilli: 0,
        unitPriceMinor: line.unitPriceMinor,
        lineTotalMinor,
        currency,
        mappingId: line.mappingId,
        supplierCatalogItemId: line.supplierCatalogItemId,
        supplierProductNameSnapshot: catalogItem.get('displayName') as string,
        supplierSkuSnapshot: catalogItem.get('partnerSku') as string,
        supplierOrderUnitSnapshot: catalogItem.get('orderUnit') as Unit,
        orderedSupplierMilli: line.orderedSupplierMilli,
        receivedSupplierMilli: 0,
        supplierToBuyerBaseFactorMilliSnapshot: factorMilli,
      };
      scope.create(
        db.doc(serverPaths.connectedPurchaseOrderItem(purchaseOrderId, line.itemId)),
        frozenLine,
      );
      scope.set(line.snapshot.ref, frozenLine);
      scope.create(
        db.doc(paths.purchaseOrderItem(connection.supplierOrgId, purchaseOrderId, line.itemId)),
        frozenLine,
      );
    }

    const sharedHeader = {
      purchaseOrderId,
      orderNumber,
      supplierKind: 'CONNECTED',
      connectionId: connection.connectionId,
      status: 'SUBMITTED',
      currency,
      totalMinor,
      ...(expectedDate !== undefined && expectedDate !== null ? { expectedDate } : {}),
      lastOperationId: opId,
      createdBy: draft.get('createdBy') as string,
      createdAt,
      submittedAt: now,
    };

    scope.create(canonicalRef, {
      ...sharedHeader,
      // The canonical record carries only what BOTH parties are entitled to see
      // (DB-02 §7.3). It names both organizations rather than a "counterparty",
      // and holds no buyer-private context.
      viewRole: 'BUYER',
      buyerOrgId: connection.buyerOrgId,
      supplierOrgId: connection.supplierOrgId,
      counterpartyName: connection.supplierName,
      counterpartyOrgId: connection.supplierOrgId,
      counterpartyHandle: connection.supplierHandle,
      isProjection: false,
    });
    scope.set(draftRef, projectionHeader('BUYER', sharedHeader, connection), { merge: true });
    scope.create(
      db.doc(paths.purchaseOrder(connection.supplierOrgId, purchaseOrderId)),
      projectionHeader('SUPPLIER', sharedHeader, connection),
    );

    writeConnectedHistory(
      scope,
      db,
      actor,
      buyerOrgName,
      {
        purchaseOrderId,
        buyerOrgId: connection.buyerOrgId,
        supplierOrgId: connection.supplierOrgId,
      },
      'DRAFT',
      'SUBMITTED',
      opId,
    );

    // DV-12 — the connection projection's order count, incremented in the very
    // transaction that already writes both projections (`INV-19`).
    for (const side of [connection.buyerOrgId, connection.supplierOrgId]) {
      scope.set(
        db.doc(paths.connectionProjection(side, connection.connectionId)),
        { ordersPlacedCount: FieldValue.increment(1), updatedAt: now },
        { merge: true },
      );
    }

    writeAudit(scope, db, actor, {
      action: 'cpo.submit',
      entityType: CPO_ENTITY,
      entityId: purchaseOrderId,
      operationId: opId,
      summary: `Submitted ${orderNumber} to ${connection.supplierName}.`,
    });
    writeAuditFor(scope, db, actor, connection.supplierOrgId, {
      action: 'cpo.submit',
      entityType: CPO_ENTITY,
      entityId: purchaseOrderId,
      operationId: opId,
      summary: `${connection.buyerName} submitted order ${orderNumber}.`,
    });

    writeCounterpartyNotification(scope, db, supplierNotify, {
      type: 'CPO_SUBMITTED',
      title: 'New connected order',
      message: `${connection.buyerName} submitted order ${orderNumber}.`,
      referenceType: 'PURCHASE_ORDER',
      referenceId: purchaseOrderId,
    });

    scope.set(counterRef, { value: nextValue, updatedAt: now }, { merge: true });

    return { purchaseOrderId, orderNumber, status: 'SUBMITTED', totalMinor };
  },
});

// ─── C-28 cpo.respond ───────────────────────────────────────────────────────

/**
 * C-28 `cpo.respond` — **supplier** `PO_WRITERS`, idempotent, transactional,
 * audited in both organizations, notifies the buyer.
 *
 * `SUBMITTED → ACCEPTED` or `SUBMITTED → REJECTED` (DB-07 §9). **No stock
 * moves**: accepting is a promise, and the promise is kept by `cpo.ship`.
 *
 * A buyer calling this on its own order is refused by side, not by role.
 */
export const cpoRespond = defineCommand({
  id: 'C-28',
  authorization: { kind: 'MEMBER_ROLE', roles: PO_WRITERS },
  handler: async ({ db, scope, membership, payload, operationId }) => {
    const actor = requireMembership(membership);
    const opId = requireOperationId(operationId);

    const order = await readCanonicalOrder(scope, db, payload.purchaseOrderId);
    const connection = await readCanonicalConnection(scope, db, order.connectionId);
    requireSupplierSide(actor, connection);
    if (order.supplierOrgId !== actor.orgId) {
      fail('CROSS_TENANT_REFERENCE', 'Only the supplying organization can answer this order.');
    }
    requireConnectionActive(connection);
    if (order.status !== 'SUBMITTED') {
      fail('INVALID_TRANSITION', `A ${order.status} order cannot be answered.`);
    }

    const accepted = payload.response === 'ACCEPT';
    const nextStatus: PoStatus = accepted ? 'ACCEPTED' : 'REJECTED';
    const supplierOrgName = await readOrganizationName(scope, db, actor.orgId);
    const buyerNotify = await resolveCounterpartyNotification(
      scope,
      db,
      order.buyerOrgId,
      PO_WRITERS,
    );

    // ─── every read is done; the write phase begins here ────────────────────
    const now = serverTimestamp();
    updateConnectedOrderEverywhere(scope, db, order, {
      status: nextStatus,
      lastOperationId: opId,
      ...(accepted ? { acceptedAt: now } : {}),
    });
    writeConnectedHistory(scope, db, actor, supplierOrgName, order, order.status, nextStatus, opId);

    const reference = order.orderNumber ?? order.purchaseOrderId;
    writeAudit(scope, db, actor, {
      action: 'cpo.respond',
      entityType: CPO_ENTITY,
      entityId: order.purchaseOrderId,
      operationId: opId,
      summary: accepted ? `Accepted order ${reference}.` : `Rejected order ${reference}.`,
    });
    writeAuditFor(scope, db, actor, order.buyerOrgId, {
      action: 'cpo.respond',
      entityType: CPO_ENTITY,
      entityId: order.purchaseOrderId,
      operationId: opId,
      summary: accepted
        ? `${connection.supplierName} accepted order ${reference}.`
        : `${connection.supplierName} rejected order ${reference}.`,
    });

    writeCounterpartyNotification(scope, db, buyerNotify, {
      type: 'CPO_RESPONDED',
      title: accepted ? 'Order accepted' : 'Order rejected',
      message: accepted
        ? `${connection.supplierName} accepted order ${reference}.`
        : `${connection.supplierName} rejected order ${reference}.`,
      referenceType: 'PURCHASE_ORDER',
      referenceId: order.purchaseOrderId,
    });

    return { purchaseOrderId: order.purchaseOrderId, status: nextStatus };
  },
});

// ─── C-31 cpo.cancel ────────────────────────────────────────────────────────

/**
 * C-31 `cpo.cancel` — **buyer** `PO_WRITERS`, **not** idempotent,
 * transactional, audited in both organizations.
 *
 * `DRAFT → CANCELLED` and `SUBMITTED → CANCELLED` only. **Cancellation after
 * `ACCEPTED` is forbidden** (`FR-CPO-004`): once the supplier has committed,
 * withdrawing is a conversation, not a state transition — and after `SHIPPED`
 * the supplier's stock has already moved and no command in this architecture
 * un-ships it.
 *
 * Because the command is non-idempotent it has **no `operationId`**, so its
 * history row carries none. That is why `ConnectedHistorySchema.operationId` is
 * optional: the alternative is a fabricated receipt id that resolves to
 * nothing, and DB-02 §5.4 requires the canonical row and both projection rows
 * to be identical, so the lie would have to be told three times.
 *
 * A `DRAFT` cancellation touches only the buyer's tenant, because no canonical
 * record exists yet.
 */
export const cpoCancel = defineCommand({
  id: 'C-31',
  authorization: { kind: 'MEMBER_ROLE', roles: PO_WRITERS },
  handler: async ({ db, scope, membership, orgId, payload }) => {
    const actor = requireMembership(membership);
    const purchaseOrderId = payload.purchaseOrderId;

    const localRef = db.doc(paths.purchaseOrder(orgId, purchaseOrderId));
    const local = await scope.get(localRef);
    if (!local.exists) {
      fail('CROSS_TENANT_REFERENCE', 'The purchase order does not belong to this organization.');
    }
    if (local.get('supplierKind') !== 'CONNECTED') {
      fail('INVALID_TRANSITION', 'That purchase order is not a connected order.');
    }
    const status = local.get('status') as PoStatus;
    if (status !== 'DRAFT' && status !== 'SUBMITTED') {
      fail('INVALID_TRANSITION', `A ${status} order cannot be cancelled.`);
    }
    if (local.get('viewRole') !== 'BUYER') {
      fail('CROSS_TENANT_REFERENCE', 'Only the buying organization can cancel this order.');
    }

    const orgName = await readOrganizationName(scope, db, orgId);
    const now = serverTimestamp();

    // A DRAFT has no canonical record; a SUBMITTED order has one, and the
    // cancellation must reach all three documents plus the supplier's audit.
    if (status === 'DRAFT') {
      scope.update(localRef, { status: 'CANCELLED', cancelledAt: now });
      writeAudit(scope, db, actor, {
        action: 'cpo.cancel',
        entityType: CPO_ENTITY,
        entityId: purchaseOrderId,
        summary: `Cancelled draft order ${(local.get('orderNumber') as string | undefined) ?? purchaseOrderId}.`,
      });
      return { purchaseOrderId, status: 'CANCELLED' };
    }

    const order = await readCanonicalOrder(scope, db, purchaseOrderId);
    const connection = await readCanonicalConnection(scope, db, order.connectionId);
    requireBuyerSide(actor, connection);
    if (order.buyerOrgId !== actor.orgId) {
      fail('CROSS_TENANT_REFERENCE', 'Only the buying organization can cancel this order.');
    }
    if (order.status !== 'SUBMITTED') {
      fail('INVALID_TRANSITION', `A ${order.status} order cannot be cancelled.`);
    }

    updateConnectedOrderEverywhere(scope, db, order, { status: 'CANCELLED', cancelledAt: now });
    writeConnectedHistory(scope, db, actor, orgName, order, order.status, 'CANCELLED', undefined);

    const reference = order.orderNumber ?? purchaseOrderId;
    writeAudit(scope, db, actor, {
      action: 'cpo.cancel',
      entityType: CPO_ENTITY,
      entityId: purchaseOrderId,
      summary: `Cancelled order ${reference}.`,
    });
    writeAuditFor(scope, db, actor, order.supplierOrgId, {
      action: 'cpo.cancel',
      entityType: CPO_ENTITY,
      entityId: purchaseOrderId,
      summary: `${connection.buyerName} cancelled order ${reference}.`,
    });

    return { purchaseOrderId, status: 'CANCELLED' };
  },
});

// ─── C-29 cpo.ship ──────────────────────────────────────────────────────────

interface SupplierDispatch {
  readonly line: ConnectedLine;
  readonly product: TrustedProduct;
  readonly balance: BalanceState;
  readonly summary: SummaryState;
}

/**
 * C-29 `cpo.ship` — **supplier** `PO_WRITERS`, idempotent, transactional,
 * audited in both organizations, notifies the buyer. The first of the two
 * commands that move stock across the connected workflow.
 *
 * `ACCEPTED → SHIPPED`, **once, in full**. There is no `PARTIALLY_SHIPPED`
 * (`BR-020`), no per-line shipment state and no second shipment: the state
 * machine offers exactly one edge out of `ACCEPTED`, and a repeat attempt lands
 * on `SHIPPED` and is `INVALID_TRANSITION`.
 *
 * **`INV-10` — supplier ship changes supplier inventory only.** Every write in
 * the stock half of this command targets `organizations/{supplierOrgId}/…`, and
 * the buyer's stock is untouched at `SHIPPED` (`FR-CPO-009`). The buyer learns
 * goods are coming; the buyer's ledger learns nothing until `cpo.receive`.
 *
 * **`INV-17` is what makes the arithmetic exist.** A catalog item's `orderUnit`
 * equals its source product's `baseUnit`, so `orderedSupplierMilli` is already
 * in the supplier product's own base unit and needs no second conversion factor.
 * The buyer's factor is not consulted here and would be meaningless if it were.
 *
 * The dispatching store room is the supplier's **default warehouse**
 * (`settings.defaultWarehouseId`, DB-02 §3.3) — the payload carries no store
 * room, and a store room the caller could name would be a store room the caller
 * could get wrong.
 */
export const cpoShip = defineCommand({
  id: 'C-29',
  authorization: { kind: 'MEMBER_ROLE', roles: PO_WRITERS },
  handler: async ({ db, scope, membership, orgId, payload, operationId }) => {
    const actor = requireMembership(membership);
    const opId = requireOperationId(operationId);

    const order = await readCanonicalOrder(scope, db, payload.purchaseOrderId);
    const connection = await readCanonicalConnection(scope, db, order.connectionId);
    requireSupplierSide(actor, connection);
    if (order.supplierOrgId !== orgId) {
      fail('CROSS_TENANT_REFERENCE', 'Only the supplying organization can ship this order.');
    }
    requireConnectionActive(connection);
    if (order.status !== 'ACCEPTED') {
      fail('INVALID_TRANSITION', `A ${order.status} order cannot be shipped.`);
    }

    const settings = await scope.get(db.doc(paths.settings(orgId)));
    const defaultWarehouseId: unknown = settings.get('defaultWarehouseId');
    if (typeof defaultWarehouseId !== 'string') {
      fail('WAREHOUSE_NOT_ACTIVE', 'Your organization has no default store room to ship from.');
    }
    const warehouse = await readActiveWarehouse(scope, db, actor, defaultWarehouseId);

    const items = await readCanonicalOrderItems(scope, db, order.purchaseOrderId);
    if (items.length === 0) {
      fail('INVALID_TRANSITION', 'This order has no lines to ship.');
    }

    // Each line's supplier product is reached through the supplier's OWN
    // catalog item — the buyer's `buyerProductId` names a product in the
    // buyer's tenant and is never resolved here.
    const dispatches: SupplierDispatch[] = [];
    const byProduct = new Map<string, SupplierDispatch>();
    const totalsByProduct = new Map<string, number>();
    for (const snapshot of items) {
      const line = readLine(snapshot);
      if (line.orderedSupplierMilli <= 0) {
        fail('INVALID_QUANTITY', 'Every shipped line must carry a positive quantity.');
      }
      const catalogItem = await scope.get(
        db.doc(paths.partnerCatalogItem(orgId, line.supplierCatalogItemId)),
      );
      if (!catalogItem.exists) {
        fail('RESOURCE_NOT_FOUND', 'A catalog item on this order no longer exists.');
      }
      const sourceProductId = catalogItem.get('sourceProductId') as string;
      let dispatch = byProduct.get(sourceProductId);
      if (!dispatch) {
        const product = await readActiveProduct(scope, db, actor, sourceProductId);
        const balance = await readBalanceState(scope, db, actor, product, warehouse.warehouseId);
        const summary = await readSummaryState(scope, db, actor, product);
        dispatch = { line, product, balance, summary };
        byProduct.set(sourceProductId, dispatch);
      }
      totalsByProduct.set(
        sourceProductId,
        (totalsByProduct.get(sourceProductId) ?? 0) + line.orderedSupplierMilli,
      );
      dispatches.push({ ...dispatch, line });
    }

    // A shortage on ONE line refuses the whole shipment: the frozen model is
    // all-or-nothing, so a partially-satisfiable order does not ship what it can.
    for (const [productId, total] of totalsByProduct) {
      const dispatch = byProduct.get(productId);
      if (!dispatch) untypedFailure('internal', 'A shipped line lost its product.');
      if (dispatch.balance.onHandMilli - total < 0) {
        fail(
          'INSUFFICIENT_STOCK',
          'This store room does not hold enough stock to ship this order.',
        );
      }
    }

    const transitions: { readonly product: TrustedProduct; readonly to: StockStatus }[] = [];
    for (const [productId, total] of totalsByProduct) {
      const dispatch = byProduct.get(productId);
      if (!dispatch) untypedFailure('internal', 'A shipped line lost its product.');
      const after = prospectiveSummaryStatus(dispatch.summary, -total);
      if (isNotifiableTransition(dispatch.summary.stockStatus, after)) {
        transitions.push({ product: dispatch.product, to: after });
      }
    }
    const stockNotification =
      transitions.length > 0
        ? await readStockNotificationContext(scope, db, actor, INVENTORY_WRITERS)
        : undefined;

    const supplierOrgName = await readOrganizationName(scope, db, orgId);
    const buyerNotify = await resolveCounterpartyNotification(
      scope,
      db,
      order.buyerOrgId,
      RECEIVERS,
    );

    // ─── every read is done; the write phase begins here ────────────────────
    const now = serverTimestamp();

    // Per-line `balanceAfterMilli`, in line order, so `INV-24` holds even when
    // two lines of one order carry the same supplier product.
    const balanceAfterByItemId = new Map<string, number>();
    const runningByProduct = new Map<string, number>();
    for (const dispatch of dispatches) {
      const productId = dispatch.product.productId;
      const running =
        (runningByProduct.get(productId) ?? dispatch.balance.onHandMilli) -
        dispatch.line.orderedSupplierMilli;
      runningByProduct.set(productId, running);
      balanceAfterByItemId.set(dispatch.line.itemId, running);
    }

    for (const [productId, dispatch] of byProduct) {
      const afterMilli = runningByProduct.get(productId);
      if (afterMilli === undefined) untypedFailure('internal', 'A product shipped nothing.');
      const mutation = writeBalance(
        scope,
        dispatch.product,
        warehouse.warehouseId,
        dispatch.balance,
        afterMilli,
        now,
      );
      writeSummary(
        scope,
        dispatch.product,
        dispatch.summary,
        mutation.onHandDeltaMilli,
        mutation.valueDeltaMinor,
        now,
      );
    }

    let movementCount = 0;
    for (const dispatch of dispatches) {
      const balanceAfterMilli = balanceAfterByItemId.get(dispatch.line.itemId);
      if (balanceAfterMilli === undefined) {
        untypedFailure('internal', 'A shipped line lost its balance.');
      }
      writeMovement(scope, db, actor, {
        product: dispatch.product,
        warehouse,
        movementType: 'CONNECTED_DISPATCH_OUT',
        signedQuantityMilli: -dispatch.line.orderedSupplierMilli,
        balanceAfterMilli,
        sourceType: 'CONNECTED_PO',
        sourceId: order.purchaseOrderId,
        sourceReferenceSnapshot: order.orderNumber,
        operationId: opId,
        effectiveAt: now,
      });
      movementCount += 1;
    }

    updateConnectedOrderEverywhere(scope, db, order, {
      status: 'SHIPPED',
      shippedAt: now,
      lastOperationId: opId,
    });
    writeConnectedHistory(scope, db, actor, supplierOrgName, order, order.status, 'SHIPPED', opId);

    const reference = order.orderNumber ?? order.purchaseOrderId;
    writeAudit(scope, db, actor, {
      action: 'cpo.ship',
      entityType: CPO_ENTITY,
      entityId: order.purchaseOrderId,
      operationId: opId,
      summary: `Shipped ${String(dispatches.length)} line(s) of ${reference} from ${warehouse.name}.`,
    });
    writeAuditFor(scope, db, actor, order.buyerOrgId, {
      action: 'cpo.ship',
      entityType: CPO_ENTITY,
      entityId: order.purchaseOrderId,
      // The buyer is told the order shipped. It is NOT told which of the
      // supplier's store rooms it left, because warehouse identity never
      // crosses the connected boundary (DB-05 §8).
      summary: `${connection.supplierName} shipped order ${reference}.`,
    });

    writeCounterpartyNotification(scope, db, buyerNotify, {
      type: 'CPO_SHIPPED',
      title: 'Order shipped',
      message: `${connection.supplierName} shipped order ${reference}.`,
      referenceType: 'PURCHASE_ORDER',
      referenceId: order.purchaseOrderId,
    });

    if (stockNotification) {
      for (const transition of transitions) {
        writeStockStatusNotification(
          scope,
          db,
          actor,
          stockNotification,
          transition.product,
          transition.to,
        );
      }
    }

    return { purchaseOrderId: order.purchaseOrderId, status: 'SHIPPED', movementCount };
  },
});

// ─── C-30 cpo.receive ───────────────────────────────────────────────────────

interface ReceiptLine {
  readonly line: ConnectedLine;
  readonly receiveSupplierMilli: number;
  readonly buyerBaseMilli: number;
  readonly completesLine: boolean;
}

interface BuyerReceipt {
  readonly product: TrustedProduct;
  readonly balance: BalanceState;
  readonly summary: SummaryState;
}

/**
 * C-30 `cpo.receive` — **buyer** `RECEIVERS`, idempotent, transactional,
 * audited in both organizations, notifies the supplier and, on a stock-status
 * transition, the buyer's own inventory writers.
 *
 * `SHIPPED | PARTIALLY_RECEIVED → PARTIALLY_RECEIVED | RECEIVED`, and the only
 * command in the connected flow that increases buyer stock (`INV-11`).
 *
 * **Outstanding is tracked in supplier order units** (DB-06 §3.5), which is not
 * a presentation choice: converting on each partial receipt and subtracting in
 * buyer units would let rounding drift accumulate until the last receipt could
 * not close the line. So the guard is
 * `0 < receiveSupplierMilli <= orderedSupplierMilli − receivedSupplierMilli`,
 * derived from the **persisted** quantity and never from the payload, which
 * makes `OVER_RECEIPT` impossible by construction — including under
 * concurrency, because two receipts of the same outstanding quantity serialise
 * on the same canonical item document.
 *
 * **The residual is absorbed into the final line.** `buyerBaseMilli` is
 * `roundHalfUp(receiveSupplierMilli × factorMilli / 1000)` for every receipt
 * except the one that closes a line, which instead takes exactly
 * `orderedBuyerBaseMilli − receivedBuyerBaseMilli`. The buyer's received total
 * therefore lands on the ordered total to the milli-unit, whatever the split.
 */
export const cpoReceive = defineCommand({
  id: 'C-30',
  authorization: { kind: 'MEMBER_ROLE', roles: RECEIVERS },
  handler: async ({ db, scope, membership, orgId, payload, operationId }) => {
    const actor = requireMembership(membership);
    const opId = requireOperationId(operationId);

    const order = await readCanonicalOrder(scope, db, payload.purchaseOrderId);
    const connection = await readCanonicalConnection(scope, db, order.connectionId);
    requireBuyerSide(actor, connection);
    if (order.buyerOrgId !== orgId) {
      fail('CROSS_TENANT_REFERENCE', 'Only the buying organization can receive this order.');
    }
    requireConnectionActive(connection);
    if (order.status !== 'SHIPPED' && order.status !== 'PARTIALLY_RECEIVED') {
      fail('INVALID_TRANSITION', `A ${order.status} order cannot receive stock.`);
    }

    // `receivingWarehouseId` lives on the **buyer's own projection** and nowhere
    // else, because warehouse identity never crosses the connected boundary
    // (DB-05 §8) — so the pin is read from there, not from the canonical record
    // the supplier also sees. The field is singular and `warehouse.archive`'s
    // `Q-057` guard reads it, so letting later receipts wander would silently
    // break that guard.
    const buyerProjection = await scope.get(
      db.doc(paths.purchaseOrder(order.buyerOrgId, order.purchaseOrderId)),
    );
    const pinnedWarehouseId: unknown = buyerProjection.get('receivingWarehouseId');
    if (typeof pinnedWarehouseId === 'string' && pinnedWarehouseId !== payload.warehouseId) {
      fail('INVALID_TRANSITION', 'This order is already being received into another store room.');
    }

    const seen = new Set<string>();
    for (const line of payload.lines) {
      if (seen.has(line.itemId)) {
        fail('SCHEMA_INVALID', 'Each order line may appear only once per receipt.', {
          path: 'lines',
        });
      }
      seen.add(line.itemId);
    }

    const warehouse = await readActiveWarehouse(scope, db, actor, payload.warehouseId);
    const items = await readCanonicalOrderItems(scope, db, order.purchaseOrderId);
    const itemsById = new Map(items.map((item) => [item.id, item]));

    const receipts: ReceiptLine[] = [];
    for (const requested of payload.lines) {
      const snapshot = itemsById.get(requested.itemId);
      if (!snapshot) fail('RESOURCE_NOT_FOUND', 'An order line was not found on this order.');
      const line = readLine(snapshot);
      const receiveSupplierMilli = requested.quantityMilli as number;
      assertSafeQuantity(receiveSupplierMilli, 'A received quantity');
      if (receiveSupplierMilli <= 0) {
        fail('INVALID_QUANTITY', 'A receipt line must carry a positive quantity.');
      }
      const outstanding = line.orderedSupplierMilli - line.receivedSupplierMilli;
      if (receiveSupplierMilli > outstanding) {
        fail('OVER_RECEIPT', 'That is more than this line still has outstanding.');
      }
      if (line.factorMilli <= 0) {
        fail('INVALID_FACTOR', 'This order line carries no usable conversion factor.');
      }
      const completesLine = receiveSupplierMilli === outstanding;
      const buyerBaseMilli = completesLine
        ? line.orderedBuyerBaseMilli - line.receivedBuyerBaseMilli
        : convertMilli(receiveSupplierMilli, line.factorMilli);
      assertSafeQuantity(buyerBaseMilli, 'A converted quantity');
      if (buyerBaseMilli <= 0) {
        fail('INVALID_QUANTITY', 'That quantity converts to nothing in your base unit.');
      }
      receipts.push({ line, receiveSupplierMilli, buyerBaseMilli, completesLine });
    }

    // One product, balance and summary read per distinct buyer product — every
    // line of one receipt lands in the same store room.
    const byProduct = new Map<string, BuyerReceipt>();
    const totalsByProduct = new Map<string, number>();
    for (const receipt of receipts) {
      const productId = receipt.line.buyerProductId;
      totalsByProduct.set(
        productId,
        (totalsByProduct.get(productId) ?? 0) + receipt.buyerBaseMilli,
      );
      if (byProduct.has(productId)) continue;
      const product = await readActiveProduct(scope, db, actor, productId);
      const balance = await readBalanceState(scope, db, actor, product, warehouse.warehouseId);
      const summary = await readSummaryState(scope, db, actor, product);
      byProduct.set(productId, { product, balance, summary });
    }

    const transitions: { readonly product: TrustedProduct; readonly to: StockStatus }[] = [];
    for (const [productId, delta] of totalsByProduct) {
      const receipt = byProduct.get(productId);
      if (!receipt) untypedFailure('internal', 'A receipt line lost its product.');
      const after = prospectiveSummaryStatus(receipt.summary, delta);
      if (isNotifiableTransition(receipt.summary.stockStatus, after)) {
        transitions.push({ product: receipt.product, to: after });
      }
    }
    const stockNotification =
      transitions.length > 0
        ? await readStockNotificationContext(scope, db, actor, INVENTORY_WRITERS)
        : undefined;

    const buyerOrgName = await readOrganizationName(scope, db, orgId);
    const supplierNotify = await resolveCounterpartyNotification(
      scope,
      db,
      order.supplierOrgId,
      PO_WRITERS,
    );

    // ─── every read is done; the write phase begins here ────────────────────
    const now = serverTimestamp();

    const balanceAfterByItemId = new Map<string, number>();
    const runningByProduct = new Map<string, number>();
    for (const receipt of receipts) {
      const productId = receipt.line.buyerProductId;
      const state = byProduct.get(productId);
      if (!state) untypedFailure('internal', 'A receipt line lost its product.');
      const running =
        (runningByProduct.get(productId) ?? state.balance.onHandMilli) + receipt.buyerBaseMilli;
      runningByProduct.set(productId, running);
      balanceAfterByItemId.set(receipt.line.itemId, running);
    }

    for (const [productId, state] of byProduct) {
      const afterMilli = runningByProduct.get(productId);
      if (afterMilli === undefined) untypedFailure('internal', 'A product received nothing.');
      const mutation = writeBalance(
        scope,
        state.product,
        warehouse.warehouseId,
        state.balance,
        afterMilli,
        now,
      );
      writeSummary(
        scope,
        state.product,
        state.summary,
        mutation.onHandDeltaMilli,
        mutation.valueDeltaMinor,
        now,
      );
    }

    let movementCount = 0;
    for (const receipt of receipts) {
      const state = byProduct.get(receipt.line.buyerProductId);
      if (!state) untypedFailure('internal', 'A receipt line lost its product.');
      const balanceAfterMilli = balanceAfterByItemId.get(receipt.line.itemId);
      if (balanceAfterMilli === undefined) {
        untypedFailure('internal', 'A receipt line lost its balance.');
      }
      writeMovement(scope, db, actor, {
        product: state.product,
        warehouse,
        movementType: 'PURCHASE_RECEIPT',
        signedQuantityMilli: receipt.buyerBaseMilli,
        balanceAfterMilli,
        sourceType: 'CONNECTED_PO',
        sourceId: order.purchaseOrderId,
        sourceReferenceSnapshot: order.orderNumber,
        operationId: opId,
        effectiveAt: now,
      });
      movementCount += 1;

      // The quantities move on the canonical record and BOTH projections, so
      // `INV-19`'s "agree on status and quantities" holds for the line grain
      // and not merely for the header.
      const quantities = {
        receivedSupplierMilli: receipt.line.receivedSupplierMilli + receipt.receiveSupplierMilli,
        receivedBuyerBaseMilli: receipt.line.receivedBuyerBaseMilli + receipt.buyerBaseMilli,
      };
      scope.update(
        db.doc(serverPaths.connectedPurchaseOrderItem(order.purchaseOrderId, receipt.line.itemId)),
        quantities,
      );
      scope.update(
        db.doc(
          paths.purchaseOrderItem(order.buyerOrgId, order.purchaseOrderId, receipt.line.itemId),
        ),
        quantities,
      );
      scope.update(
        db.doc(
          paths.purchaseOrderItem(order.supplierOrgId, order.purchaseOrderId, receipt.line.itemId),
        ),
        quantities,
      );
    }

    // Completeness is judged over EVERY line of the order — not only the lines
    // in this receipt — and includes the quantities just applied.
    const appliedByItemId = new Map(
      receipts.map((receipt) => [receipt.line.itemId, receipt.receiveSupplierMilli]),
    );
    const complete = items.every((snapshot) => {
      const line = readLine(snapshot);
      return (
        line.receivedSupplierMilli + (appliedByItemId.get(line.itemId) ?? 0) >=
        line.orderedSupplierMilli
      );
    });
    const nextStatus: PoStatus = complete ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

    updateConnectedOrderEverywhere(
      scope,
      db,
      order,
      {
        status: nextStatus,
        lastOperationId: opId,
        ...(complete ? { receivedAt: now } : {}),
      },
      {
        receivingWarehouseId:
          typeof pinnedWarehouseId === 'string' ? pinnedWarehouseId : warehouse.warehouseId,
      },
    );
    writeConnectedHistory(scope, db, actor, buyerOrgName, order, order.status, nextStatus, opId);

    const reference = order.orderNumber ?? order.purchaseOrderId;
    writeAudit(scope, db, actor, {
      action: 'cpo.receive',
      entityType: CPO_ENTITY,
      entityId: order.purchaseOrderId,
      operationId: opId,
      summary: `Received ${String(receipts.length)} line(s) of ${reference} into ${warehouse.name}.`,
    });
    writeAuditFor(scope, db, actor, order.supplierOrgId, {
      action: 'cpo.receive',
      entityType: CPO_ENTITY,
      entityId: order.purchaseOrderId,
      operationId: opId,
      summary: `${connection.buyerName} recorded a receipt against ${reference}.`,
    });

    writeCounterpartyNotification(scope, db, supplierNotify, {
      type: 'CPO_RECEIVED',
      title: complete ? 'Order received' : 'Partial receipt recorded',
      message: complete
        ? `${connection.buyerName} received order ${reference} in full.`
        : `${connection.buyerName} recorded a partial receipt against ${reference}.`,
      referenceType: 'PURCHASE_ORDER',
      referenceId: order.purchaseOrderId,
    });

    if (stockNotification) {
      for (const transition of transitions) {
        writeStockStatusNotification(
          scope,
          db,
          actor,
          stockNotification,
          transition.product,
          transition.to,
        );
      }
    }

    return { purchaseOrderId: order.purchaseOrderId, status: nextStatus, movementCount };
  },
});

export type { CanonicalOrderState };
