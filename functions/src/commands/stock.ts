import { paths } from '@stockmok/shared';
import { Timestamp } from 'firebase-admin/firestore';
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
  writeSummaryValueOnly,
} from './stock-lib.js';
import { writeAudit } from '../core/audit.js';
import { defineCommand } from '../core/define-command.js';
import { fail } from '../core/errors.js';
import { isFutureTimestamp, serverTimestamp } from '../core/time.js';
import { INVENTORY_WRITERS, TRANSFER_WRITERS } from '../guards/roles.js';

/** `Q-029` / `IDX-24` — `productId + warehouseId + movementType`, bounded at one row. */
const OPENING_BALANCE_PROBE_LIMIT = 1;

/**
 * C-13 `stock.recordOpeningBalance` — `INVENTORY_WRITERS`, idempotent,
 * transactional, audited.
 *
 * **`quantityMilli >= 0`. Zero is legal, and is the point** (A3R-P2 ·
 * C1-AUTH-007, OWNER-APPROVED; DB-06 §3, DB-02 §4.6). A recorded zero is a
 * different fact from a product that was never initialised, which is what makes
 * the out-of-stock KPI provable from the ledger rather than from an absence —
 * so a zero opening balance still writes its immutable `OPENING_BALANCE`
 * movement with `signedQuantityMilli = 0` and `balanceAfterMilli = 0`, its
 * balance and summary rows, its audit record and its receipt. This command is
 * therefore deliberately **not** wired through any shared non-zero quantity
 * validator; every other material stock movement keeps `q > 0`.
 *
 * **One opening balance per product-and-store-room pair.** Now that a zero
 * opening balance is a real ledger entry, "the balance is zero" no longer
 * proves no opening balance was recorded, so the guard is the ledger itself: a
 * bounded `limit(1)` probe on `Q-029` (`IDX-24`, an existing frozen index)
 * inside the transaction. The Admin SDK supports query reads in a transaction,
 * which is what makes the check race-free — the same mechanism DB-06 §5 already
 * sanctions for `warehouse.archive`.
 */
export const stockRecordOpeningBalance = defineCommand({
  id: 'C-13',
  authorization: { kind: 'MEMBER_ROLE', roles: INVENTORY_WRITERS },
  handler: async ({ db, scope, membership, orgId, payload, operationId }) => {
    const actor = requireMembership(membership);
    const opId = requireOperationId(operationId);
    const quantityMilli = payload.quantityMilli as number;
    assertSafeQuantity(quantityMilli, 'The opening quantity');

    // A back-dated "As at" is permitted by the frozen form; a future one is not.
    if (isFutureTimestamp(payload.effectiveAt)) {
      fail('SCHEMA_INVALID', 'The opening date cannot be later than today.', {
        path: 'effectiveAt',
      });
    }

    const product = await readActiveProduct(scope, db, actor, payload.productId);
    const warehouse = await readActiveWarehouse(scope, db, actor, payload.warehouseId);

    const priorOpening = await scope.query(
      db
        .collection(`${paths.organization(orgId)}/stockMovements`)
        .where('productId', '==', product.productId)
        .where('warehouseId', '==', warehouse.warehouseId)
        .where('movementType', '==', 'OPENING_BALANCE'),
      OPENING_BALANCE_PROBE_LIMIT,
    );
    if (!priorOpening.empty) {
      fail(
        'OPENING_BALANCE_ALREADY_RECORDED',
        'An opening balance has already been recorded for this product in this store room.',
      );
    }

    const balance = await readBalanceState(scope, db, actor, product, warehouse.warehouseId);
    if (balance.onHandMilli !== 0) {
      fail(
        'INVALID_TRANSITION',
        'This store room already holds stock of this product; adjust it instead.',
      );
    }
    const summary = await readSummaryState(scope, db, actor, product);

    const statusBefore = summary.stockStatus;
    const statusAfter = prospectiveSummaryStatus(summary, quantityMilli);
    const notifiable = isNotifiableTransition(statusBefore, statusAfter);
    const notification = notifiable
      ? await readStockNotificationContext(scope, db, actor, INVENTORY_WRITERS)
      : undefined;

    const now = serverTimestamp();
    const mutation = writeBalance(
      scope,
      product,
      warehouse.warehouseId,
      balance,
      quantityMilli,
      now,
    );
    writeSummary(scope, product, summary, mutation.onHandDeltaMilli, mutation.valueDeltaMinor, now);

    const movementId = writeMovement(scope, db, actor, {
      product,
      warehouse,
      movementType: 'OPENING_BALANCE',
      signedQuantityMilli: quantityMilli,
      balanceAfterMilli: mutation.afterMilli,
      sourceType: 'MANUAL',
      operationId: opId,
      // Re-minted as a genuine admin Timestamp: the shared schema only proves
      // the payload is timestamp-*shaped*, and what is persisted must be the
      // real Firestore type.
      effectiveAt: Timestamp.fromMillis(payload.effectiveAt.toMillis()),
    });

    writeAudit(scope, db, actor, {
      action: 'stock.recordOpeningBalance',
      entityType: 'STOCK_MOVEMENT',
      entityId: movementId,
      operationId: opId,
      summary: `Recorded an opening balance of ${String(quantityMilli)} milli ${product.baseUnit} of ${product.name} in ${warehouse.name}.`,
    });

    if (notification) {
      writeStockStatusNotification(scope, db, actor, notification, product, statusAfter);
    }

    return { movementId, balanceAfterMilli: mutation.afterMilli };
  },
});

/**
 * C-14 `stock.adjust` — `INVENTORY_WRITERS`, idempotent, transactional,
 * audited, notifies on a stock-status transition only.
 *
 * The sign carries the direction, never a separate flag: a positive quantity is
 * `ADJUSTMENT_IN`, a negative one `ADJUSTMENT_OUT`, and a generic `ADJUSTMENT`
 * is never persisted (DB-02 §4.6). **Zero is rejected** — the shared payload's
 * own `!== 0` refinement rejects it before the handler runs, which is the
 * boundary A3R-P2 draws between this command and `C-13`.
 *
 * A decrease exceeding 50 % of the current balance is a client-side
 * confirmation state, not a server rule: the minimum is a signal to buy, not a
 * rule about reality (DB-06 §3.2). The server's only quantity rule is that the
 * result cannot be negative **for that store room** — enforced in
 * {@link writeBalance}, so a surplus elsewhere can never mask a deficit here.
 */
export const stockAdjust = defineCommand({
  id: 'C-14',
  authorization: { kind: 'MEMBER_ROLE', roles: INVENTORY_WRITERS },
  handler: async ({ db, scope, membership, payload, operationId }) => {
    const actor = requireMembership(membership);
    const opId = requireOperationId(operationId);
    const signedQuantityMilli = payload.signedQuantityMilli;
    assertSafeQuantity(signedQuantityMilli, 'The adjustment quantity');
    if (signedQuantityMilli === 0) {
      fail('INVALID_QUANTITY', 'An adjustment must move a non-zero quantity.');
    }
    if (payload.adjustmentReason === 'OTHER' && !payload.note) {
      fail('SCHEMA_INVALID', 'A note is required when the reason is Other.', { path: 'note' });
    }

    const product = await readActiveProduct(scope, db, actor, payload.productId);
    const warehouse = await readActiveWarehouse(scope, db, actor, payload.warehouseId);
    const balance = await readBalanceState(scope, db, actor, product, warehouse.warehouseId);
    const summary = await readSummaryState(scope, db, actor, product);

    const afterMilli = balance.onHandMilli + signedQuantityMilli;
    if (afterMilli < 0) {
      fail('INSUFFICIENT_STOCK', 'This store room does not hold enough stock.');
    }

    const statusBefore = summary.stockStatus;
    const statusAfter = prospectiveSummaryStatus(summary, afterMilli - balance.onHandMilli);
    const notifiable = isNotifiableTransition(statusBefore, statusAfter);
    const notification = notifiable
      ? await readStockNotificationContext(scope, db, actor, INVENTORY_WRITERS)
      : undefined;

    const now = serverTimestamp();
    const mutation = writeBalance(scope, product, warehouse.warehouseId, balance, afterMilli, now);
    writeSummary(scope, product, summary, mutation.onHandDeltaMilli, mutation.valueDeltaMinor, now);

    const movementId = writeMovement(scope, db, actor, {
      product,
      warehouse,
      movementType: signedQuantityMilli > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
      signedQuantityMilli,
      balanceAfterMilli: mutation.afterMilli,
      sourceType: 'MANUAL',
      adjustmentReason: payload.adjustmentReason,
      note: payload.note,
      operationId: opId,
      effectiveAt: now,
    });

    writeAudit(scope, db, actor, {
      action: 'stock.adjust',
      entityType: 'STOCK_MOVEMENT',
      entityId: movementId,
      operationId: opId,
      summary: `Adjusted ${product.name} in ${warehouse.name} by ${String(signedQuantityMilli)} milli ${product.baseUnit} (${payload.adjustmentReason}).`,
    });

    if (notification) {
      writeStockStatusNotification(scope, db, actor, notification, product, statusAfter);
    }

    return { movementId, balanceAfterMilli: mutation.afterMilli };
  },
});

/**
 * C-33 `stock.transfer` — `TRANSFER_WRITERS`, idempotent, transactional,
 * audited. **Release A, in full** (DB-06 §2).
 *
 * Moves one product between two ACTIVE store rooms of the **same**
 * organization, writing both halves of the ledger at once. Seven documents,
 * exactly: two paired movements, two balances, the summary's `stockValueMinor`
 * alone, the audit record and the receipt (`A3R-12`; `T-XFER-01`).
 *
 * **The pair is the invariant** (`INV-22`). Both movements are created in one
 * transaction under one server-generated `transferId`, with equal magnitude and
 * opposite sign, so a `TRANSFER_OUT` without its `TRANSFER_IN` is impossible by
 * construction rather than by convention.
 *
 * **The product total does not move** (`INV-23`), so the summary's
 * `onHandMilli`, `availableMilli` and `stockStatus` are left untouched and no
 * low-stock notification is possible — DB-06 §2 emits none, and this command
 * therefore never resolves a recipient. Only `stockValueMinor` is rewritten,
 * because value rounds once per balance and the two roundings need not cancel
 * (`INV-27`).
 *
 * **Concurrency** is Firestore's, not ours: competing transfers out of one
 * balance serialise on that `stockBalances` document, and the loser re-reads
 * the new balance on retry. Two concurrent transfers of 30 from a balance of 50
 * produce one success and one `INSUFFICIENT_STOCK` — never a negative balance,
 * and never an application-level lock that would not exist in production.
 *
 * **Payload field adaptation** (DB-02 §9, preserved from B1/B2): DB-06's prose
 * says `fromWarehouseId`/`toWarehouseId`; the frozen shared payload every client
 * already builds says `sourceWarehouseId`/`destinationWarehouseId`. The shared
 * payload wins at the callable boundary and maps to from/to semantics
 * internally. There is exactly one accepted payload shape.
 */
export const stockTransfer = defineCommand({
  id: 'C-33',
  authorization: { kind: 'MEMBER_ROLE', roles: TRANSFER_WRITERS },
  handler: async ({ db, scope, membership, orgId, payload, operationId }) => {
    const actor = requireMembership(membership);
    const opId = requireOperationId(operationId);
    const quantityMilli = payload.quantityMilli as number;
    assertSafeQuantity(quantityMilli, 'The transfer quantity');
    if (quantityMilli <= 0) {
      fail('INVALID_QUANTITY', 'A transfer must move a positive quantity.');
    }
    if (payload.sourceWarehouseId === payload.destinationWarehouseId) {
      fail('SAME_WAREHOUSE', 'A transfer needs two different store rooms.');
    }

    const product = await readActiveProduct(scope, db, actor, payload.productId);
    const source = await readActiveWarehouse(scope, db, actor, payload.sourceWarehouseId);
    const destination = await readActiveWarehouse(scope, db, actor, payload.destinationWarehouseId);
    const sourceBalance = await readBalanceState(scope, db, actor, product, source.warehouseId);
    const destinationBalance = await readBalanceState(
      scope,
      db,
      actor,
      product,
      destination.warehouseId,
    );
    const summary = await readSummaryState(scope, db, actor, product);

    const sourceAfter = sourceBalance.onHandMilli - quantityMilli;
    if (sourceAfter < 0) {
      fail('INSUFFICIENT_STOCK', 'The source store room does not hold enough stock.');
    }
    const destinationAfter = destinationBalance.onHandMilli + quantityMilli;
    assertSafeQuantity(destinationAfter, 'The destination balance');

    const now = serverTimestamp();
    const outMutation = writeBalance(
      scope,
      product,
      source.warehouseId,
      sourceBalance,
      sourceAfter,
      now,
    );
    const inMutation = writeBalance(
      scope,
      product,
      destination.warehouseId,
      destinationBalance,
      destinationAfter,
      now,
    );

    // INV-23 — the quantity halves cancel exactly, so the product total is
    // structurally unchanged and only the rounding delta reaches the summary.
    writeSummaryValueOnly(
      scope,
      summary,
      outMutation.valueDeltaMinor + inMutation.valueDeltaMinor,
      now,
    );

    const transferId = db.collection(`${paths.organization(orgId)}/stockMovements`).doc().id;
    const outMovementId = writeMovement(scope, db, actor, {
      product,
      warehouse: source,
      movementType: 'TRANSFER_OUT',
      signedQuantityMilli: -quantityMilli,
      balanceAfterMilli: outMutation.afterMilli,
      sourceType: 'TRANSFER',
      transferId,
      counterpart: destination,
      operationId: opId,
      effectiveAt: now,
    });
    const inMovementId = writeMovement(scope, db, actor, {
      product,
      warehouse: destination,
      movementType: 'TRANSFER_IN',
      signedQuantityMilli: quantityMilli,
      balanceAfterMilli: inMutation.afterMilli,
      sourceType: 'TRANSFER',
      transferId,
      counterpart: source,
      operationId: opId,
      effectiveAt: now,
    });

    writeAudit(scope, db, actor, {
      action: 'stock.transfer',
      entityType: 'STOCK_MOVEMENT',
      entityId: transferId,
      operationId: opId,
      summary: `Transferred ${String(quantityMilli)} milli ${product.baseUnit} of ${product.name} from ${source.name} to ${destination.name}.`,
    });

    return {
      transferId,
      outMovementId,
      inMovementId,
      fromOnHandMilli: outMutation.afterMilli,
      toOnHandMilli: inMutation.afterMilli,
    };
  },
});
