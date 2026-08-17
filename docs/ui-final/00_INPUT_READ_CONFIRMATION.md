# Stockmok Input Read Confirmation

**Gate:** `INPUT_READ_CONFIRMATION = PASS`  
**Completed:** 2026-08-10  
**Canonical working control pack:** `Stockmok_Final_Control_Pack_v4`  
**Immutable hash authority:** original `StockFlow_Final_Control_Pack_v3` documents 01-17 plus the three v2/v3 auxiliary sources listed below. The v4 pack is a mechanical name/domain derivative and does not replace the recorded source hashes.  
**Historical-use exception:** v2 supplies only the original coursework brief and earlier visual reference.  
**Source mutation:** prohibited.

## Read method and limitations

All 17 Markdown authorities were read completely as UTF-8 text. The coursework DOCX was structurally extracted from OOXML, including its full visible text, tables, footnotes/endnotes, relationships, and embedded-media inventory. Page rendering was attempted with the bundled document renderer but LibreOffice is unavailable in this environment (`FileNotFoundError` for the converter), so layout rendering could not be completed. The two supplied PNGs were inspected at original resolution.

## Required documents

### FILE: 01_FINAL_RECONCILIATION_REPORT.md
- **FOUND:** YES
- **READ_COMPLETELY:** YES
- **PURPOSE:** Records the v3 adversarial reconciliation, conflict resolutions, issue history, and readiness conclusion.
- **AUTHORITY:** Audit and decision-history authority; it explains why frozen decisions exist.
- **UI_RELEVANT_INFORMATION:** v3 supersedes v2; all conceptual blockers are resolved; target is Release A plus B-Lite; UI design is the remaining pre-implementation gate.

### FILE: 02_FINAL_REQUIREMENTS_SPECIFICATION.md
- **FOUND:** YES
- **READ_COMPLETELY:** YES
- **PURPOSE:** Defines functional, non-functional, business, security, and coursework requirements.
- **AUTHORITY:** Frozen requirement-existence and priority authority.
- **UI_RELEVANT_INFORMATION:** Supplies all `FR-*`, `NFR-*`, `BR-*`, `SEC-*`, and `ADM-*` traceability; public/auth, organization, team, inventory, stock, procurement, connected-business, dashboard, reports, notifications, and audit obligations.

### FILE: 03_FINAL_SCOPE_FREEZE.md
- **FOUND:** YES
- **READ_COMPLETELY:** YES
- **PURPOSE:** Freezes release content, cut ladder, and change protocol.
- **AUTHORITY:** Highest authority for in-scope versus excluded functionality.
- **UI_RELEVANT_INFORMATION:** Design Release A and B-Lite only. B-PLUS, Release C storefront, and every Release D concept are excluded.

### FILE: 04_FINAL_USE_CASES_AND_ACCEPTANCE.md
- **FOUND:** YES
- **READ_COMPLETELY:** YES
- **PURPOSE:** Defines actors, use cases, acceptance scenarios, and the canonical demonstration flow.
- **AUTHORITY:** Workflow and acceptance authority.
- **UI_RELEVANT_INFORMATION:** Supplies `UC-01..25`, `SC-01..22`, retry/failure behavior, and canonical quantity/value arithmetic ending at 120 KG and LKR 691,700.00.

### FILE: 05_FINAL_DOMAIN_AND_DATA_CONTRACT.md
- **FOUND:** YES
- **READ_COMPLETELY:** YES
- **PURPOSE:** Defines entities, ownership zones, numeric representation, invariants, and lifecycle transitions.
- **AUTHORITY:** Entity, data, state-machine, and invariant authority.
- **UI_RELEVANT_INFORMATION:** Defines all displayed entity fields, integer-minor money, integer milli-unit quantities, stock-status precedence, private/connected boundaries, and the allowed membership, invitation, connection, mapping, PO, and archive states.

### FILE: 06_FINAL_SECURITY_AND_RBAC_MODEL.md
- **FOUND:** YES
- **READ_COMPLETELY:** YES
- **PURPOSE:** Defines authentication, authorization, tenant isolation, public projections, and the hard RBAC matrix.
- **AUTHORITY:** Security and UI visibility authority.
- **UI_RELEVANT_INFORMATION:** Seven roles; action visibility; direct-URL denial; Owner protection; no client access to canonical cross-tenant data. Where prose is broader, the hard matrix controls the UI.

### FILE: 07_FINAL_UI_INFORMATION_ARCHITECTURE.md
- **FOUND:** YES
- **READ_COMPLETELY:** YES
- **PURPOSE:** Defines routes, navigation, screen inventory, shell, page behavior, states, responsive priorities, and UI acceptance.
- **AUTHORITY:** Route, screen, navigation, and state authority.
- **UI_RELEVANT_INFORMATION:** 30 P0 screens, 10 P1 screens, one excluded P2 storefront screen; handle-scoped routes; exact navigation order; dialogs versus routes; product, procurement, mapping, receiving, reports, team, and state requirements.

### FILE: 08_FINAL_TEST_AND_QA_MATRIX.md
- **FOUND:** YES
- **READ_COMPLETELY:** YES
- **PURPOSE:** Defines unit, rules, integration, browser, responsive, accessibility, security, performance, and evidence gates.
- **AUTHORITY:** Complete test-range and verification authority.
- **UI_RELEVANT_INFORMATION:** Complete v3 `T-*` ranges override abbreviated references in file 12; includes all eight branded-login behaviors, P0/P1 state coverage, 390 px flows, keyboard/focus, honesty, and no-console-error gates.

### FILE: 09_FINAL_IMPLEMENTATION_READINESS_GATE.md
- **FOUND:** YES
- **READ_COMPLETELY:** YES
- **PURPOSE:** Records final pre-design and pre-implementation readiness.
- **AUTHORITY:** Go/no-go authority before UI design.
- **UI_RELEVANT_INFORMATION:** Confirms the coursework brief and v3 pack are ready for UI design while implementation remains gated on UI approval.

### FILE: 10_FINAL_TECH_STACK_DECISION.md
- **FOUND:** YES
- **READ_COMPLETELY:** YES
- **PURPOSE:** Freezes product technology and complexity constraints.
- **AUTHORITY:** Technology/library/runtime authority.
- **UI_RELEVANT_INFORMATION:** React/Vite constraints affect implementability; exactly three charts are allowed: stock-status donut, inventory-by-location bar, and PO-status bar; Lucide icons; semantic custom tables; restricted Radix use; no unnecessary state libraries.

### FILE: 11_FINAL_FIREBASE_IMPLEMENTATION_ARCHITECTURE.md
- **FOUND:** YES
- **READ_COMPLETELY:** YES
- **PURPOSE:** Defines Firebase paths, rules, callable commands, transactions, retries, and projections.
- **AUTHORITY:** Backend-boundary and UI command-behavior authority.
- **UI_RELEVANT_INFORMATION:** Determines loading/retry states, callable-backed partner-catalog reads, idempotent command behavior, operation references, latency messaging, and error-reason microcopy.

### FILE: 12_FINAL_IMPLEMENTATION_PLAN.md
- **FOUND:** YES
- **READ_COMPLETELY:** YES
- **PURPOSE:** Defines build stages, dependencies, gates, and cut order.
- **AUTHORITY:** Implementation sequencing authority, subordinate to file 08 for complete test ranges.
- **UI_RELEVANT_INFORMATION:** UI must support staged A then B-Lite delivery; no B before GATE-A; connected flows depend on private procurement and receiving foundations.

### FILE: 13_FINAL_IMPLEMENTATION_TASK_REGISTER.md
- **FOUND:** YES
- **READ_COMPLETELY:** YES
- **PURPOSE:** Lists the executable 236-task work queue and evidence obligations.
- **AUTHORITY:** Task-level implementation register.
- **UI_RELEVANT_INFORMATION:** Confirms every designed surface has a downstream task and that state, responsive, accessibility, and evidence capture cannot be deferred.

### FILE: 14_FINAL_AI_DEVELOPMENT_WORKFLOW.md
- **FOUND:** YES
- **READ_COMPLETELY:** YES
- **PURPOSE:** Defines tool roles, review discipline, authorship, and stop conditions.
- **AUTHORITY:** Implementation-session operating procedure.
- **UI_RELEVANT_INFORMATION:** One repository writer per authoritative file; parallel agents may audit or own isolated outputs; no invented requirements. Its general warning against Codex styling is superseded for this explicitly commissioned design phase and recorded as a design-phase exception.

### FILE: 15_AGENTS_MD_SPECIFICATION.md
- **FOUND:** YES
- **READ_COMPLETELY:** YES
- **PURPOSE:** Specifies the future repository `AGENTS.md` content.
- **AUTHORITY:** Protected specification, not an active root instruction file.
- **UI_RELEVANT_INFORMATION:** Reinforces frozen scope, source precedence, one-writer discipline, evidence honesty, and stop rules. No actual root `AGENTS.md` currently exists.

### FILE: 16_FINAL_COURSEWORK_EVIDENCE_AND_REPORT_PLAN.md
- **FOUND:** YES
- **READ_COMPLETELY:** YES
- **PURPOSE:** Converts implementation and UI evidence into coursework/report deliverables.
- **AUTHORITY:** Coursework evidence and report-planning authority.
- **UI_RELEVANT_INFORMATION:** Requires consistent named screenshots, architecture/data/security/test evidence, truthful CRUD explanation, and canonical demo values. Deadline remains TBA in the original brief; the working date must be reconfirmed on the DLE.

### FILE: 17_UI_DESIGN_EXECUTION_BRIEF.md
- **FOUND:** YES
- **READ_COMPLETELY:** YES
- **PURPOSE:** Defines what the UI design phase must produce and what it must not design.
- **AUTHORITY:** UI-design execution constraint authority, subordinate to file 07 for routes/screens.
- **UI_RELEVANT_INFORMATION:** 40 P0/P1 screens, exactly 25 components, five layout families, all applicable states, eight branded-login states, mobile priorities, role-aware shell, mapping and receiving detail, WCAG constraints, and the ban on P2/C/D, dark theme, global search, custom icons, and invented settings.

### FILE: PUSL2021 Referral C1.docx
- **FOUND:** YES
- **READ_COMPLETELY:** YES (structural text and object inspection)
- **PURPOSE:** Original PUSL2021 individual referral coursework brief.
- **AUTHORITY:** Supreme coursework/marking authority.
- **UI_RELEVANT_INFORMATION:** Requires an individual, database-connected management system with core Create/Read/Update/Delete evidence, a working error-free application, public GitHub access, source submission, and a descriptive reflective report. Stockmok uses safe archive/deactivate behavior as the domain-correct Delete interpretation.
- **LAYOUT_QA:** NOT RENDERED; LibreOffice is unavailable. This does not affect content extraction, but no visual-layout pass is claimed.

## Reference images

### IMAGE: ChatGPT Image Aug 9, 2026, 10_18_06 PM.png
- **FOUND:** YES
- **INSPECTED:** YES, original resolution
- **USEFUL_ELEMENTS:** Calm blue/white hierarchy, operational density, readable tables, KPI grouping, tenant context, procurement and inventory framing.
- **PRESERVE:** Light-first tone, restrained blue, clear shell, table density, structured dashboards.
- **IMPROVE:** Canonical LKR/quantity data, permissions, state coverage, mobile behavior, monogram-first identity, and connected-workflow correctness.
- **DO_NOT_COPY:** Crown/hotel photography, generated logo, fabricated customer proof, pricing/demo/support/uptime claims, Sales & Storefronts, misleading role selection, unsupported `$6.42M`/128 metrics, or its mapping/PO state errors.
- **CONFLICTS_WITH_FINAL_SCOPE:** Contains unapproved sales/storefront, marketing proof, pricing/support claims, unsupported data, and UI behavior inconsistent with v3.
- **REFERENCE_ROLE:** Earlier Stockmok showcase and the only supplied operational-density/NetSuite-style reference. No separate NetSuite file was supplied; this resolved role is explicitly approved by the execution plan.

### IMAGE: ChatGPT Image Aug 10, 2026, 12_50_20 AM.png
- **FOUND:** YES
- **INSPECTED:** YES, original resolution
- **USEFUL_ELEMENTS:** Cleaner shell, current/change/result stock pattern, receiving conversion, side-by-side mapping comparison, restrained cards, and clearer page hierarchy.
- **PRESERVE:** Operational calm, page structure, conversion visibility, mapping narrative, and dashboard/inventory/procurement recognizability.
- **IMPROVE:** Exact canonical values, role/state/mobile coverage, full-screen readability, chart ceiling, monogram identity, and complete A/B-Lite coverage.
- **DO_NOT_COPY:** Generated photography/logo, unsupported copy/analytics, collage-as-primary-deliverable, or any incorrect state/data label.
- **CONFLICTS_WITH_FINAL_SCOPE:** Some labels, values, and analytics are illustrative rather than authoritative; the collage does not satisfy individual-screen coverage.

### IMAGE: Separate NetSuite/inventory reference
- **FOUND:** NO separate file
- **INSPECTED:** NOT APPLICABLE
- **USEFUL_ELEMENTS:** The v2 showcase is explicitly assigned this role by the approved plan.
- **PRESERVE:** Only its operational density and information hierarchy.
- **IMPROVE:** All domain, data, security, and scope accuracy through v3 authorities.
- **DO_NOT_COPY:** Any NetSuite trade dress, proprietary branding, or unsupported ERP features.
- **CONFLICTS_WITH_FINAL_SCOPE:** No separate asset exists; no external design is inferred or copied.

### IMAGE: Separate logo/brand reference
- **FOUND:** NO
- **INSPECTED:** NOT APPLICABLE
- **USEFUL_ELEMENTS:** None supplied.
- **PRESERVE:** None.
- **IMPROVE:** Create an original Stockmok identity from frozen constraints.
- **DO_NOT_COPY:** Showcase-generated marks or third-party marks.
- **CONFLICTS_WITH_FINAL_SCOPE:** None; brand exploration is commissioned as an original deliverable.

## Resolved conflict register

| ID | Conflict | Resolution |
|---|---|---|
| UI-CONFLICT-001 | RBAC prose is broader than the hard matrix. | The hard matrix in file 06 controls screens, navigation, tabs, and actions. |
| UI-CONFLICT-002 | File 12 cites incomplete pre-v3 test ranges. | File 08 complete ranges control design traceability and QA. |
| UI-CONFLICT-003 | Attached brief shows an isolated `18 -> 58 -> 68 KG` sequence. | Superseded by files 04/16: `18 -> 20 -> 60 -> 70 -> 70 -> 110 -> 120 KG`. |
| UI-CONFLICT-004 | File 14 normally assigns UI styling elsewhere. | Explicit current commission creates a design-phase-only exception; production implementation rules remain unchanged. |
| UI-CONFLICT-005 | No distinct NetSuite reference exists. | The v2 showcase is the documented operational-density reference; no missing external design is invented. |
| UI-CONFLICT-006 | Network-disabled direct URL behavior was unspecified. | Disabled network routes are unregistered and resolve to authenticated 404. |
| UI-CONFLICT-007 | Reports share one route but roles differ by tab. | Access is enforced at report-tab and action level. |
| UI-CONFLICT-008 | Public copy could advertise unbuilt B functionality. | B marketing copy is feature-flagged and absent when Network is disabled. |

## Canonical demonstration data

`18 KG seed -> +2 adjustment = 20 -> +40 private receipt = 60 -> +10 private receipt = 70 -> supplier ships while buyer remains 70 -> +40 connected receipt = 110 -> +10 connected receipt = 120 KG`

Inventory value sequence: `LKR 564,200 -> 566,700 -> 616,700 -> 629,200 -> 629,200 -> 679,200 -> 691,700`.

## Baseline SHA-256 hashes

| Source | SHA-256 |
|---|---|
| 01_FINAL_RECONCILIATION_REPORT.md | `D579F3C0DA123C091BA1F36C75B65EEAF5E78D8B3C27FC8865056E108EFC2BC8` |
| 02_FINAL_REQUIREMENTS_SPECIFICATION.md | `4178166360DF76A8FEAF910C3B75AD26A5F600C3E89FDF6278B2CEBDCE93D85B` |
| 03_FINAL_SCOPE_FREEZE.md | `7BEAA9FFBF8529DBABF7B908AEE632A0D8FB95B06E2BDE38A1939F08828D5D16` |
| 04_FINAL_USE_CASES_AND_ACCEPTANCE.md | `5C4F49585EF6D6B7E7057F150D39227C2C43AA06D12F5AE39D966E55E5DA9048` |
| 05_FINAL_DOMAIN_AND_DATA_CONTRACT.md | `3545C2A54387B582E2B95256D47B83FB0245374911D15F30CA239DDD92196820` |
| 06_FINAL_SECURITY_AND_RBAC_MODEL.md | `B02C68353EFD7986101487FB78E1B2219FDF7E9C412368862299F45D645A69AF` |
| 07_FINAL_UI_INFORMATION_ARCHITECTURE.md | `B515F18B43E02272FAEE4B37B83FA0447506EEFC9C071193CF6124184B67CB48` |
| 08_FINAL_TEST_AND_QA_MATRIX.md | `5DDC1F28C347485A8EF7682D1BCF181559B52684491C460AE7E242E7441AB039` |
| 09_FINAL_IMPLEMENTATION_READINESS_GATE.md | `DCAE3FDF649948FBD7E9C1ACD6B93412B51805DAA898B099B5DE52529284EC37` |
| 10_FINAL_TECH_STACK_DECISION.md | `3037C888B42E8D990210ADE46C6DE57B4D80A4CD2F4399FB8ED9EA7D51EF6DAC` |
| 11_FINAL_FIREBASE_IMPLEMENTATION_ARCHITECTURE.md | `EBFF9106CC17611EE5DD67150576624EE836641D6246147632192D45B40DFF98` |
| 12_FINAL_IMPLEMENTATION_PLAN.md | `A3E07988C1349F7C160677256A261457A9193AFA415FA3EC04D2A4A6C6E23B12` |
| 13_FINAL_IMPLEMENTATION_TASK_REGISTER.md | `269340964CED329460ADB9F6E7418EDD71B9549791E51BDA485A8FCCEB46BE03` |
| 14_FINAL_AI_DEVELOPMENT_WORKFLOW.md | `F71DA7FB467CF3D31AAE18FB6F6EB76D4645DC68B2E2C6F916CF6D9DD46120F0` |
| 15_AGENTS_MD_SPECIFICATION.md | `6A0FD7FA7FC9B9774642628733480515DD307E8518A781E1E5010A24C5BF1B81` |
| 16_FINAL_COURSEWORK_EVIDENCE_AND_REPORT_PLAN.md | `835B066A574E428A829C8DC8F478DD3906623A88508705294ACC3F99163A50AF` |
| 17_UI_DESIGN_EXECUTION_BRIEF.md | `A05FB600B4E16F69B2251A45C55AA05C74164DEBB80CA67AC26F62C3C1B0BF74` |
| PUSL2021 Referral C1.docx | `1E22A497529C951094D3864D1B323EF6E8D02848E172BF0DF9EF3C5ADE52C13C` |
| v2 showcase PNG | `641AA3B007B941CE8C6B63B16913DBBF42597A73781468E106EF93F5973CCC40` |
| v3 showcase PNG | `53C09B02CBEB76BBA21F346D327FE1074423C4E602A4822AE2FFBEF42AB9FEB5` |

## Gate result

- `SOURCE_DOCUMENTS_REQUIRED: 17`
- `SOURCE_DOCUMENTS_READ: 17/17`
- `COURSEWORK_BRIEF_READ: YES`
- `REFERENCE_IMAGES_FOUND: 2 supplied files`
- `STOCKMOK_V4_DERIVATION: MECHANICAL_RENAME_ONLY`
- `POST_MIGRATION_SOURCE_HASHES: 20/20 MATCH`
- `REFERENCE_IMAGES_INSPECTED: 2`
- `SOURCE_CONFLICTS_FOUND: 8`
- `SOURCE_CONFLICTS_UNRESOLVED: 0`
- `INPUT_READ_CONFIRMATION: PASS`
