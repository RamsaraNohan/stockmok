# Stockmok Final Brand, Logo, and Visual Asset Plan

**Status:** `BRAND_ARCHITECTURE_FREEZE = PASS`  
**Scope:** controlled Stockmok adaptation of the frozen Stackline-S family; production logo artwork remains `DESIGN_AS_VECTOR`. Open-ended exploration is historical only.  
**Prompt ownership:** prompt bodies belong only in file 26. This file registers forward references and must not duplicate those bodies.

## 1. Evidence and originality boundary

No separate logo or brand-reference file was supplied. The v2 showcase is the only available operational-density/ERP-style reference; it may influence calm density and hierarchy only. Its crown/hotel imagery, generated logo, photography, claims, colours, and layouts are not brand source material and must not be copied. The v3 showcase is a UI-improvement reference, not a logo authority.

The Stockmok identity must be built from first principles around inventory control, procurement movement, reconciliation, and connected businesses. It must not resemble NetSuite trade dress or any supplied generated mark. Generated raster boards are approval evidence only—not production logo assets, not vectors, and not proof of trademark availability.

## 2. Exploration concepts and scoring

Scoring uses 1 (weak) to 5 (strong). A concept requires at least 4 in every criterion; highest total wins before screen generation.

| Concept ID | Concept | Inventory/procurement recognition | Silhouette | Small-size clarity | Implementation simplicity | Total / 20 | Decision |
|---|---|---:|---:|---:|---:|---:|---|
| `BRAND-CONCEPT-01` | **Stackline S** — three horizontal inventory bars form an abstract S; one vertical connector implies controlled movement between stock and order states | 5 | 5 | 5 | 5 | **20** | **SELECTED** |
| `BRAND-CONCEPT-02` | Linked cartons — two open-box outlines joined by a transfer line | 5 | 4 | 3 | 4 | 16 | Rejected: carton detail degrades at favicon size |
| `BRAND-CONCEPT-03` | Ledger flow — ledger rows terminating in a forward arrow | 4 | 3 | 4 | 5 | 16 | Rejected: reads as generic finance/task mark |

### Selected family: Stackline S

- **Mark geometry:** a square 24-unit grid; three equal 4-unit horizontal bars, alternating left/right alignment, joined by one 4-unit vertical spine to produce an unmistakable abstract “S”. Corners use the same proportional rounding as `radius-sm`; no arrowhead is required at small sizes.
- **Meaning:** stacked bars = inventory records/shelves; continuous spine = auditable flow; S silhouette = Stockmok. It does not promise shipping, sales, forecasting, AI, or a marketplace.
- **Colour:** primary mark `#1D4ED8` on white; reverse mark white on `#1D4ED8`; one-colour black and white versions are mandatory. No gradient.
- **Wordmark:** “Stockmok” in the frozen system sans family at 700 weight, normal tracking; capital S followed by lowercase `tockmok`. The wordmark is typeset, not custom-drawn lettering.
- **Lockups:** horizontal mark + wordmark is default; mark-only for favicon/app icon; stacked lockup only where horizontal space is unavailable.
- **Exclusion zone:** at least one internal bar height (`x`) around the full lockup. Minimum digital size: mark 16 px, horizontal lockup 96 px wide. At 16 px remove the spine’s optional optical notch and use the simplified filled silhouette.
- **Prohibited treatments:** rotation, outline-only micro mark, shadows, gradients, container shapes, extra arrows, photographic fill, perspective/isometric rendering, and unapproved taglines.

Selection is frozen for downstream screen generation. Brand QA may correct optical alignment without changing the concept.

## 3. Product identity system

| Asset ID | Asset | Exact behavior | Production status |
|---|---|---|---|
| `ASSET-BRAND-001` | Primary horizontal lockup | Stackline S at left, “Stockmok” at right; blue on light surface | `DESIGN_AS_VECTOR` |
| `ASSET-BRAND-002` | Reverse horizontal lockup | White mark and wordmark on solid primary blue | `DESIGN_AS_VECTOR` |
| `ASSET-BRAND-003` | Standalone mark | Square S silhouette; blue, black, and white masters | `DESIGN_AS_VECTOR` |
| `ASSET-BRAND-004` | Favicon/app-icon set | Simplified filled mark at 16, 24, 32, 48, 180, 192, and 512 px; solid light or primary background only | `DESIGN_AS_VECTOR`, raster exports after approval |
| `ASSET-BRAND-005` | Organization monogram | Two uppercase initials, deterministic organization colour, white foreground after contrast check; 24/32/48 px circular display | Runtime token composition, not uploaded artwork |
| `ASSET-BRAND-006` | Product placeholder | Neutral package icon from Lucide in a `surface-subtle` square; no photography and no branded product inference | Component composition |
| `ASSET-BRAND-007` | Empty-state illustration language | Maximum three simple 1.5 px slate line forms plus one primary accent; composed sparingly from approved Lucide motifs | `DESIGN_AS_VECTOR` only if actually required |
| `ASSET-BRAND-008` | Emulator ribbon | Amber text label “EMULATOR”; clearly non-production and outside the logo lockup | UI token composition |

### Organization monogram contract

The organization monogram is first-class identity, not a logo placeholder. Use the first characters of the first two meaningful organization-name words; for a one-word name, use its first two characters. Normalize to uppercase display text. Background colour is deterministically derived from organization ID from a closed AA-safe palette; foreground is selected as `#FFFFFF` or `#0F172A` only after a measured ≥4.5:1 contrast check. The header pairs the monogram with the untruncated organization name. No logo-upload interface is designed; an existing optional `logoUrl` may render, but loading/error falls back to the monogram.

## 4. Generated brand-board register

These IDs are forward references to unique prompt records in file 26 and unique visual records in files 31–32. File 26 must contain the full self-contained prompt text exactly once. Generated outputs use controlled opaque backgrounds; transparency is not required.

| Prompt ID | Visual ID | Method | Board purpose | Required content | Registered output path |
|---|---|---|---|---|---|
| `PROMPT-BRAND-001` | `VISUAL-BRAND-001` | `RETIRED / SUPERSEDED_REFERENCE` | Historical StockFlow exploration only | Not generated for Stockmok; evidence preserved without counting toward current coverage | `visual-designs/generated/25_superseded/stockflow-brand/VISUAL-BRAND-001_stockflow-logo-exploration_pre-stockmok.png` |
| `PROMPT-BRAND-002` | `VISUAL-BRAND-002` | `GENERATE_BOARD` | Selected-family refinement | Stackline S construction grid, positive/reverse/monochrome, optical corrections, exclusion zone, minimum sizes | `visual-designs/generated/01_brand/VISUAL-BRAND-002_selected-stackline-s.png` |
| `PROMPT-BRAND-003` | `VISUAL-BRAND-003` | `GENERATE_BOARD` | Wordmark and lockups | Primary/reverse horizontal and stacked lockups; exact “Stockmok” capitalization; safe-space and misuse examples | `visual-designs/generated/01_brand/VISUAL-BRAND-003_wordmark-lockups.png` |
| `PROMPT-BRAND-004` | `VISUAL-BRAND-004` | `GENERATE_BOARD` | Icon and favicon board | Mark-only master plus legibility previews at 16/24/32/48 px and app-icon crops; no transparency dependency | `visual-designs/generated/01_brand/VISUAL-BRAND-004_icon-favicon.png` |
| `PROMPT-BRAND-005` | `VISUAL-BRAND-005` | `GENERATE_BOARD` | Organization monogram system | 24/32/48 px examples, deterministic safe palette, image fallback, full-name header pairing, contrast annotations | `visual-designs/generated/01_brand/VISUAL-BRAND-005_monogram-system.png` |
| `PROMPT-BRAND-006` | `VISUAL-BRAND-006` | `GENERATE_BOARD` | Complete brand-system board | Mark, wordmark, colour/type tokens, icon language, placeholder/empty-state style, application and public-header examples, prohibited treatments | `visual-designs/generated/01_brand/VISUAL-BRAND-006_complete-brand-system.png` |

**Prompt exclusions for every board:** no crown, hotel photography, warehouse photograph, 3D/cartoon render, gradient, glass effect, dark theme, custom UI icon set, customer logos, testimonials, awards, pricing, uptime, analytics claims, AI, forecasting, marketplace, storefront, checkout, POS, Release B-PLUS, C, or D.

## 5. Vector production method

Generated boards must never be auto-traced into the shipping logo. After human approval, construct the mark manually as editable vector geometry:

1. Build on the defined 24-unit grid using integer-aligned rectangles and boolean unions; keep the working shapes non-destructive until optical review.
2. Produce blue, reverse-white, black, and white masters. Convert the final mark geometry to paths; keep the wordmark as live text in the editable master and outline only in distribution exports.
3. Validate silhouette at 16, 24, 32, and 48 px at 1× and 2×. Remove details that blur; do not change the Stackline S concept.
4. Export optimized SVG with a `viewBox`, no embedded raster, no masks unless essential, no external fonts, no metadata claims, and `currentColor` only for the mark-only UI variant.
5. Export favicon/application PNGs from the approved vector master—not from generated boards—and inspect every raster at native size.
6. Preserve an editable source, outlined distribution master, SVG, and checksum manifest. Record creator/date/version and human approval.
7. Run a human originality and trademark-conflict review before public release. Internal selection is not legal clearance.

Until these steps and human approval occur, every final-logo row remains `DESIGN_AS_VECTOR`; raster review boards must not be presented as production assets.

## 6. Brand QA and freeze criteria

| Check | Acceptance |
|---|---|
| Originality boundary | No supplied/generated/third-party mark copied |
| Concept selection | `BRAND-CONCEPT-01 Stackline S` frozen before screen generation |
| Recognition scoring | Selected concept scores ≥4/5 in all four criteria |
| Small-size legibility | Human-inspected at 16/24/32/48 px in colour and monochrome |
| Contrast | Primary/white **6.70:1**; monogram foreground individually ≥4.5:1 |
| Production format | Final logo remains `DESIGN_AS_VECTOR`; generated PNGs are approval references only |
| Prompt traceability | `5/5` approved Stockmok brand prompts map one-to-one; the sixth stable contract is explicitly retired and preserved as a superseded reference |
| Scope/honesty | No invented proof or Release B-PLUS/C/D claims |
| `BRAND_ARCHITECTURE_FREEZE` | `PASS` |
