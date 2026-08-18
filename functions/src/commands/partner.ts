import { paths } from '@stockmok/shared';
import { OPEN_PRIVATE_PO_STATUSES, requireMembership } from './lib.js';
import { writeAudit } from '../core/audit.js';
import { defineCommand } from '../core/define-command.js';
import { fail } from '../core/errors.js';
import { serverTimestamp } from '../core/time.js';
import { requireTenantDocument } from '../guards/tenant.js';

/**
 * C-38 `partner.setStatus` — `PARTNER_WRITERS`, transactional, audited.
 *
 * Archive/restore a private partner. `status` is deliberately excluded from
 * the client-write allowlist on `privatePartners` (A3R-11) — a guard the
 * client evaluates is not a guard. Deactivating runs `Q-080`
 * (`purchaseOrders where privateSupplierId == P and status in [open]`,
 * `limit(1)`, index `IDX-26`) **inside** this transaction; a hit fails the
 * transition, which DB-07's `Transition = { …, guard? }` model makes
 * `INVALID_TRANSITION` — DB-06 §2's own wording ("refuses with
 * failed-precondition") names no more specific reason.
 */
export const partnerSetStatus = defineCommand({
  id: 'C-38',
  authorization: { kind: 'MEMBER_ROLE', roles: ['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER'] },
  handler: async ({ db, scope, membership, orgId, payload }) => {
    const actor = requireMembership(membership);
    const partnerRef = db.doc(paths.privatePartner(orgId, payload.partnerId));
    const partnerSnap = await scope.get(partnerRef);
    requireTenantDocument(partnerSnap, actor, 'The private partner');
    const currentStatus = partnerSnap.get('status') as string;

    if (payload.status === 'DEACTIVATED') {
      if (currentStatus !== 'ACTIVE') {
        fail('INVALID_TRANSITION', 'The partner is not ACTIVE.');
      }
      const guardQuery = db
        .collection(`${paths.organization(orgId)}/purchaseOrders`)
        .where('privateSupplierId', '==', payload.partnerId)
        .where('status', 'in', [...OPEN_PRIVATE_PO_STATUSES]);
      const guardSnap = await scope.query(guardQuery, 1);
      if (!guardSnap.empty) {
        fail('INVALID_TRANSITION', 'This partner has an open purchase order.');
      }
    } else if (currentStatus !== 'DEACTIVATED') {
      fail('INVALID_TRANSITION', 'The partner is not DEACTIVATED.');
    }

    scope.update(partnerRef, {
      status: payload.status,
      updatedAt: serverTimestamp(),
      updatedBy: actor.uid,
    });

    writeAudit(scope, db, actor, {
      action: 'partner.setStatus',
      entityType: 'PRIVATE_PARTNER',
      entityId: payload.partnerId,
      summary: `Set partner ${partnerSnap.get('name') as string} to ${payload.status}.`,
    });

    return { partnerId: payload.partnerId, status: payload.status };
  },
});
