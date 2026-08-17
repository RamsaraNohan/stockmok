# DB-09 — CODEX FIREBASE / DATA-FOUNDATION IMPLEMENTATION BRIEF

**Audience:** Codex, acting as the deterministic data-platform implementer.
**Authority:** this brief plus DB-00 → DB-08. Where they disagree, DB-00 → DB-08 win.
**Rule above all others:** *if a decision is not written down, stop and ask. Do not choose.*

---

## 1. READ FIRST — in this order, before writing any file

1. `docs/database-final/DB_00_AUTHORITY_AMENDMENT_A1_TRANSFER.md` — what changed and why
2. `DB_02_FINAL_FIRESTORE_PHYSICAL_SCHEMA.md` — every document and field you will type
3. `DB_04_FINAL_QUERY_INDEX_PAGINATION_REALTIME_CONTRACT.md` — the authority for `firestore.indexes.json`
4. `DB_06_FINAL_COMMAND_TRANSACTION_CONTRACT.md` — command signatures you will generate types for
5. `DB_07_FINAL_STATE_MACHINE_AND_INVARIANT_CONTRACT.md` — the transition tables you will encode
6. `DB_08_FINAL_SEED_MIGRATION_AND_DATABASE_TEST_PLAN.md` — the seed you will build
7. `DB_05_FINAL_DATABASE_SECURITY_AND_TENANT_MATRIX.md` — **read for context; you do not implement it**
8. `Stockmok_Final_Control_Pack_v4/11_FINAL_FIREBASE_IMPLEMENTATION_ARCHITECTURE.md` §1–3, §27–29
9. `FIREBASE_PROJECT_FACTS.md` — the provisioned truth

---

## 2. YOU OWN

| Area | Deliverable |
|---|---|
| Firebase config | `.firebaserc`, `firebase.json` (hosting, firestore, functions, emulators), `.env.example` |
| Emulator Suite | auth 9099 · firestore 8080 · functions 5001 · hosting 5000 · UI 4000 · `singleProjectMode: true` · `.emulator-data/` git-ignored |
| Indexes | `firestore.indexes.json` — **exactly `IDX-01 … IDX-69` less the deleted `IDX-03` and `IDX-19` = 67 composite indexes, from DB-04 §7**, no more, no fewer. The 32-index product-list matrix is **generated from the DB-CR-038 rule**, not transcribed. *(HISTORICAL: A2 raised the set 38 → 43; A3 → 44; **A3R → 67**. The figure "44 total" that stood here is SUPERSEDED.)* There is no `IDX-33` on `products`; the `category.archive` guard is `IDX-38`. |
| Shared types | `src/shared/types/` — every enum and document interface from DB-02, with branded `Milli` and `Minor` types |
| Schemas | `src/shared/schemas/` — one Zod schema per document and per command payload; the **same** object validates the browser form and re-validates inside the function |
| Converters | typed `FirestoreDataConverter` per collection; typed collection-reference helpers so a path string appears **once** in the codebase |
| Path contract | `src/shared/contracts/paths.ts` — every path from DB-01 §4 as a typed builder; **no string concatenation of paths anywhere else** |
| Domain utilities | money/milli arithmetic with half-up rounding, `deriveStockStatus`, unit conversion, handle normalisation + reserved-word list, SKU normalisation, payload hashing — all pure, all unit-tested at the boundary |
| Transition tables | DB-07 §1–§9 as data, plus `canTransition()`; **table only — no command bodies** |
| Seed and reset | `scripts/seed.ts`, `scripts/reset.ts` per DB-08 §5, writing **through the command layer** |
| Fixtures and factories | `tests/factories/**` per DB-08 §8 |
| Query/data test infrastructure | rules-test harness, emulator bootstrap, the property-test generator skeleton, CI wiring |
| Repository scaffolding | `src/data/**` read-side query functions with the Q-ids from DB-04 as their names |

---

## 3. YOU MAY CREATE

`firebase.json` · `.firebaserc` · `firestore.indexes.json` · `functions/` scaffold (config, tsconfig,
`index.ts` that re-exports **only**; **no command bodies**) · `packages/shared/**` · `src/shared/**` ·
`src/data/**` · `scripts/**` · `tests/factories/**` · `tests/setup/**` · CI workflow · `README` sections
covering emulator start, seed and verify.

## 4. YOU MUST NOT TOUCH

- **`firestore.rules`** — Claude Code owns it. Not a stub, not a placeholder, not "just the helpers".
- **Any command body** in `functions/src/commands/**`, and **`defineCommand()`**, `idempotency.ts`,
  `audit.ts`, `notify.ts` — Claude Code owns every one.
- Any file under `docs/final/`, `docs/ui-final/`, `docs/audit-final/`, `Stockmok_Final_Control_Pack_v4/`,
  or `visual-designs/`.
- The React application, screens, routing or design tokens.
- `FIREBASE_PROJECT_FACTS.md`.

## 5. FROZEN DECISIONS — do not revisit, do not "improve"

| | |
|---|---|
| Roles | **seven**, exactly: `OWNER, ADMIN, INVENTORY_MANAGER, PROCUREMENT_MANAGER, STOREKEEPER, ANALYST, VIEWER` |
| Zones | four; `handleReservations`, `connections`, `connectedPurchaseOrders` are **closed to clients** |
| Paths | DB-01 §4 verbatim; no family may move, be added or be removed |
| Quantities | integer **milli**-units, 3 dp max, `unit` always stored alongside |
| Money | integer **minor** units, explicit `currency`, half-up rounding, **no floats, ever** |
| Deterministic ids | `{buyerOrgId}__{supplierOrgId}` · `{productId}__{warehouseId}` · `{productId}` · normalised SKU · normalised handle · `operationId` |
| Handle | lowercase `[a-z0-9-]`, **3–30**, reserved-word list enforced |
| Pagination | cursor `startAfter`, page 25, hard max 100, **never offset** |
| Sorting | indexed fields only |
| Deletes | **denied everywhere**; archive or deactivate instead |
| Stock truth | the ledger; balances and summaries are transactional derivations |
| Transfer | **one product**, same organization, different warehouses, positive quantity, paired movements, summary untouched |
| `movementKind` | **derived, never persisted** — DB-02 §0.2 |
| Realtime | exactly the four listeners in DB-03 §5 |
| Endpoints | callables only — **zero HTTP, zero Firestore triggers** |
| Runtime | Cloud Functions **2nd gen, Node 22** (Node 20 is deprecated), region **`asia-southeast1`** |

## 6. IMPLEMENT

1. Repository scaffold, TypeScript strict, ESLint (including the lint rule that keeps UI components out
   of data and command services — `NFR-011`), Prettier, CI.
2. `firebase.json` + `.firebaserc` for project **`stockmok`**, emulators per §2. **Do not run
   `firebase init` against the live project, do not deploy, do not enable billing.**
3. `firestore.indexes.json` — **`IDX-01 … IDX-69` less `IDX-03` and `IDX-19` = 67 composite**, the 32-index product-list matrix **generated** from the DB-CR-038 rule. **Do not deploy it.**
4. Shared types, branded numerics, Zod schemas, converters, typed path builders.
5. Domain utilities, each with a unit test at the rounding and precedence boundaries — including
   `deriveStockStatus` proving that *exactly at the minimum is **not** low*.
6. Transition tables + `canTransition()` + their unit tests.
7. Read-side query functions named for their Q-ids, each carrying its `.limit()` and cursor.
8. `scripts/seed.ts` and `scripts/reset.ts`; `reset` must refuse `--target=production` unconditionally.
9. Factories and the emulator test harness; the property-test **generator** (Claude Code writes the
   assertions that touch security).
10. `README`: emulator start, seed, verify, and the deploy order (indexes → rules → functions → build →
    hosting) as documentation only.

## 7. DO NOT IMPLEMENT

Security Rules · any command body · `defineCommand()` · audit or notification writers · cross-tenant
projection logic · the React app · Cloud Storage · App Check · Firestore triggers · HTTP endpoints ·
a scheduled reconciliation job · a distributed counter · full-text search · a migration (there is no
legacy data) · anything for Release C or D.

## 7.A3 — what A3 changed for you, in one list

Read `DB_00` §8 before anything else. The deltas that touch your scaffolding:

- **Types.** `Unit` = `KG | L | EACH | PACK` only. `organizations.status` = `'ACTIVE'` only.
  `users.status` = `'ACTIVE'` only. `DirectoryStatus` = `'LISTED'` only. `InviteStatus.EXPIRED` stays but
  is **derived on read** (`Q-010` filters `expiresAt > now`).
- **`StockBalance`** gains `stockValueMinor`, `stockStatus`, `shortfallMilli`; **loses `warehouseName`**.
- **`ProductStockSummary`** gains `shortfallMilli`.
- **`StockMovement`** gains `sourceReferenceSnapshot?`, `warehouseNameSnapshot`,
  `counterpartWarehouseNameSnapshot?` (DV-14).
- **`Product`** loses `preferredPrivateSupplierId`. **`Organization`** loses `currency` and `timezone`
  (they live on `settings/main`).
- **`PrivatePartner`** gains `ordersPlacedCount` — **backend-write-only**. Exclude it **and `status`**
  from any client-write helper you generate; archive/restore is `C-38`.
- **`PartnerCatalogItem`** gains `internalProductNameSnapshot`, `internalSkuSnapshot`;
  **`ProductMapping`** gains `buyerProductNameSnapshot`, `buyerSkuSnapshot`, `semanticConfirmedByName`;
  **`Notification`** gains `category`.
- **`deriveStockStatus` is required at both grains** and additionally
  `deriveShortfall(minimumStockMilli, onHandMilli)` and
  `deriveStockValueMinor(onHandMilli, baseUnitPriceMinor)` — all three pure, all three unit-tested against
  the canonical twelve products. **`ProductStockSummary.stockValueMinor` is the SUM of that product's
  balance values (`INV-27`), never an independent rounding of the product total.**
- **Indexes: 67.** `IDX-44 … IDX-69` added, `IDX-03`/`IDX-19` deleted. **Generate the 32-index
  product-list matrix from the DB-CR-038 rule** (2 modes × 4 filter combinations × 4 frozen sorts);
  do not transcribe it. Assert the resulting set exactly.
- **Commands: 38 A/B callables.** `C-35` splits into `C-35a`/`C-35b`; `C-37 warehouse.restore` and
  `C-38 partner.setStatus` are new. `C-35` no longer exists as an id.
- **Seed: 12 movements at t₀, 17 after the `04` chain.** `T-SEED-01` splits into `01a` / `01b`.
- **The id-integrity test widens** to parse `DB-02`, `DB-05`, `DB-06` and `DB-08` as well as
  `DB-04`/`DB-03`/`DB-11`. The narrow scope is exactly why `Q-079` went undefined while the test passed.

Unchanged: you still write **no Security Rules and no command bodies**.

---

## 8. TESTS YOU OWN

Unit tests for every domain utility and transition table · schema round-trip tests (Zod → converter →
Firestore → converter → Zod) · seed reconciliation `T-SEED-01` (DB-08 §6.5) · factory smoke tests ·
a test asserting `firestore.indexes.json` contains exactly the DB-04 §7 set — **no extra index, no
missing index**.

**A2 adds two coverage tests you own** (DB-CR-021):

1. **Query-id integrity.** Parse **DB-02, DB-03, DB-04, DB-05, DB-06, DB-08 and DB-11** (the widened scope
   — A3 · F-H-01); fail if any `Q-id` referenced by any of them has no defined row in DB-04, or any DB-04
   row has no consumer. **Assert the exact active set: 92 ids (A3R-P).** The narrow A2 scope is exactly how
   `Q-079` (A3) and `Q-085g` (A3R) stayed dangling while the test passed. This exists because `Q-044`, `Q-048` and
   `Q-011a` were referenced and never defined while the pack claimed `QUERY_COVERAGE = 100%`. A coverage
   figure that can drift silently is not a coverage figure.
2. **`deriveStockStatus` at balance grain.** The same pure function must serve `ProductStockSummary` and a
   `StockBalance` row (DV-11) — including the boundary cases *out-of-stock takes precedence* and *exactly at
   the minimum is **not** low*. **`stockStatus` IS persisted on the balance row** (A3 · DB-CR-025 —
   DB-CR-018 is reversed); the function is what the *writer* uses to compute it inside the transaction that
   already writes the row, and `INV-26` asserts the persisted value equals the computed one after every
   command. *(The A2-era instruction "there is no persisted per-row status field" is SUPERSEDED.)*

**A3R adds two invariant obligations to the property test Claude Code owns**, listed here because your
domain utilities are what they assert against: **`INV-26`** (all three derived balance fields recompute
exactly) and **`INV-27`** (`summary.stockValueMinor` is the **sum** of that product's balance values —
value is rounded **once, at the balance grain**, so `Q-053 == Σ Q-060` exactly). Do not write a
`deriveStockValueMinor` that rounds the product total independently.

**Counts you assert against (A3R-P, mechanically derived):**

```
ACTIVE_INDEX_IDS = 67   ACTIVE_QUERY_IDS = 92   ACTIVE_COMMAND_IDS = 38
ACTIVE_INVARIANT_IDS = 26   ACTIVE_DERIVED_CONTRACT_IDS = 14
```

**Claude Code owns:** all rules tests, all command tests, `T-INT-03`, all `T-SEC-*`, all `T-XFER-*`
security assertions, all concurrency tests.

## 9. VALIDATION — the gate you must pass before handing back

```bash
npm run verify        # tsc --noEmit && eslint . && vitest run
npm run emu:clean &   # emulators start cleanly on 9099/8080/5001/5000/4000
npm run seed          # completes, idempotent, second run changes nothing
npm run test:seed     # T-SEED-01 green
```

Then assert by hand (all at **t₀**, before the `04` chain runs): `Q-050 = 12` · low `= 4` · out `= 1` · value `= LKR 564,200.00` · MEAT-001
`= 18.000 KG` · **ledger `= 12` movements (A3 · DB-CR-026 — it becomes 17 only after the `04` chain)** · Fresh Foods `200 PACK` / `300 KG` · `CKN-B5` published with
`orderUnit == baseUnit`.

## 10. EXPECTED OUTPUT

A repository that starts emulators, seeds the canonical dataset through the command layer, reconciles to
LKR 564,200.00, type-checks clean, lints clean, passes its own tests in CI, and has **no Security Rules
and no command bodies** — those are the next agent's work, and the interfaces they need are already
typed and waiting.

## 11. STOP CONDITIONS — stop and report, do not decide

- A field, enum, path, index or command in DB-02/04/06 is ambiguous or contradicts another DB file.
- The seed cannot reconcile to LKR 564,200.00 / 12 products / 4 low / 1 out / **12 movements** at t₀,
  **or** to LKR 691,700.00 / 3 low / 1 out / **17 movements** / MEAT-001 120.000 KG after the `04` chain.
- A query you need has no Q-id, or a Q-id has no index.
- You believe an index is missing, redundant or wrong.
- Implementing something requires a Security Rule, a command body, a trigger or an HTTP endpoint.
- Anything requires enabling billing, deploying, or writing to the live `stockmok` project.
- You are tempted to add a role, a path, a movement type, a command, a client write surface, or a
  collection-group query.
- A frozen design surface appears to need data the schema does not provide.
- **(A2, HALF SUPERSEDED BY A3 · DB-CR-025)** Persisting a per-row `stockStatus` on `StockBalance` is now
  **required**, not forbidden — DB-CR-018's cost argument was arithmetically wrong and is reversed
  (DB-00 §8.2, DB-02 §4.4, DB-07 §12). What **remains** forbidden: reintroducing `categoryName` or
  `preferredSupplierName` on `ProductStockSummary`, or `warehouseName` on `StockBalance` (DB-CR-016,
  DB-CR-027). DB-07 §12 gives the reason and DB-00 §7.2 gives the privacy consequence.
- **(A2)** A denormalised field you are about to type is sourced from a document written by a *different*
  writer than its host document. That is the exact defect DB-CR-016 repaired. Stop and report.

**You may not approve a scope change. Neither may any other agent.**

---

## 12. Shared contract map — what goes where, next

These files are the interface between Codex, Claude Code and the frontend agent. Create the **stubs and
types**; leave security semantics to Claude Code.

| File | Contents | Owner |
|---|---|---|
| `docs/implementation/DOMAIN_TYPES.md` | every entity, enum and branded numeric from DB-02, in TypeScript — **read DB-02 §4.4 and §4.5 after A2: `StockBalance` gained nine denormalised fields, `ProductStockSummary` lost `categoryName` and `preferredSupplierName`** | **Codex** |
| `docs/implementation/FIREBASE_PATH_CONTRACT.md` | DB-01 §4 paths + deterministic ids as typed builders | **Codex** |
| `docs/implementation/COMMAND_CONTRACTS.md` | all **38** Release-A/B command signatures: input, result, error codes, idempotency flag — from DB-06 | **Codex** authors types · **Claude Code** authors semantics |
| `docs/implementation/FRONTEND_BACKEND_CONTRACT.md` | Q-id → query function → screen; command → action id; error code → user-facing copy | Codex + frontend |
| `docs/implementation/OWNERSHIP_MAP.md` | which agent owns which directory; the "must not touch" lists from §4 | **Codex** |
| `docs/implementation/INTEGRATION_STATUS.md` | living checklist: schema ✔ · indexes ✔ · seed ✔ · rules ☐ · commands ☐ · UI ☐ | all agents |

And later, as source: `src/shared/types/` · `src/shared/contracts/` · `src/shared/schemas/`.

---

## 13. CURRENT STATUS — the Codex C1 foundation is COMPLETE (A3R-P2)

This brief is the instruction that produced the foundation; the foundation now exists. Evidence:
`docs/implementation-evidence/C1_COMPLETION_REPORT.md` and `C1_AUTHORITY_DISCREPANCIES.md` — historical
records of what C1 found, neither amended by this pass.

```text
CODEX_FOUNDATION        = COMPLETE      C1_FOUNDATION_COMPLETE = YES
INDEXES_IMPLEMENTED     = 67            generated, exact-set asserted
PRODUCT_LIST_MATRIX_INDEXES = 32        IDX_36_DIRECTION = DESC
ACTIVE_QUERY_IDS = 92   ACTIVE_INDEX_IDS = 67   ACTIVE_COMMAND_IDS = 38
ACTIVE_INVARIANT_IDS = 26               ACTIVE_DERIVED_CONTRACT_IDS = 14
FIRESTORE_RULES_WRITTEN = NO            COMMAND_BODIES_WRITTEN = NO   FRONTEND_WRITTEN = NO
NEXT_ACTION             = PREPARE_PARALLEL_IMPLEMENTATION_LANES
```

Three points where this brief must not be read against its earlier wording:

1. **`IDX-36` is `productStatus ASC, stockStatus ASC, onHandMilli DESC`** (A3R-P2 · C1-AUTH-006). The later
   **DB-CR-038** matrix rule controls every product-list on-hand sort, and §7's *"generate, do not
   transcribe"* instruction is precisely what kept the stale DB-04 `ASC` row from reaching the index set.
2. **`OPENING_BALANCE` permits `signedQuantityMilli >= 0`**; every other movement type requires non-zero
   (A3R-P2 · C1-AUTH-007, **OWNER-APPROVED**). `C-13` therefore accepts `quantityMilli >= 0`, and the
   canonical seed's Cooking Oil zero opening balance is a recorded fact, not a gap.
3. **The seed exception.** §5 / §9 / §10's *"seeds the canonical dataset through the command layer"* stands
   unchanged as the requirement. C1 was granted an owner-approved **emulator-only Admin SDK bootstrap**
   (`seed:bootstrap` / `replay:bootstrap`) because it precedes the command layer; it proves data, schema,
   arithmetic and reproducibility only, and the canonical `seed` / `replay` / `T-SEED-01a` / `T-SEED-01b`
   names remain reserved for the command-driven run (DB-08 §6.5).

The `DOMAIN_TYPES.md` enum defects C1 found while implementing this brief — generic `ADJUSTMENT`,
`DECLINED`, `DRAFT`/`INVALID` mapping states, singular partner `kind`, `UserStatus = ACTIVE` only — are
propagated at A3R-P2. **DB-02 was and remains the authority for all five**; C1 implemented DB-02, which is
why none of them reached the shared code.

**Do not create production source during the run that produces these documents.** Types, schemas and
contracts are the deliverable; screens and command bodies are not.
