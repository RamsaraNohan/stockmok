import type { Firestore } from 'firebase-admin/firestore';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { paths } from '../../packages/shared/src/paths.js';
import type { CommandResult } from '../../packages/shared/src/index.js';
import { defineCommand } from '../../functions/src/core/define-command.js';
import { receiptRef } from '../../functions/src/core/idempotency.js';
import { ROLE_GROUPS } from '../../functions/src/guards/roles.js';
import {
  callable,
  clearFirestore,
  ORG_A,
  ORG_B,
  OPERATION_ID_A,
  OPERATION_ID_B,
  seedMember,
  seedOrganization,
  testDb,
  uidFor,
} from './harness.js';

/**
 * `defineCommand()` — the frame, end to end, against the emulator.
 *
 * The probes below are **frame probes**, not command bodies. They borrow the
 * ids `C-04` and `C-15` so the real payload schema and the real role gate are
 * exercised, and their handlers write nothing: they count invocations and
 * return a scalar. B2 and B3 own those commands' semantics, and this file
 * deliberately proves none of them.
 */

let db: Firestore;
let invocations = 0;

const invitationPayload = { email: 'invitee@stockmok.test', role: 'VIEWER' };
const SUSPENDED_ADMIN = 'suspended-admin';

/** `C-04` — idempotent, ADMINS. */
const idempotentProbe = defineCommand({
  id: 'C-04',
  authorization: { kind: 'MEMBER_ROLE', roles: ROLE_GROUPS.ADMINS },
  handler: () => {
    invocations += 1;
    return Promise.resolve({ invocations });
  },
});

/** `C-05` — non-idempotent, ADMINS. */
const nonIdempotentProbe = defineCommand({
  id: 'C-05',
  authorization: { kind: 'MEMBER_ROLE', roles: ROLE_GROUPS.ADMINS },
  handler: () => {
    invocations += 1;
    return Promise.resolve({ invocations });
  },
});

/** `C-15` — idempotent, PO_WRITERS. Used only to reuse an operation id. */
const otherIdempotentProbe = defineCommand({
  id: 'C-15',
  authorization: { kind: 'MEMBER_ROLE', roles: ROLE_GROUPS.PO_WRITERS },
  handler: () => {
    invocations += 1;
    return Promise.resolve({ invocations });
  },
});

/** A probe whose body fails after the receipt read, to prove atomicity. */
const failingProbe = defineCommand({
  id: 'C-04',
  authorization: { kind: 'MEMBER_ROLE', roles: ROLE_GROUPS.ADMINS },
  handler: () => {
    invocations += 1;
    return Promise.reject(new Error('the body exploded'));
  },
});

function failure(result: CommandResult): { code: string; reason: unknown } {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('expected a failure');
  return {
    code: result.code,
    reason: (result.details as { reason?: unknown } | undefined)?.reason,
  };
}

beforeAll(async () => {
  db = testDb();
  await clearFirestore();
  await seedOrganization(db, ORG_A);
  await seedOrganization(db, ORG_B);
  for (const role of [
    'OWNER',
    'ADMIN',
    'INVENTORY_MANAGER',
    'PROCUREMENT_MANAGER',
    'STOREKEEPER',
    'ANALYST',
    'VIEWER',
  ] as const) {
    await seedMember(db, ORG_A, role);
  }
  await seedMember(db, ORG_B, 'ADMIN');
  // A suspended member who nevertheless holds a permitted role.
  await db.doc(paths.member(ORG_A, SUSPENDED_ADMIN)).set({
    uid: SUSPENDED_ADMIN,
    role: 'ADMIN',
    status: 'SUSPENDED',
    displayName: 'Suspended Admin',
    email: `${SUSPENDED_ADMIN}@stockmok.test`,
  });
});

beforeEach(() => {
  invocations = 0;
});

const admin = uidFor(ORG_A, 'ADMIN');

describe('the frame denies before the body runs', () => {
  it('rejects an unauthenticated call', async () => {
    const result = await idempotentProbe.execute(
      { data: { orgId: ORG_A, operationId: OPERATION_ID_A, payload: invitationPayload } },
      db,
    );
    expect(failure(result)).toEqual({ code: 'unauthenticated', reason: 'NOT_SIGNED_IN' });
    expect(invocations).toBe(0);
  });

  it('rejects an envelope with no operationId on an idempotent command', async () => {
    const result = await idempotentProbe.execute(
      callable(admin, { orgId: ORG_A, payload: invitationPayload }),
      db,
    );
    expect(failure(result).code).toBe('invalid-argument');
    expect(invocations).toBe(0);
  });

  it('rejects a malformed operationId', async () => {
    const result = await idempotentProbe.execute(
      callable(admin, { orgId: ORG_A, operationId: 'not-a-uuid', payload: invitationPayload }),
      db,
    );
    expect(failure(result)).toEqual({ code: 'invalid-argument', reason: 'SCHEMA_INVALID' });
    expect(invocations).toBe(0);
  });

  it('rejects an orgId that is not one path segment', async () => {
    const result = await idempotentProbe.execute(
      callable(admin, {
        orgId: 'org-a/../org-b',
        operationId: OPERATION_ID_A,
        payload: invitationPayload,
      }),
      db,
    );
    expect(failure(result).code).toBe('invalid-argument');
    expect(invocations).toBe(0);
  });

  it('rejects a payload the frozen schema refuses', async () => {
    const result = await idempotentProbe.execute(
      callable(admin, {
        orgId: ORG_A,
        operationId: OPERATION_ID_A,
        payload: { email: 'invitee@stockmok.test', role: 'OWNER' },
      }),
      db,
    );
    expect(failure(result)).toEqual({ code: 'invalid-argument', reason: 'SCHEMA_INVALID' });
    expect(invocations).toBe(0);
  });

  it('rejects an unknown extra key, so a caller cannot smuggle a claim', async () => {
    const result = await idempotentProbe.execute(
      callable(admin, {
        orgId: ORG_A,
        operationId: OPERATION_ID_A,
        payload: { ...invitationPayload, actorUid: 'someone-else' },
      }),
      db,
    );
    expect(failure(result).code).toBe('invalid-argument');
    expect(invocations).toBe(0);
  });

  it('rejects an authenticated non-member', async () => {
    const result = await idempotentProbe.execute(
      callable('authenticated-non-member', {
        orgId: ORG_A,
        operationId: OPERATION_ID_A,
        payload: invitationPayload,
      }),
      db,
    );
    expect(failure(result)).toEqual({ code: 'permission-denied', reason: 'NOT_A_MEMBER' });
    expect(invocations).toBe(0);
  });

  it('rejects a suspended member holding a permitted role', async () => {
    const result = await idempotentProbe.execute(
      callable(SUSPENDED_ADMIN, {
        orgId: ORG_A,
        operationId: OPERATION_ID_A,
        payload: invitationPayload,
      }),
      db,
    );
    expect(failure(result)).toEqual({
      code: 'permission-denied',
      reason: 'MEMBERSHIP_NOT_ACTIVE',
    });
    expect(invocations).toBe(0);
  });

  it('rejects a caller acting for an organization they do not belong to', async () => {
    const result = await idempotentProbe.execute(
      callable(admin, { orgId: ORG_B, operationId: OPERATION_ID_A, payload: invitationPayload }),
      db,
    );
    expect(failure(result)).toEqual({ code: 'permission-denied', reason: 'NOT_A_MEMBER' });
    expect(invocations).toBe(0);
  });

  it.each([
    'INVENTORY_MANAGER',
    'PROCUREMENT_MANAGER',
    'STOREKEEPER',
    'ANALYST',
    'VIEWER',
  ] as const)('rejects %s on an ADMINS-only command', async (role) => {
    const result = await idempotentProbe.execute(
      callable(uidFor(ORG_A, role), {
        orgId: ORG_A,
        operationId: OPERATION_ID_A,
        payload: invitationPayload,
      }),
      db,
    );
    expect(failure(result)).toEqual({
      code: 'permission-denied',
      reason: 'ROLE_NOT_PERMITTED',
    });
    expect(invocations).toBe(0);
  });
});

describe('COMMAND_RECEIPT_FRAMEWORK', () => {
  beforeEach(async () => {
    for (const orgId of [ORG_A, ORG_B]) {
      for (const operationId of [OPERATION_ID_A, OPERATION_ID_B]) {
        await db.doc(paths.commandReceipt(orgId, operationId)).delete();
      }
    }
  });

  it('runs the body and writes a server-controlled receipt at the frozen path', async () => {
    const result = await idempotentProbe.execute(
      callable(admin, { orgId: ORG_A, operationId: OPERATION_ID_A, payload: invitationPayload }),
      db,
    );
    expect(result).toEqual({ ok: true, data: { invocations: 1 } });

    const receipt = await receiptRef(db, ORG_A, OPERATION_ID_A).get();
    expect(receipt.exists).toBe(true);
    expect(receipt.ref.path).toBe(`organizations/${ORG_A}/commandReceipts/${OPERATION_ID_A}`);
    const stored = receipt.data() ?? {};
    expect(stored.commandType).toBe('team.createInvitation');
    expect(stored.actorUid).toBe(admin);
    expect(stored.resultStatus).toBe('OK');
    expect(stored.payloadHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.createdAt).toBeDefined();
    expect(stored.result).toEqual({ invocations: 1 });
  });

  it('replays an identical retry without re-running the body', async () => {
    const request = callable(admin, {
      orgId: ORG_A,
      operationId: OPERATION_ID_A,
      payload: invitationPayload,
    });
    const first = await idempotentProbe.execute(request, db);
    const second = await idempotentProbe.execute(request, db);
    expect(first).toEqual(second);
    expect(invocations).toBe(1);
  });

  it('rejects the same operationId carrying a different payload', async () => {
    await idempotentProbe.execute(
      callable(admin, { orgId: ORG_A, operationId: OPERATION_ID_A, payload: invitationPayload }),
      db,
    );
    const result = await idempotentProbe.execute(
      callable(admin, {
        orgId: ORG_A,
        operationId: OPERATION_ID_A,
        payload: { email: 'someone-else@stockmok.test', role: 'ANALYST' },
      }),
      db,
    );
    expect(failure(result)).toEqual({
      code: 'failed-precondition',
      reason: 'OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD',
    });
    expect(invocations).toBe(1);
  });

  it('rejects an operationId reused by a different command', async () => {
    await idempotentProbe.execute(
      callable(admin, { orgId: ORG_A, operationId: OPERATION_ID_A, payload: invitationPayload }),
      db,
    );
    const result = await otherIdempotentProbe.execute(
      callable(uidFor(ORG_A, 'OWNER'), {
        orgId: ORG_A,
        operationId: OPERATION_ID_A,
        payload: { purchaseOrderId: 'po-1' },
      }),
      db,
    );
    expect(failure(result)).toEqual({
      code: 'failed-precondition',
      reason: 'OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD',
    });
  });

  it('does not alias two different operation ids', async () => {
    await idempotentProbe.execute(
      callable(admin, { orgId: ORG_A, operationId: OPERATION_ID_A, payload: invitationPayload }),
      db,
    );
    const second = await idempotentProbe.execute(
      callable(admin, { orgId: ORG_A, operationId: OPERATION_ID_B, payload: invitationPayload }),
      db,
    );
    expect(second).toEqual({ ok: true, data: { invocations: 2 } });
    expect(invocations).toBe(2);
    expect((await receiptRef(db, ORG_A, OPERATION_ID_A).get()).exists).toBe(true);
    expect((await receiptRef(db, ORG_A, OPERATION_ID_B).get()).exists).toBe(true);
  });

  it('scopes receipts by tenant, so one organization cannot squat on another', async () => {
    await idempotentProbe.execute(
      callable(admin, { orgId: ORG_A, operationId: OPERATION_ID_A, payload: invitationPayload }),
      db,
    );
    expect((await receiptRef(db, ORG_B, OPERATION_ID_A).get()).exists).toBe(false);

    const inOrgB = await idempotentProbe.execute(
      callable(uidFor(ORG_B, 'ADMIN'), {
        orgId: ORG_B,
        operationId: OPERATION_ID_A,
        payload: invitationPayload,
      }),
      db,
    );
    expect(inOrgB.ok).toBe(true);
    expect(invocations).toBe(2);
  });

  it('writes no receipt when the body fails — receipt and effect commit together', async () => {
    const result = await failingProbe.execute(
      callable(admin, { orgId: ORG_A, operationId: OPERATION_ID_B, payload: invitationPayload }),
      db,
    );
    expect(failure(result).code).toBe('internal');
    expect(invocations).toBe(1);
    expect((await receiptRef(db, ORG_A, OPERATION_ID_B).get()).exists).toBe(false);
  });

  it('writes no receipt for a non-idempotent command', async () => {
    const result = await nonIdempotentProbe.execute(
      callable(admin, { orgId: ORG_A, payload: { invitationId: 'inv-1' } }),
      db,
    );
    expect(result.ok).toBe(true);
    const receipts = await db.collection(`${paths.organization(ORG_A)}/commandReceipts`).get();
    expect(
      receipts.docs.some((snapshot) => snapshot.get('commandType') === 'team.revokeInvitation'),
    ).toBe(false);
  });

  it('refuses an envelope carrying an operationId on a non-idempotent command', async () => {
    const result = await nonIdempotentProbe.execute(
      callable(admin, {
        orgId: ORG_A,
        operationId: OPERATION_ID_A,
        payload: { invitationId: 'inv-1' },
      }),
      db,
    );
    expect(failure(result).code).toBe('invalid-argument');
  });
});

describe('the frame agrees with the frozen catalog', () => {
  it.each([
    [idempotentProbe, 'C-04', 'team.createInvitation', true],
    [nonIdempotentProbe, 'C-05', 'team.revokeInvitation', false],
    [otherIdempotentProbe, 'C-15', 'po.order', true],
  ] as const)('%#· %s is named %s and idempotent=%s', (probe, id, name, idempotent) => {
    expect(probe.id).toBe(id);
    expect(probe.name).toBe(name);
    expect(probe.idempotent).toBe(idempotent);
  });
});
