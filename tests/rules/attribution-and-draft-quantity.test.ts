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
  ORG_B,
  seedFixtures,
  uidFor,
} from './harness.js';

/**
 * `BACKEND-IR-001` second review — the two properties the first repair left
 * open, each attacked on its own.
 *
 * **A. `DRAFT_RECEIVED_ZERO`.** DB-07 §8 draws no `receive` edge out of
 * `DRAFT`; receipt is reachable only from `ORDERED` / `PARTIALLY_RECEIVED`, and
 * `ORDERED → CANCELLED` is guarded "only while `receivedTotal == 0`". DB-06
 * §3.3 makes `C-17 po.receive` the sole writer of private received quantity and
 * pairs every increase with one `PURCHASE_RECEIPT` movement per line per receipt
 * event. A client-written private draft line has therefore received exactly
 * nothing: a positive value is received stock with no ledger entry behind it —
 * `ATTACK-15` (DB-05 §4.9) in a new location — and bounding it by the ordered
 * quantity is not sufficient.
 *
 * **B. `UPDATEDBY_CALLER_BOUND`.** Control Pack file 11 §16 (RC-15) and DB-01
 * §12: ordinary field edits rely on `updatedBy` / `updatedAt` *rather than an
 * audit row*, so on a `SAFE_DIRECT_CLIENT_WRITE` surface `updatedBy` **is** the
 * audit trail for that edit — and an audit actor is server-derived, never
 * client-asserted (DB-01 §12, DB-05 §7). No trusted command runs on a direct
 * client write, so `firestore.rules` is the only enforcement point and
 * `request.auth.uid` is the only server-derived actor it has.
 *
 * Every attack below is a **single-field delta**: the identical document is
 * first proved to succeed with the honest value, then re-sent with exactly one
 * field changed. A denial therefore cannot be explained by role, tenant, parent
 * state or any other shape condition — those are held constant and shown to
 * pass. Cross-role edits stay legal: `updatedBy` names the writer making *this*
 * edit and is never required to equal `createdBy`.
 */

let env: RulesTestEnvironment;

const NOW = new Date('2026-08-05T00:00:00.000Z');

/** Two writers who both hold the role each surface below requires. */
const IM_A = uidFor(ORG_A, 'INVENTORY_MANAGER');
const ADMIN_A = uidFor(ORG_A, 'ADMIN');
const PM_A = uidFor(ORG_A, 'PROCUREMENT_MANAGER');
const OWNER_A = uidFor(ORG_A, 'OWNER');
/** A principal holding no role at all in ORG_A, used as a forgery target. */
const OUTSIDER = uidFor(ORG_B, 'OWNER');

function db(uid: string): Firestore {
  return asUser(env, uid).firestore() as unknown as Firestore;
}

beforeAll(async () => {
  env = await getTestEnvironment();
  await seedFixtures(env);
});

afterAll(async () => {
  await closeTestEnvironment();
});

// ═══════════════════════════════════════════════════════════════════════════
// A — DRAFT_RECEIVED_ZERO
// ═══════════════════════════════════════════════════════════════════════════

describe('private DRAFT lines — receivedBuyerBaseMilli is pinned to zero (DB-07 §8)', () => {
  const ORDERED_MILLI = 5_000;

  const line = (itemId: string, receivedBuyerBaseMilli: number): Record<string, unknown> => ({
    itemId,
    buyerProductId: IDS.product,
    buyerProductNameSnapshot: 'Chicken Breast',
    buyerSkuSnapshot: 'SKU-1',
    buyerBaseUnitSnapshot: 'KG',
    orderedBuyerBaseMilli: ORDERED_MILLI,
    receivedBuyerBaseMilli,
    unitPriceMinor: 125_000,
    lineTotalMinor: 625_000,
    currency: 'LKR',
  });

  const itemRef = (uid: string, itemId: string): ReturnType<typeof doc> =>
    doc(db(uid), paths.purchaseOrderItem(ORG_A, IDS.privateDraftPo, itemId));

  const PO_WRITER_ROLES: readonly Role[] = ['OWNER', 'ADMIN', 'PROCUREMENT_MANAGER'];

  it('denies a create carrying one milli-unit of received stock', async () => {
    // The honest document first: same writer, same parent draft, same shape.
    await assertSucceeds(setDoc(itemRef(PM_A, 'zero-control-one'), line('zero-control-one', 0)));
    // Exactly one field differs.
    await assertFails(setDoc(itemRef(PM_A, 'received-one'), line('received-one', 1)));
  });

  it('denies a create whose received quantity equals the ordered quantity', async () => {
    await assertSucceeds(setDoc(itemRef(PM_A, 'zero-control-full'), line('zero-control-full', 0)));
    await assertFails(setDoc(itemRef(PM_A, 'received-full'), line('received-full', ORDERED_MILLI)));
  });

  it('denies a create whose received quantity is a legal-looking partial receipt', async () => {
    await assertFails(
      setDoc(itemRef(PM_A, 'received-partial'), line('received-partial', ORDERED_MILLI - 1)),
    );
  });

  it('denies moving an existing DRAFT line from zero to positive', async () => {
    await assertSucceeds(setDoc(itemRef(PM_A, 'edit-target'), line('edit-target', 0)));

    // A legitimate edit of the same document by the same writer succeeds …
    await assertSucceeds(
      updateDoc(itemRef(PM_A, 'edit-target'), {
        orderedBuyerBaseMilli: 8_000,
        lineTotalMinor: 1_000_000,
      }),
    );
    // … and the only thing that changes below is the received quantity.
    await assertFails(updateDoc(itemRef(PM_A, 'edit-target'), { receivedBuyerBaseMilli: 1 }));
    await assertFails(updateDoc(itemRef(PM_A, 'edit-target'), { receivedBuyerBaseMilli: 8_000 }));
    // A whole-document overwrite is the same write, and is refused identically.
    await assertFails(setDoc(itemRef(PM_A, 'edit-target'), line('edit-target', 2_500)));
  });

  it('denies it for every PO_WRITERS role, with the zero-valued twin allowed', async () => {
    for (const role of PO_WRITER_ROLES) {
      const uid = uidFor(ORG_A, role);
      const allowed = `role-zero-${role.toLowerCase()}`;
      const denied = `role-positive-${role.toLowerCase()}`;
      await assertSucceeds(setDoc(itemRef(uid, allowed), line(allowed, 0)));
      await assertFails(setDoc(itemRef(uid, denied), line(denied, 1)));
    }
  });

  it('still allows the legitimate zero-received create and draft edit', async () => {
    await assertSucceeds(setDoc(itemRef(OWNER_A, 'legit-line'), line('legit-line', 0)));
    await assertSucceeds(
      updateDoc(itemRef(OWNER_A, 'legit-line'), {
        orderedBuyerBaseMilli: 12_000,
        lineTotalMinor: 1_500_000,
      }),
    );
    await assertSucceeds(
      setDoc(itemRef(OWNER_A, 'legit-line'), {
        ...line('legit-line', 0),
        buyerProductNameSnapshot: 'Chicken Breast Fillet',
      }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// B — UPDATEDBY_CALLER_BOUND
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The three `SAFE_DIRECT_CLIENT_WRITE` surfaces whose persisted shape carries
 * `updatedBy` — DB-02 §4.1, §4.2 and §5.1. `users` (§2.1), `notifications`
 * (§2.3), private draft PO headers (§5.2) and their items (§5.3) define no such
 * field; those four are asserted at the end of this file, so the binding is
 * applied where the field exists and nowhere else.
 */
interface AttributionSurface {
  readonly label: string;
  readonly path: (id: string) => string;
  /** Two writers who both hold the role this surface requires. */
  readonly writerA: string;
  readonly writerB: string;
  readonly document: (id: string, createdBy: string, updatedBy: string) => Record<string, unknown>;
  /** A field this surface lets a client legitimately edit. */
  readonly edit: Record<string, unknown>;
}

const SURFACES: readonly AttributionSurface[] = [
  {
    label: 'categories',
    path: (id) => paths.category(ORG_A, id),
    writerA: IM_A,
    writerB: ADMIN_A,
    document: (id, createdBy, updatedBy) => ({
      categoryId: id,
      name: 'Dairy',
      status: 'ACTIVE',
      createdAt: NOW,
      createdBy,
      updatedAt: NOW,
      updatedBy,
    }),
    edit: { name: 'Dairy and Chilled' },
  },
  {
    label: 'warehouses',
    path: (id) => paths.warehouse(ORG_A, id),
    writerA: IM_A,
    writerB: ADMIN_A,
    document: (id, createdBy, updatedBy) => ({
      warehouseId: id,
      name: 'Cold Room',
      type: 'REFRIGERATED',
      status: 'ACTIVE',
      createdAt: NOW,
      createdBy,
      updatedAt: NOW,
      updatedBy,
    }),
    edit: { name: 'Cold Room Two' },
  },
  {
    label: 'privatePartners',
    path: (id) => paths.privatePartner(ORG_A, id),
    writerA: PM_A,
    writerB: ADMIN_A,
    document: (id, createdBy, updatedBy) => ({
      partnerId: id,
      partnerTypes: ['SUPPLIER'],
      name: 'Green Farm Poultry',
      status: 'ACTIVE',
      ordersPlacedCount: 0,
      createdAt: NOW,
      createdBy,
      updatedAt: NOW,
      updatedBy,
    }),
    edit: { contactPerson: 'Nimal Perera' },
  },
];

describe.each(SURFACES.map((surface) => [surface.label, surface] as const))(
  '%s — updatedBy is bound to the authenticated writer',
  (label, surface) => {
    const ref = (uid: string, id: string): ReturnType<typeof doc> => doc(db(uid), surface.path(id));

    it('denies a create that attributes the write to another authorized writer', async () => {
      const honest = `${label}-create-honest`;
      await assertSucceeds(
        setDoc(
          ref(surface.writerA, honest),
          surface.document(honest, surface.writerA, surface.writerA),
        ),
      );
      const forged = `${label}-create-forged`;
      await assertFails(
        setDoc(
          ref(surface.writerA, forged),
          surface.document(forged, surface.writerA, surface.writerB),
        ),
      );
    });

    it('denies a create attributed to a principal with no role in this organization', async () => {
      const id = `${label}-create-outsider`;
      await assertFails(
        setDoc(ref(surface.writerA, id), surface.document(id, surface.writerA, OUTSIDER)),
      );
    });

    it('denies an update that signs the edit as another authorized writer', async () => {
      const id = `${label}-update-forged`;
      await assertSucceeds(
        setDoc(ref(surface.writerA, id), surface.document(id, surface.writerA, surface.writerA)),
      );
      // The same edit, honestly attributed, is allowed …
      await assertSucceeds(
        updateDoc(ref(surface.writerA, id), {
          ...surface.edit,
          updatedAt: NOW,
          updatedBy: surface.writerA,
        }),
      );
      // … and only `updatedBy` differs here.
      await assertFails(
        updateDoc(ref(surface.writerA, id), {
          ...surface.edit,
          updatedAt: NOW,
          updatedBy: surface.writerB,
        }),
      );
    });

    it('denies an edit that leaves the previous writer attribution behind', async () => {
      const id = `${label}-update-stale`;
      await assertSucceeds(
        setDoc(ref(surface.writerA, id), surface.document(id, surface.writerA, surface.writerA)),
      );
      // Writer B edits without re-attributing: the document still names A.
      await assertFails(updateDoc(ref(surface.writerB, id), { ...surface.edit, updatedAt: NOW }));
      // The same edit by the same writer, re-attributed, is allowed.
      await assertSucceeds(
        updateDoc(ref(surface.writerB, id), {
          ...surface.edit,
          updatedAt: NOW,
          updatedBy: surface.writerB,
        }),
      );
    });

    it('allows a second authorized writer to edit a record created by the first', async () => {
      const id = `${label}-cross-role`;
      await assertSucceeds(
        setDoc(ref(surface.writerA, id), surface.document(id, surface.writerA, surface.writerA)),
      );
      // Writer B holds the role, edits later, and signs it as themselves.
      // `createdBy` still names A — updatedBy is never required to equal it.
      await assertSucceeds(
        updateDoc(ref(surface.writerB, id), {
          ...surface.edit,
          updatedAt: NOW,
          updatedBy: surface.writerB,
        }),
      );
      // And A may take the document back afterwards.
      await assertSucceeds(
        updateDoc(ref(surface.writerA, id), {
          ...surface.edit,
          updatedAt: NOW,
          updatedBy: surface.writerA,
        }),
      );
      // Creation provenance stays immutable throughout.
      await assertFails(
        updateDoc(ref(surface.writerB, id), {
          updatedAt: NOW,
          updatedBy: surface.writerB,
          createdBy: surface.writerB,
        }),
      );
    });
  },
);

describe('surfaces that carry no updatedBy — DB-02 §§2.1, 2.3, 5.2, 5.3', () => {
  it('denies updatedBy as an undeclared key on a private draft header and line', async () => {
    const header: Record<string, unknown> = {
      purchaseOrderId: 'po-attr-header',
      viewRole: 'BUYER',
      supplierKind: 'PRIVATE',
      counterpartyName: 'Green Farm Poultry',
      privateSupplierId: IDS.partner,
      status: 'DRAFT',
      currency: 'LKR',
      totalMinor: 0,
      isProjection: false,
      createdBy: PM_A,
      createdAt: NOW,
    };
    await assertSucceeds(
      setDoc(doc(db(PM_A), paths.purchaseOrder(ORG_A, 'po-attr-header')), header),
    );
    await assertFails(
      setDoc(doc(db(PM_A), paths.purchaseOrder(ORG_A, 'po-attr-header-forged')), {
        ...header,
        purchaseOrderId: 'po-attr-header-forged',
        updatedBy: PM_A,
      }),
    );
    // `updatedAt` is undeclared here for the same reason `updatedBy` is: DB-02
    // §5.2 defines neither, and the strict `PurchaseOrderSchema` behind `Q-036`
    // would refuse to read the document back.
    await assertFails(
      setDoc(doc(db(PM_A), paths.purchaseOrder(ORG_A, 'po-attr-header-touched')), {
        ...header,
        purchaseOrderId: 'po-attr-header-touched',
        updatedAt: NOW,
      }),
    );
    await assertFails(
      setDoc(doc(db(PM_A), paths.purchaseOrderItem(ORG_A, IDS.privateDraftPo, 'line-attr')), {
        itemId: 'line-attr',
        buyerProductId: IDS.product,
        buyerProductNameSnapshot: 'Chicken Breast',
        buyerSkuSnapshot: 'SKU-1',
        buyerBaseUnitSnapshot: 'KG',
        orderedBuyerBaseMilli: 5_000,
        receivedBuyerBaseMilli: 0,
        unitPriceMinor: 125_000,
        lineTotalMinor: 625_000,
        currency: 'LKR',
        updatedBy: PM_A,
      }),
    );
  });

  it('denies updatedBy on a user profile and on a notification', async () => {
    await assertFails(
      updateDoc(doc(db(OWNER_A), paths.user(OWNER_A)), {
        displayName: 'Nohan',
        updatedBy: OWNER_A,
      }),
    );
    await assertFails(
      updateDoc(doc(db(OWNER_A), paths.notification(OWNER_A, IDS.notification)), {
        read: true,
        updatedBy: OWNER_A,
      }),
    );
    // The same writes without the invented field are allowed.
    await assertSucceeds(
      updateDoc(doc(db(OWNER_A), paths.user(OWNER_A)), { displayName: 'Nohan' }),
    );
    await assertSucceeds(
      updateDoc(doc(db(OWNER_A), paths.notification(OWNER_A, IDS.notification)), { read: true }),
    );
  });
});
