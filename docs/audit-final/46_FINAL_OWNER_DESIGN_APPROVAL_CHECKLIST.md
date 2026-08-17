# 46 — Owner Design Approval Checklist

Two mandatory human gates. Frontend coding may not begin until OWNER GATE 2 passes.

---

## Pre-gate owner decisions (resolve before/at Gate 2)
- [ ] **Brand glyph (ACR-002):** keep the Stackline-S as-is / refine so the "S" reads at a glance / go mark-light (lead with wordmark + monograms). *(Recommendation: refine or mark-light; do not block the deadline.)*
- [ ] **Audit-log screen (ACR-001):** add a first-class Owner/Admin Audit Log route now / keep audit inside per-object Activity. *(Recommendation: keep in Activity for the coursework release; adds a route otherwise.)*

---

## OWNER GATE 1 — Visual-territory selection (after Claude Design Gate 2)

You are choosing ONE of three directions. For each territory, confirm:

**Comparability**
- [ ] All three designed the **same nine** representative screens.
- [ ] They differ meaningfully in density, navigation, card/table language, type hierarchy, brand expression, and data presentation — not just colour.

**Per-territory quality (score each 1–5)**
- [ ] Reads as a real product (no engineering copy, no routes on screen).
- [ ] Product Mapping wizard is clear (stepper, side-by-side cards, semantic checkbox, `10 PACK = 50 KG` preview, disabled-with-reason).
- [ ] Desktop Receiving is as clear as mobile (full arithmetic before confirm).
- [ ] Dashboard KPIs deep-link and reconcile to the seed (LKR 564,200; 12/4/1).
- [ ] Private vs Connected is instantly distinguishable.
- [ ] Org identity (monogram + full name + role) is prominent; platform mark quiet.
- [ ] Accessibility visible: labels, focus, icon+text status, 44px, chart text alternatives.
- [ ] Mobile receiving is one-handed with sticky confirm.
- [ ] Feels calm/operational; no gradients/motion/BI vanity.
- [ ] Buildable in the frozen stack within the schedule (no novelty risk).

**Scope safety**
- [ ] No Sales/POS/Accounting/Marketplace/AI/Storefront anywhere.
- [ ] Nothing implies an unbuilt capability.

**Decision**
- [ ] Selected territory: __________  → instruct Claude Design to proceed to Gate 3.
- [ ] Written note of any required adjustments to carry into the chosen direction.

---

## OWNER GATE 2 — Final design approval (after Claude Design Gate 8)

**Coverage**
- [ ] Every Release A P0 screen and every Release B-Lite P1 screen is designed (per file 07 §5 / 19).
- [ ] Every P0/P1 screen has loading / empty / error / success / permission-denied / submitting / confirmation as applicable.
- [ ] State galleries designed (login 8, mapping 7 error states, receiving, connection, connected-PO, invitation, permission, loading/empty/error).
- [ ] Mobile variants for all mobile-priority flows; drawer nav.

**Correctness & honesty**
- [ ] No route, `FORM-###`, `SCREEN-###`, or spec sentence appears in any UI.
- [ ] All numbers match the mock data and reconcile end-to-end (18→20→60→70→70→110→120 KG; 564,200→691,700).
- [ ] Charts optional, each with a text alternative; dashboard complete without charts.
- [ ] No cross-tenant private data shown; buyer catalog is a labelled projection.
- [ ] Private buyers show no sales workflow.

**Signatures**
- [ ] Product Mapping wizard: all 5 steps + 7 error states designed and self-explanatory.
- [ ] Receiving (desktop + connected + mobile): full arithmetic, over-receipt blocked, one confirm.

**Quality & feasibility**
- [ ] Consistent tokens/components/spacing across all screens.
- [ ] Accessibility verified in the designs (labels/focus/contrast/status/44px).
- [ ] Design is buildable within the schedule using existing components (no motion/illustration/BI debt).
- [ ] Claude Design's Gate-8 QA report reviewed; residual issues acceptable or fixed.

**Decision**
- [ ] APPROVED — proceed to frontend handoff (file 47) and post-design plan (file 48).
- [ ] CHANGES REQUESTED — list: __________ (return to the relevant gate).

**Rule:** approval here freezes the design. After this, only defect fixes and the responsive/accessibility pass. No coding before this checkbox is ticked.

---

# AMENDMENT — two additional owner decisions

Owner decisions are now **four**, not two. ACR-003 and ACR-004 do **not** block entry to Claude Design,
but ACR-003 must be settled before any visual asset is regenerated, or the defect reproduces.

| ACR | Decision | Blocks Gate 2? | Blocks Gate 5? | Blocks regeneration? |
|---|---|---|---|---|
| ACR-001 audit-log route | add now / keep in Activity (default) | No | **Yes** | No |
| ACR-002 brand glyph | keep / refine so the S reads / go mark-light | **Yes** | No | No |
| ACR-003 amend file 26 (remove the burn-in instruction) | approve / decline | No | No | **Yes** |
| ACR-004 authorise or retire `DETERMINISTIC_UI_RENDER`; correct the file 32/33 QA record | approve / decline | No | No | **Yes** |

Two additions to the Gate 8 acceptance checklist, from evidence found in this pass:

- [ ] **Data fidelity** — 12 products with correct SKUs, categories and warehouses; every total reconciles;
      every filtered view shows its filter chip; no two screens disagree about the same object's status
      without an explicit as-at label.
- [ ] **Timestamps** — a single defined date/time format applied everywhere; no `—`, no "Seed snapshot",
      no event label sitting in a Time column.

---

# AMENDMENT - OWNER GATE 2 CLOSED (recorded 2026-08-15)

OWNER GATE 1, visual-territory selection: **PASSED.** Selected territory: **Territory C (Connected Operations)**, with operational density inherited from Territory A and auth/onboarding/empty-state warmth inherited from Territory B. Evidence: STOCKMOK_DESIGN_DECISION_LEDGER.md DEC-006.

OWNER GATE 2, final design approval: **APPROVED.** The owner reviewed the Gate 14 approval package (Stockmok Gate 14 Owner Approval.dc.html, ten boards 14a-14j) and approved it without requested changes. The coverage, correctness/honesty, signature-flow, quality and feasibility criteria above were discharged by the Gate 13 final reconciliation: registry coverage, derived-state coverage, responsive coverage, data fidelity, privacy and accessibility all PASS; COMPONENT_COUNT = 25/25; RAW_ROUTES = 0; ENGINEERING_COPY = 0; MULTI_SHIPMENT = 0; UNSUPPORTED_FEATURES = 0. The two amendment items above (data fidelity, single timestamp format) were part of that reconciliation.

- [x] **APPROVED** - proceed to frontend handoff (file 47) and post-design plan (file 48).

Pre-gate owner decisions:

- [x] **ACR-002 brand glyph** - RESOLVED: glyph refined so the S reads (crossed Stackline S1; master geometry per DEC-005). Identity, #1D4ED8, wordmark and monogram system unchanged (DEC-002, DEC-003, DEC-005).
- [x] **ACR-001 audit-log screen** - RESOLVED as the documented default: audit stays inside per-object Activity / Movement History and no audit route exists in the frozen package (DEC-023 registry coverage; ARCHITECTURE_CHANGE_REQUIRED avoided). The Movement-History timestamp defect was closed by the single frozen date/time format.
- [x] **ACR-004 DETERMINISTIC_UI_RENDER** - RESOLVED by DEC-004: design authority for visual expression is Claude Design; deterministic-renderer output is reference/QA evidence only, never approved production art.
- [ ] **ACR-003 amend file 26 to remove the brand burn-in instruction** - **STILL OPEN.** It does not affect the frozen design or implementation; it blocks only future regeneration of renderer visual assets.

GATE_13 = PASS | GATE_14 = APPROVED | STOCKMOK_DESIGN_FREEZE_v1.0 = APPROVED | DESIGN_PHASE = CLOSED
