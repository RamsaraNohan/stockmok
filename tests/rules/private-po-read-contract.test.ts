import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, type Firestore } from 'firebase/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { paths } from '../../packages/shared/src/paths.js';
import type { Role } from '../../packages/shared/src/primitives.js';
import { PurchaseOrderSchema } from '../../packages/shared/src/schemas/procurement.js';
import {
  asUser,
  closeTestEnvironment,
  getTestEnvironment,
  ORG_A,
  seedFixtures,
  uidFor,
} from './harness.js';

/**
 * The private purchase-order draft must satisfy the **frozen read contract**,
 * not merely the write rules.
 *
 * `validated-shapes.test.ts` proves the ruleset rejects malformed drafts. It
 * cannot prove the accepted document is *readable*: every case there asserts on
 * the write alone. These cases close that loop — they persist a draft through
 * the real rules-enforced client path and then parse the **document Firestore
 * actually stored** with `PurchaseOrderSchema`, which is the converter behind
 * `Q-036` (`procurement.getOrder`).
 *
 * `PurchaseOrderSchema` is `.strict()` and the DB-02 §5.2 field table carries no
 * `updatedAt`. DB-05 §4.1 names `updatedAt` only inside `draftFieldsOnly()`,
 * whose `onlyChanged(...)` bounds **which fields may change**; a mutation
 * allowlist does not declare a field into the physical schema. DB-02 is the
 * shape authority and DB-05 is the authorization authority, so the strict
 * document shape governs here.
 *
 * Attribution is unaffected: DB-01 §12 binds an edit to `updatedBy`, and the
 * purchase-order draft has never carried one (contrast `categories`,
 * `warehouses` and `privatePartners`, whose DB-02 rows do define
 * `updatedAt`/`updatedBy` and which are asserted in
 * `attribution-and-draft-quantity.test.ts`).
 */

let env: RulesTestEnvironment;

const NOW = new Date('2026-08-03T00:00:00.000Z');

function forRole(role: Role): Firestore {
  return asUser(env, uidFor(ORG_A, role)).firestore() as unknown as Firestore;
}

/** The draft shape DB-02 §5.2 defines — and nothing else. */
const validDraft = (purchaseOrderId: string, createdBy: string) => ({
  purchaseOrderId,
  viewRole: 'BUYER',
  supplierKind: 'PRIVATE',
  counterpartyName: 'Green Farm Poultry',
  status: 'DRAFT',
  currency: 'LKR',
  totalMinor: 0,
  isProjection: false,
  createdBy,
  createdAt: NOW,
});

beforeAll(async () => {
  env = await getTestEnvironment();
  await seedFixtures(env);
});

afterAll(async () => {
  await closeTestEnvironment();
});

describe('private purchase-order drafts satisfy the frozen strict read contract', () => {
  const PM: Role = 'PROCUREMENT_MANAGER';

  it('allows a legitimate draft carrying exactly the DB-02 §5.2 fields', async () => {
    const uid = uidFor(ORG_A, PM);
    await assertSucceeds(
      setDoc(
        doc(forRole(PM), paths.purchaseOrder(ORG_A, 'po-read-contract-ok')),
        validDraft('po-read-contract-ok', uid),
      ),
    );
  });

  it('denies a draft carrying updatedAt, which the strict schema forbids', async () => {
    const uid = uidFor(ORG_A, PM);
    // The positive twin above proves role, tenant, status and every other shape
    // condition are satisfied, so this denial is attributable to `updatedAt`
    // and to nothing else.
    await assertFails(
      setDoc(doc(forRole(PM), paths.purchaseOrder(ORG_A, 'po-read-contract-extra')), {
        ...validDraft('po-read-contract-extra', uid),
        updatedAt: NOW,
      }),
    );
  });

  it('denies introducing updatedAt on a later draft edit', async () => {
    const uid = uidFor(ORG_A, PM);
    const id = 'po-read-contract-edit';
    const ref = doc(forRole(PM), paths.purchaseOrder(ORG_A, id));
    await assertSucceeds(setDoc(ref, validDraft(id, uid)));
    // The legitimate edit still succeeds…
    await assertSucceeds(updateDoc(ref, { counterpartyName: 'Green Farm Poultry Ltd' }));
    // …but it cannot smuggle the field in afterwards.
    await assertFails(updateDoc(ref, { updatedAt: NOW }));
  });

  it('the ACTUAL persisted draft parses through PurchaseOrderSchema', async () => {
    const uid = uidFor(ORG_A, PM);
    const id = 'po-read-contract-parse';
    const ref = doc(forRole(PM), paths.purchaseOrder(ORG_A, id));
    await assertSucceeds(setDoc(ref, validDraft(id, uid)));

    // Read back what Firestore stored, exactly as `Q-036` would.
    const snapshot = await getDoc(ref);
    expect(snapshot.exists()).toBe(true);
    const actual = snapshot.data() as Record<string, unknown>;

    const unknownKeys = Object.keys(actual).filter((key) => !(key in PurchaseOrderSchema.shape));
    expect(unknownKeys, 'unauthorised field(s) on the persisted private draft').toEqual([]);

    const parsed = PurchaseOrderSchema.safeParse(actual);
    expect(
      parsed.success ? [] : parsed.error.issues.map((issue) => issue.message),
      'PurchaseOrderSchema.parse of the persisted private draft',
    ).toEqual([]);
  });

  it('a draft edited through the sanctioned path still parses afterwards', async () => {
    const uid = uidFor(ORG_A, PM);
    const id = 'po-read-contract-parse-edited';
    const ref = doc(forRole(PM), paths.purchaseOrder(ORG_A, id));
    await assertSucceeds(setDoc(ref, validDraft(id, uid)));
    await assertSucceeds(
      updateDoc(ref, {
        counterpartyName: 'Green Farm Poultry Ltd',
        expectedDate: NOW,
        totalMinor: 1_300_000,
      }),
    );

    const actual = (await getDoc(ref)).data() as Record<string, unknown>;
    expect(Object.keys(actual)).not.toContain('updatedAt');
    const parsed = PurchaseOrderSchema.safeParse(actual);
    expect(
      parsed.success ? [] : parsed.error.issues.map((issue) => issue.message),
      'PurchaseOrderSchema.parse after a sanctioned draft edit',
    ).toEqual([]);
    expect(actual.totalMinor).toBe(1_300_000);
  });
});
