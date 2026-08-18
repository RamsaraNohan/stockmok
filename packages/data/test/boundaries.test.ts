import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore, type DocumentReference } from 'firebase-admin/firestore';
import type { Firestore as ClientFirestore } from 'firebase/firestore';
import { afterAll, describe, expect, it } from 'vitest';
import { createReadClient } from '../src/client.js';
import { createServerReadBuilders } from '../src/server.js';

const adminApp = initializeApp({ projectId: 'stockmok' }, 'c2-boundary-unit');
const adminDb = getFirestore(adminApp);

function isReferencePair(value: unknown): value is readonly [DocumentReference, DocumentReference] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((entry: unknown) => typeof entry === 'object' && entry !== null && 'path' in entry)
  );
}

afterAll(() => deleteApp(adminApp));

describe('browser/server and blocked-query boundaries', () => {
  it('does not expose any substitute execution for Q-005', async () => {
    const client = createReadClient({} as ClientFirestore, { uid: 'user-1' });
    await expect(client.aggregate('Q-005')).rejects.toMatchObject({
      code: 'invalid-argument',
    });
    expect(() => client.subscribe('Q-005', {}, () => undefined)).toThrow(
      /blocked pending an owner ruling/,
    );
  });

  it('refuses server-only queries through the browser executor', async () => {
    const client = createReadClient({} as ClientFirestore, { orgId: 'org-1' });
    await expect(client.list('Q-046')).rejects.toThrow(/server-only/);
  });

  it('builds command-internal references without performing command writes', () => {
    const server = createServerReadBuilders(adminDb, { orgId: 'org-1' });
    const skuReference = server.build('Q-066', { sku: 'SKU-001' });
    const handleReference = server.build('Q-067', { handle: 'example-org' });
    const balances = server.build('Q-071', {
      productId: 'product-1',
      fromWarehouseId: 'warehouse-1',
      toWarehouseId: 'warehouse-2',
    });
    expect('path' in skuReference ? skuReference.path : '').toBe(
      'organizations/org-1/productSkuIndex/SKU-001',
    );
    expect('path' in handleReference ? handleReference.path : '').toBe(
      'handleReservations/example-org',
    );
    expect(isReferencePair(balances)).toBe(true);
    if (!isReferencePair(balances)) throw new Error('Q-071 must return two references');
    expect(balances.map(({ path }) => path)).toEqual([
      'organizations/org-1/stockBalances/product-1__warehouse-1',
      'organizations/org-1/stockBalances/product-1__warehouse-2',
    ]);
  });

  it('prevents a query payload from replacing the bound organization', () => {
    const server = createServerReadBuilders(adminDb, { orgId: 'org-bound' });
    const reference = server.build('Q-073', { orgId: 'org-attacker' });
    expect('path' in reference ? reference.path : '').toBe('organizations/org-bound/settings/main');
  });
});
