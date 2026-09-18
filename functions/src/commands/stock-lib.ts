import {
  deriveShortfall,
  deriveStockStatus,
  deriveStockValueMinor,
  paths,
  type MovementType,
  type SourceType,
  type StockStatus,
  type Unit,
} from '@stockmok/shared';
import type { DocumentReference, Firestore, Timestamp } from 'firebase-admin/firestore';
import { fail, untypedFailure } from '../core/errors.js';
import { NOTIFICATION_FANOUT_LIMIT, writeNotifications } from '../core/notify.js';
import { serverTimestamp, type ServerTimestamp } from '../core/time.js';
import type { TransactionScope } from '../core/transaction.js';
import type { TrustedMembership } from '../guards/membership.js';
import { readActiveMemberUidsByRole } from '../guards/reads.js';
import { assertPathWithinTenant } from '../guards/tenant.js';

/**
 * The trusted stock-mutation utility — B3's one piece of shared arithmetic.
 *
 * `C-13`, `C-14`, `C-17` and `C-33` all perform the same mechanical steps
 * (DB-06 §3, steps 7–14): read the product and store room, read the current
 * balance and summary, compute on integers, refuse a negative result, write the
 * balance with its DV-11 derived fields, and write the immutable movement.
 * Centralising exactly that much means the negative-stock guard and `INV-24`'s
 * `balanceAfterMilli` cannot be forgotten by one command out of four.
 *
 * **What it deliberately does not do** is decide anything command-specific. It
 * has no opinion on whether zero is a legal quantity (`C-13` says yes, everyone
 * else says no), on opening-balance uniqueness, on over-receipt, on
 * `SAME_WAREHOUSE`, or on which movement type a signed quantity implies. Those
 * live in the commands, because they are the commands.
 *
 * **Summary maintenance is by delta, never by re-summing.** DB-06 §6's read set
 * for every stock command is the single affected balance — not that product's
 * whole balance set — so `INV-04` and `INV-27` are held by applying the exact
 * integer change this transaction just made:
 *
 *     summary.onHandMilli     += (balanceAfter − balanceBefore)
 *     summary.stockValueMinor += (valueAfter   − valueBefore)
 *
 * Both are exact integer arithmetic over values already read in this
 * transaction, so the sums stay identities rather than approximations. It is
 * also what makes `INV-27` survive a transfer: the two per-balance roundings
 * need not cancel, which is precisely why `A3R-05` moved the summary into the
 * transfer write set.
 */

/** DB-06 §7 — a quantity that is not a safe integer is `INVALID_QUANTITY`. */
export function assertSafeQuantity(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    fail('INVALID_QUANTITY', `${label} must be a whole number of milli units.`);
  }
}

/**
 * Every movement carries the `operationId` that produced it (DB-02 §4.6,
 * `INV-05`). All four stock commands are idempotent, so the frame has already
 * validated one; its absence is a frame defect, not a caller-triggerable state.
 */
export function requireOperationId(operationId: string | undefined): string {
  if (operationId === undefined) {
    untypedFailure('internal', 'This command requires an operationId.');
  }
  return operationId;
}

export interface TrustedProduct {
  readonly productId: string;
  readonly name: string;
  readonly internalSku: string;
  readonly internalSkuNormalized: string;
  readonly categoryId: string;
  readonly baseUnit: Unit;
  readonly purchaseCostMinor: number;
  readonly minimumStockMilli: number;
  readonly productUpdatedAt: unknown;
}

export interface TrustedWarehouse {
  readonly warehouseId: string;
  readonly name: string;
}

/**
 * DB-05 §7 step 6 — ORGANIZATION. A referenced id that does not resolve under
 * the verified tenant's prefix is `CROSS_TENANT_REFERENCE` (DB-06 §2's own
 * error table for `C-33`, and `T-XFER-11`); a document that *does* resolve but
 * is archived is the command's `*_NOT_ACTIVE` state error (`T-XFER-10`). The
 * two conditions are physically distinguishable, so each keeps its own code.
 *
 * This leaks nothing: the response is identical whether the id belongs to
 * another organization or to no organization at all, so it is not an
 * enumeration oracle.
 */
export async function readActiveProduct(
  scope: TransactionScope,
  db: Firestore,
  actor: TrustedMembership,
  productId: string,
): Promise<TrustedProduct> {
  const path = paths.product(actor.orgId, productId);
  assertPathWithinTenant(path, actor, 'The product');
  const snapshot = await scope.get(db.doc(path));
  if (!snapshot.exists) {
    fail('CROSS_TENANT_REFERENCE', 'The product does not belong to this organization.');
  }
  if (snapshot.get('status') !== 'ACTIVE') {
    fail('PRODUCT_NOT_ACTIVE', 'The product is not active.');
  }
  return {
    productId,
    name: snapshot.get('name') as string,
    internalSku: snapshot.get('internalSku') as string,
    internalSkuNormalized: snapshot.get('internalSkuNormalized') as string,
    categoryId: snapshot.get('categoryId') as string,
    baseUnit: snapshot.get('baseUnit') as Unit,
    purchaseCostMinor: snapshot.get('purchaseCostMinor') as number,
    minimumStockMilli: snapshot.get('minimumStockMilli') as number,
    productUpdatedAt: snapshot.get('updatedAt'),
  };
}

export async function readActiveWarehouse(
  scope: TransactionScope,
  db: Firestore,
  actor: TrustedMembership,
  warehouseId: string,
): Promise<TrustedWarehouse> {
  const path = paths.warehouse(actor.orgId, warehouseId);
  assertPathWithinTenant(path, actor, 'The store room');
  const snapshot = await scope.get(db.doc(path));
  if (!snapshot.exists) {
    fail('CROSS_TENANT_REFERENCE', 'The store room does not belong to this organization.');
  }
  if (snapshot.get('status') !== 'ACTIVE') {
    fail('WAREHOUSE_NOT_ACTIVE', 'The store room is not active.');
  }
  return { warehouseId, name: snapshot.get('name') as string };
}

export interface BalanceState {
  readonly ref: DocumentReference;
  readonly exists: boolean;
  readonly onHandMilli: number;
  readonly stockValueMinor: number;
  readonly stockStatus: StockStatus;
  /** From the row itself when it exists, so `INV-26` stays a same-document derivation. */
  readonly baseUnitPriceMinor: number;
  readonly minimumStockMilli: number;
}

export async function readBalanceState(
  scope: TransactionScope,
  db: Firestore,
  actor: TrustedMembership,
  product: TrustedProduct,
  warehouseId: string,
): Promise<BalanceState> {
  const path = paths.stockBalance(actor.orgId, product.productId, warehouseId);
  assertPathWithinTenant(path, actor, 'The stock balance');
  const ref = db.doc(path);
  const snapshot = await scope.get(ref);
  if (!snapshot.exists) {
    return {
      ref,
      exists: false,
      onHandMilli: 0,
      stockValueMinor: 0,
      stockStatus: deriveStockStatus(0, product.minimumStockMilli),
      baseUnitPriceMinor: product.purchaseCostMinor,
      minimumStockMilli: product.minimumStockMilli,
    };
  }
  const onHandMilli = snapshot.get('onHandMilli') as number;
  const minimumStockMilli = snapshot.get('minimumStockMilli') as number;
  assertSafeQuantity(onHandMilli, 'The current balance');
  return {
    ref,
    exists: true,
    onHandMilli,
    stockValueMinor: snapshot.get('stockValueMinor') as number,
    stockStatus: deriveStockStatus(onHandMilli, minimumStockMilli),
    baseUnitPriceMinor: snapshot.get('baseUnitPriceMinor') as number,
    minimumStockMilli,
  };
}

export interface BalanceMutation {
  readonly afterMilli: number;
  readonly onHandDeltaMilli: number;
  readonly valueDeltaMinor: number;
  readonly statusBefore: StockStatus;
  readonly statusAfter: StockStatus;
}

/**
 * Writes one `stockBalances` row and reports the exact deltas the summary needs.
 *
 * **The negative-stock guard lives here**, so it applies per `StockBalance` —
 * product × store room — exactly as DB-06 §3 requires: stock can never be
 * driven negative in one location and masked by a surplus in another.
 *
 * A newly created row carries its DV-11 denormalised product fields from the
 * product already read in this transaction (DB-02 §4.4); an existing row keeps
 * them, because `product.update` / `product.setStatus` own that fanout.
 */
export function writeBalance(
  scope: TransactionScope,
  product: TrustedProduct,
  warehouseId: string,
  state: BalanceState,
  afterMilli: number,
  now: ServerTimestamp,
): BalanceMutation {
  assertSafeQuantity(afterMilli, 'The resulting balance');
  if (afterMilli < 0) {
    fail('INSUFFICIENT_STOCK', 'This store room does not hold enough stock.');
  }
  const stockValueMinor = deriveStockValueMinor(afterMilli, state.baseUnitPriceMinor);
  const stockStatus = deriveStockStatus(afterMilli, state.minimumStockMilli);
  const shortfallMilli = deriveShortfall(state.minimumStockMilli, afterMilli);

  if (state.exists) {
    scope.update(state.ref, {
      onHandMilli: afterMilli,
      stockValueMinor,
      stockStatus,
      shortfallMilli,
      updatedAt: now,
    });
  } else {
    scope.create(state.ref, {
      productId: product.productId,
      warehouseId,
      onHandMilli: afterMilli,
      unit: product.baseUnit,
      productName: product.name,
      internalSku: product.internalSku,
      internalSkuNormalized: product.internalSkuNormalized,
      categoryId: product.categoryId,
      productStatus: 'ACTIVE',
      baseUnitPriceMinor: state.baseUnitPriceMinor,
      minimumStockMilli: state.minimumStockMilli,
      productUpdatedAt: product.productUpdatedAt,
      stockValueMinor,
      stockStatus,
      shortfallMilli,
      updatedAt: now,
    });
  }

  return {
    afterMilli,
    onHandDeltaMilli: afterMilli - state.onHandMilli,
    valueDeltaMinor: stockValueMinor - state.stockValueMinor,
    statusBefore: state.stockStatus,
    statusAfter: stockStatus,
  };
}

export interface SummaryState {
  readonly ref: DocumentReference;
  readonly exists: boolean;
  readonly onHandMilli: number;
  readonly stockValueMinor: number;
  readonly minimumStockMilli: number;
  readonly stockStatus: StockStatus;
}

export async function readSummaryState(
  scope: TransactionScope,
  db: Firestore,
  actor: TrustedMembership,
  product: TrustedProduct,
): Promise<SummaryState> {
  const path = paths.productStockSummary(actor.orgId, product.productId);
  assertPathWithinTenant(path, actor, 'The product stock summary');
  const ref = db.doc(path);
  const snapshot = await scope.get(ref);
  if (!snapshot.exists) {
    return {
      ref,
      exists: false,
      onHandMilli: 0,
      stockValueMinor: 0,
      minimumStockMilli: product.minimumStockMilli,
      stockStatus: deriveStockStatus(0, product.minimumStockMilli),
    };
  }
  const onHandMilli = snapshot.get('onHandMilli') as number;
  const minimumStockMilli = snapshot.get('minimumStockMilli') as number;
  return {
    ref,
    exists: true,
    onHandMilli,
    stockValueMinor: snapshot.get('stockValueMinor') as number,
    minimumStockMilli,
    stockStatus: deriveStockStatus(onHandMilli, minimumStockMilli),
  };
}

export interface SummaryMutation {
  readonly statusBefore: StockStatus;
  readonly statusAfter: StockStatus;
  readonly onHandMilli: number;
}

/**
 * `INV-04` and `INV-27` by delta. `C-13`, `C-14` and `C-17` write the whole
 * derived set; `stock.transfer` does not come here at all — see
 * {@link writeSummaryValueOnly}.
 */
export function writeSummary(
  scope: TransactionScope,
  product: TrustedProduct,
  state: SummaryState,
  onHandDeltaMilli: number,
  valueDeltaMinor: number,
  now: ServerTimestamp,
): SummaryMutation {
  const onHandMilli = state.onHandMilli + onHandDeltaMilli;
  const stockValueMinor = state.stockValueMinor + valueDeltaMinor;
  assertSafeQuantity(onHandMilli, 'The resulting product total');
  if (onHandMilli < 0 || stockValueMinor < 0) {
    untypedFailure('internal', 'A product stock summary cannot go negative.');
  }
  const stockStatus = deriveStockStatus(onHandMilli, state.minimumStockMilli);
  const derived = {
    onHandMilli,
    availableMilli: onHandMilli,
    stockStatus,
    stockValueMinor,
    shortfallMilli: deriveShortfall(state.minimumStockMilli, onHandMilli),
    updatedAt: now,
  };

  if (state.exists) {
    scope.update(state.ref, derived);
  } else {
    scope.create(state.ref, {
      productId: product.productId,
      productName: product.name,
      internalSku: product.internalSku,
      internalSkuNormalized: product.internalSkuNormalized,
      categoryId: product.categoryId,
      productStatus: 'ACTIVE',
      baseUnitPriceMinor: product.purchaseCostMinor,
      productUpdatedAt: product.productUpdatedAt,
      reservedMilli: 0,
      minimumStockMilli: state.minimumStockMilli,
      unit: product.baseUnit,
      ...derived,
    });
  }

  return { statusBefore: state.stockStatus, statusAfter: stockStatus, onHandMilli };
}

/**
 * `stock.transfer`'s summary write — `stockValueMinor` and nothing else
 * (DB-06 §6.2 · `A3R-12`; `INV-23` as amended by `A3R-05`; `T-XFER-01`/`03`).
 *
 * A transfer cannot change a product total, so `onHandMilli`, `availableMilli`
 * and `stockStatus` stay structurally untouched and `INV-04` holds by
 * construction. `stockValueMinor` still moves, because value is rounded once
 * per balance and the two roundings need not cancel — which is the whole reason
 * `A3R-05` grew this write set from six documents to seven.
 */
export function writeSummaryValueOnly(
  scope: TransactionScope,
  state: SummaryState,
  valueDeltaMinor: number,
  now: ServerTimestamp,
): void {
  if (!state.exists) {
    untypedFailure('internal', 'A transfer requires an existing product stock summary.');
  }
  const stockValueMinor = state.stockValueMinor + valueDeltaMinor;
  if (stockValueMinor < 0) {
    untypedFailure('internal', 'A product stock value cannot go negative.');
  }
  scope.update(state.ref, { stockValueMinor, updatedAt: now });
}

export interface MovementInput {
  readonly product: TrustedProduct;
  readonly warehouse: TrustedWarehouse;
  readonly movementType: MovementType;
  readonly signedQuantityMilli: number;
  readonly balanceAfterMilli: number;
  readonly sourceType: SourceType;
  readonly sourceId?: string | undefined;
  readonly sourceReferenceSnapshot?: string | undefined;
  readonly transferId?: string | undefined;
  readonly counterpart?: TrustedWarehouse | undefined;
  readonly adjustmentReason?: string | undefined;
  readonly note?: string | undefined;
  readonly operationId: string;
  /** `serverTimestamp()` for every type but `OPENING_BALANCE` (DB-02 §4.6). */
  readonly effectiveAt: Timestamp | ServerTimestamp;
}

/**
 * Creates one immutable `stockMovements` row (`INV-02`). `balanceAfterMilli` is
 * always the balance this transaction just wrote for this movement's own
 * product-and-store-room (`INV-24`) — never a client value, and never
 * recomputed later. `movementKind` is deliberately **not** persisted; the UI
 * derives it.
 */
export function writeMovement(
  scope: TransactionScope,
  db: Firestore,
  actor: TrustedMembership,
  input: MovementInput,
): string {
  const movementId = db.collection(`${paths.organization(actor.orgId)}/stockMovements`).doc().id;
  scope.create(db.doc(paths.stockMovement(actor.orgId, movementId)), {
    movementId,
    productId: input.product.productId,
    warehouseId: input.warehouse.warehouseId,
    productNameSnapshot: input.product.name,
    skuSnapshot: input.product.internalSku,
    movementType: input.movementType,
    signedQuantityMilli: input.signedQuantityMilli,
    unit: input.product.baseUnit,
    balanceAfterMilli: input.balanceAfterMilli,
    sourceType: input.sourceType,
    ...(input.sourceId !== undefined ? { sourceId: input.sourceId } : {}),
    ...(input.sourceReferenceSnapshot !== undefined
      ? { sourceReferenceSnapshot: input.sourceReferenceSnapshot }
      : {}),
    ...(input.transferId !== undefined ? { transferId: input.transferId } : {}),
    ...(input.counterpart !== undefined
      ? {
          counterpartWarehouseId: input.counterpart.warehouseId,
          counterpartWarehouseNameSnapshot: input.counterpart.name,
        }
      : {}),
    ...(input.adjustmentReason !== undefined ? { adjustmentReason: input.adjustmentReason } : {}),
    ...(input.note !== undefined ? { note: input.note } : {}),
    operationId: input.operationId,
    actorUid: actor.uid,
    actorName: actor.displayName,
    warehouseNameSnapshot: input.warehouse.name,
    effectiveAt: input.effectiveAt,
    createdAt: serverTimestamp(),
  });
  return movementId;
}

/**
 * The low-stock notification path — DB-06 §3 step 17, and nothing beyond it.
 *
 * *"Write notifications IF AND ONLY IF the derived stock status changed"*, at
 * the **product** grain, because that is the grain `Q-021a`/`Q-021b` and the
 * Needs-Attention board read. Comparing the status before the command with the
 * status after, inside the same transaction, is what makes ten partial receipts
 * of one low product produce one notification rather than ten (`FR-STOCK-017`).
 *
 * `stock.transfer` never reaches here: it cannot change a product total, so no
 * status transition is possible and DB-06 §2 emits none.
 */
export function prospectiveSummaryStatus(
  state: SummaryState,
  onHandDeltaMilli: number,
): StockStatus {
  return deriveStockStatus(state.onHandMilli + onHandDeltaMilli, state.minimumStockMilli);
}

/** Only a move *into* a worse-than-healthy state is an event worth telling anyone about. */
export function isNotifiableTransition(before: StockStatus, after: StockStatus): boolean {
  return after !== before && (after === 'LOW_STOCK' || after === 'OUT_OF_STOCK');
}

export interface StockNotificationContext {
  readonly enabled: boolean;
  readonly organizationName: string;
  readonly recipients: readonly string[];
}

/**
 * Resolves recipients **before any write** and honours the frozen
 * `settings.lowStockNotificationsEnabled` switch (DB-02 §3.3, default `true`).
 * Recipients are the roles that can actually act on the shortage —
 * `INVENTORY_WRITERS` — resolved through `Q-059`, bounded at 50 by the shared
 * notification helper.
 */
export async function readStockNotificationContext(
  scope: TransactionScope,
  db: Firestore,
  actor: TrustedMembership,
  roles: readonly string[],
): Promise<StockNotificationContext> {
  const settings = await scope.get(db.doc(paths.settings(actor.orgId)));
  const enabled = settings.get('lowStockNotificationsEnabled') !== false;
  const organization = await scope.get(db.doc(paths.organization(actor.orgId)));
  const name: unknown = organization.get('name');
  if (!enabled) {
    return { enabled, organizationName: actor.orgId, recipients: [] };
  }
  const recipients = await readActiveMemberUidsByRole(
    db,
    actor.orgId,
    roles,
    NOTIFICATION_FANOUT_LIMIT,
    scope.raw,
  );
  return {
    enabled,
    organizationName: typeof name === 'string' ? name : actor.orgId,
    recipients,
  };
}

export function writeStockStatusNotification(
  scope: TransactionScope,
  db: Firestore,
  actor: TrustedMembership,
  context: StockNotificationContext,
  product: TrustedProduct,
  status: StockStatus,
): void {
  if (!context.enabled || context.recipients.length === 0) return;
  const outOfStock = status === 'OUT_OF_STOCK';
  writeNotifications(scope, db, {
    recipients: context.recipients,
    orgId: actor.orgId,
    organizationName: context.organizationName,
    type: outOfStock ? 'OUT_OF_STOCK' : 'LOW_STOCK',
    title: outOfStock ? 'Out of stock' : 'Low stock',
    message: outOfStock
      ? `${product.name} (${product.internalSku}) is out of stock.`
      : `${product.name} (${product.internalSku}) has fallen below its minimum.`,
    referenceType: 'PRODUCT',
    referenceId: product.productId,
  });
}
