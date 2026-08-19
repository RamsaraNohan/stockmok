import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, type Firestore } from 'firebase/firestore';
import { afterAll, beforeAll, describe, it } from 'vitest';
import type { Role } from '../../packages/shared/src/primitives.js';
import { paths } from '../../packages/shared/src/paths.js';
import {
  asUser,
  closeTestEnvironment,
  getTestEnvironment,
  IDS,
  ORG_A,
  seedFixtures,
  uidFor,
} from './harness.js';

/**
 * `BACKEND-IR-001` — the validated-shape contract on the six
 * `SAFE_DIRECT_CLIENT_WRITE` surfaces.
 *
 * The role, status and changed-field boundaries were already enforced and are
 * asserted in `write-surfaces.test.ts`. This file attacks the properties that
 * file does not: primitive types, enum bounds, required and undeclared keys,
 * path/document-id equality, integer sign and range, quantity relationships,
 * forged creation provenance, and identity/provenance mutation.
 *
 * Every attacker below holds the role the surface requires — Owner or the
 * writer role for that path — so a denial is attributable to the shape and to
 * nothing else. Each group ends with the legitimate write it must still allow,
 * because a rule that denies everything is not a repair.
 *
 * Client-side Zod validation is not a security boundary: the client SDK
 * persists whatever the caller hands it, so `firestore.rules` has to reject
 * malformed documents on its own.
 */

let env: RulesTestEnvironment;

const NOW = new Date('2026-08-03T00:00:00.000Z');
const OWNER_A = uidFor(ORG_A, 'OWNER');
const OTHER_A = uidFor(ORG_A, 'ADMIN');

function db(uid: string): Firestore {
  return asUser(env, uid).firestore() as unknown as Firestore;
}

function forRole(role: Role): Firestore {
  return db(uidFor(ORG_A, role));
}

beforeAll(async () => {
  env = await getTestEnvironment();
  await seedFixtures(env);
});

afterAll(async () => {
  await closeTestEnvironment();
});

// ───────────────────────────────────────────────────────────────────────────
// 1/6 — users/{uid}
// ───────────────────────────────────────────────────────────────────────────

describe('users — DB-02 §2.1 validated shape', () => {
  const self = (): ReturnType<typeof doc> => doc(db(OWNER_A), paths.user(OWNER_A));

  it('denies a non-string displayName', async () => {
    await assertFails(updateDoc(self(), { displayName: 42 }));
  });

  it('denies an empty displayName and one past 80 characters', async () => {
    await assertFails(updateDoc(self(), { displayName: '' }));
    await assertFails(updateDoc(self(), { displayName: 'x'.repeat(81) }));
  });

  it('denies a lastSeenAt that is not a timestamp', async () => {
    await assertFails(updateDoc(self(), { lastSeenAt: 'not-a-timestamp' }));
  });

  it('denies a non-string photoUrl', async () => {
    await assertFails(updateDoc(self(), { photoUrl: 7 }));
  });

  it('denies a create whose uid disagrees with the document path', async () => {
    const uid = 'shape-user-mismatch';
    await assertFails(
      setDoc(doc(db(uid), paths.user(uid)), {
        uid: 'someone-else',
        displayName: 'Mismatch',
        createdAt: NOW,
      }),
    );
  });

  it('denies a create with a non-timestamp createdAt or a numeric displayName', async () => {
    const first = 'shape-user-bad-created';
    await assertFails(
      setDoc(doc(db(first), paths.user(first)), {
        uid: first,
        displayName: 'Bad Timestamp',
        createdAt: 'yesterday',
      }),
    );
    const second = 'shape-user-bad-name';
    await assertFails(
      setDoc(doc(db(second), paths.user(second)), {
        uid: second,
        displayName: 99,
        createdAt: NOW,
      }),
    );
  });

  it('denies a create missing a required key', async () => {
    const uid = 'shape-user-missing';
    await assertFails(setDoc(doc(db(uid), paths.user(uid)), { uid, createdAt: NOW }));
  });

  it('still allows the legitimate profile create and update', async () => {
    const uid = 'shape-user-valid';
    await assertSucceeds(
      setDoc(doc(db(uid), paths.user(uid)), {
        uid,
        displayName: 'Valid Person',
        photoUrl: 'https://cdn.stockmok.test/avatar.png',
        createdAt: NOW,
        lastSeenAt: NOW,
      }),
    );
    await assertSucceeds(updateDoc(self(), { displayName: 'Nohan Fernando' }));
    await assertSucceeds(updateDoc(self(), { lastSeenAt: NOW }));
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 2/6 — users/{uid}/notifications/{id}
// ───────────────────────────────────────────────────────────────────────────

describe('notifications — `read` is the one client-writable field and it is boolean', () => {
  const notification = (): ReturnType<typeof doc> =>
    doc(db(OWNER_A), paths.notification(OWNER_A, IDS.notification));

  it('denies a read flag that is not a boolean', async () => {
    await assertFails(updateDoc(notification(), { read: 'not-a-boolean' }));
    await assertFails(updateDoc(notification(), { read: 1 }));
    await assertFails(updateDoc(notification(), { read: null }));
  });

  it('still allows the recipient to mark the notification read', async () => {
    await assertSucceeds(updateDoc(notification(), { read: true }));
    await assertSucceeds(updateDoc(notification(), { read: false }));
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 3/6 — categories
// ───────────────────────────────────────────────────────────────────────────

describe('categories — DB-02 §4.1 validated shape', () => {
  const validCategory = (categoryId: string) => ({
    categoryId,
    name: 'Dairy',
    status: 'ACTIVE',
    createdAt: NOW,
    createdBy: OWNER_A,
    updatedAt: NOW,
    updatedBy: OWNER_A,
  });

  it('denies a create whose path id differs from categoryId', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.category(ORG_A, 'cat-path-a')), {
        ...validCategory('cat-path-b'),
      }),
    );
  });

  it('denies a create that forges the creator', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.category(ORG_A, 'cat-forged-creator')), {
        ...validCategory('cat-forged-creator'),
        createdBy: OTHER_A,
      }),
    );
  });

  it('denies invalid field types', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.category(ORG_A, 'cat-numeric-name')), {
        ...validCategory('cat-numeric-name'),
        name: 42,
      }),
    );
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.category(ORG_A, 'cat-string-timestamp')), {
        ...validCategory('cat-string-timestamp'),
        createdAt: '2026-08-03',
      }),
    );
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.category(ORG_A, 'cat-numeric-description')), {
        ...validCategory('cat-numeric-description'),
        description: 17,
      }),
    );
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.category(ORG_A, 'cat-numeric-creator')), {
        ...validCategory('cat-numeric-creator'),
        createdBy: 1234,
      }),
    );
  });

  it('denies an invalid lifecycle status value', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.category(ORG_A, 'cat-bad-status')), {
        ...validCategory('cat-bad-status'),
        status: 'DELETED',
      }),
    );
  });

  it('denies a missing required key and an undeclared key', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.category(ORG_A, 'cat-missing-name')), {
        categoryId: 'cat-missing-name',
        status: 'ACTIVE',
        createdAt: NOW,
        createdBy: OWNER_A,
        updatedAt: NOW,
        updatedBy: OWNER_A,
      }),
    );
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.category(ORG_A, 'cat-undeclared')), {
        ...validCategory('cat-undeclared'),
        productCount: 99,
      }),
    );
  });

  it('denies mutation of the immutable identity field', async () => {
    await assertFails(
      updateDoc(doc(forRole('OWNER'), paths.category(ORG_A, IDS.category)), {
        categoryId: 'cat-rewritten',
      }),
    );
  });

  it('denies mutation of createdBy and createdAt', async () => {
    const category = doc(forRole('OWNER'), paths.category(ORG_A, IDS.category));
    await assertFails(updateDoc(category, { createdBy: OTHER_A }));
    await assertFails(updateDoc(category, { createdAt: NOW }));
  });

  it('denies an update that breaks the shape of an untouched-looking field', async () => {
    await assertFails(
      updateDoc(doc(forRole('OWNER'), paths.category(ORG_A, IDS.category)), {
        name: 42,
        updatedAt: NOW,
      }),
    );
  });

  it('still allows a legitimate create, with and without the optional description', async () => {
    await assertSucceeds(
      setDoc(
        doc(forRole('OWNER'), paths.category(ORG_A, 'cat-shape-ok')),
        validCategory('cat-shape-ok'),
      ),
    );
    await assertSucceeds(
      setDoc(doc(forRole('INVENTORY_MANAGER'), paths.category(ORG_A, 'cat-shape-desc')), {
        ...validCategory('cat-shape-desc'),
        createdBy: uidFor(ORG_A, 'INVENTORY_MANAGER'),
        updatedBy: uidFor(ORG_A, 'INVENTORY_MANAGER'),
        description: 'Milk, cheese and yoghurt.',
      }),
    );
  });

  it('still allows a legitimate rename', async () => {
    await assertSucceeds(
      updateDoc(doc(forRole('INVENTORY_MANAGER'), paths.category(ORG_A, IDS.category)), {
        name: 'Meat and Poultry',
        updatedAt: NOW,
        updatedBy: uidFor(ORG_A, 'INVENTORY_MANAGER'),
      }),
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 4/6 — warehouses
// ───────────────────────────────────────────────────────────────────────────

describe('warehouses — DB-02 §4.2 validated shape', () => {
  const validWarehouse = (warehouseId: string) => ({
    warehouseId,
    name: 'Cold Room',
    type: 'REFRIGERATED',
    status: 'ACTIVE',
    createdAt: NOW,
    createdBy: OWNER_A,
    updatedAt: NOW,
    updatedBy: OWNER_A,
  });

  it('denies a create whose path id differs from warehouseId', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.warehouse(ORG_A, 'wh-path-a')), {
        ...validWarehouse('wh-path-b'),
      }),
    );
  });

  it('denies an invalid warehouse type', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.warehouse(ORG_A, 'wh-bad-type')), {
        ...validWarehouse('wh-bad-type'),
        type: 'PANTRY',
      }),
    );
    await assertFails(
      updateDoc(doc(forRole('OWNER'), paths.warehouse(ORG_A, IDS.warehouse)), {
        type: 'PANTRY',
        updatedAt: NOW,
      }),
    );
  });

  it('denies invalid field types', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.warehouse(ORG_A, 'wh-bool-name')), {
        ...validWarehouse('wh-bool-name'),
        name: true,
      }),
    );
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.warehouse(ORG_A, 'wh-numeric-code')), {
        ...validWarehouse('wh-numeric-code'),
        code: 12,
      }),
    );
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.warehouse(ORG_A, 'wh-string-updated')), {
        ...validWarehouse('wh-string-updated'),
        updatedAt: 'today',
      }),
    );
  });

  it('denies a forged creator and an undeclared key', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.warehouse(ORG_A, 'wh-forged-creator')), {
        ...validWarehouse('wh-forged-creator'),
        createdBy: OTHER_A,
      }),
    );
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.warehouse(ORG_A, 'wh-undeclared')), {
        ...validWarehouse('wh-undeclared'),
        capacityMilli: 1_000,
      }),
    );
  });

  it('denies mutation of warehouseId, createdBy and createdAt', async () => {
    const warehouse = doc(forRole('OWNER'), paths.warehouse(ORG_A, IDS.warehouse));
    await assertFails(updateDoc(warehouse, { warehouseId: 'wh-rewritten' }));
    await assertFails(updateDoc(warehouse, { createdBy: OTHER_A }));
    await assertFails(updateDoc(warehouse, { createdAt: NOW }));
  });

  it('still allows a legitimate create and rename', async () => {
    await assertSucceeds(
      setDoc(doc(forRole('INVENTORY_MANAGER'), paths.warehouse(ORG_A, 'wh-shape-ok')), {
        ...validWarehouse('wh-shape-ok'),
        createdBy: uidFor(ORG_A, 'INVENTORY_MANAGER'),
        updatedBy: uidFor(ORG_A, 'INVENTORY_MANAGER'),
        code: 'CR-01',
        address: '12 Marine Drive, Colombo',
      }),
    );
    await assertSucceeds(
      updateDoc(doc(forRole('INVENTORY_MANAGER'), paths.warehouse(ORG_A, IDS.warehouse)), {
        name: 'Main Store Room',
        updatedAt: NOW,
        updatedBy: uidFor(ORG_A, 'INVENTORY_MANAGER'),
      }),
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 5/6 — privatePartners
// ───────────────────────────────────────────────────────────────────────────

describe('privatePartners — DB-02 §5.1 validated shape', () => {
  const validPartner = (partnerId: string) => ({
    partnerId,
    partnerTypes: ['SUPPLIER'],
    name: 'New Supplier',
    status: 'ACTIVE',
    ordersPlacedCount: 0,
    createdAt: NOW,
    createdBy: OWNER_A,
    updatedAt: NOW,
    updatedBy: OWNER_A,
  });

  it('denies a create whose path id differs from partnerId', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.privatePartner(ORG_A, 'pp-path-a')), {
        ...validPartner('pp-path-b'),
      }),
    );
  });

  it('denies malformed partnerTypes — empty, over-long, unknown member, not a list', async () => {
    const attack = async (partnerId: string, partnerTypes: unknown): Promise<void> => {
      await assertFails(
        setDoc(doc(forRole('OWNER'), paths.privatePartner(ORG_A, partnerId)), {
          ...validPartner(partnerId),
          partnerTypes,
        }),
      );
    };
    await attack('pp-types-empty', []);
    await attack('pp-types-long', ['SUPPLIER', 'BUYER', 'SUPPLIER']);
    await attack('pp-types-unknown', ['CUSTOMER']);
    await attack('pp-types-scalar', 'SUPPLIER');
    await attack('pp-types-numeric', [1]);
  });

  it('denies a create that forges the creator', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.privatePartner(ORG_A, 'pp-forged-creator')), {
        ...validPartner('pp-forged-creator'),
        createdBy: OTHER_A,
      }),
    );
  });

  it('denies invalid field types and a malformed email', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.privatePartner(ORG_A, 'pp-numeric-name')), {
        ...validPartner('pp-numeric-name'),
        name: 42,
      }),
    );
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.privatePartner(ORG_A, 'pp-float-count')), {
        ...validPartner('pp-float-count'),
        ordersPlacedCount: 0.5,
      }),
    );
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.privatePartner(ORG_A, 'pp-bad-email')), {
        ...validPartner('pp-bad-email'),
        email: 'not-an-email',
      }),
    );
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.privatePartner(ORG_A, 'pp-string-created')), {
        ...validPartner('pp-string-created'),
        createdAt: 'once upon a time',
      }),
    );
  });

  it('denies an invalid partner status and an undeclared key', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.privatePartner(ORG_A, 'pp-bad-status')), {
        ...validPartner('pp-bad-status'),
        status: 'ARCHIVED',
      }),
    );
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.privatePartner(ORG_A, 'pp-undeclared')), {
        ...validPartner('pp-undeclared'),
        openOrdersCount: 0,
      }),
    );
  });

  it('denies mutation of partnerId, createdBy and createdAt', async () => {
    const partner = doc(forRole('OWNER'), paths.privatePartner(ORG_A, IDS.partner));
    await assertFails(updateDoc(partner, { partnerId: 'pp-rewritten' }));
    await assertFails(updateDoc(partner, { createdBy: OTHER_A }));
    await assertFails(updateDoc(partner, { createdAt: NOW }));
  });

  it('still allows a legitimate create and contact edit', async () => {
    await assertSucceeds(
      setDoc(doc(forRole('PROCUREMENT_MANAGER'), paths.privatePartner(ORG_A, 'pp-shape-ok')), {
        ...validPartner('pp-shape-ok'),
        createdBy: uidFor(ORG_A, 'PROCUREMENT_MANAGER'),
        updatedBy: uidFor(ORG_A, 'PROCUREMENT_MANAGER'),
        partnerTypes: ['SUPPLIER', 'BUYER'],
        contactPerson: 'Nimal Perera',
        email: 'nimal@greenfarm.test',
        phone: '+94 77 123 4567',
        address: '4 Lake Road, Kandy',
        notes: 'Delivers on Tuesdays.',
      }),
    );
    await assertSucceeds(
      updateDoc(doc(forRole('PROCUREMENT_MANAGER'), paths.privatePartner(ORG_A, IDS.partner)), {
        contactPerson: 'Nimal Perera',
        updatedAt: NOW,
        updatedBy: uidFor(ORG_A, 'PROCUREMENT_MANAGER'),
      }),
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 6/6 — purchaseOrders: the private draft header
// ───────────────────────────────────────────────────────────────────────────

describe('private purchase-order drafts — DB-02 §5.2 validated shape', () => {
  const validDraft = (purchaseOrderId: string) => ({
    purchaseOrderId,
    viewRole: 'BUYER',
    supplierKind: 'PRIVATE',
    counterpartyName: 'Green Farm Poultry',
    privateSupplierId: IDS.partner,
    status: 'DRAFT',
    currency: 'LKR',
    totalMinor: 0,
    isProjection: false,
    createdBy: OWNER_A,
    createdAt: NOW,
    updatedAt: NOW,
  });

  it('denies a create whose path id differs from purchaseOrderId', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.purchaseOrder(ORG_A, 'po-path-a')), {
        ...validDraft('po-path-b'),
      }),
    );
  });

  it('denies the supplier-side view role on a buyer-created private draft', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.purchaseOrder(ORG_A, 'po-supplier-view')), {
        ...validDraft('po-supplier-view'),
        viewRole: 'SUPPLIER',
      }),
    );
  });

  it('denies every connected-only and command-only field on a private draft', async () => {
    const forbidden: readonly (readonly [string, Record<string, unknown>])[] = [
      ['orderNumber', { orderNumber: 'PO-2026-999' }],
      ['counterpartyOrgId', { counterpartyOrgId: 'org-fresh-foods' }],
      ['counterpartyHandle', { counterpartyHandle: 'freshfoods' }],
      ['connectionId', { connectionId: 'org-grand-ocean__org-fresh-foods' }],
      ['receivingWarehouseId', { receivingWarehouseId: IDS.warehouse }],
      ['lastOperationId', { lastOperationId: 'op-9999' }],
      ['orderedAt', { orderedAt: NOW }],
      ['receivedAt', { receivedAt: NOW }],
      ['cancelledAt', { cancelledAt: NOW }],
    ];
    for (const [label, extra] of forbidden) {
      const id = `po-forbidden-${label.toLowerCase()}`;
      await assertFails(
        setDoc(doc(forRole('OWNER'), paths.purchaseOrder(ORG_A, id)), {
          ...validDraft(id),
          ...extra,
        }),
      );
    }
  });

  it('denies a negative totalMinor on create and on update', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.purchaseOrder(ORG_A, 'po-negative-total')), {
        ...validDraft('po-negative-total'),
        totalMinor: -1,
      }),
    );
    await assertFails(
      updateDoc(doc(forRole('OWNER'), paths.purchaseOrder(ORG_A, IDS.privateDraftPo)), {
        totalMinor: -1,
        updatedAt: NOW,
      }),
    );
  });

  it('denies a non-integer totalMinor and a forged non-zero opening total', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.purchaseOrder(ORG_A, 'po-float-total')), {
        ...validDraft('po-float-total'),
        totalMinor: 12.5,
      }),
    );
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.purchaseOrder(ORG_A, 'po-preset-total')), {
        ...validDraft('po-preset-total'),
        totalMinor: 1_250_000,
      }),
    );
  });

  it('denies an undeclared field', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.purchaseOrder(ORG_A, 'po-undeclared')), {
        ...validDraft('po-undeclared'),
        approvedByCfo: true,
      }),
    );
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.purchaseOrder(ORG_A, 'po-notes')), {
        ...validDraft('po-notes'),
        notes: 'Ring the bell twice.',
      }),
    );
  });

  it('denies malformed timestamps, a bad currency and a missing required key', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.purchaseOrder(ORG_A, 'po-string-created')), {
        ...validDraft('po-string-created'),
        createdAt: '2026-08-03',
      }),
    );
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.purchaseOrder(ORG_A, 'po-string-expected')), {
        ...validDraft('po-string-expected'),
        expectedDate: 'next week',
      }),
    );
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.purchaseOrder(ORG_A, 'po-bad-currency')), {
        ...validDraft('po-bad-currency'),
        currency: 'lkr',
      }),
    );
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.purchaseOrder(ORG_A, 'po-missing-currency')), {
        purchaseOrderId: 'po-missing-currency',
        viewRole: 'BUYER',
        supplierKind: 'PRIVATE',
        counterpartyName: 'Green Farm Poultry',
        status: 'DRAFT',
        totalMinor: 0,
        isProjection: false,
        createdBy: OWNER_A,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
  });

  it('denies a create that forges the creator', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.purchaseOrder(ORG_A, 'po-forged-creator')), {
        ...validDraft('po-forged-creator'),
        createdBy: OTHER_A,
      }),
    );
  });

  it('denies mutation of purchaseOrderId, createdBy and createdAt', async () => {
    const order = doc(forRole('OWNER'), paths.purchaseOrder(ORG_A, IDS.privateDraftPo));
    await assertFails(updateDoc(order, { purchaseOrderId: 'po-rewritten' }));
    await assertFails(updateDoc(order, { createdBy: OTHER_A }));
    await assertFails(updateDoc(order, { createdAt: NOW }));
  });

  it('still allows a legitimate draft create and draft edit', async () => {
    await assertSucceeds(
      setDoc(doc(forRole('PROCUREMENT_MANAGER'), paths.purchaseOrder(ORG_A, 'po-shape-ok')), {
        ...validDraft('po-shape-ok'),
        createdBy: uidFor(ORG_A, 'PROCUREMENT_MANAGER'),
        expectedDate: NOW,
      }),
    );
    await assertSucceeds(
      updateDoc(
        doc(forRole('PROCUREMENT_MANAGER'), paths.purchaseOrder(ORG_A, IDS.privateDraftPo)),
        {
          counterpartyName: 'Green Farm Poultry Ltd',
          totalMinor: 1_300_000,
          updatedAt: NOW,
        },
      ),
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 6/6 — purchaseOrders/{poId}/items
// ───────────────────────────────────────────────────────────────────────────

describe('private draft lines — DB-02 §5.3 validated shape', () => {
  const validItem = (itemId: string) => ({
    itemId,
    buyerProductId: IDS.product,
    buyerProductNameSnapshot: 'Chicken Breast',
    buyerSkuSnapshot: 'SKU-1',
    buyerBaseUnitSnapshot: 'KG',
    orderedBuyerBaseMilli: 5_000,
    receivedBuyerBaseMilli: 0,
    unitPriceMinor: 125_000,
    lineTotalMinor: 625_000,
    currency: 'LKR',
  });

  const item = (itemId: string) =>
    doc(forRole('OWNER'), paths.purchaseOrderItem(ORG_A, IDS.privateDraftPo, itemId));

  it('denies a create whose path id differs from itemId', async () => {
    await assertFails(setDoc(item('line-path-a'), { ...validItem('line-path-b') }));
  });

  it('denies a negative ordered quantity', async () => {
    await assertFails(
      setDoc(item('line-negative-ordered'), {
        ...validItem('line-negative-ordered'),
        orderedBuyerBaseMilli: -5_000,
      }),
    );
    await assertFails(
      updateDoc(
        doc(forRole('OWNER'), paths.purchaseOrderItem(ORG_A, IDS.privateDraftPo, IDS.poItem)),
        {
          orderedBuyerBaseMilli: -1,
        },
      ),
    );
  });

  it('denies a received quantity greater than the ordered quantity', async () => {
    await assertFails(
      setDoc(item('line-over-received'), {
        ...validItem('line-over-received'),
        receivedBuyerBaseMilli: 9_000,
      }),
    );
    await assertFails(
      updateDoc(
        doc(forRole('OWNER'), paths.purchaseOrderItem(ORG_A, IDS.privateDraftPo, IDS.poItem)),
        {
          receivedBuyerBaseMilli: 999_000,
        },
      ),
    );
  });

  it('denies a negative received quantity and negative money', async () => {
    await assertFails(
      setDoc(item('line-negative-received'), {
        ...validItem('line-negative-received'),
        receivedBuyerBaseMilli: -1,
      }),
    );
    await assertFails(
      setDoc(item('line-negative-price'), {
        ...validItem('line-negative-price'),
        unitPriceMinor: -125_000,
      }),
    );
    await assertFails(
      setDoc(item('line-negative-total'), {
        ...validItem('line-negative-total'),
        lineTotalMinor: -1,
      }),
    );
  });

  it('denies non-integer quantities and an invalid unit', async () => {
    await assertFails(
      setDoc(item('line-float-ordered'), {
        ...validItem('line-float-ordered'),
        orderedBuyerBaseMilli: 5_000.5,
      }),
    );
    await assertFails(
      setDoc(item('line-bad-unit'), {
        ...validItem('line-bad-unit'),
        buyerBaseUnitSnapshot: 'TONNE',
      }),
    );
  });

  it('denies an undeclared field and a missing required snapshot', async () => {
    await assertFails(
      setDoc(item('line-undeclared'), {
        ...validItem('line-undeclared'),
        discountMinor: 1_000,
      }),
    );
    await assertFails(
      setDoc(item('line-missing-sku'), {
        itemId: 'line-missing-sku',
        buyerProductId: IDS.product,
        buyerProductNameSnapshot: 'Chicken Breast',
        buyerBaseUnitSnapshot: 'KG',
        orderedBuyerBaseMilli: 5_000,
        receivedBuyerBaseMilli: 0,
        unitPriceMinor: 125_000,
        lineTotalMinor: 625_000,
        currency: 'LKR',
      }),
    );
  });

  it('denies the supplier-only connected snapshot fields on a private draft line', async () => {
    const forbidden: readonly (readonly [string, Record<string, unknown>])[] = [
      ['mappingId', { mappingId: IDS.mapping }],
      ['supplierCatalogItemId', { supplierCatalogItemId: IDS.catalogItem }],
      ['supplierProductNameSnapshot', { supplierProductNameSnapshot: 'Chicken Breast 5 KG' }],
      ['supplierSkuSnapshot', { supplierSkuSnapshot: 'CKN-B5' }],
      ['supplierOrderUnitSnapshot', { supplierOrderUnitSnapshot: 'PACK' }],
      ['orderedSupplierMilli', { orderedSupplierMilli: 1_000 }],
      ['receivedSupplierMilli', { receivedSupplierMilli: 0 }],
      ['supplierToBuyerBaseFactorMilliSnapshot', { supplierToBuyerBaseFactorMilliSnapshot: 5_000 }],
    ];
    for (const [label, extra] of forbidden) {
      const id = `line-forbidden-${label.toLowerCase()}`;
      await assertFails(setDoc(item(id), { ...validItem(id), ...extra }));
    }
  });

  it('still allows a legitimate line create and edit', async () => {
    await assertSucceeds(
      setDoc(
        doc(
          forRole('PROCUREMENT_MANAGER'),
          paths.purchaseOrderItem(ORG_A, IDS.privateDraftPo, 'line-shape-ok'),
        ),
        validItem('line-shape-ok'),
      ),
    );
    await assertSucceeds(
      updateDoc(
        doc(
          forRole('PROCUREMENT_MANAGER'),
          paths.purchaseOrderItem(ORG_A, IDS.privateDraftPo, 'line-shape-ok'),
        ),
        { orderedBuyerBaseMilli: 8_000, lineTotalMinor: 1_000_000 },
      ),
    );
  });
});
