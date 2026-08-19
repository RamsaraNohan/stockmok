import { Timestamp } from 'firebase-admin/firestore';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import { commandDefinitions } from '../packages/shared/src/commands.js';
import { createConverter } from '../packages/shared/src/converters.js';
import { AuditLogSchema } from '../packages/shared/src/schemas/network.js';

/**
 * P0 — the shared audit action schema repair.
 *
 * B1 flagged that `AuditLogSchema.action`'s original regex
 * (`/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/`) could not represent 16 of the 38
 * active frozen command names, which carry camelCase segments
 * (`team.createInvitation`, `stock.recordOpeningBalance`, …). The repair binds
 * `action` to `ActiveCommandNameSchema` — the same enum
 * `functions/src/commands/coverage.ts` and `functions/src/core/audit.ts`
 * already trust — derived mechanically from `commandDefinitions`, so there is
 * no second, competing registry of command names to drift from.
 *
 * These assertions enumerate the *real* 38 names out of the catalog, not an
 * abstract regex, per DB-02 §6.4 and DB-06 §1.
 */

const ACTIVE_COMMAND_IDS = Object.keys(commandDefinitions);
const ACTIVE_COMMAND_NAMES = Object.values(commandDefinitions).map(({ name }) => name);

function anAuditLog(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    auditId: 'audit-1',
    actorUid: 'user-1',
    actorName: 'Test Actor',
    actorRole: 'OWNER',
    organizationId: 'org-1',
    action: 'org.create',
    entityType: 'ORGANIZATION',
    entityId: 'org-1',
    summary: 'Created the workspace.',
    metadata: {},
    createdAt: Timestamp.fromMillis(1),
    ...overrides,
  };
}

describe('AuditLogSchema.action — P0 shared audit action repair', () => {
  it('the active catalog carries exactly 38 ids and 38 names, mechanically', () => {
    expect(ACTIVE_COMMAND_IDS).toHaveLength(38);
    expect(new Set(ACTIVE_COMMAND_NAMES).size).toBe(38);
  });

  it.each(ACTIVE_COMMAND_NAMES.map((name) => [name] as const))(
    'accepts the active command name %s as a valid audit action',
    (name) => {
      expect(() => AuditLogSchema.parse(anAuditLog({ action: name }))).not.toThrow();
    },
  );

  it.each([
    'org_create', // no dot
    'Org.create', // uppercase first character
    'org..create', // double dot
    'org.create.', // trailing dot
    'not.a.real.command',
    'not-a-command',
    'totally invalid command',
    '',
  ])('rejects the malformed or non-active action %j', (action) => {
    expect(() => AuditLogSchema.parse(anAuditLog({ action }))).toThrow();
  });

  it('rejects the declared-inert Release C command names (C-32, excluded from the 38)', () => {
    expect(ACTIVE_COMMAND_IDS).not.toContain('C-32');
    for (const name of ['storefront.publish', 'storefront.unpublish']) {
      expect(ACTIVE_COMMAND_NAMES).not.toContain(name);
      expect(() => AuditLogSchema.parse(anAuditLog({ action: name }))).toThrow();
    }
  });

  it("rejects a pre-split / tombstoned category-archive name (old C-35 never carried C-35a/b's split names)", () => {
    for (const name of [
      'category.setStatus',
      'category.archiveOrRestore',
      'category.archive.restore',
    ]) {
      expect(ACTIVE_COMMAND_NAMES).not.toContain(name);
      expect(() => AuditLogSchema.parse(anAuditLog({ action: name }))).toThrow();
    }
    // The real, active split names are of course accepted.
    expect(ACTIVE_COMMAND_NAMES).toContain('category.archive');
    expect(ACTIVE_COMMAND_NAMES).toContain('category.restore');
  });

  it('round-trips a full AuditLogSchema document through the shared converter for a camelCase-segment B2 command', () => {
    const record = AuditLogSchema.parse(
      anAuditLog({
        action: 'team.createInvitation',
        entityType: 'INVITATION',
        entityId: 'invitation-1',
        operationId: '11111111-2222-4333-8444-555555555555',
        summary: 'Invited teammate@example.com as VIEWER.',
        metadata: { role: 'VIEWER' },
      }),
    );
    const converter = createConverter(AuditLogSchema);
    const encoded = converter.toFirestore(record);
    const snapshot = { data: () => encoded } as unknown as QueryDocumentSnapshot;
    const decoded = converter.fromFirestore(snapshot, {});
    expect(decoded).toEqual(record);
    expect(decoded.action).toBe('team.createInvitation');
  });
});
