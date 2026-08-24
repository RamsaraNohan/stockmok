import { paths } from '../../../packages/shared/src/paths.js';
import type {
  AdjustmentReason,
  MovementType,
  SourceType,
} from '../../../packages/shared/src/primitives.js';
import { StockMovementSchema } from '../../../packages/shared/src/schemas/inventory.js';
import type { DatasetBuilder, QaOrg, QaPlan, QaProduct } from '../dataset.js';
import { epochPlus, hashLabel, ordinal } from '../deterministic.js';
import { connectedNetworkPlan } from './network.js';
import { privateProcurementPlan } from './procurement.js';

/**
 * The stock movement ledger.
 *
 * The ledger is built *backwards from the target balance*: every non-opening
 * movement is chosen first, and the opening balance is then whatever makes the
 * running total land exactly on the balance the read models already publish. So
 * `sum(signedQuantityMilli) === onHandMilli` holds by construction, and the
 * verifier re-derives it independently rather than trusting that.
 *
 * Receipts and dispatches are not invented here. They are read out of the
 * procurement and network plans, so every `sourceId` points at a purchase order
 * that actually exists and carries the quantity the movement claims.
 */

interface LedgerStep {
  readonly movementType: MovementType;
  readonly delta: number;
  readonly sourceType: SourceType;
  readonly sourceId?: string;
  readonly sourceReference?: string;
  readonly adjustmentReason?: AdjustmentReason;
  readonly transferId?: string;
  readonly counterpartWarehouseId?: string;
  readonly note?: string;
}

type BalanceKey = string;

function balanceKey(orgId: string, productId: string, warehouseId: string): BalanceKey {
  return `${orgId}|${productId}|${warehouseId}`;
}

/**
 * Receipts and dispatches implied by the procurement and network plans, keyed by
 * the balance they land on.
 */
function externalSteps(plan: QaPlan): ReadonlyMap<BalanceKey, readonly LedgerStep[]> {
  const collected = new Map<BalanceKey, LedgerStep[]>();

  function push(orgId: string, productId: string, warehouseId: string, step: LedgerStep): void {
    if (step.delta === 0) return;
    const key = balanceKey(orgId, productId, warehouseId);
    const existing = collected.get(key);
    if (existing === undefined) collected.set(key, [step]);
    else existing.push(step);
  }

  for (const org of plan.organizations) {
    for (const order of privateProcurementPlan(org)) {
      for (const line of order.lines) {
        push(org.orgId, line.productId, order.receivingWarehouseId, {
          movementType: 'PURCHASE_RECEIPT',
          delta: line.receivedMilli,
          sourceType: 'PRIVATE_PO',
          sourceId: order.purchaseOrderId,
          ...(order.orderNumber !== undefined ? { sourceReference: order.orderNumber } : {}),
        });
      }
    }
  }

  const network = connectedNetworkPlan(plan);
  if (network !== undefined) {
    for (const order of network.orders) {
      for (const line of order.lines) {
        // Buyer side: connected stock arrives in the buyer's base unit.
        push(network.buyer.orgId, line.mapping.buyerProduct.productId, order.receivingWarehouseId, {
          movementType: 'PURCHASE_RECEIPT',
          delta: line.receivedBuyerBaseMilli,
          sourceType: 'CONNECTED_PO',
          sourceId: order.purchaseOrderId,
          ...(order.orderNumber !== undefined ? { sourceReference: order.orderNumber } : {}),
        });

        // Supplier side: shipping is what removes the supplier's own stock, so
        // every status from SHIPPED onward has dispatched the ordered quantity.
        const dispatched =
          order.status === 'SHIPPED' ||
          order.status === 'PARTIALLY_RECEIVED' ||
          order.status === 'RECEIVED';
        if (!dispatched) continue;
        const supplierWarehouse = line.mapping.supplierProduct.warehouseIds[0];
        if (supplierWarehouse === undefined) continue;
        push(network.supplier.orgId, line.mapping.supplierProduct.productId, supplierWarehouse, {
          movementType: 'CONNECTED_DISPATCH_OUT',
          delta: -line.orderedBuyerBaseMilli,
          sourceType: 'CONNECTED_PO',
          sourceId: order.purchaseOrderId,
          ...(order.orderNumber !== undefined ? { sourceReference: order.orderNumber } : {}),
        });
      }
    }
  }

  return collected;
}

/** Adjustments, transfers, and the drain that produces a genuine OUT_OF_STOCK. */
function localSteps(
  org: QaOrg,
  product: QaProduct,
  warehouseId: string,
  target: number,
): readonly LedgerStep[] {
  const entropy = hashLabel(`${org.orgId}:${product.productId}:${warehouseId}`);
  const steps: LedgerStep[] = [];

  if (target > 0) {
    steps.push({
      movementType: 'ADJUSTMENT_IN',
      delta: 500 + (entropy % 4) * 100,
      sourceType: 'MANUAL',
      adjustmentReason: 'RECOUNT_CORRECTION',
    });
    steps.push({
      movementType: 'ADJUSTMENT_OUT',
      delta: -(400 + (entropy % 5) * 100),
      sourceType: 'MANUAL',
      adjustmentReason: 'WASTAGE',
    });
  } else {
    // An out-of-stock balance that was never stocked is not interesting. This
    // one held stock and lost it, which is the shape reconciliation must cope with.
    steps.push({
      movementType: 'ADJUSTMENT_OUT',
      delta: -(2_000 + (entropy % 5) * 100),
      sourceType: 'MANUAL',
      adjustmentReason: 'DAMAGED_IN_STORAGE',
    });
  }

  const [primary, secondary] = product.warehouseIds;
  if (primary !== undefined && secondary !== undefined) {
    // Derived from the *pair*, not from this leg. `entropy` is keyed by the leg's
    // own warehouse, so using it here would give the two legs different
    // quantities and a transfer that does not balance.
    const pairEntropy = hashLabel(`${org.orgId}:${product.productId}:${primary}:${secondary}`);
    const amount = 300 + (pairEntropy % 3) * 100;
    const transferId = `qa-tr-${product.productId}-${primary}-${secondary}`;
    if (warehouseId === primary) {
      steps.push({
        movementType: 'TRANSFER_OUT',
        delta: -amount,
        sourceType: 'TRANSFER',
        transferId,
        counterpartWarehouseId: secondary,
      });
    } else if (warehouseId === secondary) {
      steps.push({
        movementType: 'TRANSFER_IN',
        delta: amount,
        sourceType: 'TRANSFER',
        transferId,
        counterpartWarehouseId: primary,
      });
    }
  }

  return steps;
}

function warehouseName(org: QaOrg, warehouseId: string): string {
  const warehouse = org.warehouses.find((candidate) => candidate.warehouseId === warehouseId);
  if (warehouse === undefined) throw new Error(`${org.orgId} has no warehouse ${warehouseId}`);
  return warehouse.name;
}

export function generateMovements(builder: DatasetBuilder, plan: QaPlan): void {
  const externals = externalSteps(plan);

  for (const org of plan.organizations) {
    const keeper = org.users.find((user) => user.role === 'STOREKEEPER');
    if (keeper === undefined) throw new Error(`${org.orgId} has no STOREKEEPER`);

    for (const product of org.products) {
      for (const warehouseId of product.warehouseIds) {
        const target = product.targetOnHandMilli[warehouseId] ?? 0;
        const steps = [
          ...(externals.get(balanceKey(org.orgId, product.productId, warehouseId)) ?? []),
          ...localSteps(org, product, warehouseId, target),
        ];

        const movedTotal = steps.reduce((sum, step) => sum + step.delta, 0);
        const opening = target - movedTotal;
        if (opening < 0) {
          throw new Error(
            `${org.orgId}/${product.productId}@${warehouseId} needs an opening balance of ` +
              `${String(opening)}; the ledger removes more than the target balance holds`,
          );
        }

        // Inflows are sequenced before outflows. The running total then rises to
        // its peak and falls monotonically to the target, so the minimum along
        // the way *is* the target - which makes a non-negative ledger a property
        // of the ordering rather than a coincidence of the numbers. Without it a
        // balance that receives a transfer and writes off stock in the same
        // period can dip below zero in between.
        const inflows = steps.filter((step) => step.delta >= 0);
        const outflows = steps.filter((step) => step.delta < 0);
        const ordered: readonly LedgerStep[] = [
          {
            movementType: 'OPENING_BALANCE',
            delta: opening,
            sourceType: 'MANUAL',
            note: 'QA opening balance',
          },
          ...inflows,
          ...outflows,
        ];

        let running = 0;
        ordered.forEach((step, index) => {
          running += step.delta;
          if (running < 0) {
            throw new Error(
              `${org.orgId}/${product.productId}@${warehouseId} goes negative at step ` +
                `${String(index)} (${step.movementType})`,
            );
          }
          // The schema permits a zero only on an opening balance.
          if (step.delta === 0 && step.movementType !== 'OPENING_BALANCE') return;

          const movementId = `qa-mv-${product.productId}-${warehouseId}-${ordinal(index + 1)}`;
          builder.add(paths.stockMovement(org.orgId, movementId), StockMovementSchema, {
            movementId,
            productId: product.productId,
            warehouseId,
            productNameSnapshot: product.name,
            skuSnapshot: product.internalSku,
            movementType: step.movementType,
            signedQuantityMilli: step.delta,
            unit: product.baseUnit,
            balanceAfterMilli: running,
            sourceType: step.sourceType,
            ...(step.sourceId !== undefined ? { sourceId: step.sourceId } : {}),
            ...(step.sourceReference !== undefined
              ? { sourceReferenceSnapshot: step.sourceReference }
              : {}),
            ...(step.transferId !== undefined ? { transferId: step.transferId } : {}),
            ...(step.counterpartWarehouseId !== undefined
              ? {
                  counterpartWarehouseId: step.counterpartWarehouseId,
                  counterpartWarehouseNameSnapshot: warehouseName(org, step.counterpartWarehouseId),
                }
              : {}),
            ...(step.adjustmentReason !== undefined
              ? { adjustmentReason: step.adjustmentReason }
              : {}),
            ...(step.note !== undefined ? { note: step.note } : {}),
            operationId: `qa-op-${movementId}`,
            actorUid: keeper.uid,
            actorName: keeper.displayName,
            warehouseNameSnapshot: warehouseName(org, warehouseId),
            effectiveAt: epochPlus(3 + index, 9),
            createdAt: epochPlus(3 + index, 10),
          });
        });
      }
    }
  }
}
