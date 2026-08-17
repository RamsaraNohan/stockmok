# STOCKMOK — DATABASE HANDOFF

**Phase closed:** database / Firebase implementation architecture **and** the Codex C1 Firebase Foundation.
**Earlier in this sequence:** independent frontend ↔ database review remediation (**A3**), an adversarial
review of A3 itself (**A3R**), the **A3R propagation closure** (**A3R-P**, `DB_00` §8.11), and the seven
shared implementation contracts.
**Most recent pass:** **A3R-P2 — C1 implementation-discovery propagation** (`DB_00` §8.12): the seven
rulings accepted during executable C1 (`C1-AUTH-001 … 007`) are now current in every normative document,
including the **owner-approved** zero `OPENING_BALANCE` exception. 2026-08-17.

```
DATABASE_CONTROL_PACK          = COMPLETE      DB_FILES = 12  (DB-00 … DB-11)
IMPLEMENTATION_CONTRACTS       = COMPLETE      docs/implementation/ = 7 files
INDEPENDENT_REVIEWS_RUN        = 3             (1 failed on spend limit, 2 completed, both FAIL)
DEFECTS_FOUND                  = 62            PATCHED = 61   REFUTED_WITH_EVIDENCE = 1
A3R_P_PROPAGATION_DEFECTS      = 9             PATCHED = 9    (P-01 … P-09, DB_00 §8.11)
A3R_P_PROPAGATION_CLOSURE      = COMPLETE
C1_AUTH_DISCREPANCIES          = 7             PROPAGATED = 7 / 7  (C1-AUTH-001 … 007, DB_00 §8.12)
A3R_P2_PROPAGATION             = COMPLETE
OWNER_APPROVED_SEMANTIC_EXCEPTION = C1-AUTH-007  (zero OPENING_BALANCE)
DB_00_TO_DB_11_SYNCHRONIZED    = YES           IMPLEMENTATION_CONTRACTS_SYNCHRONIZED = YES
STALE_CURRENT_ASSERTIONS       = 0
DATABASE_ARCHITECTURE_FROZEN   = YES
DATABASE_IMPLEMENTATION_READY  = YES           BLOCKING_DEFECTS = 0
CODEX_FOUNDATION               = COMPLETE      C1_FOUNDATION_COMPLETE = YES
FIRESTORE_RULES_WRITTEN        = NO            COMMAND_BODIES_WRITTEN = NO
FRONTEND_WRITTEN               = NO            PRODUCTION_DATA_WRITTEN = NO
A3R_P2_PRODUCTION_CODE_CHANGED = NO            DESIGNS_MODIFIED = NO
CANONICAL_SEED_FIGURES_CHANGED = NO
FOUNDATION_READY_FOR_CLAUDE_CODE = YES
```

**Counts after A3R-P2 — unchanged, re-derived from the normative tables, not copied forward:**

```
ACTIVE_QUERY_IDS = 92   ACTIVE_INDEX_IDS = 67   ACTIVE_COMMAND_IDS = 38
ACTIVE_INVARIANT_IDS = 26   ACTIVE_DERIVED_CONTRACT_IDS = 14
PRODUCT_LIST_MATRIX_INDEXES = 32   IDX_36_DIRECTION = DESC
```

## What happened in this run

**Two independent reviewers, both returned FAIL, both were right.**

1. **Frontend ↔ database review — 44 findings.** The obligation the previous handoff left open. Its
   diagnosis: DB-11 was run *database-first by the author of the fixes*, so it checked that every database
   object has a consumer and never checked that every frozen UI element has a producer. All 44 accepted,
   all resolved **from authority** — nine of them by applying precedence (canonical visual, rank 7, beats
   UI registry, rank 8) rather than escalating.

2. **Adversarial review of A3 itself — 18 findings.** Same failure mode one layer up: *"A3's author
   verified that each change record was written, not that each normative table was edited."* 17 accepted
   and patched, 1 refuted on the canonical bytes.

## The five things that would have broken the build

| | Found by | What it was |
|---|---|---|
| **The artifact manifest was inverted** | F-C-01 | 8 of 10 canonical hashes matched no file. Re-verified from bytes in this run. The canonical Gate 6/7/9 files are the ones named **`… new.dc.html`**; the manifest's own §4 instruction would have promoted a pre-patch board carrying *"Issued to kitchen"*, a two-part shipment and *"Purchasing Manager"*. **Select by SHA-256, never by filename.** |
| **The dashboard's money could not be queried** | F-C-02 | `Q-060`/`Q-058` summed `onHandMilli`. Cold Room would have rendered `323,000` — kilograms plus litres — instead of `LKR 398,900.00`. |
| **The seed could never go green** | F-C-03 | 17 movements was asserted at t₀ alongside `18.000 KG` / `564,200.00` / 4 low. It is **12 at t₀, 17 after the chain**. The canonical board says so in words. |
| **The status × store-room filter had no index** | A3R-01 | A3's fix for the above added one index where the frozen four-filter bar needs a **32-index matrix**. `IDX-44` served 1 of 5 shapes. |
| **The supplier archive guard was not a guard** | A3R-11 | It was a counter the *client* read, on a client-writable document, with no archive command in existence — and the counter had an unreachable zero that stranded suppliers permanently. Now `C-38 partner.setStatus`. |

## What changed

- **Amendments A3 (`DB_00` §8), A3R (`DB_00` §8.10) and A3R-P (`DB_00` §8.11).** `DB-CR-024 … DB-CR-039`,
  `C-37`, `C-38`, `INV-26`, `INV-27`, `DV-12 … DV-14`, `ATTACK-16`, `Q-080`.
- **`DB-CR-018` reversed** — its cost argument was arithmetically wrong. **`INV-25` withdrawn** with the
  `warehouseName` field it policed.
- **`SCREEN-049` and `CHART-003` reinstated — and now INCLUDED in the normative rows, not only in the
  amendment.** A3 struck them on the Gate 6 board's *"exactly two reports"* copy; `02` `FR-DASH-005` is an
  **A-MUST**. Rank 1 beats rank 7. The one place A3 used precedence backwards — and `DB_03` still carried
  the omission until `A3R-P` rewrote the `049` row: table `Q-062`, chart `Q-085 … Q-089` (five `count()`
  aggregations over the same filter set, never page 1).
- **Ledger and PO search corrected in the normative rows.** `Q-083` resolves through **`Q-015r`** (not
  `Q-013b`/`Q-015`); `TABLE-010` search is **`Q-084a`** (order number) and **`Q-084b`** (supplier, via
  resolver) — the singular `Q-084` filtered a field `purchaseOrders` does not have.
- **Counts — re-derived mechanically at A3R-P from the normative tables, not copied forward:**

```
ACTIVE_INDEX_IDS             = 67    IDX-01…IDX-69 less the deleted IDX-03, IDX-19
ACTIVE_QUERY_IDS             = 92    91 at A3R, + Q-080 (the C-38 archive guard, cited as the
                                     undefined id Q-085g in DB-06 §6.2 and DB-07 §12)
ACTIVE_COMMAND_IDS           = 38    Release A/B callables; C-32 is Release C, excluded
ACTIVE_DERIVED_CONTRACT_IDS  = 14    DV-01 … DV-14
ACTIVE_INVARIANT_IDS         = 26    INV-01…INV-24 (24) − INV-25 + INV-26 + INV-27
```

  **The two that moved at A3R-P, and why.** A3R diagnosed A3's failure mode — *"the change record was
  written, the normative table was not"* — and then repeated a narrower version of it: it corrected the
  counts it **inherited** and did not re-count after its **own** additions. `INV-27` was added by `A3R-05`
  and never counted, so the pack said **25** invariants while carrying **26**. The `C-38` guard was
  created by `A3R-11` inside `DB_06` and never back-ported to `DB_04`, so the pack said **91** query ids
  while carrying **92** — the identical defect as `Q-079` at `A3 · F-H-01`, one pass later.
- **`docs/implementation/` created** — seven contracts bridging Antigravity, Codex and Claude Code.
- **Codex C1 Firebase Foundation built and accepted** — workspace config, `packages/shared` contracts /
  schemas / converters / typed paths (zone 4 server-only) / transition data, **generated**
  `firestore.indexes.json` at exactly 67 with the 32-index matrix, emulator + bootstrap tooling, DB-08
  factories, foundation tests, Node-22 CI. No Security Rules, no command bodies, no frontend, no production
  data. Evidence: `docs/implementation-evidence/C1_COMPLETION_REPORT.md`.
- **Amendment A3R-P2 (`DB_00` §8.12) — C1 implementation-discovery propagation.** Six propagation
  corrections where `DB_02` was already right and a derived document had drifted: `MovementType` (the
  generic `ADJUSTMENT` is not a storage value; `CONNECTED_DISPATCH_OUT` was missing), `ConnectionStatus`
  (`REJECTED`, not `DECLINED`), `MappingStatus` (`VERIFIED` / `DISABLED` only), private partners (bounded
  `partnerTypes` + `PartnerStatus`; UI **archive → `DEACTIVATED`**, **restore → `ACTIVE`**; `ARCHIVED` never
  persisted), `UserStatus = ACTIVE | DISABLED`, and **`IDX-36 … onHandMilli DESC`** — the later
  `DB-CR-038` matrix rule controls, and no index was added, deleted or renumbered. Plus **one
  owner-approved semantic exception, `C1-AUTH-007`:** `OPENING_BALANCE` permits `signedQuantityMilli >= 0`
  while every other movement type requires non-zero, so `C-13` accepts `quantityMilli >= 0` and the
  canonical **Cooking Oil** zero opening balance is a *recorded* zero rather than an uninitialized product.
  A shared non-zero validator must not be applied to `C-13`.

## Canonical authorities — unchanged

- **Roles: seven.** `OWNER, ADMIN, INVENTORY_MANAGER, PROCUREMENT_MANAGER, STOREKEEPER, ANALYST, VIEWER`.
- **Paths: `11` §5**, reproduced in `DB_01` §4 and `FIREBASE_PATH_CONTRACT` §1. **A3 added no path.**
- **Seed:** t₀ = 12 products · **12 movements** · 4 low · 1 out · `LKR 564,200.00`.
  Post-chain = **17 movements** · 3 low · 1 out · `LKR 691,700.00` = Cold Room `398,900.00` + Main Store
  `292,800.00`. MEAT-001: 6 movements, `18.000 → 120.000 KG`, all in Cold Room.
- **Connected flow:** one shipment of 10 PACK, **two receipts** (8 then 2). Partial receiving exists;
  partial shipment does not.

## Owner items — **four**, all design-side, none blocking

Numbered exactly as `DB_00` §8.9. Every file that cites them now uses this numbering
(`DB_10` §7, `INTEGRATION_STATUS` §4, `IMPLEMENTATION_CHECKPOINT` §5). *(Reconciled at `A3R-P` · P-08:
`DB_00` §8.9 and the checkpoint said three, this file and `DB_10` said four, and the ordering differed.)*

1. **Move and rename the design files.** The manifest is corrected but nothing was moved. The pre-patch
   Gate 6/7/9 files still sit beside the canonical ones under names differing by the word `new`.
   Select by **SHA-256**, never by filename.
2. **`@fresh-foods` vs `@freshfoods`** — Gate 8 vs Gate 9. A seed literal. The database takes `@freshfoods`.
3. **Two stale Gate 6 mobile frames** (`80.000 / 40.000`, `116.000 KG`). Canonical is 120.000 KG in Cold
   Room, per owner brief §C.13. Also `22` §2's five non-canonical products.
4. **The Gate 6 board's *"exactly two reports"* copy** contradicts `FR-DASH-005` (`A-MUST`). The report is
   built (`A3R-09`); the copy should be corrected so design and requirement agree.

**⇒ `OWNER_DESIGN_SIDE_ITEMS = 4`**, derived from the list, not asserted beside it.

Plus deployment prerequisites (Blaze billing, region, Auth domains) — none of which the emulator path
needs — and the Stage-17 obligation to **measure** the read budgets rather than assume them.

## Minimum reading for the next agent

`DB_00` **§8 (A3) → §8.10 (A3R) → §8.11 (A3R-P)** → `docs/implementation/` (all seven) → `DB_02` →
`DB_04` → `DB_06` → `DB_09`. `DB_10` is the verdict and the caveats. `DB_11` §L records why the previous
gate failed and **§M is its current inventory** — §F, §I, §J and §K of that file are A2-era audit trail
and are labelled as such. **Do not read the v2 or v3 control packs.**

## Three rules that cost this project two failed reviews and one propagation pass

1. **Edit the normative table, not just the change log.** An implementer reads the table.
2. **Run the gate in the direction the author cannot see, by someone who authored nothing in it.**
3. **Re-derive every count from the tables *after* your own edits — including the counts the previous pass
   just fixed.** A3R corrected three inherited counts and left two of its own additions uncounted. Fixing
   an inherited count is not the same as re-deriving the count.

## NEXT_ACTION

**`PREPARE_PARALLEL_IMPLEMENTATION_LANES`.** `CODEX_FIREBASE_FOUNDATION` is **COMPLETE** and the
A3R-P2 propagation is closed, so the common foundation prerequisites are satisfied:

```text
LANE_A = CODEX_C2_READ_QUERY_LAYER
LANE_B = CLAUDE_CODE_SECURITY_RULES_AND_BACKEND_SEQUENCE
LANE_C = ANTIGRAVITY_FRONTEND_IMPLEMENTATION
```

`CODEX_C2_FOUNDATION_PREREQUISITES = SATISFIED` · `FRONTEND_FOUNDATION_PREREQUISITES = SATISFIED`. That
certifies the **foundation** the three lanes share — types, schemas, converters, paths, the 67-index set,
transition data, the frozen counts — not the C2 or frontend implementation *plans* themselves, which no
documentation pass has reviewed.

**Two contract points to read in their amended form before writing code:** `C-13`'s `quantityMilli >= 0`
(`DB_06` §3.1 — and do **not** wire the shared non-zero validator into it) and `IDX-36 …
onHandMilli DESC` (`DB_04` §7).

**Still outstanding, and not discharged by C1:** Firestore Security Rules, command bodies, backend
transactions, the frontend, and the **command-driven** `T-SEED-01a` / `T-SEED-01b`. C1's
`seed:bootstrap` / `replay:bootstrap` and their `*-BOOTSTRAP` tests are fixture, schema, arithmetic and
reproducibility evidence only (`DB_08` §6.5).
