# 40 — Stockmok Design System, Brand & Accessibility Audit

**Authorities under audit:** 21 (design system/tokens), 24 (data-viz), 25 (brand), 28 (microcopy), plus component boards (VISUAL-COMP-*) and brand boards (VISUAL-BRAND-*).

---

## 1. Design-system verdict

**DESIGN_SYSTEM: PASS (strong foundation) — REFINE, not rebuild.** The token system in file 21 is professionally specified and is the single best asset in the visual package. It is coursework-safe (implementation-simple) and portfolio-credible. The redesign must inherit it essentially unchanged.

### 1.1 Token audit

| Group | Assessment | Action |
|---|---|---|
| Brand colour (`primary #1D4ED8`, hover `#1E40AF`, subtle `#EFF6FF`) | Single confident blue; white-on-primary **6.70:1** documented | KEEP |
| Neutrals (`bg #F8FAFC`, `surface #FFFFFF`, borders, text ramp) | Quiet slate canvas; text 17.06–17.85:1 | KEEP |
| Status (success/warning/danger/info with subtle pairs) | All ≥6.15:1 on their subtle backgrounds | KEEP |
| Stock status (in/low/out) + icons | Icon **and** colour + label (not colour-only) | KEEP (a11y strength) |
| PO status (draft/pending/active/complete/cancelled) + icons | Icon + label; documented contrast | KEEP |
| Spacing (4→64, 4px base) | Single scale, disciplined | KEEP |
| Radius (6/8/12/full) | Restrained | KEEP |
| Shadow (sm/md/lg) | Restrained elevation | KEEP |
| Type (Inter; display/h1..caption; `mono-num` tabular) | Tabular numerals for money/qty/SKU — correct for an operations product | KEEP |
| Breakpoint `bp-390` | Required mobile viewport, no core-flow h-scroll | KEEP |
| Prohibitions (dark theme, glass, gradients, global search, command palette, decorative motion, stock photos, 6th layout family) | Correctly restrictive | KEEP |

**Finding:** nothing in the token system needs redesign. It is generic-but-correct in the best sense: it will not win a design award for novelty, but it is legible, accessible, and buildable in 13 days. Do **not** let the design phase "spice it up" with gradients/motion (that would raise cost and risk — file 41).

### 1.2 Component audit (COMP-001..010)

| Component | Works | Weakness | Action |
|---|---|---|---|
| Buttons (001) | Variants/sizes/icon | Wizard screens use multiple equal-weight primaries | REFINE (enforce one primary) |
| Fields/forms (002) | States documented | Real screens don't use them — they show spec text instead | REFINE component / REDESIGN screens |
| Tables (003) | Pagination, sticky header, mobile cards | Column-header truncation in renders | REFINE (min-widths / wrap) |
| Badges/status (004) | AA contrast documented; role/PO/network badges | — | KEEP |
| Navigation (005) | Sidebar/drawer/stepper | Stepper not actually used on mapping | REFINE (apply stepper to wizards) |
| Dialogs/drawers (006) | Confirm/adjust patterns | — | KEEP |
| Alerts/toasts (007) | Timeline, success/error | — | KEEP |
| Cards/KPIs (008) | KPI card + loading | — | KEEP |
| Charts (009) | Donut/bar + **text-table alternatives** | — | KEEP (a11y strength) |
| Loading/empty/error (010) | Skeletons match layout; friendly copy | — | KEEP |

**Overall components:** strong and near-complete (25 primitives + 3 charts). The gap is not the components — it is that many *screens* were rendered without using them. REFINE the boards (strip captions), and *use* the components when redesigning screens.

---

## 2. Table & operational-density audit

Inventory/procurement products live or die on table clarity.

| Aspect | Assessment | Action |
|---|---|---|
| Column selection (TABLE-001..027) | Well-chosen (Product/SKU/Category/OnHand+unit/Status/Preferred supplier/Updated/Actions) | KEEP |
| Column order | Logical | KEEP |
| Sorting | Only indexed columns sortable; others not-sortable rather than wrong — excellent honesty | KEEP |
| Filtering/search | Present, bounded | KEEP |
| Row actions | View/Edit/Adjust/Archive, role-filtered | KEEP |
| Bulk actions | Minimal (appropriate for coursework) | KEEP |
| Pagination | 25 rows, cursor Prev/Next, range label | KEEP |
| Density | Comfortable; tabular numerals | KEEP |
| Responsive fallback | Rows → labelled cards | KEEP |
| Units/money/status | Explicit unit; minor-unit money; status pill w/ icon | KEEP |
| **Header truncation** | Renders truncate (ALREADY R…, CONVERTE…) | **REFINE** (min column widths, tooltip, or wrap) |

**Finding:** table *design intent* is excellent. Only truncation and the spec-scaffold form headers need fixing. Keep table-heavy layouts for lists; use summary strips + split panes for detail/receiving (already the mobile pattern).

---

## 3. Forms audit

| Criterion | Current | Action |
|---|---|---|
| Field order | Spec order sound | KEEP intent |
| Required/optional | Spec marks required; renders show "optional" text | REFINE (asterisk + "optional" suffix) |
| Help text | Spec has it; renders show spec sentences as help | REDESIGN copy |
| Defaults | Currency/timezone/warehouse defaults defined | KEEP |
| Validation | Inline, associated errors specified | KEEP intent |
| Unit/currency handling | Explicit unit + minor-unit money | KEEP |
| Disabled/locked | Handle immutable, precision read-only | KEEP |
| Dangerous actions | Danger style + object-named confirm | KEEP |
| Submit hierarchy | One primary intended; renders violate on wizards | REFINE |
| Error feedback | Base-F specified | KEEP |
| Mobile usability | Mobile forms good (007) | KEEP |
| **DB-detail exposure** | Renders expose FORM-###, "SKU normalized/unique", operationId concepts | **REMOVE_FROM_UI** |

**Signature-form focus (mapping/receiving)** is escalated to files 42 and to the master prompt (45) as the highest-priority form redesigns.

---

## 4. Dashboard / data-visualisation audit

Do not assume three charts are correct merely because the pack froze three. Audited for decision value:

| KPI / chart | Who uses it | Decision it supports | Actionable? | Redundant? | Verdict |
|---|---|---|---|---|---|
| Inventory Value (KPI) | Owner/Admin/Analyst | Working-capital awareness; replacement-cost disclosure | Yes | No | KEEP |
| Active SKUs (KPI) | All | Catalogue size | Weakly | No | KEEP |
| Low Stock (KPI) | IM/SK | Triggers reorder/adjust; deep-links | **Yes** | No | KEEP |
| Open POs (KPI) | PM | Procurement load | Yes | No | KEEP |
| Awaiting Receipt (KPI) | SK/PM | Receiving queue | **Yes** | No | KEEP |
| CHART-001 stock-status donut | All | At-a-glance mix | Marginal (KPIs already say it) | Partially redundant with KPIs | KEEP-if-free / first to cut (CUT-0) |
| CHART-002 inventory-by-location bar | IM | Where value sits | Marginal | No | KEEP-if-free |
| CHART-003 PO-status bar (report tab) | PM/Analyst | PO pipeline | Marginal | No | KEEP-if-free |

**Findings:**
- **KEEP the five KPIs** — each supports a real decision and deep-links (per FR-DASH-002). This is the dashboard's strength.
- **Charts are correctly demoted** (P2, CUT-0, lazy-loaded, each with a text-table alternative). No decorative BI charts exist and none should be added. The "dashboard must still look complete with charts removed" rule is correct — verify the redesign honours it.
- **Do not add** trend lines, forecasts, or vanity metrics (would imply Release D analytics that don't exist).

---

## 5. Brand audit

| Element | Assessment | Action |
|---|---|---|
| Name "Stockmok" / stockmok.com | Consistent across all current assets; zero legacy StockFlow paths (file 35) | KEEP |
| Stackline-S mark | Geometry documented as "unmistakable abstract S"; **in practice reads as F/E to a first-time viewer** | **OWNER decision** (ACR-002) |
| Wordmark | Typeset Inter 700, "Stockmok" — clean, legible | KEEP |
| Lockups | Horizontal/reverse/stacked/mono — complete | KEEP |
| Primary blue #1D4ED8 | Confident, professional, AA-safe | KEEP |
| Neutral palette | Quiet slate — appropriate | KEEP |
| Typography | Inter + tabular nums | KEEP |
| Monograms (GO/FF) | Deterministic, AA-safe closed palette, full-name pairing | KEEP (excellent) |
| Icons | Lucide-style | KEEP |
| Empty-state language | Friendly, honest | KEEP |
| Brand hierarchy (platform vs org) | Platform mark small; org monogram+name prominent — correct for wrong-workspace prevention | KEEP |

**Brand findings:**
1. **Letterform recognition (the one real brand issue).** The mark's three-bar-plus-spine construction resolves visually as an "F" or "E", not an "S". Because the product is "Stockmok" (S), a mark that reads as F is a mild but genuine identity weakness for portfolio/first-impression. Options (OWNER): (a) keep — it is distinctive and geometric; (b) refine the glyph so the S reads at a glance; (c) go mark-light and lead with the strong wordmark + monograms. Recommendation: **(b) or (c)**; do not let this block the deadline — the wordmark and monogram system already carry the identity.
2. **BRAND-006 self-acknowledged defect.** The asset register notes BRAND-006's retry-2 "invented color/ratio values" yet marks it APPROVED. SUPERSEDE and regenerate from corrected sources; do not ship a known-wrong brand board.
3. **Distinctiveness vs generic SaaS.** The system is clean but currently indistinguishable from a default admin template. Distinctiveness should come from *product substance* (the connected-mapping/dual-ledger workflow, tenant-isolation storytelling) rather than novel chrome. The design phase may explore a light, restrained expression of personality (e.g., a signature "connected" visual language for the network lane) within approved brand boundaries — **not** gradients/motion.

Do **not** create new brand architecture automatically. Any glyph change is OWNER-gated.

---

## 6. Accessibility audit

The spec's a11y baseline (07 §25, NFR-016) is strong and mostly *designed-in*, but visual claims must be verified in interaction design, not accepted from static renders.

| Criterion | Spec intent | Current evidence | Action |
|---|---|---|---|
| Contrast | AA everywhere; ratios documented in tokens/badges | Strong (documented) | VERIFY in build |
| Keyboard flow | Visible focus everywhere | Specified; not verifiable from static renders | VERIFY_AT_NATIVE / build |
| Focus visible | Required | Specified | Build test |
| Semantic headings | Hierarchy specified | Renders show correct h1/h2 order | KEEP |
| Form labels | Explicit labels, never placeholder-as-label | Specified — but renders sometimes use description-as-label | REFINE copy |
| Error announcement | Associated + announced | Specified | Build test |
| Text+icon status | Yes (stock/PO badges) | Confirmed in COMP-004 | KEEP (strength) |
| Touch targets | 44px | Specified; mobile renders honour it | KEEP |
| Chart alternatives | Text summary beside every chart | **Present** in dashboard/COMP-009 | KEEP (strength) |
| Reduced motion | "almost no motion" | Motion prohibited by tokens | KEEP |
| Screen-reader meaning | Real table headers w/ scope, one dialog at a time | Specified | Build test |
| Lint enforcement | `eslint-plugin-jsx-a11y` as error | Specified in NFR | KEEP |

**Accessibility verdict: PASS on intent; NEEDS_CHANGE on two copy items** (placeholder/description-as-label must become explicit labels; ensure every input has a visible label in the redesign). Do not accept the static renders' a11y as proof — keyboard/focus/announcement are interaction properties to be tested at build (Stage 17 + jsx-a11y).

---

## 7. User-facing vs engineering-copy register (§11 requirement)

Occurrences found in current renders and their classification:

| Occurrence (on-screen) | Example location | Classification |
|---|---|---|
| Raw route pill `/app/:handle/…` | Almost every deterministic render | **REMOVE_FROM_UI** |
| `FORM-0##` heading | 012, 014, 015, 016, 024, 036, 051, etc. | **REMOVE_FROM_UI** |
| `TABLE-0##` label | tables in renders | **REMOVE_FROM_UI** |
| `SCREEN-0## · authoritative Stockmok visual contract` subtitle | most renders + mobile | **REMOVE_FROM_UI** |
| Spec sentences as body/label ("nonnegative money/quantity", "save blocked for seven named error states", "Atomic receipt movement, line quantity…") | 012, 024, 036, others | **CONVERT_TO_USER_MICROCOPY** |
| Step-descriptions as field labels ("Step 3 matched supplier item + buyer product and required unticked semantic checkbox") | 036 | **CONVERT_TO_USER_MICROCOPY** |
| "Authenticated shell anatomy", "Authority resolution — Source 07 and file 20 own precedence…" | 008 | **REMOVE_FROM_UI** |
| "Focus trapped · Esc closes · focus returns to menu button" | 043 | **KEEP_AS_DESIGN_ANNOTATION_ONLY** (move to design notes, not on-screen) |
| Idempotency/operationId phrasing | adjustment/receiving | **CONVERT_TO_USER_MICROCOPY** (e.g., "We saved this once — retrying is safe") |
| Firebase/transaction terms | none found in user copy directly (good) | n/a |

**Rule for the redesign:** these identifiers may live in *design annotations/spec* but must never appear inside final product UI. The master prompt (45) enforces this explicitly.

---

## 8. Gates

| Gate | Verdict |
|---|---|
| DESIGN_SYSTEM | PASS (REFINE) |
| TABLES/DENSITY | PASS (REFINE truncation) |
| FORMS | NEEDS_CHANGE (remove DB detail; real labels) |
| DASHBOARD/DATAVIZ | PASS (5 KPIs keep; charts stay demoted) |
| BRAND | PASS (REFINE; glyph = OWNER) |
| ACCESSIBILITY | PASS on intent; NEEDS_CHANGE on labels; VERIFY at build |
| ENGINEERING-COPY IN UI | **NEEDS_CHANGE** (remove throughout) |
