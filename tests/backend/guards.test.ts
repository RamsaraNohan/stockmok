import type { Firestore } from 'firebase-admin/firestore';
import { beforeAll, describe, expect, it } from 'vitest';
import { paths } from '../../packages/shared/src/paths.js';
import type { Role } from '../../packages/shared/src/primitives.js';
import { CommandFailure } from '../../functions/src/core/errors.js';
import { requireAuth } from '../../functions/src/guards/auth.js';
import { readMembership, requireActiveMembership } from '../../functions/src/guards/membership.js';
import { assertOwnerNotTargeted, readCanonicalOwnerUid } from '../../functions/src/guards/owner.js';
import { directReader } from '../../functions/src/guards/reads.js';
import { requireRole } from '../../functions/src/guards/role.js';
import { ROLE_GROUPS } from '../../functions/src/guards/roles.js';
import { requireTenantDocument } from '../../functions/src/guards/tenant.js';
import {
  clearFirestore,
  membershipOf,
  ORG_A,
  ORG_B,
  seedMember,
  seedOrganization,
  testDb,
  uidFor,
} from './harness.js';

/**
 * MEMBERSHIP, ROLE, OWNER and TENANT guards, against a real database.
 *
 * The Admin SDK ignores `firestore.rules`, so every denial here is produced by
 * the guard alone. That is the property B1 exists to establish.
 */

let db: Firestore;

const NON_MEMBER = 'authenticated-non-member';

async function reason(run: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await run();
  } catch (error) {
    expect(error).toBeInstanceOf(CommandFailure);
    return (error as CommandFailure).reason;
  }
  return undefined;
}

beforeAll(async () => {
  db = testDb();
  await clearFirestore();
  await seedOrganization(db, ORG_A);
  await seedOrganization(db, ORG_B);
  for (const role of ROLE_GROUPS.NOT_VIEWER) await seedMember(db, ORG_A, role);
  await seedMember(db, ORG_A, 'VIEWER');
  await seedMember(db, ORG_B, 'OWNER');
  await db.doc(paths.member(ORG_A, 'suspended-user')).set({
    uid: 'suspended-user',
    role: 'INVENTORY_MANAGER',
    status: 'SUSPENDED',
    displayName: 'Suspended',
    email: 'suspended@stockmok.test',
  });
  await db.doc(paths.member(ORG_A, 'removed-user')).set({
    uid: 'removed-user',
    role: 'STOREKEEPER',
    status: 'REMOVED',
    displayName: 'Removed',
    email: 'removed@stockmok.test',
  });
  await db.doc(paths.member(ORG_A, 'invalid-role-user')).set({
    uid: 'invalid-role-user',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    displayName: 'Invented Role',
  });
});

describe('MEMBERSHIP_GUARDS', () => {
  const auth = (uid: string) => requireAuth({ auth: { uid }, data: {} });

  it('accepts an ACTIVE member of the organization they claim to act for', async () => {
    const membership = await requireActiveMembership(
      db,
      directReader(),
      auth(uidFor(ORG_A, 'INVENTORY_MANAGER')),
      ORG_A,
    );
    expect(membership.role).toBe('INVENTORY_MANAGER');
    expect(membership.orgId).toBe(ORG_A);
  });

  it('denies an authenticated non-member with NOT_A_MEMBER', async () => {
    expect(
      await reason(() => requireActiveMembership(db, directReader(), auth(NON_MEMBER), ORG_A)),
    ).toBe('NOT_A_MEMBER');
  });

  it('denies a suspended membership with MEMBERSHIP_NOT_ACTIVE', async () => {
    expect(
      await reason(() =>
        requireActiveMembership(db, directReader(), auth('suspended-user'), ORG_A),
      ),
    ).toBe('MEMBERSHIP_NOT_ACTIVE');
  });

  it('denies a removed membership with MEMBERSHIP_NOT_ACTIVE', async () => {
    expect(
      await reason(() => requireActiveMembership(db, directReader(), auth('removed-user'), ORG_A)),
    ).toBe('MEMBERSHIP_NOT_ACTIVE');
  });

  it('denies a member of another organization — orgId is a routing hint, not a claim', async () => {
    expect(
      await reason(() =>
        requireActiveMembership(db, directReader(), auth(uidFor(ORG_B, 'OWNER')), ORG_A),
      ),
    ).toBe('NOT_A_MEMBER');
    expect(
      await reason(() =>
        requireActiveMembership(db, directReader(), auth(uidFor(ORG_A, 'OWNER')), ORG_B),
      ),
    ).toBe('NOT_A_MEMBER');
  });

  it('denies a membership document carrying a role outside the frozen seven', async () => {
    expect(
      await reason(() =>
        requireActiveMembership(db, directReader(), auth('invalid-role-user'), ORG_A),
      ),
    ).toBe('NOT_A_MEMBER');
  });

  it('reports an absent membership without judging it, so callers can distinguish', async () => {
    expect(await readMembership(db, directReader(), ORG_A, NON_MEMBER)).toBeUndefined();
    const suspended = await readMembership(db, directReader(), ORG_A, 'suspended-user');
    expect(suspended?.status).toBe('SUSPENDED');
  });
});

describe('ROLE_GUARDS against real membership documents', () => {
  const allRoles: readonly Role[] = [...ROLE_GROUPS.NOT_VIEWER, 'VIEWER'];

  it.each(allRoles.map((role) => [role] as const))('ADMINS · %s', async (role) => {
    const membership = await requireActiveMembership(
      db,
      directReader(),
      requireAuth({ auth: { uid: uidFor(ORG_A, role) }, data: {} }),
      ORG_A,
    );
    if ((ROLE_GROUPS.ADMINS as readonly string[]).includes(role)) {
      expect(requireRole(membership, ROLE_GROUPS.ADMINS).role).toBe(role);
    } else {
      expect(await reason(() => Promise.resolve(requireRole(membership, ROLE_GROUPS.ADMINS)))).toBe(
        'ROLE_NOT_PERMITTED',
      );
    }
  });

  it('reads the role from the document, never from a caller-supplied value', async () => {
    // A payload claiming OWNER changes nothing: the guard never sees the payload.
    const membership = await requireActiveMembership(
      db,
      directReader(),
      requireAuth({ auth: { uid: uidFor(ORG_A, 'VIEWER') }, data: { role: 'OWNER' } }),
      ORG_A,
    );
    expect(membership.role).toBe('VIEWER');
    expect(
      await reason(() => Promise.resolve(requireRole(membership, ROLE_GROUPS.INVENTORY_WRITERS))),
    ).toBe('ROLE_NOT_PERMITTED');
  });
});

describe('OWNER_GUARDS against the organization document', () => {
  it('reads the canonical Owner from organizations/{orgId}.ownerUid', async () => {
    expect(await readCanonicalOwnerUid(db, directReader(), ORG_A)).toBe(uidFor(ORG_A, 'OWNER'));
  });

  it('fails not-found for an organization that does not exist', async () => {
    expect(await reason(() => readCanonicalOwnerUid(db, directReader(), 'org-nonexistent'))).toBe(
      'RESOURCE_NOT_FOUND',
    );
  });

  it('protects the canonical Owner from an Admin-initiated membership mutation', async () => {
    const ownerUid = await readCanonicalOwnerUid(db, directReader(), ORG_A);
    expect(
      await reason(() => {
        assertOwnerNotTargeted(ownerUid, ownerUid);
        return Promise.resolve();
      }),
    ).toBe('OWNER_PROTECTED');
    expect(() => {
      assertOwnerNotTargeted(uidFor(ORG_A, 'ADMIN'), ownerUid);
    }).not.toThrow();
  });

  it('does not treat a member whose role field says OWNER as the canonical Owner', async () => {
    await db.doc(paths.member(ORG_A, 'impostor')).set({
      uid: 'impostor',
      role: 'OWNER',
      status: 'ACTIVE',
      displayName: 'Impostor',
      email: 'impostor@stockmok.test',
    });
    const ownerUid = await readCanonicalOwnerUid(db, directReader(), ORG_A);
    expect(ownerUid).not.toBe('impostor');
  });
});

describe('TENANT_GUARDS', () => {
  it('resolves a foreign id to a missing document under the verified tenant (T-SEC-25)', async () => {
    await db.doc(paths.warehouse(ORG_B, 'wh-b')).set({
      warehouseId: 'wh-b',
      organizationId: ORG_B,
      name: 'Their store room',
      status: 'ACTIVE',
    });
    const caller = membershipOf(ORG_A, 'INVENTORY_MANAGER');
    const snapshot = await db.doc(paths.warehouse(ORG_A, 'wh-b')).get();
    expect(
      await reason(() => Promise.resolve(requireTenantDocument(snapshot, caller, 'Store room'))),
    ).toBe('RESOURCE_NOT_FOUND');
  });

  it('rejects a document read from another tenant even when it exists', async () => {
    const caller = membershipOf(ORG_A, 'INVENTORY_MANAGER');
    const foreign = await db.doc(paths.warehouse(ORG_B, 'wh-b')).get();
    expect(
      await reason(() => Promise.resolve(requireTenantDocument(foreign, caller, 'Store room'))),
    ).toBe('CROSS_TENANT_REFERENCE');
  });

  it('accepts a document inside the verified tenant', async () => {
    await db.doc(paths.warehouse(ORG_A, 'wh-a')).set({
      warehouseId: 'wh-a',
      organizationId: ORG_A,
      name: 'Main Store',
      status: 'ACTIVE',
    });
    const caller = membershipOf(ORG_A, 'INVENTORY_MANAGER');
    const snapshot = await db.doc(paths.warehouse(ORG_A, 'wh-a')).get();
    expect(requireTenantDocument(snapshot, caller, 'Store room').id).toBe('wh-a');
  });
});
