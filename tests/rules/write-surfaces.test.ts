import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, setDoc, updateDoc, type Firestore } from 'firebase/firestore';
import { afterAll, beforeAll, describe, it } from 'vitest';
import type { Role } from '../../packages/shared/src/primitives.js';
import { paths } from '../../packages/shared/src/paths.js';
import {
  asUser,
  closeTestEnvironment,
  CONNECTION_ID,
  getTestEnvironment,
  IDS,
  ORG_A,
  ROLES,
  seedFixtures,
  uidFor,
} from './harness.js';

/**
 * DB-05 §4 and §9 groups 4, 7, 8, 9 and 15 — the write surface.
 *
 * `CLIENT_WRITE_SURFACES = 6` and `CLIENT_DELETE_PATHS = 0`. Everything else is
 * `COMMAND_ONLY` or `BACKEND_ONLY`, and is denied here **for every role
 * including Owner** — a command-only collection that the Owner can write
 * directly is not command-only.
 */

let env: RulesTestEnvironment;

const NOW = new Date('2026-08-02T00:00:00.000Z');
const INVENTORY_WRITERS: readonly Role[] = ['OWNER', 'ADMIN', 'INVENTORY_MANAGER'];
const PARTNER_WRITERS: readonly Role[] = ['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER'];
const PO_WRITERS: readonly Role[] = ['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER'];

const ARCHIVED_WAREHOUSE = 'wh-archived';

function db(uid: string): Firestore {
  return asUser(env, uid).firestore() as unknown as Firestore;
}

function forRole(role: Role): Firestore {
  return db(uidFor(ORG_A, role));
}

beforeAll(async () => {
  env = await getTestEnvironment();
  await seedFixtures(env);
  await env.withSecurityRulesDisabled(async (context) => {
    const raw = context.firestore() as unknown as Firestore;
    await setDoc(doc(raw, paths.warehouse(ORG_A, ARCHIVED_WAREHOUSE)), {
      warehouseId: ARCHIVED_WAREHOUSE,
      name: 'Bar Store',
      type: 'STORE_ROOM',
      status: 'ARCHIVED',
      createdAt: NOW,
      createdBy: uidFor(ORG_A, 'OWNER'),
      updatedAt: NOW,
      updatedBy: uidFor(ORG_A, 'OWNER'),
    });
  });
});

afterAll(async () => {
  await closeTestEnvironment();
});

describe('categories — SAFE_DIRECT_CLIENT_WRITE, status excluded (DB-CR-012)', () => {
  it.each(ROLES.map((role) => [role]))('create · %s', async (role) => {
    const create = setDoc(doc(forRole(role), paths.category(ORG_A, `cat-${role}`)), {
      categoryId: `cat-${role}`,
      name: 'Dairy',
      status: 'ACTIVE',
      createdAt: NOW,
      createdBy: uidFor(ORG_A, role),
      updatedAt: NOW,
      updatedBy: uidFor(ORG_A, role),
    });
    if (INVENTORY_WRITERS.includes(role)) await assertSucceeds(create);
    else await assertFails(create);
  });

  it.each(ROLES.map((role) => [role]))('rename · %s', async (role) => {
    const rename = updateDoc(doc(forRole(role), paths.category(ORG_A, IDS.category)), {
      name: `Meat ${role}`,
      updatedAt: NOW,
    });
    if (INVENTORY_WRITERS.includes(role)) await assertSucceeds(rename);
    else await assertFails(rename);
  });

  it('denies a client setting status, in either direction', async () => {
    await assertFails(
      updateDoc(doc(forRole('OWNER'), paths.category(ORG_A, IDS.category)), {
        status: 'ARCHIVED',
      }),
    );
  });

  it('denies creating an already-archived category', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.category(ORG_A, 'cat-preborn-archived')), {
        categoryId: 'cat-preborn-archived',
        name: 'Ghost',
        status: 'ARCHIVED',
        createdAt: NOW,
        createdBy: uidFor(ORG_A, 'OWNER'),
        updatedAt: NOW,
        updatedBy: uidFor(ORG_A, 'OWNER'),
      }),
    );
  });

  it('denies delete for every role', async () => {
    for (const role of ROLES) {
      await assertFails(deleteDoc(doc(forRole(role), paths.category(ORG_A, IDS.category))));
    }
  });
});

describe('warehouses — SAFE_DIRECT_CLIENT_WRITE, status immutable both ways (DB-CR-033)', () => {
  it.each(ROLES.map((role) => [role]))('create · %s', async (role) => {
    const create = setDoc(doc(forRole(role), paths.warehouse(ORG_A, `wh-${role}`)), {
      warehouseId: `wh-${role}`,
      name: 'Cold Room',
      type: 'REFRIGERATED',
      status: 'ACTIVE',
      createdAt: NOW,
      createdBy: uidFor(ORG_A, role),
      updatedAt: NOW,
      updatedBy: uidFor(ORG_A, role),
    });
    if (INVENTORY_WRITERS.includes(role)) await assertSucceeds(create);
    else await assertFails(create);
  });

  it('allows an inventory writer to rename', async () => {
    await assertSucceeds(
      updateDoc(doc(forRole('INVENTORY_MANAGER'), paths.warehouse(ORG_A, IDS.warehouse)), {
        name: 'Main Store Room',
        updatedAt: NOW,
      }),
    );
  });

  it('denies ACTIVE → ARCHIVED — archive is C-12', async () => {
    await assertFails(
      updateDoc(doc(forRole('OWNER'), paths.warehouse(ORG_A, IDS.warehouse)), {
        status: 'ARCHIVED',
      }),
    );
  });

  it('T-SEC-35 · denies ARCHIVED → ACTIVE — restore is C-37', async () => {
    await assertFails(
      updateDoc(doc(forRole('OWNER'), paths.warehouse(ORG_A, ARCHIVED_WAREHOUSE)), {
        status: 'ACTIVE',
      }),
    );
  });

  it('denies an isDefault field — the default has one source of truth (DB-CR-013)', async () => {
    await assertFails(
      updateDoc(doc(forRole('OWNER'), paths.warehouse(ORG_A, IDS.warehouse)), {
        isDefault: true,
      }),
    );
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.warehouse(ORG_A, 'wh-with-default')), {
        warehouseId: 'wh-with-default',
        name: 'Sneaky',
        type: 'OTHER',
        status: 'ACTIVE',
        isDefault: true,
        createdAt: NOW,
        createdBy: uidFor(ORG_A, 'OWNER'),
        updatedAt: NOW,
        updatedBy: uidFor(ORG_A, 'OWNER'),
      }),
    );
  });

  it('denies delete for every role', async () => {
    for (const role of ROLES) {
      await assertFails(deleteDoc(doc(forRole(role), paths.warehouse(ORG_A, IDS.warehouse))));
    }
  });
});

describe('privatePartners — SAFE_DIRECT_CLIENT_WRITE, two backend-only fields (A3R-11)', () => {
  it.each(ROLES.map((role) => [role]))('create · %s', async (role) => {
    const create = setDoc(doc(forRole(role), paths.privatePartner(ORG_A, `pp-${role}`)), {
      partnerId: `pp-${role}`,
      partnerTypes: ['SUPPLIER'],
      name: 'New Supplier',
      status: 'ACTIVE',
      ordersPlacedCount: 0,
      createdAt: NOW,
      createdBy: uidFor(ORG_A, role),
      updatedAt: NOW,
      updatedBy: uidFor(ORG_A, role),
    });
    if (PARTNER_WRITERS.includes(role)) await assertSucceeds(create);
    else await assertFails(create);
  });

  it('allows a partner writer to edit contact details', async () => {
    await assertSucceeds(
      updateDoc(doc(forRole('PROCUREMENT_MANAGER'), paths.privatePartner(ORG_A, IDS.partner)), {
        contactPerson: 'Nimal Perera',
        updatedAt: NOW,
      }),
    );
  });

  it('T-SEC-40 · ATTACK-16 · denies a client writing status', async () => {
    await assertFails(
      updateDoc(doc(forRole('OWNER'), paths.privatePartner(ORG_A, IDS.partner)), {
        status: 'DEACTIVATED',
      }),
    );
  });

  it('T-SEC-36 · denies a client writing ordersPlacedCount', async () => {
    await assertFails(
      updateDoc(doc(forRole('OWNER'), paths.privatePartner(ORG_A, IDS.partner)), {
        ordersPlacedCount: 0,
      }),
    );
  });

  it('denies a create that forges a non-zero counter or a deactivated status', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.privatePartner(ORG_A, 'pp-forged-count')), {
        partnerId: 'pp-forged-count',
        partnerTypes: ['SUPPLIER'],
        name: 'Forged',
        status: 'ACTIVE',
        ordersPlacedCount: 99,
        createdAt: NOW,
        createdBy: uidFor(ORG_A, 'OWNER'),
        updatedAt: NOW,
        updatedBy: uidFor(ORG_A, 'OWNER'),
      }),
    );
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.privatePartner(ORG_A, 'pp-forged-status')), {
        partnerId: 'pp-forged-status',
        partnerTypes: ['SUPPLIER'],
        name: 'Forged',
        status: 'DEACTIVATED',
        ordersPlacedCount: 0,
        createdAt: NOW,
        createdBy: uidFor(ORG_A, 'OWNER'),
        updatedAt: NOW,
        updatedBy: uidFor(ORG_A, 'OWNER'),
      }),
    );
  });
});

describe('purchaseOrders — client write only while PRIVATE and DRAFT', () => {
  const draftPayload = (id: string, role: Role) => ({
    purchaseOrderId: id,
    viewRole: 'BUYER',
    supplierKind: 'PRIVATE',
    counterpartyName: 'Green Farm Poultry',
    privateSupplierId: IDS.partner,
    status: 'DRAFT',
    currency: 'LKR',
    totalMinor: 0,
    isProjection: false,
    createdBy: uidFor(ORG_A, role),
    createdAt: NOW,
    updatedAt: NOW,
  });

  it.each(ROLES.map((role) => [role]))('create a private draft · %s', async (role) => {
    const create = setDoc(
      doc(forRole(role), paths.purchaseOrder(ORG_A, `po-${role}`)),
      draftPayload(`po-${role}`, role),
    );
    if (PO_WRITERS.includes(role)) await assertSucceeds(create);
    else await assertFails(create);
  });

  it('denies creating a CONNECTED order directly — cpo.draftSave owns it (DB-CR-010)', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.purchaseOrder(ORG_A, 'po-connected-forged')), {
        ...draftPayload('po-connected-forged', 'OWNER'),
        supplierKind: 'CONNECTED',
      }),
    );
  });

  it('denies creating an order already past DRAFT', async () => {
    await assertFails(
      setDoc(doc(forRole('OWNER'), paths.purchaseOrder(ORG_A, 'po-preborn-ordered')), {
        ...draftPayload('po-preborn-ordered', 'OWNER'),
        status: 'ORDERED',
      }),
    );
  });

  it('allows a PO writer to edit the draft fields', async () => {
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

  it('denies editing a field outside the draft allowlist', async () => {
    await assertFails(
      updateDoc(doc(forRole('OWNER'), paths.purchaseOrder(ORG_A, IDS.privateDraftPo)), {
        orderNumber: 'PO-2026-999',
      }),
    );
  });

  it('denies a self-transition out of DRAFT', async () => {
    await assertFails(
      updateDoc(doc(forRole('OWNER'), paths.purchaseOrder(ORG_A, IDS.privateDraftPo)), {
        status: 'ORDERED',
      }),
    );
  });

  it('denies flipping supplierKind', async () => {
    await assertFails(
      updateDoc(doc(forRole('OWNER'), paths.purchaseOrder(ORG_A, IDS.privateDraftPo)), {
        supplierKind: 'CONNECTED',
      }),
    );
  });

  it('denies editing an order that has left DRAFT', async () => {
    await assertFails(
      updateDoc(doc(forRole('OWNER'), paths.purchaseOrder(ORG_A, IDS.privateOrderedPo)), {
        counterpartyName: 'Renamed after ordering',
        updatedAt: NOW,
      }),
    );
  });

  it('denies editing a CONNECTED draft', async () => {
    await assertFails(
      updateDoc(doc(forRole('OWNER'), paths.purchaseOrder(ORG_A, IDS.connectedPo)), {
        counterpartyName: 'Renamed connected draft',
        updatedAt: NOW,
      }),
    );
  });

  it('allows a PO writer to add an item to an editable private draft', async () => {
    await assertSucceeds(
      setDoc(doc(forRole('OWNER'), paths.purchaseOrderItem(ORG_A, IDS.privateDraftPo, 'item-2')), {
        itemId: 'item-2',
        buyerProductId: IDS.product,
        orderedBuyerBaseMilli: 5_000,
        receivedBuyerBaseMilli: 0,
        unitPriceMinor: 125_000,
        lineTotalMinor: 625_000,
        currency: 'LKR',
      }),
    );
  });

  it('denies adding an item to an order that has left DRAFT', async () => {
    await assertFails(
      setDoc(
        doc(forRole('OWNER'), paths.purchaseOrderItem(ORG_A, IDS.privateOrderedPo, 'item-late')),
        { itemId: 'item-late', orderedBuyerBaseMilli: 1_000 },
      ),
    );
  });

  it('denies every client write to the immutable history subcollection', async () => {
    await assertFails(
      setDoc(
        doc(forRole('OWNER'), paths.purchaseOrderHistory(ORG_A, IDS.privateDraftPo, 'hist-forged')),
        { historyId: 'hist-forged', toStatus: 'ORDERED' },
      ),
    );
    await assertFails(
      updateDoc(
        doc(forRole('OWNER'), paths.purchaseOrderHistory(ORG_A, IDS.privateDraftPo, IDS.poHistory)),
        { toStatus: 'CANCELLED' },
      ),
    );
  });
});

describe('DB-05 §9 group 4 — command-only collections deny direct writes for EVERY role', () => {
  const protectedPaths: readonly (readonly [string, string])[] = [
    ['organizations/{orgId}', paths.organization(ORG_A)],
    ['settings/main', paths.settings(ORG_A)],
    ['counters', paths.counter(ORG_A, IDS.counter)],
    ['commandReceipts', paths.commandReceipt(ORG_A, IDS.receipt)],
    ['productSkuIndex', paths.productSkuIndex(ORG_A, IDS.skuIndex)],
    ['members', paths.member(ORG_A, uidFor(ORG_A, 'VIEWER'))],
    ['invitations', paths.invitation(ORG_A, IDS.invitation)],
    ['products', paths.product(ORG_A, IDS.product)],
    ['stockBalances', paths.stockBalance(ORG_A, IDS.product, IDS.warehouse)],
    ['productStockSummaries', paths.productStockSummary(ORG_A, IDS.product)],
    ['stockMovements', paths.stockMovement(ORG_A, IDS.movement)],
    ['partnerCatalog', paths.partnerCatalogItem(ORG_A, IDS.catalogItem)],
    ['productMappings', paths.productMapping(ORG_A, IDS.mapping)],
    ['connections (projection)', paths.connectionProjection(ORG_A, CONNECTION_ID)],
    ['auditLogs', paths.auditLog(ORG_A, IDS.audit)],
  ];

  it.each(protectedPaths.map(([label, path]) => [label, path]))(
    'denies create, update and delete on %s',
    async (_label, path) => {
      for (const role of ROLES) {
        const client = forRole(role);
        await assertFails(setDoc(doc(client, `${path}-forged`), { forged: true }));
        await assertFails(updateDoc(doc(client, path), { forged: true }));
        await assertFails(deleteDoc(doc(client, path)));
      }
    },
  );
});

describe('T-SEC-37 · the derived stock fields cannot be forged directly', () => {
  it('denies a client writing stockValueMinor, stockStatus or shortfallMilli', async () => {
    const balance = doc(forRole('OWNER'), paths.stockBalance(ORG_A, IDS.product, IDS.warehouse));
    await assertFails(updateDoc(balance, { stockValueMinor: 0 }));
    await assertFails(updateDoc(balance, { stockStatus: 'IN_STOCK' }));
    await assertFails(updateDoc(balance, { shortfallMilli: 0 }));
    await assertFails(updateDoc(balance, { onHandMilli: 999_000 }));
  });
});

describe('DB-05 §9 group 5 — audit immutability', () => {
  it('AUDIT_CLIENT_CREATE = DENIED for every role including Owner', async () => {
    for (const role of ROLES) {
      await assertFails(
        setDoc(doc(forRole(role), paths.auditLog(ORG_A, `audit-forged-${role}`)), {
          actorUid: uidFor(ORG_A, role),
          action: 'stock.transfer',
          summary: 'Forged',
        }),
      );
    }
  });

  it('AUDIT_CLIENT_UPDATE = DENIED for every role including Owner', async () => {
    for (const role of ROLES) {
      await assertFails(
        updateDoc(doc(forRole(role), paths.auditLog(ORG_A, IDS.audit)), { summary: 'Rewritten' }),
      );
    }
  });

  it('AUDIT_CLIENT_DELETE = DENIED for every role including Owner', async () => {
    for (const role of ROLES) {
      await assertFails(deleteDoc(doc(forRole(role), paths.auditLog(ORG_A, IDS.audit))));
    }
  });
});
