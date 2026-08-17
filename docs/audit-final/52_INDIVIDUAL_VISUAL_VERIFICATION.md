# 52 — INDIVIDUAL VISUAL VERIFICATION

Closes methodological limitation 2: every current primary visual is now opened **individually** at
readable/native resolution. No montage was used as a final evidence source.

| Family | Count | Individually inspected | Method |
|---|---|---|---|
| Primary `SCREEN-###` contracts (001–052) | 52 | **52/52** | 51 at native 1280×900; SCREEN-043 at native 390×844 |
| Mobile-priority visuals (`MOBILE-001…011` + SCREEN-043) | 12 | **12/12** | native 390×844 / 390×1200 |
| State boards | 11 | **11/11** | readable scale 1536×1100–1200 |
| Component boards | 10 | **10/10** | readable scale |
| Brand boards | 5 | **5/5** | readable scale |
| Showcase/review boards | 16 | board-level | already dispositioned SUPERSEDE (DI-019); derived from screens under redesign |

**Distinct assets individually inspected: 89** — 51 desktop-resolution screens + 12 mobile-resolution
visuals (SCREEN-043 counted once, in the mobile row) + 11 state + 10 component + 5 brand boards.

`CONTENT_READABLE: YES` for all individually-inspected assets except **VISUAL-BRAND-006**
(tiles illegible — that *is* the defect) and **VISUAL-STATE-006** (table cells reduced to ellipses).

---

## 1. Verdict changes produced by individual inspection

Individual inspection **refuted or narrowed three previously-accepted findings**. These are
evidence-based changes, not re-scoring.

### CHANGED — DI-005 "Desktop Stock Adjustment scaffold" → **REFUTED. Reclassify REDESIGN → REFINE**
`VISUAL-SCREEN-016` at native resolution is a correctly designed modal: *Adjust stock* /
*Chicken Breast / MEAT-001*, **Current balance 18 KG**, Direction *Increase*, **Quantity 2** with a
`KG` unit hint, **Reason \* "Recount correction"** (required, filled), **Result 20 KG**, and a clean
Cancel / **Confirm adjustment** pair with a single primary. Arithmetic 18 + 2 = 20 is correct.
Only defects: the spec fragment *"Movement — Recorded atomically after confirmation"*, and the
underlying page carries the ID caption and route pill. **This screen needs copy removal, not redesign.**

### CHANGED — DI-007 "Private PO Builder scaffold" → **REFUTED. Reclassify REDESIGN → REFINE**
`VISUAL-SCREEN-022` already has the exact stepper the audit demanded: **Supplier ✓ → Items (2) →
Delivery and notes (3) → Review (4)**, labelled *"Items · Step 2 of 4"*, with real values
(*Green Farm*, *Chicken Breast / MEAT-001*, **50 KG**, **LKR 1,200.00**), a correct line summary
**"50 KG × LKR 1,200.00 = LKR 60,000.00"**, correct **Subtotal LKR 60,000.00**, and a single primary
(*Back / Save draft / **Continue***). Defects are the two spec rows (*"Review-only action — Place order
appears only on the Review step"*, *"Later steps — Expected date and optional notes"*) plus the ID
caption and route pill.

### CHANGED — DI-004 scope narrowed: **remove SCREEN-042 from the scaffold list**
`VISUAL-SCREEN-042` is a well-formed dialog with correct helper copy
(*"Available only before a movement exists for this product and warehouse."*), Product / Unit `KG` /
Warehouse *Cold Room* / **Quantity 18**. REFINE, not REDESIGN. DI-004 remains valid for
SCREEN-012, 013, 014, 015.

### CONFIRMED and ESCALATED — DI-011 table truncation: **MEDIUM → HIGH**
Truncation affects **values as well as headers, on the dashboard itself**. `SCREEN-044/045/047`:
headers `ACT… ACTI… OBJ… TIME`, `PRO… ON … MIN… ACTI…`, `N… SU… KI… ST… TO…`, `QUANTITY/VA…`
and values `LKR 292,800.0…`, `LKR 271,400.0…`. `SCREEN-034` renders two adjacent identical headers
`INTERNAL… INTERNAL…`. `STATE-006` reduces every header to an ellipsis while ~800 px sits unused.

### CONFIRMED with precision — DI-014 state boards
Only **3 of 11** state boards are designed frames: STATE-001 (8 cards), STATE-010 (6), STATE-011 (7).
**STATE-005 and STATE-008 contain no drawn UI at all.** STATE-007 and STATE-009 collapse 11 and 9
states into a single paragraph numbered "1". Loading fails almost everywhere against the governing
rule (*layout-shaped skeleton; never a blank page with a centred spinner*): COMP-008 renders the
literal word **"Loading"** in large bold type in five KPI cards, and BRAND-005 uses a **centred
circular spinner** — the exact named anti-pattern. Empty states fail the icon clause everywhere.

### CONFIRMED verbatim — DI-020 board captions
*"authoritative Stockmok visual contract"* appears as subtitle text on **nine** boards: STATE-001,
STATE-010, STATE-011, COMP-005, COMP-006, COMP-007, COMP-008, COMP-009, COMP-010.
**Correction:** file 27 legitimately authorises VISUAL-ID and route captions on `BOARD-###`/`REVIEW-###`
artefacts (*"Label each crop only with its exact VISUAL-ID and exact existing screen title"*), so those
16 assets must be **excluded** from the DI-002 screen count.

### RE-CHARACTERISED — DI-015 BRAND-006
Not merely "known-wrong yet approved". It is the **wrong artefact**: a 2×2 contact sheet of
downscaled screenshots of BRAND-002/003/004/005, in which contrast ratios, hex codes and the 16 px
silhouette QA marks are unreadable. File 25 §4 specifies an **originally designed** board
(*"Mark, wordmark, colour/type tokens, icon language, placeholder/empty-state style, application and
public-header examples, prohibited treatments"*). **Documented cause:** file 32 L99 assigns
`PROMPT-BRAND-006` the method `COMPOSITE_REVIEW_BOARD`, contradicting file 25 §4 and file 26 L479.

### RESTATED — DI-008 Private vs Connected
The distinction is **not** carried only by a pill: `SCREEN-021` and `SCREEN-049` both have a dedicated
`PRIVATE/CONNECTED` column. The real defect is that the column header truncates to
`PRIVATE/CON…` and there is no structural or chromatic differentiation. Severity stays HIGH; the
remedy is unchanged.

### CONFIRMED as the highest-value evidence for DI-002 — three prompt-dump panel patterns
Previously unrecorded. Screens render a dedicated panel whose body is the **raw generation prompt**:
- **"Canonical data" / "Exact source data"** — SCREEN-021, SCREEN-031, SCREEN-037.
  e.g. SCREEN-021: *"private PO `PO-0042` Ordered to Green Farm and connected `CPO-0001` Shipped from
  Fresh Foods Ltd, with explicit badges and icon+text statuses. Actions: View, Edit only Draft… State: populated."*
- **"Fields"** — SCREEN-013, SCREEN-019, SCREEN-025, SCREEN-034.
  SCREEN-013 begins with the instruction word: *"**exactly** Name Chicken Breast, SKU MEAT-001, … Include
  compact Stock-by-warehouse and recent-movements previews using declared columns only."*
  SCREEN-034 prints *"`TABLE-021`: Internal Product, Internal SKU, Partner SKU, Order Unit, Availability,
  Published, Action."* and begins mid-sentence with *"are shared."*
- **Spec sentences as button labels** — SCREEN-023 *"Edit absent once Ordered"*; SCREEN-031
  *"Disable absent for Procurement Manager"*; SCREEN-039 *"Mark as shipped absent until Accepted"*;
  SCREEN-034 *"Publish/Edit opens dialog"*, *"Unpublish uses a named confirmation"*;
  STATE-003 *"Try again. Use frozen light modal/sheet language"*; STATE-005 *"Try again. Frozen light UI"*.
- **SCREEN-050** renders only the prompt: *"Content: the full invitation link in a bounded code-like field
  once and warning "This link will not be shown again."   State: `STATE-042` one-time link."*

---

## 2. NEW defects found only by individual inspection

| ID | Severity | Defect | Evidence |
|---|---|---|---|
| **DI-021** | HIGH | Product List renders **6 of 12** seeded SKUs; header reads *"Showing 1–6 of 6"* while every dashboard shows **Active SKUs 12** and a donut totalling 12. Page size is 25, so all 12 fit. | SCREEN-011; file 16 §7.2 |
| **DI-022** | HIGH | Movement History **TIME column contains labels, not timestamps** — *"Opening balance"*, *"Private receipt 1"*, *"Connected receipt 2"* — duplicating the Type column. No timestamp appears on any screen; file 28 defines **no date/time format standard**. | SCREEN-017; file 19 TABLE-006 *"Sort time only"*; file 18 §10 |
| **DI-023** | HIGH | **Tenant-context errors.** SCREEN-039 (Connected PO — *Supplier*) renders header org **"GO Grand Ocean Hotel"** while its route is `/app/freshfoods/…` — the buyer's identity in the supplier's shell. MOBILE-007 replaces the org block with a route chip `/app/…`. MOBILE-011's drawer has no org, monogram or role at all. | file 22 §1 *"Current organization monogram, full name, role … remain visible in the shell"*; file 19 §5.4 *"Wrong organization denied"* |
| **DI-024** | MEDIUM | System-generated timestamps render as `—` (Created, Verified By/At, Expected) and warehouse **Updated renders the literal text "Seed snapshot"** on SCREEN-015 and MOBILE-006. | SCREEN-015, 020, 021, 033, 037 |
| **DI-025** | HIGH | Stock-on-Hand Report **misattributes three Cold Room products to Main Store** (Fresh Milk, Butter Block, Cheddar Cheese) and shows 6 of 12 rows with **no total row and no visible warehouse-filter chip**, so it cannot be read as a filtered view. Row values themselves are correct (Cold-Room final = LKR 398,900; 292,800 + 398,900 = 691,700). | SCREEN-048 vs seed §7.2 |
| **DI-026** | MEDIUM | **Cross-visual SKU/category drift.** MOBILE-005 shows `SEA-001 Fish Fillet / Seafood` and `DAIRY-001/002/003`; desktop SCREEN-011 and the seed use `MEAT-003 Fish Fillet / Meat` and `DAIR-001/002/003`. | MOBILE-005 vs SCREEN-011 vs file 16 §7.2 |
| **DI-027** | MEDIUM | SCREEN-010 renders the **seed** state (LKR 564,200.00) although its spec row requires the *"final LKR 691,700 state"*. MOBILE-004 inherits the same. | file 22 SCREEN-010 row |
| **DI-028** | HIGH | **STATE-008 arithmetic error.** Row 11 reads *"conversion `10 PACK = 50 KG`, LKR 12,500.00"*. At the board's own LKR 1,250/KG, 50 KG is **LKR 62,500.00**; 12,500 is the 10-KG figure copied from row 7. This is the only arithmetic error in the package and it sits on the connected-PO board. | STATE-008 |
| **DI-029** | MEDIUM | **Role-token leakage in the role badge.** MOBILE-001/002 render `anyone`; MOBILE-003 renders `Inventory Manager \| Viewer` — a pipe-joined union of two workspace roles, not a role. | MOBILE-001, 002, 003 |
| **DI-030** | MEDIUM | **Accessibility-implementation copy rendered as UI**: *"Low stock — table alternative"*, *"Inventory by location — table alternative"*, *"Chart alternatives"*, *"Stock status alternative"* as visible headings; SCREEN-043 footer *"Focus trapped · Esc closes · focus returns to menu button"*. | SCREEN-044/045/046/047, MOBILE-004, SCREEN-043 |
| **DI-031** | MEDIUM | **Duplicate, conflicting contract for one screen.** MOBILE-011 and SCREEN-043 both claim the 390 px navigation drawer. SCREEN-043 is excellent (monogram, org, role badge, icons, *Current* pill, count 3). MOBILE-011 has no org context, uses a bullet for Notifications, and its underlying page is a visible prompt dump. | MOBILE-011 vs SCREEN-043 |
| **DI-032** | MEDIUM | **Design-token contradictions inside the component boards**: radius **6 px** (COMP-001, BRAND-002) vs **8 px** (COMP-002 footer); danger **#B91C1C** (COMP-001) vs error **#D92D20** (COMP-002). | COMP-001 vs COMP-002 |
| **DI-033** | HIGH | **COMP-001 is a button board that draws no buttons.** All four variants × five states are text rows (*"Default · hover · visible focus · disabled · loading"*); five IconButtons are listed with no icons drawn. The component sheet is a required coursework deliverable (file 17 §14/§16 *"Never cut the component sheet"*). | COMP-001 |
| **DI-034** | MEDIUM | **Missing-glyph icon.** An identical hollow square stands in for the empty-state icon on COMP-009 and all three COMP-010 empties, and on MOBILE-004 and SCREEN-046. Semantically empty and identical across different states. | COMP-009, COMP-010, MOBILE-004, SCREEN-046 |
| **DI-035** | LOW | **Duplicate row.** SCREEN-047 "Needs attention" items 3 and 4 are identical (*"Receiving — No purchase orders are ready to receive. Open Receiving."*). | SCREEN-047 |
| **DI-036** | MEDIUM | **Shell inconsistency across screens.** Org block sits left of the logo on SCREEN-029 and right on SCREEN-030; avatar is `NP` on SCREEN-009/026/037 and `U` on 20+ others; the notification bell is present on 009/026/052 and replaced by a diamond glyph elsewhere; the ID caption appears on SCREEN-046 but not 044/045/047. | 25+ screens |
| **DI-037** | LOW | **Non-encoding bar chart.** COMP-009 and SCREEN-049 render all PO-status bars at identical full width regardless of value (including zeros). | COMP-009, SCREEN-049 |
| **DI-038** | LOW | **PO status disagreement across visuals.** SCREEN-021/020/033 show PO-0042 *Ordered* and CPO-0001 *Shipped*; SCREEN-049 shows both *Received*. Both are legal chain states, but the board set silently spans three points in time with no as-at labelling. | SCREEN-021 vs 049 |
| **DI-039** | LOW | **COMP-007 timeline mis-sequenced** — numbered 1 = *Shipped 14:30*, 2 = *Accepted 10:15*; ordinal numbering on reverse-chronological rows implies the wrong causal order. | COMP-007 |
| **DI-040** | LOW | **COMP-008 numeric overflow** — *"LKR 564,200.00"* wraps and breaks its KPI card boundary, despite tabular numerals being a frozen token. | COMP-008 |

**Not raised (cleared by authority — see file 51 F-08):** Storekeeper/Viewer seeing inventory
valuation; Reports absent from the Storekeeper sidebar; the Stock-on-Hand row arithmetic; the
dashboard warehouse split; `Expected` rendering as `—`.

---

## 3. Assets confirmed GOOD by individual inspection (the quality bar)

Individual inspection materially improves the picture of the **foundation tier**, which montage
review had flattened. These are near-shippable after copy removal:

**Desktop:** SCREEN-001 (public home), 002 (sign-up), 005 (invitation accept), 006 (workspace
selector), 007 (onboarding — real 4-step stepper, handle availability tick, immutability note,
"Next steps preview" chips), 009 (empty dashboard — setup checklist with **disabled-with-reason**
*"Available after you add a product."*), 016, 017, 020, 022, 026, 029 (permission denied — role list +
contextual primary), 030, 033, 041, 042, 046, 048, 049, 052.

**Mobile:** MOBILE-004, 005, 006 (product detail — tabs, full field set, correct values), 007, 008,
**009 (receiving — 4-step stepper, 20 → 60, outstanding 10, second receipt 60 → 70 outstanding 0, all
correct)**, 010, and **SCREEN-043** (drawer with monogram, org, role badge, *Current* pill, count).

**Boards:** **COMP-002** (full default/hover/focus/error/disabled matrix, `aria-describedby` documented,
counters correct) and **COMP-003** (11 table states including a genuinely layout-shaped skeleton and a
compliant empty state) are professional-grade and should be preserved as the design-system reference.
**COMP-004** documents measured contrast ratios (6.49, 6.15, 6.80, 9.45, 7.15, 8.01 : 1) and states
*"Never colour-only"*.

---

## 4. Owner decision DI-O1 — independent letterform read

Inspected across BRAND-002 construction grid, BRAND-003 lockups, BRAND-004 at 16/24/32/48 px and
BRAND-006 tiles. **Independent verdict: the mark reads as an "F", not an "S".**

The specification is *"three equal 4-unit horizontal bars, alternating left/right alignment, joined by
one 4-unit vertical spine"*. As executed, the spine is a **single straight vertical placed left of
centre** and all three bars attach to it as orthogonal arms. A straight stem with orthogonal arms is
the skeleton of F/E/T; an S requires a **reversing** spine that closes right at the top and left at the
bottom. At 16 px and 24 px the glyph resolves to an unambiguous bold **F**. In BRAND-003 the lockup
reads **"F Stockmok"** — worse than neutral, since it implies a wrong initial for a brand beginning
with S. **This strengthens the case for the mark-light option in ACR-002.**

## ALL_PRIMARY_VISUALS_INDIVIDUALLY_INSPECTED: **YES (52/52)**
## ALL_MOBILE_PRIORITY_VISUALS_INDIVIDUALLY_INSPECTED: **YES (12/12)**
## ALL_STATE_AND_COMPONENT_BOARDS_INSPECTED: **YES (21/21, plus 5 brand boards)**
