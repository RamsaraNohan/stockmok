# 42 — Stockmok Design Defect & Improvement Register

Single prioritized list. Severity: BLOCKER / HIGH / MEDIUM / LOW. Fields per §27.
"CD must address" = Claude Design must resolve within its authority. "Owner" = OWNER_DECISION_REQUIRED.

---

## BLOCKERS (must be resolved before design is approved)

### DI-001 — Product Mapping Wizard is not designed (signature workflow)
- **Category:** signature workflow / content
- **Screen/Visual:** SCREEN-036 / VISUAL-SCREEN-036; STATE-007
- **Severity:** BLOCKER
- **Current problem:** renders five empty inputs labelled with the spec's step descriptions; no stepper, no side-by-side supplier/buyer cards, no unticked semantic checkbox, no `1 PACK = 5 KG` conversion with worked `10 PACK = 50 KG` preview, error states absent (**EIGHT**, not seven — see the amendment at the end of this file), duplicate equal-weight primary buttons, `FORM-020` and raw route exposed.
- **Why it matters:** this is the highest-value, most viva-worthy, most portfolio-distinctive screen. As-is it demonstrates nothing.
- **Source authority:** 07 §17; 02 FR-NET-010..016; 04 SC-13.
- **Recommended solution:** full REDESIGN — 5-step stepper (Supplier → SKU → Semantic → Conversion → Review); server-lookup states (idle/searching/found/not-found/not-published/stale); side-by-side matched cards; deliberate unticked checkbox; conversion with live worked preview; Save disabled-with-reason until all conditions pass; single contextual primary.
- **KEEP/REFINE/REDESIGN/REMOVE/ADD:** REDESIGN
- **Impl cost:** MED · **Coursework impact:** HIGH · **Portfolio impact:** HIGH
- **CD must address:** YES · **Owner:** NO

### DI-002 — Engineering copy rendered as product UI (systemic)
- **Category:** microcopy / correctness
- **Screen/Visual:** ~69 deterministic renders (008, 012, 014–016, 022, 024, 025, 031–037, 042, 051, all role dashboards, mobile subtitles, etc.)
- **Severity:** BLOCKER (package-level)
- **Current problem:** on-screen route pills, `FORM-###`/`TABLE-###`, `SCREEN-### · authoritative Stockmok visual contract`, spec sentences and step-descriptions as labels, "Authenticated shell anatomy", "Authority resolution — Source 07…".
- **Why it matters:** a marker/reviewer sees internal engineering artefacts, reading as an unfinished/incomprehensible product; violates 07 §1.11 ("nothing implies a capability that does not exist" and, by extension, nothing exposes internals).
- **Source authority:** 07; §11 of this audit run.
- **Recommended solution:** REMOVE all identifiers/routes/spec sentences from UI; CONVERT to real microcopy (file 40 §7 register). Identifiers may remain in design annotations only.
- **KEEP/…:** REMOVE (from UI)
- **Impl cost:** LOW · **Coursework:** HIGH · **Portfolio:** HIGH
- **CD must address:** YES · **Owner:** NO

### DI-003 — Desktop Receiving is scaffold (signature operation)
- **Category:** workflow / forms
- **Screen/Visual:** SCREEN-024 / VISUAL-SCREEN-024 (also SCREEN-040 connected receiving)
- **Severity:** BLOCKER
- **Current problem:** the receive *form* is spec text ("FORM-012", spec sentence, spec-as-label inputs); only the Receiving-Lines table is real. Highest-priority operation is not usably designed on desktop.
- **Why it matters:** receiving is the operation a storekeeper does most; NFR-001 makes it top mobile priority; must be crystal clear before confirm.
- **Source authority:** 07 §19; 04 SC-09/SC-16.
- **Recommended solution:** REDESIGN desktop receiving to the mobile-009 standard: per-line Ordered / Already received / Receive now / Converted / Warehouse / Current / After / Outstanding, live conversion, over-receipt blocked inline, one clear confirm.
- **KEEP/…:** REDESIGN
- **Impl cost:** LOW-MED · **Coursework:** HIGH · **Portfolio:** MED
- **CD must address:** YES · **Owner:** NO

---

## HIGH

### DI-004 — Inventory CRUD forms are scaffold
- Screens: 012 Product form, 013 Product detail, 014 Category, 015 Warehouse, 042 Opening balance.
- Problem: real labels/values replaced by spec descriptions; core CRUD not legibly shown (the exact thing the coursework rewards).
- Solution: REDESIGN with real labelled fields, required markers, inline validation, guarded-archive messages. Mobile 006/007 are the pattern.
- Cost LOW · Coursework HIGH · Portfolio MED · CD:YES · Owner:NO

### DI-005 — Desktop Stock Adjustment scaffold (mobile is good)
- Screen: 016 (vs strong mobile 007).
- Solution: REDESIGN desktop modal to mirror mobile — Current→Change→Result live preview, reason required, negative-result rejection, >50% confirm.
- Cost LOW · Coursework HIGH · Portfolio MED · CD:YES · Owner:NO

### DI-006 — Network lane (connections/catalog) scaffold
- Screens: 031 Connected Businesses, 032 Discovery, 033 Connection detail, 034/035 Partner catalog, 037 Mappings list, 051 Publish dialog.
- Problem: B-Lite differentiator surfaces are wireframe-grade; privacy statement (a selling point) not designed.
- Solution: REDESIGN — exact-handle discovery (no marketplace), incoming-request prominence, prominent privacy panel on publish/buyer-catalog, connection states.
- Cost MED · Coursework MED · Portfolio HIGH · CD:YES · Owner:NO

### DI-007 — Private PO Builder scaffold
- Screen: 022.
- Solution: REDESIGN Supplier→Items→Delivery→Review stepper; no fake "Supplier accepted"; snapshot-at-Ordered clarity.
- Cost LOW-MED · Coursework HIGH · Portfolio MED · CD:YES · Owner:NO

### DI-008 — Private/Connected distinction too subtle
- Screens: 021 PO list, 023 private PO detail, 038 connected PO.
- Problem: distinction carried only by a small pill.
- Solution: REFINE — structural header band + accent + explicit "Private order"/"Connected order — Fresh Foods" labelling; keep shared list/report.
- Cost LOW · Coursework MED · Portfolio MED · CD:YES · Owner:NO

### DI-009 — App Shell shows spec anatomy
- Screen: 008.
- Solution: REDESIGN as a real shell (header: mark, monogram+name, role badge, workspace switch, bell+count, user menu; role-filtered sidebar; emulator ribbon). Remove "anatomy"/"authority resolution" text.
- Cost LOW · Coursework MED · Portfolio HIGH · CD:YES · Owner:NO

### DI-010 — Reports shell scaffold
- Screen: 025 (tabs 048/049 acceptable).
- Solution: REDESIGN tab shell; keep replacement-cost disclosure; CSV export affordance.
- Cost LOW · Coursework MED · Portfolio LOW · CD:YES · Owner:NO

---

## MEDIUM

### DI-011 — Table column-header truncation
- All list/receiving tables (011, 024, 038, etc.).
- Solution: REFINE — min column widths, wrap or tooltip; never truncate quantity/status headers.
- Cost LOW · CD:YES · Owner:NO

### DI-012 — Multiple equal-weight primary buttons on wizards
- 036 (4 primaries), some detail screens.
- Solution: REFINE — one contextual primary per step; others secondary/ghost.
- Cost LOW · CD:YES · Owner:NO

### DI-013 — Five dashboards should be one adaptive dashboard
- 010 + 044–047.
- Solution: REFINE — one dashboard with role-driven module visibility; present role deltas, not five pages.
- Cost LOW · CD:YES · Owner:NO

### DI-014 — State boards are text lists, not designed states
- STATE-001..011.
- Solution: REDESIGN as proper state galleries using the (excellent) content as the checklist. "States are where the marks are."
- Cost MED · CD:YES · Owner:NO

### DI-015 — BRAND-006 known-wrong yet APPROVED
- VISUAL-BRAND-006.
- Solution: SUPERSEDE; regenerate composite from corrected monogram sources. Do not ship a self-acknowledged-wrong brand board.
- Cost LOW · CD:YES · Owner:NO

### DI-016 — Placeholder/description used as label (a11y)
- Various forms.
- Solution: REFINE — explicit visible label on every input (never placeholder-as-label).
- Cost LOW · CD:YES · Owner:NO

### DI-017 — Public home hero uses the glyph, not a product image
- 001.
- Solution: REFINE — hero shows a real (redesigned) dashboard image per 07 §7; keep four honest feature cards; advertise nothing unbuilt.
- Cost LOW · CD:YES · Owner:NO

---

## LOW

### DI-018 — Connected/private timelines are stubs
- 023, 038, 039. Solution: REFINE designed attributed timeline. CD:YES.

### DI-019 — Showcase/review boards derive from screens under redesign
- BOARD-001..008, REVIEW-001..008. Solution: SUPERSEDE — regenerate after screens are redesigned; they are QA output, not design targets. CD:YES.

### DI-020 — "authoritative visual contract" captions on component/state boards
- COMP/STATE boards. Solution: REFINE — strip captions; keep as design-system reference. CD:YES.

---

## OWNER_DECISION_REQUIRED

### DI-O1 — Stackline-S letterform reads as F/E
- Brand. See file 40 §5.1 / file 49 ACR-002.
- Decision: keep glyph / refine glyph so "S" reads / go mark-light (lead with wordmark + monograms).
- **ARCHITECTURE_CHANGE_REQUIRED = NO** (brand presentation only). Owner:YES.

### DI-O2 — Add a first-class Audit Log screen (Owner/Admin)
- IA/route addition. See file 39 §2 / file 49 ACR-001.
- Decision: add route now / keep audit inside per-object Activity (default, avoids scope growth).
- **ARCHITECTURE_CHANGE_REQUIRED = YES (adds a route/screen)** → OWNER must approve before Claude Design builds it. Owner:YES.

---

## Register summary

| Severity | Count |
|---|---|
| BLOCKER | 3 (DI-001, 002, 003) |
| HIGH | 7 (DI-004…010) |
| MEDIUM | 7 (DI-011…017) |
| LOW | 3 (DI-018…020) |
| OWNER | 2 (DI-O1, DI-O2) |

**Design blockers:** 3. **Owner decisions:** 2 (one with ARCHITECTURE_CHANGE_REQUIRED = YES). All non-owner items are within Claude Design's authority and require **no** change to business rules, RBAC, stock accounting, PO state machines, connected-business privacy, or data ownership.

---

# AMENDMENT — post complete-read + individual-visual-verification pass

Authority: files **51** (complete document read), **52** (individual visual verification), **53** (reconciliation).
Full evidence and quotes live there; this section records only the register changes.

## Verdict changes to existing entries

| Entry | Change | Evidence |
|---|---|---|
| **DI-001** | Amended — **EIGHT** error states, not seven. Add *buyer product archived/inactive*. Add: mapping is created directly as `VERIFIED`; no pending-supplier-confirmation state exists in A/B; lookup is an explicit server callable (1–3 s cold start), not typeahead. | file 11 §24 L678, L684 |
| **DI-002** | **Split.** **DI-002a** = specification defect: file 26 L459/464/469 explicitly orders the brand burn-in (*"Label this generated PNG \"APPROVAL REFERENCE — DESIGN_AS_VECTOR\""*). Remedy is to amend file 26 → **ACR-003**. **DI-002b** = generator failure on 69 screens; no prompt anywhere instructs printing routes/`FORM-###`/"authoritative visual contract". Sub-patterns now named: "Canonical data"/"Exact source data"/"Fields" prompt-dump panels; spec sentences as **button** labels; role-token leakage (`anyone`, `Inventory Manager \| Viewer`); a11y-implementation copy. | files 25 §4, 26, 28 §1.2 |
| **DI-004** | **Scope narrowed** — SCREEN-042 removed (it is a correctly designed dialog). Remains valid for 012, 013, 014, 015. | SCREEN-042 native |
| **DI-005** | **REFUTED → REFINE.** SCREEN-016 is a correct modal: Current 18 KG, Increase, Qty 2, Reason required, **Result 20 KG**, single primary. Needs copy removal only. | SCREEN-016 native |
| **DI-007** | **REFUTED → REFINE.** SCREEN-022 already has the Supplier → Items → Delivery → Review stepper, "Step 2 of 4", **50 KG × LKR 1,200.00 = LKR 60,000.00**, correct subtotal, one primary. | SCREEN-022 native |
| **DI-008** | **Restated.** A dedicated `PRIVATE/CONNECTED` column exists on SCREEN-021/049 — the defect is that the header truncates to `PRIVATE/CON…` and there is no structural differentiation. Severity HIGH unchanged. | SCREEN-021, 049 |
| **DI-011** | **MEDIUM → HIGH.** Values truncate as well as headers, on the dashboard: `LKR 292,800.0…`, `QUANTITY/VA…`, and two adjacent identical `INTERNAL…` headers on SCREEN-034. | SCREEN-044/045/047, 034, STATE-006 |
| **DI-014** | **Confirmed with precision.** Only 3 of 11 boards are designed (STATE-001/010/011). STATE-005 and STATE-008 draw no UI; STATE-007 and STATE-009 collapse 11 and 9 states into one paragraph. | all 11 boards |
| **DI-015** | **Re-characterised** — wrong artefact, not merely illegible. Documented cause: file 32 L99 assigns `PROMPT-BRAND-006` the method `COMPOSITE_REVIEW_BOARD`, contradicting file 25 §4 and file 26 L479. | files 25, 26, 32 |
| **DI-020** | **Confirmed verbatim on nine boards.** Correction: file 27 legitimately authorises VISUAL-ID/route captions on `BOARD-###`/`REVIEW-###` artefacts placed outside the crops — those 16 assets are excluded from the DI-002 count. | file 27 |

## NEW BLOCKERS

### DI-B04 — Unauthorised generation method produced the entire defective population
File 30 §4 mandates `BUILT_IN_IMAGEGEN`. The token `DETERMINISTIC_UI_RENDER` appears only in files 31–32
and is defined nowhere. File 34 records *"19 foundation, 69 deterministic UI render, 17 deterministic
composite boards"* — the 69 is **exactly** the DI-002b population. Process blocker → **ACR-004**. Owner: YES.

### DI-B05 — The specification itself orders the brand burn-in
File 26 L459/464/469. Until file 26 is amended the defect regenerates on any re-run. → **ACR-003**. Owner: YES.

## NEW HIGH

- **DI-021** Product List renders 6 of 12 seeded SKUs (page size is 25). `CD:YES`
- **DI-022** Movement History Time column carries event labels, not timestamps; **no date/time format standard exists in file 28's 540 IDs**. `CD:YES`
- **DI-023** Tenant-context errors — SCREEN-039 shows the buyer's org in the supplier shell; MOBILE-007 replaces the org block with a route chip; MOBILE-011's drawer has no org context. Violates file 22 §1 and file 19 §5.4 *"Wrong organization denied"*. `CD:YES`
- **DI-025** Stock-on-Hand Report misattributes Fresh Milk, Butter Block and Cheddar Cheese to Main Store (seed: all Cold Room); 6 of 12 rows, no total row, no visible filter chip. `CD:YES`
- **DI-028** STATE-008 row 11 arithmetic error — `10 PACK = 50 KG, LKR 12,500.00`; correct figure is **LKR 62,500.00**. Only arithmetic error in the package. `CD:YES`
- **DI-033** COMP-001 is a button board that draws no buttons; states are named in prose. The component sheet is a required deliverable (file 17 §14/§16). `CD:YES`
- **DI-042** File 32/33 record all 105 assets `APPROVED` with zero notes, breaching file 30 §5 (*"A technically valid but semantically defective PNG is still a failure"*; a label/route/value/legibility defect *"can never receive this status"*). Process → ACR-004. `CD:NO`

## NEW MEDIUM

**DI-024** `—` timestamps and literal "Seed snapshot" as an Updated value · **DI-026** SKU/category drift (MOBILE-005 `SEA-001`/Seafood, `DAIRY-001` vs seed `MEAT-003`/Meat, `DAIR-001`) · **DI-027** SCREEN-010 renders the seed state where file 22 requires the final LKR 691,700 state · **DI-029** role-token leakage (`anyone`, `Inventory Manager | Viewer`) · **DI-030** a11y-implementation copy as UI headings · **DI-031** MOBILE-011 and SCREEN-043 are duplicate conflicting contracts for one screen · **DI-032** token contradictions (radius 6 vs 8 px; `#B91C1C` vs `#D92D20`) · **DI-034** missing-glyph hollow-square empty-state icon on four assets · **DI-036** shell inconsistency across 25+ screens (org block side, avatar `NP`/`U`, bell vs diamond, caption present/absent) · **DI-043** microcopy gaps — no COPY IDs for table headers, no supplier-catalog privacy string, PROMPT-SCREEN-035 substitutes unapproved text for COPY-415.

## NEW LOW

**DI-035** duplicate "Needs attention" row on SCREEN-047 · **DI-037** non-encoding bar charts (equal-width bars for different and zero values) · **DI-038** PO status disagreement across visuals with no as-at labelling · **DI-039** COMP-007 timeline mis-sequenced · **DI-040** COMP-008 numeric overflow breaks the KPI card · **DI-041** file 16 §4 screenshot counts contradict the enumerated lists (34 vs 42; 14 vs 20).

## WITHDRAWN — suspected defects cleared by complete authority read

Recorded so they are not re-raised:
- Storekeeper/Viewer seeing inventory valuation is **correct** (file 23 §3 grants Stock-on-Hand READ_ONLY to all seven roles; file 19 TABLE-013 carries the replacement-cost disclosure). No masking rule exists.
- Reports absent from the Storekeeper sidebar while SCREEN-025 renders for Storekeeper is **correct** (file 20 rule 7: *"Route entitlement and sidebar inclusion are distinct"*; `HIDDEN` means sidebar-absent only).
- The Stock-on-Hand row values and the dashboard warehouse split are **arithmetically correct** against the seed.
- `Expected` rendering as `—` is **correct** (FIELD-029 expected date is optional).

## Amended register summary

| Severity | Count |
|---|---|
| BLOCKER | **5** |
| HIGH | **14** |
| MEDIUM | **13** |
| LOW | **8** |
| OWNER | **4** (ACR-001…004) |

Architecture impact remains **nil**: no business rule, RBAC entry, stock-accounting rule, PO state
machine, privacy boundary or data-ownership rule requires change.
