import { paths } from '@stockmok/shared';
import { requireMembership } from './lib.js';
import { writeAudit } from '../core/audit.js';
import { defineCommand } from '../core/define-command.js';
import { fail } from '../core/errors.js';
import { serverTimestamp } from '../core/time.js';
import { requireTenantDocument } from '../guards/tenant.js';

/**
 * C-35a `category.archive` — `INVENTORY_WRITERS`, transactional, audited.
 *
 * Guarded by `Q-072` (`products where categoryId == C and status == 'ACTIVE'`,
 * `limit(1)`, index `IDX-38`) run **inside** the transaction, so a product
 * assigned concurrently cannot slip past it (DB-CR-012). A rule cannot
 * express this — an unbounded query — which is why archive is command-only.
 * The guard is a failed transition per DB-07's own model
 * (`Transition = { from, action, to, actor, guard? }`), so a guard miss
 * surfaces as `INVALID_TRANSITION`; DB-06 §7 names no more specific reason.
 */
export const categoryArchive = defineCommand({
  id: 'C-35a',
  authorization: { kind: 'MEMBER_ROLE', roles: ['OWNER', 'ADMIN', 'INVENTORY_MANAGER'] },
  handler: async ({ db, scope, membership, orgId, payload }) => {
    const actor = requireMembership(membership);
    const categoryId = payload.categoryId;
    const categoryRef = db.doc(paths.category(orgId, categoryId));
    const categorySnap = await scope.get(categoryRef);
    requireTenantDocument(categorySnap, actor, 'The category');

    if (categorySnap.get('status') !== 'ACTIVE') {
      fail('INVALID_TRANSITION', 'The category is not ACTIVE.');
    }

    const guardQuery = db
      .collection(`${paths.organization(orgId)}/products`)
      .where('categoryId', '==', categoryId)
      .where('status', '==', 'ACTIVE');
    const guardSnap = await scope.query(guardQuery, 1);
    if (!guardSnap.empty) {
      fail('INVALID_TRANSITION', 'This category still has an ACTIVE product referencing it.');
    }

    scope.update(categoryRef, {
      status: 'ARCHIVED',
      updatedAt: serverTimestamp(),
      updatedBy: actor.uid,
    });

    writeAudit(scope, db, actor, {
      action: 'category.archive',
      entityType: 'CATEGORY',
      entityId: categoryId,
      summary: `Archived category ${categorySnap.get('name') as string}.`,
    });

    return { categoryId };
  },
});

/**
 * C-35b `category.restore` — `INVENTORY_WRITERS`, transactional, audited.
 *
 * Always permitted from `ARCHIVED` (DB-07 §3) — no guard, unlike archive.
 */
export const categoryRestore = defineCommand({
  id: 'C-35b',
  authorization: { kind: 'MEMBER_ROLE', roles: ['OWNER', 'ADMIN', 'INVENTORY_MANAGER'] },
  handler: async ({ db, scope, membership, orgId, payload }) => {
    const actor = requireMembership(membership);
    const categoryId = payload.categoryId;
    const categoryRef = db.doc(paths.category(orgId, categoryId));
    const categorySnap = await scope.get(categoryRef);
    requireTenantDocument(categorySnap, actor, 'The category');

    if (categorySnap.get('status') !== 'ARCHIVED') {
      fail('INVALID_TRANSITION', 'The category is not ARCHIVED.');
    }

    scope.update(categoryRef, {
      status: 'ACTIVE',
      updatedAt: serverTimestamp(),
      updatedBy: actor.uid,
    });

    writeAudit(scope, db, actor, {
      action: 'category.restore',
      entityType: 'CATEGORY',
      entityId: categoryId,
      summary: `Restored category ${categorySnap.get('name') as string}.`,
    });

    return { categoryId };
  },
});
