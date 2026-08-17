# STOCKMOK — FINAL INDEPENDENT FRONTEND ↔ DATABASE CONSISTENCY REVIEW

**Reviewer role:** independent. Did not author the database pack, A1, A2 or DB-11.
**Date:** 2026-08-17 · **Inputs:** the frozen design authorities, `docs/ui-final/18–24`,
`Stockmok_Final_Control_Pack_v4/02–11,16`, `docs/database-final/DB_00 … DB_11`, and the
`.dc.html` artifacts in `visual-designs/completed Stockmok Design programme/`.
**Nothing was modified.** `PRODUCTION_CODE_CHANGED = NO` · `DESIGNS_MODIFIED = NO` ·
`DATABASE_PACK_MODIFIED = NO` · `CODEX_STARTED = NO`.

**Owner decisions honoured as given:** `UI-OD-001` (canonical TABLE-001 columns = Product · SKU ·
Category · On hand · Minimum · Stock value) and `UI-OD-002` (warehouse-filter semantics). Neither was
reinterpreted; several findings below exist *because* the database pack has not been brought into line
with them.

---

## 0 — HEADLINE

```
FRONTEND_DB_INDEPENDENT_REVIEW = FAIL

CRITICAL_FINDINGS = 5
HIGH_FINDINGS     = 16
MEDIUM_FINDINGS   = 18
LOW_FINDINGS      = 5
TOTAL             = 44
```

The A2 amendment closed the six external findings it set out to close. It did not close the class of
defect those findings represent, and in two places it **reintroduced** it. Separately, the single item
DB-10 §7 raised to *"before any further review"* — the design artifact manifest — is worse than DB-10
believed, and it undermines the evidentiary basis of the pack's own IR-06 refutation.

The most consequential finding is not an RBAC hole. It is that **three of the four canonical monetary
figures on the frozen dashboard cannot be produced by any query in DB-04**, because the two aggregations
that back them sum quantity where the design requires currency.

---

## 1 — CRITICAL

### FINDING_ID: F-C-01 — the canonical design artifact set is unverifiable; 7 of 10 "canonical" files do not exist
- **SEVERITY:** CRITICAL
- **SOURCE:** `STOCKMOK_FINAL_DESIGN_ARTIFACT_MANIFEST.md` §1, §4; `visual-designs/completed Stockmok Design programme/`
- **DATABASE_FILE + SECTION:** `DB_00` §5, §7.6 · `DB_08` §9 (`VERIFIED_AGAINST_ARTIFACT = cb94a73c…`) · `DB_11` §G, §G.4 · `DB_10` §7 item 1
- **WHAT_IS_WRONG:** I recomputed SHA-256 over every `.dc.html` in the design-programme folder. **Only 2 of the manifest's 10 canonical hashes match** (Gate 12, Gate 14). The manifest's recorded canonical hashes for Design System (`81e6fba3…`), Gate 5 (`8a0ddc07…`), Gate 7 (`776a0268…`), Gate 8 (`9a953ffd…`), Gate 9 (`dcf064c4…`), Gate 10 (`7267ee22…`) and Gate 11 (`0f571341…`) **match no file present anywhere in the connected workspace**. Measured values:

  | Manifest says canonical | Manifest hash | Actual hash of that filename | Verdict |
  |---|---|---|---|
  | Design System.dc.html | `81e6fba3…` | `8f1880d5…` | file the manifest names does not exist |
  | Gate 5 …Onboarding.dc.html | `8a0ddc07…` | `27de3d9e…` | does not exist |
  | Gate 6 Dashboard Inventory.dc.html | `cb94a73c…` | **`ea760d2b…`** | **hash belongs to the file the manifest calls a DUPLICATE** |
  | Gate 7 Private Procurement.dc.html | `776a0268…` | `d09c75fe…` | does not exist; the "new" file **is** the recorded superseded `f8a7c504…` |
  | Gate 8 Network Foundation.dc.html | `9a953ffd…` | `4d6246a2…` | does not exist |
  | Gate 9 Connected Workflows.dc.html | `dcf064c4…` | `0f53b4d3…` | does not exist; "new" **is** the recorded superseded `e1003987…` |
  | Gate 10 Supporting Operations.dc.html | `7267ee22…` | `5b1bcf46…` | does not exist |
  | Gate 11 Responsive Reconciliation.dc.html | `0f571341…` | `e51514dd…` | does not exist |
  | Gate 12 States Accessibility.dc.html | `1ab770af…` | `1ab770af…` | ✔ |
  | Gate 14 Owner Approval.dc.html | `a1bbc21b…` | `a1bbc21b…` | ✔ |

  The manifest additionally asserts Gate 6 `…new.dc.html` is *"byte-identical"*. It is **31,392 bytes larger**.
- **CONCRETE_FAILURE_SCENARIO:** DB-08 §9, DB-11 §G and DB-00 §7.6 all certify against `cb94a73c…`. That hash is the file named `Stockmok Gate 6 Dashboard Inventory **new**.dc.html`, which manifest §4 classifies `DUPLICATE → superseded/duplicate-downloads/`. An implementer who executes the manifest's own instruction moves `cb94a73c…` into `superseded/` and builds from `ea760d2b…`. I verified that `ea760d2b…` contains **`Issued to kitchen` five times** and `cb94a73c…` **zero times** — so following the manifest reinstates the exact row IR-06 was rejected over. The DB pack's refutation of IR-06 is correct *about the bytes* and wrong *about which file is canonical*.
- **AUTHORITY_EVIDENCE:** Manifest §1 rows and §4 destination column; the manifest's closing line `FINAL_FRONTEND_AUTHORITY_SET = UNAMBIGUOUS`; `DB_00` §7.6; `DB_11` §G.4; `DB_10` §7 item 1 (*"the manifest itself is still factually wrong"* — but it anticipates only *"invert the Gate 6/7/9 supersession"*, not that seven canonical files are absent).
- **RECOMMENDED_FIX:** Owner task, before Codex and before any further review. Re-hash every artifact from bytes. Either produce the seven missing canonical files or formally re-designate the on-disk files as canonical with a decision-ledger entry. Rename `…new.dc.html` → the canonical name and physically move the pre-patch copies to `25_superseded/`. Until then no DB claim that cites an artifact hash is independently checkable.

---

### FINDING_ID: F-C-02 — Inventory by location and the warehouse-archive refusal require a currency value; both queries return a quantity
- **SEVERITY:** CRITICAL
- **SOURCE:** `24_FINAL_DATA_VISUALIZATION_CATALOG.md` `CHART-002` · `19` `TABLE-027` · canonical Gate 6 board 6j · `STOCKMOK_DESIGN_HANDOFF_NEXT_CHAT.md` §4 · `23` §9 warehouse-archive copy
- **DATABASE_FILE + SECTION:** `DB_04` §6 `Q-060`; `DB_04` §8 `Q-058`; `DB_02` §4.4 (StockBalance field set)
- **WHAT_IS_WRONG:** `Q-060` is defined as `sum('onHandMilli')` **per warehouse**. `Q-058` is `count() + sum('onHandMilli')`. Both are quantity sums. The frozen surfaces they back are **monetary**:
  - `CHART-002`: *"one horizontal bar per warehouse using **inventory value in the organization currency**. Values must reconcile with Inventory Value KPI."* Adjacent table: *"Warehouse, **Inventory value**, Share of total."*
  - `Q-058`'s own stated purpose in DB-04 §8: *"Cold Room holds 6 products worth **LKR 398,900.00**"*.
  - Canonical anchors: Cold Room **LKR 398,900.00**, Main Store **LKR 292,800.00**, summing to 691,700.00.

  `stockBalances` carries `onHandMilli` and `baseUnitPriceMinor` but **no per-row `stockValueMinor`**. DB-CR-017 added nine display fields and deliberately did not add a value field. Firestore `sum()` cannot multiply two fields, so no aggregation over `stockBalances` can produce a per-warehouse currency total.
- **CONCRETE_FAILURE_SCENARIO:** The dashboard renders `CHART-002` from `Q-060`. Grand Ocean's Cold Room bar shows `sum(onHandMilli)` = 120.000 KG + 40.000 KG + 10.000 KG + 120.000 **L** + 8.000 KG + 25.000 KG = 323,000 milli — a number that mixes kilograms and litres and is dimensionally meaningless. It is not 398,900, it is not in LKR, and the two bars do not reconcile to the Inventory Value KPI of LKR 691,700.00, which `CHART-002` explicitly requires. Identically, clicking Archive on Cold Room produces *"Cold Room holds 6 products worth 323,000"* instead of the frozen copy.
- **AUTHORITY_EVIDENCE:** `24` `CHART-002` data row; `DB_04` §6 `Q-060` row (`sum('onHandMilli')`); `DB_04` §8 `Q-058` row and its quoted message; `DB_02` §4.4 field table (no value field); `DB_11` §G.2 rows *Cold Room* / *Main Store* — which recompute 398,900 and 292,800 **from product costs**, not from any declared query, and then record `CANONICAL_UI_DATA_RECONCILIATION = PASS`.
- **RECOMMENDED_FIX:** Owner-approved schema amendment. Either (a) add `stockValueMinor` to `stockBalances`, maintained by the same writers as DV-11 and by every stock command (this also makes the warehouse-filtered `TABLE-001` *Stock value* column a read rather than a client multiplication), and redefine `Q-060`/`Q-058` as `sum('stockValueMinor')`; or (b) obtain an owner decision that `CHART-002`, `TABLE-027` and the archive-refusal message state quantity, not value — which contradicts the frozen board and the canonical anchors and is therefore not recommended.

---

### FINDING_ID: F-C-03 — the seeded ledger is specified as 17 movements at t₀; it is arithmetically 12, and `T-SEED-01` can never pass
- **SEVERITY:** CRITICAL
- **SOURCE:** canonical Gate 6 board 6h/6k (*"Twelve opening balances plus the five later movements on Chicken Breast"* — the **post-chain** workspace) · `16` §7.2/§7.3
- **DATABASE_FILE + SECTION:** `DB_08` preamble, §4 final bullet, §6.5 `T-SEED-01`, §9 · `DB_09` §9, §11 · `DB_11` §G.2 · `STOCKMOK_DATABASE_HANDOFF_NEXT_CHAT.md` "Seed"
- **WHAT_IS_WRONG:** The pack states in five places that the **seeded** ledger is 17 movements = 12 openings + the 5 later MEAT-001 movements, while simultaneously stating that at t₀ MEAT-001 is 18.000 KG, inventory value is LKR 564,200.00 and low stock is 4. Those are mutually exclusive. The 5 later movements are precisely what takes MEAT-001 from 18 → 120 KG and the value from 564,200 → 691,700. `17` is the **post-chain** count the canonical board draws; the seed at t₀ has **12** movements. `16` §7 — the named seed authority — never says 17.
- **CONCRETE_FAILURE_SCENARIO:** Codex runs `npm run seed`, then `npm run test:seed`. `T-SEED-01` asserts, in one block, `Q-053 == 56_420_000` **and** `MEAT-001 balance == 18_000` **and** `ledger == 17 movements`. The first two hold; the third fails at 12. DB-09 §11 lists *"The seed cannot reconcile to LKR 564,200.00 / 12 / 4 / 1 / **17**"* as a hard STOP condition, so Codex halts on day one on an unsatisfiable target. If an implementer instead "fixes" the seed to emit 17 movements, the seed reconciles to 691,700 / 3 low / 120 KG and DB-09 §9's hand-check fails on four figures instead of one.
- **AUTHORITY_EVIDENCE:** `DB_08` §4 *"Seeded ledger = **17** movements (12 openings + 5 later on MEAT-001); after the full chain, 17"* — the second clause is the tell: a chain that adds five movements cannot leave the count unchanged. `DB_08` §6.5; `DB_09` §9 *"all at **t₀**, before the `04` chain runs: … ledger = 17 movements"*; `DB_11` §G.2 row *Seeded ledger*, which cites the board's post-chain *"Showing 1–17 of 17"* as evidence for a t₀ figure.
- **RECOMMENDED_FIX:** Correct to **12 seeded movements at t₀ → 17 after the `04` chain** in DB-08 preamble/§4/§6.5/§9, DB-09 §9/§11, DB-11 §G.2 and the database handoff. Split `T-SEED-01` into a t₀ assertion block (12) and a post-chain assertion block (17).

---

### FINDING_ID: F-C-04 — DV-11 `warehouseName` violates the exact audit rule A2 introduced; `INV-25` breaks on ordinary correct use
- **SEVERITY:** CRITICAL
- **SOURCE:** `19` `FORM-008` (Warehouse: name editable) · `23` §3 *Create/update Warehouse = O/A/IM FULL*
- **DATABASE_FILE + SECTION:** `DB_02` §4.4 Consistency paragraph · `DB_07` §12 DV-11 and its closing audit rule · `DB_07` §11 `INV-25` · `DB_05` §4 (`warehouses` = `SAFE_DIRECT_CLIENT_WRITE`) · `DB_06` §1 (no `warehouse.update` command exists)
- **WHAT_IS_WRONG:** DB-CR-016 deleted `categoryName` and `preferredSupplierName` and DB-07 §12 then states the rule they failed: *"**a derived field may only be denormalised from a document written by the same transactional writer as its host.** … every field in DV-01 … DV-11 now passes it."* `StockBalance.warehouseName` does not pass it. Its source is `warehouses/{warehouseId}.name`, a **client-written** document (one of the six `SAFE_DIRECT_CLIENT_WRITE` surfaces); its host `stockBalances` is command-written. DB-02 §4.4 names the writers as `product.create`, `product.update`, `product.setStatus` and stock commands — **none of which runs on a warehouse rename**, and no `warehouse.update` command exists to hang a fanout on. This is `categoryName` with a different label.
- **CONCRETE_FAILURE_SCENARIO:** An Inventory Manager opens SCREEN-015 and renames `Cold Room` → `Cold Store` (a plain client write, no command, no transaction). Every `stockBalances` document for that warehouse still carries `warehouseName: "Cold Room"`. The Stock-on-Hand report in store-room mode (`Q-074`…`Q-076`, whose *Warehouse* column DB-11 §B.3 justifies as *"the report's Warehouse column without a join"*) renders the old name indefinitely. `INV-25` — *"its `warehouseName` equals the live `warehouses/{warehouseId}.name`"* — is now false in production. `T-INT-03` will not catch it: the property test asserts INV-25 *"after every command"*, and a warehouse rename is not a command.
- **AUTHORITY_EVIDENCE:** `DB_07` §12 DV-11 source-of-truth row and the final paragraph of §12; `DB_07` §11 `INV-25`; `DB_02` §4.4 *"Writers: `product.create`, **`product.update`**, **`product.setStatus`**, and every stock command that creates a balance"*; `DB_05` §4 `…/warehouses/**` UPDATE = `INVENTORY_WRITERS`; `DB_09` §11 final stop condition — *"A denormalised field you are about to type is sourced from a document written by a different writer than its host. That is the exact defect DB-CR-016 repaired. Stop and report."* This finding is that stop condition firing against A2 itself.
- **RECOMMENDED_FIX:** Owner-approved amendment, three options in preference order. (1) Delete `warehouseName` from `stockBalances`; the *Warehouse* column renders from `Q-017`, which `048` already loads for its own warehouse filter — the identical remedy DB-CR-016 applied to the Category label. (2) Introduce `C-37 warehouse.update` and move warehouse create/update out of the client-write surfaces, fanning out to that warehouse's balances — but this narrows a frozen `06` §6.1 surface and is bounded by *product* count, which is the failure mode A2 rejected. (3) Reclassify `warehouseName` as DV-09 *deliberately allowed to drift* — inadmissible, because it backs a live report column, not a historical snapshot.

---

### FINDING_ID: F-C-05 — the frozen Status filter and the frozen Store room filter cannot be combined; DB-CR-018 made the combination unqueryable
- **SEVERITY:** CRITICAL
- **SOURCE:** canonical Gate 6 board 6d filter bar — `Category: All ▾ · Store room: All ▾ · Status: All ▾ · Archived: Excluded ▾`, all four simultaneously present · `22` `FIELD-051` + `FIELD-052` · `19` `TABLE-001` *"category, stock status, warehouse, archived filters"*
- **DATABASE_FILE + SECTION:** `DB_04` §3.1 `Q-074`…`Q-078` · `DB_02` §4.4 (*"No per-row `stockStatus` field exists"*, DB-CR-018) · `DB_07` §12 DV-11
- **WHAT_IS_WRONG:** DB-CR-018 rules that a balance row's `stockStatus` is **derived at render time and never persisted**. `Q-074`…`Q-078` therefore offer `productStatus`, `warehouseId`, `categoryId`, `internalSkuNormalized` and three sorts — and **no status predicate**. A filter that is not a persisted field cannot be a Firestore `where`. So the moment a store room is selected, the Status filter has nothing to query against, and vice versa. UI-OD-002 makes this worse, not better: it fixes Status, when a store room is selected, as *"that store room's stock status"* — precisely the value DB-CR-018 refuses to persist.
- **CONCRETE_FAILURE_SCENARIO:** A user on SCREEN-011 sets `Store room: Cold Room` and `Status: Low`. There is no query. The three available implementations are all defects: (a) drop the Status filter silently — the control lies; (b) filter the fetched 25-row page client-side — page 1 of 12 Cold Room rows returns 2 low rows, page 2 returns others, the count is wrong and pagination breaks; (c) fetch unbounded and filter — breaks `NFR-017`, the 25/100 page contract and the `limit ≤ 100` rule. The same failure hits the frozen *"Needs attention · 4"* tab under an active store-room filter, and `TABLE-013`'s status filter in per-store-room mode.
- **AUTHORITY_EVIDENCE:** `DB_04` §3.1 query table (no `stockStatus` column); `DB_02` §4.4 *"**No per-row `stockStatus` field exists** (DB-CR-018)"*; `DB_07` §12 DV-11 row 3; canonical Gate 6 6d filter bar; `DB_11` §F `UNSUPPORTED_FILTERS = 0`; `DB_10` §7 item 9, which asks the owner about column *semantics* and never notices the filter is unserviceable.
- **RECOMMENDED_FIX:** Owner decision required, because both horns touch frozen contracts. Either persist `stockStatus` on `stockBalances` (reversing DB-CR-018 and accepting a fanout on every movement, plus one index `productStatus, warehouseId, stockStatus, …`), or obtain an owner decision that the Status filter is **mutually exclusive** with the Store room filter and is disabled while a store room is selected — the same honesty DB-04 already applies to sorting on non-indexed columns. Do not resolve this by client-side page filtering.

---

## 2 — HIGH

### FINDING_ID: F-H-01 — `Q-079` is referenced by DB-06 and defined nowhere; the A2 integrity test is scoped so it cannot catch it
- **SEVERITY:** HIGH · **SOURCE:** n/a (database-internal, but it breaks the coverage claim the frontend gate rests on)
- **DATABASE_FILE + SECTION:** `DB_06` §4 and §6.1 (five references to `Q-079`) · `DB_04` §9 (`78 defined query ids`) · `DB_09` §8 test 1 · `DB_11` §F proof 1
- **WHAT_IS_WRONG:** `grep -c Q-079 DB_04 = 0`. DB-04 declares itself *"Query IDs are defined in DB-04"* and lists Q-001…Q-078 (less Q-049, plus Q-013b). `Q-079` was created by DB-CR-017 inside **DB-06 §6.1** and never back-ported. The remedy DB-CR-021 wrote for exactly this defect — DB-09 §8 test 1 — parses *"DB-04, DB-03 and DB-11"* only. DB-06 and DB-02 are outside its scope, so the test passes while the defect stands.
- **CONCRETE_FAILURE_SCENARIO:** Codex implements `src/data/` query functions *"named for their Q-ids"* (DB-09 §2). There is no `Q-079` row to derive a name, collection, filter, order, page size or index from; the only description sits in a command contract Codex is forbidden to implement. DB-09 §11 stop condition *"A query you need has no Q-id"* fires. Meanwhile `QUERY_COVERAGE = 100%` and `UNDEFINED_QUERY_IDS = 0` are both false, for the third time in this pack's history.
- **AUTHORITY_EVIDENCE:** `DB_06` §6.1 table row `**Q-079**`; `DB_04` §9 block; `DB_09` §8 test 1 scope sentence; `DB_11` §K `QUERIES 78 defined, 0 referenced-but-undefined (was 3)`.
- **RECOMMENDED_FIX:** Add `Q-079` to DB-04 §8 (command-internal queries) with collection `stockBalances`, filter `productId ==`, bound `limit(100)`, index `IDX-09`, callers `product.update` / `product.setStatus`. Widen the DB-09 §8 integrity test to parse **DB-02, DB-05, DB-06 and DB-08** as well.

### FINDING_ID: F-H-02 — Needs Attention is specified as low-stock-only; the canonical board leads with out-of-stock and orders by shortfall
- **SEVERITY:** HIGH · **SOURCE:** canonical Gate 6 board 6c — *"Needs attention · **Four items · out of stock first, then the largest shortfall**"*, rows Cooking Oil ✕ Out of stock / Wheat Flour / Fish Fillet / Butter Block · `19` §5.2 *"Needs Attention (**low/out of stock**, …)"*
- **DATABASE_FILE + SECTION:** `DB_04` §3 `Q-021` · `DB_03` §2 SCREEN-010 · `DB_11` §A.2 row `024–027` · `19` `TABLE-025`
- **WHAT_IS_WRONG:** Two defects in one panel. (a) `Q-021` filters `stockStatus == 'LOW_STOCK'` and its empty copy is *"All tracked products are above their minimum level."* — so Cooking Oil, the OUT_OF_STOCK row the board places **first**, can never appear. (b) The frozen ordering is *out-of-stock first, then largest shortfall*. Shortfall = `minimumStockMilli − onHandMilli` is not a persisted field and is not indexable; `IDX-04` orders `onHandMilli ASC`.
- **CONCRETE_FAILURE_SCENARIO:** At the canonical post-chain state, the frozen board shows **Cooking Oil (short 40 L), Wheat Flour (20), Fish Fillet (2), Butter Block (2)**. `Q-021` with `IDX-04` returns **Butter Block (8), Fish Fillet (10), Wheat Flour (60)** — three rows, wrong set, wrong order, and the dashboard's *"Four items"* label is unachievable. The identical mismatch hits the *"Needs attention · 4"* tab on SCREEN-011, which the board draws with a **Short by** column and the same ordering.
- **AUTHORITY_EVIDENCE:** `DB_04` §3 `Q-021` row and empty-state string; `19` `TABLE-025` *"status LOW only"*, which itself contradicts `19` §5.2's *"low/out of stock"*; canonical board 6c and 6e; `DB_11` §A.2 row `024–027` maps the whole panel set to `Q-021`, `Q-033`, `Q-060`, `Q-063`.
- **RECOMMENDED_FIX:** Redefine `Q-021` as `productStatus == 'ACTIVE' and stockStatus in ['OUT_OF_STOCK','LOW_STOCK']`, `orderBy onHandMilli ASC`, `limit(5)`, served by `IDX-36`; state explicitly that the frozen *out-first-then-shortfall* ordering is applied **client-side over the bounded ≤5-row result**, and record the ordering as a client contract rather than a query contract. Fix the `19` `TABLE-025` / `19` §5.2 internal contradiction as a UI-authority item.

### FINDING_ID: F-H-03 — warehouse restore is a legal transition with no execution path, and DB-02 and DB-05 specify contradictory rules
- **SEVERITY:** HIGH · **SOURCE:** `23` §7.2 *"Warehouse ARCHIVED -> ACTIVE | Restore for O/A/IM; always permitted"* · `19` §5.2 SCREEN-015
- **DATABASE_FILE + SECTION:** `DB_01` §8 · `DB_02` §4.2 · `DB_05` §4 (`warehouses` UPDATE row) and §9 group 8 · `DB_06` §1 (36-command catalog) · `DB_07` §4
- **WHAT_IS_WRONG:** DB-07 §4 and DB-01 §8 both declare `ARCHIVED → ACTIVE` legal and *"always permitted"*. The catalog has `C-12 warehouse.archive` and **no `warehouse.restore`**. On the client side the two schema authorities disagree: DB-02 §4.2 says *"a client may not set **`ARCHIVED`**"* (implying setting `ACTIVE` is allowed), while DB-05 §4 says *"**`status` may not change**"* and DB-05 §9 group 8 tests *"Warehouse update setting `status` → **denied**"* without qualification. Under DB-05 — the binding rules authority — restore is impossible at both layers.
- **CONCRETE_FAILURE_SCENARIO:** An Owner archives `Bar Store`, then tries to restore it from SCREEN-015. The client write is rejected by `firestore.rules` (DB-05) and there is no callable to invoke. The warehouse is permanently archived, in a system whose stated lifecycle guarantee is that restore is *always permitted*. Note this is not cosmetic: DB-02 §3.2 forbids archiving the default warehouse, so a workspace can be left with archived rooms it cannot recover and stock it cannot receive into.
- **AUTHORITY_EVIDENCE:** `DB_07` §4 transition table row 2; `DB_01` §8 Warehouse row; `DB_06` §1 (no restore command); `DB_05` §4 vs `DB_02` §4.2; `DB_11` §D row *Warehouse* lists only `client status write` as forbidden and does not notice restore has no owner.
- **RECOMMENDED_FIX:** Add `C-37 warehouse.restore` (`INVENTORY_WRITERS`, transaction, audit) mirroring `C-35 category.restore`, and make DB-02 §4.2 and DB-05 §4 agree that a client may not change `status` **in either direction**.

### FINDING_ID: F-H-04 — the frozen *Preferred supplier* field is unreadable for four of seven roles, and its dropdown has no query
- **SEVERITY:** HIGH · **SOURCE:** `19` `FORM-006` (*"preferred private supplier optional"*) · `19` §5.2 SCREEN-013 (*"Overview fields **exactly** name, SKU, category, base unit, purchase/selling price, minimum, reorder target, status, **preferred supplier**"*) · `23` §4 SCREEN-012 = IM **FULL**, SCREEN-013 = all seven READ_ONLY or better
- **DATABASE_FILE + SECTION:** `DB_05` §4 (`privatePartners` READ = `PARTNER_WRITERS`, DB-CR-015) · `DB_02` §4.3 (`preferredPrivateSupplierId`) · `DB_03` §2 SCREEN-012 reads `Q-014, Q-016` and SCREEN-013 reads `Q-014, Q-020, Q-017+Q-018, Q-023, Q-048, Q-044`
- **WHAT_IS_WRONG:** DB-CR-016 deleted `preferredSupplierName` from the summary *because* copying it would leak partner data to four denied roles. It did not remove the requirement to display it. `products.preferredPrivateSupplierId` is an **id**; resolving it to a name needs `privatePartners`, which DB-CR-015 restricted to `PARTNER_WRITERS`. Neither SCREEN-012 nor SCREEN-013 declares `Q-031` as a read, and for IM/SK/AN/V the read is denied in rules.
- **CONCRETE_FAILURE_SCENARIO:** (a) An **Inventory Manager** — who has `FULL` on SCREEN-012 and is one of only three roles that may create a product — opens the product form. `FORM-006` requires a *preferred private supplier* select. Populating it needs `Q-031` on `privatePartners`; `firestore.rules` denies IM. The field renders empty or the page errors, and the only roles that can fill it (O/A/PM) are not all product writers. (b) A **Viewer** opens SCREEN-013; the Overview must show *preferred supplier* and can resolve only an opaque document id.
- **AUTHORITY_EVIDENCE:** `DB_05` §4 `…/privatePartners/**` READ cell and §4.0's binding-authority table; `DB_02` §4.5 DB-CR-016 note (*"would hand Viewer, Analyst, Storekeeper and Inventory Manager exactly the partner data the RBAC matrix denies them"*); `DB_03` §2 SCREEN-012/013 read columns; `19` §5.2 SCREEN-013 *"Overview fields exactly …"*.
- **RECOMMENDED_FIX:** Owner decision on the frozen field, then align the pack. Cleanest: state that *preferred supplier* renders **only for `PARTNER_WRITERS`** on both SCREEN-012 and SCREEN-013 (identical to DB-04 §6's treatment of the TABLE-001 column), declare `Q-031` as a read of SCREEN-012 and SCREEN-013 for those roles, and record the field as absent for IM/SK/AN/V. Note this leaves Inventory Manager unable to set a value on a form they own — which is itself an owner question.

### FINDING_ID: F-H-05 — SCREEN-013's *Buyers* tab is structurally impossible and its *Suppliers* tab has no query; DB-11 assigns both one wrong query
- **SEVERITY:** HIGH · **SOURCE:** `22` SCREEN-013 (*"Overview, Stock, **Suppliers**, **Buyers**, Activity tabs"*) · `19` §5.2 SCREEN-013 (*"Tabs: Overview; Stock; **Suppliers**; **Buyers** only with B flag; Activity"*)
- **DATABASE_FILE + SECTION:** `DB_11` §A.1 row *"`013` Suppliers/Buyers tabs | `Q-044` referenced, defined nowhere | `Q-044` defined on `IDX-15`"* · `DB_04` §5 `Q-044` · `DB_01` §13 · `DB_02` §6.2
- **WHAT_IS_WRONG:** DB-11 closes **two** tabs with **one** query. `Q-044` is `productMappings where status == 'VERIFIED' and buyerProductId == P` — mappings stored *under the buyer*, i.e. **suppliers I buy this product from**. It cannot populate a *Buyers* tab, which would have to answer *"which connected businesses buy this product from me"* — a fact that lives only in **other tenants'** `productMappings`. Zone-3 cross-tenant reads are denied absolutely, and DB-01 §13 states *"Mappings are never disclosed to the supplier"*. So the Buyers tab is not merely unmapped; it is a surface whose only possible data source the privacy contract forbids. Separately, the *Suppliers* tab in **Release A with Network off** must still show something — the private preferred supplier and private POs for this product — and `Q-044` is Release-B-only.
- **CONCRETE_FAILURE_SCENARIO:** Fresh Foods Ltd opens `FF-CHK-05` → Buyers tab. To list Grand Ocean it must read `organizations/{grand-ocean}/productMappings`, which `firestore.rules` denies to every principal outside that tenant and which DB-01 §13 forbids on principle. The tab renders permanently empty with no explanation, or an implementer builds a callable that breaches the nine-item privacy boundary the design freeze pins at *"exactly nine crossing items; a tenth is a defect"*.
- **AUTHORITY_EVIDENCE:** `DB_11` §A.1 repair row; `DB_04` §5 `Q-044` definition; `DB_01` §13 bullet 3; `STOCKMOK_DESIGN_HANDOFF_NEXT_CHAT.md` §6; `DB_03` §2 SCREEN-013 lists `Q-044` once as *"B: `Q-044` (Mappings)"* — a third, different name for the same tab.
- **RECOMMENDED_FIX:** Owner decision. Either delete the *Buyers* tab from SCREEN-013 (recommended — it implies a capability Release A/B does not have, which the freeze forbids), or define exactly what it shows from data the buyer's own tenant holds. Give the *Suppliers* tab its own query set (`Q-031` for the private preferred supplier, `Q-039`/`Q-040` scoped to this product, `Q-044` for connected mappings) and stop mapping two tabs to one id.

### FINDING_ID: F-H-06 — the frozen *Reference* column on TABLE-005/TABLE-006 requires a per-row join; `JOINED_LISTS = 0` is false
- **SEVERITY:** HIGH · **SOURCE:** `19` `TABLE-005` and `TABLE-006` (final column **Reference**) · canonical Gate 6 6h ledger rows *"Received · **CPO-2026-003**"*, *"Received · **PO-2026-001**"* · 6f *"Received · CPO-2026-003"*
- **DATABASE_FILE + SECTION:** `DB_02` §4.6 (`sourceId`, no order-number field) · `DB_04` §4, §9 (`JOINED_LISTS = 0`, reads `25`) · `DB_11` §F proof 6
- **WHAT_IS_WRONG:** `stockMovements` stores `sourceId` — the **purchase-order document id**. The frozen ledger renders the human **order number** (`PO-2026-001`, `CPO-2026-003`), which lives on `purchaseOrders/{poId}.orderNumber`. There is no `orderNumberSnapshot` on the movement, although the same document carries `productNameSnapshot`, `skuSnapshot` and `actorName` for exactly this reason. Rendering the column therefore requires one `purchaseOrders` read per referencing row.
- **CONCRETE_FAILURE_SCENARIO:** SCREEN-017 loads a 25-row page in which 20 rows are receipts. Reference rendering issues 20 additional document `get`s (fewer if deduplicated, but unbounded in the general case), taking the page from the declared **25 reads to 45**. Worse for a **Storekeeper**: `purchaseOrders` read is `NOT_VIEWER`, so it succeeds — but for a **Viewer**, `stockMovements` is already denied, so the case does not arise; the real breakage is the undeclared cost and the fact that DB-04 §9 asserts `JOINED_LISTS = 0` immediately after DB-CR-017 removed the last two joins it knew about.
- **AUTHORITY_EVIDENCE:** `DB_02` §4.6 field table (`sourceId | string? | PO id for receipts/dispatch`); `DB_02` §4.6's own precedent — *"`productNameSnapshot` · `skuSnapshot` … so the ledger renders after archive without a join"*; `19` `TABLE-005`/`TABLE-006` column lists; canonical board 6h; `DB_04` §9 `JOINED_LISTS = 0`.
- **RECOMMENDED_FIX:** Add `sourceReferenceSnapshot: string?` to `stockMovements`, written by `po.receive`, `cpo.receive` and `cpo.ship` from the order number already in the transaction. Zero new reads, zero drift (it is a DV-09 snapshot by nature), and it restores `JOINED_LISTS = 0` to truth.

### FINDING_ID: F-H-07 — renaming the organization silently staled the public directory; DV-08 names the wrong owner
- **SEVERITY:** HIGH · **SOURCE:** `19` `FORM-015` (*"Organization name, industry, country"* editable) · `22` `ACTION-034` *Save organization profile* · `22` `FIELD-036`
- **DATABASE_FILE + SECTION:** `DB_02` §1.1 (*"**Written only by `org.create`**"*) · `DB_07` §12 DV-08 (Owner: `org.create`, `partnerCatalog.*`) · `DB_06` §1 `C-02 org.updateSettings` (marked `T = –`, no transaction) and §6 (no `org.updateSettings` row)
- **WHAT_IS_WRONG:** `organizationDirectory/{handle}` is a projection carrying `name`, `industry`, `country`, `monogram`, `monogramColor`. `ACTION-034` lets Owner/Admin change three of those on `organizations/{orgId}`. DB-02 §1.1 says the directory is written *only* by `org.create`; DV-08 names only `org.create` and `partnerCatalog.*` as owners; DB-06 §6's transaction-boundary table has no row for `org.updateSettings` at all, so its write set is undefined — and it is marked non-transactional while needing to write two or three documents.
- **CONCRETE_FAILURE_SCENARIO:** Grand Ocean Hotel renames itself to *Grand Ocean Resort* in Settings. `organizations/{orgId}.name` updates. `organizationDirectory/grand-ocean.name` still says *Grand Ocean Hotel*. The **branded login page** `/b/grand-ocean` (SCREEN-004, which reads `Q-001` pre-auth) greets every returning staff member with the old name, and **business discovery** (SCREEN-032) shows the old name to a prospective connected partner — the two surfaces whose entire purpose is trustworthy public identity. `INV-13`/`DV-08`'s *"drift here is a privacy defect"* framing misses that it is also a correctness defect.
- **AUTHORITY_EVIDENCE:** `DB_02` §1.1 header sentence; `DB_07` §12 DV-08 row; `DB_06` §1 row `C-02` (`I –`, `T –`, `A ✔`) and the absence of `C-02` from §6; `19` `FORM-015`; `DB_11` §H workflow 1 lists the directory only under `org.create`.
- **RECOMMENDED_FIX:** Make `C-02 org.updateSettings` transactional, add it to DB-06 §6 with an explicit write set (`organizations/{orgId}` + `settings/main` + `organizationDirectory/{handle}` + audit), and add it to DV-08's owner list. Alternatively make organization name/industry/country immutable in A/B, matching `handle` — but that contradicts frozen `FORM-015`.

### FINDING_ID: F-H-08 — the frozen *Archived: Included* filter has no query in either list mode
- **SEVERITY:** HIGH · **SOURCE:** canonical Gate 6 6d — `Archived: Excluded ▾` (a selector, therefore other values exist) · `22` `FIELD-055` *"Archived toggle / switch — **Include archived records**"* · `19` `TABLE-001` *"archived filters … Active by default"* · `19` §5.2 SCREEN-011 *"archived toggle off by default"* · `23` §6 SCREEN-011 *"archived view"*
- **DATABASE_FILE + SECTION:** `DB_04` §3 `Q-011`…`Q-015`, §3.1 `Q-074`…`Q-078` · `DB_04` §7 `IDX-33`…`IDX-37`, `IDX-39`…`IDX-43`
- **WHAT_IS_WRONG:** Every product-list query — all ten of them — begins with an equality on `productStatus`. There is no query, and no index, for the *include archived* view, which by definition has **no** `productStatus` predicate. `IDX-34` (`productStatus, categoryId, productName`) cannot serve `categoryId ==` + `orderBy productName` without the leading equality; `IDX-39`…`IDX-43` are all `productStatus`-led likewise.
- **CONCRETE_FAILURE_SCENARIO:** A user sets `Archived: Included`. The default sort (`productName ASC`) happens to work off the automatic single-field index. The moment they also pick a category, or a store room, or a SKU search, Firestore returns `FAILED_PRECONDITION: The query requires an index` — a raw error on a surface whose contract states *"Raw Firebase/error codes never appear"*. If the implementer instead issues two queries (`ACTIVE` then `ARCHIVED`) and merges, pagination cursors and the *"Showing 1–12 of 12"* range label both break.
- **AUTHORITY_EVIDENCE:** `DB_04` §3 and §3.1 filter columns; `DB_04` §7 index table; `22` `FIELD-055`; `19` `TABLE-001`; `DB_11` §F `UNSUPPORTED_FILTERS = 0`.
- **RECOMMENDED_FIX:** Either define `Q-080`…`Q-082` with `productStatus in ['ACTIVE','ARCHIVED']` (an `in` on the leading equality reuses `IDX-33`/`IDX-34`/`IDX-39`/`IDX-40` unchanged — Firestore expands it into parallel scans, cost unchanged at 25), or obtain an owner decision that the archived filter is tri-state `Excluded | Only` with no *Included* option, matching what the queries actually support.

### FINDING_ID: F-H-09 — the frozen Movement History search box has no query and no index
- **SEVERITY:** HIGH · **SOURCE:** canonical Gate 6 6h — *"**Search these movements by product or SKU**"* · `19` `TABLE-006` *"**Search**; date range, product, warehouse, movement type"* · `DB_03` §2 SCREEN-017 *"**search**; date range, product, warehouse, Kind"*
- **DATABASE_FILE + SECTION:** `DB_04` §4 (the eight-subset filter cube `Q-022`…`Q-029`) · `DB_04` §7 `IDX-05`…`IDX-07`, `IDX-20`…`IDX-24`
- **WHAT_IS_WRONG:** DB-04 §4 enumerates *"any combination of `{ product?, warehouse?, Kind? }` plus a `createdAt` range"* — eight subsets, no search dimension. `stockMovements` carries `productNameSnapshot` and `skuSnapshot`, but no index pairs a prefix range on either with the mandatory `createdAt DESC` ordering, and Firestore requires the first `orderBy` to carry the range field — so a search would also force the sort off `createdAt`, which `19` `TABLE-006` fixes as *"Sort time only"*.
- **CONCRETE_FAILURE_SCENARIO:** A Storekeeper types `MEAT` into the ledger search box. There is no query. Either the control does nothing, or the implementer filters the loaded 25-row page client-side and the user sees "no results" for a SKU that exists on page 3 — on an immutable audit surface where trust in completeness is the point.
- **AUTHORITY_EVIDENCE:** `DB_04` §4 opening sentence and query table; `DB_04` §7; canonical board 6h; `19` `TABLE-006`; `DB_04` §5's *"Search (`Q-015`) is a bounded prefix range … `FIELD-049` is scoped to the list it sits in"* — which acknowledges search exists per-list but defines it only for the product list.
- **RECOMMENDED_FIX:** Owner decision: either add `Q-083` (`skuSnapshot >= q, < q+`, `orderBy skuSnapshot ASC`, index `skuSnapshot ASC, createdAt DESC`) plus a name variant, and record that an active ledger search **forces the sort to the searched field** (the `Q-015` rule); or remove the search control from `TABLE-006`, which contradicts the frozen board.

### FINDING_ID: F-H-10 — `request.query.limit <= 100` is claimed on eleven collections and marked on eight; `T-SEC-32` is untestable as written
- **SEVERITY:** HIGH · **SOURCE:** n/a (rules contract) · consumed by every list surface
- **DATABASE_FILE + SECTION:** `DB_05` §4 (table markers), §4.0.1, §9 group 25 (`T-SEC-32`) · `DB_04` §9 · `DB_08` §6.2 · `DB_10` §1.2 IR-04 · `DB_11` §F proof 4
- **WHAT_IS_WRONG:** I counted the `limit ≤ 100` markers in the DB-05 §4 authority table: **eight** — `categories`, `warehouses`, `stockMovements`, `privatePartners`, `purchaseOrders/{poId}/items`, `purchaseOrders/{poId}/history`, `partnerCatalog`, `productMappings`. Every other statement in the pack says **eleven**. The three unmarked candidates that would make eleven (`members`, `invitations`, `auditLogs`) are listed in §4 with no marker. `users/{uid}/memberships` (`Q-003`, page 25) is in neither the bounded set nor the six-item exempt list, so its status is undefined.
- **CONCRETE_FAILURE_SCENARIO:** Claude Code implements `firestore.rules` from the §4 table (the binding authority, per DB-02 §8) and adds eight limit clauses. `T-SEC-32` — *"on each of the **eleven** `limit ≤ 100` collections"* — is written against a set the ruleset does not define; the test author must guess three paths. If they guess `members`/`invitations`/`auditLogs`, three assertions fail against a correct ruleset. If they test only eight, `QUERY_LIMIT_ENFORCED = 11` remains an unbacked claim on the readiness gate.
- **AUTHORITY_EVIDENCE:** `DB_05` §4 table (8 occurrences of the marker, mechanically counted); `DB_05` §4.0.1 *"added to the **eleven** client-listed collections marked `limit ≤ 100` **above**"*; `DB_05` §9 group 25; `DB_05` §10 `QUERY_LIMIT_ENFORCED = 11`; `DB_04` §9 `QUERY_LIMIT_RULE = enforced at <= 100 on 11 collections`.
- **RECOMMENDED_FIX:** Mark the intended eleven paths explicitly in the DB-05 §4 table, or correct every count to eight. Assign `users/{uid}/memberships` to the bounded or the exempt set.

### FINDING_ID: F-H-11 — the canonical Gate 6 mobile board shows a MEAT-001 split the seed cannot produce and the same board contradicts elsewhere
- **SEVERITY:** HIGH · **SOURCE:** canonical Gate 6 (`cb94a73c…`) board **6m**, 390 px product detail: *"Where it sits · **Cold Room 80.000 KG · Main Store 40.000 KG**"*; and 6m adjust sheet: *"Cold Room now **80.000 KG** … **Total across both store rooms 116.000 KG**"*
- **DATABASE_FILE + SECTION:** `DB_08` §2, §4 · `DB_11` §G.1, §G.2 (`MISMATCHED_CANONICAL_VALUES = 0`, *"re-verified byte-level"*)
- **WHAT_IS_WRONG:** Every one of MEAT-001's six seeded/chained movements is in **Cold Room** — the board's own 6h ledger says so six times. The same board's archive dialog says *"This product still holds **120.000 KG in Cold Room**, worth LKR 150,000.00"*, and its warehouse-archive refusal says *"**Cold Room holds 6 products worth LKR 398,900.00**"*, an arithmetic that requires MEAT-001's full LKR 150,000 to be in Cold Room. The 390 px frames alone say 80/40. No seeded or chained movement puts 40 KG of MEAT-001 in Main Store, and A1 explicitly adds no seeded transfer.
- **CONCRETE_FAILURE_SCENARIO:** The frontend implementer builds the 390 px product detail exactly as frozen and seeds the canonical dataset. `TABLE-004` returns `Cold Room 120.000 · Main Store 0.000` (per VR-04's left join). The screenshot in the coursework evidence pack does not match the frozen board, and the mobile adjust sheet's *"Total across both store rooms 116.000 KG"* worked example cannot be reproduced at any point in the canonical chain.
- **AUTHORITY_EVIDENCE:** extracted text of `cb94a73c…` section 6m (quoted above); `cb94a73c…` sections 6f, 6h, 6i; `DB_08` §2 row MEAT-001 (`Opening 18, Warehouse Cold Room`) and §4 (all receipts to Cold Room); `DB_11` §G.2 rows *Cold Room* / *MEAT-001 value*; `DB_11` §K `MISMATCHED_CANONICAL_VALUES = 0`.
- **RECOMMENDED_FIX:** Owner/design decision. Either patch the 6m frames to `Cold Room 120.000` (and the adjust sheet's worked example accordingly), or seed a transfer of 40 KG — which A1 forbids and which would break the Cold Room 398,900 figure the board states three times. The first is correct. Either way, DB-08 §9 `VERIFIED_AGAINST_ARTIFACT` and DB-11 §G must stop claiming byte-level reconciliation until this is resolved.

### FINDING_ID: F-H-12 — TABLE-013's frozen column set contradicts the canonical board, its *Warehouse* column cannot render in All mode, and its status filter has no query
- **SEVERITY:** HIGH · **SOURCE:** `19` `TABLE-013` — *"Product, **Warehouse**, On Hand, Unit, **Status**, Value | **Warehouse/category/status filters**; sort product, warehouse, on hand, value"* vs canonical Gate 6 board 6j — *"Product · SKU · **Category** · On hand · **Unit cost** · Stock value"* with **category subtotal rows** (*"Meat · 3 products 252,500.00"*) and *"Total inventory value 4 categories LKR 691,700.00"*
- **DATABASE_FILE + SECTION:** `DB_03` §3 SCREEN-048 · `DB_04` §5 `Q-061` (order `productName ASC`, `IDX-33`) and §3.1 `Q-074`…`Q-076` · `DB_11` §A.2 row 013
- **WHAT_IS_WRONG:** Three distinct defects. (a) `19` and the canonical board specify **different columns**, the same unresolved conflict DB-10 §7 item 8 raised for `TABLE-001` — but for `TABLE-013` nobody raised it and there is no owner decision. (b) In `Store room: All` mode the report is served from `productStockSummaries`, one row per product; `19`'s **Warehouse** column has no value to show and no field to read. (c) The **status filter** has no query in either mode: `Q-061` has no `stockStatus` predicate, and in per-store-room mode `stockStatus` is derived, not persisted (see F-C-05). Additionally the board's category grouping and subtotals cannot come from `Q-061`, which orders by `productName ASC`.
- **CONCRETE_FAILURE_SCENARIO:** A Viewer — the one report all seven roles may open — sets `Category: All`, `Store room: All`, `Status: Low`. `Q-061` has no status filter, so either all 12 rows return (the filter lies) or the implementer filters the page client-side and the *"12 rows · the same twelve products, the same figure the dashboard shows"* guarantee the board states is broken. Separately the Warehouse column renders blank on every row.
- **AUTHORITY_EVIDENCE:** `19` `TABLE-013` row; canonical board 6j extracted text; `DB_04` §5 `Q-061` row and the two-mode table; `DB_03` §3 SCREEN-048 *"`TABLE-013`: product, warehouse, on hand, unit, status, value"*; `DB_11` §A.2 row `013`, which records the two modes and never checks the column list against either authority.
- **RECOMMENDED_FIX:** Raise `TABLE-013` to the owner alongside `TABLE-001` (DB-10 §7 item 8) as a second UI-authority reconciliation item. Then: drop *Warehouse* from the All-mode column set or state it renders only in per-store-room mode; define the status filter as `stockStatus in [...]` on `IDX-36` for All mode and declare it unavailable in store-room mode; and if the board's category grouping is retained, define an ordered-by-category query on `IDX-34` plus the subtotal derivation.

### FINDING_ID: F-H-13 — four frozen table columns are per-row counts with no field and no query (N+1 by construction)
- **SEVERITY:** HIGH · **SOURCE:** `19` `TABLE-007` (*"… Status, **Open POs**, Updated, Actions"*) · `19` `TABLE-018` (*"… Requested/Responded, **Mapped Items**, **Open Connected POs**, Actions"*)
- **DATABASE_FILE + SECTION:** `DB_02` §5.1 (`privatePartners` field list) · `DB_02` §6.3 / §7.2 (connection field list) · `DB_04` §5 `Q-031`, §6 `Q-041` · `DB_11` §A.2 rows 007 and 018
- **WHAT_IS_WRONG:** None of `privatePartners`, `connections` or the connection projection carries a count field, and neither `Q-031` nor `Q-041` returns one. Producing these columns needs one aggregation or query **per row** of a 25-row page.
- **CONCRETE_FAILURE_SCENARIO:** SCREEN-018 loads 25 suppliers. Rendering *Open POs* requires 25 `count()` aggregations on `purchaseOrders where privateSupplierId == X and status in [open]` — 25 extra billed reads minimum, taking the page from a declared 25 to 50, with no index declared for the aggregation (`IDX-26` covers it, but it is never cited for this purpose). SCREEN-031 is worse: two counts per connection row, 50 extra reads. None of this appears in any read-cost statement, and DB-11 §A.2 records `TABLE-007` and `TABLE-018` at a flat `25`.
- **AUTHORITY_EVIDENCE:** `DB_02` §5.1 and §6.3 field lists; `DB_04` §5 `Q-031` and §6 `Q-041` (no count columns); `19` `TABLE-007`/`TABLE-018`; `DB_11` §A.2 `Reads` column.
- **RECOMMENDED_FIX:** Owner decision per column: remove them from the frozen tables, **or** persist maintained counters on the partner/connection documents (which reintroduces cross-document derived data and needs a DV contract and transactional writers), **or** declare them lazy per-row aggregations with the read cost written down. Do not leave them undeclared.

### FINDING_ID: F-H-14 — `Q-009` (Team) has no index that serves its declared filters and sorts
- **SEVERITY:** HIGH · **SOURCE:** `19` `TABLE-016` — *"Search; **role/status filter**; **sort name/joined**"* · `23` §4 SCREEN-027
- **DATABASE_FILE + SECTION:** `DB_04` §2 `Q-009` · `DB_04` §7 `IDX-25` (`members` `status ASC, role ASC`), `IDX-31` (`members` `status ASC, joinedAt ASC`)
- **WHAT_IS_WRONG:** `Q-009` declares filters `status in [...]`, `role ==` with order `joinedAt ASC | displayName ASC`, and cites `IDX-31` and `IDX-25`. `IDX-31` serves status + `joinedAt` but not the role equality. `IDX-25` serves status + role but carries no sort field. **No index serves `role == X` with `orderBy joinedAt`**, and **no index at all serves `orderBy displayName`** — there is no `members` composite containing `displayName`. `IDX-25`'s stated purpose in DB-04 §7 is *"notification recipient resolution `limit(50)`"* (`Q-059`), not the Team table.
- **CONCRETE_FAILURE_SCENARIO:** An Owner opens Team and filters `Role: Inventory Manager`, leaving the default sort. Firestore rejects the query with a missing-index error. Switching the sort to *Name* fails for every filter combination including no filter at all.
- **AUTHORITY_EVIDENCE:** `DB_04` §2 `Q-009` row (filters, order and index columns); `DB_04` §7 rows `IDX-25` and `IDX-31`; `19` `TABLE-016`; `DB_11` §F proof 3 (*"The required index exists or is planned — YES"*).
- **RECOMMENDED_FIX:** Add `members` `role ASC, status ASC, joinedAt ASC` and `members` `status ASC, displayName ASC` (raising the set to 45), or narrow `TABLE-016`'s frozen filter/sort matrix by owner decision. The 43-index count and DB-09 §2's *"exactly IDX-01 … IDX-43"* test must be updated in step.

### FINDING_ID: F-H-15 — `CHART-003` needs status counts over the whole filtered set; only a 25-row page query exists
- **SEVERITY:** HIGH · **SOURCE:** `24` `CHART-003` — *"Current organization's report query **grouped by displayed PO status after the same date, kind, and status filters as the table**"*, *"Every bar has a text label and **count**"* · `19` §5.4 SCREEN-049 · `22` SCREEN-025 *"PO-status bar on PO tab"*
- **DATABASE_FILE + SECTION:** `DB_03` §3 SCREEN-049 (reads: `Q-062` only) · `DB_04` §5 `Q-062` · `DB_11` §A.4
- **WHAT_IS_WRONG:** SCREEN-049 declares exactly one read: `Q-062`, a cursor-paginated 25-row page. A status-distribution chart computed from page 1 is not a distribution — it is a sample. No `count()` aggregation is declared for the PO report, and DB-04 §6's aggregation table stops at the dashboard.
- **CONCRETE_FAILURE_SCENARIO:** With 60 purchase orders matching a date filter, `CHART-003` drawn from the 25-row first page reports *Received 18, Ordered 7* while the true distribution is *Received 41, Ordered 19*. The chart's own contract says the authoritative table remains present — so the user sees a chart and a table that disagree, on a report surface.
- **AUTHORITY_EVIDENCE:** `24` `CHART-003` data-source cell; `DB_03` §3 SCREEN-049 row; `DB_04` §5 `Q-062`; `DB_11` §A.4 lists charts only under *badges/status pills* and never traces `CHART-003`.
- **RECOMMENDED_FIX:** Either declare one `count()` aggregation per displayed status family (five aggregations on `IDX-11`/`IDX-12`, cost stated per DB-CR-020's formula) as `Q-084`…`Q-088`, or record `CHART-003` as **omitted in Release A/B** — `19` §5.4 already calls it *"optional reuse"*, so this is the cheaper resolution.

### FINDING_ID: F-H-16 — `org.create` never creates `counters/purchaseOrder`, which `FORM-005` says it does and `po.order` assumes exists
- **SEVERITY:** HIGH · **SOURCE:** `19` `FORM-005` submit outcome — *"Atomic organization, directory, reservation, Owner membership/mirror, settings, **counter**, and first warehouse creation"*
- **DATABASE_FILE + SECTION:** `DB_06` §6 `org.create` row · `DB_02` §3.5 · `DB_04` §8 `Q-068` · `DB_11` §H workflow 1
- **WHAT_IS_WRONG:** DB-06 §6's `org.create` write set is *"reservation, organization, directory entry, `settings/main`, Owner `members/{uid}`, `users/{uid}/memberships/{orgId}`, first warehouse, audit"* — **no counter**. DB-11 §H workflow 1 repeats the same list. `Q-068` is defined as a *"doc read"* of `counters/purchaseOrder` and DB-06 §5 says `po.order` *"read + increment"* it inside the transaction.
- **CONCRETE_FAILURE_SCENARIO:** A brand-new workspace raises its first purchase order. `po.order` opens a transaction and reads `counters/purchaseOrder`, which does not exist. If the implementation reads `.data().value` it throws inside the transaction and the order fails with an untyped error; if it defensively defaults to 0 it works, but the "read + increment" contract is not what is written and the behaviour on a missing document is undefined in the pack — which is precisely what DB-09 §11's *"if a decision is not written down, stop and ask"* exists to prevent.
- **AUTHORITY_EVIDENCE:** `19` `FORM-005`; `DB_06` §6 `org.create` row; `DB_06` §5 `po.order` row; `DB_04` §8 `Q-068`; `DB_11` §H workflow 1.
- **RECOMMENDED_FIX:** Add `counters/purchaseOrder` (`{ value: 0 }`) to `org.create`'s write set in DB-06 §6 and DB-11 §H, matching frozen `FORM-005`; or state explicitly in DB-06 §5 that `po.order`/`cpo.submit` upsert the counter with `value: 0` when absent.

---

## 3 — MEDIUM

### FINDING_ID: F-M-01 — `IDEMPOTENT_COMMANDS = 13` is wrong; the catalog marks 17
- **SEVERITY:** MEDIUM · **SOURCE:** n/a
- **DATABASE_FILE + SECTION:** `DB_06` §1 (`I` column) vs `DB_06` §9
- **WHAT_IS_WRONG:** Mechanically counting `✔` in the `I` column of the 36-row catalog gives **17**: `C-01, C-03, C-04, C-06, C-09, C-13, C-14, C-33, C-15, C-17, C-18, C-19, C-25, C-27, C-28, C-29, C-30`. §9 declares 13.
- **CONCRETE_FAILURE_SCENARIO:** Codex generates `COMMAND_CONTRACTS.md` with an `idempotency` flag per DB-09 §12. Working from §9 it under-generates by four; working from §1 it contradicts the stated metric. Four commands either gain or lose a required `operationId` depending on which line an implementer trusts — and `INV-05` (*"Every stock mutation has an `operationId` and a `CommandReceipt`"*) is asserted by the property test.
- **AUTHORITY_EVIDENCE:** `DB_06` §1 catalog table; `DB_06` §9 `IDEMPOTENT_COMMANDS = 13`.
- **RECOMMENDED_FIX:** Correct §9 to 17, or correct the four catalog rows that should not carry `✔` and say which.

### FINDING_ID: F-M-02 — `Q-015` cites an index on the wrong collection, orphaning `IDX-37`
- **SEVERITY:** MEDIUM · **DATABASE_FILE + SECTION:** `DB_04` §3 `Q-015`, §7 `IDX-30` / `IDX-37`
- **WHAT_IS_WRONG:** `Q-015` runs on `productStockSummaries` and cites *"`IDX-30` / `IDX-33`"*. `IDX-30` is `**products**` `status ASC, internalSkuNormalized ASC` — a different collection. The correct index is `IDX-37` (`productStockSummaries` `productStatus ASC, internalSkuNormalized ASC`), which DB-04 §7 defines as *"DB-CR-011 — SKU prefix search"* and which no query row cites.
- **CONCRETE_FAILURE_SCENARIO:** Codex builds `queryQ015()` and, following the cited index, targets `products` — reverting the DB-CR-011 fix and reintroducing the join. Or it targets `productStockSummaries` correctly and the SKU search fails on a missing index, because `IDX-30` is on another collection.
- **AUTHORITY_EVIDENCE:** `DB_04` §3 `Q-015` Index column; `DB_04` §7 rows `IDX-30`, `IDX-37`; this is the same class as `VR-06`/`DB-CR-023`, which DB-04 §7 declares itself *"the sole authority for index numbering"* to prevent.
- **RECOMMENDED_FIX:** Change `Q-015`'s index citation to `IDX-37 / IDX-33`.

### FINDING_ID: F-M-03 — four composite indexes have no query consumer
- **SEVERITY:** MEDIUM · **DATABASE_FILE + SECTION:** `DB_04` §7, §9 (`INDEX_COVERAGE = 100%`)
- **WHAT_IS_WRONG:** Cross-referencing every `IDX-` citation in DB-04 §1–§6 and §8 against the §7 table leaves four with no consumer: **`IDX-02`** (`products` `status, categoryId, name` — justified as *"PO-builder picker, category-scoped"*, but DB-03 §3 says SCREEN-022 reads `Q-011` on `productStockSummaries`), **`IDX-03`** (`products` `status, updatedAt DESC` — *"retained for admin/product-side listing"*; no such surface exists after DB-CR-011), **`IDX-19`** (`auditLogs` `createdAt DESC` — *"org audit stream"*, but DB-01 §12 states *"There is no audit-log route"*), **`IDX-37`** (orphaned by F-M-02).
- **CONCRETE_FAILURE_SCENARIO:** DB-09 §8 requires a test asserting `firestore.indexes.json` contains *exactly* the DB-04 §7 set. Four indexes are deployed and maintained for queries that do not exist; `IDX-19` in particular backs a route DB-01 §14 lists as a non-goal. Not a correctness failure, but it fails the review's Direction-B test: *"every item must be justified"*.
- **AUTHORITY_EVIDENCE:** `DB_04` §7 rows and Serves column; `DB_01` §12 and §14; `DB_03` §3 SCREEN-022 reads; `DB_11` §B (which justifies collections and fields but never indexes).
- **RECOMMENDED_FIX:** Delete `IDX-03` and `IDX-19`; correct `IDX-02`'s justification to a real query or delete it; fix `IDX-37`'s consumer per F-M-02. Update the count and the DB-09 §8 exact-set test.

### FINDING_ID: F-M-04 — DB-03 still specifies a *Preferred Supplier* column on TABLE-001, contradicting UI-OD-001
- **SEVERITY:** MEDIUM · **SOURCE:** `UI-OD-001`
- **DATABASE_FILE + SECTION:** `DB_03` §2 SCREEN-011 (*"`TABLE-001`: name, SKU, category, on hand + unit, status pill, **preferred supplier**, updated"*) vs `DB_02` §4.5 and `DB_04` §6 (*"The **Preferred Supplier** column renders only for `PARTNER_WRITERS`, from `Q-031`"*)
- **WHAT_IS_WRONG:** The owner has ruled that Preferred Supplier is **not** a TABLE-001 column and that the canonical six columns are Product · SKU · Category · On hand · Minimum · Stock value. DB-03's column list still names it, omits *Minimum* and *Stock value*, and DB-02/DB-04 both retain a role-conditional rendering rule and a `Q-031` read for it. That extra read is `PARTNER_WRITERS`-gated and adds `|partners|` reads to a page whose budget is 27.
- **CONCRETE_FAILURE_SCENARIO:** The frontend implementer builds TABLE-001 from DB-03 and ships a column the owner deleted, plus a `Q-031` read that fails in rules for IM/SK/AN/V — the four roles for whom DB-04 already says the column is *"absent"*, but which DB-03 does not distinguish.
- **AUTHORITY_EVIDENCE:** `UI-OD-001`; `DB_03` §2 SCREEN-011 Displayed-data cell; `DB_02` §4.5 DB-CR-016 note; `DB_04` §6 DB-CR-016 paragraph; canonical Gate 6 6d (`Product ↑ · SKU · Category · On hand · Minimum · Stock value`).
- **RECOMMENDED_FIX:** Apply UI-OD-001 throughout: set DB-03's TABLE-001 column list to the canonical six, delete the conditional Preferred Supplier rendering rule from DB-02 §4.5 and DB-04 §6, and remove `Q-031` from SCREEN-011's reads. Close DB-10 §7 item 8 as decided.

### FINDING_ID: F-M-05 — five persisted enum values can never be written and have no state machine
- **SEVERITY:** MEDIUM · **DATABASE_FILE + SECTION:** `DB_02` §0.1, §1.1, §2.1, §3.1 · `DB_06` §1 · `DB_07` §1–§10 · `DB_11` §I (`UNREPRESENTED_BACKEND_STATES = 0`)
- **WHAT_IS_WRONG:** (a) `organizations.status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'` — DB-01 §8 declares the lifecycle, but no command in the 36-catalog writes it and DB-07 has no organization machine. (b) `users.status: 'ACTIVE' | 'DISABLED'` — DB-05 §3 grants `BE UPDATE (email, status)`; no command does. (c) `DirectoryStatus.UNLISTED` — the directory is *"written only by `org.create`"*, which sets `LISTED`. (d) `InviteStatus.EXPIRED` — DB-07 §2 says expiry is *"evaluated on read, never by a scheduled job"*, so the stored value stays `PENDING` forever while `22`/`23` show an *Expired* pill and `Q-010` (`status == 'PENDING'`) keeps returning expired rows in `TABLE-017` (*"Pending only"*). (e) `PoStatus` is a shared union, correctly documented — not a finding, listed for contrast.
- **CONCRETE_FAILURE_SCENARIO:** An Owner/Admin opens Team eight days after inviting someone. `TABLE-017` lists the invitation as **Pending** with a Revoke action, because nothing ever transitioned it to `EXPIRED`. Accepting fails with `INVITE_EXPIRED`, which the invitee sees and the Admin does not.
- **AUTHORITY_EVIDENCE:** `DB_02` §0.1 enum block; `DB_02` §1.1 header; `DB_06` §1; `DB_07` §2 row 3; `DB_04` §2 `Q-010`; `19` `TABLE-017`; `DB_11` §I row `UNREPRESENTED_BACKEND_STATES`, whose justification (*"backend-only documents are never user-encountered"*) does not apply to `organizations`, `users` or `invitations`.
- **RECOMMENDED_FIX:** For each: either delete the unreachable value from the enum, or name the command and the transition table entry that writes it. For `EXPIRED` specifically, state that `Q-010` must additionally filter `expiresAt > now` and that the pill is derived, or add expiry as a lazy write inside `team.acceptInvitation` / `team.revokeInvitation`.

### FINDING_ID: F-M-06 — `currency` and `timezone` are stored twice with no source of truth and no derived-value contract
- **SEVERITY:** MEDIUM · **SOURCE:** `19` `FORM-015` (both editable in Settings)
- **DATABASE_FILE + SECTION:** `DB_02` §3.1 (`organizations.currency`, `.timezone`) and §3.2 (`settings/main.currency`, `.timezone`) · `DB_07` §12 (no DV covers them)
- **WHAT_IS_WRONG:** The same two values live on two documents. No DV contract names a source of truth, an owner or a trigger. `C-02 org.updateSettings` is non-transactional (DB-06 §1, `T = –`) and has no write set in DB-06 §6.
- **CONCRETE_FAILURE_SCENARIO:** An Admin changes currency in Settings. If the command writes only `settings/main`, the shell reads `organizations.currency` (DB-05 §4.0's leak-check row names `currency` as a reason the org root is readable by all seven) and renders the old symbol beside amounts formatted with the new one. Because the write is not transactional, a partial failure leaves the two permanently divergent.
- **AUTHORITY_EVIDENCE:** `DB_02` §3.1 and §3.2 field tables; `DB_05` §4.0 *"Reads that stay broad"* row 1; `DB_06` §1 `C-02`; `DB_07` §12.
- **RECOMMENDED_FIX:** Pick one home (recommend `settings/main`, matching `defaultWarehouseId`'s DB-CR-013 reasoning), delete the other, or add a DV contract with `C-02` as a transactional owner.

### FINDING_ID: F-M-07 — TABLE-021 and TABLE-023 declare columns and sorts their source documents cannot provide
- **SEVERITY:** MEDIUM · **SOURCE:** `19` `TABLE-021` (*"**Internal Product**, **Internal SKU**, Partner SKU, Order Unit, Availability, Published … sort **internal product**, partner SKU, updated"*) · `19` `TABLE-023` (*"**Buyer Product/SKU**, Supplier/Partner Item/SKU, Conversion, Status, **Verified By**/At … **sort verified time**"*)
- **DATABASE_FILE + SECTION:** `DB_02` §6.1, §6.2 · `DB_04` §6 `Q-045`, `Q-043` · `DB_04` §7 `IDX-16`, `IDX-15`
- **WHAT_IS_WRONG:** `partnerCatalog` carries `sourceProductId` but **no** internal product name or internal SKU — so two of TABLE-021's seven columns need a per-row `products` join, and the *sort by internal product* is impossible (`IDX-16` is `published, partnerSkuNormalized`). `productMappings` carries `buyerProductId` but no buyer product name/SKU — two of TABLE-023's columns need a join. *Verified By* needs a display name from `semanticConfirmedByUid`, and `members` is `ADMINS`-only, so a Procurement Manager — the role that owns SCREEN-037 — cannot resolve it. *Sort verified time* would need `semanticConfirmedAt`; `Q-043` orders `createdAt DESC` and `IDX-15` is `status, buyerProductId`.
- **CONCRETE_FAILURE_SCENARIO:** A PM opens Mappings. *Buyer Product* renders a raw document id (or costs 25 extra reads), *Verified By* renders a raw uid because `members` is denied to PM, and clicking the *Verified* column header does nothing because no index supports the sort.
- **AUTHORITY_EVIDENCE:** `DB_02` §6.1 and §6.2 field lists; `DB_04` §6 `Q-043`/`Q-045` order columns; `DB_04` §7 `IDX-15`/`IDX-16`; `DB_05` §4 `members` row; `19` `TABLE-021`/`TABLE-023`.
- **RECOMMENDED_FIX:** Snapshot the missing display fields onto the host documents at create time (`internalProductNameSnapshot`, `internalSkuSnapshot` on catalog items; `buyerProductNameSnapshot`, `buyerSkuSnapshot`, `semanticConfirmedByName` on mappings) — all DV-09-class snapshots, so no fanout and no drift obligation. Add an index for the *verified time* sort or remove it from the frozen contract.

### FINDING_ID: F-M-08 — the frozen PO-list search has no query and no index
- **SEVERITY:** MEDIUM · **SOURCE:** `19` `TABLE-010` — *"**search number/counterparty**; status/date/kind filters"*
- **DATABASE_FILE + SECTION:** `DB_04` §5 `Q-033`, `Q-034`, §7 `IDX-11`, `IDX-12`
- **WHAT_IS_WRONG:** `Q-033`/`Q-034` carry no search predicate; `purchaseOrders` has no normalised search field; the required prefix range on `orderNumber` or `counterpartyName` would have to be the leading `orderBy`, which conflicts with the mandatory `createdAt DESC`.
- **CONCRETE_FAILURE_SCENARIO:** A PM types `PO-2026` into the PO list search box. Nothing happens, or the loaded page is filtered client-side and an order on page 2 is reported as not existing.
- **AUTHORITY_EVIDENCE:** `19` `TABLE-010`; `DB_04` §5 `Q-033`/`Q-034` filter columns; `DB_04` §7.
- **RECOMMENDED_FIX:** Define `Q-089` (`orderNumber >= q, < q+`, `orderBy orderNumber ASC`, index `status ASC, orderNumber ASC`) and apply the `Q-015` forced-sort rule, or remove search from `TABLE-010`.

### FINDING_ID: F-M-09 — the notification *Read* tab and the event-type filter have no query
- **SEVERITY:** MEDIUM · **SOURCE:** `22` `FIELD-056` — *"Notification status / tabs | **All/Unread/Read**"* · `19` `TABLE-015` — *"Unread/all filter; **event type**; newest first"*
- **DATABASE_FILE + SECTION:** `DB_04` §1 `Q-004` (*"`read == false` | none"*) · `DB_03` §1/§3 (*"unread/all; type"*) · `DB_04` §7 `IDX-17`
- **WHAT_IS_WRONG:** `Q-004` supports two of the three tabs. `read == true` would be served by `IDX-17` but has no query id. The **event type** filter has neither a query nor an index (`IDX-17` is `read ASC, createdAt DESC`); a `type ==` predicate with `orderBy createdAt DESC` needs `type ASC, createdAt DESC`, and combined with a read state, `read ASC, type ASC, createdAt DESC`.
- **CONCRETE_FAILURE_SCENARIO:** A user selects the *Read* tab and sees the unread list, or an empty list. Selecting `Type: Low stock` produces a missing-index error.
- **AUTHORITY_EVIDENCE:** `22` `FIELD-056`; `19` `TABLE-015`; `DB_04` §1 `Q-004`; `DB_03` §3 SCREEN-026 (which lists the type filter and declares no query for it).
- **RECOMMENDED_FIX:** Extend `Q-004`'s filter cell to `read == false | read == true | none`; add `Q-090` for the type filter with indexes `type ASC, createdAt DESC` and `read ASC, type ASC, createdAt DESC`, or remove the type filter from `TABLE-015`.

### FINDING_ID: F-M-10 — SCREEN-020's *related products*, *mappings* and *activity* sections have no queries, and *activity* is denied to the role that owns the screen
- **SEVERITY:** MEDIUM · **SOURCE:** `22` SCREEN-020 — *"Identity, type/status, contact, **related products/mappings/POs/activity**"* · `19` §5.3 SCREEN-020 (*"mapped count, connected POs"*) · `23` §4 SCREEN-020 = O/A/**PM** FULL
- **DATABASE_FILE + SECTION:** `DB_03` §3 SCREEN-020 (reads `Q-032`, `Q-039`, `Q-040`, `Q-042`) · `DB_04` §6 `Q-043` (callers `013, 033, 037, 038` — not `020`) · `DB_05` §4 `auditLogs` = `ADMINS`
- **WHAT_IS_WRONG:** Four of the section's six named contents are traced (identity, contact, TABLE-008, TABLE-009). *Related products*, *mappings* and *activity* are not. *Mappings* would be `Q-043`, which does not list `020` as a caller. *Activity* would be `auditLogs`, restricted to `ADMINS` — so a Procurement Manager with `FULL` on this screen cannot read it.
- **CONCRETE_FAILURE_SCENARIO:** A Procurement Manager opens a connected supplier's Partner Detail. The Activity section issues a read on `auditLogs`; `firestore.rules` denies it; the section renders an error or a permission state on a screen the role has `FULL` access to.
- **AUTHORITY_EVIDENCE:** `22` SCREEN-020 structure cell; `DB_03` §3 SCREEN-020 Reads cell; `DB_04` §6 `Q-043` Caller cell; `DB_05` §4 `auditLogs` row; `23` §3 *View audit log* (O/A only).
- **RECOMMENDED_FIX:** Add `020` as a caller of `Q-043`; define a query for *related products* or delete the section; scope *activity* on SCREEN-020 to Owner/Admin (matching the `Q-048` treatment on SCREEN-013) or delete it.

### FINDING_ID: F-M-11 — the empty-dashboard setup checklist has one declared query for five items
- **SEVERITY:** MEDIUM · **SOURCE:** `19` §5.2 SCREEN-009 — *"setup checklist in this order: **add category, add product, record opening stock, add supplier, invite team**"* · `23` §4 SCREEN-009 = all seven FULL
- **DATABASE_FILE + SECTION:** `DB_03` §2 SCREEN-009 (reads: `Q-050`)
- **WHAT_IS_WRONG:** `Q-050` counts active products. Deciding whether each of the other four steps is done needs a category count, an opening-balance/movement existence check, a private-partner count and a member count. None is declared. The *add supplier* check reads `privatePartners`, which DB-CR-015 denies to IM/SK/AN/V, and the *invite team* check reads `members` `list`, which is `ADMINS`-only.
- **CONCRETE_FAILURE_SCENARIO:** An Inventory Manager on a new workspace opens the dashboard. The checklist issues a `privatePartners` count and a `members` count; both are denied in rules. The panel errors on a screen whose entire purpose is a friendly first-run experience.
- **AUTHORITY_EVIDENCE:** `19` §5.2 SCREEN-009 objects; `DB_03` §2 SCREEN-009 Reads cell; `DB_05` §4 `privatePartners` and `members` rows.
- **RECOMMENDED_FIX:** Declare a query per checklist item with its role gate, and state explicitly that items whose existence check the role may not perform are rendered from the role filter alone (*"unavailable steps explain responsible role without a dead CTA"* — `19` already says this; the DB pack must record that it means **no query is issued**).

### FINDING_ID: F-M-12 — the Connected and Pending tabs on SCREEN-018/019 have no query
- **SEVERITY:** MEDIUM · **SOURCE:** `19` `TABLE-007` — *"**Tabs Private/Connected/Pending**"* · `19` §5.3 SCREEN-018/019
- **DATABASE_FILE + SECTION:** `DB_03` §3 SCREEN-018 and SCREEN-019 (reads: `Q-031` only)
- **WHAT_IS_WRONG:** `Q-031` reads `privatePartners`. Connected counterparties and pending requests live in `connections` (`Q-041`). Neither screen declares `Q-041`.
- **CONCRETE_FAILURE_SCENARIO:** A PM clicks the *Connected* tab on Suppliers with Network enabled. No query exists; the tab renders the private list, or empty. (With Network disabled the tab correctly shows the explanatory empty state, so the defect is masked until B is switched on.)
- **AUTHORITY_EVIDENCE:** `19` `TABLE-007` Query column; `DB_03` §3 SCREEN-018/019 Reads cells; `DB_04` §6 `Q-041` Caller cell (`031, 036`).
- **RECOMMENDED_FIX:** Add `018` and `019` as callers of `Q-041` and record the tab-to-query mapping in DB-03 §3.

### FINDING_ID: F-M-13 — `22` §2 names five canonical products the seed does not contain
- **SEVERITY:** MEDIUM · **SOURCE:** `22` §2 — *"Additional products | **Mini Bar Water, Premium Towel, Hotel Shampoo, Coffee Beans, Cleaning Supplies**"*
- **DATABASE_FILE + SECTION:** `DB_08` §2 (the canonical twelve) · `DB_11` §G.1/§G.3
- **WHAT_IS_WRONG:** `22` is named by DB-03 and DB-11 as a **surface authority** and its §2 is headed *"Canonical scenario and sample data"*. Five of its named products are absent from the seed, and none appears on the canonical Gate 6 board. DB-11 §G reconciles twelve products and never mentions the other five.
- **CONCRETE_FAILURE_SCENARIO:** A frontend implementer building a filled table state from `22` §2 uses *Premium Towel* and *Hotel Shampoo*; the seeded emulator has neither; the coursework screenshots do not match the seeded demo, and the *"no invented demo value"* guarantee in DB-11 §G is broken from the UI side.
- **AUTHORITY_EVIDENCE:** `22` §2 table last row; `DB_08` §2; `DB_11` §G.1 (twelve rows) and §G.3.
- **RECOMMENDED_FIX:** Owner/design item: strike the *Additional products* row from `22` §2 or add the five to the seed. The first is correct — the seed authority is `16` §7 and the board draws twelve.

### FINDING_ID: F-M-14 — TABLE-004's *Available* column has no field on its source document
- **SEVERITY:** MEDIUM · **SOURCE:** `19` `TABLE-004` — *"Warehouse, On Hand, **Available**, Unit, Status, Updated"*
- **DATABASE_FILE + SECTION:** `DB_02` §4.4 (`stockBalances` field list) vs §4.5 (`productStockSummaries.availableMilli`) · `DB_11` §C row *Stock quantities*
- **WHAT_IS_WRONG:** `TABLE-004` is per-warehouse and is served by `Q-017 ⟕ Q-018` over `stockBalances`. `availableMilli` exists only on `productStockSummaries`, at product grain. DB-11 §C answers the *Available* check with the summary's field, which is the wrong grain.
- **CONCRETE_FAILURE_SCENARIO:** The Stock tab renders *Available* per store room. There is no per-balance value. An implementer either shows the product-level total on every warehouse row (wrong, and it double-counts visually) or leaves it blank.
- **AUTHORITY_EVIDENCE:** `19` `TABLE-004` column list; `DB_02` §4.4 vs §4.5; `DB_11` §A.2 row `004`; `DB_11` §C row *Stock quantities*.
- **RECOMMENDED_FIX:** State in DB-02 §4.4 and DB-03 that a balance row's *Available* is **derived as `onHandMilli` while `reservedMilli` is constant 0** — the same technique as DV-11's `stockStatus` — or delete the column from `TABLE-004` by owner decision.

### FINDING_ID: F-M-15 — DB-02 §8's access-class table is structurally broken; three rows fall outside it
- **SEVERITY:** MEDIUM · **DATABASE_FILE + SECTION:** `DB_02` §8
- **WHAT_IS_WRONG:** The DB-CR-015 explanatory paragraph is inserted **between** the `auditLogs` row and the three zone-4 rows, terminating the markdown table. `handleReservations`, `connections` and `connectedPurchaseOrders` render as literal pipe-delimited text, not as table rows.
- **CONCRETE_FAILURE_SCENARIO:** Any tooling that parses DB-02 §8 to generate the access-class map — and DB-09 §12 asks Codex to author `DOMAIN_TYPES.md` from DB-02 — silently drops the three zone-4 families, which are exactly the ones that must be `BE`-only.
- **AUTHORITY_EVIDENCE:** `DB_02` §8 raw markdown, lines following the `auditLogs` row.
- **RECOMMENDED_FIX:** Move the DB-CR-015 note below the complete table.

### FINDING_ID: F-M-16 — the command count is 36 rows but 37 operations, and one is Release C
- **SEVERITY:** MEDIUM · **DATABASE_FILE + SECTION:** `DB_06` §1 (`C-35` = *"`category.archive` / `category.restore`"*; `C-32` = *"`storefront.publish` / `unpublish` — **C — NOT BUILT**"*), §9 (`COMMAND_COVERAGE = 100% (36 commands; every UI mutation maps to exactly one)`)
- **WHAT_IS_WRONG:** `C-35` is two distinct callables in one row, so the deployed A/B surface is 37 functions, not 36. `C-32` is two more that are explicitly not built, yet it is counted inside a figure whose definition is *"every UI mutation maps to exactly one"* — `C-32` maps to no UI mutation in Release A/B. DB-08 §6 already subtracts `C-32` and `C-03` to reach 34 for testing, so the pack knows 36 is not the operational count.
- **CONCRETE_FAILURE_SCENARIO:** Codex generates `COMMAND_CONTRACTS.md` with 36 signatures and omits `category.restore`, or generates a Release C command whose implementation DB-09 §7 forbids.
- **AUTHORITY_EVIDENCE:** `DB_06` §1 rows `C-32`, `C-35`; `DB_06` §9; `DB_08` §6 command-test row; `DB_11` §K `COMMANDS 36`.
- **RECOMMENDED_FIX:** Split `C-35` into `C-35a`/`C-35b` (or renumber), and state the operational count as *"37 callables in A/B, plus 2 declared-inert Release C"*.

### FINDING_ID: F-M-17 — `CHART-001`'s total and its arcs come from different collections
- **SEVERITY:** MEDIUM · **SOURCE:** `24` `CHART-001` — *"active `ProductStockSummary` count grouped by derived `stockStatus` … **Total equals Active SKUs for the same query boundary**"*
- **DATABASE_FILE + SECTION:** `DB_04` §6 `Q-050` (`count() products where status == 'ACTIVE'`), `Q-051`, `Q-052`
- **WHAT_IS_WRONG:** The donut's total is `Q-050` over **`products`**; its low and out arcs are `Q-051`/`Q-052` over **`productStockSummaries`**; the *in stock* arc is not queried at all and must be derived as `total − low − out`. `24` explicitly requires *"the same query boundary"*.
- **CONCRETE_FAILURE_SCENARIO:** A `product.create` transaction that wrote the product but whose summary write is later found defective (the only way the two can diverge) makes the *in stock* arc negative or the arcs fail to sum to the centre total — the chart becomes the drift detector, silently.
- **AUTHORITY_EVIDENCE:** `24` `CHART-001` data cell; `DB_04` §6 `Q-050`/`Q-051`/`Q-052` rows.
- **RECOMMENDED_FIX:** Redefine `Q-050` as `count() productStockSummaries where productStatus == 'ACTIVE'` on `IDX-33`, so all four donut figures share one collection and one boundary. Cost is unchanged.

### FINDING_ID: F-M-18 — DB-06's section numbering places `§6.1` inside `§4`
- **SEVERITY:** MEDIUM · **DATABASE_FILE + SECTION:** `DB_06` §4 → heading `### 6.1 A2 · DB-CR-017 — Q-079…` → `## 5` → `## 6`
- **WHAT_IS_WRONG:** The `Q-079` subsection is numbered `6.1` but sits between `§4` and `§5`. DB-02 §4.4, DB-04 §6.1 and DB-11 cross-reference *"DB-06 §6.1"*, which a reader will look for under the transaction-boundary table.
- **CONCRETE_FAILURE_SCENARIO:** An implementer following DB-02 §4.4's citation to DB-06 §6.1 lands in the transaction table, does not find `Q-079`, and concludes the fanout is unspecified — reaching DB-09 §11's stop condition for the wrong reason.
- **AUTHORITY_EVIDENCE:** `DB_06` heading sequence.
- **RECOMMENDED_FIX:** Renumber to `§4.1`, or move the subsection under `§6`.

---

## 4 — LOW

| FINDING_ID | Severity | Summary | Evidence | Fix |
|---|---|---|---|---|
| **F-L-01** | LOW | `Unit` enum carries `BOX`, `CAN`, `BOTTLE`, which appear in no seed value, no frozen screen and no `22` field definition. `FIELD-014` says only *"Required supported unit"* without enumerating. | `DB_02` §0.1 vs `DB_01` §7 (*"Units in the canonical seed and frozen design: `KG`, `L`, `EACH`, `PACK`, plus supplier order units"*) | Enumerate the supported set in `22` `FIELD-014`, or trim the enum. |
| **F-L-02** | LOW | `reservedMilli` / `availableMilli` are justified as `DOMAIN_INVARIANT` in DB-11 §B.3, but they exist only to keep a Release D reservation subsystem's shape. That is `FUTURE_PLACEHOLDER`, which is not one of the review's admissible justification classes. | `DB_11` §B.3 row `reservedMilli`; `DB_01` §14 (reservation is a non-goal); `DB_10` §6 (*"`reservedMilli` is constant 0 and no command writes it"*) | Reclassify honestly, or delete `reservedMilli` and define `availableMilli` as derived. |
| **F-L-03** | LOW | `storefrontCatalog/**` is justified as `CANONICAL_SEED_REQUIRED`. It is in no seed. The honest class is *declared-inert scope guard*. | `DB_11` §B.1 row 2; `DB_08` (no storefront seed) | Correct the justification class. |
| **F-L-04** | LOW | `Q-010`, `Q-039` and `Q-040` cite their indexes by field list rather than by `IDX` id (`IDX-27`, `IDX-26`), which is why an automated consumer check reports them as orphans. | `DB_04` §2 `Q-010`, §5 `Q-039`/`Q-040`; §7 `IDX-26`/`IDX-27` | Cite by id, consistently with every other row. |
| **F-L-05** | LOW | `22` SCREEN-011 declares its filter bar as *"FIELD-049..055"*, a range that sweeps in `FIELD-053` (**PO status filter**) and `FIELD-054` (**Date range**), neither of which belongs on the product list or has a query there. | `22` §4 SCREEN-011 row; `22` §3.2 `FIELD-053`/`FIELD-054`; `DB_03` §2 SCREEN-011 (four filters only) | Replace the range with the explicit list `FIELD-049, 050, 051, 052, 055`. |

---

## 5 — WHAT I CHECKED AND FOUND CLEAN

Recorded so the FAIL is not read as a blanket rejection.

- **Transfer (A1) stayed minimal.** All twelve constraints in §8 of the review brief hold: same organization only (`DB_06` §2 `CROSS_TENANT_REFERENCE`, `T-XFER-11`), one product, `from != to`, `q > 0`, atomic six-document write set, paired `TRANSFER_OUT`/`TRANSFER_IN` on one `transferId`, organization total unchanged (`INV-23`, summary untouched), idempotent, no partial persistence, no cross-org path, `TRANSFER_WRITERS = INVENTORY_WRITERS` with Storekeeper excluded and tested (`T-XFER-12`, `T-SEC-24`). **No unintended expansion. `stock.transfer` is the best-specified command in the pack.**
- **Tenant isolation and the path-constancy rule.** `DATA_DERIVED_RULE_READS = 0` is correct and load-bearing; zone 4 closure and the callable-only partner catalog are the right shape and are argued from the 10-call limit rather than asserted.
- **DB-CR-015 itself.** The seven tightened read cells match `06` §5 and `23` §4 cell-for-cell. I re-derived `NOT_VIEWER` and `PARTNER_WRITERS` independently against `23` §3/§4 and found no role placed on the wrong side. The single declared router-only denial (`SCREEN-049` for SK) is correctly reasoned.
- **Idempotency, immutability, negative-stock-per-balance, integer milli/minor arithmetic, `INV-03`/`INV-04`/`INV-24`.** Sound, and the reasoning for integers is correct.
- **`Q-044`, `Q-048`, `Q-011a`, `IDX-33` collision, `onHandMilli > 0`, `TABLE-004` zero rows, the 50-read warehouse filter.** All genuinely fixed. I re-verified each against the amended text.
- **Query-id arithmetic.** DB-04 §9's *"78 defined ids"* is correct as counted (Q-001…Q-078 less Q-049, plus Q-013b) — the defect is `Q-079`'s absence, not the count.
- **IR-06.** The pack's byte-level conclusion is **correct**: `Issued to kitchen` × 5 in `ea760d2b…`, × 0 in `cb94a73c…`. I reproduced both counts. The defect is which file the manifest calls canonical (F-C-01), not the analysis.

---

## 6 — REQUIRED COUNTS

```
ORPHAN_UI_ELEMENTS            = 22
ORPHAN_DATABASE_OBJECTS       = 7
UNSUPPORTED_FILTERS           = 11
UNSUPPORTED_ACTIONS           = 1
UNREPRESENTED_BACKEND_STATES  = 5
MISMATCHED_RBAC               = 4
MISMATCHED_CANONICAL_VALUES   = 5
UNDEFINED_QUERY_IDS           = 1
UNJUSTIFIED_INDEXES           = 4
BROKEN_END_TO_END_WORKFLOWS   = 10
```

**ORPHAN_UI_ELEMENTS (22)** — SCREEN-013 *Buyers* tab · SCREEN-013 *Suppliers* tab · SCREEN-013 Overview
*preferred supplier* · `FORM-006` preferred-private-supplier select · `TABLE-004` *Available* ·
`TABLE-005` *Reference* · `TABLE-006` *Reference* · `TABLE-007` *Open POs* · `TABLE-013` *Warehouse* (All
mode) · `TABLE-018` *Mapped Items* · `TABLE-018` *Open Connected POs* · `TABLE-021` *Internal Product* ·
`TABLE-021` *Internal SKU* · `TABLE-023` *Buyer Product/SKU* · `TABLE-023` *Verified By* · `TABLE-027` /
`CHART-002` inventory-by-location value · `CHART-003` PO-status bar · Needs Attention out-of-stock rows ·
SCREEN-020 *related products* · SCREEN-020 *activity* · SCREEN-020 mappings · SCREEN-009 checklist items
2–5.

**ORPHAN_DATABASE_OBJECTS (7)** — `organizations.status: SUSPENDED` · `organizations.status: ARCHIVED` ·
`users.status: DISABLED` · `DirectoryStatus.UNLISTED` · `InviteStatus.EXPIRED` · duplicated
`currency`+`timezone` on `organizations` vs `settings/main` · `C-32 storefront.*` counted inside
`COMMAND_COVERAGE = 100%`. *(Indexes are counted separately under `UNJUSTIFIED_INDEXES`.)*

**UNSUPPORTED_FILTERS (11)** — `TABLE-001` *Archived: Included* · `TABLE-001` Status × Store room ·
`TABLE-006` search · `TABLE-010` search · `TABLE-013` status (both modes) · `TABLE-013` sort by warehouse
(All mode) · `TABLE-015` event type · `TABLE-015` *Read* tab · `TABLE-016` role filter + joined/name sort ·
`TABLE-018` identity search · `TABLE-023` supplier filter + verified-time sort. *(`TABLE-021` sort by
internal product is counted under F-M-07, not here.)*

**UNSUPPORTED_ACTIONS (1)** — warehouse restore (`ARCHIVED → ACTIVE`).

**UNREPRESENTED_BACKEND_STATES (5)** — the five enum values above.

**MISMATCHED_RBAC (4)** — IM on `FORM-006`'s supplier select · four roles on SCREEN-013's
*preferred supplier* · PM on SCREEN-020's *activity* (`auditLogs` = `ADMINS`) · IM/SK/AN/V on SCREEN-009's
*add supplier* / *invite team* checklist checks.

**MISMATCHED_CANONICAL_VALUES (5)** — seeded ledger 17-vs-12 at t₀ · Gate 6 6m *Cold Room 80 / Main Store
40* · Gate 6 6m adjust sheet *116.000 KG total* · `22` §2's five additional products · `19` `TABLE-013`
columns vs the canonical board.

**UNDEFINED_QUERY_IDS (1)** — `Q-079`.

**UNJUSTIFIED_INDEXES (4)** — `IDX-02`, `IDX-03`, `IDX-19`, `IDX-37`.

**BROKEN_END_TO_END_WORKFLOWS (10)** — warehouse rename → `warehouseName` rot (`INV-25`) · organization
rename → stale public directory · warehouse restore · seed → `T-SEED-01` · dashboard inventory-by-location
value chain · warehouse-archive refusal message chain · Needs Attention chain · movement-history
*Reference* chain · product list Store room × Status chain · `org.create` → `counters/purchaseOrder` →
`po.order`.

---

## 7 — VERDICT

```
FRONTEND_DB_INDEPENDENT_REVIEW = FAIL
```

Failing because `CRITICAL_FINDINGS = 5`, `HIGH_FINDINGS = 16`, and eight of the ten required counters are
non-zero. `UNSUPPORTED_ACTIONS` and `UNDEFINED_QUERY_IDS` are each 1, not 0.

**What this does and does not mean.** The architecture is sound. Tenancy, the ledger-as-truth model,
idempotency, integer arithmetic, zone 4 closure and the A1 transfer command are all correct and, in
several places, better reasoned than the defects around them warrant. What failed is **reconciliation**,
in the direction DB-11 §J predicted it would: the gate was run database-first by the author of the fixes,
so it verified that every database object has a consumer and did not verify that every frozen UI element
has a producer. Eleven of my twenty-one CRITICAL/HIGH findings are frozen UI elements with no producer
(F-C-02, F-C-05, F-H-02, F-H-04, F-H-05, F-H-06, F-H-08, F-H-09, F-H-12, F-H-13, F-H-15), and two more
are A2 reintroducing the exact defect class it was written to remove (F-C-04 `warehouseName`, F-H-01
`Q-079`).

**The three things to fix before anything else:**

1. **F-C-01** — correct the artifact manifest from bytes. Every canonical-value claim in the pack cites a
   hash, and eight of ten of those hashes are wrong. No further review is worth running until the
   authority set is real.
2. **F-C-02** — decide the per-warehouse value question. It is a schema amendment, it touches the
   dashboard, a report, a chart and a refusal message, and it is the only finding here that no amount of
   documentation repair can close.
3. **F-C-03** — correct 17 → 12. It is a one-line fix in six places and it currently makes Codex's first
   green build impossible.

**F-C-04 and F-C-05 need the owner, not an agent**, because both are consequences of A2 design decisions
(DV-11's `warehouseName`, DB-CR-018's refusal to persist a per-row status) meeting frozen UI contracts.

```
DATABASE_PACK_MODIFIED   = NO
DESIGNS_MODIFIED         = NO
CODEX_STARTED            = NO
NEXT_ACTION              = owner review of F-C-01 … F-C-05, then remediation of the HIGH set
```

**STOP.**
