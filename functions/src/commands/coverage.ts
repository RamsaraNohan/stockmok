import { commandDefinitions, type ActiveCommandId, type Role } from '@stockmok/shared';
import type { CommandAuthorization } from '../core/define-command.js';
import {
  ADMINS,
  INVENTORY_WRITERS,
  PARTNER_WRITERS,
  PO_WRITERS,
  RECEIVERS,
  TRANSFER_WRITERS,
} from '../guards/roles.js';

/**
 * The B1 command coverage map.
 *
 * B1 implements **no** command body. This file records, for each of the 38
 * active Release-A/B callables, the authorization shape the frame will apply and
 * the phase that owns the body — so the next phase inherits a checked plan
 * instead of rediscovering DB-05 §7.1 command by command.
 *
 * Authority: DB-06 §1 (catalog and role column) and DB-05 §7.1 (command → role
 * gate). Where they are both explicit they agree; DB-06 wins on any
 * disagreement.
 *
 * Phases:
 *   B2 — organization, team, master data (products, categories, warehouses,
 *        private partners)
 *   B3 — inventory, transfer and private procurement
 *   B4 — connected B-Lite, mappings, canonical seed
 */

export type CommandPhase = 'B2' | 'B3' | 'B4';

export interface CommandPlan {
  readonly phase: CommandPhase;
  readonly authorization: CommandAuthorization;
}

const memberRole = (roles: readonly Role[]): CommandAuthorization => ({
  kind: 'MEMBER_ROLE',
  roles,
});

const AUTHENTICATED: CommandAuthorization = { kind: 'AUTHENTICATED' };
const SELF: CommandAuthorization = { kind: 'SELF' };
const INVITEE: CommandAuthorization = { kind: 'INVITEE' };

export const COMMAND_PLAN = {
  // ── B2 · organization, team, master data ────────────────────────────────
  'C-01': { phase: 'B2', authorization: AUTHENTICATED },
  'C-02': { phase: 'B2', authorization: memberRole(ADMINS) },
  'C-03': { phase: 'B2', authorization: SELF },
  'C-04': { phase: 'B2', authorization: memberRole(ADMINS) },
  'C-05': { phase: 'B2', authorization: memberRole(ADMINS) },
  'C-06': { phase: 'B2', authorization: INVITEE },
  'C-07': { phase: 'B2', authorization: memberRole(ADMINS) },
  'C-08': { phase: 'B2', authorization: memberRole(ADMINS) },
  'C-09': { phase: 'B2', authorization: memberRole(INVENTORY_WRITERS) },
  'C-10': { phase: 'B2', authorization: memberRole(INVENTORY_WRITERS) },
  'C-11': { phase: 'B2', authorization: memberRole(INVENTORY_WRITERS) },
  'C-12': { phase: 'B2', authorization: memberRole(INVENTORY_WRITERS) },
  'C-35a': { phase: 'B2', authorization: memberRole(INVENTORY_WRITERS) },
  'C-35b': { phase: 'B2', authorization: memberRole(INVENTORY_WRITERS) },
  'C-36': { phase: 'B2', authorization: memberRole(INVENTORY_WRITERS) },
  'C-37': { phase: 'B2', authorization: memberRole(INVENTORY_WRITERS) },
  'C-38': { phase: 'B2', authorization: memberRole(PARTNER_WRITERS) },

  // ── B3 · inventory, transfer, private procurement ───────────────────────
  'C-13': { phase: 'B3', authorization: memberRole(INVENTORY_WRITERS) },
  'C-14': { phase: 'B3', authorization: memberRole(INVENTORY_WRITERS) },
  'C-33': { phase: 'B3', authorization: memberRole(TRANSFER_WRITERS) },
  'C-15': { phase: 'B3', authorization: memberRole(PO_WRITERS) },
  'C-16': { phase: 'B3', authorization: memberRole(PO_WRITERS) },
  'C-17': { phase: 'B3', authorization: memberRole(RECEIVERS) },

  // ── B4 · connected B-Lite, mappings, canonical seed ─────────────────────
  'C-18': { phase: 'B4', authorization: memberRole(PARTNER_WRITERS) },
  'C-19': { phase: 'B4', authorization: memberRole(PARTNER_WRITERS) },
  'C-20': { phase: 'B4', authorization: memberRole(ADMINS) },
  'C-21': { phase: 'B4', authorization: memberRole(PARTNER_WRITERS) },
  'C-22': { phase: 'B4', authorization: memberRole(PARTNER_WRITERS) },
  'C-23': { phase: 'B4', authorization: memberRole(PARTNER_WRITERS) },
  'C-24': { phase: 'B4', authorization: memberRole(PARTNER_WRITERS) },
  'C-25': { phase: 'B4', authorization: memberRole(PARTNER_WRITERS) },
  'C-26': { phase: 'B4', authorization: memberRole(PARTNER_WRITERS) },
  'C-27': { phase: 'B4', authorization: memberRole(PO_WRITERS) },
  'C-28': { phase: 'B4', authorization: memberRole(PO_WRITERS) },
  'C-29': { phase: 'B4', authorization: memberRole(PO_WRITERS) },
  'C-30': { phase: 'B4', authorization: memberRole(RECEIVERS) },
  'C-31': { phase: 'B4', authorization: memberRole(PO_WRITERS) },
  'C-34': { phase: 'B4', authorization: memberRole(PO_WRITERS) },
} as const satisfies Record<ActiveCommandId, CommandPlan>;

export const COMMAND_IDS = Object.keys(commandDefinitions) as readonly ActiveCommandId[];

export function idsForPhase(phase: CommandPhase): readonly ActiveCommandId[] {
  return COMMAND_IDS.filter((id) => COMMAND_PLAN[id].phase === phase).sort();
}
