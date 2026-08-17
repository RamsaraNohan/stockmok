# STOCKMOK — DATABASE / FIREBASE ARCHITECTURE RUN — SECTION 0 STOP RECORD

**Run type:** Post-Design Database / Firebase Implementation Architecture Freeze
**Run date:** 2026-08-15
**Gate reached:** Section 0C — FINAL FRONTEND INGESTION
**Verdict:** **BLOCKED. `docs/database-final/` not created. DB-01 → DB-10 not written.**

```
FINAL_CONTROL_STATE            = COMPLETE
FINAL_BUSINESS_AUTHORITIES     = COMPLETE
FINAL_ENGINEERING_AUTHORITIES  = COMPLETE
FINAL_FRONTEND_AUTHORITIES     = PRESENT BUT NOT VERIFIABLE
FINAL_AUTHORITY_INGESTION      = PASS
FINAL_FRONTEND_INGESTION       = FAIL
DATABASE_CONTROL_PACK          = INCOMPLETE
DB_FILES                       = 0/10
UNRESOLVED_BLOCKERS            = 2
OWNER_DECISIONS_REQUIRED       = 3
PRODUCTION_CODE_CHANGED        = NO
DESIGNS_MODIFIED               = NO
AUTHORITIES_MODIFIED           = NO
```

Section 0 of the run instruction states: *"Do not create DB-01 until this gate passes"*, *"Do not trust
this prompt as proof"*, and Section 23 requires a stop when *"the final frontend set is ambiguous"* or
*"a final UI action has no legitimate backend behaviour"*. Both conditions are met. This document is the
required stop record.

---

## 1. What passed

The control layer that blocked the previous run has been repaired, and the business and engineering
authorities are in excellent shape. Verified from the files, not from the prompt:

| Check | Result | Evidence |
|---|---|---|
| `GATE_13 = PASS` | **CONFIRMED** | `STOCKMOK_DESIGN_CHECKPOINT.md` L15; `DEC-023` |
| `GATE_14 = APPROVED` | **CONFIRMED** | `DEC-025`; `46` amendment L98–113; checkpoint L16 |
| `STOCKMOK_DESIGN_FREEZE_v1.0 = APPROVED` | **CONFIRMED** | `STOCKMOK_DESIGN_FREEZE_v1.0.md` L9 |
| `DESIGN_PHASE = CLOSED` | **CONFIRMED** | freeze L11; checkpoint L16 |
| Four missing control files | **NOW PRESENT** | checkpoint, ledger, change register, handoff all exist |
| ACR-001 / 002 / 004 | **RESOLVED** | `46` amendment L108–110 — no audit route is added |
| ACR-003 | OPEN, **non-blocking** | renderer-asset regeneration only; no database impact |
| Role registry | **7 roles, ANALYST valid** | `06` §5 seven-column hard matrix; `03` §A3; `23` §3 — DB-CR-001 correctly resolved |
| Physical path registry | **`11` §5 governs** | four zones, deterministic ids, projections — DB-CR-002 correctly resolved |
| Canonical seed arithmetic | **RECONCILES EXACTLY** | see §4 below |
| Node.js 22 runtime | **VALID** | GA; deprecation 2027-04-30. Node 20 deprecated 2026-04-30 — do not use it |

The substance of the database pack is largely *derivable* rather than inventable: `11` already supplies
the path list, id strategy, ownership/projection table, 19 indexes, a 32-command catalog, transaction
boundaries and the idempotency strategy. Two defects stand between here and DB-01.

---

## 2. BLOCKER DB-B-01 — the frozen frontend set cannot be verified; the manifest is wrong

`STOCKMOK_FINAL_DESIGN_ARTIFACT_MANIFEST.md` is the file the Gate-0 re-run relied on to record
`FINAL_FRONTEND_AUTHORITY_SET = UNAMBIGUOUS`. It carries SHA-256 values "over full file bytes".
**Eight of its ten canonical hashes match no file in the repository.**

| Logical artifact | Manifest canonical SHA-256 (first 8) | Actual SHA-256 of the named file (first 8) | Result |
|---|---|---|---|
| Design System | `81e6fba3` | `8f1880d5` | **MISMATCH** |
| Gate 5 Public/Auth/Onboarding | `8a0ddc07` | `27de3d9e` | **MISMATCH** |
| Gate 6 Dashboard/Inventory | `cb94a73c` | `ea760d2b` | **MISMATCH** — `cb94a73c` is the `new` file |
| Gate 7 Private Procurement | `776a0268` | `d09c75fe` | **MISMATCH** — matches neither local file |
| Gate 8 Network Foundation | `9a953ffd` | `4d6246a2` | **MISMATCH** |
| Gate 9 Connected Workflows | `dcf064c4` | `0f53b4d3` | **MISMATCH** — matches neither local file |
| Gate 10 Supporting Operations | `7267ee22` | `5b1bcf46` | **MISMATCH** |
| Gate 11 Responsive Reconciliation | `0f571341` | `e51514dd` | **MISMATCH** |
| Gate 12 States + Accessibility | `1ab770af` | `1ab770af` | MATCH |
| Gate 14 Owner Approval | `a1bbc21b` | `a1bbc21b` | MATCH |

### 2.1 The supersession direction is inverted for Gates 6, 7 and 9

The manifest resolves each rival pair **in favour of the pre-patch file**. The change register records
the opposite, and the file contents prove the change register right.

| Gate | Manifest verdict | File evidence | Truth |
|---|---|---|---|
| **6** | base = CANONICAL; `new` = "DUPLICATE, byte-identical" | 142,682 B vs **174,074 B** — a 31,392-byte difference; the claim is false. The base file contains all ten invented tokens `GRN-001, OIL-005, VEG-001, DRY-006, Prawns Jumbo, Coffee Beans, Butter Unsalted, Tomatoes, Olive Oil, Bar Store`; **`CHG-027` records these as removed**. `new` carries the frozen twelve-product seed. | **`new` is canonical** |
| **7** | base = CANONICAL ("carries the Gate-13 patch") | base contains the `Print` action; `new` has zero. **`CHG-036` records Print as removed.** | **`new` is canonical** |
| **9** | base = CANONICAL ("carries the Gate-13 patch") | base: `@fresh-foods` ×3, `@freshfoods` ×0, `Print` ×1. `new`: `@fresh-foods` ×0, `@freshfoods` ×3, `Print` ×0. **`CHG-033` mandates `@freshfoods`; `CHG-036` removes Print.** | **`new` is canonical** |

Corroborating: the manifest's own *superseded* hashes for Gate 7 (`f8a7c504`) and Gate 9 (`e1003987`)
match the local `new` files **exactly**. The manifest hashed the right files and assigned them the wrong
role, while its "canonical" hashes correspond to files that are not in the repository.

### 2.2 Patched artifacts that are absent entirely

These gates have **no `new` variant**, their hashes mismatch, and they still contain content the change
register records as removed:

- **Gate 8** — `@fresh-foods` ×7 and three `reconnect` occurrences. `CHG-033` and `CHG-041` remove both.
- **Gate 11** — still carries the *"Four-item bottom tab bar"* and *"390 Phone — Bottom tab bar, no
  sidebar"*. `CHG-044` / `DEC-022 P5` record `MOBILE_BOTTOM_TAB_NAV = 0`.
- **Gate 12** — `@fresh-foods` ×2 (hash matches the manifest, so the manifest hashed the unpatched file).
- Also named by the manifest but **not present anywhere**: `Stockmok Brand Refinement.dc.html`,
  `Stockmok Brand Refinement Standalone.dc.html`, `Stockmok Gate 3 Consolidated.dc.html`.

### 2.3 Why this stops the run

`DB_03_FINAL_UI_TO_DATA_TRACEABILITY_MATRIX.md` must map every approved surface's reads, writes,
queries, states and permissions, and DB-10 must report `UI_DATA_COVERAGE = 100%`. Mapping the artifacts
the manifest names would map **superseded boards** — boards whose own change register says their data was
invented. Claiming 100% coverage against an unverifiable set would be a fabricated metric. The markdown
registries (`19`, `22`, `23`) are internally consistent and were fully ingested, but the run instruction
makes the **design artifacts** mandatory input, and they cannot currently be resolved to a trusted set.

---

## 3. BLOCKER DB-B-02 / DB-CR-004 — inter-warehouse Transfer: an approved UI workflow with no backend authority

**SOURCES**

*Present in the frozen, owner-approved design — and it survives the Gate-6 patch, so it is not a
superseded-artifact artefact:*

- Gate 6 (patched, `cb94a73c`) board **6i** — *"Opening balance · stock adjustment · **transfer**"*, drawn
  as a working form: *"Move stock between store rooms — From Main Store ▾ To Cold Room ▾ Product Basmati
  Rice · DRY-001 Quantity 50.000 KG — Main Store 250.000 → 200.000 KG — Cold Room 0.000 → 50.000 KG —
  Total stock unchanged · 250.000 KG. A transfer never changes what you own, only where it is — and **it
  writes both halves at once**."*
- Gate 6 movement ledger — *"Plain words for every kind: Opening balance · Received · Issued ·
  **Transferred in** · **Transferred out** · Correction. The Kind filter offers exactly these words."*
  and *"A transfer is two lines — out of one store room, into another, at the same moment, each with its
  own resulting balance."*
- Gate 12 — a drawn refusal state *"TRANSFER · same room twice"*, and the warehouse-archive refusal
  offers **"Transfer this stock"** as its remedy action.
- Gate 11 — *"Stock moves only through an adjustment, a transfer or a receipt."*
- **Gate 14 (the approved package)** — *"Stock movements: … adjustment with guard rails; **transfer
  writing both halves at once** … Drawn."*
- `DEC-012` (APPLIED) and `CHG-024` (Owner, pre-authorised) both name transfer explicitly.

*Excluded by every other authority:*

- `05` §5.16 — A/B movement types are `OPENING_BALANCE, ADJUSTMENT_IN, ADJUSTMENT_OUT, PURCHASE_RECEIPT,
  CONNECTED_DISPATCH_OUT`; **`TRANSFER` is listed under "Future"**.
- `05` §11 — *"inter-warehouse transfers"* under Future compatibility, *"none of this is required for
  current correctness"*.
- **`23` §Excluded — *"Release D sales, **transfer**, reservation and multi-level conversion"*.** This is
  a frozen **UI** authority excluding it.
- `11` §11 — 32 commands; there is no `stock.transfer`.
- `22` §3.1 — 61 actions (`ACTION-001…061`); there is no transfer action.
- `19` §3 — 23 forms; there is no transfer form. `07` §5 — no transfer screen or modal.
- `02` §4.5, `06` §5, `08` — no transfer requirement, no capability row, **zero occurrences in the test
  matrix**.

**CONFLICT** — A frozen, owner-approved, fully-drawn multi-document atomic stock operation exists in the
UI with no requirement, no command, no movement type, no `ACTION-###`, no `FORM-###`, no `SCREEN-###`, no
RBAC cell and no test — and the frozen UI state matrix names it as Release D.

**IMPLEMENTATION IMPACT** — This is not cosmetic. It determines:
`DB-02` (two new movement types + the `Kind` discriminator), `DB-04` (ledger filter index),
`DB-05` (a new capability row across seven roles), `DB-06` (a 33rd command with a two-balance,
two-movement atomic write set), `DB-07` (a new invariant: total unchanged, each warehouse balance
non-negative, same-room rejected), `DB-08` (seed ledger and emulator tests), and `DB-10`
(`COMMAND_COVERAGE`, `TRANSACTION_COVERAGE`, `RBAC_COVERAGE`). It also decides whether Gate 12's
warehouse-archive refusal keeps a working remedy action or becomes a dead end.

**RECOMMENDED RESOLUTION** — **Remove transfer from the design; do not build it.** Three independent
authorities exclude it, one of them a UI authority, and Release A is complete without it. The Gate 12
archive refusal should offer *"Adjust stock"* instead. If the owner instead wants it built, it is a
scope change under `03` §11 requiring entries in `02`, `05`, `06`, `08`, `11` and the change register.

**OWNER_DECISION_REQUIRED = YES.** The run instruction forbids both redesigning frozen UI and inventing
database behaviour, so this cannot be resolved by an agent.

---

## 4. What is *not* wrong — the canonical seed reconciles exactly

Read against the **correct** (patched) Gate 6 artifact, the seed is flawless. Recording this so the
transfer decision is not mistaken for a wider data problem.

| SKU | Product | Unit | On hand | Min | Value (LKR) | `16` §7.2 |
|---|---|---|---|---|---|---|
| MEAT-001 | Chicken Breast | KG | 120.000 | 20 | 150,000.00 | ✔ |
| MEAT-002 | Beef Mince | KG | 40.000 | 15 | 84,000.00 | ✔ |
| MEAT-003 | Fish Fillet | KG | 10.000 **Low** | 12 | 18,500.00 | ✔ |
| DAIR-001 | Fresh Milk | L | 120.000 | 50 | 45,600.00 | ✔ |
| DAIR-002 | Butter Block | KG | 8.000 **Low** | 10 | 20,800.00 | ✔ |
| DAIR-003 | Cheddar Cheese | KG | 25.000 | 8 | 80,000.00 | ✔ |
| DRY-001 | Basmati Rice | KG | 250.000 | 100 | 105,000.00 | ✔ |
| DRY-002 | Wheat Flour | KG | 60.000 **Low** | 80 | 12,600.00 | ✔ |
| DRY-003 | Sugar | KG | 300.000 | 60 | 78,000.00 | ✔ |
| DRY-004 | Cooking Oil | L | 0.000 **Out** | 40 | 0.00 | ✔ |
| BEV-001 | Bottled Water 1L | EACH | 600.000 | 200 | 54,000.00 | ✔ |
| BEV-002 | Orange Juice 1L | EACH | 90.000 | 60 | 43,200.00 | ✔ |
| | | | | **Total** | **691,700.00** | ✔ |

The patched board also states the chain in its own words — *"Chicken Breast opened at 18.000 KG against a
minimum of 20.000, so it was low. This recount of +2.000 KG is what took it to 20.000 and dropped the
dashboard's low-stock count from four to three"* — and *"Twelve opening balances plus the five later
movements on Chicken Breast are the whole record"*, i.e. **6 movements on MEAT-001 summing to 120.000 KG**,
matching `16` §7.4 and `SC-16` exactly. `Bar Store` appears only as the example value inside the *New
warehouse* dialog, not as a seeded third warehouse.

`CANONICAL_SEED_RECONCILIATION = PASS` (against `cb94a73c`).

---

## 5. Change requests raised during ingestion

### DB-CR-004 — Inter-warehouse Transfer — **BLOCKER, OWNER_DECISION_REQUIRED = YES**
See §3.

### DB-CR-005 — Movement "Kind" taxonomy — **OWNER_DECISION_REQUIRED = YES**
The frozen ledger filter offers **six** kinds — *Opening balance · Received · Issued · Transferred in ·
Transferred out · Correction* — and states *"the Kind filter offers exactly these words and nothing from
the system underneath."* `05` §5.16 defines **five** movement types. Two problems, one of which is
independent of DB-CR-004:

1. **"Issued" and "Correction" are both `ADJUSTMENT_OUT`.** The Gate 6 ledger shows
   *"Issued to kitchen −15.000 KG"* and *"Correction · damaged in storage −5.000 KG"* as distinct kinds.
   `movementType` alone cannot render or filter them. A persisted discriminator
   (e.g. `movementKind`) plus an index is required, or the frozen filter is unimplementable as drawn.
2. `CONNECTED_DISPATCH_OUT` has no plain word in the six-word list — it is needed on the supplier side.

**Recommended:** add an immutable `movementKind` enum to `StockMovement`, derived server-side inside the
stock command, with the six (or four, if transfer is dropped) UI words mapping onto it, plus a composite
index for the filter. Decide alongside DB-CR-004.

### DB-CR-006 — `StockMovement.balanceAfterMilli` is missing — **RESOLVED, no owner decision**
`TABLE-005` and `TABLE-006` (`19` §4) both require a **Balance After** column, and every drawn ledger row
shows it. `05` §5.16 does not persist it, and it cannot be computed from a filtered, paginated,
reverse-chronological page without reading the whole ledger. **Resolution:** persist an immutable
`balanceAfterMilli` written inside the same transaction that already computes the new balance. This adds
no zone change, no client write path, no trigger and no data-derived rule read, so it is permitted by
`11` §32. To be recorded in DB-02 and given a full drift/reconciliation contract in DB-07.

### DB-CR-007 — Handle length 3–30 vs 3–40 — **RESOLVED by authority order**
`05` §3 and `11` §18 both specify **3–30** characters; `19` `FORM-005` says 3–40. Two authorities against
one, and 3–30 is a strict subset, so **3–30 binds**. Recorded rather than silently applied.

### DB-CR-008 — Firebase provisioned facts vs `11` §1 — **PENDING_IMPLEMENTATION, no owner decision**
`FIREBASE_PROJECT_FACTS.md` (the newest control file) records what is actually provisioned; `11` §1 records
what was *recommended*. Facts win where a resource already exists:

| Item | `11` §1 recommendation | Actually provisioned | Position |
|---|---|---|---|
| Project id | `stockmok-prod` | **`stockmok`** | Fact binds; `11` §1 is a naming recommendation |
| Firestore location | `asia-south1` suggested | **`asia-southeast1`** (immutable) | Fact binds; `11` required only "chosen once, never changed" |
| Hosting site | `stockmok-prod.web.app` | **`stockmokweb.web.app`**, `stockmok.com` purchased | Fact binds |
| Functions region | co-locate with Firestore | UNDECIDED | **Recommend `asia-southeast1`** — PENDING |
| Node runtime | Node 22 | undecided | **Node 22 confirmed valid** (GA; deprecates 2027-04-30). Node 20 deprecated 2026-04-30 — do not use |
| Billing | **Blaze required** | **Spark** | **PENDING — `ADM-009` Day-1 decision is still unmade.** Not an architecture blocker (`03` §8 already defines the P0 contingency), but production Cloud Functions cannot deploy until it is resolved |

---

## 6. Required actions to clear this gate

1. **Repair the design artifact manifest.** For Gates 6, 7 and 9 the `new` files are canonical — the
   change register and the file contents both say so, and for Gates 7 and 9 the manifest's own
   superseded-hashes match them exactly. Re-hash every artifact and record the true values.
2. **Locate or re-export the patched Gate 8, Gate 11 and Gate 12 artifacts**, or record explicitly that
   the local copies are pre-patch and that `CHG-033`, `CHG-041` and `CHG-044` are unapplied in the files
   while applied in the record. Same for the Design System, Gate 5 and Gate 10 hash mismatches.
3. **Quarantine the superseded copies** into `superseded/` so the current set is unambiguous by
   inspection, not by cross-reference.
4. **Decide DB-CR-004 (transfer)** — recommended: remove from the design as Release D.
5. **Decide DB-CR-005 (movement kind taxonomy)** alongside it.
6. Note DB-CR-006, DB-CR-007 and DB-CR-008 as recorded; none needs a decision.
7. Re-run the database architecture phase. With the manifest corrected and DB-CR-004/005 answered,
   Gate 0 and the frontend ingestion both pass and DB-01 → DB-10 can be written against verified evidence.

---

## 7. Final response

```
DATABASE_CONTROL_PACK         = INCOMPLETE
DB_FILES                      = 0/10
FINAL_AUTHORITY_INGESTION     = PASS
FINAL_FRONTEND_INGESTION      = FAIL
DATABASE_IMPLEMENTATION_READY = NO
UNRESOLVED_BLOCKERS           = 2
BLOCKERS                      = DB-B-01, DB-B-02 (DB-CR-004)
OWNER_DECISIONS_REQUIRED      = 3   (manifest correction · DB-CR-004 · DB-CR-005)
PRODUCTION_CODE_CHANGED       = NO
DESIGNS_MODIFIED              = NO
AUTHORITIES_MODIFIED          = NO
NEXT_ACTION                   = RESOLVE_DATABASE_BLOCKERS
```
