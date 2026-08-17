# Stockmok Final Design System and Component Inventory

**Status:** `UI_ARCHITECTURE_FREEZE = PASS`  
**Authority:** files 07, 10, and 17 in `Stockmok_Final_Control_Pack_v4`  
**Applies to:** Release A and Release B-Lite only  
**Implementation posture:** design authority only; no production code is created by this document.

## 1. Frozen design direction

Stockmok is a light-first operational SaaS interface: white working surfaces on a quiet slate background, compact tables, comfortable forms, restrained elevation, and one action blue. It uses one system sans-serif family, Lucide-style icons, tabular numerals for quantities and money, and almost no motion. Dark theme, glass effects, gradients, global search, command palettes, decorative animation, stock photography, and a sixth page-layout family are prohibited.

The complete page-layout vocabulary is exactly five families:

1. **List:** PageHeader, FilterBar, DataTable/card fallback, cursor Pagination.
2. **Detail with tabs:** PageHeader, summary Card/KPIs, Tabs, section tables or Timeline.
3. **Form:** PageHeader, one-column or paired Field wrappers, sticky/visible actions.
4. **Wizard:** PageHeader, Stepper, one focused step, back/continue actions, review step.
5. **Dashboard:** PageHeader, KPI cards, Needs Attention, operational panels, optional charts secondary to tables.

Dialogs, sheets, dropdowns, toasts, and the application shell are compositions/overlays, not additional page families or primitives.

## 2. Master token table

All values below are frozen. Colour ratios were calculated with the WCAG 2.x relative-luminance formula. Borders marked “structural” are not used as the sole indicator of state; meaningful controls use `border-strong` or the focus ring.

| Group | Token | Value | Intended use / measured contrast |
|---|---|---:|---|
| Brand colour | `primary` | `#1D4ED8` | Primary controls; white text is **6.70:1** |
| Brand colour | `primary-hover` | `#1E40AF` | Primary hover/pressed; white text is **8.72:1** |
| Brand colour | `primary-subtle` | `#EFF6FF` | Selected rows/navigation and Connected badge background; `#1E40AF` text is **8.01:1** |
| Brand colour | `primary-contrast` | `#FFFFFF` | Text/icon on `primary` |
| Neutral colour | `bg` | `#F8FAFC` | Application canvas; `text` is **17.06:1** |
| Neutral colour | `surface` | `#FFFFFF` | Cards, forms, tables; `text` is **17.85:1** |
| Neutral colour | `surface-subtle` | `#F1F5F9` | Table header, neutral badge, inset region |
| Neutral colour | `border` | `#CBD5E1` | Structural separators only; never the sole control/state cue |
| Neutral colour | `border-strong` | `#64748B` | Meaningful control boundary; **4.76:1** on `surface` |
| Neutral colour | `text` | `#0F172A` | Primary text |
| Neutral colour | `text-muted` | `#475569` | Secondary text; **7.58:1** on `surface` |
| Neutral colour | `text-subtle` | `#64748B` | Captions/placeholders; **4.76:1** on `surface` |
| Status colour | `success` | `#166534` | Success foreground; on `success-subtle` is **6.49:1** |
| Status colour | `success-subtle` | `#DCFCE7` | Success background |
| Status colour | `warning` | `#854D0E` | Warning foreground; on `warning-subtle` is **6.15:1** |
| Status colour | `warning-subtle` | `#FEF3C7` | Warning background |
| Status colour | `danger` | `#991B1B` | Danger foreground; on `danger-subtle` is **6.80:1** |
| Status colour | `danger-subtle` | `#FEE2E2` | Danger background; destructive solid may use `#B91C1C`, white text **6.47:1** |
| Status colour | `info` | `#1E40AF` | Information foreground; on `info-subtle` is **7.15:1** |
| Status colour | `info-subtle` | `#DBEAFE` | Information background |
| Stock status | `in-stock` | `#166534` / `#DCFCE7` | Check icon + “In stock”; **6.49:1** |
| Stock status | `low-stock` | `#854D0E` / `#FEF3C7` | Triangle-alert icon + “Low stock”; **6.15:1** |
| Stock status | `out-of-stock` | `#991B1B` / `#FEE2E2` | Circle-x icon + “Out of stock”; **6.80:1** |
| PO status | `draft` | `#334155` / `#F1F5F9` | File-pen icon + “Draft”; **9.45:1** |
| PO status | `pending` | `#854D0E` / `#FEF3C7` | Clock icon; Ordered/Submitted; **6.15:1** |
| PO status | `active` | `#1E40AF` / `#DBEAFE` | Progress icon; Accepted/Shipped/Partially received; **7.15:1** |
| PO status | `complete` | `#166534` / `#DCFCE7` | Check icon + “Received”; **6.49:1** |
| PO status | `cancelled` | `#991B1B` / `#FEE2E2` | Circle-x icon; Rejected/Cancelled; **6.80:1** |
| Spacing | `space-1..10` | `4, 8, 12, 16, 20, 24, 32, 40, 48, 64px` | Only spacing scale; 4 px base grid |
| Radius | `radius-sm` | `6px` | Buttons, pills, compact controls |
| Radius | `radius-md` | `8px` | Inputs, cards, table containers |
| Radius | `radius-lg` | `12px` | Dialogs, sheets, large panels |
| Radius | `radius-full` | `9999px` | Pills, badges, avatars/monograms |
| Shadow | `shadow-sm` | `0 1px 2px rgb(15 23 42 / 0.06)` | Raised card only when hierarchy needs it |
| Shadow | `shadow-md` | `0 8px 20px rgb(15 23 42 / 0.12)` | Dropdowns/popovers |
| Shadow | `shadow-lg` | `0 20px 40px rgb(15 23 42 / 0.18)` | Dialogs/mobile sheets |
| Type | `font-sans` | `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` | One family; use system fallback without visual substitution requirements |
| Type | `display` | `36/44px, 700` | Public-home hero only |
| Type | `h1` | `30/38px, 700` | Page title; mobile `24/32px` |
| Type | `h2` | `24/32px, 650` | Major section; mobile `20/28px` |
| Type | `h3` | `18/26px, 600` | Card/dialog title |
| Type | `body` | `16/24px, 400` | Default copy and form values |
| Type | `body-sm` | `14/20px, 400` | Tables, secondary controls |
| Type | `caption` | `12/16px, 500` | Metadata; never below 12 px |
| Type | `mono-num` | `14/20px, 500; font-variant-numeric: tabular-nums` | Money, quantity, SKU and tabular dates; remains in `font-sans` |
| Breakpoint | `bp-390` | `390px` | Required mobile design viewport; no horizontal core-flow scroll |
| Breakpoint | `bp-768` | `768px` | Tablet; compact drawer/list adaptations |
| Breakpoint | `bp-1024` | `1024px` | Desktop shell/sidebar threshold |
| Breakpoint | `bp-1280` | `1280px` | Standard desktop design viewport |
| Breakpoint | `bp-1536` | `1536px` | Wide viewport; content remains capped |
| Layout | `content-max` | `1440px` | Centred app content maximum width |
| Layout | `sidebar-expanded` | `256px` | Fixed desktop sidebar with text labels |
| Layout | `sidebar-collapsed` | `72px` | Desktop only; tooltips expose labels |
| Layout | `header-height` | `64px` | Desktop and mobile application header |
| Layout | `focus-ring` | `0 0 0 2px #FFFFFF, 0 0 0 4px #1D4ED8` | Visible on light and blue-adjacent surfaces; blue vs `bg` **6.41:1** |
| Motion | `motion-fast` | `150ms ease-out` | Dialog/dropdown/toast opacity only; no page transitions |

## 3. Layout and responsive rules

| Range | Shell | Grid and spacing | Tables/forms |
|---|---|---|---|
| `390–767px` | 64 px header; sidebar becomes modal slide-over; monogram, full organization name and bell remain | 16 px page gutter, 16 px vertical rhythm, single column | R2 tables become labeled cards; form controls and primary actions are at least 44 px high; dialogs become full-height sheets where specified |
| `768–1023px` | Drawer or compact sidebar by screen density | 24 px gutter; one or two columns | Tables may scroll inside their bounded region only when card conversion is not required; forms max 640 px |
| `1024–1279px` | 256 px expanded or 72 px collapsed sidebar | 24 px gutter; dashboard up to 2 columns | Semantic tables; sticky header allowed; paired form fields where related |
| `1280–1535px` | Desktop shell | 32 px gutter; dashboard up to 12-column composition | Primary design viewport; list/table density is compact |
| `1536px+` | Desktop shell, no content stretching beyond 1440 px | 40 px outer breathing room around capped content | Column widths remain readable; unused space stays neutral |

The header always shows the Stockmok mark, organization monogram plus untruncated name, active-role Badge, conditional workspace switcher, notification bell with unread count, and user menu. `NETWORK` navigation is absent when Release B is disabled; authenticated direct access then resolves to 404. Sidebar entries are role-filtered. Mobile navigation is a focus-trapped slide-over composed from Modal, Button/IconButton, Badge, and Monogram.

## 4. Exhaustive component inventory — exactly 25

The `COMP-###` namespace is frozen. A perceived “26th component” must be composed from these primitives.

| ID | Component | Required variants and states | Frozen behavior |
|---|---|---|---|
| `COMP-001` | Button | primary, secondary, ghost, danger × default, hover, focus, disabled, loading | 40 px desktop/44 px mobile minimum height; loading preserves width, announces progress, and blocks double submit |
| `COMP-002` | IconButton | primary, secondary, ghost, danger × default, hover, focus, disabled, loading | 40×40 desktop/44×44 mobile; required accessible name; tooltip when meaning is not visible |
| `COMP-003` | Input | default, hover, focus, error, disabled, prefix/suffix | Visible label via Field wrapper; unit/currency is readable text; error boundary and message appear together |
| `COMP-004` | Select | default, open, focus, error, disabled | Radix Select behavior; keyboard navigation; selected value and label announced |
| `COMP-005` | Textarea | default, focus, error, disabled | Visible character guidance where constrained; resize vertical only |
| `COMP-006` | Checkbox / Switch | on, off, hover, focus, disabled | Checkbox for selection/consent; switch only for immediate settings; state never colour-only |
| `COMP-007` | Field wrapper | label, hint, error, required marker | Label always visible; hint precedes error; `aria-describedby` binds help/error; required status stated in text/symbol |
| `COMP-008` | Card | plain, header, footer action, interactive focus | White 1 px bordered surface; shadow only for meaningful elevation; interactive card exposes one clear target |
| `COMP-009` | KPI card | value, label, context/delta, loading, error, clickable | Inventory Value, Active SKUs, Low Stock, Open POs, Awaiting Receipt only; links to exact filtered destination |
| `COMP-010` | StatusPill | all stock and PO status mappings above | Always icon + exact text + semantic token pair; no colour-only shorthand |
| `COMP-011` | Badge | neutral, count, role, Private, Connected | Private uses slate/link-free treatment; Connected uses blue subtle + Link icon; badge is informational, not an action |
| `COMP-012` | DataTable | header, row, hover, selected, indexed-sort header, sticky header, empty, loading, mobile card | Semantic table; sorting only on declared indexed columns; 25-row server cursor; mobile cards repeat every field label |
| `COMP-013` | Pagination | previous/next, range label, first/last-disabled, loading | Cursor-only; no page numbers or infinite scroll; target buttons meet mobile target size |
| `COMP-014` | Tabs | default, active, focus, disabled, count badge | Arrow-key navigation; active tab uses text plus underline/weight; hidden/denied report tabs follow RBAC rather than decoration |
| `COMP-015` | Modal | small, medium, large, mobile full-height sheet | Labelled title/body, close control, focus trap, Escape, focus return, one dialog open at once |
| `COMP-016` | ConfirmDialog | neutral, destructive, submitting, error | Names object and consequence; destructive action is explicit; cancel receives initial focus for destructive cases |
| `COMP-017` | Toast | success, error, info | 150 ms fade, polite live region except urgent error; supplements visible updated data, never sole success evidence |
| `COMP-018` | EmptyState | icon, headline, body, primary action, no-action | One sentence and honest next step; Private and Connected copy remain distinct |
| `COMP-019` | ErrorState | inline/panel, retry, no-retry | Plain language; raw codes hidden; focusable retry; retain user input when safe |
| `COMP-020` | Skeleton | text line, card, table row | Matches final geometry; non-interactive, hidden from accessibility tree, no blank-page spinner |
| `COMP-021` | Monogram | 24, 32, 48 px; generated initials; optional image fallback state | Two initials on deterministic organization colour; image failure returns to monogram; no upload UI |
| `COMP-022` | Timeline | actor, organization, role badge, timestamp, transition, note | Chronological PO/audit events; Connected events name buyer or supplier organization; immutable history is visually explicit |
| `COMP-023` | Stepper | 4-step and 5-step; completed, current, upcoming, error | Current step announced; labels stay visible; mobile uses compact vertical/scroll-free summary, not dots alone |
| `COMP-024` | FilterBar | search, dropdown filters, active chips, clear all, collapsed mobile | Search is local to the current list only; query persists in URL where architecture specifies; no global search implication |
| `COMP-025` | PageHeader | title, subtitle, breadcrumb, primary/secondary actions, no-action | One per app screen; action visibility follows role; breadcrumb uses real route hierarchy |

## 5. Composition and state rules

- **Data lifecycle:** every data surface composes Skeleton, EmptyState, ErrorState, and populated content. Mutations also compose inline validation, disabled/loading submit, Toast plus refreshed data, and object-specific ConfirmDialog where destructive.
- **Permissions:** unauthorized actions are hidden. A disabled action with a Tooltip is permitted only when hiding it would make the current context incomprehensible. Direct-route denial uses the Permission Denied screen, not a new component.
- **Private versus Connected:** use `COMP-011` Badge, organization identity, and explicit copy. Private is complete and neutral; Connected adds link icon, `@handle`, dual-item/conversion information, and cross-organization actor attribution.
- **Numbers:** quantities show up to three decimals plus unit; money always shows currency (`LKR 691,700.00` in canonical demo data); numeric columns use `mono-num` and right alignment.
- **Tables:** header cells are real `<th>` semantics; row actions are reachable by keyboard; sticky headers are the only table-specific custom scroll behavior.
- **Forms:** labels never rely on placeholders; focus moves to the first invalid field after submit; errors are announced; server errors do not erase valid input.

## 6. Accessibility acceptance contract

- Normal text is at least 4.5:1; large text at least 3:1. All prescribed text/status pairs exceed 4.5:1 as recorded above.
- Focus uses the frozen two-layer ring and is never removed. Every interactive element has a logical tab stop and visible focus.
- Meaningful boundaries use `border-strong` or a higher-contrast state/focus treatment. Structural `border` is decorative only.
- Stock and PO statuses remain identifiable in greyscale because each carries a unique icon and full label; colour is redundant.
- Mobile targets are at least 44×44 px with 8 px separation where adjacent destructive and safe actions could be confused.
- Dialogs trap focus, identify title/description, expose an obvious close path, select a safe initial focus, and return focus to the trigger.
- Reduced motion needs no alternate composition because only nonessential 150 ms opacity fades are allowed; disabling animation does not remove information.
- Charts are governed by file 24 and always have adjacent text/table equivalents.

## 7. Freeze checks

| Check | Result |
|---|---|
| Page-layout families | `5/5`, no sixth family |
| Primitive components | `25/25`, no 26th primitive |
| Required token groups | Complete |
| Required breakpoints | `390 / 768 / 1024 / 1280 / 1536` |
| WCAG text/status pairs | PASS |
| Mobile target baseline | `44×44px` |
| Dark theme / global search / decorative motion | Excluded |
| `DESIGN_SYSTEM_FREEZE` | `PASS` |

