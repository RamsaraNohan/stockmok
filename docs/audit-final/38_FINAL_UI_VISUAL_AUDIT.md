# 38 — Stockmok Final UI Visual Audit

**Every SCREEN-ID receives a disposition. Every current VISUAL-ID receives a verdict.** No visual is omitted because a review board exists. Verdicts are grounded in first-hand inspection (montage of all families + native-resolution inspection of signature screens).

**Disposition:** APPROVE / REFINE / REDESIGN / REMOVE / OWNER.
**Visual verdict:** KEEP / REFINE / REDESIGN / SUPERSEDE. **Design priority:** P0 / P1 / P2.

---

## 0. The systemic defect (applies to ~69 deterministic renders)

Before per-screen findings, one defect recurs across nearly every `DETERMINISTIC_UI_RENDER` and must be read into each row below:

**DEF-SYS-A — Engineering copy rendered as product UI.** The renders print, on-screen, one or more of: (i) raw route pills (`/app/grand-ocean/…`); (ii) `FORM-0##`, `TABLE-0##` identifiers as headings; (iii) `SCREEN-0## · authoritative Stockmok visual contract` subtitles; (iv) specification sentences and step-descriptions used as field labels/body copy ("nonnegative money/quantity", "save blocked for seven named error states"); (v) truncated table headers; (vi) duplicated equal-weight action buttons. Classification: **REMOVE_FROM_UI / CONVERT_TO_USER_MICROCOPY** (file 40 §11). This alone moves the package from APPROVE to at least REFINE, and combines with content gaps to force REDESIGN on form/workflow screens.

**Tiering used below:**
- **Tier 1 (data-rich renders):** correct real data, near-shippable → REFINE.
- **Tier 2 (form/workflow scaffold renders):** spec text in empty fields, missing designed content → REDESIGN.
- **Foundation (image-gen):** polished, real-looking → REFINE.

---

## 1. Screen-by-screen disposition (SCREEN-001…052)

| SCREEN | Name | Vision fit | Content quality | States/Resp/A11y | Visual quality | Disposition | Pri | Exact recommendation |
|---|---|---|---|---|---|---|---|---|
| 001 | Public Home | Strong | Good | ok | Good | REFINE | P1 | Remove route pill; replace hero glyph with a real dashboard image; keep 4 honest feature cards |
| 002 | Sign Up | Strong | Good | Base-F | Good | REFINE | P1 | Strip annotations; keep |
| 003 | Global Login | Strong | Good | Base-F | Good | REFINE | P1 | Keep; polish spacing |
| 004 | Branded Login | Strong (signature security) | Good | 8 states | Good | REFINE | P0 | Keep as reference; ensure state-6 (role mismatch) is designed as product behaviour |
| 005 | Invitation Accept | Strong | Good | ok | Good | REFINE | P1 | Strip annotations |
| 006 | Workspace Selector | Strong | Good | Base-L | Good | REFINE | P1 | Keep; multi-org cards good |
| 007 | Onboarding | Strong | Good | Stepper | Good | REFINE | P1 | Keep 4-step; keep live handle normalisation |
| 008 | App Shell | Strong | **Spec text** ("Authenticated shell anatomy", "Authority resolution — Source 07…") | ok | Med | REDESIGN | P0 | Rebuild as a real shell; remove anatomy annotations |
| 009 | Empty Dashboard | Strong | Good (setup checklist) | STATE-043 | Good | REFINE | P1 | Keep checklist; verify links |
| 010 | Populated Dashboard | Strong | Good (KPIs reconcile, chart text-alts) | Base-D | Good | REFINE | P0 | Remove "Populated Dashboard" title + route pill; else reference-quality |
| 011 | Product List | Strong | Good (real rows) | Base-L | Good | REFINE | P0 | Fix truncated headers; strip annotations |
| 012 | Product Create/Edit | Core CRUD | **Spec text** ("FORM-006", "nonnegative money/quantity") | Base-F | Weak | REDESIGN | P0 | Design real labelled fields (SKU, name, category, base unit, purchase cost, min, reorder) |
| 013 | Product Detail | Strong | Mixed (tabs ok, spec text in fields) | Base-D | Med | REDESIGN | P0 | Design Overview/Stock/Suppliers/Buyers/Activity tabs with real values (mobile 006 is the pattern) |
| 014 | Category Mgmt | Core CRUD | **Spec text** ("FORM-007") | Base-L | Weak | REDESIGN | P1 | Design list + modal with real fields |
| 015 | Warehouse Mgmt | Core CRUD | **Spec text**; guarded-archive message present | Base-L | Weak | REDESIGN | P1 | Design table + archive-blocked message ("Cold Room still holds stock…") |
| 016 | Stock Adjustment (desktop) | Strong | **Spec scaffold** | Base-F+X | Weak | REDESIGN | P0 | Rebuild to match strong mobile (007): Current→Change→Result preview, reason required |
| 017 | Movement History | Strong | Good (immutable table) | Base-L | Good | REFINE | P1 | Keep; fix truncation |
| 018 | Suppliers | Strong | **Scaffold table** | Base-L | Weak | REDESIGN | P1 | Design Private/Connected/Pending tabs; Private = first-class |
| 019 | Buyers | Strong (no-sales scope) | Scaffold but correctly no outbound | Base-L | Med | REDESIGN | P1 | Directory-only; keep "no sales" discipline |
| 020 | Partner Detail | Strong | Scaffold | Base-D | Weak | REDESIGN | P2 | Private contact/history vs Connected identity/mappings |
| 021 | PO List | Strong | Good (real rows, Private/Connected tabs) | Base-L | Good | REFINE | P0 | Strengthen Private/Connected structural cue; strip annotations |
| 022 | Private PO Builder | Core | **Scaffold wizard** | Base-F | Weak | REDESIGN | P0 | Design Supplier→Items→Delivery→Review stepper; no fake supplier acceptance |
| 023 | Private PO Detail | Strong | Acceptable (badge, lines, timeline stub) | Base-D+X | Med | REFINE→REDESIGN | P1 | Design real timeline; unify with connected pattern |
| 024 | Private Receiving (desktop) | Signature op | **Scaffold form** + correct Receiving-Lines table | Base-F | Weak | REDESIGN | P0 | Rebuild to mobile-009 standard (ordered/received/receive-now/current/after/outstanding) |
| 025 | Reports Shell | Strong | **Scaffold** ("report tab selection only") | Base-D | Weak | REDESIGN | P1 | Design tab shell hosting 048/049 |
| 026 | Notifications | Strong | Good (real items) | Base-L | Good | REFINE | P1 | Strip annotations |
| 027 | Team | Strong | Good (protected Owner row) | Base-L+X | Good | REFINE | P0 | Keep; ensure Owner row visibly protected |
| 028 | Settings | Strong | Acceptable (sections + feature flags) | Base-F | Med | REFINE | P1 | Design sections; keep read-only handle/precision |
| 029 | Permission Denied | Strong | Good ("You need … You're signed in as …") | ok | Good | REFINE | P0 | Keep; reference-quality copy |
| 030 | 404 / disabled-network | Strong | Good | ok | Good | REFINE | P1 | Keep; no upgrade-advertising |
| 031 | Connected Businesses | B-Lite | **Scaffold** | Base-L | Weak | REDESIGN | P1 | Design incoming-request prominence + connection cards |
| 032 | Business Discovery | B-Lite | Scaffold | 7 states | Weak | REDESIGN | P1 | Design exact-handle search + safe result card + all states |
| 033 | Connection Detail | B-Lite | Scaffold | Base-D | Weak | REDESIGN | P2 | Design mapped-items + connected-POs + disable |
| 034 | Partner Catalog (supplier) | B-Lite (privacy) | Scaffold | Base-L | Weak | REDESIGN | P1 | Design publish table + prominent privacy explanation |
| 035 | Partner Catalog (buyer) | B-Lite | Scaffold | Base-L | Weak | REDESIGN | P1 | Design read-only projection + "partner projection, not inventory" note |
| 036 | **Product Mapping Wizard** | **Signature #1** | **FAIL** (5 empty spec-labelled inputs; no stepper/cards/checkbox/preview; dup buttons; FORM-020 + route) | states missing | **Fail** | **REDESIGN** | **P0 (blocker)** | Full redesign: 5-step stepper, side-by-side supplier/buyer cards, unticked semantic checkbox, `1 PACK = 5 KG` + worked `10 PACK = 50 KG`, 7 error states, single primary, disabled-with-reason |
| 037 | Product Mappings list | B-Lite | Scaffold | Base-L | Weak | REDESIGN | P2 | Design list with conversion + status + disable |
| 038 | Connected PO — Buyer | Signature #2 | Good (dual representation, conversion, private-before-submit) | Base-F+X | Good | REFINE | P0 | Remove route pill; fix wrap on "Visibility"; add designed timeline |
| 039 | Connected PO — Supplier | Signature #2 | Acceptable (supplier projection, no buyer-private) | Base-F | Med | REFINE | P1 | Design accept/reject/ship + attributed timeline |
| 040 | Connected Receiving | Signature op | Acceptable (arithmetic present) | Base-F | Med | REFINE→REDESIGN | P0 | Bring to mobile-009 standard; supplier-unit truth |
| 041 | Password Reset | Strong | Good (neutral copy) | Base-F | Good | REFINE | P2 | Keep |
| 042 | Opening Balance | Strong | Scaffold | Base-F | Weak | REDESIGN | P1 | Design modal; only-before-movement rule |
| 043 | Mobile App Nav | Strong | **Good** (best asset) | focus-trap | Good | REFINE | P0 | Remove "Focus trapped · Esc closes" caption; else reference |
| 044 | Dashboard Owner/Admin | Strong | Good but titled "Dashboard Owner-admin" | Base-D | Good | REFINE | P1 | Consolidate as role-delta of 010 |
| 045 | Dashboard Inventory Mgr | Strong | Good | Base-D | Good | REFINE | P1 | Role-delta |
| 046 | Dashboard Procurement Mgr | Strong | Good | Base-D | Good | REFINE | P1 | Role-delta |
| 047 | Dashboard Storekeeper | Strong (Receiving-first) | Good | Base-D | Good | REFINE | P1 | Role-delta |
| 048 | Stock-on-Hand Report | Strong | Acceptable (table + replacement-cost disclosure) | Base-L | Med | REFINE | P1 | Design table + filters + CSV; keep disclosure |
| 049 | Purchase-Order Report | Strong | Acceptable | Base-L | Med | REFINE | P1 | Design table + filters; SK/VW denied |
| 050 | Invitation Link Modal | Strong | Good (once-only link + warning) | STATE-042 | Good | REFINE | P1 | Keep |
| 051 | Product Publish Dialog | B-Lite (privacy) | Scaffold | Base-F | Weak | REDESIGN | P1 | Design dialog + order-unit lock + privacy statement |
| 052 | Notification Menu | Strong | Good | ok | Good | REFINE | P2 | Keep |

**Screen disposition totals:** APPROVE 0 · REFINE 28 · REDESIGN 24 · REMOVE 0 · OWNER 0 (audit-log screen tracked separately as ADD/OWNER). Every screen carries DEF-SYS-A (remove engineering copy).

---

## 2. Visual disposition registry (all 105 current VISUAL-IDs)

Grouped by family with per-ID verdicts. Method: DETERMINISTIC form/workflow renders = REDESIGN; data-rich renders and foundation/auth = REFINE; brand/components = REFINE; boards = SUPERSEDE-after-redesign (they are composites of screens being redesigned).

### 2.1 Primary screens
| VISUAL-ID | Verdict | Pri | Note |
|---|---|---|---|
| VISUAL-SCREEN-001..007 | REFINE | P1 | Foundation auth/public/onboarding — polished; strip route pills |
| VISUAL-SCREEN-008 | REDESIGN | P0 | Shell shows spec anatomy text |
| VISUAL-SCREEN-009 | REFINE | P1 | Empty dashboard checklist good |
| VISUAL-SCREEN-010 | REFINE | P0 | Reconciles; reference-quality after annotation removal |
| VISUAL-SCREEN-011 | REFINE | P0 | Product list real rows; fix header truncation |
| VISUAL-SCREEN-012,013,014,015 | REDESIGN | P0/P1 | Inventory forms = spec scaffold |
| VISUAL-SCREEN-016 | REDESIGN | P0 | Desktop adjustment scaffold |
| VISUAL-SCREEN-017 | REFINE | P1 | Movement history legible |
| VISUAL-SCREEN-018,019,020 | REDESIGN | P1/P2 | Partner screens scaffold |
| VISUAL-SCREEN-021 | REFINE | P0 | PO list real rows |
| VISUAL-SCREEN-022 | REDESIGN | P0 | PO builder scaffold |
| VISUAL-SCREEN-023 | REDESIGN | P1 | PO detail timeline stub |
| VISUAL-SCREEN-024 | REDESIGN | P0 | Desktop receiving scaffold (table ok) |
| VISUAL-SCREEN-025 | REDESIGN | P1 | Reports shell scaffold |
| VISUAL-SCREEN-026 | REFINE | P1 | Notifications legible |
| VISUAL-SCREEN-027 | REFINE | P0 | Team good |
| VISUAL-SCREEN-028 | REFINE | P1 | Settings acceptable |
| VISUAL-SCREEN-029,030 | REFINE | P0/P1 | Permission/404 good |
| VISUAL-SCREEN-031,032,033 | REDESIGN | P1/P2 | Connections scaffold |
| VISUAL-SCREEN-034,035 | REDESIGN | P1 | Partner catalog scaffold |
| VISUAL-SCREEN-036 | **REDESIGN** | **P0** | **Signature mapping — FAIL** |
| VISUAL-SCREEN-037 | REDESIGN | P2 | Mappings list scaffold |
| VISUAL-SCREEN-038 | REFINE | P0 | Connected PO buyer good |
| VISUAL-SCREEN-039 | REFINE | P1 | Connected PO supplier acceptable |
| VISUAL-SCREEN-040 | REDESIGN | P0 | Connected receiving → mobile standard |
| VISUAL-SCREEN-041 | REFINE | P2 | Password reset good |
| VISUAL-SCREEN-042 | REDESIGN | P1 | Opening balance scaffold |
| VISUAL-SCREEN-043 | REFINE | P0 | Mobile nav — best asset |
| VISUAL-SCREEN-044..047 | REFINE | P1 | Role dashboards → consolidate to deltas |
| VISUAL-SCREEN-048,049 | REFINE | P1 | Report tabs acceptable |
| VISUAL-SCREEN-050 | REFINE | P1 | Invite link modal good |
| VISUAL-SCREEN-051 | REDESIGN | P1 | Publish dialog scaffold |
| VISUAL-SCREEN-052 | REFINE | P2 | Notification menu good |

### 2.2 Mobile (VISUAL-MOBILE-001..011)
| VISUAL-ID | Verdict | Pri | Note |
|---|---|---|---|
| MOBILE-001 login, 002 branded, 003 selector | REFINE | P1 | Good; strip annotations |
| MOBILE-004 dashboard | REFINE | P0 | Reconciles; good |
| MOBILE-005 product list, 006 product detail | REFINE | P0 | Real cards; 006 is the desktop-detail pattern |
| MOBILE-007 adjustment | REFINE | P0 | Good — use as desktop-016 reference |
| MOBILE-008 PO detail | REFINE | P1 | Good |
| MOBILE-009 receiving | REFINE (KEEP as reference) | P0 | **Strongest receiving asset**; stepper + arithmetic |
| MOBILE-010 notifications | REFINE | P1 | Good |
| MOBILE-011 app nav | REFINE | P0 | Good |

### 2.3 State boards (VISUAL-STATE-001..011)
Verdict: **REDESIGN as state galleries; KEEP content as the state checklist.** The boards enumerate the correct states (login 8, receiving, connection, mapping 11 lookup states, connected-PO chain, invitation, permission, loading/empty/error) but render them as bullet text, not designed states. Priority P1 (states are "where the marks are").

### 2.4 Component boards (VISUAL-COMP-001..010)
Verdict: **REFINE (KEEP as design-system reference).** These are the strongest system evidence: buttons, fields/forms, tables w/ pagination, **badges/status with documented AA contrast ratios**, navigation, dialogs/drawers, alerts/toasts, cards/KPIs, charts+text-alts, loading/empty/error. Strip "authoritative visual contract" captions; carry the tokens forward unchanged. Priority P1.

### 2.5 Brand boards (VISUAL-BRAND-002..006; 001 retired/absent)
| VISUAL-ID | Verdict | Note |
|---|---|---|
| BRAND-002 Stackline-S | REFINE | Mark reads as F/E — letterform-recognition concern (OWNER, ACR-002) |
| BRAND-003 wordmark/lockups | KEEP | Clean; typeset wordmark |
| BRAND-004 icon/favicon | REFINE | Depends on glyph decision |
| BRAND-005 monogram system | KEEP | AA-safe palette, deterministic — excellent, implementation-simple |
| BRAND-006 complete-brand-system | SUPERSEDE | Asset register itself notes retry-2 "remained semantically wrong: compressed monogram palette invented color/ratio values" yet is marked APPROVED — regenerate from corrected sources |

### 2.6 Showcase boards (VISUAL-BOARD-001..008) & Review boards (VISUAL-REVIEW-001..008)
Verdict: **SUPERSEDE after redesign.** These are composites/contact-sheets of the primary screens; once primaries are redesigned, boards must be regenerated. They are useful *now only as triage evidence*, not as design targets. Priority P2 (regenerate last, as QA output of the new design).

**Visual verdict totals (105):** KEEP 3 · REFINE ~55 · REDESIGN ~31 · SUPERSEDE ~16 (boards + BRAND-006). Zero currently qualify as unconditional APPROVE for production because DEF-SYS-A affects the deterministic set and boards derive from screens under redesign.

---

## 3. Contradiction with existing QA (files 33/34)

The existing Visual QA (33) records `FINAL_VISUAL_QA = PASS`, 105/105 approved. This audit **does not accept that conclusion as a design verdict**, because 33's method (its own §"QA method") validated path, PNG decode, dimensions, unique hash, expected role/route/fields/labels/chart-count/clipping and **family contact sheets** — plus native inspection of only "foundation and high-risk screens". It did not test whether on-screen copy is product-appropriate or whether the signature workflow is actually designed. The QA is internally honest; it simply answered "are the contracted assets present and consistent?" (YES) rather than "are these usable product designs?" (largely NO for the deterministic form/workflow set). **Recommendation:** reclassify the package status from `APPROVED` to `REDESIGN_REQUIRED_BEFORE_CODING`, keeping all current files as reference/history (do not delete).

---

## 4. What to preserve (do not lose in redesign)

1. Design-system tokens & documented AA contrast (COMP boards + file 21).
2. Monogram identity system (BRAND-005).
3. Auth/public/onboarding screens (001–007, 029, 030, 041) as visual reference.
4. Populated dashboard structure incl. chart text-alternatives (010).
5. Mobile receiving (009) and mobile drawer (043) as the interaction gold standard.
6. Connected-PO dual-representation pattern (038).
7. The complete state checklist embedded in the state boards.
8. Honest, non-enumerating microcopy already written (permission-denied, neutral auth errors, empty states).

---

# AMENDMENT — individual visual verification

Every current primary visual has now been opened **individually** at readable/native resolution; no
montage was used as a final evidence source. Full per-asset record: **file 52**.

| Family | Individually inspected |
|---|---|
| Primary desktop screens | **52 / 52** (native 1280×900) |
| Mobile-priority visuals | **12 / 12** (native 390×844 / 390×1200) |
| State boards | **11 / 11** (readable scale) |
| Component boards | **10 / 10** (readable scale) |
| Brand boards | **5 / 5** (readable scale) |
| Showcase/review boards | board-level — already dispositioned SUPERSEDE (DI-019) |

## Dispositions changed by individual inspection

| VISUAL-ID | Previous verdict | Confirmed / Changed | Reason |
|---|---|---|---|
| VISUAL-SCREEN-016 | REDESIGN | **CHANGED → REFINE** | Correct modal; 18 KG + 2 = 20 KG; reason required; one primary |
| VISUAL-SCREEN-022 | REDESIGN | **CHANGED → REFINE** | Real 4-step stepper; 50 KG × LKR 1,200.00 = LKR 60,000.00; correct subtotal |
| VISUAL-SCREEN-042 | REDESIGN | **CHANGED → REFINE** | Correct dialog with real helper copy |
| VISUAL-SCREEN-017 | REFINE | **CONFIRMED** + new defect | Full chain 18→20→60→70→110→120 KG correct, but Time column holds labels (DI-022) |
| VISUAL-SCREEN-020 / 033 / 048 / 049 / 052 / 026 / 029 / 030 / 041 / 006 / 007 / 009 | REFINE | **CONFIRMED (upgraded quality note)** | Genuine product UI; copy removal only |
| VISUAL-SCREEN-039 | REFINE | **CHANGED → REDESIGN** | Renders buyer org in supplier shell (DI-023); FORM-022 scaffold; no lines, totals or timeline |
| VISUAL-SCREEN-048 | REFINE | **CONFIRMED** + new defect | Three Cold Room products labelled Main Store (DI-025) |
| VISUAL-SCREEN-011 | REFINE | **CONFIRMED** + new defect | 6 of 12 seeded SKUs (DI-021) |
| VISUAL-SCREEN-013 / 019 / 025 / 034 / 050 | REDESIGN | **CONFIRMED (escalated evidence)** | Render the generation prompt verbatim, including the instruction word *"exactly"* and `TABLE-021` / `STATE-042` |
| VISUAL-MOBILE-009, VISUAL-SCREEN-043 | KEEP-grade | **CONFIRMED** | Package's two best assets |
| VISUAL-MOBILE-011 | REFINE | **CHANGED → SUPERSEDE** | Defective duplicate of SCREEN-043; no org context; prompt dump visible behind the scrim |
| VISUAL-MOBILE-001 / 002 / 003 | REFINE | **CONFIRMED** + new defect | Role-token leakage `anyone` and `Inventory Manager \| Viewer` (DI-029); MOBILE-003 severe text wrap |
| VISUAL-STATE-001 / 010 / 011 | REDESIGN | **CHANGED → REFINE** | Genuinely designed frames (8, 6, 7) |
| VISUAL-STATE-002…009 | REDESIGN | **CONFIRMED** | Captioned text; 005 and 008 draw no UI; 007 and 009 collapse 11 and 9 states into one paragraph |
| VISUAL-COMP-002 / 003 / 004 | REFINE | **CHANGED → KEEP** | Professional-grade; preserve as design-system reference |
| VISUAL-COMP-001 | REFINE | **CHANGED → REDESIGN** | Draws no buttons at all (DI-033) |
| VISUAL-COMP-008 / 009 / 010 | REFINE | **CONFIRMED** + new defects | Literal "Loading" text, missing-glyph icons, non-encoding bars, numeric overflow |
| VISUAL-BRAND-005 | REFINE | **CONFIRMED** + new defect | Loading state is a centred circular spinner — the named anti-pattern |
| VISUAL-BRAND-006 | SUPERSEDE | **CONFIRMED, re-characterised** | Wrong artefact (contact sheet, not a designed system board); cause = file 32 L99 |

**Amended screen dispositions: APPROVE 0 · REFINE 34 · REDESIGN 18.**
The blanket "the visuals are uniformly spec-visualisation" characterisation is **too harsh** for the
19-asset foundation tier and for mobile; it is **accurate** for the 69 `DETERMINISTIC_UI_RENDER` assets.
`CURRENT_VISUAL_PACKAGE = REDESIGN` stands.
