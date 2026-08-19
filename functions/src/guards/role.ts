import type { Role } from '@stockmok/shared';
import { fail } from '../core/errors.js';
import type { TrustedMembership } from './membership.js';

/**
 * Step 5 of DB-05 §7 — ROLE.
 *
 * The role checked is the one **on the membership document**, never
 * `request.data.role`. A command that skips this step because "the rules already
 * check it" is a security defect: the rules do not run for the Admin SDK.
 */

export function hasRole(membership: TrustedMembership, allowed: readonly Role[]): boolean {
  return membership.status === 'ACTIVE' && allowed.includes(membership.role);
}

export function requireRole(
  membership: TrustedMembership,
  allowed: readonly Role[],
): TrustedMembership {
  if (!hasRole(membership, allowed)) {
    fail('ROLE_NOT_PERMITTED', 'Your role does not permit this action.');
  }
  return membership;
}
