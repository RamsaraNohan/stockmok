# Stockmok Final Page and Screen Registry

**Status:** `UI_ARCHITECTURE_FREEZE = PASS`  
**Companion authority:** `18_FINAL_UI_MASTER_INVENTORY.md`  
**Purpose:** decision-complete route, content, action, field, table, state, navigation, responsive, and outcome contract for every Release A and Release B-Lite surface

## 1. Reading the registry

- Screen IDs, aliases, roles, requirements, use cases, scenarios, test ranges, responsive classes, layouts, chart IDs, and state IDs are frozen in `18` and are not redefined here.
- `Base-D` = `STATE-001 Loading`, `STATE-003 Error`, `STATE-006 Permission denied`.
- `Base-L` = `Base-D` + `STATE-002 Empty`.
- `Base-F` = `STATE-005 Validation error` + `STATE-007 Submitting`.
- `Base-M` = `STATE-004 Success` for a mutation.
- `Base-X` = `STATE-008 Confirmation` for a destructive action.
- All forms have visible labels, associated errors, required markers, explicit units/currency, and submit disabled while invalid or submitting. All application actions use the immutable global `ACTION-###` registry owned by file 22.
- All organization-scoped routes are prefixed `/app/:handle`. Route parameters are lookup/context only; membership resolves against immutable organization id.

## 2. Exact route and host registry

| Screen | Exact route or host | Kind | Resp. | Access summary |
|---|---|---|---|---|
| `SCREEN-001` | `/` | public page | R0 | anyone |
| `SCREEN-002` | `/signup` | public form page | R1 | anyone |
| `SCREEN-003` | `/login` | public form page | R2 | anyone |
| `SCREEN-004` | `/b/:handle` | public branded form page | R2 | anyone; role selection grants nothing |
| `SCREEN-005` | `/invite/:token` | public-to-auth form page | R1 | token holder; acceptance requires matching authenticated email |
| `SCREEN-006` | `/select-workspace` | authenticated page | R2 | active multi-org user |
| `SCREEN-007` | `/onboarding` | authenticated wizard | R1 | authenticated user with zero memberships |
| `SCREEN-008` | wraps `/app/:handle/*` | shell | R1 | ACTIVE member only |
| `SCREEN-009` | `/app/:handle/dashboard` | empty state | R1 | all seven roles |
| `SCREEN-010` | `/app/:handle/dashboard` | populated page | R2 | all seven roles |
| `SCREEN-011` | `/app/:handle/inventory/products` | list page | R2 | all read; O/A/IM write actions |
| `SCREEN-012` | `/app/:handle/inventory/products/new`; `/app/:handle/inventory/products/:productId/edit` | form page | R1 | O/A/IM |
| `SCREEN-013` | `/app/:handle/inventory/products/:productId` | tabbed detail | R2 | all read; actions filtered |
| `SCREEN-014` | `/app/:handle/inventory/categories` | list/CRUD page | R1 | O/A/IM |
| `SCREEN-015` | `/app/:handle/inventory/warehouses` | list/CRUD page | R1 | O/A/IM |
| `SCREEN-016` | opened from `SCREEN-011` or `013` | modal / 390 px sheet; not a route | R2 | O/A/IM |
| `SCREEN-017` | `/app/:handle/inventory/movements` | list page | R1 | O/A/IM/PM/SK/AN read; Viewer denied |
| `SCREEN-018` | `/app/:handle/procurement/suppliers` | list page | R1 | O/A/PM |
| `SCREEN-019` | `/app/:handle/procurement/buyers` | list page | R1 | O/A/PM |
| `SCREEN-020` | `/app/:handle/procurement/suppliers/:partnerId`; `/app/:handle/procurement/buyers/:partnerId` | tabbed detail | R1 | O/A/PM |
| `SCREEN-021` | `/app/:handle/procurement/purchase-orders` | list page | R1 | O/A/PM full; IM/SK/AN read |
| `SCREEN-022` | `/app/:handle/procurement/purchase-orders/new` | wizard | R1 | O/A/PM |
| `SCREEN-023` | `/app/:handle/procurement/purchase-orders/:poId` | detail | R2 | O/A/PM full; IM/SK/AN read |
| `SCREEN-024` | `/app/:handle/procurement/receiving`; `/app/:handle/procurement/receiving/:poId` | form page | R2 | O/A/IM/PM/SK |
| `SCREEN-025` | `/app/:handle/reports` | tab shell | R1 | tab/action authorization |
| `SCREEN-026` | `/app/:handle/notifications` | list page | R2 | all members |
| `SCREEN-027` | `/app/:handle/team` | list page | R1 | Owner full; Admin limited by Owner protection |
| `SCREEN-028` | `/app/:handle/settings` | form page | R1 | Owner and Admin full |
| `SCREEN-029` | guarded organization route | utility page | R0 | authenticated wrong role / wrong tenant |
| `SCREEN-030` | `*`; disabled Network route | utility page | R0 | anyone; authenticated shell for disabled Network |
| `SCREEN-031` | `/app/:handle/network/connections` | list page | R1 | O/A full; PM limited; feature flag required |
| `SCREEN-032` | panel on `SCREEN-031` | panel; not a route | R1 | O/A/PM; feature flag required |
| `SCREEN-033` | `/app/:handle/network/connections/:connectionId` | detail | R1 | O/A full; PM limited; feature flag required |
| `SCREEN-034` | `/app/:handle/network/partner-catalog` | list page | R1 | O/A/PM; feature flag required |
| `SCREEN-035` | `/app/:handle/network/partner-catalog/:supplierOrgId` | list page | R1 | O/A/PM read; feature flag + ACTIVE connection |
| `SCREEN-036` | `/app/:handle/network/mappings/new` | wizard | R1 | O/A/PM; feature flag required |
| `SCREEN-037` | `/app/:handle/network/mappings` | list page | R1 | O/A/PM; feature flag required |
| `SCREEN-038` | `/app/:handle/procurement/purchase-orders/:poId` | connected buyer projection | R1 | PO read matrix; buyer transitions O/A/PM |
| `SCREEN-039` | same route in supplier organization | connected supplier projection | R1 | PO read matrix; supplier transitions O/A/PM |
| `SCREEN-040` | `/app/:handle/procurement/receiving/:poId` | connected receiving form | R1 | O/A/IM/PM/SK |
| `SCREEN-041` | reset state from `/login`; provider action continuation | public form state | R1 | anyone |
| `SCREEN-042` | dialog/sheet from Product Detail → Stock | overlay; not a route | R1 | O/A/IM |
| `SCREEN-043` | drawer hosted by any organization route | mobile shell overlay; not a route | R2 | all members; items role/flag-filtered |
| `SCREEN-044` | `/app/:handle/dashboard` | Owner/Admin visual variant | R1 | O/A only |
| `SCREEN-045` | same | Inventory Manager visual variant | R1 | IM only |
| `SCREEN-046` | same | Procurement Manager visual variant | R1 | PM only |
| `SCREEN-047` | same | Storekeeper visual variant | R1 | SK only |
| `SCREEN-048` | `/app/:handle/reports?tab=stock-on-hand` | report tab | R1 | all seven roles |
| `SCREEN-049` | `/app/:handle/reports?tab=purchase-orders` | report tab | R1 | O/A/IM/PM/AN; SK/VW denied |
| `SCREEN-050` | modal after Team invite create | modal; not a route | R1 | O/A full; one-time link |
| `SCREEN-051` | dialog from supplier Partner Catalog | dialog; not a route | R1 | O/A/PM; feature flag required |
| `SCREEN-052` | header notification bell | popover; not a route | R1 | all members |

## 3. Frozen field/form contracts

| Form ID | Surface(s) | Fields and validation | Submit outcome |
|---|---|---|---|
| `FORM-001` | `SCREEN-002` Sign Up | Display name; email; password; confirm password. Valid email, passwords match, provider rules; neutral provider failure. | Create user, idempotently create user profile on first authenticated render, route by membership count. |
| `FORM-002` | `SCREEN-003` Global Login | Email; password. Explicit labels; no account-enumerating validation. | Authenticate; zero memberships → onboarding, one → workspace, multiple → selector. Google is a separate action. |
| `FORM-003` | `SCREEN-004` Branded Login | Organization identity read-only; email; role preference default **Detect automatically**; password. Role preference is never a credential. | Authenticate, then validate ACTIVE membership and assigned role; mismatch uses `STATE-014/015`. |
| `FORM-004` | `SCREEN-005` Invitation Accept | Organization and offered role read-only; authentication action if needed; no editable invited email. | Matching email activates membership/mirror; mismatch/expired/reused reasons remain distinct. |
| `FORM-005` | `SCREEN-007` Onboarding | Step 1: business name, handle, normalized preview, industry. Step 2: country, currency, timezone. Step 3: warehouse name, type. Step 4: read-only summary. Handle 3–40 lower-case letters/numbers/single hyphens, no leading/trailing hyphen, reserved names blocked, immutable warning. | Atomic organization, directory, reservation, Owner membership/mirror, settings, counter, and first warehouse creation; no partial organization. |
| `FORM-006` | `SCREEN-012` Product | Internal SKU; name; description optional; category; base unit; purchase cost + currency; selling price optional; minimum stock; reorder target; preferred private supplier optional. SKU normalized/unique; nonnegative money/quantity; reorder target not below minimum; base unit immutable once movement/history exists. | Backend create/update; cost change recomputes stock value and audits; duplicate SKU rejected. |
| `FORM-007` | `SCREEN-014` Category | Name; description optional. Name required; archive is separate confirmation. | Create/update; list refresh + toast. |
| `FORM-008` | `SCREEN-015` Warehouse | Name; code optional; type; address optional. Archive is separate backend action. | Create/update; archive only when all balances zero and no open receipt. |
| `FORM-009` | `SCREEN-016` Adjustment | Product name/SKU read-only; warehouse; current balance read-only; direction Increase/Decrease; quantity + unit; reason required; computed result read-only. `operationId` generated on open. Quantity > 0; result ≥ 0; >50% reduction requires confirmation. | Atomic movement/balance/summary/value/audit/receipt; toast includes movement reference; identical replay returns stored result. |
| `FORM-010` | `SCREEN-018..020` Private Partner | Partner types Supplier/Buyer; name; contact person, email, phone, address, notes optional. At least one partner type; no outbound sales fields. | Create/update/deactivate; history retained. |
| `FORM-011` | `SCREEN-022` Private PO Builder | Step 1 active private supplier; Step 2 one or more active products, ordered quantity + base unit, unit price + currency; Step 3 expected date and notes; Step 4 immutable review. Positive quantities/prices; archived product/deactivated supplier blocked. | Save DRAFT; Mark Ordered allocates number and snapshots line identity/price. |
| `FORM-012` | `SCREEN-024` Private Receiving | PO/supplier read-only; per line ordered, received, receive-now in base unit, warehouse, current/after/outstanding previews. Receive >0 and ≤ outstanding. | Atomic receipt movement, line quantity, PO status, warehouse reference, audit, command receipt. |
| `FORM-013` | `SCREEN-027` Invite Member | Email; role (one of Admin, Inventory Manager, Procurement Manager, Storekeeper, Analyst, Viewer). | Create hashed-token invitation and show `SCREEN-050` once. |
| `FORM-014` | `SCREEN-027` Member Change | Member read-only; new ordinary role or status action. Admin cannot target canonical Owner; no role can create a second Owner. | Atomic membership/mirror update + audit; suspend/remove confirmation names member. |
| `FORM-015` | `SCREEN-028` Settings | Organization name, industry, country; immutable handle read-only; default warehouse; currency; timezone; low-stock notification switch; PO prefix; quantity precision read-only `3`; Network feature flag. No Storefront control in A/B design. | Save authorized settings; network-off removes navigation and changes direct route result to 404. |
| `FORM-016` | `SCREEN-041` Password Reset | Email only; neutral completion copy regardless of account existence. | Invoke provider reset; no password stored by Stockmok. |
| `FORM-017` | `SCREEN-042` Opening Balance | Product/SKU and unit read-only; warehouse; quantity; operation reference generated. Quantity >0; only before balance/movement exists for product/warehouse. | Atomic `OPENING_BALANCE`, balance/summary/value/audit/receipt; reference toast. |
| `FORM-018` | `SCREEN-032` Discovery | Exact handle with `@` prefix decoration. Normalize case; no name search, browsing, fuzzy matching, or directory list. | Safe directory `get`; result may send directional supplier request; duplicate/pending/self states block submit. |
| `FORM-019` | `SCREEN-051` Publish Partner Item | Internal product/SKU read-only; partner SKU; display name; order unit locked equal to source base unit; pack description optional; availability state; wholesale price/currency optional; Published switch. | Backend allow-list projection only; buyers never receive exact stock, cost/margin, warehouse, members, private partners, settings, or audit. |
| `FORM-020` | `SCREEN-036` Mapping Wizard | Step 1 ACTIVE supplier; Step 2 exact partner SKU; Step 3 matched supplier item + buyer product and required unticked semantic checkbox; Step 4 `1 supplierUnit = factor buyerUnit`; Step 5 review. Factor >0; save blocked for seven named error states. | Backend revalidates connection/publication/product and creates VERIFIED mapping with stable IDs + snapshots. |
| `FORM-021` | `SCREEN-038` Connected Buyer PO | Connected supplier; VERIFIED mapped items; ordered supplier quantity, converted buyer quantity read-only, price/currency; review. | Buyer DRAFT private until Submit; submit creates shared canonical record and two tenant projections atomically. |
| `FORM-022` | `SCREEN-039` Supplier Response | Accept or Reject from SUBMITTED; Ship from ACCEPTED. Reject action includes decision confirmation; ship uses operation id. No partial-ship input. | Backend state transition; ship creates supplier outbound movement only; both histories/projections update. |
| `FORM-023` | `SCREEN-040` Connected Receiving | Supplier/buyer item identities; ordered/already received in PACK and KG; receive-now in supplier order unit; live base conversion; warehouse; current/after/outstanding. | Buyer inbound only; outstanding tracked in supplier units; atomic partial/full transition and idempotent receipt. |

No unlisted field may be added to a visual. Hidden technical IDs and operation IDs may support actions but are never user-editable.

## 4. Frozen table/query contracts

All operational tables use server queries, 25 rows, cursor Previous/Next, range label, and hard maximum 100 unless explicitly marked “small embedded table.” Mobile table fallback repeats the column label with every value.

| Table ID | Owner | Columns | Query / filters / sorting |
|---|---|---|---|
| `TABLE-001` | Product List | Product (name + placeholder), SKU, Category, On Hand + unit, Stock Status, Preferred Supplier, Updated, Actions | Search; category, stock status, warehouse, archived filters. Sort only name, SKU, updated, on hand. Active by default. |
| `TABLE-002` | Categories | Name, Description, Status, Updated, Actions | Search; status. Sort name or updated. |
| `TABLE-003` | Warehouses | Name, Code, Type, Status, Updated, Actions | Search; type/status. Sort name or updated. Archive eligibility checked on action, never inferred from page data. |
| `TABLE-004` | Product Stock tab | Warehouse, On Hand, Available, Unit, Status, Updated | Product-scoped; warehouse/status filter; sort warehouse or on hand. Small embedded table. |
| `TABLE-005` | Product recent movements | Time, Type, Warehouse, Signed Quantity + unit, Balance After, Actor, Reference | Product-scoped; newest first. Small embedded table. |
| `TABLE-006` | Movement History | Time, Product, SKU, Warehouse, Type, Signed Quantity + unit, Balance After, Actor, Reference | Search; date range, product, warehouse, movement type. Sort time only. Immutable; no row actions. |
| `TABLE-007` | Suppliers/Buyers | Identity/Name, Private/Connected, Contact or @handle, Status, Open POs, Updated, Actions | Tabs Private/Connected/Pending; search; status. Sort name/updated. Buyer A view is directory only. |
| `TABLE-008` | Partner open POs | Number, Kind, Status, Created, Expected, Total | Partner-scoped, open statuses only; sort created/expected. Small embedded. |
| `TABLE-009` | Partner order history | Number, Kind, Final Status, Ordered, Received/Cancelled, Total | Partner-scoped, final statuses; newest first. |
| `TABLE-010` | PO List | Number, Supplier, Private/Connected, Status, Created, Expected, Total, Actions | Tabs Private/Connected; search number/counterparty; status/date/kind filters. Sort created, expected, number, total. |
| `TABLE-011` | PO Detail Lines | Product, SKU, Unit, Ordered, Received, Unit Price, Line Total | PO-scoped snapshots; no sorting/edit after DRAFT. Connected rows also show “Your item”, “Supplier item”, conversion. |
| `TABLE-012` | Receiving Lines | Product, Ordered, Already Received, Receive Now, Converted (connected), Warehouse, Current Stock, Stock After, Outstanding After | Selected eligible PO; no pagination; over-receipt inline. |
| `TABLE-013` | Stock-on-Hand Report | Product, Warehouse, On Hand, Unit, Status, Value | Warehouse/category/status filters; sort product, warehouse, on hand, value; CSV export. Replacement-cost disclosure. |
| `TABLE-014` | Purchase-Order Report | PO Number, Counterparty, Private/Connected, Status, Total, Created, Expected | Status/date range/kind filters; sort number, total, created, expected; CSV export. |
| `TABLE-015` | Notifications | Read state, Event/Headline, Organization context, Related object, Time | Unread/all filter; event type; newest first; cursor pagination. |
| `TABLE-016` | Team | Name + email, Role, Status, Joined/Invited, Actions | Search; role/status filter; sort name/joined. Canonical Owner row protected; destructive actions absent. |
| `TABLE-017` | Pending Invitations | Email, Offered Role, Status, Expires, Invited By, Action | Pending only; expiry sort; Revoke action. |
| `TABLE-018` | Connections | Counterparty identity, Direction, Status, Requested/Responded, Mapped Items, Open Connected POs, Actions | Incoming/outgoing/status filters; exact identity search; newest first. PM cannot Disable. |
| `TABLE-019` | Connection Mapped Items | Buyer Item, Supplier Item, Conversion, Mapping Status, Created | Connection-scoped; status filter; no private product fields from other tenant. Small embedded. |
| `TABLE-020` | Connection Connected POs | Number, View Role, Status, Created, Total, Action | Connection-scoped; status filter; newest first. Small embedded. |
| `TABLE-021` | Supplier Partner Catalog | Internal Product, Internal SKU, Partner SKU, Order Unit, Availability, Published, Action | Search; published/availability filter; sort internal product, partner SKU, updated. Private stock/cost omitted. |
| `TABLE-022` | Buyer Partner Catalog | Supplier Item, Partner SKU, Order Unit, Pack Description, Availability, Wholesale Price if published | One supplier via callable; search exact/text within returned bounded set; no internal inventory fields. |
| `TABLE-023` | Product Mappings | Buyer Product/SKU, Supplier/Partner Item/SKU, Conversion, Status, Verified By/At, Actions | Supplier/status search/filter; sort verified time. Disable confirmation; history retained. |
| `TABLE-024` | Dashboard Recent Activity | Actor, Action, Object, Time | role-authorized own-tenant events; newest first; small embedded. Analyst never sees restricted audit-log payload. |
| `TABLE-025` | Dashboard Low Stock | Product, On Hand + unit, Minimum + unit, Action | status LOW only; action role-filtered; small embedded. |
| `TABLE-026` | Dashboard Recent POs | Number, Supplier, Kind, Status, Total | role-authorized PO view only; newest first; small embedded. |
| `TABLE-027` | Dashboard Inventory by Location | Warehouse, Quantity/Value Context | authoritative summary backing `CHART-002`; small embedded. |

## 5. Screen behavior contracts

Each entry is complete when its named objects, forms/tables, actions/outcomes, links/breadcrumbs, states, and responsive behavior are represented. Global shell elements from `SCREEN-008` apply to every organization-scoped surface.

### 5.1 Public, authentication, and organization entry

#### `SCREEN-001` — Public Home

- **Objects/content:** Header; hero; dashboard visual; Problem → Solution; four cards (Inventory Control, Procurement, Connected Business Collaboration only when enabled, Analytics); mapping explanation only when enabled; industries; tenant isolation/security; closing CTA; footer. No invented customers, testimonials, awards, metrics, prices, or business proof.
- **Actions/outcomes:** `ACTION-002 Sign in` -> `/login`; `ACTION-001 Get started` -> `/signup`; feature CTAs go only to existing public/auth routes. No non-functional anchors.
- **States:** static success; route error handled by `SCREEN-030`. **Responsive:** R0 stacked semantic sections, no horizontal overflow.

#### `SCREEN-002` — Sign Up

- **Form/actions:** `FORM-001`; `ACTION-061 Create account`; `ACTION-003 Continue with Google`; `ACTION-002 Sign in` -> `/login`. Breadcrumb none.
- **States:** Base-F, `STATE-003/004`; neutral provider error. **Responsive:** single-column card at 390/768; 44 px provider and submit actions.

#### `SCREEN-003` — Global Login

- **Form/actions:** `FORM-002`; `ACTION-002 Sign in`; `ACTION-003 Continue with Google`; `ACTION-004 Reset password` -> `SCREEN-041`; `ACTION-001 Get started` -> `/signup`.
- **States:** Base-F + `STATE-004`; invalid/unregistered email share one message. **R2:** 390 px form visual, keyboard-safe, action order retained.

#### `SCREEN-004` — Branded Business Login

- **Objects/form:** organization monogram/name/`@handle`; `FORM-003`; explicit note “Role preference does not grant access.”
- **Actions/links:** sign in, Google, reset password, “Not your business? Go to Stockmok login.” Successful assigned role opens that workspace.
- **States:** **all `STATE-009..016`**, plus Base-F. Mismatch view names requested and assigned roles without exposing roles pre-auth. **R2:** branded identity remains above form; no hidden security explanation.

#### `SCREEN-005` — Invitation Accept

- **Objects/form:** organization identity, inviter context where safe, offered role, expiry; `FORM-004`.
- **Actions/outcomes:** sign in/create account as needed; Accept Invitation; successful active/replay opens organization; unknown token → not found.
- **States:** Base-D/F/M + `STATE-040/041`; no token hash/email leakage. Links: global login/home. Responsive card at 390/768.

#### `SCREEN-006` — Workspace Selector

- **Objects:** current user; active membership cards with monogram, full organization name, `@handle`, assigned role. Never list suspended/removed memberships.
- **Actions:** choose workspace → membership revalidation then dashboard; sign out → cache cleared; create new workspace → onboarding only if allowed by product policy.
- **States:** Base-L/D; exactly one membership bypasses this page; zero goes onboarding. **R2:** one-column cards, full names, 44 px targets.

#### `SCREEN-007` — Business Onboarding

- **Form:** `FORM-005`, four-step Stepper. **Actions:** Back, Continue, Create Business; success → new dashboard.
- **States:** Base-F/M + `STATE-017..020`; availability check has inline loading; failure copy guarantees no half-created organization. Breadcrumb none. R1 collapses to one column at 768.

#### `SCREEN-008` — Application Shell

- **Objects:** skip link; header Stockmok mark, organization monogram/full name, role badge, conditional workspace switcher, bell/unread, user menu; role-filtered collapsible sidebar; PageHeader/content; optional emulator ribbon.
- **Actions:** workspace switch revalidates membership and clears previous tenant cache; bell → `SCREEN-052`; View all → `SCREEN-026`; profile; sign out clears cache. Network section exists only with flag.
- **States:** layout skeleton while auth/org/membership unresolved; permission → `029`; unknown/disabled route → `030`. R1 uses desktop sidebar; mobile behavior is `SCREEN-043`.

### 5.2 Dashboard and inventory

#### `SCREEN-009` — Empty Dashboard

- **Objects:** organization context; setup checklist in this order: add category, add product, record opening stock, add supplier, invite team. Items are role-filtered; unavailable steps explain responsible role without a dead CTA.
- **Actions/links:** each permitted item opens `014`, `012`, `042`, `018`, or `027`. **States:** `STATE-043`, Base-D. No wall of zeros and no charts.

#### `SCREEN-010` — Populated Dashboard

- **Objects:** five KPI cards; Needs Attention (low/out of stock, awaiting receipt, pending connections/connected responses only when B enabled); `TABLE-024..027`; dashboard `CHART-001..002` with text/table alternatives. `CHART-003` belongs only to `SCREEN-049`.
- **Actions:** each KPI/attention row opens the exact filtered Product/PO/Receiving/Connection surface; actions filtered by role. Inventory value explicitly “replacement cost”.
- **States:** Base-D and per-card loading/error; no-data panels use `STATE-002`. **R2:** KPI cards stack, Needs Attention above fold, charts after actionable tables.

#### `SCREEN-011` — Product List

- **Objects:** `TABLE-001`; archived toggle off by default; PageHeader and Add Product only for O/A/IM.
- **Actions:** View → `013`; Edit → `012`; Adjust → `016`; Archive/Restore → object-named confirmation and refreshed row. Unauthorized row actions absent.
- **States:** Base-L/D/M/X; empty copy “Add your first product to start tracking inventory.” **R2:** labelled stacked cards; FilterBar wraps; actions remain 44 px.

#### `SCREEN-012` — Product Create / Edit

- **Objects:** `FORM-006`; breadcrumb `Products / New product` or `Products / Chicken Breast / Edit`.
- **Actions:** Save; Cancel to list/detail; Archive only on edit via confirmation. Success → detail with toast. Duplicate SKU, archived reference, invalid amounts inline.
- **States:** Base-D/F/M/X. R1 two-column groups become one at 768.

#### `SCREEN-013` — Product Detail

- **Objects:** header identity/status. Tabs: Overview; Stock (`TABLE-004/005`); Suppliers; Buyers only with B flag; Activity. No Storefront tab. Overview fields exactly name, SKU, category, base unit, purchase/selling price, minimum, reorder target, status, preferred supplier.
- **Actions:** Edit O/A/IM; Adjust O/A/IM; Opening Balance O/A/IM only when eligible; archive; links to category, supplier, movement, mapping. Unauthorized actions hidden.
- **States:** Base-D; empty per tab; M/X for actions. **R2:** tabs horizontally scroll only as navigation, not core content; tables become cards; key stock and action above fold.

#### `SCREEN-014` — Category Management

- **Objects:** `TABLE-002`, `FORM-007` in modal; breadcrumb `Inventory / Categories`.
- **Actions:** Add, Edit, Archive/Restore. Success updates row; archive names category. **States:** Base-L/D/F/M/X. No inline editable cells.

#### `SCREEN-015` — Warehouse Management

- **Objects:** `TABLE-003`, `FORM-008`; breadcrumb `Inventory / Warehouses`.
- **Actions:** Add, Edit, Archive. Archive blocked copy names “Cold Room” and stock/open receipt cause. **States:** Base-L/D/F/M/X + `STATE-035`. No client-side eligibility claim.

#### `SCREEN-016` — Stock Adjustment

- **Objects/form:** `FORM-009`; product context and computed result are always visible.
- **Actions:** Cancel; Confirm Adjustment. Outcome shows movement reference; identical retry is success; changed payload with same operation id is an explained error.
- **States:** Base-D/F/M + X for >50% reduction + `STATE-037`; negative result/reason/zero quantity inline. **R2:** full-height 390 px sheet, sticky actions, current/result visible without horizontal scroll.

#### `SCREEN-017` — Movement History

- **Objects:** immutable `TABLE-006`; breadcrumb `Inventory / Stock Movements`; signed quantities with units and actor attribution.
- **Actions:** filter, clear, inspect reference/product/warehouse; no create/edit/delete/export unless separately authorized later (not in scope). **States:** Base-L/D. Viewer direct route → `029`.

### 5.3 Private partners, procurement, reports, notifications, administration

#### `SCREEN-018` — Suppliers

- **Objects:** `TABLE-007`, tabs Private/Connected/Pending. Before B enabled, Connected/Pending show “available with connected businesses” explanatory empty state but no route/action. Private remains complete.
- **Actions:** Add/Edit/Deactivate private supplier (`FORM-010`); View → `020`; Connect opens `032` only when enabled. **States:** Base-L/D/F/M/X.

#### `SCREEN-019` — Buyers

- **Objects:** same `TABLE-007` filtered by BUYER. **No** Create Sales Order, outbound quantity, revenue, or sales workflow.
- **Actions:** Add/Edit/Deactivate directory record; View → buyer `020`. **States:** Base-L/D/F/M/X. Connected/Pending flag behavior matches Suppliers.

#### `SCREEN-020` — Partner Detail

- **Objects:** Private identity/contact/status, `TABLE-008/009`; Connected identity monogram/name/`@handle`, connection status, mapped count, connected POs. Breadcrumb `Suppliers|Buyers / <name>`.
- **Actions:** Edit/deactivate private partner; open PO; connected link → `033`. **States:** Base-D/L/M/X. No outbound buyer workflow.

#### `SCREEN-021` — Purchase Order List

- **Objects:** `TABLE-010`; tabs Private/Connected (Connected explanatory empty when B off); PageHeader Create PO for O/A/PM.
- **Actions:** View; Edit DRAFT; Receive eligible order; create private/connected based on flag and mappings. **States:** Base-L/D/M; immutable rows show no edit.

#### `SCREEN-022` — Private PO Builder

- **Objects/form:** `FORM-011`, four-step Stepper: Supplier → Items → Delivery and notes → Review. Breadcrumb `Purchase Orders / New`.
- **Actions:** Back, Continue, Save Draft, Mark Ordered. **States:** Base-D/F/M; `STATE-039`; no fake supplier acceptance. R1 line editor becomes stacked field groups.

#### `SCREEN-023` — Private PO Detail

- **Objects:** number, Private badge, supplier, status, created/expected; `TABLE-011`; totals; Timeline actor/role/time/note. Breadcrumb `Purchase Orders / <number>`.
- **Actions by state/role:** Edit DRAFT, Mark Ordered, Cancel DRAFT/ORDERED before receipt, Receive ORDERED/PARTIALLY_RECEIVED, view supplier. Read roles see none. **States:** Base-D/M/X + `STATE-039`. **R2:** line cards, status/totals/actions above fold, sticky primary action where useful.

#### `SCREEN-024` — Private Receiving

- **Objects/form:** PO/supplier summary; `FORM-012` / `TABLE-012`; warehouse above fold; current/after/outstanding preview.
- **Actions:** Select PO, Confirm Receipt, Cancel. Outcome opens PO and shows receipt/movement reference. **States:** Base-D/F/M + `STATE-037/038`; over-receipt before submit. **R2:** highest priority, large numeric input, sticky confirm, no core horizontal scroll.

#### `SCREEN-025` — Reports Shell

- **Objects:** tabs `SCREEN-048/049`; PageHeader; no report content duplicated at shell. Breadcrumb `Reports`.
- **Authorization:** Stock tab all; PO tab only O/A/IM/PM/AN. SK/VW never see PO tab and direct query resolves `029`. Export checked per tab/action. **States:** Base-D.

#### `SCREEN-026` — Notifications

- **Objects:** `TABLE-015`; unread count; filters; organization/object context. A notifications always; connection/connected-PO event types only when B enabled. No B-PLUS mapping-confirmation event.
- **Actions:** Mark read/unread; Mark all read; open related authorized object; retry. **States:** Base-L/D/M; empty “You're all caught up.” **R2:** stacked items, swipe gesture not required, explicit buttons.

#### `SCREEN-027` — Team

- **Objects:** `TABLE-016/017`; `FORM-013/014`; protected Owner row. Breadcrumb `Team`.
- **Actions:** Invite, Change Role, Suspend, Remove, Revoke Invitation. Admin actions targeting Owner absent. Invite success → `050`. **States:** Base-L/D/F/M/X + `STATE-042`.

#### `SCREEN-028` — Settings

- **Objects/form:** `FORM-015`; sections Organization Profile, Defaults, Notifications, Feature Flags. Handle/quantity precision read-only. Breadcrumb `Settings`.
- **Actions:** Save section for Owner/Admin. Turning Network off uses object-specific confirmation explaining routes disappear but history remains. **States:** Base-D/F/M/X.

#### `SCREEN-029` — Permission Denied

- **Objects:** requested area, current role, required role(s), current organization; no private data from denied route.
- **Action:** one safe route user may access (often Dashboard or Receiving). Copy model: “You need the Procurement Manager role… You're signed in as Storekeeper.” No silent redirect. R0 semantic utility layout.

#### `SCREEN-030` — 404

- **Objects:** neutral not-found message, no existence leakage. Authenticated disabled-Network version retains organization shell and says page unavailable; it does not advertise upgrade work.
- **Actions:** Home for public; Dashboard for member. No Search box/global search. Includes `STATE-036`.

### 5.4 Release B-Lite network and connected procurement

All surfaces `031..040` require `networkEnabled`. If false, navigation is absent and direct route uses `SCREEN-030`. Inventory Manager, Storekeeper, Analyst, and Viewer have no Network navigation or routes. Historical connected PO projections remain readable through Purchase Orders according to the hard PO-view matrix after a connection is disabled.

#### `SCREEN-031` — Connected Businesses

- **Objects:** `TABLE-018`; incoming requests prominent; no directory browse/marketplace.
- **Actions:** Find Business → `032`; Accept/Reject incoming O/A/PM; Disable ACTIVE connection O/A only; View → `033`. PM sees Disable hidden. **States:** Base-L/D/M/X; no-connections copy from `07`.

#### `SCREEN-032` — Business Discovery

- **Objects/form:** `FORM-018`; result card only monogram, name, `@handle`, industry, country.
- **Action:** Find Business; Connect as Supplier. **States:** `STATE-021..027`, Base-F/M. Exact handle only; result never includes inventory/members/settings/private fields.

#### `SCREEN-033` — Connection Detail

- **Objects:** counterparty identity, direction/status; `TABLE-019/020`; history summary. Breadcrumb `Connected Businesses / <name>`.
- **Actions:** open mapping/PO; Disable O/A only; respond to pending O/A/PM. **States:** Base-D/L/M/X. Disabled state preserves read-only history and blocks new mapping/PO.

#### `SCREEN-034` — Partner Catalog — Supplier

- **Objects:** `TABLE-021`; privacy explanation. Breadcrumb `Network / Partner Catalog`.
- **Actions:** Publish/Edit → `051`; Unpublish confirmation; inspect source product. **States:** Base-L/D/M/X. Order unit always equals source base unit.

#### `SCREEN-035` — Partner Catalog — Buyer Browse

- **Objects:** supplier identity and safe projection `TABLE-022`; visible note “partner projection, not supplier inventory.”
- **Actions:** Start Mapping with supplier/item context → `036`; back to connection. **States:** Base-L/D; stale/disabled connection explains that new use is blocked. No exact stock/cost/margin/warehouse/member data.

#### `SCREEN-036` — Product Mapping Wizard

- **Objects/form:** `FORM-020`; five steps and both item cards; worked preview `10 PACK = 50 KG`; deliberate semantic confirmation.
- **Actions:** Back/Continue/Create Verified Mapping; disabled Create always has reason. **States:** Base-D/F/M plus **all `STATE-028..034`** and lookup idle/searching/found states. Breadcrumb `Product Mappings / New`.

#### `SCREEN-037` — Product Mappings

- **Objects:** `TABLE-023`; stable identity snapshots and conversion visible.
- **Actions:** New Mapping; inspect related product/catalog/connection; Disable with named confirmation. No delete. **States:** Base-L/D/M/X; disabled mappings retained.

#### `SCREEN-038` — Connected PO — Buyer

- **Objects:** Connected badge; buyer/supplier identities; `FORM-021` for DRAFT; `TABLE-011` dual representation; totals; shared attributed Timeline.
- **Actions:** Edit buyer-only DRAFT; Submit; Cancel DRAFT/SUBMITTED; Receive only SHIPPED/PARTIAL via `040`. Read roles get no mutations. **States:** Base-D/F/M/X + `STATE-039`; supplier cannot see DRAFT before Submit.

#### `SCREEN-039` — Connected PO — Supplier

- **Objects:** supplier projection, same status/history, dual lines and conversion; no buyer-private data.
- **Actions:** `FORM-022`: Accept/Reject SUBMITTED, Ship ACCEPTED; O/A/PM only. Wrong organization denied. **States:** Base-D/F/M/X + `STATE-037/039`. No PARTIALLY_SHIPPED control/state.

#### `SCREEN-040` — Connected Receiving

- **Objects/form:** `FORM-023`, `TABLE-012`; `10 PACK / 50 KG`, receive 8 PACK → 40 KG → 110 KG, then 2 PACK → 10 KG → 120 KG.
- **Actions:** Confirm Receipt; open PO/product. **States:** Base-D/F/M + `STATE-037/038`; conversion and outstanding use supplier unit truth. R1 is usable at 768; visual uses the same one-handed core pattern as `SCREEN-024`.

### 5.5 Derived distinct surfaces

#### `SCREEN-041` — Password Reset

- `FORM-016`; Send reset link; Back to Login. Base-F/M. Completion copy is neutral, does not enumerate accounts, and states that instructions are sent if eligible.

#### `SCREEN-042` — Opening Balance

- `FORM-017`; Cancel / Record Opening Balance. Base-D/F/M + `STATE-037`; success shows movement reference and updates Product Stock tab. Not available after an opening/movement exists for the product-warehouse pair.

#### `SCREEN-043` — Mobile Application Navigation

- Full-height 390 px drawer: current organization monogram/full name, role, role-filtered sections/items, Network only with flag, Notifications/unread, Switch Workspace conditionally, profile/sign out. Trap focus; Escape/close restores trigger; active item identified beyond colour. No bottom-nav invention. This is an R2 visual.

#### `SCREEN-044` — Dashboard Owner/Admin

- All five KPIs, all permitted attention types, `TABLE-024..027`, `CHART-001..002`; actions to inventory, procurement, Team/Settings; Network content only with flag. `CHART-003` remains on `SCREEN-049`. Admin never receives an Owner-modification shortcut.

#### `SCREEN-045` — Dashboard Inventory Manager

- All five viewable KPIs; inventory-focused Needs Attention; Add/Edit Product, Opening Balance, Adjust Stock, Warehouses. No Network, Team, Settings, supplier management, or PO-write action. Receiving may be actioned.

#### `SCREEN-046` — Dashboard Procurement Manager

- All five KPIs; PO/receipt attention, supplier/buyer actions, permitted connection/connected-PO attention when flag on. No stock adjustment, inventory CRUD, Team, Settings, or Disable Connection.

#### `SCREEN-047` — Dashboard Storekeeper

- Readable KPIs and operational attention; Receiving is primary and placed first; Products/Movements read links. No Adjust Stock, inventory CRUD, procurement management, Reports shortcut beyond permitted Stock-on-Hand if surfaced, Team, Settings, or Network.

#### `SCREEN-048` — Stock-on-Hand Report

- `TABLE-013`; warehouse/category/status filters, Clear, CSV Export. No chart is rendered on this tab; `CHART-001/002` remain Dashboard-only. All roles can view/export this authorized dataset. States Base-L/D/M for export. Replacement-cost value disclosure is visible.

#### `SCREEN-049` — Purchase-Order Report

- `TABLE-014`; status/date/kind filters, Clear, CSV Export; optional reuse of `CHART-003`. Only O/A/IM/PM/AN. SK/VW tab absent and direct query denied. States Base-L/D/M for export.

#### `SCREEN-050` — Invitation Link Modal

- Displays organization, invitee email, offered role, expiry, invite link once, Copy button, warning “This link will not be shown again.” Close permanently hides link. `STATE-042`; copy success toast. No plaintext token retained on Team table.

#### `SCREEN-051` — Product Publish Dialog

- `FORM-019`; explicit safe-field/privacy explanation; Cancel / Publish or Update. Base-D/F/M. Unpublish occurs outside in an object-named confirmation. Raster designs are UI references only; no private data is copied into partner projection.

#### `SCREEN-052` — Notification Menu

- Latest bounded notifications with read state, organization context, time, empty copy; unread count. Actions open authorized related object, mark read, and View all → `026`. If target is no longer authorized, open safe denied/not-found behavior without payload leakage. At mobile size this is a full-width anchored panel, not a new route.

## 6. Navigation, breadcrumb, tab, and link outcomes

| Source | Control | Destination / outcome |
|---|---|---|
| Public header | Login / Create Workspace | `/login` / `/signup` |
| Login | Forgot Password | `SCREEN-041` reset state |
| Auth routing | 0 / 1 / many memberships | `/onboarding` / organization dashboard / `/select-workspace` |
| Shell logo | Dashboard | `/app/:handle/dashboard` |
| Products | Product row / Add / Edit | detail / new / edit exact routes |
| Product detail | Stock actions | `SCREEN-016` or `042`, never invented routes |
| Dashboard KPI/attention | contextual resolution | exact filtered Product, PO, Receiving, Connection page; no dead cards |
| Supplier/Buyer row | Partner detail | correct suppliers or buyers parameterized route |
| PO row | PO detail | `/app/:handle/procurement/purchase-orders/:poId` |
| PO detail | Receive | `/app/:handle/procurement/receiving/:poId` |
| Reports tabs | Stock / PO | `?tab=stock-on-hand` / `?tab=purchase-orders`, authorization per tab |
| Bell | notification popover | `SCREEN-052`; View all → `/app/:handle/notifications` |
| Team Invite | successful create | `SCREEN-050`, link shown once |
| Connections | Find business | `SCREEN-032`; no route |
| Connection detail | New mapping | `/app/:handle/network/mappings/new` with connection context |
| Partner catalog | Publish | `SCREEN-051`; no route |
| Buyer catalog | Map item | mapping wizard with safe supplier/item context |
| Connected PO | Receive | connected receiving exact route |
| Permission denied | Safe action | a route allowed by current role |
| 404 | Safe action | public home or authenticated dashboard |

Breadcrumbs never contain inaccessible links. Standard organization breadcrumbs are `Inventory / Products / …`, `Procurement / Purchase Orders / …`, `Network / …`, `Reports`, `Notifications`, `Team`, or `Settings`. Modals/panels inherit their host breadcrumb and do not create breadcrumb entries.

## 7. Action outcome and destructive-action rules

- `Archive Product`, `Archive Warehouse`, `Cancel Purchase Order`, `Disable Connection`, `Disable Mapping`, `Suspend Member`, `Remove Member`, `Revoke Invitation`, and any stock reduction over 50% use `STATE-008` and name the object.
- Ordinary Save, filter, tab switch, mark-read, and non-destructive navigation never request confirmation.
- Every command disables its trigger while pending. Retrying adjustment, receiving, connected submit/ship/receive with the same operation id returns the stored result; a different payload using the same id is rejected clearly.
- PO actions are state-gated: Private `DRAFT → ORDERED → PARTIALLY_RECEIVED → RECEIVED`, with DRAFT/ORDERED cancellation only before receipt. Connected `DRAFT → SUBMITTED → ACCEPTED → SHIPPED → PARTIALLY_RECEIVED → RECEIVED`; supplier may REJECT from SUBMITTED; buyer may CANCEL DRAFT/SUBMITTED; there is no partial ship.
- Private screens never show supplier Accept/Reject/Ship. Connected views attribute every event to actor and organization.

## 8. Acceptance and reconciliation

| Check | Result |
|---|---|
| Exact canonical routes represented | PASS |
| Canonical aliases `SCREEN-001..040` | 40 / 40 |
| Derived surfaces `SCREEN-041..052` | 12 / 12 |
| Total surfaces | 52 |
| Dedicated R2 surfaces | 11 / 11 |
| Forms | 23 |
| Tables | 27 |
| Chart ceiling | 3 exactly |
| All seven roles and report-tab distinctions | PASS |
| Base loading/empty/error/success/validation/permission/submitting/confirmation contracts | PASS |
| Branded-login states | 8 / 8 |
| Discovery states | 7 / 7 |
| Mapping error states | 7 / 7 |
| Canonical demo chain and final value | `18 → 20 → 60 → 70 → 70 → 110 → 120 KG`; `LKR 691,700.00` |
| Release B-PLUS/C/D leakage | none authorized |
| New production routes/components | none |

**Registry result:** all 52 surfaces have a route/host, access, responsive class, purpose/content, objects, actions/outcomes, fields/tables where applicable, states, navigation destination, and acceptance trace through `18`.
