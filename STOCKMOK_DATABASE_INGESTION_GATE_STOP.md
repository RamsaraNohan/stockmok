# STOCKMOK — FINAL AUTHORITY INGESTION GATE (Section 0)

**Run type:** Post-Design Database / Firebase Architecture Freeze
**Run date:** 2026-08-15
**Gate:** Section 0 — FINAL AUTHORITY INGESTION GATE
**Verdict:** **FAIL — STOPPED AT GATE 0. No database architecture created.**

```
FINAL_CONTROL_STATE            = INCOMPLETE
FINAL_BUSINESS_AUTHORITIES     = COMPLETE
FINAL_ENGINEERING_AUTHORITIES  = COMPLETE
FINAL_FRONTEND_AUTHORITIES     = INDETERMINATE (present but not resolvable to a current set)
DESIGN_FREEZE_RECORDED         = NO
DATABASE_CONTROL_PACK          = NOT STARTED
DB_FILES                       = 0/10
PRODUCTION_CODE_CHANGED        = NO
```

Section 0 of the run instruction states: *"THIS GATE IS MANDATORY. Do not create DB-01 or any
database architecture until this gate passes"* and *"If not actually recorded: STOP. Do not trust
this prompt as proof of approval."* The recorded state does not match the state the prompt asserts.
This document is the required stop record. Nothing in `docs/database-final/` was created.

---

## 1. What was inspected

Full recursive inventory of `C:\Users\ramsa\stockflow` — every `.md` file (86), every design
artifact, every control pack, plus the visual-design QA/renderer trees. Nothing was excluded.

### Authority inventory (Section 0A)

| Group | Current authority located | Status |
|---|---|---|
| **A** Final business / scope | `Stockmok_Final_Control_Pack_v4/03_FINAL_SCOPE_FREEZE.md` (v3.0) | FOUND · READ · CURRENT |
| **A** Final requirements | `…v4/02_FINAL_REQUIREMENTS_SPECIFICATION.md` | FOUND · CURRENT |
| **B** Final domain / data | `…v4/05_FINAL_DOMAIN_AND_DATA_CONTRACT.md` | FOUND · CURRENT |
| **C** Final security / RBAC | `…v4/06_FINAL_SECURITY_AND_RBAC_MODEL.md` (v3.0) | FOUND · READ · CURRENT |
| **D** Final use cases / acceptance | `…v4/04_FINAL_USE_CASES_AND_ACCEPTANCE.md` | FOUND · CURRENT |
| **E** Final QA / tests | `…v4/08_FINAL_TEST_AND_QA_MATRIX.md` | FOUND · CURRENT |
| **F** Final technology / Firebase | `…v4/10_FINAL_TECH_STACK_DECISION.md`, `…v4/11_FINAL_FIREBASE_IMPLEMENTATION_ARCHITECTURE.md` (v3.0) | FOUND · READ · CURRENT |
| **F** Firebase project facts | `FIREBASE_PROJECT_FACTS.md` (root) | FOUND · READ · CURRENT (newest file in repo, 2026-08-15) |
| **G** Coursework / canonical seed | `…v4/16_FINAL_COURSEWORK_EVIDENCE_AND_REPORT_PLAN.md` | FOUND · CURRENT |
| **H** Final design system | `visual-designs/completed Stockmok Design programme/Stockmok Design System.dc.html` | FOUND · **currency unprovable** |
| **I** Final frontend / screens | Gate 5–12, 14 `.dc.html` in the same folder | FOUND · **currency unprovable** (see §3) |
| **J** Final control / decision / change / handoff | **ABSENT** | **NOT FOUND — blocking** |

Superseded material correctly identified and excluded from authority:
`StockFlow_Final_Control_Pack_v2_10of10/` (9 files, 2026-08-09) and
`StockFlow_Final_Control_Pack_v3/` (17 files, 2026-08-09/10), both superseded by
`Stockmok_Final_Control_Pack_v4/` (17 files, 2026-08-10). Also excluded:
`visual-designs/generated/24_rejected/` and `25_superseded/`.

---

## 2. BLOCKER B-01 — the recorded design state contradicts the prompt

Section 0B requires verification **from the actual files**. A whole-repository content sweep for
`GATE_13`, `GATE_14`, `DESIGN_PHASE`, `STOCKMOK_DESIGN_FREEZE`, `READY_FOR_FRONTEND_IMPLEMENTATION`
returned **exactly one file**: `Stockmok Gate 14 Owner Approval.dc.html`. That file records the
opposite of what this run was told.

| Assertion in the run instruction | Actually recorded in the project | Result |
|---|---|---|
| `GATE_13 = PASS` | *"Gate 13 reconciliation passed"* — stated narratively inside the Gate 14 package. No standalone Gate-13 reconciliation artifact exists. | **PASS (weakly recorded)** |
| `GATE_14 = APPROVED` | **`GATE_14 = AWAITING_OWNER_APPROVAL`** — verbatim, in section 14j. | **FAIL** |
| `STOCKMOK_DESIGN_FREEZE_v1.0 = APPROVED` | **Unrecorded by deliberate design.** Verbatim closing line: *"The final freeze line is deliberately unwritten. STOCKMOK_DESIGN_FREEZE_v1.0 stays unrecorded until the owner explicitly approves this gate."* | **FAIL** |
| `DESIGN_PHASE = CLOSED` | Not recorded anywhere. Gate 14 §14j: *"Approve Gate 14 — the design package is frozen at v1.0 and the programme closes… Only then is the freeze recorded — it is not written in advance, and it is not written by design."* | **FAIL** |
| `READY_FOR_FRONTEND_IMPLEMENTATION = YES` | Not recorded anywhere. The nearest recorded flags are `READY_FOR_PRODUCTION_CODING = NO` in both `docs/audit-final/50` and `docs/ui-final/34`. | **FAIL** |

Corroborating: `docs/audit-final/46_FINAL_OWNER_DESIGN_APPROVAL_CHECKLIST.md` carries the owner's
final approval as an **unticked checkbox** — `[ ] APPROVED — proceed to frontend handoff (file 47)` —
under the rule *"No coding before this checkbox is ticked."* It also records **four** outstanding
owner decisions (ACR-001…ACR-004) with no resolution recorded anywhere in the repository.

The Gate 14 document was written specifically to prevent an agent from self-certifying this freeze.
Proceeding would defeat a control the design programme deliberately installed.

---

## 3. BLOCKER B-02 — the Section 0J control pack does not exist

Section 0B names five mandatory files. Four are absent from the entire repository:

| Required file | Status |
|---|---|
| `STOCKMOK_DESIGN_HANDOFF_NEXT_CHAT.md` | **ABSENT** |
| `STOCKMOK_DESIGN_CHECKPOINT.md` | **ABSENT** |
| `STOCKMOK_DESIGN_DECISION_LEDGER.md` | **ABSENT** |
| `STOCKMOK_DESIGN_CHANGE_REGISTER.md` | **ABSENT** |
| `FIREBASE_PROJECT_FACTS.md` | PRESENT · READ |

This is not a paperwork gap. Section 0A explicitly forbids treating a filename as proof of currency
and requires the checkpoint, decision ledger and change register to resolve which version is current.
Without them, the final frontend — which Section 0D makes **mandatory** input to the database —
cannot be resolved to a single current set:

| Ambiguity | Competing artifacts | Why unresolvable |
|---|---|---|
| Gate 6 Dashboard + Inventory | `…Gate 6 Dashboard Inventory.dc.html` (2026-08-14 05:23) vs `…new.dc.html` (2026-08-14 16:16) | Both present; no register states which supersedes |
| Gate 7 Private Procurement | `…Gate 7 Private Procurement.dc.html` (16:16) vs `…new.dc.html` (21:14) | Same |
| Gate 9 Connected Workflows | **three** copies: base (16:17), `new` (21:13), `new … (1)` (21:17) — the last two byte-identical in size | Same, and one is a browser download duplicate |
| Gate 2 Territories | `…Gate 2 Territories.dc.html` vs `…Gate 2 Territories 2nd.dc.html` | Same |
| Territory selection | Territory A / B / C all present; **no record of which the owner selected at Owner Gate 1** | Owner Gate 1 outcome unrecorded |
| Gate numbering | File 46 defines the final approval as *"Claude Design Gate 8"*; the programme actually ran to **Gate 14** | The renumbering has no change-register entry |

Modification time is not authority — the design programme's own rule is that a document is current
only when the control pack says so. Building `DB_03_FINAL_UI_TO_DATA_TRACEABILITY_MATRIX.md` and
claiming `UI_DATA_COVERAGE = 100%` against an unresolvable frontend set would be a fabricated
coverage claim. Section 0E forbids exactly this: *"If any required current authority is missing or
unreadable: STOP. Do not design around missing evidence."*

---

## 4. Authority conflicts found during ingestion

These were identified before stopping and are recorded now so they can be resolved in the same
owner pass. Section 1 requires them to be raised rather than silently decided.

### DB-CR-001 — Role family: six roles or seven?

- **Conflicting sources:** run instruction §5 ROLE FREEZE vs `…v4/06_FINAL_SECURITY_AND_RBAC_MODEL.md` §5 and `…v4/03_FINAL_SCOPE_FREEZE.md` §A3.
- **Exact conflict:** §5 of the instruction lists six roles (OWNER, ADMIN, INVENTORY_MANAGER, PROCUREMENT_MANAGER, STOREKEEPER, VIEWER) and states *"Do NOT introduce Analyst… merely because an older document or design artifact contains it."* The **current** FINAL RBAC authority is not an older document: it opens with *"Seven roles"* and its capability matrix has a fully populated ANALYST column with resolved, reasoned cells (*"Analyst sees everything read-only except audit logs and team management"*). Scope Freeze v3.0 §A3 independently says *"Seven fixed built-in roles."* ANALYST is also referenced in files 02, 04 and 05 of the same pack.
- **Implementation impact:** ANALYST is a distinct authorization class — it can read stock movement history and the Purchase-Order report, which VIEWER cannot. It changes `ROLE_PERMISSIONS`, DB-05 (path/access matrix), DB-06 (command role gates), `firestore.rules`, the T-SEC-17 rules-vs-table equality test, and the member/invitation state machines. Choosing wrongly means either an undefined role class in production or a silently dropped authorization tier.
- **Recommended resolution:** Follow source precedence — the FINAL SECURITY/RBAC authority governs, so **seven roles including ANALYST**. Amend the instruction's role freeze rather than the RBAC model. If ANALYST is genuinely to be dropped for the coursework release, that is a scope change requiring an entry in the (currently non-existent) change register, plus edits to files 02, 03, 04, 05 and 06.
- **OWNER DECISION REQUIRED = YES**

### DB-CR-002 — Canonical path baseline contradicts the FINAL Firebase authority

- **Conflicting sources:** run instruction §4 CANONICAL FIRESTORE PATH BASELINE vs `…v4/11_FINAL_FIREBASE_IMPLEMENTATION_ARCHITECTURE.md` §5 (which itself states it *"supersedes 05 v2 §2"*).
- **Exact conflict:** the instruction places four families at the **root**; the FINAL authority places them **inside the tenant**, or splits them into a canonical + projection pair:

  | Instruction §4 | FINAL authority (file 11 §5) |
  |---|---|
  | `productMappings/{mappingId}` (root) | `organizations/{orgId}/productMappings/{mappingId}` (buyer-tenant) |
  | `purchaseOrders/{poId}` (+`items`, +`history`) (root) | `organizations/{orgId}/purchaseOrders/{poId}` (private + projection) **and** `connectedPurchaseOrders/{poId}` (cross-tenant canonical, backend-only) |
  | `commandReceipts/{operationId}` (root) | `organizations/{orgId}/commandReceipts/{operationId}` |
  | `connections/{connectionId}` (root, single) | `connections/{connectionId}` canonical **plus** `organizations/{orgId}/connections/{connectionId}` projection for both parties |

- **Additionally, five path families required by the FINAL authority are absent from the instruction's baseline entirely** — each marked `[NEW]` in file 11 §5 and load-bearing:
  `users/{uid}/memberships/{orgId}` · `organizations/{orgId}/counters/{counterId}` ·
  `organizations/{orgId}/productSkuIndex/{skuNorm}` · `handleReservations/{handle}` ·
  `connectedPurchaseOrders/{poId}` (+`items`, +`history`).
- **Implementation impact:** total. This is the difference between a schema that satisfies the
  path-constancy rule (file 06 §9.3 — *"the most important rule in the file"*) and one that does not.
  Root-level `purchaseOrders` and `productMappings` cannot be read by any client rule without a
  data-derived `get()`, which file 06 §9.3 prohibits absolutely. Dropping `productSkuIndex` and
  `handleReservations` removes the race-free uniqueness mechanism that file 06 §6.3 exists to
  provide; dropping `counters` removes atomic order-number allocation. DB-02, DB-03, DB-04, DB-05,
  DB-06 and DB-07 would all be built on the wrong foundation.
- **Recommended resolution:** apply Section 1 source precedence — the FINAL TECHNOLOGY/FIREBASE
  authority (rank 7) and FINAL DOMAIN/DATA CONTRACT (rank 3) both outrank a restatement in a run
  prompt. Adopt file 11 §5 verbatim as the DB-02 baseline, and record the instruction's §4 list as a
  **superseded restatement**, not as a competing path model.
- **OWNER DECISION REQUIRED = YES** — because §4 forbids relocating path families without approval,
  and this resolution relocates four and adds five.

### DB-CR-003 — Storefront zone naming (non-blocking, recorded for completeness)

Instruction §4 marks `storefrontCatalog/{handle}/items/{catalogItemId}` as Release C / NOT CURRENT.
File 11 §5 agrees (`Release C only`). No conflict. Recorded so the eventual DB-02 does not
accidentally reintroduce it. **OWNER DECISION REQUIRED = NO**

---

## 5. What is *not* blocked

To be clear about where the project actually stands — the substance is in good shape:

- The business, domain, security and Firebase authorities in `Stockmok_Final_Control_Pack_v4/` are
  coherent, current, internally consistent and genuinely implementation-grade. File 11 already
  contains a canonical path list, deterministic ID strategy, ownership/projection table, index list,
  command catalog, transaction boundaries and idempotency strategy. A large share of DB-01, DB-02,
  DB-05 and DB-06 can be *derived* from it rather than invented.
- `docs/audit-final/50` independently confirms *"no business rule, RBAC entry, stock-accounting rule,
  PO state machine, privacy boundary or data-ownership rule requires change"* and *"scope leakage…
  remains none."*
- The canonical seed reconciles: LKR 398,900 + LKR 292,800 = **LKR 691,700**; Chicken Breast
  MEAT-001 at 80.000 + 40.000 = **120.000 KG**; the ledger chain 18 → 20 → 60 → 70 → 70 → 110 → 120 KG
  resolves; 1 PACK = 5 KG gives 8 PACK = 40.000 KG and 2 PACK = 10.000 KG. All verified against
  Gate 14 §14g.
- `FIREBASE_PROJECT_FACTS.md` is current and honest about what is unprovisioned.

The blockage is entirely in the **control layer**: no recorded approval, and no register that says
which design file is current.

---

## 6. Required actions to clear this gate

1. **Owner approves or rejects Gate 14.** Tick the decision in
   `docs/audit-final/46_FINAL_OWNER_DESIGN_APPROVAL_CHECKLIST.md` (OWNER GATE 2), and record the
   outcome in a durable control file. If approved, write the freeze line that Gate 14 deliberately
   left unwritten.
2. **Resolve ACR-001 … ACR-004** (`docs/audit-final/49_FINAL_AUTHORITY_CHANGE_REQUESTS.md`).
   ACR-001 (audit-log route) materially affects DB-05 and DB-04 and must be settled before the
   database pack is written.
3. **Create the four missing control files** — checkpoint, decision ledger, change register,
   design handoff. The change register must, at minimum, name the current version of every
   `.dc.html` design artifact and record which Territory the owner selected at Owner Gate 1.
4. **Delete or quarantine the duplicate design artifacts** (`…new`, `…new (1)`, `…2nd`, and the
   unselected Territories) into a `superseded/` folder, so the current frontend set is unambiguous.
5. **Decide DB-CR-001 and DB-CR-002.**
6. Re-run this database architecture phase. Gate 0 will then pass and DB-01 → DB-10 can be produced
   against evidence rather than assertion.

---

## 7. Final response

```
DATABASE_CONTROL_PACK       = INCOMPLETE
DB_FILES                    = 0/10
FINAL_AUTHORITY_INGESTION   = FAIL
FINAL_FRONTEND_INGESTION    = FAIL
DATABASE_IMPLEMENTATION_READY = NO
UNRESOLVED_BLOCKERS         = 2
OWNER_DECISIONS_REQUIRED    = 6   (Gate 14 approval · ACR-001 · ACR-002 · ACR-003 · ACR-004 · DB-CR-001 + DB-CR-002)
PRODUCTION_CODE_CHANGED     = NO
DESIGN_ARTIFACTS_CHANGED    = NO
BUSINESS_AUTHORITIES_CHANGED = NO
NEXT_ACTION                 = RESOLVE_DATABASE_BLOCKERS
```
