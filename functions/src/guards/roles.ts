import { RoleSchema, type Role } from '@stockmok/shared';

/**
 * The role registry and the role groups — DB-05 §0.2, verbatim.
 *
 * Firestore Rules cannot import TypeScript, so `firestore.rules` duplicates
 * these lists. `T-SEC-17` asserts the two agree for every role, and that test
 * is the mitigation, not a nicety.
 *
 * Seven roles. No role may be added, removed, merged or aliased.
 */

export const ROLES = RoleSchema.options;

export const OWNER: Role = 'OWNER';

export const ADMINS = ['OWNER', 'ADMIN'] as const satisfies readonly Role[];

export const INVENTORY_WRITERS = [
  'OWNER',
  'ADMIN',
  'INVENTORY_MANAGER',
] as const satisfies readonly Role[];

export const PARTNER_WRITERS = [
  'OWNER',
  'ADMIN',
  'PROCUREMENT_MANAGER',
] as const satisfies readonly Role[];

export const PO_WRITERS = [
  'OWNER',
  'ADMIN',
  'PROCUREMENT_MANAGER',
] as const satisfies readonly Role[];

export const RECEIVERS = [
  'OWNER',
  'ADMIN',
  'INVENTORY_MANAGER',
  'PROCUREMENT_MANAGER',
  'STOREKEEPER',
] as const satisfies readonly Role[];

/** A1 — Storekeeper is excluded from transfer and included in adjust/receive. */
export const TRANSFER_WRITERS = INVENTORY_WRITERS;

/** A2 · DB-CR-015. */
export const NOT_VIEWER = [
  'OWNER',
  'ADMIN',
  'INVENTORY_MANAGER',
  'PROCUREMENT_MANAGER',
  'STOREKEEPER',
  'ANALYST',
] as const satisfies readonly Role[];

export const ROLE_GROUPS = {
  ADMINS,
  INVENTORY_WRITERS,
  PARTNER_WRITERS,
  PO_WRITERS,
  RECEIVERS,
  TRANSFER_WRITERS,
  NOT_VIEWER,
} as const;

export type RoleGroupName = keyof typeof ROLE_GROUPS;

export function isRole(value: unknown): value is Role {
  return RoleSchema.safeParse(value).success;
}

export function includesRole(group: readonly Role[], role: Role): boolean {
  return group.includes(role);
}
