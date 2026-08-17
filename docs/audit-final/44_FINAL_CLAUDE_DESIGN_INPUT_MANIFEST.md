# 44 — Claude Design Input Manifest

Exact files/visuals Claude Design must receive, with authority and conflict rules. Precedence follows the audit authority order: coursework → 03 → 02 → 05 → 06 → 04 → 07 → 08 → 10/11 → 18–35 → generated images.

**Global conflict rule:** if any two inputs disagree, the **higher-precedence authority wins**; generated images never override a written business rule; the audit files (36–43, 49) override the current UI-interpretation files (18–35) where they conflict, because 18–35 are being corrected.

---

## 1. Required documents

| File | Req/Opt | Why | Authority | Conflict rule |
|---|---|---|---|---|
| 03_FINAL_SCOPE_FREEZE | REQUIRED | What is/‑isn't built; cut ladder; design freeze at Day 2 | Release scope (owns) | Wins on scope over everything |
| 02_FINAL_REQUIREMENTS_SPECIFICATION | REQUIRED | FR/NFR/BR/SEC the UI must satisfy | Product requirements | Wins on requirements over UI files |
| 05_FINAL_DOMAIN_AND_DATA_CONTRACT | REQUIRED | What data exists to show; units/money; states | Domain/data | UI must not need data not here |
| 06_FINAL_SECURITY_AND_RBAC_MODEL | REQUIRED | Role visibility, privacy boundary, hidden≠security | Security | Wins on permissions/privacy |
| 04_FINAL_USE_CASES_AND_ACCEPTANCE | REQUIRED | Journeys + seed arithmetic to render (18→…→120 KG; LKR 564,200→691,700) | Workflows | Wins on flow/numbers |
| 07_FINAL_UI_INFORMATION_ARCHITECTURE | REQUIRED | Routes, nav, 41 screen inventory, states, mobile priorities | UI IA (owns unless usability defect) | Wins on IA unless audit flags a defect |
| 19_FINAL_PAGE_AND_SCREEN_REGISTRY | REQUIRED | 52 surfaces, 23 forms, 27 tables, per-screen content | UI interpretation (audited) | Yields to 02/04/05/06/07 and to audit files |
| 21_FINAL_DESIGN_SYSTEM_AND_COMPONENT_INVENTORY | REQUIRED | Tokens + components to reuse unchanged | UI interpretation (strong) | Tokens authoritative; strip only annotations |
| 25_FINAL_BRAND_LOGO_AND_VISUAL_ASSET_PLAN | REQUIRED | Mark, palette, monogram rules | UI interpretation | Glyph readability = OWNER (ACR-002) |
| 08_FINAL_TEST_AND_QA_MATRIX | OPTIONAL | Behaviours each state must support | Test | Design states must satisfy P0/P1 tests |
| 10_FINAL_TECH_STACK_DECISION | OPTIONAL | Stack limits (no Storage, callables) | Impl constraint | Design must be buildable on it |
| 11_FINAL_FIREBASE_IMPLEMENTATION_ARCHITECTURE | OPTIONAL | Zones, callables, indexes | Impl constraint | No UI needing unbounded query/direct cross-tenant read |
| 16_FINAL_COURSEWORK_EVIDENCE_AND_REPORT_PLAN | OPTIONAL | Canonical seed §7 for realistic mock data | Evidence | Use these exact numbers |
| 28_FINAL_UI_MICROCOPY_LIBRARY | OPTIONAL | Existing approved copy to reuse | UI interpretation | Prefer over inventing copy |
| 23/24 (state matrix / data-viz) | OPTIONAL | State checklist + 3-chart ceiling | UI interpretation | 3 charts max; each with text alt |

### Audit files (this run) — REQUIRED as corrective overlay
| File | Why |
|---|---|
| 36 (vision alignment) | North Star + what to preserve |
| 37 (concept/service) | Journey gaps + private/connected |
| 38 (visual audit) | Per-screen/per-visual verdicts |
| 39 (IA/workflow) | IA is PASS; what to refine |
| 40 (design system/brand/a11y) | Keep tokens; remove engineering copy; a11y |
| 41 (data/security/feasibility) | Buildability guardrails |
| 42 (defect register) | The prioritized to-fix list |
| 43 (design direction) | Philosophy + 9 representative screens |
| 49 (authority change requests) | The 2 owner decisions |

**Rule:** where 38/42 mark a screen REDESIGN, Claude Design must **not** inherit the current weak visual — it designs fresh, using 21's components and 07/19's content contract.

---

## 2. Required visuals (as reference, not templates to trace)

| Visual set | Use | Instruction |
|---|---|---|
| VISUAL-SCREEN-004, 010, 038 | Reference-quality patterns | Emulate the *quality bar*, redesign the *content* |
| VISUAL-MOBILE-009, VISUAL-SCREEN-043 | Interaction gold standard | Match this standard on desktop |
| VISUAL-COMP-001..010 | Design-system reference | Reuse components; strip captions |
| VISUAL-BRAND-002..005 | Brand reference | Use; glyph pending OWNER |
| VISUAL-STATE-001..011 | State **checklist** | Design the enumerated states properly |
| VISUAL-SCREEN-036 | **Negative example** | Do NOT reproduce; shows what to avoid |
| Deterministic form renders (012,014,015,016,022,024,025,031–037,051) | Content contract only | Read for *what data/actions belong*; discard the visual |
| Showcase/Review boards | Triage only | Regenerate after redesign |

---

## 3. Mock-data pack (use verbatim for realism)

- Org: **Grand Ocean Hotel** `@grand-ocean`, Hospitality, Sri Lanka, LKR, Asia/Colombo. Supplier org: **Fresh Foods Ltd** `@freshfoods`.
- Warehouses: Main Store, Cold Room.
- Signature product: **Chicken Breast · MEAT-001 · KG**, min 20, reorder 50, cost LKR 1,250.00.
- Partner item: **Fresh Chicken Breast 5 KG Pack · CKN-B5 · PACK**, 1 PACK = 5 KG.
- Dashboard seed: **12 active SKUs · 4 low · 1 out · 0 open POs · 0 awaiting · Inventory Value LKR 564,200.00**; after full demo **LKR 691,700.00**, Chicken Breast **120 KG**.
- Receiving chain to render: 18→20→60→70→70→110→120 KG.
- Roles for context: Nimal Perera (Inventory Manager who requested Owner — for branded-login mismatch state).

---

## 4. What Claude Design must NOT receive / must ignore
- Any Release C/D content, Storefront screens, or sales/POS/marketplace references.
- The `APPROVED`/`PASS` verdicts in 29/33/34 as design approval (audited: reclassified REDESIGN in file 38 §3).
- Implementation code, Firebase config, secrets.

---

# AMENDMENT — inputs added by the completion pass

Attach these alongside the original manifest. Where they conflict with files 18–35, **these win**.

| File | Why it is now required |
|---|---|
| **51_FULL_DOCUMENT_READ_COMPLETION.md** | The nine frozen platform constraints; the eighth mapping error state; the corrected audit-log cost basis; the two suspected defects that authority cleared |
| **52_INDIVIDUAL_VISUAL_VERIFICATION.md** | Per-asset verdicts from native-resolution inspection; the confirmed quality bar; the independent brand-letterform read |
| **53_AUDIT_RECONCILIATION.md** | Amended scores and register deltas with justification |
| **54_CLAUDE_DESIGN_COVERAGE_MATRIX.md** | Proof that every BLOCKER, HIGH and owner decision is carried into file 45 |
| **17_UI_DESIGN_EXECUTION_BRIEF.md §5.2** | The exhaustive 25-component list — Claude Design must not exceed it |
| **16_FINAL_COURSEWORK_EVIDENCE_AND_REPORT_PLAN.md §7.2** | The canonical 12-product seed table (SKUs, categories, costs, quantities, warehouses) |
| **28_FINAL_UI_MICROCOPY_LIBRARY.md** | COPY-001…540, including the privacy strings COPY-415 / COPY-416 that the current renders omit |

**File 45 has been patched** (23 omissions closed) and supersedes the version originally manifested.
