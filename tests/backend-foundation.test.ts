import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  commandDefinitions,
  type ActiveCommandId,
  type Role,
} from '../packages/shared/src/index.js';
import {
  assertAuditMetadata,
  assertAuditRequest,
  buildAuditRecord,
  type AuditRequest,
} from '../functions/src/core/audit.js';
import {
  COMMAND_ERROR_CODES,
  CommandFailure,
  REASON_CODE_MAP,
  codeForReason,
  fail,
  toCommandResult,
  untypedFailure,
  type CommandReason,
} from '../functions/src/core/errors.js';
import {
  computePayloadHash,
  isSafeResult,
  resolveReplay,
  type StoredCommandReceipt,
} from '../functions/src/core/idempotency.js';
import {
  NOTIFICATION_CATEGORY_BY_TYPE,
  NOTIFICATION_FANOUT_LIMIT,
  buildNotification,
  categoryForType,
  normalizeRecipients,
} from '../functions/src/core/notify.js';
import {
  CommandRegistry,
  commandRegistry,
  deploymentName,
} from '../functions/src/core/registry.js';
import { COMMAND_PLAN, idsForPhase } from '../functions/src/commands/coverage.js';
import { assertOperationId, isValidOperationId } from '../functions/src/guards/operation-id.js';
import { requireAuth, requireTrustedEmail } from '../functions/src/guards/auth.js';
import { requireRole } from '../functions/src/guards/role.js';
import {
  assertOwnerNotTargeted,
  assertRoleAssignable,
  isCanonicalOwner,
  requireCanonicalOwner,
} from '../functions/src/guards/owner.js';
import { assertActingFor, assertPathWithinTenant } from '../functions/src/guards/tenant.js';
import { ROLES, ROLE_GROUPS } from '../functions/src/guards/roles.js';
import type { TrustedMembership } from '../functions/src/guards/membership.js';

/**
 * B1 foundation tests that need no emulator: the derivations, the mappings and
 * the two-way agreement between `firestore.rules`, the backend permission table
 * and the frozen contracts. The emulator-backed half lives in `tests/rules/`
 * and `tests/backend/`.
 */

const RULES = readFileSync('firestore.rules', 'utf8');
const DB05 = readFileSync(
  'docs/database-final/DB_05_FINAL_DATABASE_SECURITY_AND_TENANT_MATRIX.md',
  'utf8',
);
const DB06 = readFileSync(
  'docs/database-final/DB_06_FINAL_COMMAND_TRANSACTION_CONTRACT.md',
  'utf8',
);

function membership(overrides: Partial<TrustedMembership> = {}): TrustedMembership {
  return {
    orgId: 'org-grand-ocean',
    uid: 'user-1',
    role: 'OWNER',
    status: 'ACTIVE',
    displayName: 'Nohan Fernando',
    email: 'owner@stockmok.test',
    ...overrides,
  };
}

function expectFailure(run: () => unknown, reason: CommandReason): void {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(CommandFailure);
    expect((error as CommandFailure).reason).toBe(reason);
    expect((error as CommandFailure).code).toBe(codeForReason(reason));
    return;
  }
  throw new Error(`expected a ${reason} failure`);
}

// ───────────────────────────────────────────────────────────────────────────
// T-SEC-17 — the role lists in firestore.rules equal the backend table, per role
// ───────────────────────────────────────────────────────────────────────────

function rulesRoleGroup(name: string): readonly string[] {
  const match = new RegExp(`function ROLE_${name}\\(\\) \\{\\s*return \\[([^\\]]*)\\];`, 's').exec(
    RULES,
  );
  if (!match?.[1]) throw new Error(`firestore.rules defines no ROLE_${name}()`);
  return match[1]
    .split(',')
    .map((entry) => entry.trim().replaceAll("'", ''))
    .filter((entry) => entry.length > 0);
}

function db05RoleGroup(name: string): readonly string[] {
  const block = DB05.slice(DB05.indexOf('## 0.2 Role constants'), DB05.indexOf('## 1. The path'));
  const match = new RegExp(`${name}\\s*=\\s*\\[([^\\]]*)\\]`, 's').exec(block);
  if (!match?.[1]) throw new Error(`DB-05 §0.2 defines no ${name}`);
  return match[1]
    .split(',')
    .map((entry) => entry.trim().replaceAll("'", '').replaceAll('\n', ''))
    .filter((entry) => entry.length > 0);
}

describe('T-SEC-17 · the role registry agrees across all three sources', () => {
  it('carries exactly the seven frozen roles, in order', () => {
    expect(ROLES).toEqual([
      'OWNER',
      'ADMIN',
      'INVENTORY_MANAGER',
      'PROCUREMENT_MANAGER',
      'STOREKEEPER',
      'ANALYST',
      'VIEWER',
    ]);
  });

  it.each([
    'ADMINS',
    'INVENTORY_WRITERS',
    'PARTNER_WRITERS',
    'PO_WRITERS',
    'RECEIVERS',
    'NOT_VIEWER',
  ])('%s is identical in DB-05 §0.2, firestore.rules and guards/roles.ts', (name) => {
    const authority = db05RoleGroup(name);
    const rules = rulesRoleGroup(name);
    const backend = ROLE_GROUPS[name as keyof typeof ROLE_GROUPS];
    expect(rules).toEqual(authority);
    expect([...backend]).toEqual(authority);
  });

  it('TRANSFER_WRITERS is INVENTORY_WRITERS — Storekeeper is excluded from transfer (A1)', () => {
    expect([...ROLE_GROUPS.TRANSFER_WRITERS]).toEqual([...ROLE_GROUPS.INVENTORY_WRITERS]);
    expect(rulesRoleGroup('TRANSFER_WRITERS')).toEqual([...ROLE_GROUPS.INVENTORY_WRITERS]);
    expect(ROLE_GROUPS.TRANSFER_WRITERS).not.toContain('STOREKEEPER');
    expect(ROLE_GROUPS.RECEIVERS).toContain('STOREKEEPER');
  });

  it('every role named anywhere in firestore.rules is one of the seven', () => {
    const named = new Set(
      [...RULES.matchAll(/'([A-Z][A-Z_]+)'/g)]
        .map((match) => match[1] ?? '')
        .filter((token) => (ROLES as readonly string[]).includes(token)),
    );
    for (const role of named) expect(ROLES).toContain(role as Role);
    // Nothing that merely looks like a role slipped in as an alias.
    const suspects = [...RULES.matchAll(/'([A-Z][A-Z_]{3,})'/g)].map((match) => match[1] ?? '');
    const knownNonRoles = new Set([
      'ACTIVE',
      'ARCHIVED',
      'PRIVATE',
      'DRAFT',
      'DEACTIVATED',
      'CONNECTED',
    ]);
    for (const token of suspects) {
      expect((ROLES as readonly string[]).includes(token) || knownNonRoles.has(token)).toBe(true);
    }
  });
});

describe('firestore.rules structural guarantees', () => {
  it('ends with the deny-all catch-all', () => {
    expect(RULES).toContain('match /{document=**}');
    expect(RULES.trimEnd().endsWith('}')).toBe(true);
  });

  it('DATA_DERIVED_RULE_READS = 0 — no get() or exists() reads a resource-derived path', () => {
    const accesses = [...RULES.matchAll(/\b(?:get|exists)\(([^)]*)\)/g)].map(
      (match) => match[1] ?? '',
    );
    expect(accesses.length).toBeGreaterThan(0);
    for (const argument of accesses) {
      expect(argument).not.toContain('resource.data');
    }
  });

  it('reads only the constant member path and the matched parent purchase order', () => {
    const helpers = [...RULES.matchAll(/\b(?:get|exists)\((\w+)\(/g)].map(
      (match) => match[1] ?? '',
    );
    expect(new Set(helpers)).toEqual(new Set(['memberPath', 'parentPurchaseOrder']));
  });

  it('grants no client write to any zone-4 collection', () => {
    for (const zone4 of ['handleReservations', 'connectedPurchaseOrders']) {
      const section = RULES.slice(RULES.indexOf(`match /${zone4}/`));
      expect(section.slice(0, 200)).toContain('allow read, write: if false;');
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Command catalog compatibility gate
// ───────────────────────────────────────────────────────────────────────────

describe('the active command catalog', () => {
  const catalog = DB06.slice(DB06.indexOf('## 1. Catalog'), DB06.indexOf('## 2. C-33'));
  const rows = catalog
    .split(/\r?\n/)
    .filter((line) => line.startsWith('|'))
    .map((line) => line.split('|').map((cell) => cell.replaceAll('*', '').trim()))
    .filter((cells) => /^C-\d{2}[ab]?$/.test(cells[1] ?? ''));

  const releaseC = rows
    .filter((cells) => (cells[4] ?? '').startsWith('C'))
    .map((cells) => cells[1]);
  const active = rows.map((cells) => cells[1]).filter((id) => !releaseC.includes(id));
  const shared = Object.keys(commandDefinitions);

  it('DB06_ACTIVE_COMMAND_IDS = 38', () => {
    expect(new Set(active).size).toBe(38);
  });

  it('SHARED_ACTIVE_COMMAND_IDS = 38 and the two sets match exactly', () => {
    expect(new Set(shared).size).toBe(38);
    expect([...active].sort()).toEqual([...shared].sort());
  });

  it('RELEASE_C_COMMANDS_INCLUDED = 0 — C-32 storefront.* is excluded', () => {
    expect(releaseC).toEqual(['C-32']);
    expect(active).not.toContain('C-32');
  });

  it('ACTIVE_COMMAND_IDS_INTERSECT_TOMBSTONES = 0 — C-35 no longer exists as an id', () => {
    for (const tombstone of ['C-32', 'C-35']) expect(active).not.toContain(tombstone);
    expect(active).toContain('C-35a');
    expect(active).toContain('C-35b');
  });

  it('IDEMPOTENT_COMMANDS = 17', () => {
    const idempotent = Object.values(commandDefinitions).filter(
      (definition) => definition.idempotent,
    );
    expect(idempotent).toHaveLength(17);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// The B1 command coverage map
// ───────────────────────────────────────────────────────────────────────────

describe('the B1 command coverage map', () => {
  const ids = Object.keys(commandDefinitions) as ActiveCommandId[];

  it('classifies every active command and nothing else', () => {
    expect(Object.keys(COMMAND_PLAN).sort()).toEqual([...ids].sort());
  });

  it('partitions the 38 across B2, B3 and B4', () => {
    expect(idsForPhase('B2')).toHaveLength(17);
    expect(idsForPhase('B3')).toHaveLength(6);
    expect(idsForPhase('B4')).toHaveLength(15);
    expect(idsForPhase('B2').length + idsForPhase('B3').length + idsForPhase('B4').length).toBe(38);
  });

  it('assigns the DB-06 §1 role group to every membership-scoped command', () => {
    const catalog = DB06.slice(DB06.indexOf('## 1. Catalog'), DB06.indexOf('## 2. C-33'));
    let previousCell = '';
    for (const id of ids) {
      const row = catalog
        .split(/\r?\n/)
        .find((line) => line.replaceAll('*', '').trim().startsWith(`| ${id} |`));
      expect(row, `DB-06 §1 has no row for ${id}`).toBeDefined();
      const roleCell =
        (row ?? '').split('|')[3]?.replaceAll('*', '').replaceAll('`', '').trim() ?? '';
      const plan = COMMAND_PLAN[id];

      // `C-24`'s catalog row reads "as above" — it inherits `C-23`'s gate.
      const cell = roleCell === 'as above' ? previousCell : roleCell;
      previousCell = cell;

      const group = (Object.keys(ROLE_GROUPS) as (keyof typeof ROLE_GROUPS)[]).find((name) =>
        cell.startsWith(name),
      );
      if (group) {
        expect(plan.authorization.kind, `${id} · ${cell}`).toBe('MEMBER_ROLE');
        if (plan.authorization.kind === 'MEMBER_ROLE') {
          expect([...plan.authorization.roles], `${id} · ${cell}`).toEqual([...ROLE_GROUPS[group]]);
        }
      } else {
        expect(plan.authorization.kind, `${id} · ${cell}`).not.toBe('MEMBER_ROLE');
      }
    }
  });

  it('reserves the three unscoped authorization shapes for exactly their commands', () => {
    expect(COMMAND_PLAN['C-01'].authorization.kind).toBe('AUTHENTICATED');
    expect(COMMAND_PLAN['C-03'].authorization.kind).toBe('SELF');
    expect(COMMAND_PLAN['C-06'].authorization.kind).toBe('INVITEE');
    const unscoped = (Object.keys(COMMAND_PLAN) as ActiveCommandId[]).filter(
      (id) => COMMAND_PLAN[id].authorization.kind !== 'MEMBER_ROLE',
    );
    expect(unscoped.sort()).toEqual(['C-01', 'C-03', 'C-06']);
  });

  it('B2+B3 register exactly their 23 commands when index.ts is imported, and nothing else yet', async () => {
    await import('../functions/src/index.js');
    expect(commandRegistry.size()).toBe(23);
    expect(commandRegistry.ids()).toEqual([...idsForPhase('B2'), ...idsForPhase('B3')].sort());
    expect(commandRegistry.missingIds()).toHaveLength(15);
    expect(commandRegistry.missingIds()).toEqual([...idsForPhase('B4')].sort());
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Auth context
// ───────────────────────────────────────────────────────────────────────────

describe('AUTH_CONTEXT', () => {
  it('derives the uid and the verified email from the token', () => {
    const context = requireAuth({
      auth: { uid: 'user-1', token: { email: 'Owner@Stockmok.test', email_verified: true } },
      data: {},
    });
    expect(context).toEqual({ uid: 'user-1', email: 'owner@stockmok.test', emailVerified: true });
  });

  it('rejects an unauthenticated call with unauthenticated / NOT_SIGNED_IN', () => {
    expectFailure(() => requireAuth({ data: {} }), 'NOT_SIGNED_IN');
    expectFailure(() => requireAuth({ auth: undefined, data: {} }), 'NOT_SIGNED_IN');
  });

  it('trusts no email the token did not carry', () => {
    const context = requireAuth({ auth: { uid: 'user-1' }, data: {} });
    expect(context.email).toBeUndefined();
    expect(context.emailVerified).toBe(false);
    expectFailure(() => requireTrustedEmail(context), 'INVITE_EMAIL_MISMATCH');
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Role, owner and tenant guards
// ───────────────────────────────────────────────────────────────────────────

describe('ROLE_GUARDS', () => {
  it.each(ROLES.map((role) => [role]))('TRANSFER_WRITERS · %s', (role) => {
    const caller = membership({ role });
    if ((ROLE_GROUPS.TRANSFER_WRITERS as readonly Role[]).includes(role)) {
      expect(requireRole(caller, ROLE_GROUPS.TRANSFER_WRITERS)).toBe(caller);
    } else {
      expectFailure(() => requireRole(caller, ROLE_GROUPS.TRANSFER_WRITERS), 'ROLE_NOT_PERMITTED');
    }
  });

  it('denies a permitted role whose membership is not ACTIVE', () => {
    expectFailure(
      () => requireRole(membership({ status: 'SUSPENDED' }), ROLE_GROUPS.ADMINS),
      'ROLE_NOT_PERMITTED',
    );
  });
});

describe('OWNER_GUARDS', () => {
  const ownerUid = 'user-owner';
  const owner = membership({ uid: ownerUid, role: 'OWNER' });
  const admin = membership({ uid: 'user-admin', role: 'ADMIN' });

  it('identifies the canonical Owner from the organization document, not the role field', () => {
    expect(isCanonicalOwner(owner, ownerUid)).toBe(true);
    expect(isCanonicalOwner(membership({ uid: 'impostor', role: 'OWNER' }), ownerUid)).toBe(false);
  });

  it('permits an owner-only operation only to the canonical Owner', () => {
    expect(requireCanonicalOwner(owner, ownerUid)).toBe(owner);
    expectFailure(() => requireCanonicalOwner(admin, ownerUid), 'ROLE_NOT_PERMITTED');
    expectFailure(
      () => requireCanonicalOwner(membership({ uid: 'impostor', role: 'OWNER' }), ownerUid),
      'ROLE_NOT_PERMITTED',
    );
  });

  it('protects the Owner from any membership mutation, including their own', () => {
    expectFailure(() => {
      assertOwnerNotTargeted(ownerUid, ownerUid);
    }, 'OWNER_PROTECTED');
    expect(() => {
      assertOwnerNotTargeted('user-admin', ownerUid);
    }).not.toThrow();
  });

  it('refuses to assign the OWNER role to a member', () => {
    expectFailure(() => {
      assertRoleAssignable('OWNER');
    }, 'OWNER_PROTECTED');
    expect(() => {
      assertRoleAssignable('ADMIN');
    }).not.toThrow();
  });
});

describe('TENANT_GUARDS', () => {
  const caller = membership({ orgId: 'org-a' });

  it('rejects a path outside the verified tenant', () => {
    expect(() => {
      assertPathWithinTenant('organizations/org-a/warehouses/wh-1', caller, 'Warehouse');
    }).not.toThrow();
    expectFailure(() => {
      assertPathWithinTenant('organizations/org-b/warehouses/wh-1', caller, 'Warehouse');
    }, 'CROSS_TENANT_REFERENCE');
    expectFailure(() => {
      assertPathWithinTenant('connectedPurchaseOrders/cpo-1', caller, 'Connected order');
    }, 'CROSS_TENANT_REFERENCE');
  });

  it('rejects acting for an organization the caller is not a member of', () => {
    expect(() => {
      assertActingFor(caller, 'org-a', 'buyer');
    }).not.toThrow();
    expectFailure(() => {
      assertActingFor(caller, 'org-b', 'supplier');
    }, 'CROSS_TENANT_REFERENCE');
  });
});

// ───────────────────────────────────────────────────────────────────────────
// operationId
// ───────────────────────────────────────────────────────────────────────────

describe('OPERATION_ID_VALIDATION', () => {
  const valid = '3f2b1c4e-5a6d-4b7c-8d9e-0f1a2b3c4d5e';

  it('accepts a UUID v4', () => {
    expect(isValidOperationId(valid)).toBe(true);
    expect(assertOperationId(valid)).toBe(valid);
  });

  it.each([
    ['empty', ''],
    ['not a uuid', 'operation-1'],
    ['uuid v1', 'c232ab00-9414-11ec-b3c8-9e6bdeced846'],
    ['path traversal', '../../etc/passwd'],
    ['embedded slash', '3f2b1c4e-5a6d-4b7c-8d9e-0f1a2b3c4d5e/child'],
    ['not a string', 42],
    ['null', null],
  ])('rejects %s', (_label, candidate) => {
    expect(isValidOperationId(candidate)).toBe(false);
    expectFailure(() => assertOperationId(candidate), 'SCHEMA_INVALID');
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Idempotency
// ───────────────────────────────────────────────────────────────────────────

describe('COMMAND_RECEIPT framework', () => {
  const stored: StoredCommandReceipt = {
    operationId: 'op-1',
    commandType: 'stock.transfer',
    actorUid: 'user-1',
    payloadHash: 'a'.repeat(64),
    resultStatus: 'OK',
    result: { transferId: 'tx-1', fromOnHandMilli: 12_000 },
  };
  const claim = {
    orgId: 'org-a',
    operationId: 'op-1',
    commandType: 'stock.transfer',
    actorUid: 'user-1',
    payloadHash: 'a'.repeat(64),
  };

  it('replays the stored result when the payload is identical', () => {
    expect(resolveReplay(stored, claim)).toEqual(stored.result);
  });

  it('rejects a replay carrying a different payload', () => {
    expectFailure(
      () => resolveReplay(stored, { ...claim, payloadHash: 'b'.repeat(64) }),
      'OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD',
    );
  });

  it('rejects an operation id reused by a different command', () => {
    expectFailure(
      () => resolveReplay(stored, { ...claim, commandType: 'stock.adjust' }),
      'OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD',
    );
  });

  it('hashes the canonical payload with operationId removed, so key order cannot alias', async () => {
    const left = await computePayloadHash({
      productId: 'p1',
      quantityMilli: 5_000,
      operationId: 'op-1',
    });
    const right = await computePayloadHash({
      quantityMilli: 5_000,
      productId: 'p1',
      operationId: 'op-2',
    });
    const different = await computePayloadHash({ productId: 'p1', quantityMilli: 6_000 });
    expect(left).toBe(right);
    expect(left).not.toBe(different);
    expect(left).toMatch(/^[a-f0-9]{64}$/);
  });

  it('stores safe scalars only', () => {
    expect(isSafeResult({ a: 'x', b: 1, c: true, d: null })).toBe(true);
    expect(isSafeResult({ nested: { a: 1 } })).toBe(false);
    expect(isSafeResult({ list: [1, 2] })).toBe(false);
    expect(isSafeResult({ float: 1.5 })).toBe(false);
    expect(isSafeResult(null)).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Audit
// ───────────────────────────────────────────────────────────────────────────

describe('AUDIT_FOUNDATION', () => {
  const request: AuditRequest = {
    action: 'stock.transfer',
    entityType: 'STOCK_MOVEMENT',
    entityId: 'mv-1',
    operationId: 'op-1',
    summary: 'Transferred 50.000 KG of Basmati Rice from Main Store to Cold Room',
    metadata: { quantityMilli: 50_000, unit: 'KG' },
  };

  it('derives actor, role and organization from the verified membership', () => {
    const record = buildAuditRecord(membership({ role: 'INVENTORY_MANAGER' }), 'audit-1', request);
    expect(record.actorUid).toBe('user-1');
    expect(record.actorName).toBe('Nohan Fernando');
    expect(record.actorRole).toBe('INVENTORY_MANAGER');
    expect(record.organizationId).toBe('org-grand-ocean');
  });

  it.each(['actorUid', 'actorName', 'actorRole', 'organizationId', 'createdAt', 'auditId'])(
    'refuses a client-supplied %s',
    (key) => {
      expectFailure(() => {
        assertAuditRequest({ ...request, [key]: 'forged' });
      }, 'SCHEMA_INVALID');
    },
  );

  it('accepts every active command name as an action', () => {
    for (const definition of Object.values(commandDefinitions)) {
      expect(() => {
        assertAuditRequest({ ...request, action: definition.name });
      }).not.toThrow();
    }
  });

  it('requires an action that names an active command, a one-segment entity id and a short summary', () => {
    expectFailure(() => {
      assertAuditRequest({ ...request, action: 'StockTransfer' });
    }, 'SCHEMA_INVALID');
    expectFailure(() => {
      assertAuditRequest({ ...request, action: 'stock.invented' });
    }, 'SCHEMA_INVALID');
    expectFailure(() => {
      assertAuditRequest({ ...request, entityId: 'a/b' });
    }, 'SCHEMA_INVALID');
    expectFailure(() => {
      assertAuditRequest({ ...request, summary: '' });
    }, 'SCHEMA_INVALID');
  });

  it('accepts safe scalars in metadata and nothing else', () => {
    expect(assertAuditMetadata({ a: 'x', b: 1, c: true, d: null })).toBeDefined();
    expectFailure(() => assertAuditMetadata({ document: { id: 'x' } } as never), 'SCHEMA_INVALID');
    expectFailure(() => assertAuditMetadata({ list: [1] } as never), 'SCHEMA_INVALID');
  });

  it('omits operationId rather than writing undefined when a command has none', () => {
    const record = buildAuditRecord(membership(), 'audit-2', {
      action: 'team.revokeInvitation',
      entityType: 'INVITATION',
      entityId: 'inv-1',
      summary: 'Revoked an invitation.',
    });
    expect('operationId' in record).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Notifications
// ───────────────────────────────────────────────────────────────────────────

describe('NOTIFICATION_FOUNDATION', () => {
  it('maps all ten frozen types onto the three frozen tabs (A3R-14)', () => {
    expect(Object.keys(NOTIFICATION_CATEGORY_BY_TYPE)).toHaveLength(10);
    expect(categoryForType('LOW_STOCK')).toBe('STOCK');
    expect(categoryForType('CPO_SHIPPED')).toBe('ORDERS');
    // The gap A3R-14 closed: with no fourth tab, MEMBERSHIP_CHANGED sits under NETWORK.
    expect(categoryForType('MEMBERSHIP_CHANGED')).toBe('NETWORK');
    expect(new Set(Object.values(NOTIFICATION_CATEGORY_BY_TYPE))).toEqual(
      new Set(['STOCK', 'ORDERS', 'NETWORK']),
    );
  });

  it('derives category and pins read to false, so neither can be supplied', () => {
    const record = buildNotification({
      recipients: ['user-1'],
      orgId: 'org-a',
      organizationName: 'Grand Ocean Hotel',
      type: 'PO_RECEIVED',
      title: 'Order received',
      message: 'PO-2026-001 was fully received.',
      referenceType: 'PURCHASE_ORDER',
      referenceId: 'po-1',
    });
    expect(record.category).toBe('ORDERS');
    expect(record.read).toBe(false);
    expect(record.organizationId).toBe('org-a');
  });

  it('validates every recipient uid and collapses duplicates', () => {
    expect(normalizeRecipients(['a', 'b', 'a'])).toEqual(['a', 'b']);
    expectFailure(() => normalizeRecipients(['a', 'b/c']), 'SCHEMA_INVALID');
    expectFailure(() => normalizeRecipients(['']), 'SCHEMA_INVALID');
  });

  it('bounds the fan-out at 50 (Q-059)', () => {
    expect(NOTIFICATION_FANOUT_LIMIT).toBe(50);
  });

  it('rejects an unknown type or reference type', () => {
    const base = {
      recipients: ['user-1'],
      orgId: 'org-a',
      organizationName: 'Grand Ocean Hotel',
      title: 'Title',
      message: 'Message',
      referenceType: 'PRODUCT',
      referenceId: 'p-1',
    } as const;
    expectFailure(
      () => buildNotification({ ...base, type: 'INVENTED_TYPE' } as never),
      'SCHEMA_INVALID',
    );
    expectFailure(
      () => buildNotification({ ...base, type: 'LOW_STOCK', referenceType: 'INVENTED' } as never),
      'SCHEMA_INVALID',
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────
// The typed error model
// ───────────────────────────────────────────────────────────────────────────

describe('the typed error model — DB-06 §7', () => {
  const table = DB06.slice(DB06.indexOf('## 7. Typed error model'), DB06.indexOf('## 8. Cost'));

  it('defines exactly the reason codes DB-06 §7 lists, and no others', () => {
    const declared = new Set(
      [...table.matchAll(/`([A-Z][A-Z0-9_]+)`/g)].map((match) => match[1] ?? ''),
    );
    for (const reason of Object.keys(REASON_CODE_MAP)) {
      expect(declared.has(reason), `${reason} is not in DB-06 §7`).toBe(true);
    }
    expect(Object.keys(REASON_CODE_MAP)).toHaveLength(declared.size);
  });

  it('maps every reason to the code its DB-06 §7 row names', () => {
    for (const [reason, code] of Object.entries(REASON_CODE_MAP)) {
      const row = table.split(/\r?\n/).find((line) => line.startsWith(`| \`${code}\` |`)) ?? '';
      expect(row, `DB-06 §7 has no row for ${code}`).not.toBe('');
      expect(row, `${reason} is not listed under ${code}`).toContain(reason);
    }
  });

  it('uses only the nine frozen HttpsError codes', () => {
    expect(new Set(Object.values(REASON_CODE_MAP)).size).toBeLessThanOrEqual(
      COMMAND_ERROR_CODES.length,
    );
    for (const code of Object.values(REASON_CODE_MAP)) {
      expect(COMMAND_ERROR_CODES).toContain(code);
    }
  });

  it('surfaces the reason in details and never leaks an unexpected error', () => {
    let failure: unknown;
    try {
      fail('INSUFFICIENT_STOCK', 'Not enough stock in the source store room.');
    } catch (error) {
      failure = error;
    }
    const result = toCommandResult(failure);
    expect(result).toEqual({
      ok: false,
      code: 'failed-precondition',
      message: 'Not enough stock in the source store room.',
      details: { reason: 'INSUFFICIENT_STOCK' },
    });

    const leaked = toCommandResult(new Error('Firestore: PERMISSION_DENIED on projects/stockmok'));
    expect(leaked.code).toBe('internal');
    expect(leaked.message).not.toContain('stockmok');
  });

  it('raises aborted and internal without inventing a reason code', () => {
    for (const code of ['aborted', 'internal'] as const) {
      try {
        untypedFailure(code, 'Transaction contention.');
      } catch (error) {
        expect((error as CommandFailure).code).toBe(code);
        expect((error as CommandFailure).reason).toBeUndefined();
      }
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
// The registry
// ───────────────────────────────────────────────────────────────────────────

describe('the command registry', () => {
  const handler = (id: ActiveCommandId, name: string, idempotent: boolean) => ({
    id,
    name,
    idempotent,
    authorization: { kind: 'AUTHENTICATED' } as const,
    execute: () => Promise.resolve({ ok: true as const, data: {} }),
  });

  it('accepts a handler that matches the frozen catalog', () => {
    const registry = new CommandRegistry();
    expect(() => registry.register(handler('C-33', 'stock.transfer', true))).not.toThrow();
    expect(registry.ids()).toEqual(['C-33']);
    expect(registry.missingIds()).toHaveLength(37);
  });

  it('refuses a duplicate id', () => {
    const registry = new CommandRegistry();
    registry.register(handler('C-33', 'stock.transfer', true));
    expect(() => registry.register(handler('C-33', 'stock.transfer', true))).toThrow(
      /already registered/,
    );
  });

  it('refuses a name or idempotency flag that disagrees with the catalog', () => {
    const registry = new CommandRegistry();
    expect(() => registry.register(handler('C-33', 'stock.move', true))).toThrow(
      /catalog names it/,
    );
    expect(() => registry.register(handler('C-33', 'stock.transfer', false))).toThrow(
      /idempotency flag/,
    );
  });

  it('refuses an id that is not in the active catalog', () => {
    const registry = new CommandRegistry();
    expect(() =>
      registry.register(handler('C-32' as ActiveCommandId, 'storefront.publish', false)),
    ).toThrow(/not an active command id/);
    expect(() =>
      registry.register(handler('C-35' as ActiveCommandId, 'category.archive', false)),
    ).toThrow(/not an active command id/);
  });

  it('maps dot-case catalog names to camelCase deployment names', () => {
    expect(deploymentName('stock.transfer')).toBe('stockTransfer');
    expect(deploymentName('partnerCatalog.lookupBySku')).toBe('partnerCatalogLookupBySku');
    expect(deploymentName('org.create')).toBe('orgCreate');
  });
});
