import {
  deriveShortfall,
  deriveStockStatus,
  deriveStockValueMinor,
  normalizeSku,
  paths,
  sumBalanceValues,
} from '@stockmok/shared';
import { assertReservationAvailable, requireMembership } from './lib.js';
import { writeAudit } from '../core/audit.js';
import { defineCommand } from '../core/define-command.js';
import { fail } from '../core/errors.js';
import { serverTimestamp } from '../core/time.js';
import { requireTenantDocument } from '../guards/tenant.js';

const MAX_BALANCE_FANOUT = 100;

/**
 * C-09 `product.create` — `INVENTORY_WRITERS`, idempotent, transactional, audited.
 *
 * `productSkuIndex/{skuNormalized}` makes SKU uniqueness race-free by
 * database enforcement (DB-06 §5) rather than a read-then-write check —
 * `assertReservationAvailable` turns the common case into a typed
 * `SKU_TAKEN`, and a concurrent winner is still caught at commit by the
 * `txn.create` precondition on retry.
 */
export const productCreate = defineCommand({
  id: 'C-09',
  authorization: { kind: 'MEMBER_ROLE', roles: ['OWNER', 'ADMIN', 'INVENTORY_MANAGER'] },
  handler: async ({ db, scope, membership, orgId, payload }) => {
    const actor = requireMembership(membership);
    const internalSkuNormalized = normalizeSku(payload.internalSku);

    const categorySnap = await scope.get(db.doc(paths.category(orgId, payload.categoryId)));
    if (!categorySnap.exists || categorySnap.get('status') !== 'ACTIVE') {
      fail('RESOURCE_NOT_FOUND', 'The category does not exist or is not available.');
    }

    const skuIndexRef = db.doc(paths.productSkuIndex(orgId, internalSkuNormalized));
    await assertReservationAvailable(
      scope,
      skuIndexRef,
      'SKU_TAKEN',
      'This SKU is already in use.',
    );

    const productId = db.collection(`${paths.organization(orgId)}/products`).doc().id;
    const now = serverTimestamp();

    scope.create(db.doc(paths.product(orgId, productId)), {
      productId,
      internalSku: payload.internalSku,
      internalSkuNormalized,
      name: payload.name,
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      categoryId: payload.categoryId,
      baseUnit: payload.baseUnit,
      purchaseCostMinor: payload.purchaseCostMinor,
      ...(payload.sellingPriceMinor !== undefined
        ? { sellingPriceMinor: payload.sellingPriceMinor }
        : {}),
      currency: payload.currency,
      minimumStockMilli: payload.minimumStockMilli,
      reorderTargetMilli: payload.reorderTargetMilli,
      status: 'ACTIVE',
      partnerPublished: false,
      storefrontPublished: false,
      createdAt: now,
      createdBy: actor.uid,
      updatedAt: now,
      updatedBy: actor.uid,
    });

    scope.create(skuIndexRef, { productId, createdAt: now });

    scope.create(db.doc(paths.productStockSummary(orgId, productId)), {
      productId,
      productName: payload.name,
      internalSku: payload.internalSku,
      internalSkuNormalized,
      categoryId: payload.categoryId,
      productStatus: 'ACTIVE',
      baseUnitPriceMinor: payload.purchaseCostMinor,
      productUpdatedAt: now,
      onHandMilli: 0,
      reservedMilli: 0,
      availableMilli: 0,
      minimumStockMilli: payload.minimumStockMilli,
      stockStatus: deriveStockStatus(0, payload.minimumStockMilli),
      stockValueMinor: 0,
      shortfallMilli: deriveShortfall(payload.minimumStockMilli, 0),
      unit: payload.baseUnit,
      updatedAt: now,
    });

    writeAudit(scope, db, actor, {
      action: 'product.create',
      entityType: 'PRODUCT',
      entityId: productId,
      summary: `Created product ${payload.name} (${payload.internalSku}).`,
    });

    return { productId };
  },
});

/**
 * C-10 `product.update` — `INVENTORY_WRITERS`, transactional, audited.
 *
 * Fans out to that product's balances with `Q-079` (`IDX-09`, `limit(100)`,
 * bounded by the ACTIVE-warehouse count) whenever a denormalised field
 * (name, SKU, category, cost, minimum) changes, recomputing the DV-11
 * derived fields on each balance in the same pass — zero extra reads beyond
 * the fanout itself. The summary's `stockValueMinor` is the exact sum of the
 * balances just rewritten (`INV-27`), not an independent rounding.
 */
export const productUpdate = defineCommand({
  id: 'C-10',
  authorization: { kind: 'MEMBER_ROLE', roles: ['OWNER', 'ADMIN', 'INVENTORY_MANAGER'] },
  handler: async ({ db, scope, membership, orgId, payload }) => {
    const actor = requireMembership(membership);
    const productId = payload.productId;
    const productRef = db.doc(paths.product(orgId, productId));
    const productSnap = await scope.get(productRef);
    requireTenantDocument(productSnap, actor, 'The product');
    const current = productSnap.data();
    if (!current) fail('RESOURCE_NOT_FOUND', 'The product does not exist.');

    if (payload.categoryId !== undefined && payload.categoryId !== current.categoryId) {
      const categorySnap = await scope.get(db.doc(paths.category(orgId, payload.categoryId)));
      if (!categorySnap.exists || categorySnap.get('status') !== 'ACTIVE') {
        fail('RESOURCE_NOT_FOUND', 'The category does not exist or is not available.');
      }
    }

    const currentSkuNormalized = current.internalSkuNormalized as string;
    let nextSkuNormalized = currentSkuNormalized;
    const nextInternalSkuTyped = payload.internalSku;
    const skuChanged = nextInternalSkuTyped !== undefined;
    if (skuChanged) {
      nextSkuNormalized = normalizeSku(nextInternalSkuTyped);
      if (nextSkuNormalized !== currentSkuNormalized) {
        await assertReservationAvailable(
          scope,
          db.doc(paths.productSkuIndex(orgId, nextSkuNormalized)),
          'SKU_TAKEN',
          'This SKU is already in use.',
        );
      }
    }

    const balancesQuery = db
      .collection(`${paths.organization(orgId)}/stockBalances`)
      .where('productId', '==', productId);
    const balancesSnap = await scope.query(balancesQuery, MAX_BALANCE_FANOUT);
    const summaryRef = db.doc(paths.productStockSummary(orgId, productId));
    const summarySnap = await scope.get(summaryRef);

    const nextName = payload.name ?? (current.name as string);
    const nextInternalSku = nextInternalSkuTyped ?? (current.internalSku as string);
    const nextCategoryId = payload.categoryId ?? (current.categoryId as string);
    const nextCost = payload.purchaseCostMinor ?? (current.purchaseCostMinor as number);
    const nextMinimum = payload.minimumStockMilli ?? (current.minimumStockMilli as number);
    const now = serverTimestamp();

    const productUpdate: Record<string, unknown> = { updatedAt: now, updatedBy: actor.uid };
    if (nextInternalSkuTyped !== undefined) {
      productUpdate.internalSku = nextInternalSkuTyped;
      productUpdate.internalSkuNormalized = nextSkuNormalized;
    }
    if (payload.name !== undefined) productUpdate.name = payload.name;
    if (payload.description !== undefined) productUpdate.description = payload.description;
    if (payload.categoryId !== undefined) productUpdate.categoryId = payload.categoryId;
    if (payload.purchaseCostMinor !== undefined) {
      productUpdate.purchaseCostMinor = payload.purchaseCostMinor;
    }
    if (payload.sellingPriceMinor !== undefined) {
      productUpdate.sellingPriceMinor = payload.sellingPriceMinor;
    }
    if (payload.minimumStockMilli !== undefined) {
      productUpdate.minimumStockMilli = payload.minimumStockMilli;
    }
    if (payload.reorderTargetMilli !== undefined) {
      productUpdate.reorderTargetMilli = payload.reorderTargetMilli;
    }
    scope.update(productRef, productUpdate);

    if (skuChanged && nextSkuNormalized !== currentSkuNormalized) {
      scope.deleteIndexDocument(db.doc(paths.productSkuIndex(orgId, currentSkuNormalized)));
      scope.create(db.doc(paths.productSkuIndex(orgId, nextSkuNormalized)), {
        productId,
        createdAt: now,
      });
    }

    const newBalanceValues: number[] = [];
    for (const balanceDoc of balancesSnap.docs) {
      const onHandMilli = balanceDoc.get('onHandMilli') as number;
      const stockValueMinor = deriveStockValueMinor(onHandMilli, nextCost);
      newBalanceValues.push(stockValueMinor);
      scope.update(balanceDoc.ref, {
        productName: nextName,
        internalSku: nextInternalSku,
        internalSkuNormalized: nextSkuNormalized,
        categoryId: nextCategoryId,
        baseUnitPriceMinor: nextCost,
        minimumStockMilli: nextMinimum,
        productUpdatedAt: now,
        stockValueMinor,
        stockStatus: deriveStockStatus(onHandMilli, nextMinimum),
        shortfallMilli: deriveShortfall(nextMinimum, onHandMilli),
        updatedAt: now,
      });
    }

    if (summarySnap.exists) {
      const onHandMilli = summarySnap.get('onHandMilli') as number;
      scope.update(summaryRef, {
        productName: nextName,
        internalSku: nextInternalSku,
        internalSkuNormalized: nextSkuNormalized,
        categoryId: nextCategoryId,
        baseUnitPriceMinor: nextCost,
        minimumStockMilli: nextMinimum,
        productUpdatedAt: now,
        stockStatus: deriveStockStatus(onHandMilli, nextMinimum),
        shortfallMilli: deriveShortfall(nextMinimum, onHandMilli),
        stockValueMinor: sumBalanceValues(newBalanceValues),
        updatedAt: now,
      });
    }

    writeAudit(scope, db, actor, {
      action: 'product.update',
      entityType: 'PRODUCT',
      entityId: productId,
      summary: `Updated product ${nextName}.`,
    });

    return { productId };
  },
});

/**
 * C-11 `product.setStatus` — `INVENTORY_WRITERS`, transactional, audited.
 *
 * `status` mirrors onto the summary and every balance (DB-02 §4.4/§4.5's
 * `productStatus` field), unguarded — DB-07 §3 lists no guard for either
 * direction, unlike category or warehouse archive.
 */
export const productSetStatus = defineCommand({
  id: 'C-11',
  authorization: { kind: 'MEMBER_ROLE', roles: ['OWNER', 'ADMIN', 'INVENTORY_MANAGER'] },
  handler: async ({ db, scope, membership, orgId, payload }) => {
    const actor = requireMembership(membership);
    const productId = payload.productId;
    const productRef = db.doc(paths.product(orgId, productId));
    const productSnap = await scope.get(productRef);
    requireTenantDocument(productSnap, actor, 'The product');

    const currentStatus = productSnap.get('status') as string;
    if (currentStatus === payload.status) {
      fail('INVALID_TRANSITION', `The product is already ${payload.status}.`);
    }

    const balancesQuery = db
      .collection(`${paths.organization(orgId)}/stockBalances`)
      .where('productId', '==', productId);
    const balancesSnap = await scope.query(balancesQuery, MAX_BALANCE_FANOUT);
    const summaryRef = db.doc(paths.productStockSummary(orgId, productId));
    const summarySnap = await scope.get(summaryRef);

    const now = serverTimestamp();
    scope.update(productRef, { status: payload.status, updatedAt: now, updatedBy: actor.uid });

    for (const balanceDoc of balancesSnap.docs) {
      scope.update(balanceDoc.ref, { productStatus: payload.status, updatedAt: now });
    }
    if (summarySnap.exists) {
      scope.update(summaryRef, { productStatus: payload.status, updatedAt: now });
    }

    writeAudit(scope, db, actor, {
      action: 'product.setStatus',
      entityType: 'PRODUCT',
      entityId: productId,
      summary: `Set product ${productSnap.get('name') as string} to ${payload.status}.`,
    });

    return { productId, status: payload.status };
  },
});
