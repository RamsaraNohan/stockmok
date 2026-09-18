import { paths } from '@stockmok/shared';
import { requireMembership } from './lib.js';
import { writeAudit } from '../core/audit.js';
import { defineCommand } from '../core/define-command.js';
import { fail } from '../core/errors.js';
import { serverTimestamp } from '../core/time.js';
import { requireTenantDocument } from '../guards/tenant.js';

/**
 * C-12 `warehouse.archive` — `INVENTORY_WRITERS`, transactional, audited.
 *
 * Three preconditions, all evaluated inside the transaction so concurrent
 * activity cannot slip past them (DB-07 §4): the warehouse is not the
 * default (`settings.defaultWarehouseId`), `Q-056` finds no positive balance
 * (`WAREHOUSE_HAS_STOCK`), and `Q-057` finds no open receiving PO
 * (`WAREHOUSE_HAS_OPEN_RECEIPT`). The default-warehouse guard has no named
 * reason in DB-06 §7, so it surfaces as `INVALID_TRANSITION` — the same
 * resolution `category.archive` uses for its unnamed guard.
 */
export const warehouseArchive = defineCommand({
  id: 'C-12',
  authorization: { kind: 'MEMBER_ROLE', roles: ['OWNER', 'ADMIN', 'INVENTORY_MANAGER'] },
  handler: async ({ db, scope, membership, orgId, payload }) => {
    const actor = requireMembership(membership);
    const warehouseId = payload.warehouseId;
    const warehouseRef = db.doc(paths.warehouse(orgId, warehouseId));
    const warehouseSnap = await scope.get(warehouseRef);
    requireTenantDocument(warehouseSnap, actor, 'The warehouse');

    if (warehouseSnap.get('status') !== 'ACTIVE') {
      fail('INVALID_TRANSITION', 'The warehouse is not ACTIVE.');
    }

    const settingsSnap = await scope.get(db.doc(paths.settings(orgId)));
    if (settingsSnap.exists && settingsSnap.get('defaultWarehouseId') === warehouseId) {
      fail('INVALID_TRANSITION', 'The default warehouse cannot be archived.');
    }

    const stockGuardQuery = db
      .collection(`${paths.organization(orgId)}/stockBalances`)
      .where('warehouseId', '==', warehouseId)
      .where('onHandMilli', '>', 0);
    const stockGuardSnap = await scope.query(stockGuardQuery, 1);
    if (!stockGuardSnap.empty) {
      fail('WAREHOUSE_HAS_STOCK', 'This warehouse still holds stock.');
    }

    const receiptGuardQuery = db
      .collection(`${paths.organization(orgId)}/purchaseOrders`)
      .where('status', 'in', ['ORDERED', 'PARTIALLY_RECEIVED', 'ACCEPTED', 'SHIPPED'])
      .where('receivingWarehouseId', '==', warehouseId);
    const receiptGuardSnap = await scope.query(receiptGuardQuery, 1);
    if (!receiptGuardSnap.empty) {
      fail('WAREHOUSE_HAS_OPEN_RECEIPT', 'This warehouse has an open receiving purchase order.');
    }

    scope.update(warehouseRef, {
      status: 'ARCHIVED',
      updatedAt: serverTimestamp(),
      updatedBy: actor.uid,
    });

    writeAudit(scope, db, actor, {
      action: 'warehouse.archive',
      entityType: 'WAREHOUSE',
      entityId: warehouseId,
      summary: `Archived warehouse ${warehouseSnap.get('name') as string}.`,
    });

    return { warehouseId };
  },
});

/**
 * C-36 `warehouse.setDefault` — `INVENTORY_WRITERS`, transactional, audited.
 *
 * The default warehouse has exactly one source of truth,
 * `settings.defaultWarehouseId` (DB-CR-013) — there is no `isDefault` field
 * on the warehouse document to keep in sync.
 */
export const warehouseSetDefault = defineCommand({
  id: 'C-36',
  authorization: { kind: 'MEMBER_ROLE', roles: ['OWNER', 'ADMIN', 'INVENTORY_MANAGER'] },
  handler: async ({ db, scope, membership, orgId, payload }) => {
    const actor = requireMembership(membership);
    const warehouseId = payload.warehouseId;
    const warehouseSnap = await scope.get(db.doc(paths.warehouse(orgId, warehouseId)));
    requireTenantDocument(warehouseSnap, actor, 'The warehouse');

    if (warehouseSnap.get('status') !== 'ACTIVE') {
      fail('WAREHOUSE_NOT_ACTIVE', 'The warehouse is not ACTIVE.');
    }

    scope.update(db.doc(paths.settings(orgId)), {
      defaultWarehouseId: warehouseId,
      updatedAt: serverTimestamp(),
      updatedBy: actor.uid,
    });

    writeAudit(scope, db, actor, {
      action: 'warehouse.setDefault',
      entityType: 'WAREHOUSE',
      entityId: warehouseId,
      summary: `Set ${warehouseSnap.get('name') as string} as the default warehouse.`,
    });

    return { warehouseId };
  },
});

/**
 * C-37 `warehouse.restore` — `INVENTORY_WRITERS`, transactional, audited.
 *
 * Mirrors `category.restore` exactly (DB-06 §8.9): always permitted from
 * `ARCHIVED`, no guard. A client may not change `status` in either direction
 * (DB-05 §4.9).
 */
export const warehouseRestore = defineCommand({
  id: 'C-37',
  authorization: { kind: 'MEMBER_ROLE', roles: ['OWNER', 'ADMIN', 'INVENTORY_MANAGER'] },
  handler: async ({ db, scope, membership, orgId, payload }) => {
    const actor = requireMembership(membership);
    const warehouseId = payload.warehouseId;
    const warehouseRef = db.doc(paths.warehouse(orgId, warehouseId));
    const warehouseSnap = await scope.get(warehouseRef);
    requireTenantDocument(warehouseSnap, actor, 'The warehouse');

    if (warehouseSnap.get('status') !== 'ARCHIVED') {
      fail('INVALID_TRANSITION', 'The warehouse is not ARCHIVED.');
    }

    scope.update(warehouseRef, {
      status: 'ACTIVE',
      updatedAt: serverTimestamp(),
      updatedBy: actor.uid,
    });

    writeAudit(scope, db, actor, {
      action: 'warehouse.restore',
      entityType: 'WAREHOUSE',
      entityId: warehouseId,
      summary: `Restored warehouse ${warehouseSnap.get('name') as string}.`,
    });

    return { warehouseId };
  },
});
