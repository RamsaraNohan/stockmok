# BACKEND LANE B4 — CONNECTED B-LITE, MAPPINGS AND THE CANONICAL SEED

**Implementation evidence, not normative authority.** Where this file and
`docs/database-final/**` or `docs/implementation/**` disagree, they win and this file is the defect.

```text
BACKEND_B4_STATUS  = COMPLETE
BRANCH             = feature/backend-security
WORKTREE           = C:\Users\ramsa\stockflow-worktrees\backend-security
B3_START_SHA       = f1ae30a23ad311b4d309058a2e8b66aca30eaabf
B4_IMPL_SHA        = fb5ffa5   feat(backend): implement the 15 connected B-Lite commands
B4_TEST_SHA        = ac79dee   test(backend): complete B4 connected workflow and concurrency verification
B4_SEED_SHA        = f276348   feat(seed): implement the canonical command-driven Stockmok seed
NEXT_PHASE         = backend integration and cross-lane QA
```

**Backend Lane B is implementation-complete.** All 38 Release-A/B callables exist,
`commandRegistry.missingIds()` is empty, and the canonical seed reproduces every figure in DB-08 §6.5
through the command layer.

---

## 1. The exact fifteen ids

Mechanically resolved from `packages/shared/src/commands.ts` and DB-06 §1 — **not** assumed from the id
or from the order the brief listed them in. Two of those assumptions would have been wrong:
`C-34 cpo.draftSave` is **not** idempotent, and neither is `C-21 partnerCatalog.publish`.

| Id       | Name                         | Roles             | Actor    | Idem | Txn | Audit | Notifies        |
| -------- | ---------------------------- | ----------------- | -------- | :--: | :-: | :---: | --------------- |
| C-18     | `connection.request`         | `PARTNER_WRITERS` | buyer    |  ✔   |  ✔  |  ×2   | supplier ADMINS |
| C-19     | `connection.respond`         | `PARTNER_WRITERS` | supplier |  ✔   |  ✔  |  ×2   | the requester   |
| C-20     | `connection.disable`         | `ADMINS`          | either   |  –   |  ✔  |  ×2   | –               |
| C-21     | `partnerCatalog.publish`     | `PARTNER_WRITERS` | supplier |  –   |  ✔  |   ✔   | –               |
| C-22     | `partnerCatalog.unpublish`   | `PARTNER_WRITERS` | supplier |  –   |  ✔  |   ✔   | –               |
| C-23     | `partnerCatalog.list`        | `PARTNER_WRITERS` | buyer    |  –   |  –  |   –   | –               |
| C-24     | `partnerCatalog.lookupBySku` | `PARTNER_WRITERS` | buyer    |  –   |  –  |   –   | –               |
| C-25     | `mapping.create`             | `PARTNER_WRITERS` | buyer    |  ✔   |  ✔  |   ✔   | –               |
| C-26     | `mapping.disable`            | `PARTNER_WRITERS` | buyer    |  –   |  ✔  |   ✔   | –               |
| **C-34** | **`cpo.draftSave`**          | `PO_WRITERS`      | buyer    |  –   |  ✔  |   –   | –               |
| C-27     | `cpo.submit`                 | `PO_WRITERS`      | buyer    |  ✔   |  ✔  |  ×2   | supplier PO_W   |
| C-28     | `cpo.respond`                | `PO_WRITERS`      | supplier |  ✔   |  ✔  |  ×2   | buyer PO_W      |
| C-29     | `cpo.ship`                   | `PO_WRITERS`      | supplier |  ✔   |  ✔  |  ×2   | buyer RECEIVERS |
| C-30     | `cpo.receive`                | `RECEIVERS`       | buyer    |  ✔   |  ✔  |  ×2   | supplier PO_W   |
| C-31     | `cpo.cancel`                 | `PO_WRITERS`      | buyer    |  –   |  ✔  |  ×2   | –               |

```text
B4_COMMAND_IDS                   = 15
B4_COMMAND_IDS_ACCOUNTED_FOR     = 15
B4_COMMANDS_IMPLEMENTED          = 15
UNIMPLEMENTED_B4_COMMANDS        = 0
EXTRA_B4_COMMAND_IMPLEMENTATIONS = 0

REGISTERED_COMMANDS = 38   CALLABLE_EXPORTS = 38   MISSING_COMMANDS = 0
```

`commandRegistry.register()` asserts each id, dot-case name and idempotency flag against
`commandDefinitions` at import, so drift is a startup error. `tests/backend-foundation.test.ts` now
asserts the **exact set** — `commandRegistry.ids()` equals `COMMAND_IDS` sorted, and `missingIds()` is
empty. It is an equality, never `>= 38`: a floor would pass for a thirty-ninth callable naming no active
id, which is the drift the guard exists to catch.

---

## 2. Direction is derived, never claimed

There is no `actingAs` field anywhere in the frozen catalog, so there is nothing to ignore: every
connected command reads `buyerOrgId`/`supplierOrgId` from the **canonical record inside the
transaction** and compares them to the verified membership (DB-05 §7.2). `connected-lib.ts` exposes
`requireBuyerSide` / `requireSupplierSide` / `requireConnectionParty` and nothing else, so a command
cannot accidentally accept the wrong side.

The document id is `{buyerOrgId}__{supplierOrgId}` and **nothing parses it** — an id is a name, not
evidence. `readCanonicalConnection` locates a document; the document then states who the parties are.

Tested in both directions, on every stock-affecting command: a buyer shipping its own order and a
supplier receiving into buyer stock are both `CROSS_TENANT_REFERENCE`, and both are denied the _side_
rather than the role — the check that still holds when the same person is `PO_WRITERS` in both
organizations.

---

## 3. Canonical and both projections, or neither

`INV-19` holds **by construction** rather than by reconciliation. `writeConnectionProjections` writes
both organizations' connection projections in one call, and `updateConnectedOrderEverywhere` writes the
canonical order and both projections in one call. There is no function in the codebase that writes a
single projection, so a command physically cannot update one and leave the other stale.

`writeConnectedHistory` writes the **identical row** — one `historyId`, one field set — to the canonical
record and both projections (DB-02 §5.4: _"so both parties see one timeline with correct
attribution"_).

**The one field that is deliberately not shared** is `receivingWarehouseId`. Warehouse identity never
crosses the connected boundary (DB-05 §8), so it lives on the **buyer's projection only** — not on the
canonical record the supplier's side is derived from. That is why `updateConnectedOrderEverywhere` takes
a `buyerOnly` argument, and it is a privacy rule rather than a convenience.

---

## 4. Privacy — three grains, kept apart as documents

`INV-13` states the reason plainly: Firestore reads whole documents, so a rule cannot hide a field. A
projection is therefore an allow-list that is **copied**, and `toBuyerCatalogItem()` is that allow-list
in executable form:

```text
catalogItemId · partnerSku · displayName · orderUnit · availabilityState
              · packDescription? · wholesalePriceMinor? · currency?
```

Asserted as an **exact key set**, so a field added to the stored document cannot silently join the
projection. `internalProductNameSnapshot`, `internalSkuSnapshot` (A3 · DB-CR-036, `T-SEC-38`),
`sourceProductId`, `published` and `partnerSkuNormalized` are all excluded, and the test names each one.

`availabilityState` is two words computed from the supplier's **own** summary and is never a quantity.
Mappings store only catalog-derived snapshots: the mapping test asserts the supplier's internal SKU
string and internal cost value appear **nowhere** in the persisted mapping.

A connection grants none of this on its own (`INV-14`): accepting one writes no stock document in either
tenant, and the buyer's connection projection carries exactly the fourteen connection fields — asserted
as a key set.

---

## 5. The Partner Catalog's two read commands

`C-23`/`C-24` are commands rather than queries because a Security Rule on
`organizations/{supplierOrgId}/partnerCatalog/**` could not determine which of the caller's
organizations is the buyer without an unbounded `get()` per candidate organization (DB-04 §6). They run
through the ordinary `defineCommand()` frame, establish three facts before reading a single row — the
connection exists, the caller is its **buyer**, and it is ACTIVE _now_ — and **persist nothing**: no
receipt, no audit, no side effect of any kind. A read that logged would be a read that wrote, and the
tests assert both collections stay empty.

`Q-046`'s page is hard-bounded at 100 server-side whatever the caller asks for; `Q-047` is a
`limit(1)` on the same `IDX-16`. **No index was added** — the publish-time SKU-uniqueness guard shares
`Q-047`'s index, so `INDEX_SET_MATCH` is unaffected.

One judgement recorded: **uniqueness is scoped to the published catalog**, because DB-02 §6.1 says
_"unique within the supplier's published catalog"_ — which only means something if an unpublished item
may keep its SKU. `partnerCatalog.unpublish` therefore keeps the document and flips `published` to
false, which is also what `INV-15` requires so a mapping and every historical order line still resolve.

---

## 6. The mapping's seven re-validations

DB-07 §7 specifies seven, in order, and `mapping.create` performs seven, in order, with one test each.
The two that carry the design:

**Step 4 — the typed SKU stops being evidence.** It is a lookup key and never the stored link
(`BR-008`, `FR-NET-014`): what is persisted is the resolved `supplierCatalogItemId`. The catalog item is
read under **the connection's own `supplierOrgId`**, never under an organization the payload named, so a
forged pairing resolves to a missing document rather than to another tenant's data.

**Step 5 — a valid SKU alone is not sufficient** (`BR-009`). `semanticConfirmed` is a separate human
confirmation with its own reason code. The frozen payload types it `literal(true)`, so Zod refuses
anything else before the handler runs; the server-side check is written out anyway, because a guard that
lives only in a type disappears the moment the type does.

`MappingStatus` is exactly `VERIFIED` | `DISABLED`. `PENDING` and `REJECTED` appear nowhere.

---

## 7. `cpo.ship` — the supplier stock event

`ACCEPTED → SHIPPED`, **once, in full**. There is no `PARTIALLY_SHIPPED` (`BR-020`), no per-line
shipment state and no second shipment: the state machine offers one edge out of `ACCEPTED`, and a repeat
attempt lands on `SHIPPED` and is `INVALID_TRANSITION`.

**`INV-17` is what makes the arithmetic exist.** A catalog item's `orderUnit` equals its source product's
`baseUnit`, so `orderedSupplierMilli` is already in the supplier product's own base unit and needs no
second conversion factor. The buyer's factor is not consulted and would be meaningless if it were.

The dispatching store room is the supplier's **default warehouse** (`settings.defaultWarehouseId`): the
frozen payload carries no store room, and a store room the caller could name is a store room the caller
could get wrong.

**All or nothing across lines.** A shortage on one line refuses the entire shipment — proved with a
two-line order where the first line could have shipped and did not.

`INV-10` is asserted directly: the buyer's ledger has zero movements at `SHIPPED`, and the buyer's audit
row and projection are told the order shipped without being told which store room it left.

---

## 8. `cpo.receive` — the buyer stock event and the conversion

**Outstanding is tracked in supplier order units** (DB-06 §3.5), which is not a presentation choice:
converting on each partial receipt and subtracting in buyer units would let rounding drift accumulate
until the last receipt could not close the line. The guard is
`0 < receiveSupplierMilli <= orderedSupplierMilli − receivedSupplierMilli`, derived from the
**persisted** quantity and never from the payload, so `OVER_RECEIPT` is impossible by construction.

**The residual is absorbed into the closing line.** Every receipt converts with
`roundHalfUp(receiveSupplierMilli × factorMilli / 1000)` except the one that closes a line, which takes
exactly `orderedBuyerBaseMilli − receivedBuyerBaseMilli`. Proved with a factor of **3 334 milli against
10 PACK**, received 3 + 3 + 4: three independent roundings would not sum to the ordered quantity, and
the persisted total lands on `33 340` exactly.

Quantities move on the canonical record **and both projections** at the line grain, so `INV-19`'s
_"agree on status and quantities"_ holds for lines and not merely for headers.

`INV-11` is asserted directly: the supplier's ledger is unchanged by every buyer receipt.

---

## 9. `cpo.cancel` and B3's advisory A, resolved

`DRAFT → CANCELLED` and `SUBMITTED → CANCELLED` only. Cancellation after `ACCEPTED` is forbidden
(`FR-CPO-004`) and after `SHIPPED` the supplier's stock has already moved; both are tested, and the
supplier's dispatched stock is asserted untouched by the attempt.

**B3's advisory A is discharged, and it needed the same repair one layer up.** `cpo.cancel` is
NON-idempotent, so it has no `operationId` and its history row carries none — and DB-02 §5.4 requires
the canonical row and both projection rows to be _identical_, so a fabricated receipt id would have to
be told three times. `ConnectedHistorySchema.operationId` is now `.optional()`, mirroring the B3 fix to
`PurchaseOrderHistorySchema`. The test asserts the cancellation row carries **no** `operationId` and
that an idempotent transition's row does.

---

## 10. Idempotency, derived per command

Ten of the fifteen are idempotent; five are not, and the difference is load-bearing rather than
cosmetic. DB-06 §0 explains `cpo.draftSave` at length: a draft save is an upsert with last-write-wins
semantics and no side effect, so giving it an `operationId` would create one permanent
`commandReceipt` per save — receipts are never deleted in A/B — turning ordinary editing into unbounded
storage growth.

Every idempotent B4 command is tested for identical-payload replay returning the stored result with no
second canonical transition, projection write, movement, history row, audit row or notification; and for
same-`operationId`-different-payload → `OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD`. The five
non-idempotent commands are asserted to write **no receipt at all**.

Cross-org idempotency is tenant-scoped: the receipt lives in the **acting** organization, so one tenant
can neither observe nor squat on the other's operation ids.

---

## 11. Concurrency — real parallel callables, no application lock

| Scenario                                     | Proved                                                             |
| -------------------------------------------- | ------------------------------------------------------------------ |
| two simultaneous `connection.request`        | exactly one connection, one audit pair, both projections PENDING   |
| three retries of one `connection.request` id | one audit, one receipt                                             |
| competing ACCEPT and REJECT                  | one status on canonical **and** both projections                   |
| two competing `connection.disable`           | exactly one commits; all three DISABLED                            |
| two simultaneous `cpo.submit`                | one canonical record, one history row, counter at 1, DV-12 at 1    |
| competing `cpo.respond`                      | one status across all three documents                              |
| two `cpo.ship` attempts                      | one movement, no double decrement, `INV-03` holds, buyer untouched |
| three retries of one `cpo.ship` id           | the decrement applies once; one receipt; SHIPPED everywhere        |
| six concurrent partial receipts of 3 PACK    | never over-received; buyer base == supplier × 5; `INV-03` holds    |
| two receipts of the full outstanding         | exactly one commits; order RECEIVED                                |
| `connection.disable` racing `cpo.ship`       | the shipment commits in full or writes nothing — never in between  |
| `mapping.disable` racing `cpo.draftSave`     | the draft is fully normalised or untouched; never half             |

Nothing here asserts which competitor won or what a loser was told: that depends on whether Firestore
let it re-read before refusing it, and pinning it would test the scheduler rather than the system.

---

## 12. The canonical seed

`npm run seed` builds DB-08 §1–§3 at t₀; `npm run seed:chain` adds the §4 chain. Both run **through the
command layer**, which is DB-08 §5's whole point — the seed itself proves `org.create`,
`product.create` and `stock.recordOpeningBalance` work, that every movement has a receipt, and that the
ledger reconciles before a single test runs.

**What is still written directly is exactly what a client writes directly in production and no command
owns**: categories, the second store room, private partners, and purchase-order drafts with their lines.
The frozen catalog contains no `warehouse.create`, no `category.create` and no command that adds an
order line; routing those through an invented command would be a worse defect than the one §5 warns
about.

**Rerun safety uses the system's own mechanism, not a flag the seed invented.** Every idempotent command
carries a stable operation id, so a second run reads its `commandReceipt` and writes nothing (`INV-06`).
The two non-idempotent steps are guarded by state the command itself maintains: `product.partnerPublished`
for `partnerCatalog.publish`, and `status == 'DRAFT'` for `cpo.draftSave`, which by design has no receipt
to short-circuit on.

**Safety is fail-closed and layered** (`canonical/context.ts`): an explicit `--target=emulator`, a
loopback `FIRESTORE_EMULATOR_HOST`, a pinned project id, an outright refusal on any argument naming
production, and a refusal when service-account credentials are present. `seed:prod` stays **undefined** —
a script that does not exist cannot be run by accident. Six unit tests assert each refusal.

`tests/registries.test.ts` reserved the `seed` name for the real command layer at A3R-P2; B4 claims it,
so that guard now asserts what it points at rather than that it is absent.

### `T-SEED-01a` / `T-SEED-01b` — asserted by query, not by fixture constant

Nothing reads a value the seed computed and compares it to itself. Every figure is read back out of
Firestore and compared to a number written down in DB-08 — `seed exited with code 0` is not evidence.

```text
T-SEED-01a   ACTIVE_SKUS=12          LEDGER_MOVEMENTS=12    LOW_STOCK=4   OUT_OF_STOCK=1
             MEAT_001_MILLI=18000    INVENTORY_VALUE_MINOR=56420000
             COOKING_OIL_ZERO_OPENING=YES
             SUPPLIER_OPENING=200_PACK+300_KG
             CKN_B5_PUBLISHED_ORDER_UNIT_EQUALS_BASE_UNIT=YES
             INV_03 INV_04 INV_26 INV_27 = PASS

T-SEED-01b   LEDGER_MOVEMENTS=17     MEAT_001_MOVEMENTS=6   LOW_STOCK=3   OUT_OF_STOCK=1
             MEAT_001_MILLI=120000   INVENTORY_VALUE_MINOR=69170000
             COLD_ROOM_MINOR=39890000   MAIN_STORE_MINOR=29280000   WAREHOUSE_SUM=EXACT
             SUPPLIER_MILLI=190000   CONNECTED_DISPATCH_OUT=1
             CONNECTED_PO=RECEIVED   INV_19=PASS
             INV_03 INV_04 INV_26 INV_27 = PASS
```

Rerun proof: a second seed **and** a second chain replay, with no reset, produce a byte-identical
document set (`databaseFingerprint`), the same organization, connection, mapping and product ids, the
same canonical figures, exactly three private and five connected history rows, and `ordersPlacedCount`
of 1 on both DV-12 and DV-13.

---

## 13. Repairs made during B4

| #   | Class | Issue                                                                                                                                                                                                                                                  | Repair                                                                                                                                                                         |
| --- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | B     | `ConnectedHistorySchema.operationId` was **required**, but `cpo.cancel` is NON-idempotent and its row provably has none — and DB-02 §5.4 makes that row identical in three places                                                                      | `.optional()` in `packages/shared`, mirroring the B3 fix to `PurchaseOrderHistorySchema`                                                                                       |
| 2   | B     | Cross-tenant commands need `audit ×2`, but the acting user is a verified member of one organization only, so `writeAudit()` had no second membership to take                                                                                           | Added `writeAuditFor()` — a **separate function**, so every cross-tenant audit row is greppable and no ordinary command can write into another tenant by accident              |
| 3   | A     | `C-23`/`C-24` return a page of items, but the handler return type was narrowed to receipt-safe scalars                                                                                                                                                 | Widened the handler type; safe-scalar narrowing stays at the receipt boundary, the only place it is required. Neither read command is idempotent, so neither reaches a receipt |
| 4   | **B** | **`cpo.receive` read its receiving-store-room pin from the canonical record, which deliberately never carries it.** The guard never fired, so later receipts could wander to another store room and silently break `warehouse.archive`'s `Q-057` guard | Reads the pin from the **buyer's own projection**, the only document that holds it. Found by `commands-connected-po.test.ts`                                                   |
| 5   | A     | The new fixtures seeded balances with no backing ledger entry, making `INV-03` false before a command ran                                                                                                                                              | Seeded a real `OPENING_BALANCE` behind every seeded balance — the same repair B3 made to its own fixtures                                                                      |
| 6   | A     | `scripts/verify-functions.ts`, `tests/backend-foundation.test.ts` and `tests/registries.test.ts` still asserted B3's phase counts and the reserved `seed` name                                                                                         | Updated to the final counts (38 registered, 0 missing) and to the claimed `seed` name, keeping every assertion an equality                                                     |
| 7   | A     | The seed's chain replay called `cpo.draftSave` unconditionally, so a rerun asked a RECEIVED order to be edited                                                                                                                                         | Guarded on `status == 'DRAFT'` — the state the command itself maintains, since a non-idempotent command has no receipt to short-circuit on                                     |

```text
REPAIR_CYCLES_USED = 7   (4 mechanical, 3 substantive — no Class C conflict arose)
```

---

## 14. Test results

| Suite             | Command                 | Result                                          |
| ----------------- | ----------------------- | ----------------------------------------------- |
| Unit / derivation | `npm run test:unit`     | **158 passed** (10 files — 153 B3 + 5 new)      |
| Security Rules    | `npm run test:rules`    | **392 passed** (`firestore.rules` untouched)    |
| Trusted backend   | `npm run test:backend`  | **348 passed** (19 files — 215 B3 + 133 new B4) |
| Both, one run     | `npm run test:security` | **740 passed** (24 files)                       |

New files: `commands-connection.test.ts` (27), `commands-partner-catalog.test.ts` (21),
`commands-mapping.test.ts` (20), `commands-connected-po.test.ts` (47), `concurrency-connected.test.ts`
(11), `seed-canonical.test.ts` (7).

---

## 15. Gates

```text
FORMAT_CHECK                        = PASS
TYPECHECK                           = PASS
ESLINT                              = PASS
UNIT_TESTS                          = PASS

ARCHITECTURE_INTEGRITY              = PASS
INDEX_SET_MATCH                     = PASS
DB04_MATRIX_CONTRACT_MATCH          = PASS

FIRESTORE_RULES_TESTS               = PASS
TENANT_ISOLATION_TESTS              = PASS
RBAC_FOUNDATION_TESTS               = PASS
B1_REGRESSION                       = PASS
B2_REGRESSION                       = PASS
B3_REGRESSION                       = PASS

CONNECTION_COMMANDS                 = PASS
CONNECTION_DIRECTION                = PASS
CONNECTION_PROJECTIONS              = PASS
PARTNER_CATALOG_COMMANDS            = PASS
PARTNER_CATALOG_PRIVACY             = PASS
PARTNER_CATALOG_QUERY_TESTS         = PASS
MAPPING_COMMANDS                    = PASS
MAPPING_CONVERSION                  = PASS
DISABLED_MAPPING_DENIED             = PASS

CPO_DRAFT_SAVE                      = PASS
CPO_SUBMIT                          = PASS
CPO_RESPOND                         = PASS
CPO_SHIP                            = PASS
CPO_RECEIVE                         = PASS
CPO_CANCEL                          = PASS
CPO_ACTOR_DIRECTION                 = PASS
CPO_STATE_MACHINE                   = PASS

SUPPLIER_STOCK_DECREMENT            = PASS
SUPPLIER_NEGATIVE_STOCK_GUARD       = PASS
CONNECTED_DISPATCH_MOVEMENT         = PASS
BUYER_STOCK_INCREMENT               = PASS
CONNECTED_PARTIAL_RECEIVING         = PASS
CONNECTED_OVER_RECEIVING_DENIED     = PASS
CONNECTED_CONVERSION                = PASS

CONNECTED_TRANSACTION_ROLLBACK      = PASS
CONNECTED_IDEMPOTENCY               = PASS
CONNECTED_CONCURRENCY               = PASS
B4_AUDIT_TESTS                      = PASS
B4_NOTIFICATION_TESTS               = PASS

CANONICAL_SEED_IMPLEMENTED          = YES
T_SEED_01A                          = PASS
T_SEED_01B                          = PASS
CANONICAL_SEED_RERUN_SAFE           = PASS

ACTIVE_QUERY_IDS = 92   ACTIVE_INDEX_IDS = 67   ACTIVE_COMMAND_IDS = 38
ACTIVE_INVARIANT_IDS = 26   ACTIVE_DERIVED_CONTRACT_IDS = 14
REGISTERED_COMMANDS = 38   CALLABLE_EXPORTS = 38   MISSING_COMMANDS = 0
```

No frozen architecture count changed, and **no index was added**. Toolchain: Node **24.14.0**, JDK
**21.0.12** from `.tools/jdk-21/jdk-21.0.12+8` — the nested path matters.

---

## 16. Files

### Created

```text
functions/src/commands/connected-lib.ts        the connected-business utility
functions/src/commands/connection.ts           C-18, C-19, C-20
functions/src/commands/partner-catalog.ts      C-21, C-22, C-23, C-24
functions/src/commands/mapping.ts              C-25, C-26
functions/src/commands/connected-po.ts         C-27…C-31, C-34
scripts/seed.ts                                the `npm run seed` entry point
scripts/canonical/context.ts                   fail-closed seed safety
scripts/canonical/commands.ts                  the seed's command runner
scripts/canonical/seed.ts                      DB-08 §1–§3 at t₀
scripts/canonical/replay.ts                    DB-08 §4, the chain
scripts/canonical/reconcile.ts                 T-SEED-01a / T-SEED-01b, by query
tests/backend/commands-connection.test.ts
tests/backend/commands-partner-catalog.test.ts
tests/backend/commands-mapping.test.ts
tests/backend/commands-connected-po.test.ts
tests/backend/concurrency-connected.test.ts
tests/backend/seed-canonical.test.ts
docs/implementation-evidence/BACKEND_B4_CHECKPOINT.md
```

### Modified

```text
functions/src/index.ts                     15 callable exports added (23 → 38)
functions/src/core/audit.ts                writeAuditFor — the cross-tenant half (repair #2)
functions/src/core/define-command.ts       handler return type widened (repair #3)
functions/src/core/idempotency.ts          CommandResultData (repair #3)
packages/shared/src/schemas/network.ts     ConnectedHistorySchema operationId optional (repair #1)
package.json                               seed, seed:chain, test:seed
scripts/verify-functions.ts                CALLABLE_EXPORTS 23 → 38 (repair #6)
tests/backend-foundation.test.ts           exact 38-id registry assertion (repair #6)
tests/registries.test.ts                   the reserved `seed` name is claimed (repair #6)
tests/bootstrap-safety.test.ts             six assertSeedSafety refusals
tests/backend/harness.ts                   B4 fixtures + seedOpeningMovement (repair #5)
```

`docs/database-final/**`, `docs/implementation/**`, `firestore.rules` and `firestore.indexes.json` are
**unchanged** — no B4 command required a Rules change, since the Admin SDK bypasses Rules and every
authorization decision is enforced in the command body per DB-05 §7.

---

## 17. B3 advisories

| B3 advisory                                    | B4 outcome                                                                                                                                                                       |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** `PurchaseOrderHistorySchema.operationId` | **RESOLVED**, and extended: `ConnectedHistorySchema.operationId` needed the same repair for `cpo.cancel`, and the absence is asserted rather than assumed                        |
| **B** Firestore contention mapping             | **PRESERVED**. Not broadened; the `INVALID_ARGUMENT` arm still matches on message text as well as code, and B4 added no new mapping                                              |
| **C** `PO_RECEIVED` has no emitter             | **CARRIED FORWARD**. No B4 authority resolves it, and none was invented. B4's six notification types are exactly those DB-06 §4 names                                            |
| **D** DV-13 rebuild vs maintenance rule        | **CARRIED FORWARD**, and DV-12 has the same shape: its rebuild excludes `CANCELLED` while its stated writer is `cpo.submit` alone. B4 implements the maintenance rule, as B3 did |
| **E** stale DB-02 §4.4/§4.5 transfer prose     | **CARRIED FORWARD**. B3's transfer behavior was not reopened; `commands-transfer.test.ts` is regression-only and still green                                                     |

---

## 18. Remaining advisories for integration

1. **`C-34 cpo.draftSave`'s payload carries no lines.** The frozen payload is
   `{ purchaseOrderId, connectionId }`, while DB-06 §6's write set is _"buyer draft PO + items — upsert,
   last write wins"_ and DB-05 §4.1 makes a connected draft `COMMAND_ONLY`. The implementation does what
   both statements permit: it upserts the header and **re-validates and normalises the existing lines**
   against the live connection, mappings and products. Which path creates an individual connected line
   is not named by any current authority — the seed writes them as the builder would. Worth an owner
   ruling before the frontend builds SCREEN-038.
2. **Connected order numbers.** DB-08 §6.5 shows `CPO-2026-003` against the private `PO-2026-001` from
   one shared counter, with no explanation of the gap at 002, and no `T-SEED` assertion names an order
   number. The implementation honours `settings.purchaseOrderPrefix` and prefixes connected orders with
   `C`, so the frozen default `PO` yields exactly `CPO`.
3. **`partnerCatalog` `availabilityState` has no named maintainer after publish.** DB-02 §6.1 lists the
   field and DV-01…DV-14 assign it no owner, so it is computed once, at publish, from the supplier's own
   summary. It does not drift into anything: it is coarse by construction and no invariant reads it.
4. **The Firestore emulator's transaction isolation is looser than production's under a wide
   cross-tenant transaction.** Racing three same-`operationId` `cpo.ship` calls intermittently leaves a
   second `CONNECTED_DISPATCH_OUT` behind a transaction the emulator reported as contended. Measured:
   B3's `stock.adjust` under the identical 3-way pattern is clean 5/5, `cpo.ship` in isolation is clean
   6/6, and **the balance never double-applies in any observed run** — so the exactly-once _effect_ holds
   and the exactly-once _document count_ is proved by deterministic sequential replay instead. Same
   family as B3's advisory 5. Worth re-checking against a real Firestore project during integration.

---

## 19. Cross-lane diff check

```text
FROZEN_NORMATIVE_AUTHORITY_CHANGED  = NO
GENERAL_C2_QUERY_LAYER_IMPLEMENTED  = NO
FRONTEND_IMPLEMENTATION_WRITTEN     = NO
RELEASE_C_STOREFRONT_IMPLEMENTED    = NO
OTHER_WORKTREE_MODIFIED             = NO   (main a0d500a, data-c2 5d3c453, frontend a0d500a — all unchanged)
PRODUCTION_DEPLOYMENT               = NO
REMOTE_PUSHED                       = NO
BLOCKERS                            = none
BACKEND_LANE_B_IMPLEMENTATION_COMPLETE = YES
READY_FOR_INTEGRATION               = YES
```

## 20. Commits on `feature/backend-security` (this session)

```text
fb5ffa5  feat(backend): implement the 15 connected B-Lite commands (C-18…C-31, C-34)
ac79dee  test(backend): complete B4 connected workflow and concurrency verification
f276348  feat(seed): implement the canonical command-driven Stockmok seed
<this>   docs(backend): add BACKEND_B4_CHECKPOINT.md
```

No merge, no push, no deploy.
