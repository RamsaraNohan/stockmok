# 36 — Stockmok Final System Vision Alignment Audit

**Run type:** Independent final audit (adversarial-but-constructive). This document does not modify authorities 01–35; it records findings and dispositions.
**Product:** Stockmok — Cloud Multi-Tenant Inventory & Procurement Management System with Connected Supplier Collaboration.
**Domain:** stockmok.com **Legacy name:** StockFlow (historical only).
**Date:** 2026-08-11.

---

## 0. STOCKMOK_AUDIT_INPUT_CONFIRMATION

### 0.1 Documents

| File | Found | Read | Authority | Purpose | Audit relevance |
|---|---|---|---|---|---|
| PUSL2021 Referral C1 (coursework brief, .docx) | YES | COMPLETE | Coursework owner | Defines the grade obligation | Ground truth for scope proportionality |
| 01_FINAL_RECONCILIATION_REPORT | YES | CROSS-REFERENCED | v-history | Change log v2→v3 | Context only |
| 02_FINAL_REQUIREMENTS_SPECIFICATION | YES | COMPLETE | Product requirements | FR/NFR/BR/SEC contract | Primary |
| 03_FINAL_SCOPE_FREEZE | YES | COMPLETE | Release scope | A / B-Lite / cut ladder | Primary |
| 04_FINAL_USE_CASES_AND_ACCEPTANCE | YES | COMPLETE | Workflows | SC-01…SC-22, seed arithmetic | Primary |
| 05_FINAL_DOMAIN_AND_DATA_CONTRACT | YES | COMPLETE | Domain/data | Zones, entities, invariants | Primary |
| 06_FINAL_SECURITY_AND_RBAC_MODEL | YES | COMPLETE | Security | RBAC matrix, trust boundary | Primary |
| 07_FINAL_UI_INFORMATION_ARCHITECTURE | YES | COMPLETE | UI IA | Routes, nav, screen inventory, states | Primary |
| 08_FINAL_TEST_AND_QA_MATRIX | YES | KEY SECTIONS | Test authority | P0/P1 behavioural tests | Secondary (T-SEC list read via 06) |
| 09_FINAL_IMPLEMENTATION_READINESS_GATE | YES | KEY SECTIONS | Readiness | Go/no-go | Secondary |
| 10_FINAL_TECH_STACK_DECISION | YES | KEY SECTIONS | Impl constraint | Firebase stack | Feasibility |
| 11_FINAL_FIREBASE_IMPLEMENTATION_ARCHITECTURE | YES | KEY SECTIONS | Impl constraint | Callables, rules, indexes | Feasibility (zones/commands read via 05/06) |
| 12_FINAL_IMPLEMENTATION_PLAN | YES | CROSS-REFERENCED | Impl plan | Stage sequence | Post-design plan |
| 13_FINAL_IMPLEMENTATION_TASK_REGISTER | YES | CROSS-REFERENCED | Impl tasks | Task ledger | Post-design plan |
| 14_FINAL_AI_DEVELOPMENT_WORKFLOW | YES | CROSS-REFERENCED | Process | Agent workflow | Context |
| 15_AGENTS_MD_SPECIFICATION | YES | CROSS-REFERENCED | Process | Agent contract | Context |
| 16_FINAL_COURSEWORK_EVIDENCE_AND_REPORT_PLAN | YES | KEY SECTIONS | Evidence | Seed table §7, report plan | Coursework audit |
| 17_UI_DESIGN_EXECUTION_BRIEF | YES | KEY SECTIONS | Design brief | How to produce design | Design strategy |
| 18_FINAL_UI_MASTER_INVENTORY | YES | CROSS-REFERENCED | UI ledger | Frozen IDs | Referenced by 19 |
| 19_FINAL_PAGE_AND_SCREEN_REGISTRY | YES | COMPLETE | UI interpretation | 52 screens, 23 forms, 27 tables | Primary UI audit |
| 20_FINAL_NAVIGATION_LINK_AND_ROUTE_MAP | YES | CROSS-REFERENCED | UI interpretation | Route map | Covered by 07/19 |
| 21_FINAL_DESIGN_SYSTEM_AND_COMPONENT_INVENTORY | YES | COMPLETE (tokens) | UI interpretation | Token table, components | Design-system audit |
| 22_FINAL_SCREEN_CONTENT_AND_INTERACTION_SPEC | YES | CROSS-REFERENCED | UI interpretation | ACTION registry | Covered by 19 |
| 23_FINAL_UI_STATE_AND_PERMISSION_MATRIX | YES | CROSS-REFERENCED | UI interpretation | State/permission | Covered by state boards |
| 24_FINAL_DATA_VISUALIZATION_CATALOG | YES | CROSS-REFERENCED | UI interpretation | CHART-001..003 | Dashboard audit |
| 25_FINAL_BRAND_LOGO_AND_VISUAL_ASSET_PLAN | YES | KEY SECTIONS | UI interpretation | Mark, palette, monogram | Brand audit |
| 26_FINAL_VISUAL_GENERATION_PROMPT_LIBRARY | YES | CROSS-REFERENCED | UI interpretation | Prompt bodies | Context |
| 27_FINAL_MULTI_SCREEN_BOARD_PROMPTS | YES | CROSS-REFERENCED | UI interpretation | Board prompts | Context |
| 28_FINAL_UI_MICROCOPY_LIBRARY | YES | CROSS-REFERENCED | UI interpretation | Copy | Covered by 07 §22 |
| 29_FINAL_UI_QA_AND_COMPLETENESS_MATRIX | YES | CROSS-REFERENCED | UI interpretation | QA matrix | Audited, not trusted |
| 30_FINAL_UI_DESIGN_EXECUTION_SEQUENCE | YES | CROSS-REFERENCED | UI interpretation | Sequence | Context |
| 31_FINAL_VISUAL_ASSET_REGISTER | YES | COMPLETE | UI interpretation | 105 VISUAL-IDs → files | Primary visual audit |
| 32_FINAL_PROMPT_TO_VISUAL_TRACEABILITY | YES | CROSS-REFERENCED | UI interpretation | Traceability | Context |
| 33_FINAL_VISUAL_QA_REPORT | YES | COMPLETE | UI interpretation | Existing QA verdict | Audited, not trusted |
| 34_FINAL_UI_APPROVAL_AND_COMPLETENESS_GATE | YES | KEY SECTIONS | UI interpretation | Approval gate | Audited, not trusted |
| 35_STOCKMOK_RENAME_AND_VISUAL_MIGRATION_REPORT | YES | COMPLETE | UI interpretation | Rename evidence | Brand/migration audit |
| STOCKMOK_UI_DESIGN_PACK_INDEX | YES | COMPLETE | Package index | Counts, deliverables | Context |

**Mandatory-authority check:** no mandatory authority is missing. The audit proceeds.
**Honesty note:** implementation-tier files 10–15 were reviewed at section level because this run is a UI/design and vision audit, not an implementation audit; their business-relevant content (zones, commands, indexes, gates, seed) is fully covered through 03/05/06/16, which were read completely.

### 0.2 Visual families inspected

| Family | Expected | Found | Inspected | Method / notes |
|---|---|---|---|---|
| Primary desktop screens | 41 (SCREEN-001..040 canonical incl. shell) + 12 derived = 52 | 52 | 52 | Two triage montages (26+26) at reduced scale; **6 signature screens opened at native 1280×900** (004, 010, 024, 036, 038, plus mobile 009) |
| Mobile | 11 | 11 | 11 | Montage + native 390-px inspection of MOBILE-009 receiving |
| State boards | 11 | 11 | 11 | Full montage; content read |
| Component boards | 10 | 10 | 10 | Full montage; token/contrast content read |
| Brand boards | 5 current (+1 retired absent) | 5 | 5 | Full montage; mark/monogram/lockups read |
| Showcase boards | 8 | 8 | (composite) | Composites of screens already inspected |
| Review boards | 8 | 8 | (composite) | Triage only, per audit rule |

**PRIMARY_DESKTOP_VISUALS_INSPECTED:** 52/52 (6 at native resolution; 46 via reduced-scale montage — see limitation below)
**MOBILE_VISUALS_INSPECTED:** 11/11
**STATE_BOARDS_INSPECTED:** 11/11
**COMPONENT_BOARDS_INSPECTED:** 10/10
**BRAND_BOARDS_INSPECTED:** 5/5
**SHOWCASE_BOARDS_INSPECTED:** 8/8 (as composites)
**REVIEW_BOARDS_INSPECTED:** 8/8 (triage only)

**Stated inspection limitation (transparency):** the audit brief's ideal is every primary at native full resolution. In this run, all 52 primaries were seen legibly in montage and the 6 highest-risk/most-representative were opened at native resolution. The systemic defects found (below) are *type-level*, not per-pixel, and were confirmed identical across every deterministic render sampled; the montage evidence is sufficient to assign a defensible verdict to each. Where a per-screen verdict in file 38 depends on detail not resolvable at montage scale, it is marked `VERIFY_AT_NATIVE`.

---

## 1. Headline judgement

Stockmok is an **unusually well-architected coursework project**. The requirements, domain contract, security model and information architecture (files 02–07) are internally consistent, security-literate, and demonstrably ahead of what the PUSL2021 brief demands. The seed arithmetic reconciles end-to-end (18→20→60→70→70→110→120 KG; LKR 564,200 → 691,700). This is genuine strength and the audit does not manufacture problems where none exist.

The **weakness is entirely in the visual layer**. The current 105-asset "visual design package" is, in practice, a set of **spec-visualisation renders**, not a product design. A large subset — the 69 "deterministic UI renders", including the two signature workflows — prints engineering identifiers (`FORM-020`, `SCREEN-024`), raw routes (`/app/grand-ocean/network/mappings/new`), and specification sentences ("save blocked for seven named error states", "nonnegative money/quantity") directly onto the interface as if they were product copy. The existing QA marked all 105 `PASS` because it validated **presence, dimensions, hashes, path hygiene and family consistency** — not product usability or copy fitness. That QA is honest about its method; it simply did not test the thing that matters most for a design deliverable.

**Therefore the current visual package verdict is REDESIGN, not APPROVE and not merely REFINE.** The correct action is to preserve the excellent IA/data/security substrate and the genuinely strong assets (design-system tokens, brand system, auth screens, populated dashboard, mobile receiving) as *reference*, and re-express the product through a proper design pass gated for owner approval before any coding. No architecture change is required to do this.

**Scores** (full detail in file 39/40; summary in `STOCKMOK_FINAL_AUDIT_SUMMARY`):

- System vision alignment: **PASS** (concept model is coherent and coursework-true)
- Coursework alignment: **PASS** (CRUD + DB + working features + reflection all supported)
- Current visual package: **REDESIGN**

---

## 2. STOCKMOK_SYSTEM_NORTH_STAR

| Dimension | Reconstructed intent |
|---|---|
| **Product purpose** | Let a small/mid business run inventory and procurement correctly in one secure multi-tenant workspace, and optionally transact with another Stockmok business through validated product mappings and connected purchase orders. |
| **Target users** | Owner/Admin of an SMB (hospitality is the worked example — Grand Ocean Hotel); operational staff split by role: Inventory Manager, Procurement Manager, Storekeeper, Analyst, Viewer. Also the coursework marker and portfolio reviewers. |
| **Primary problem** | Stock records drift from reality; procurement is untracked; multi-user access is unsafe; cross-business ordering is manual and error-prone. |
| **Primary value proposition** | "Inventory and procurement, in one clear workflow" — correct-by-construction stock (integer ledger, atomic commands, idempotency), role-safe access, and a trustworthy connected-supplier lane. |
| **Core management system** | Release A: a complete, standalone Inventory & Procurement Management System with full CRUD, a stock ledger, private procurement, dashboard, reports, notifications and RBAC. |
| **Inventory responsibilities** | Products, categories, warehouses; opening balance, adjustment; per-warehouse StockBalance; per-product StockSummary + derived value; immutable StockMovement ledger; low/out-of-stock derivation. |
| **Procurement responsibilities** | Private suppliers/buyers (directory); private PO DRAFT→ORDERED→PARTIALLY_RECEIVED→RECEIVED with frozen line snapshots; full/partial receiving with over-receipt rejection. |
| **Connected business value** | B-Lite: discover by exact handle → connection request/accept → supplier publishes Partner Catalog → buyer maps (SKU validate + semantic confirm + unit conversion) → connected PO DRAFT→SUBMITTED→ACCEPTED→SHIPPED→RECEIVED, with each side's stock moved by its own backend command. |
| **Private supplier value** | A first-class way to work with the majority of real suppliers who will never be Stockmok users — never presented as degraded. |
| **Multi-tenant value** | One Firestore database, four zones; cross-tenant canonical records closed to clients; per-org projections. Proven tenant isolation is a headline coursework asset. |
| **Security / trust model** | Firebase Auth + deny-by-default Security Rules + trusted backend commands that re-authorise from the DB on every call. "The server is not protected by the rules; the rules protect the client path." |
| **Public website purpose** | One honest marketing page describing only what is built; entry to sign-up/login and branded login. |
| **Coursework purpose** | Satisfy PUSL2021: an individual, database-backed Management System demonstrating Create/Read/Update/Delete, working major features, quality, performance, adaptability, plus a reflective report and public GitHub repo. |
| **Portfolio purpose** | Demonstrate senior-level thinking: multi-tenant security, atomic ledger, cross-org workflow — attractive to internships and SMB clients. |
| **What makes Stockmok different** | It is not a generic admin CRUD demo. The connected-business mapping + dual-ledger PO is a distinctive, defensible, viva-friendly signature. |
| **What Stockmok is NOT** | Not an ERP, POS, sales/outbound platform, accounting package, marketplace, or AI/forecasting product. No sales orders, no checkout, no reservations, no batch/lot/expiry, no barcodes. |
| **Expected Release A** | Grade-protecting core; must be independently gradeable as a complete management system. |
| **Expected Release B-Lite** | The single strong differentiating workflow (connected procurement), built only after GATE-A. |
| **Excluded future scope** | Release C storefront (default not built) and all of Release D (sales, POS, per-tenant DB, webhooks, auto-reorder, AI, billing, mobile app, custom roles, owner transfer, batch/serial, multi-currency PO, multi-shipment, weighted-average costing, file uploads, App Check, email delivery). |

---

## 3. Concept-by-concept vision alignment

Legend — Alignment: STRONG / ACCEPTABLE / WEAK / MISALIGNED. Action: KEEP / REFINE / REDESIGN / REMOVE / OWNER. "UI coverage" refers to the *current visual*, which is where nearly all weakness lives.

| # | Concept | Why it exists | Business value | UI coverage (current visual) | Data/Sec/Workflow/Test | Alignment | Action |
|---|---|---|---|---|---|---|---|
| 1 | Public website | Explain & convert; honest scope | Trust, entry | STRONG (SCREEN-001 clean, on-scope) | n/a | STRONG | REFINE (remove route pill; add real dashboard hero image; keep) |
| 2 | Authentication | Credentials via Firebase | Security | STRONG (003/041 polished, non-enumerating copy present) | Full | STRONG | REFINE |
| 3 | Branded login `/b/:handle` | Security claim made visible (role-preference ≠ access) | Signature security demo | STRONG (004 polished; 8 states on STATE-001) | Full | STRONG | KEEP/REFINE |
| 4 | Workspace creation (onboarding) | Atomic org create + handle | Multi-tenant entry | ACCEPTABLE (007 legible; handle normalisation shown) | Full | STRONG concept | REFINE |
| 5 | Organization identity | Monogram + name + handle | Wrong-workspace prevention | STRONG (monogram system AA-safe) | Full | STRONG | KEEP |
| 6 | Team membership | ACTIVE/SUSPENDED/REMOVED | Access lifecycle | ACCEPTABLE (027 legible) | Full | STRONG | REFINE |
| 7 | Roles (7 fixed) | Segregation of duties | RBAC clarity | ACCEPTABLE (role badges good; dashboards role-variant) | Full, no ambiguous cells | STRONG | REFINE |
| 8 | Products | Master data + unique SKU | Core CRUD | WEAK (012/013 desktop render spec text; mobile 006 better) | Full | ACCEPTABLE concept / WEAK visual | REDESIGN |
| 9 | Categories | Group products | Core CRUD | WEAK (014 spec-scaffold form) | Full | WEAK visual | REDESIGN |
| 10 | Warehouses | Locations; guarded archive | Core CRUD | WEAK (015 spec-scaffold) | Full | WEAK visual | REDESIGN |
| 11 | StockBalance | Per-warehouse truth | Correctness | ACCEPTABLE (surfaced in tables) | Full | STRONG concept | REFINE |
| 12 | ProductStockSummary | Query-friendly totals + value | KPI/perf | STRONG (dashboard reconciles) | Full | STRONG | KEEP |
| 13 | StockMovement | Immutable ledger | Auditability | ACCEPTABLE (017 table legible) | Full | STRONG | REFINE |
| 14 | Opening balance | Ledger not overwrite | Correctness | WEAK (042 spec-scaffold) | Full | WEAK visual | REDESIGN |
| 15 | Stock adjustment | Reason + preview | Correctness/segregation | WEAK desktop (016 scaffold) / STRONG mobile (007) | Full | Mixed | REDESIGN desktop |
| 16 | Private suppliers | External supplier CRUD | Procurement | WEAK (018 scaffold table) | Full | WEAK visual | REDESIGN |
| 17 | Private buyers | Directory only (no sales) | Scope discipline | ACCEPTABLE (019 correctly no-sales) | Full | STRONG scope | REFINE |
| 18 | Private purchase orders | DRAFT→RECEIVED, snapshots | Procurement core | WEAK builder (022) / ACCEPTABLE detail (023) | Full | ACCEPTABLE | REDESIGN builder |
| 19 | Receiving | Full/partial, over-receipt block | Signature op | WEAK desktop (024) / STRONG mobile (009) | Full | Mixed | REDESIGN desktop to match mobile |
| 20 | Connected businesses | Directional connection | B-Lite differentiator | WEAK (031/033 scaffold) | Full | ACCEPTABLE concept | REDESIGN |
| 21 | Partner catalog | Allow-listed supplier projection | Privacy demo | WEAK (034/035 scaffold) | Full | STRONG concept | REDESIGN |
| 22 | Product mapping | SKU validate + semantic + conversion | **Signature #1** | **MISALIGNED (036 = 5 empty spec-labelled inputs; no cards, no preview, no checkbox)** | Full | Concept STRONG / visual FAIL | **REDESIGN (P0 blocker)** |
| 23 | Connected purchase orders | Dual-ledger shared order | **Signature #2** | ACCEPTABLE (038 dual-rep good; 039 supplier ok) | Full | STRONG | REFINE |
| 24 | Notifications | In-app, unread count | A-must engagement | ACCEPTABLE (026/052 legible) | Full | STRONG | REFINE |
| 25 | Reports | Stock-on-hand, PO | Read/analytics | WEAK shell (025 scaffold) / ACCEPTABLE tabs (048/049) | Full | ACCEPTABLE | REDESIGN shell |
| 26 | Settings | Profile, defaults, feature flags | Adaptability | ACCEPTABLE (028 legible) | Full | STRONG | REFINE |
| 27 | Audit/history | Immutable, owner/admin | Trust | n/a dedicated screen (in Activity/movements) | Full | STRONG | KEEP |
| 28 | Tenant isolation | 4 zones, closed zone-4 | Security headline | Conceptual (not a screen; evidenced in security tests) | Full | STRONG | KEEP |

**Scope-health finding:** the concept set contains **no scope leakage**. There is no Sales, Production, POS, Accounting, Marketplace, People, Vessels/Voyages, or AI surface anywhere in the navigation or screens. `Sales & Storefronts` was explicitly removed; NETWORK is feature-flagged. This is exemplary scope discipline and should be preserved verbatim into the redesign.

---

## 4. Major strategic findings

1. **The substrate is a strength; treat it as fixed.** Files 02–07 and the design-system tokens (21) are the project's real asset. The redesign must inherit them unchanged. Do not re-open RBAC, stock accounting, PO state machines, zone model, or the token palette.
2. **The visual package must be rebuilt, not polished.** A REFINE-only pass cannot fix screens whose *content* is spec text (mapping, receiving-desktop, product form, category, warehouse, partner catalog, discovery). See file 38.
3. **The signature workflows are under-delivered.** Product Mapping (the highest-value, most viva-worthy screen) currently has no stepper, no side-by-side item cards, no semantic checkbox, no conversion preview. This is the single most important thing the redesign must get right (file 42, DESIGN-ISSUE-001).
4. **Engineering copy leaks pervasively into the UI.** Routes, `FORM-###`, `SCREEN-### · authoritative Stockmok visual contract`, and spec sentences appear on-screen across ~69 renders. This must be stripped and replaced with real microcopy (file 40 §user-copy).
5. **Coursework proportionality is the strategic risk, not scope leakage.** The brief asks for a database-backed CRUD system with a reflective report; Stockmok is a multi-tenant SaaS with cross-org transactions. This is *defensible and impressive* but the schedule (13 build days) is aggressive. The scope-freeze cut-ladder already mitigates this well; the design phase must not add cost. See file 41 §complexity and file 48.
6. **Brand mark risk.** The Stackline-S reads as an "F"/"E" to a first-time viewer (documented as "unmistakable abstract S" in 25 — a claim the audit disputes). Low letterform recognition is a minor but real portfolio/brand issue; owner decision on whether to refine the glyph (file 40 §brand; file 49 ACR-002).

---

## 5. Vision alignment gate

| Gate | Verdict |
|---|---|
| SYSTEM_VISION_ALIGNMENT | **PASS** |
| SCOPE_HEALTH (no leakage) | **PASS** |
| COURSEWORK_TRUTH (Management System + CRUD + DB) | **PASS** |
| RELEASE_A_STANDALONE_COMPLETENESS (concept) | **PASS** |
| B_LITE_VALUE | **PASS** |
| CURRENT_VISUAL_EXPRESSION_OF_VISION | **FAIL → REDESIGN** |

The vision is sound. The visuals do not yet express it. Proceed to files 37–45.
