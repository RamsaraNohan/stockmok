# BACKEND LANE B3 — INVENTORY, TRANSFER AND PRIVATE PROCUREMENT

**Implementation evidence, not normative authority.** Where this file and
`docs/database-final/**` or `docs/implementation/**` disagree, they win and this file is the defect.

```text
BACKEND_B3_STATUS  = COMPLETE
BRANCH             = feature/backend-security
WORKTREE           = C:\Users\ramsa\stockflow-worktrees\backend-security
B2_START_SHA       = f1d7e4e2037ebe831f9da72631d8f5262af701ba
B3_IMPL_SHA        = b3f62b7   feat(backend): implement B3 stock, transfer and private procurement
B3_TEST_SHA        = 56e8574   test(backend): complete B3 transaction and concurrency verification
NEXT_PHASE         = B4 (connected B-Lite, mappings, canonical seed) — Opus 5, High
```

---

## 1. The exact six ids

Mechanically resolved from `packages/shared/src/commands.ts` and DB-06 §1 — not assumed from the id.
**Only `C-16` is non-idempotent**; the assumption that "all six are idempotent" would have been wrong.

| Id       | Name                         | Authorization       | Idempotent | Movement type                      | Notify        |
| -------- | ---------------------------- | ------------------- | :--------: | ---------------------------------- | ------------- |
| C-13     | `stock.recordOpeningBalance` | `INVENTORY_WRITERS` |     ✔      | `OPENING_BALANCE`                  | on transition |
| C-14     | `stock.adjust`               | `INVENTORY_WRITERS` |     ✔      | `ADJUSTMENT_IN` / `ADJUSTMENT_OUT` | on transition |
| C-15     | `po.order`                   | `PO_WRITERS`        |     ✔      | — (none)                           | –             |
| C-16     | `po.cancel`                  | `PO_WRITERS`        |     –      | — (none)                           | –             |
| C-17     | `po.receive`                 | `RECEIVERS`         |     ✔      | `PURCHASE_RECEIPT`                 | on transition |
| **C-33** | **`stock.transfer`**         | `TRANSFER_WRITERS`  |     ✔      | `TRANSFER_OUT` + `TRANSFER_IN`     | **never**     |

```text
B3_COMMAND_IDS                    = 6
B3_COMMAND_IDS_ACCOUNTED_FOR      = 6
B3_COMMANDS_IMPLEMENTED           = 6
UNIMPLEMENTED_B3_COMMANDS         = 0
EXTRA_B3_COMMAND_IMPLEMENTATIONS  = 0
```

`functions/src/index.ts` now exports **23** callables (B2's 17 + B3's 6). `commandRegistry.register()`
asserts each id, dot-case name and idempotency flag against `commandDefinitions` at import, so drift is a
startup error rather than a silent gap; `tests/backend-foundation.test.ts` asserts
`commandRegistry.size() === 23` and `missingIds()` equals B4's 15.

---

## 2. `stock-lib.ts` — the shared stock utility, and its deliberate limits

`C-13`, `C-14`, `C-17` and `C-33` share the mechanical half of DB-06 §3 steps 7–14: read product and store
room, read balance and summary, compute on integers, refuse a negative result, write the balance with its
DV-11 derived fields, write the immutable movement. Centralising exactly that much means the
negative-stock guard and `INV-24`'s `balanceAfterMilli` cannot be forgotten by one command out of four.

**What it deliberately does not decide**: whether zero is a legal quantity (`C-13` says yes, everyone else
says no), opening-balance uniqueness, over-receipt, `SAME_WAREHOUSE`, or which movement type a signed
quantity implies. Those live in the commands, because they _are_ the commands.

**Summary maintenance is by exact integer delta, never by re-summing.** DB-06 §6's read set for every
stock command is the single affected balance, not that product's whole balance set, so `INV-04` and
`INV-27` are held by applying the change this transaction just made:

```text
summary.onHandMilli     += (balanceAfter − balanceBefore)
summary.stockValueMinor += (valueAfter   − valueBefore)
```

Both operands were read in this transaction, so the sums stay identities rather than approximations —
and no fanout query is introduced that DB-06's read set does not name.

---

## 3. Quantity, money and the zero-opening exception

Quantities are integer milli; money is integer minor; `roundHalfUp` via the frozen shared
`deriveStockValueMinor` / `deriveShortfall` / `deriveStockStatus`. Every quantity crossing the boundary is
checked with `Number.isSafeInteger`.

**`C-13` accepts `quantityMilli >= 0`** (A3R-P2 · C1-AUTH-007, OWNER-APPROVED). It is **not** wired
through any shared non-zero validator. A zero opening balance writes the full set: an `OPENING_BALANCE`
movement with `signedQuantityMilli = 0` and `balanceAfterMilli = 0`, its balance and summary rows, its
audit record and its receipt — proved by `tests/backend/commands-stock.test.ts`. Every other material
movement keeps `q > 0`: `C-14` rejects zero (shared payload `!== 0` refinement plus a server-side guard),
`C-17` rejects `q <= 0` per line, `C-33` rejects `q <= 0`.

**Opening-balance uniqueness needed a new mechanism.** DB-06 §3.1's read constraint ("balance must not
exist or be zero") stopped being sufficient the moment a zero opening balance became legal — a zero
balance no longer proves no opening balance was recorded. `C-13` therefore probes the ledger itself: a
bounded `limit(1)` query on `productId + warehouseId + movementType == 'OPENING_BALANCE'` inside the
transaction. That is `Q-029` on **`IDX-24`**, an already-frozen index, so `INDEX_SET_MATCH` is unaffected
and no new index was added. Race-free by the same in-transaction-query mechanism DB-06 §5 already
sanctions for `warehouse.archive`. A non-zero balance with no opening movement is refused
`INVALID_TRANSITION`; a second opening balance is `OPENING_BALANCE_ALREADY_RECORDED`.

---

## 4. Negative stock, and the grain it applies at

The guard lives in `writeBalance()` and applies **per `StockBalance` — product × store room**, exactly as
DB-06 §3 requires. Tested explicitly: a 50 000-milli surplus in Cold Room does not license a
20 000-milli deficit in Main Store. An outgoing adjustment landing exactly on zero succeeds; one milli
beyond is `INSUFFICIENT_STOCK` with **nothing written** — no movement, no audit, no balance change.

---

## 5. `C-33 stock.transfer`

```text
TRANSFER_FIELD_ADAPTATION = SOURCE_DESTINATION_SHARED_PAYLOAD
```

DB-06 §2's prose says `fromWarehouseId`/`toWarehouseId`; the frozen shared payload says
`sourceWarehouseId`/`destinationWarehouseId`. DB-02 §9 permits the adaptation. The **shared payload wins
at the callable boundary** and maps to from/to semantics internally. There is exactly one accepted
payload shape — no dual support, and no change to transfer semantics.

**Seven documents, not six.** DB-02 §4.4/§4.5 still read _"the write set stays at six documents and the
summary stays untouched"_. That text is superseded by **A3R-05 / A3R-12**, which DB-07 `INV-23`, DB-06
§6.2 and DB-08 `T-XFER-01` all state explicitly: the write set is two movements, two balances,
`productStockSummaries.stockValueMinor` **alone**, audit and receipt. This is a stale-prose case with one
frozen answer, not an authority conflict — the amendment is later and is stated in three places.

`INV-23` still holds structurally: `onHandMilli`, `availableMilli` and `stockStatus` are never written by
a transfer, so `INV-04` holds by construction. Only `stockValueMinor` moves, because value rounds once per
balance and the two roundings need not cancel. The test fixture uses **333 minor against 10 500 milli**
precisely because that value does not survive a split — 3 497 before, 1 748 + 1 748 = 3 496 after — so
`INV-27` is _proved_ rather than passed by accident, which a round cost would have done.

**No notification, ever.** A transfer cannot change a product total, so no status transition is possible;
`C-33` never even resolves a recipient. Asserted for all seven roles after moving an entire balance out.

**Transfer role set is exact**: `OWNER`, `ADMIN`, `INVENTORY_MANAGER`. `PROCUREMENT_MANAGER`,
`STOREKEEPER`, `ANALYST` and `VIEWER` are denied. The full seven-role matrix is tested in both
directions, plus unauthenticated, non-member, suspended member and cross-organization store room.

---

## 6. Private procurement

`DRAFT → ORDERED → PARTIALLY_RECEIVED → RECEIVED`, plus `CANCELLED`. **No B4 state is reachable** —
`SUBMITTED`, `ACCEPTED`, `SHIPPED` and `REJECTED` appear nowhere in `purchase-order.ts`, and
`connectedPurchaseOrders/**` is never touched.

**`C-15`** allocates `orderNumber` from `counters/purchaseOrder` inside the transaction (upserting when
absent), freezes every line snapshot from the live product, recomputes `totalMinor` and every
`lineTotalMinor` server-side at the one frozen rounding point — a client total is discarded, tested with a
deliberately wrong `lineTotalMinor: 999_999` — and increments `privatePartners.ordersPlacedCount` (DV-13).
**It creates no stock**: asserted that no movement, no balance and no summary change results.

**`C-16`** is legal from `DRAFT` and from `ORDERED` only while `receivedTotal == 0`; the line quantities
are re-checked independently of the status, so a status disagreeing with its own lines still cannot slip a
receipt past the guard. `ordersPlacedCount` is decremented **only when the order had actually been
placed** — cancelling a `DRAFT` decrements nothing, which is what keeps the counter non-negative and equal
to "non-cancelled orders placed". (DV-13's rebuild formula counts `status != 'CANCELLED'`, which would
also count drafts; the maintenance rule DB-02 §5.1 states — `po.order` +1, `po.cancel` −1 — is the
normative one and is what is implemented. Advisory below.)

**`C-17`** derives outstanding quantity from the **persisted** received quantity, never the payload, so
over-receipt is impossible by construction. One `PURCHASE_RECEIPT` movement **per line per receipt event**
with sequential `balanceAfterMilli` when two lines share a product (`INV-24`), over a single balance write.
Completeness is judged over every line of the order including the quantities just applied.
`receivingWarehouseId` is recorded at the first receipt and later receipts are pinned to it — the field is
singular and `warehouse.archive`'s open-receipt guard reads it, so letting later receipts wander would
silently break that guard. Duplicate `itemId`s within one receipt are rejected.

---

## 7. Idempotency, audit, notifications

**Idempotency** — derived per command, not assumed. The five idempotent commands are tested for:
identical-payload replay returning the stored result with no second movement, balance mutation, PO
transition, counter increment, history row or audit row; and same `operationId` + different payload →
`OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD`. `C-16` carries no `operationId` at all.

**Audit** — 6/6 write one row through `writeAudit()`, action equal to the command's own dot-case name,
with `actorUid`/`actorName`/`actorRole`/`organizationId`/`createdAt` server-derived and unforgeable by
construction (the `AuditRequest` type has no parameter for any of them).

**Notifications** — only what DB-06 §3 step 17 requires: `LOW_STOCK` / `OUT_OF_STOCK` on a **stock-status
transition at the product grain**, for `C-13`, `C-14` and `C-17`. Recipients resolve through `Q-059`
before any write, bounded at 50, and honour `settings.lowStockNotificationsEnabled`. Tested that ten
successive decreases within `LOW_STOCK` produce **one** notification, not ten (`FR-STOCK-017`).
`C-33` emits none; `C-15`/`C-16` emit none.

---

## 8. Concurrency — proved, not asserted

Real parallel callables against the emulator; no application-level mutex, because one that does not exist
in production would prove nothing about production.

| Test      | Scenario                                      | Proved                                                                        |
| --------- | --------------------------------------------- | ----------------------------------------------------------------------------- |
| T-CONC-07 | two transfers of 30 000 from 50 000           | exactly one commits; one `TRANSFER_OUT` and one `TRANSFER_IN`; never negative |
| T-CONC-07 | five competing transfers of 15 000            | at most three commit; `source + destination == 50 000` always                 |
| T-CONC-07 | three concurrent retries of one `operationId` | applied exactly once — one movement pair, one audit, one receipt              |
| T-CONC-03 | eight simultaneous +1 000 adjustments         | no lost update; ledger sum == balance == summary                              |
| T-CONC-03 | six concurrent −2 500 from 10 000             | never below zero; at most four commit                                         |
| T-CONC-08 | a transfer and an adjustment on one balance   | neither partially applies; `sum(movements) == balance` per room               |
| T-CONC-04 | two receipts of the full outstanding          | one commits; received never exceeds ordered                                   |
| T-CONC-04 | two receipts of 30 000 against 40 000         | loser gets `OVER_RECEIPT`; order stays `PARTIALLY_RECEIVED`                   |

`INV-03` is asserted directly — the signed sum of a store room's movements equals its balance — after
every concurrent scenario. The fixtures seed a real `OPENING_BALANCE` movement behind any seeded balance,
because a seeded balance with no ledger entry would make `INV-03` false in the fixture before a single
command ran.

---

## 9. Repairs made during B3

| #   | Class | Issue                                                                                                                                                                                                                                                                                                   | Repair                                                                                                                                                                                                                                 |
| --- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A     | `isFutureTimestamp()` took the `firebase-admin` `Timestamp` class, but the frozen shared `TimestampSchema` is structural (browser-safe, no admin dependency), so `C-13` could not validate its own payload                                                                                              | Widened the parameter to `{ toMillis(): number }` — only that method is read. `C-13` additionally re-mints the value as a genuine admin `Timestamp` before persisting, since the schema proves shape, not type                         |
| 2   | B     | `PurchaseOrderHistorySchema.operationId` was **required**, but DB-06 §1 marks `po.cancel` (and `cpo.cancel`) NON-idempotent — those transitions provably have no receipt id, so the field could only be satisfied by fabricating one that resolves to nothing                                           | Made it `.optional()` in `packages/shared`. Narrow, type-level, matches the frozen catalog. `C-16` omits it rather than inventing a receipt                                                                                            |
| 3   | B     | A contended transaction surfaced to the client as **`internal`**. Firestore raises gRPC `ABORTED`; the emulator instead rejects further work on a contended transaction with `INVALID_ARGUMENT` / _"Transaction is invalid or closed"_, which the client library does not retry, so it escaped unmapped | Both now map to the typed **`aborted`** DB-06 §7 already defines. This is a correctness fix, not cosmetics: `internal` tells a caller the operation may have half-happened and must not be retried, which is the opposite of the truth |
| 4   | A     | `snapshot.get()` returns `any`; six sites tripped `@typescript-eslint/no-unsafe-assignment`                                                                                                                                                                                                             | Annotated those reads `: unknown` and narrowed explicitly                                                                                                                                                                              |
| 5   | A     | `scripts/verify-functions.ts` and `tests/backend-foundation.test.ts` still asserted B2's phase counts (17 callables, 21 missing)                                                                                                                                                                        | Updated to B3's exact counts (23 registered, 15 missing = B4), keeping the per-phase assertion that catches a callable added or dropped outside its owning phase                                                                       |
| 6   | A     | Two test-fixture defects of my own: a role-keyed `seedMember` overwrote the ACTIVE `VIEWER` with a SUSPENDED one, and `assertLedgerReconciles` compared movement sums against balances the fixture had seeded with no backing movement                                                                  | Removed the overwrite; seeded a real `OPENING_BALANCE` movement behind seeded balances                                                                                                                                                 |

```text
REPAIR_CYCLES_USED = 6   (4 mechanical, 2 substantive — no Class C conflict arose)
```

---

## 10. Test results

| Suite             | Command                 | Result                                                   |
| ----------------- | ----------------------- | -------------------------------------------------------- |
| Unit / derivation | `npm run test:unit`     | **153 passed** (10 files, unchanged from B2)             |
| Security Rules    | `npm run test:rules`    | **392 passed** (unchanged — `firestore.rules` untouched) |
| Trusted backend   | `npm run test:backend`  | **215 passed** (13 files — 139 B1+B2 + **76 new B3**)    |
| Both, one run     | `npm run test:security` | **607 passed** (18 files)                                |

New files: `tests/backend/commands-stock.test.ts` (19), `commands-transfer.test.ts` (22),
`commands-private-po.test.ts` (27), `concurrency-stock.test.ts` (8).

---

## 11. Gates

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
B1_B2_REGRESSION                    = PASS

OPENING_BALANCE_TESTS               = PASS
ZERO_OPENING_BALANCE                = PASS
OTHER_ZERO_STOCK_MOVEMENTS_REJECTED = PASS
ADJUSTMENT_TESTS                    = PASS
NEGATIVE_STOCK_GUARD                = PASS
PRIVATE_PO_ORDER_TESTS              = PASS
PRIVATE_PO_CANCEL_TESTS             = PASS
PRIVATE_PO_RECEIVE_TESTS            = PASS
PARTIAL_RECEIVING                   = PASS
OVER_RECEIVING_DENIED               = PASS
TRANSFER_TESTS                      = PASS
TRANSFER_ROLE_MATRIX                = PASS
TRANSFER_ATOMICITY                  = PASS
TRANSFER_PAIRED_MOVEMENTS           = PASS
TRANSFER_TOTAL_STOCK_UNCHANGED      = PASS
TRANSFER_IDEMPOTENCY                = PASS
TRANSFER_CONCURRENCY                = PASS
TRANSFER_CROSS_ORG_DENIED           = PASS
TRANSACTION_ROLLBACK_TESTS          = PASS
B3_IDEMPOTENCY_TESTS                = PASS
B3_AUDIT_TESTS                      = PASS
B3_NOTIFICATION_TESTS               = PASS

ACTIVE_QUERY_IDS = 92   ACTIVE_INDEX_IDS = 67   ACTIVE_COMMAND_IDS = 38
ACTIVE_INVARIANT_IDS = 26   ACTIVE_DERIVED_CONTRACT_IDS = 14
```

No frozen architecture count changed. Toolchain: Node **24.14.0**, JDK **21.0.12** from
`.tools/jdk-21/jdk-21.0.12+8` — the nested path matters; the emulator needs
`.tools/jdk-21/jdk-21.0.12+8/bin` on `PATH`, not `.tools/jdk-21/bin`.

---

## 12. Files

### Created

```text
functions/src/commands/stock-lib.ts          the trusted stock-mutation utility
functions/src/commands/stock.ts              C-13, C-14, C-33
functions/src/commands/purchase-order.ts     C-15, C-16, C-17
tests/backend/commands-stock.test.ts
tests/backend/commands-transfer.test.ts
tests/backend/commands-private-po.test.ts
tests/backend/concurrency-stock.test.ts
docs/implementation-evidence/BACKEND_B3_CHECKPOINT.md
```

### Modified

```text
functions/src/index.ts                     6 callable exports added (17 → 23)
functions/src/core/errors.ts               contention → typed `aborted` (repair #3)
functions/src/core/time.ts                 isFutureTimestamp widened (repair #1)
packages/shared/src/schemas/procurement.ts history operationId optional (repair #2)
scripts/verify-functions.ts                CALLABLE_EXPORTS 17 → 23 (repair #5)
tests/backend-foundation.test.ts           registry test updated for B3 (repair #5)
tests/backend/harness.ts                   seedPurchaseOrderItem, seedCounter, collectionOf
```

`docs/database-final/**`, `docs/implementation/**` and `firestore.rules` are **unchanged** — no B3
command required a Rules change, since the Admin SDK bypasses Rules and every authorization decision is
enforced in the command body per DB-05 §7.

---

## 13. Remaining advisories for B4

1. **`PO_RECEIVED` has no emitter.** The notification type exists in DB-02 §2.3's enum but no frozen
   command contract names a command that emits it — DB-06 §3 step 17 defines the stock-status rule only.
   B3 did not invent one. If it is meant to fire on `po.receive` completion, that needs an owner ruling.
2. **DV-13's rebuild formula vs its maintenance rule.** The rebuild counts
   `purchaseOrders where privateSupplierId == P and status != 'CANCELLED'`, which includes `DRAFT`s;
   the maintenance rule (`po.order` +1, `po.cancel` −1) does not count them. B3 implements the
   maintenance rule, which is what keeps the field non-negative. The two disagree only for drafts.
3. **DB-02 §4.4/§4.5 prose is stale** on `stock.transfer` ("six documents", "does not write this
   document"). A3R-05 / A3R-12 / `INV-23` / `T-XFER-01` supersede it at seven documents. Worth a
   documentation pass; no code implication.
4. **Negative `C-13` quantity reports `SCHEMA_INVALID`, not `INVALID_QUANTITY`.** `MilliSchema` is
   non-negative, so the frame's payload validation rejects it before the handler runs. Both map to
   `invalid-argument`, so the client contract is unaffected.
5. **The `aborted` mapping's `INVALID_ARGUMENT` arm is matched on Firestore's message text** as well as
   its code, because a genuine invalid argument must keep reporting itself as one. If the emulator's
   wording changes, that arm silently stops matching — the ABORTED arm is unaffected.

---

## 14. Deferred — B4 owns these

```text
B4_COMMANDS = 15   C-18…C-31, C-34
                   connection.request / respond / disable
                   partnerCatalog.publish / unpublish / list / lookupBySku
                   mapping.create / disable
                   cpo.draftSave / submit / respond / ship / receive / cancel
```

Plus: the **canonical command-driven seed** (`npm run seed`, `T-SEED-01a`/`T-SEED-01b`) — explicitly
**not** implemented in B3; B3 only makes the stock and procurement commands capable of supporting it.
Also deferred: the general Lane A/C2 read-query layer, any frontend, any deployment.

---

## 15. Cross-lane diff check

```text
FROZEN_NORMATIVE_AUTHORITY_CHANGED  = NO
B4_COMMANDS_IMPLEMENTED             = 0
CANONICAL_COMMAND_SEED_IMPLEMENTED  = NO
GENERAL_C2_QUERY_LAYER_IMPLEMENTED  = NO
FRONTEND_IMPLEMENTATION_WRITTEN     = NO
OTHER_WORKTREE_MODIFIED             = NO      (main at a0d500a, data-c2 and frontend untouched)
PRODUCTION_DEPLOYMENT               = NO
REMOTE_PUSHED                       = NO
BLOCKERS                            = none
READY_FOR_B4                        = YES
```

## 16. Commits on `feature/backend-security` (this session)

```text
b3f62b7  feat(backend): implement B3 stock, transfer and private procurement commands
56e8574  test(backend): complete B3 transaction and concurrency verification
<this>   docs(backend): add BACKEND_B3_CHECKPOINT.md
```

No merge, no push, no deploy.
