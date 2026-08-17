# Stockmok Final UI Master Inventory

**Status:** `UI_ARCHITECTURE_FREEZE = PASS`  
**Authority:** canonical Release A and Release B-Lite screen ledger  
**Scope:** design documentation only; no application routes, schemas, components, or production code are created by this document  
**Source precedence:** `03` scope; `02` requirements; `05` entities/states; `06` hard RBAC; `04` workflows/arithmetic; `07` routes/screens; `08` tests; `10`/`17` implementation/design constraints

## 1. Frozen boundary and counts

| Measure | Frozen count |
|---|---:|
| Canonical P0 / Release A aliases (`#1..#30`) | 30 |
| Canonical P1 / Release B-Lite aliases (`#31..#40`) | 10 |
| Canonical aliases total (`SCREEN-001..040`) | 40 |
| Derived, visually distinct surfaces (`SCREEN-041..052`) | 12 |
| **Authoritative surfaces total** | **52** |
| Release A surfaces (30 canonical + 11 derived) | 41 |
| Release B-Lite surfaces (10 canonical + 1 derived) | 11 |
| Dedicated R2 / 390 px surfaces | 11 |
| Operational page layouts | 5 maximum |
| Charts | exactly 3 |
| Built-in roles | 7 |

Release B-PLUS (`FR-NET-003`, `FR-NET-017`, `FR-NOTIFY-003`), Release C, and Release D are excluded. `/store/:handle`, storefront publishing, marketplace/browse discovery, bilateral mapping confirmation, checkout, POS, sales orders, forecasting, custom roles, multi-currency, lot/batch, barcode, dark theme, global search, command palette, and mobile-app claims must not appear.

When `settings.networkEnabled == false`, the `NETWORK` navigation section and all Release B routes are omitted. An authenticated direct request to a Network route resolves to the authenticated 404 surface (`SCREEN-030`), not a permission-denied surface and not a redirect. Marketing copy must describe Release B only when that feature is enabled.

## 2. Frozen identifier ledger

These namespaces are public artifact interfaces. IDs are immutable; retirement leaves a tombstone and never causes renumbering.

| Namespace | Format | Owner / rule |
|---|---|---|
| Screen | `SCREEN-###` | This file. `001..040` preserve canonical aliases; derived surfaces begin at `041`. |
| Canonical alias | `P0-##` / `P1-##` | Exact `17` §4 screen number; derived surfaces use `—`. |
| State | `STATE-###` | §7; state IDs may be rendered within a screen and do not create routes. |
| Role | `ROLE-O`, `ROLE-A`, `ROLE-IM`, `ROLE-PM`, `ROLE-SK`, `ROLE-AN`, `ROLE-VW` | Exact seven roles from `06` §5. |
| Access | `FULL`, `READ_ONLY`, `LIMITED`, `HIDDEN`, `DENIED` | §3. `HIDDEN` is navigation/action visibility; direct route access is `DENIED`. |
| Responsive | `R0`, `R1`, `R2` | §4. |
| Layout | `LAYOUT-01..05` | §5; overlays do not add a sixth page layout. |
| Table | `TABLE-###` | Defined in `19_FINAL_PAGE_AND_SCREEN_REGISTRY.md`; immutable column contract. |
| Form | `FORM-###` | Defined in `19`; immutable field/validation contract. |
| Action | `ACTION-###` | Global immutable action contract owned by file 22 and reused by files 19, 20, 23, 26, 29, and 32. |
| Chart | `CHART-001..003` | §6; no fourth chart. |

## 3. Roles and access semantics

| Code | Role | Access interpretation |
|---|---|---|
| `O` | Owner | Canonical Owner; only Owner may change own Owner settings. |
| `A` | Admin | Broad operations; cannot modify canonical Owner. |
| `IM` | Inventory Manager | Inventory writer; no Network capability. |
| `PM` | Procurement Manager | Procurement and permitted Network operator; cannot adjust stock. |
| `SK` | Storekeeper | Receive and read operational stock/PO data; cannot adjust stock. |
| `AN` | Analyst | Read-only operational analysis; no Network, Team, Settings, or audit log. |
| `VW` | Viewer | Dashboard, products/stock, Stock-on-Hand report, notifications only. |

`FULL` permits every action named for the surface. `READ_ONLY` permits render/filter/sort/navigation but no mutation. `LIMITED` means a specifically enumerated subset (for example only one Reports tab). `HIDDEN` means absent from navigation or action menus. `DENIED` is the direct-URL/command outcome. A vector such as `O:F A:F IM:R` uses `F=FULL`, `R=READ_ONLY`, `L=LIMITED`, `H/D=HIDDEN in UI and DENIED on direct access`.

UI visibility is convenience only. Membership, role, tenant ownership, and state transition are always revalidated by the trusted boundary. Unauthorized actions are hidden unless their absence would make context confusing; that exceptional disabled control must have a tooltip naming the required role.

## 4. Responsive classes

| Class | Deliverable |
|---|---|
| `R0` | Static/public/failure surface: 1280 px reference; semantic reflow verified at 390 and 768, no separate mobile visual required. |
| `R1` | 1280 px primary design plus explicit 768 px behavior; tables use the documented card or constrained-scroll alternative. |
| `R2` | Dedicated inspectable 1280 px and 390 px visuals. One-handed operation, 44×44 px targets, no core-action horizontal scroll. |

The **only** R2 surfaces are `SCREEN-003`, `004`, `006`, `010`, `011`, `013`, `016`, `023`, `024`, `026`, and `043` (11 total). `SCREEN-043` is the dedicated mobile application navigation surface. Global and branded login are both R2. Receiving is the highest-priority R2 surface.

## 5. Page layouts

| ID | Layout | Contract |
|---|---|---|
| `LAYOUT-01` | List | PageHeader, FilterBar, bounded DataTable/card fallback, cursor Previous/Next. |
| `LAYOUT-02` | Detail with tabs | PageHeader, summary, Tabs, tables/timeline/actions. |
| `LAYOUT-03` | Form | PageHeader/card, labelled fields, inline validation, actions. |
| `LAYOUT-04` | Wizard | PageHeader, Stepper, one decision per step, review/submit. |
| `LAYOUT-05` | Dashboard | KPI/attention/panel grid with role-aware links and table alternatives. |

Public marketing, authentication, utility errors, the shell wrapper, modals, panels, drawers, menus, and dialogs are compositions of the same 25 primitives and do not count as additional operational page layouts.

## 6. Chart ceiling

| ID | Chart | Owning surface | Non-chart alternative |
|---|---|---|---|
| `CHART-001` | Stock-status donut | `SCREEN-010`, role variants `044..047` | Counts and percentages for In Stock, Low Stock, Out of Stock in a labelled table/text summary. |
| `CHART-002` | Inventory-by-location bar | same | Warehouse, quantity/value, unit/currency table. |
| `CHART-003` | PO-status bar | `SCREEN-049` Purchase-Order Report tab | Status and count table/text summary beside the authoritative PO table. |

Inventory Value, Active SKU Count, Low Stock, Open POs, and Awaiting Receipt are KPIs, not charts. Charts are lazy-loaded and never replace an accurate table.

## 7. State ledger

### 7.1 Universal state set

| ID | State | Required behavior |
|---|---|---|
| `STATE-001` | Loading | Layout-shaped skeleton; never a blank page with centred spinner. |
| `STATE-002` | Empty | Icon, concise explanation, valid primary action; no false dead end. |
| `STATE-003` | Error | Plain-language explanation and Retry; no raw internal code. |
| `STATE-004` | Success | Updated data remains visible and toast confirms outcome/reference. |
| `STATE-005` | Validation error | Inline, field-associated, announced; submit remains blocked. |
| `STATE-006` | Permission denied | Required role and current role named; safe reachable destination offered. |
| `STATE-007` | Submitting | Submit disabled with progress; double submission impossible. |
| `STATE-008` | Confirmation | Object-specific, action-specific confirmation; destructive actions only. |

Every P0/P1 surface declares every applicable state in `19`. Data screens require `001/003/006`; lists require `002`; mutations require `004`; forms require `005/007`; destructive actions require `008`.

### 7.2 Branded-login states

| ID | State |
|---|---|
| `STATE-009` | Resolving organization identity. |
| `STATE-010` | Handle not found; safe and non-revealing. |
| `STATE-011` | Branded sign-in ready. |
| `STATE-012` | Authentication failed; neutral, non-enumerating message. |
| `STATE-013` | Authenticated but not a member. |
| `STATE-014` | Requested role does not match assigned role. |
| `STATE-015` | Correct assigned role offered as next step. |
| `STATE-016` | Membership suspended. |

### 7.3 Workflow-specific states

| ID | State | Owner |
|---|---|---|
| `STATE-017` | Handle taken | Onboarding |
| `STATE-018` | Invalid handle | Onboarding |
| `STATE-019` | Reserved handle | Onboarding |
| `STATE-020` | Organization-create network failure; retry leaves no partial organization | Onboarding |
| `STATE-021` | Discovery idle | Business discovery |
| `STATE-022` | Discovery searching | Business discovery |
| `STATE-023` | Exact-handle result found | Business discovery |
| `STATE-024` | Exact handle not found | Business discovery |
| `STATE-025` | Already connected | Business discovery |
| `STATE-026` | Request already pending | Business discovery |
| `STATE-027` | Self-connection blocked | Business discovery |
| `STATE-028` | Mapping: no active connection | Mapping wizard |
| `STATE-029` | Mapping: supplier SKU not found | Mapping wizard |
| `STATE-030` | Mapping: item exists but is not published | Mapping wizard |
| `STATE-031` | Mapping: semantic match declined | Mapping wizard |
| `STATE-032` | Mapping: factor empty, zero, or negative | Mapping wizard |
| `STATE-033` | Mapping: connection stale before submit | Mapping wizard |
| `STATE-034` | Mapping: duplicate VERIFIED mapping | Mapping wizard |
| `STATE-035` | Warehouse archive blocked by stock or open receipt | Warehouse management |
| `STATE-036` | Network disabled: authenticated 404 | Network routes |
| `STATE-037` | Idempotent replay returns stored success/reference | Adjustment/receive/ship |
| `STATE-038` | Over-receipt blocked inline | Receiving |
| `STATE-039` | PO immutable after ordering/submission/final state | Purchase orders |
| `STATE-040` | Invitation invalid, expired, revoked, or reused | Invitation acceptance |
| `STATE-041` | Invitation email mismatch | Invitation acceptance |
| `STATE-042` | Invite link displayed once with Copy and warning | Team invitation |
| `STATE-043` | New-organization dashboard setup checklist | Empty dashboard |

## 8. Authoritative screen inventory

Role vectors use §3 abbreviations. Requirement and test ranges are those of canonical `02` and complete canonical `08`; the B-Lite design excludes the B-PLUS requirements listed in §1.

### 8.1 Canonical P0 / Release A (`SCREEN-001..030`)

| Screen ID | Alias | Surface / route | Layout | Resp. | Role vector | Traceability |
|---|---|---|---|---|---|---|
| `SCREEN-001` | P0-01 | Public Home — `/` | n/a public | R0 | anyone:F | `UC-01`; `NFR-016..017`; `T-UI-01..12`, `T-PERF-01..04` |
| `SCREEN-002` | P0-02 | Sign Up — `/signup` | L03 | R1 | anyone:F | `FR-AUTH-001..003,011..012`; `UC-02`; `T-AUTH-01..02,11,14` |
| `SCREEN-003` | P0-03 | Global Login — `/login` | L03 | **R2** | anyone:F | `FR-AUTH-001,003..006,011`; `UC-02`; `T-AUTH-02..05,11..13` |
| `SCREEN-004` | P0-04 | Branded Business Login — `/b/:handle` | L03 | **R2** | anyone:F | `FR-AUTH-007..011`; `UC-04`; `SC-02`; `T-AUTH-05..10` |
| `SCREEN-005` | P0-05 | Invitation Accept — `/invite/:token` | L03 | R1 | invitee:F | `FR-TEAM-002..003,010..011`; `UC-06`; `SC-03`; `T-ORG-06..08,12` |
| `SCREEN-006` | P0-06 | Workspace Selector — `/select-workspace` | L01 | **R2** | active multi-org user:F | `FR-ORG-009..010`; `UC-23`; `SC-20`; `T-ORG-04` |
| `SCREEN-007` | P0-07 | Business Onboarding — `/onboarding` | L04 | R1 | new authenticated user:F | `FR-ORG-001..008,011..013`; `UC-03`; `SC-01`; `T-ORG-01..03,09..10` |
| `SCREEN-008` | P0-08 | Application Shell — wraps `/app/:handle/*` | n/a shell | R1 | all active members:F | `FR-ORG-009..010`; `UC-15,23`; `T-AUTH-03`, `T-ORG-04`, `T-SEC-01..18` |
| `SCREEN-009` | P0-09 | Dashboard — Empty — `/app/:handle/dashboard` | L05 | R1 | O:F A:F IM:F PM:F SK:F AN:F VW:F | `FR-DASH-001..003,007..009`; `UC-13`; `STATE-043`; `T-REPORT-01..10` |
| `SCREEN-010` | P0-10 | Dashboard — Populated — same route | L05 | **R2** | O:F A:F IM:F PM:F SK:F AN:F VW:F | `FR-DASH-001..003,007..009`; `UC-13`; `SC-18`; `T-REPORT-01..10` |
| `SCREEN-011` | P0-11 | Product List — `…/inventory/products` | L01 | **R2** | O:F A:F IM:F PM:R SK:R AN:R VW:R | `FR-INV-001,004,007..009,012..014`; `UC-07`; `SC-05`; `T-CRUD-01..05,10..16` |
| `SCREEN-012` | P0-12 | Product Create/Edit — `…/inventory/products/new`, `…/inventory/products/:productId/edit` | L03 | R1 | O:F A:F IM:F; PM/SK/AN/VW:H/D | `FR-INV-001,004..006,009,013`; `UC-07`; `SC-04..05`; `T-CRUD-01,03,05,12..15` |
| `SCREEN-013` | P0-13 | Product Detail — `…/inventory/products/:productId` | L02 | **R2** | O:F A:F IM:F PM:R SK:R AN:R VW:R | `FR-INV-001,007..009,012..013`; `FR-STOCK-001..005,009`; `UC-07..09`; `SC-04..06`; `T-CRUD-02..04,12,15`, `T-STOCK-01..15` |
| `SCREEN-014` | P0-14 | Category Management — `…/inventory/categories` | L01 | R1 | O:F A:F IM:F; PM/SK/AN/VW:H/D | `FR-INV-002`; `UC-07`; `T-CRUD-06` |
| `SCREEN-015` | P0-15 | Warehouse Management — `…/inventory/warehouses` | L01 | R1 | O:F A:F IM:F; PM/SK/AN/VW:H/D | `FR-INV-003,010..011,014`; `UC-07`; `SC-07`; `T-CRUD-07..09,16` |
| `SCREEN-016` | P0-16 | Stock Adjustment modal — host Product List/Detail; no route | overlay/L03 | **R2** | O:F A:F IM:F; PM/SK/AN/VW:H/D | `FR-STOCK-006..013`; `UC-09,25`; `SC-06`; `T-STOCK-02..15`, `T-INT-01..05,07..08` |
| `SCREEN-017` | P0-17 | Stock Movement History — `…/inventory/movements` | L01 | R1 | O:R A:R IM:R PM:R SK:R AN:R; VW:H/D | `FR-STOCK-001..005,015..017`; `FR-AUD-001..004`; `UC-08..09,13`; `SC-04,06,16`; `T-STOCK-01..15`, `T-AUD-01..07` |
| `SCREEN-018` | P0-18 | Suppliers — `…/procurement/suppliers` | L01 | R1 | O:F A:F PM:F; IM/SK/AN/VW:H/D | `FR-PART-001..007`; `UC-10`; `SC-08`; `T-PART-01..05` |
| `SCREEN-019` | P0-19 | Buyers — `…/procurement/buyers` | L01 | R1 | O:F A:F PM:F; IM/SK/AN/VW:H/D | `FR-PART-001..003,005..007`; `UC-10`; `T-PART-01..05` |
| `SCREEN-020` | P0-20 | Partner Detail — `…/procurement/suppliers/:partnerId` or buyer equivalent | L02 | R1 | O:F A:F PM:F; IM/SK/AN/VW:H/D | `FR-PART-001..007`; `UC-10`; `T-PART-01..05` |
| `SCREEN-021` | P0-21 | Purchase Order List — `…/procurement/purchase-orders` | L01 | R1 | O:F A:F PM:F IM:R SK:R AN:R; VW:H/D | `FR-PO-001..013`; `UC-11..13`; `SC-08..09`; `T-PPO-01..14` |
| `SCREEN-022` | P0-22 | Purchase Order Builder — `…/procurement/purchase-orders/new` | L04 | R1 | O:F A:F PM:F; IM/SK/AN/VW:H/D | `FR-PO-001..005,011..012`; `UC-11,25`; `SC-08`; `T-PPO-01..08,12..14` |
| `SCREEN-023` | P0-23 | Purchase Order Detail — `…/procurement/purchase-orders/:poId` | L02 | **R2** | O:F A:F PM:F IM:R SK:R AN:R; VW:H/D | `FR-PO-001..013`; `UC-11..12`; `SC-08..09`; `T-PPO-01..14` |
| `SCREEN-024` | P0-24 | Receiving — `…/procurement/receiving`, `…/procurement/receiving/:poId` | L03 | **R2** | O:F A:F IM:F PM:F SK:F; AN/VW:H/D | `FR-PO-003,006..010,013`; `FR-STOCK-001..005,012`; `UC-12,25`; `SC-09`; `T-PPO-06..11`, `T-STOCK-09,13`, `T-INT-01..05,07..08` |
| `SCREEN-025` | P0-25 | Reports shell — `…/reports` | L02 | R1 | O:F A:F IM:F PM:F AN:F SK:L VW:L | `FR-DASH-004..006,009`; `UC-13`; `SC-18`; `T-REPORT-01..10` |
| `SCREEN-026` | P0-26 | Notifications — `…/notifications` | L01 | **R2** | O:F A:F IM:F PM:F SK:F AN:F VW:F | `FR-NOTIFY-001,004`; `UC-24`; `SC-21`; `T-NOTIFY-01..05` |
| `SCREEN-027` | P0-27 | Team — `…/team` | L01 | R1 | O:F A:L; IM/PM/SK/AN/VW:H/D | `FR-TEAM-001..011`; `UC-05`; `SC-03`; `T-ORG-05..12`, `T-SEC-05..07` |
| `SCREEN-028` | P0-28 | Settings — `…/settings` | L03 | R1 | O:F A:F; IM/PM/SK/AN/VW:H/D | `FR-ORG-011`; `FR-NOTIFY-001`; `NFR-019`; `T-ORG-05`, `T-NFR-01..14` |
| `SCREEN-029` | P0-29 | Permission Denied — guarded organization route | n/a utility | R0 | any authenticated role:F | `UC-14..15`; `SC-02,09..10`; `T-SEC-01..18` |
| `SCREEN-030` | P0-30 | 404 — `*` and disabled-Network direct routes | n/a utility | R0 | anyone:F | `FR-AUTH-007`; `STATE-036`; `T-AUTH-07`, `T-UI-01..12` |

### 8.2 Canonical P1 / Release B-Lite (`SCREEN-031..040`)

| Screen ID | Alias | Surface / route | Layout | Resp. | Role vector | Traceability |
|---|---|---|---|---|---|---|
| `SCREEN-031` | P1-31 | Connected Businesses — `…/network/connections` | L01 | R1 | O:F A:F PM:L; IM/SK/AN/VW:H/D | `FR-NET-001..002,004..007,018,020`; `UC-16`; `SC-11,17`; `T-NET-01..16` |
| `SCREEN-032` | P1-32 | Business Discovery panel on `SCREEN-031`; no route | overlay/L03 | R1 | O:F A:F PM:F; IM/SK/AN/VW:H/D | `FR-NET-001..002,004,006,020`; `UC-16`; `SC-11`; `T-NET-01..05,16` |
| `SCREEN-033` | P1-33 | Connection Detail — `…/network/connections/:connectionId` | L02 | R1 | O:F A:F PM:L; IM/SK/AN/VW:H/D | `FR-NET-004..007,018`; `UC-16`; `SC-11,17`; `T-NET-03..07,15` |
| `SCREEN-034` | P1-34 | Partner Catalog — supplier — `…/network/partner-catalog` | L01 | R1 | O:F A:F PM:F; IM/SK/AN/VW:H/D | `FR-NET-007..009,019`; `UC-17`; `SC-12`; `T-NET-08..10,15` |
| `SCREEN-035` | P1-35 | Partner Catalog — buyer browse — `…/network/partner-catalog/:supplierOrgId` | L01 | R1 | O:R A:R PM:R; IM/SK/AN/VW:H/D | `FR-NET-007,009..011,015`; `UC-18`; `SC-12..13`; `T-NET-09..13,15` |
| `SCREEN-036` | P1-36 | Product Mapping Wizard — `…/network/mappings/new` | L04 | R1 | O:F A:F PM:F; IM/SK/AN/VW:H/D | `FR-NET-007,009..016,018..019`; `UC-18`; `SC-13`; `T-NET-09..16`, `T-INT-06` |
| `SCREEN-037` | P1-37 | Product Mappings — `…/network/mappings` | L01 | R1 | O:F A:F PM:F; IM/SK/AN/VW:H/D | `FR-NET-014..016,018`; `UC-18`; `SC-13,17`; `T-NET-11..16` |
| `SCREEN-038` | P1-38 | Connected PO — buyer — `…/procurement/purchase-orders/:poId` | L02 | R1 | O:F A:F PM:F IM:R SK:R AN:R; VW:H/D | `FR-CPO-001..017`; `UC-19`; `SC-14`; `T-CPO-01..17`, `T-INT-06` |
| `SCREEN-039` | P1-39 | Connected PO — supplier — same route, supplier projection | L02 | R1 | O:F A:F PM:F IM:R SK:R AN:R; VW:H/D | `FR-CPO-002..009,012..016`; `UC-20`; `SC-15`; `T-CPO-03..17`, `T-INT-04,06` |
| `SCREEN-040` | P1-40 | Connected Receiving — `…/procurement/receiving/:poId` | L03 | R1 | O:F A:F IM:F PM:F SK:F; AN/VW:H/D | `FR-CPO-002,010..012,014,016..017`; `UC-21,25`; `SC-16`; `T-CPO-10..17`, `T-INT-01..08` |

### 8.3 Derived distinct surfaces (`SCREEN-041..052`)

The order is frozen. These surfaces do not replace or renumber canonical aliases.

| Screen ID | Surface / host | Release | Layout | Resp. | Role vector | Traceability |
|---|---|---:|---|---|---|---|
| `SCREEN-041` | Password Reset — `/login` reset state / Firebase action continuation | A | L03 | R1 | anyone:F | `FR-AUTH-005,011`; `UC-02`; `T-AUTH-04..05,11` |
| `SCREEN-042` | Opening Balance dialog/sheet — Product Stock tab; no route | A | overlay/L03 | R1 | O:F A:F IM:F; PM/SK/AN/VW:H/D | `FR-STOCK-014`; `UC-08,25`; `SC-04`; `T-STOCK-01`, `T-INT-01..05,07..08` |
| `SCREEN-043` | Mobile Application Navigation drawer — host any `/app/:handle/*`; no route | A | n/a shell | **R2** | all active members:F | `FR-ORG-009..010`; `NFR-001,016,019`; `T-UI-01..12` |
| `SCREEN-044` | Dashboard — Owner/Admin variant — `/app/:handle/dashboard` | A | L05 | R1 | O:F A:F; others:H | `FR-DASH-001..009`; `UC-13`; `SC-18`; `T-REPORT-01..10` |
| `SCREEN-045` | Dashboard — Inventory Manager variant — same route | A | L05 | R1 | IM:F; others:H | same; inventory actions only |
| `SCREEN-046` | Dashboard — Procurement Manager variant — same route | A | L05 | R1 | PM:F; others:H | same; procurement/Network attention only when enabled |
| `SCREEN-047` | Dashboard — Storekeeper variant — same route | A | L05 | R1 | SK:F; others:H | same; Receiving is primary action; no Adjust Stock |
| `SCREEN-048` | Report tab — Stock on Hand — `…/reports?tab=stock-on-hand` | A | L01 within L02 | R1 | O:F A:F IM:F PM:F SK:F AN:F VW:F | `FR-DASH-004,006,009`; `UC-13`; `T-REPORT-04..07,09..10` |
| `SCREEN-049` | Report tab — Purchase Orders — `…/reports?tab=purchase-orders` | A | L01 within L02 | R1 | O:F A:F IM:F PM:F AN:F; SK/VW:H/D | `FR-DASH-005..006`; `UC-13`; `T-REPORT-05..10` |
| `SCREEN-050` | Invitation Link modal — Team host; no route | A | overlay/L03 | R1 | O:F A:F; IM/PM/SK/AN/VW:H/D | `FR-TEAM-002..003,010`; `UC-05`; `SC-03`; `T-ORG-06..08` |
| `SCREEN-051` | Product Publish dialog — Partner Catalog host; no route | B-Lite | overlay/L03 | R1 | O:F A:F PM:F; IM/SK/AN/VW:H/D | `FR-NET-008..009,019`; `UC-17`; `SC-12`; `T-NET-08..10` |
| `SCREEN-052` | Notification Menu — shell bell popover; no route | A | overlay/list | R1 | all active members:F | `FR-NOTIFY-001..002,004`; `UC-24`; `SC-21`; `T-NOTIFY-01..05` |

## 9. Canonical demo-data contract

All screen designs and generated visuals use these values; no alternative arithmetic is allowed.

| Object | Canonical value |
|---|---|
| Buyer organization | Grand Ocean Hotel · `@grand-ocean` |
| Supplier organization | Fresh Foods · `@freshfoods` |
| User / role mismatch | Nimal is Inventory Manager; requested Owner is denied and assigned Inventory Manager is offered. |
| Category / product | Meat · Chicken Breast · `MEAT-001` · base unit KG |
| Inventory policy | minimum 20 KG · reorder target 50 KG · purchase cost LKR 1,250.00 |
| Opening balance | 18 KG into Cold Room; LOW STOCK; value LKR 22,500.00 |
| Adjustment | +2 KG, reason “Recount correction”, `operationId OP-A`; 18 → 20 KG; stored replay is idempotent. |
| Private supplier / PO | Green Farm · 50 KG at LKR 1,200.00/KG; receive 40 then 10. |
| Partner catalog item | Fresh Chicken Breast 5 KG Pack · partner SKU `CKN-B5` · order unit PACK · pack description “5 KG”. |
| Mapping | `1 PACK = 5 KG`; worked preview `10 PACK = 50 KG`. |
| Connected PO | 10 PACK / 50 KG; supplier stock 200 → 190 PACK on ship; buyer remains 70 KG until receipt. |
| Full buyer quantity chain | **18 → 20 → 60 → 70 → 70 → 110 → 120 KG** |
| Final value | **LKR 691,700.00** |
| Seed dashboard before demo | 12 active SKUs · 4 low stock · 1 out of stock · 0 open POs · 0 awaiting receipt · LKR 564,200.00 inventory value. |
| Movement proof | Six Chicken Breast movements sum exactly to 120 KG. |

The isolated `18 → 58 → 68 KG` sequence in the coursework brief is superseded by canonical `04`/`16` and must not be used.

## 10. Global interaction and query rules

- Every organization-scoped screen shows Stockmok mark, organization monogram + full name, role badge, conditional workspace switcher, notification bell/count, and user menu. The full organization identity is never reduced to an ambiguous truncated footer label.
- Lists are server-bounded at 25 rows, cursor-paginated with Previous/Next and a range label; hard maximum 100. No infinite scroll and no page-number pagination.
- Sorting is offered only for documented indexed fields. Never sort one fetched page locally while implying a global sort.
- Persisted time displays in organization timezone; money carries currency and uses integer minor-unit semantics; quantities show an explicit unit and three-decimal precision where applicable.
- Status always uses text plus icon, never colour alone. Visible focus, semantic table headers, associated errors, and 44 px mobile targets are mandatory.
- Meaningful destructive actions name the object: Archive Product, Archive Warehouse, Cancel PO, Disable Connection, Disable Mapping, Suspend/Remove Member, Revoke Invitation, or stock reduction greater than 50%.
- Private and Connected use distinct badges and data shapes. Private is first-class and never implies in-platform supplier acceptance. Connected views show dual item representations and conversion but never private partner inventory/cost/member/settings data.
- Report authorization is enforced per tab and action: every role may view Stock on Hand; only O/A/IM/PM/AN may view Purchase Orders. Hidden tabs and export actions remain backend-authorized.
- The public site never claims Release B when `networkEnabled` is off and never claims any excluded release.

## 11. Freeze verification

- Canonical aliases `#1..#40`: **40 / 40 represented**.
- Derived order supplied by ROOT: **12 / 12 represented exactly as `SCREEN-041..052`**.
- Release A + B-Lite surface coverage: **52 / 52**.
- R2 list: **11 / 11**, exactly the frozen set in §4.
- Roles: **7 / 7**, with hard `06` permissions applied (including no Network for Inventory Manager/Analyst and no stock adjustment for Storekeeper).
- Charts: **3 / 3 and no fourth chart**.
- Operational layouts: **5 / 5 ceiling respected**.
- Production-code mutations: **none authorized by this document**.

**Freeze result:** `UI_ARCHITECTURE_FREEZE = PASS`.
