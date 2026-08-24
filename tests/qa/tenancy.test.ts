import { describe, expect, it } from 'vitest';

import { verifyTenancy, verifyTrapsArmed } from '../../scripts/qa/verify/tenancy.js';
import { documentField, field, pathsUnder, smokeFixture } from './dataset-fixture.js';

describe('QA tenant isolation', () => {
  it('leaks nothing across a tenant boundary', () => {
    expect(verifyTenancy(smokeFixture().snapshot)).toEqual([]);
  });

  it('arms confusable identities in more than one organization', () => {
    const traps = verifyTrapsArmed(smokeFixture().snapshot);
    expect(traps.failures).toEqual([]);
    expect(traps.duplicatedProductIds.length).toBeGreaterThan(0);
    expect(traps.duplicatedSkus.length).toBeGreaterThan(0);
    expect(traps.duplicatedPartnerNames.length).toBeGreaterThan(0);
  });

  it('keeps each duplicated product a separate document per tenant', () => {
    const fixture = smokeFixture();
    const traps = verifyTrapsArmed(fixture.snapshot);
    const [productId] = traps.duplicatedProductIds;
    expect(productId).toBeDefined();
    if (productId === undefined) return;

    const copies = pathsUnder(
      fixture,
      (parts) => parts[0] === 'organizations' && parts[2] === 'products' && parts[3] === productId,
    );
    expect(copies.length).toBeGreaterThan(1);

    // Same identity, different tenants: this is what a query missing its org
    // filter would return two of.
    const owners = new Set(copies.map((path) => path.split('/')[1]));
    expect(owners.size).toBe(copies.length);
  });

  it('holds the duplicated identities at identical values', () => {
    const fixture = smokeFixture();
    const traps = verifyTrapsArmed(fixture.snapshot);
    const [productId] = traps.duplicatedProductIds;
    if (productId === undefined) return;
    const copies = pathsUnder(
      fixture,
      (parts) => parts[0] === 'organizations' && parts[2] === 'products' && parts[3] === productId,
    );

    const [first, ...rest] = copies;
    expect(first).toBeDefined();
    if (first === undefined) return;
    for (const other of rest) {
      expect(documentField(fixture, other, 'internalSku')).toBe(
        documentField(fixture, first, 'internalSku'),
      );
      expect(documentField(fixture, other, 'name')).toBe(documentField(fixture, first, 'name'));
    }
  });

  it('gives every user a membership for the organization its notifications describe', () => {
    const fixture = smokeFixture();
    const notifications = pathsUnder(fixture, (parts) => parts[2] === 'notifications');
    expect(notifications.length).toBeGreaterThan(0);
    for (const path of notifications) {
      const uid = path.split('/')[1] ?? '';
      const organizationId = String(field(fixture.snapshot.documents.get(path), 'organizationId'));
      expect(fixture.snapshot.documents.has(`users/${uid}/memberships/${organizationId}`)).toBe(
        true,
      );
    }
  });

  it('isolates the organization that has no network connection', () => {
    const fixture = smokeFixture();
    const isolated = fixture.plan.organizations.find((org) => org.networkRole === 'ISOLATED');
    expect(isolated).toBeDefined();
    if (isolated === undefined) return;
    const connections = pathsUnder(
      fixture,
      (parts) =>
        parts[0] === 'organizations' && parts[1] === isolated.orgId && parts[2] === 'connections',
    );
    expect(connections).toEqual([]);
  });
});
