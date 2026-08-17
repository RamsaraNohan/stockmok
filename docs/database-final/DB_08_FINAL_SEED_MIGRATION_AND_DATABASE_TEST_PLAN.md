# DB-08 — FINAL SEED, MIGRATION AND DATABASE TEST PLAN

**Status:** FROZEN.
**Seed authority:** `16` §7 (canonical dataset and KPI reconciliation) · `04` §3–§4 (chained scenarios) ·
the canonical Gate 6 artifact `cb94a73c`, which reproduces `16` §7.2 exactly.
**Rule:** `scripts/seed.ts` is the reproducible source of the dataset (`NFR-014`). An exported emulator
binary is **never** the authority.

> **The canonical seed is not amended by A1.** The transfer workflow adds no seeded movement. The seeded
> ledger at t₀ is **12 movements** — the twelve opening balances — and becomes **17** only after the `04`
> chain adds the five later movements on MEAT-001 (A3 · DB-CR-026) —
> exactly as the frozen board states. Transfer is exercised by test fixtures only.

---

## 1. Organizations

| Org | Handle | Industry | Currency | TZ | Role |
|---|---|---|---|---|---|
| Grand Ocean Hotel | `grand-ocean` | Hospitality | LKR | Asia/Colombo | buyer |
| Fresh Foods Ltd | **`freshfoods`** | Food & Beverage | LKR | Asia/Colombo | supplier |

`@freshfoods` is the one canonical spelling (`CHG-033`; Gate 14 §14g). The not-found lesson uses
`@fresh-foods-lk`, which belongs to nobody. Any board still showing `@fresh-foods` is pre-patch copy.

**Grand Ocean warehouses:** `Main Store` (default), `Cold Room`. **Two only** — `Bar Store` appears in the
frozen design solely as the example value inside the *New warehouse* dialog and is **not seeded**.
**Categories:** Meat, Dairy, Dry Goods, Beverages.
**Team — one user per role, so RBAC is demonstrable:** Owner (Nohan Fernando), Admin, Inventory Manager
(Nimal Perera), Procurement Manager, Storekeeper, Analyst, Viewer.

## 2. Grand Ocean products and opening balances — the canonical twelve

| SKU | Product | Category | Unit | Min | Cost (LKR) | Opening | Warehouse | Status at t₀ |
|---|---|---|---|---|---|---|---|---|
| MEAT-001 | Chicken Breast | Meat | KG | 20 | 1,250.00 | 18 | Cold Room | **LOW** |
| MEAT-002 | Beef Mince | Meat | KG | 15 | 2,100.00 | 40 | Cold Room | IN_STOCK |
| MEAT-003 | Fish Fillet | Meat | KG | 12 | 1,850.00 | 10 | Cold Room | **LOW** |
| DAIR-001 | Fresh Milk | Dairy | L | 50 | 380.00 | 120 | Cold Room | IN_STOCK |
| DAIR-002 | Butter Block | Dairy | KG | 10 | 2,600.00 | 8 | Cold Room | **LOW** |
| DAIR-003 | Cheddar Cheese | Dairy | KG | 8 | 3,200.00 | 25 | Cold Room | IN_STOCK |
| DRY-001 | Basmati Rice | Dry Goods | KG | 100 | 420.00 | 250 | Main Store | IN_STOCK |
| DRY-002 | Wheat Flour | Dry Goods | KG | 80 | 210.00 | 60 | Main Store | **LOW** |
| DRY-003 | Sugar | Dry Goods | KG | 60 | 260.00 | 300 | Main Store | IN_STOCK |
| DRY-004 | Cooking Oil | Dry Goods | L | 40 | 690.00 | 0 | Main Store | **OUT_OF_STOCK** |
| BEV-001 | Bottled Water 1L | Beverages | EACH | 200 | 90.00 | 600 | Main Store | IN_STOCK |
| BEV-002 | Orange Juice 1L | Beverages | EACH | 60 | 480.00 | 90 | Main Store | IN_STOCK |

**Dashboard at t₀ — the numbers the report must show:**

| KPI | Value | Derivation |
|---|---|---|
| Active SKUs | **12** | `Q-050` `count()` |
| Low stock | **4** | MEAT-001, MEAT-003, DAIR-002, DRY-002 |
| Out of stock | **1** | DRY-004 |
| Open POs | **0** | none seeded |
| Awaiting receipt | **0** | none seeded |
| Inventory value | **LKR 564,200.00** | `Q-053` `sum(stockValueMinor)` |

`18×1,250 + 40×2,100 + 10×1,850 + 120×380 + 8×2,600 + 25×3,200 + 250×420 + 60×210 + 300×260 + 0 + 600×90 + 90×480` = **564,200** ✔

**Cooking Oil is seeded with an `OPENING_BALANCE` movement of 0.** A product with no movement and a
product at zero are different states, and the out-of-stock KPI must be provable from the ledger.
Physically — **A3R-P2 · C1-AUTH-007**, the OWNER-APPROVED zero exception now carried by DB-02 §4.6 and
DB-06 §3.1: `movementType = OPENING_BALANCE`, `signedQuantityMilli = 0`, `balanceAfterMilli = 0`. It is
**one of the twelve t₀ opening movements**, not an omission from them, and it distinguishes
*recorded opening balance = zero* from *no opening balance was ever recorded*. No canonical figure moves:
12 products · 12 movements · 4 low · 1 out · `LKR 564,200.00`.

## 3. Fresh Foods (supplier)

| SKU | Product | Unit | Opening | Partner SKU | Order unit | Pack |
|---|---|---|---|---|---|---|
| FF-CHK-05 | Chicken Breast 5 KG Pack | PACK | 200 PACK | `CKN-B5` | PACK | 5 KG |
| FF-BTR-01 | Butter Block 1 KG | KG | 300 KG | `BTR-1K` | KG | 1 KG |

`INV-17`: a partner catalog item's **order unit equals the supplier product's base unit**. Without it,
`cpo.ship` would need a second conversion factor to know how much supplier stock to decrement.

## 4. The canonical demonstration chain — MEAT-001

Every scenario in `04` chains from t₀ in this exact order. **These numbers are authoritative; any
document, screenshot or report figure that disagrees is wrong.**

| Step | Action | Movement | Qty | Balance after | Inventory value after |
|---|---|---|---|---|---|
| t₀ | seed | `OPENING_BALANCE` | +18 | **18 KG** LOW | 564,200.00 |
| 1 | adjustment, reason `RECOUNT_CORRECTION` | `ADJUSTMENT_IN` | +2 | **20 KG** IN_STOCK | 566,700.00 |
| 2 | private PO from Green Farm, 50 KG ordered, first receipt | `PURCHASE_RECEIPT` | +40 | **60 KG** | 616,700.00 |
| 3 | second receipt → RECEIVED | `PURCHASE_RECEIPT` | +10 | **70 KG** | 629,200.00 |
| 4 | connected PO, 10 PACK = 50 KG, **supplier ships** | *(supplier ledger only: 200 → 190 PACK)* | 0 | **70 KG unchanged** | 629,200.00 |
| 5 | buyer receives 8 PACK = 40 KG | `PURCHASE_RECEIPT` | +40 | **110 KG** | 679,200.00 |
| 6 | buyer receives 2 PACK = 10 KG → RECEIVED | `PURCHASE_RECEIPT` | +10 | **120 KG** | 691,700.00 |

Checks the report must state explicitly:

- MEAT-001 movements = **6**; signed sum `18+2+40+10+40+10` = **120** = `StockBalance.onHandMilli / 1000` ✔
- Step 1 moves the status LOW_STOCK → IN_STOCK, so the low-stock KPI goes **4 → 3** ✔
- Step 4 changes **only** the supplier's ledger — Grand Ocean is unchanged at SHIPPED ✔ (`INV-10`)
- Steps 5–6 change **only** the buyer's ledger — Fresh Foods is unchanged ✔ (`INV-11`)
- Inventory value uses the product's **current purchase cost** (1,250.00), not the PO price — Stockmok
  reports **replacement-cost** value; weighted-average costing is Release D
- **Seeded ledger at t₀ = 12 movements** (the twelve opening balances, 1 Aug). **After the `04` chain, 17**
  (+5, all on MEAT-001). **A3 · DB-CR-026** corrects the previous *"17 seeded, and 17 after the chain"*,
  which was arithmetically impossible — a chain that adds five movements cannot leave the count unchanged,
  and 17 at t₀ contradicts the t₀ figures MEAT-001 `18.000 KG` / `LKR 564,200.00` / 4 low asserted beside
  it. The canonical Gate 6 artifact states the split in its own words: *"17 movements · **twelve opening
  balances on 1 August, five later movements**, all of them on Chicken Breast"*. Owner brief §C.11 rules
  identically. **No canonical figure changes — only the moment each is asserted.**

---

## 5. Seed, reset, import, export

| Script | Command | Behaviour |
|---|---|---|
| `seed` | `tsx scripts/seed.ts --target=emulator` | Idempotent. Builds §1–§4 **through the real commands**, never by direct document writes. Deterministic ids and a fixed logical clock so two runs produce byte-comparable data. |
| `seed:prod` | `tsx scripts/seed.ts --target=production --confirm` | Requires an explicit interactive confirmation and refuses to run against a non-empty database. |
| `reset` | `tsx scripts/reset.ts --target=emulator` | Clears the emulator project and re-seeds. **Refuses `--target=production`, unconditionally.** |
| `emu` | `firebase emulators:start --import ./.emulator-data --export-on-exit` | Day-to-day development with persisted state. |
| `emu:clean` | `firebase emulators:start` | Fresh empty state. |
| export | `--export-on-exit` | Convenience only. `.emulator-data/` is git-ignored and is **never** the authority. |

**The seed runs through the command layer.** This is deliberate: it means the seed itself proves that
`org.create`, `product.create` and `stock.recordOpeningBalance` work, that every movement has a receipt,
and that the ledger reconciles before a single test runs. A seed that writes documents directly would
hide exactly the defects the seed is meant to expose.

**Never:** manually create Firestore collections from the Console; manually seed production data;
demo against production without the seeded dataset present and verified.

## 6. Test plan — deterministic, Emulator Suite

| Layer | Runner | Proves |
|---|---|---|
| Unit | Vitest | money and milli arithmetic, rounding boundaries, `deriveStockStatus`, conversion, handle normalisation, transition tables, payload hashing |
| Rules | `@firebase/rules-unit-testing` + Firestore emulator | tenant isolation, RBAC, immutability, deny-by-default, no enumeration — **≈ 71 assertions** at A3R-P (DB-05 §9 groups 1–26 ≈ 63 after A2, **plus `T-SEC-34 … T-SEC-41` from A3 / A3R**) |
| Command | Vitest + Auth/Firestore/Functions emulators | 8 cases × **37** commands: unauthenticated, wrong role, suspended member, forged `orgId`, invalid state, replay-identical, replay-different-payload, happy path. **A3R-P recount: 37 = the 38 Release-A/B callables (DB-06 §1) less `C-03 user.bootstrapProfile` (optional; the client `setDoc(merge)` covers it).** `C-32 storefront.*` is Release C, declared inert, and was never inside the 38. *(HISTORICAL: A2 · DB-CR-023 (VR-07) computed **34** from a 36-row catalog; `C-35` has since split into `C-35a`/`C-35b` and `C-37`/`C-38` were added, so 34 is SUPERSEDED.)* |
| Ledger property | Vitest, randomised | the core claim of the system |
| Concurrency | Vitest, parallel callables | uniqueness races, receiving races, transfer races |
| E2E | Playwright against emulators | the two-organization round trip |

### 6.1 The single most important test — `T-INT-03`

Generate several hundred random **valid** stock commands across products and warehouses — including
transfers — replay a random subset with identical `operationId`s, and assert after **every** step:

```text
INV-03  sum(signed movements)      == balance          per product AND warehouse
INV-04  sum(balances)              == summary.onHand   per product
INV-18  summary.stockValueMinor    == roundHalfUp(onHand × cost / 1000)
INV-22  every transferId has exactly 2 movements, equal magnitude, opposite sign, different warehouses
INV-23  a transfer leaves summary.onHandMilli, availableMilli and stockStatus UNCHANGED
        (A3R-05: NOT "byte-identical" — stockValueMinor may move by the rounding delta and
         IS written by stock.transfer.  See INV-27.)
INV-24  replaying the ledger in createdAt order reproduces every balanceAfterMilli
INV-26  for EVERY stockBalances row:  stockValueMinor == roundHalfUp(onHandMilli
        x baseUnitPriceMinor / 1000);  stockStatus == deriveStockStatus(onHandMilli,
        minimumStockMilli);  shortfallMilli == max(0, minimumStockMilli - onHandMilli)
                                                                       (A3 · DB-CR-025 · DV-11)
INV-27  for EVERY product:  summary.stockValueMinor == SUM of that product's balance
        stockValueMinor.  Value rounds ONCE, at the balance grain.  Therefore
        Q-053 == SUM(Q-060) over all ACTIVE warehouses, EXACTLY.            (A3R-05)
DV-11   the balance row's denormalised product fields == the live product, and its three
        derived fields are recomputed by the same writer in the same transaction
DV-14   a stockMovement's snapshot fields are never rewritten after create (host immutable)
DV-10   no summary field is sourced from a document outside products/{productId}
```

**`INV-25` is WITHDRAWN** (A3 · DB-CR-027) with the `warehouseName` field it policed, and its assertion is
**removed** from `T-INT-03`. The number is a tombstone; nothing is renumbered. The A2-era line
*"`INV-25` … `warehouseName == the live warehouse name`"* that stood here is **SUPERSEDED**.

If this test is green, the core claim of the entire system is proven — and **integer milli-units are what
make the equality exact rather than approximate**.

### 6.2 Rules tests
Groups **1–26** of DB-05 §9, all P0 — approximately **63** assertions. Includes `T-SEC-24`/`T-SEC-25`
from A1 and **`T-SEC-26` … `T-SEC-33` from A2**, which are the executable form of the external reviewer's
IR-01 and IR-04:

| Test | Asserts |
|---|---|
| `T-SEC-26` | Viewer `list` **and** `get` on `stockMovements` → denied by **rules** |
| `T-SEC-27` | Viewer on `purchaseOrders`/`items`/`history` → denied; IM, SK, AN succeed |
| `T-SEC-28` | IM, SK, AN, V on `privatePartners` → denied; O, A, PM succeed |
| `T-SEC-29` | IM, SK, AN, V on `connections` and `productMappings` → denied; O, A, PM succeed |
| `T-SEC-30` | IM, SK, AN, V on their **own** org's `partnerCatalog` → denied; O, A, PM succeed |
| `T-SEC-31` | non-Admin `list` on `members` → denied; own-`get` → allowed; other-member `get` → denied |
| `T-SEC-32` | on each of the 11 bounded collections: no limit → denied; `limit(101)` → denied; `limit(100)`/`limit(25)` → allowed |
| `T-SEC-33` | all nine dashboard aggregations still succeed — the guard against a later careless limit rule on an aggregation-bearing path |

**Every one of these must fail against the pre-A2 ruleset.** A rules test that passes before the fix it
exists to prove is not evidence, and the run that produced this pack had no such negative control.

### 6.3 Concurrency tests

| Test | Scenario | Expected |
|---|---|---|
| T-CONC-01 | two simultaneous `org.create` with the same handle | exactly one organization, one `HANDLE_TAKEN`, **no partial organization** |
| T-CONC-02 | two simultaneous `product.create` with the same SKU | one success, one `SKU_TAKEN` |
| T-CONC-03 | N simultaneous `stock.adjust` of +1 with distinct operation ids | exactly +N, no lost update |
| T-CONC-04 | two receipts of the full outstanding quantity | one success, one `OVER_RECEIPT` — **received can never exceed outstanding** |
| T-CONC-05 | stock added while `warehouse.archive` runs | archive fails; the bounded query inside the transaction sees it |
| T-CONC-06 | duplicate `connection.request` | one document; the second fails on `txn.create` |
| **T-CONC-07** | **two transfers of 30 from a balance of 50** | **one success, one `INSUFFICIENT_STOCK`; balance never negative** |
| **T-CONC-08** | **a transfer and an adjustment on the same balance concurrently** | **both serialise; `sum(movements) == balance` holds** |

### 6.4 `T-XFER-01 … T-XFER-12` — the A1 test family, all P0

| ID | Assertion |
|---|---|
| T-XFER-01 | A valid transfer writes exactly **seven** documents: 2 movements, 2 balances, **1 `productStockSummaries/{productId}` (`stockValueMinor` only, per `INV-27`)**, 1 audit, 1 receipt. *(A3R-05: **six** is SUPERSEDED — the write set is 6 → 7.)* |
| T-XFER-02 | The two movements share one `transferId`, carry equal magnitude and opposite sign, name different warehouses, and each carries the correct `counterpartWarehouseId`. |
| T-XFER-03 | `ProductStockSummary.onHandMilli`, `.availableMilli` and `.stockStatus` are **unchanged** before and after (`INV-23`), and `.stockValueMinor` equals the **sum of the product's balance values** after the write (`INV-27`). *(A3R-05: *"byte-identical"* is SUPERSEDED — the summary is written, for that one field.)* |
| T-XFER-04 | Organization total for the product is unchanged. |
| T-XFER-05 | `from == to` → `SAME_WAREHOUSE`, nothing written. |
| T-XFER-06 | `quantityMilli <= 0` or > 3 dp → `INVALID_QUANTITY`, nothing written. |
| T-XFER-07 | Quantity exceeding the source balance → `INSUFFICIENT_STOCK`, **no negative balance, nothing written**. |
| T-XFER-08 | Replay with the identical payload → stored result, **no second movement pair**, balances unchanged. |
| T-XFER-09 | Replay with a different quantity and the same `operationId` → `OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD`. |
| T-XFER-10 | An archived product or an archived warehouse → `PRODUCT_NOT_ACTIVE` / `WAREHOUSE_NOT_ACTIVE`. |
| T-XFER-11 | **A warehouse id belonging to another organization → `CROSS_TENANT_REFERENCE`; no document in either organization is written.** |
| T-XFER-12 | **`STOREKEEPER`, `PROCUREMENT_MANAGER`, `ANALYST` and `VIEWER` → `ROLE_NOT_PERMITTED`; `OWNER`, `ADMIN`, `INVENTORY_MANAGER` succeed.** |

Plus a transfer into a warehouse with **no existing balance document** — the destination balance is
created by `set`, and `balanceAfterMilli` equals the transferred quantity.

### 6.5 Seed reconciliation test — `T-SEED-01`

After `seed`, assert against §2 and §4 **by query, not by fixture constant**:
`Q-050 == 12` · `Q-051 == 4` (**at t₀**; the `04` chain's step 1 moves it to 3) · out-of-stock `== 1` · `Q-054 == 0` · `Q-055 == 0` ·
**`T-SEED-01a` — the t₀ block, asserted immediately after `npm run seed`:**
`Q-053 == 56_420_000` minor units · MEAT-001 balance `== 18_000` milli · **ledger `== 12` movements** ·
every `stockValueMinor` equals its own arithmetic · Fresh Foods 200 PACK and 300 KG ·
`CKN-B5` published with `orderUnit == baseUnit`.
**`T-SEED-01b` — the post-chain block, asserted after replaying the `04` chain:**
`Q-053 == 69_170_000` (**LKR 691,700.00**) · MEAT-001 `== 120_000` milli · **ledger `== 17` movements** ·
MEAT-001's own history `== 6` movements · low `== 3` · out `== 1` ·
`sum('stockValueMinor')` Cold Room `== 39_890_000` (**LKR 398,900.00**) · Main Store `== 29_280_000`
(**LKR 292,800.00**) · the two summing exactly to `Q-053`.

**Arithmetic bridge, recomputed independently:** `120.000 − 18.000 = 102.000 KG × LKR 1,250.00 =
LKR 127,500.00`, and `564,200.00 + 127,500.00 = 691,700.00` ✔. The five later movements are `+40.000`
and `+10.000` against `PO-2026-001` (Green Farm, 50.000 KG), `+40.000` and `+10.000` against
`CPO-2026-003` (Fresh Foods Ltd, 10 PACK = 50.000 KG at 1 PACK = 5 KG), and a `+2.000` correction —
matching the canonical movement report's `Opening 18.000 · Received 100.000 · Issued 0.000 ·
Corrected +2.000 · Closing 120.000` line for line. One opening + five later = the six MEAT-001 movements.

**Why 4 low at t₀ and 3 after the chain are both correct.** At t₀ MEAT-001 is `18.000 KG` against a
minimum of `20.000` and is therefore LOW; after the chain it stands at `120.000` and clears. The canonical
board draws the **post-chain** workspace (*"Three low — Fish Fillet, Butter Block, Wheat Flour — and one
out of stock, Cooking Oil. Chicken Breast is no longer low"*). Both figures are correct; each is now
labelled with the state it belongs to.

**A3R-P2 — `T-SEED-01a` / `T-SEED-01b` remain command-driven evidence, and the C1 bootstrap tests are not
an upgrade of them.** The Codex C1 foundation ran owner-approved **emulator-only bootstrap** variants
(`seed:bootstrap` / `replay:bootstrap`, `T-SEED-01a-BOOTSTRAP` / `T-SEED-01b-BOOTSTRAP`) built with the
Admin SDK, because no command layer existed yet. Those certify **fixture construction, schema shape,
integer arithmetic, reconciliation and deterministic reproducibility only** — they are **not** command,
RBAC, Security-Rules, transaction-boundary, audit, notification, concurrency or callable-idempotency
evidence, and they do not discharge this section. The canonical `seed` / `replay` script names and the
canonical `T-SEED-01a` / `T-SEED-01b` assertions stay **reserved** for the real command layer and are run
through it once `C-01`, `product.create` and `C-13` exist; §5's *"the seed runs through the command layer"*
is unchanged as the standing requirement. No canonical figure in §2 or §4 is affected either way.

### 6.6 E2E — Playwright against emulators

Eight specs, reducible to five under `CUT-5`: public → sign-up → onboarding · branded login role
mismatch · product CRUD → archive · opening balance → adjustment → **transfer** → movement history ·
private PO → partial receipt → full receipt · RBAC direct-URL denial · tenant-isolation denial · the
two-organization connected round trip (discover → connect → publish → map → submit → accept → ship →
receive ×2).

---

## 7. Migration and versioning

There is no legacy data and no production instance, so **there is no migration in Release A/B.** What is
defined here is the mechanism the project will need the first time a schema changes.

| Concern | Decision |
|---|---|
| Schema version | `organizations/{orgId}.schemaVersion: 1`, written by `org.create`. Read by nothing in A/B; present so a future migration can select. |
| Migration style | Forward-only, idempotent, script-driven under `scripts/migrations/NNN_name.ts`. Each is a command-layer operation, never a raw document rewrite, so invariants and audit hold during the migration. |
| Reversibility | Not attempted. Roll forward with a corrective migration; `firebase hosting:rollback` covers the frontend, and Functions roll back by redeploying the previous tagged commit. Both are rehearsed on Day 12, not discovered on submission day. |
| Index changes | Deploy indexes **first**, then rules, then functions, then the bundle, then hosting. Deploying the app before the indexes it needs produces a live site that fails in ways that look like application bugs. |
| Additive fields | New optional fields need no migration. `balanceAfterMilli` and `transferId` are additive and only apply to movements written after their introduction — historical rows would carry neither, which is why they are introduced **before** any production data exists. |
| Destructive change | Requires an owner-approved amendment in the form of DB-00 / A1. |

---

## 8. Test-data factories

`tests/factories/` — deterministic, override-friendly, never random unless a test asks:
`anOrganization()` · `aMember(role)` · `aProduct(overrides)` · `aWarehouse()` · `aBalance(p, w, milli)` ·
`aMovement(type, overrides)` · `aTransfer(p, from, to, milli)` · `aPrivatePO(lines)` ·
`aConnection(status)` · `aCatalogItem()` · `aMapping()` · `aConnectedPO(status)`.

Factories write through `withSecurityRulesDisabled` for rules tests and through the **command layer** for
integration tests — so an integration fixture can never construct a state the commands would refuse.

---

## 9. Plan result

```
CANONICAL_SEED_RECONCILIATION = PASS
  t₀         12 products · 4 low · 1 out · LKR 564,200.00 · 12 movements · MEAT-001 18.000 KG
  post-chain 12 products · 3 low · 1 out · LKR 691,700.00 · 17 movements · MEAT-001 120.000 KG
             Cold Room LKR 398,900.00 + Main Store LKR 292,800.00 = LKR 691,700.00
  MEAT-001   6 movements (1 opening + 5 later), all in Cold Room
SEED_AMENDED_BY_A1            = NO
SEED_AMENDED_BY_A2            = NO     (A2 changes rules, two summary fields, nine balance fields and
                                        five indexes; it changes no seeded value)
VERIFIED_AGAINST_ARTIFACT     = cb94a73c… — the file physically named
                            `Stockmok Gate 6 Dashboard Inventory new.dc.html` (A3 §8.1: the manifest's
                            filename column is inverted; its hash column for Gate 6 is correct, and the
                            bytes this pack certified against were always the right ones)
EXCLUDED_FROM_BYTE_RECONCILIATION = board 6m's two mobile frames (Cold Room 80.000 / Main Store 40.000,
                            and the adjust sheet's 116.000 KG total) and `22` §2's five non-canonical
                            "Additional products". Both are design-side artifacts of record, ruled on by
                            owner brief §C.13 and resolved in A3 §8.9 items 2–3. The canonical MEAT-001
                            state is 120.000 KG entirely in Cold Room, which the same file's desktop
                            product detail, archive dialog and Cold Room valuation all require.
SEED_WRITES_THROUGH_COMMANDS  = YES
EMULATOR_REPRODUCIBLE         = YES
TEST_FAMILIES                 = unit · rules (~71) · command (8 x 37) · ledger property · concurrency (8) · transfer (12) · seed reconciliation · E2E (8)
NEW_TESTS_FROM_A2             = T-SEC-26 … T-SEC-33 (8) + INV-25 in T-INT-03 + query-id integrity
                                + deriveStockStatus at balance grain (DB-09 §8)
                                [HISTORICAL — INV-25 was WITHDRAWN at A3 · DB-CR-027 and its
                                 T-INT-03 assertion is removed]
NEW_TESTS_FROM_A3_A3R         = T-SEC-34 … T-SEC-41 (8) + INV-26 and INV-27 in T-INT-03
                                + T-XFER-01/03 restated to the 7-document write set
                                + T-CMD-40 (warehouse.create refuses beyond 100 ACTIVE warehouses)
NEW_TESTS_FROM_A3R_P          = 0 new families.  The query-id integrity test now asserts the
                                exact 92-id set (DB-04 §9) and fails on any dangling id —
                                which is how Q-085g would have been caught at A3R.
PRODUCTION_SEEDED_IN_THIS_RUN = NO
```
