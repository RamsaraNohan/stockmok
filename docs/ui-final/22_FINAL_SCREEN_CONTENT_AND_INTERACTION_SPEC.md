# Stockmok Final Screen Content and Interaction Specification

**Status:** AUTHORITATIVE  
**Scope:** Release A + Release B-Lite only  
**Depends on:** files 02-08, 10, 11, 17 and UI files 18-21/23-25  
**UI architecture freeze candidate:** PASS

## 1. Global interaction contract

Every screen uses the Stockmok shell and the 25-component system unless explicitly public or pre-organization. Every route-backed data screen provides layout-shaped loading, populated, empty, recoverable error, and direct-URL permission-denied behavior. Every mutation provides validation, submitting, success with updated data visible, and a durable inline failure; a toast is supplementary, never the only result.

- Authenticated routes are handle-scoped: `/app/:handle/...`.
- Current organization monogram, full name, role, notification count, and user menu remain visible in the shell.
- Unauthorized actions are hidden. A disabled control with tooltip is used only when omission would make the surrounding state incomprehensible.
- Cursor pagination uses 25 rows; Previous/Next and range label; 100 is the hard maximum query page.
- Table sorting is server-side and appears only on indexed columns.
- Destructive confirmations name the affected object and consequence. Archive/deactivate replaces hard deletion.
- Commands preserve one `operationId` from opening through retry. Submitting controls remain disabled during 1-3 second callable cold starts.
- Persistent errors are inline. Raw Firebase/error codes never appear.
- Status is always text plus icon, never color-only.
- Desktop specifications target 1280/1440 px; tablet 768 px; dedicated R2 mobile frames use 390 px.

## 2. Canonical scenario and sample data

| Object | Canonical value |
|---|---|
| Buyer | Grand Ocean Hotel, `@grand-ocean`, LKR |
| Connected supplier | Fresh Foods Ltd, `@freshfoods` |
| User | Nimal Perera, Inventory Manager; requested Owner during role-context demonstration |
| Product | Chicken Breast, `MEAT-001`, base unit KG |
| Opening balance | 18 KG, minimum 20 KG, reorder target 50 KG |
| Adjustment | +2 KG, result 20 KG |
| Private receipts | +40 KG then +10 KG, result 70 KG |
| Supplier item | Fresh Chicken Breast 5 KG Pack, `CKN-B5`, unit PACK |
| Conversion | 1 PACK = 5 KG; 10 PACK = 50 KG |
| Connected receipts | 8 PACK = 40 KG, result 110 KG; 2 PACK = 10 KG, result 120 KG |
| Inventory values | LKR 564,200 -> 566,700 -> 616,700 -> 629,200 -> 629,200 -> 679,200 -> 691,700 |
| Additional products | Mini Bar Water, Premium Towel, Hotel Shampoo, Coffee Beans, Cleaning Supplies |

The `18 -> 58 -> 68 KG` isolated sequence is prohibited in final visuals.

## 3. Shared object registries

### 3.1 Actions

| ID | Label | Type | Outcome | Principal constraints |
|---|---|---|---|---|
| ACTION-001 | Get started | Link | `/signup` | Public |
| ACTION-002 | Sign in | Submit | Resolve memberships and route | Neutral auth errors; disabled while pending |
| ACTION-003 | Continue with Google | Auth | Google popup then membership routing | No implied role grant |
| ACTION-004 | Reset password | Submit | Send generic reset response | Never disclose account existence |
| ACTION-005 | Select workspace | Link | Target organization dashboard | ACTIVE memberships only |
| ACTION-006 | Create workspace | Submit | Create org, owner membership, defaults, first warehouse | Atomic; handle validation |
| ACTION-007 | Switch workspace | Menu action | Navigate to selected handle | Full current org name remains visible |
| ACTION-008 | Open notifications | Menu/link | Notification menu or center | All active members |
| ACTION-009 | Add product | Link | Product form | Owner/Admin/Inventory Manager |
| ACTION-010 | Save product | Submit | Create/update product and show detail | Unique SKU; operation replay safe |
| ACTION-011 | Archive product | Destructive command | Status becomes Archived | Named confirmation; unavailable for new PO/mapping |
| ACTION-012 | Add category | Dialog submit | Create category | Inventory writers |
| ACTION-013 | Archive category | Destructive command | Archive if allowed | Named confirmation |
| ACTION-014 | Add warehouse | Dialog submit | Create warehouse | Inventory writers |
| ACTION-015 | Archive warehouse | Destructive command | Archive after zero-balance/open-receipt guards | Show exact blocking reason |
| ACTION-016 | Set opening balance | Dialog submit | Immutable opening movement and balance | One per product/location policy; reason/reference |
| ACTION-017 | Adjust stock | Dialog submit | Atomic movement and balance | Owner/Admin/Inventory Manager; Storekeeper denied |
| ACTION-018 | View movement source | Link | Relevant product or PO detail | Source-aware |
| ACTION-019 | Add private supplier | Dialog submit | Create SUPPLIER partner | Procurement roles |
| ACTION-020 | Add private buyer | Dialog submit | Create BUYER directory entry | No sales workflow implied |
| ACTION-021 | Create purchase order | Link | PO builder | Owner/Admin/Procurement Manager |
| ACTION-022 | Save draft | Command | Persist DRAFT PO | Snapshot fields |
| ACTION-023 | Place order | Command | DRAFT -> ORDERED | Private PO only |
| ACTION-024 | Cancel order | Destructive command | Allowed state -> CANCELLED | Not after receipt/acceptance constraints |
| ACTION-025 | Receive selected items | Command | Partial/full receipt and stock movements | Receiver roles; over-receipt blocked |
| ACTION-026 | Export CSV | Download | Export current authorized report/filter | No forbidden tab data |
| ACTION-027 | Mark read | Command | Notification becomes read | Current user only |
| ACTION-028 | Mark all read | Command | All visible notifications read | Current user only |
| ACTION-029 | Invite user | Dialog submit | Create 7-day invitation | Owner/Admin; fixed role |
| ACTION-030 | Copy invitation link | Clipboard | Copy raw link shown once | No email-delivery claim |
| ACTION-031 | Change role | Command | Membership role updates | Admin cannot modify Owner |
| ACTION-032 | Suspend member | Destructive command | ACTIVE -> SUSPENDED | Owner protected |
| ACTION-033 | Remove member | Destructive command | Membership -> REMOVED | Owner protected |
| ACTION-034 | Save organization profile | Submit | Update allowed profile fields | Owner/Admin |
| ACTION-035 | Save business defaults | Submit | Update currency/timezone/defaults | Frozen supported settings only |
| ACTION-036 | Find business | Command | Exact-handle directory lookup | No directory list/search |
| ACTION-037 | Send connection request | Command | none -> PENDING | Prevent self/duplicate requests |
| ACTION-038 | Accept connection | Command | PENDING -> ACTIVE | Recipient org only |
| ACTION-039 | Reject connection | Command | PENDING -> REJECTED | Recipient org only |
| ACTION-040 | Disable connection | Destructive command | ACTIVE -> DISABLED | History remains visible |
| ACTION-041 | Publish partner item | Dialog submit | Create/update safe catalog projection | No exact stock/cost/internal fields |
| ACTION-042 | Unpublish partner item | Command | Remove shared availability | Existing history remains |
| ACTION-043 | Start mapping | Link | Five-step mapping wizard | Active connection required |
| ACTION-044 | Check supplier SKU | Callable | Resolve one published catalog item | Searching/not found/unpublished/stale states |
| ACTION-045 | Create verified mapping | Command | Mapping becomes VERIFIED | Semantic confirmation + positive factor |
| ACTION-046 | Disable mapping | Destructive command | VERIFIED -> DISABLED | Historical PO snapshots unaffected |
| ACTION-047 | Submit connected PO | Command | DRAFT -> SUBMITTED | Buyer only |
| ACTION-048 | Accept connected PO | Command | SUBMITTED -> ACCEPTED | Supplier Owner/Admin/Procurement Manager |
| ACTION-049 | Reject connected PO | Command | SUBMITTED -> REJECTED | Supplier role and reason |
| ACTION-050 | Mark shipped | Command | ACCEPTED -> SHIPPED | Supplier role; dispatch movement |
| ACTION-051 | Retry | Command | Repeat failed query/command safely | Reuse operationId for command retry |
| ACTION-052 | Return to dashboard | Link | Current workspace dashboard | Error/denied fallback |
| ACTION-053 | Sign out | Auth | End session, route to login | User menu |
| ACTION-054 | Collapse navigation | UI | Toggle sidebar width | Labels preserved through tooltips/aria labels |
| ACTION-055 | Open mobile navigation | UI | Focus-trapped drawer | 44 px target; restore focus |
| ACTION-056 | Apply filters | Query | Refresh first cursor page | Accessible active-filter summary |
| ACTION-057 | Clear filters | Query | Reset defaults | Disabled when none active |
| ACTION-058 | Previous page | Query | Previous cursor page | Disabled first page |
| ACTION-059 | Next page | Query | Next cursor page | Disabled last page |
| ACTION-060 | Accept invitation | Command | PENDING -> ACCEPTED and route | Token/org/user mismatch handling |
| ACTION-061 | Create account | Submit | Create Firebase account and dispatch by membership count | Sign-up validation; neutral provider errors; disabled while pending |

### 3.2 Field definitions

| ID | Label / type | Required validation and help |
|---|---|---|
| FIELD-001 | Email / email | Required, trimmed, valid email; neutral auth failure |
| FIELD-002 | Password / password | Required; never stored or echoed |
| FIELD-003 | Requested role / select | Optional; default Detect automatically; preference only |
| FIELD-004 | Business name / text | Required, human-readable |
| FIELD-005 | Handle / text | Required, normalized, syntax/reserved/taken checks |
| FIELD-006 | Industry / select | Required from supported list |
| FIELD-007 | Country / select | Required |
| FIELD-008 | Currency / select | Required; Release A fixed per org, canonical LKR |
| FIELD-009 | Timezone / select | Required IANA timezone |
| FIELD-010 | First warehouse / text | Required during onboarding |
| FIELD-011 | Product name / text | Required |
| FIELD-012 | Internal SKU / text | Required, organization-unique normalized value |
| FIELD-013 | Category / select | Required active category |
| FIELD-014 | Base unit / select | Required supported unit |
| FIELD-015 | Purchase cost / money | Non-negative integer-minor representation |
| FIELD-016 | Selling price / money | Optional/non-negative; not a sales feature |
| FIELD-017 | Minimum stock / quantity | Non-negative milli-unit quantity |
| FIELD-018 | Reorder target / quantity | Non-negative; normally >= minimum |
| FIELD-019 | Product status / select | Active/Archived through explicit command |
| FIELD-020 | Warehouse / select | Required active warehouse |
| FIELD-021 | Direction / radio | Increase or Decrease |
| FIELD-022 | Quantity / decimal | Required, >0; unit suffix; no negative result |
| FIELD-023 | Adjustment reason / text | Required, descriptive |
| FIELD-024 | RETIRED / tombstone | Reserved and intentionally unused; the canonical stock/opening-balance contracts generate operation and movement references and do not accept a user-editable reference |
| FIELD-025 | Partner name / text | Required |
| FIELD-026 | Partner type / fixed context | Supplier or Buyer; never ambiguous |
| FIELD-027 | Partner contact / text | Optional supported contact fields only |
| FIELD-028 | PO supplier / select | Required active private/connected counterparty |
| FIELD-029 | Expected date / date | Optional valid date |
| FIELD-030 | PO line product / select | Required active product |
| FIELD-031 | Ordered quantity / decimal | Required >0 |
| FIELD-032 | Unit price / money | Required non-negative for private PO |
| FIELD-033 | Receive now / decimal | >=0 and <= outstanding; supplier unit for connected |
| FIELD-034 | Invitation email / email | Required valid email |
| FIELD-035 | Invitation role / select | Required fixed non-Owner role as allowed |
| FIELD-036 | Organization profile fields | Name, industry, country; allowed values only |
| FIELD-037 | Business defaults | Currency/timezone and frozen supported defaults |
| FIELD-038 | Business handle lookup / text | Exact normalized handle only |
| FIELD-039 | Published product / select | Required active supplier product |
| FIELD-040 | Partner SKU / text | Required exact supplier code |
| FIELD-041 | Partner item name / text | Required public-safe label |
| FIELD-042 | Order unit / read-only value | Required and locked equal to the source product base unit |
| FIELD-043 | Pack description / text | Optional public-safe clarification of the package/unit |
| FIELD-044 | Availability / select | Coarse availability only; never exact stock |
| FIELD-045 | Buyer product / select | Required active product |
| FIELD-046 | Semantic confirmation / checkbox | Required, never pre-selected |
| FIELD-047 | Conversion factor / decimal | Required >0; `1 supplier unit = n buyer base units` |
| FIELD-048 | Rejection reason / textarea | Required for connected PO rejection |
| FIELD-049 | Search / search | Screen-specific indexed/text fields only |
| FIELD-050 | Category filter / select | Optional active category |
| FIELD-051 | Warehouse filter / select | Optional active warehouse |
| FIELD-052 | Stock status filter / select | In Stock/Low/Out of Stock |
| FIELD-053 | PO status filter / select | Only states valid for selected PO kind |
| FIELD-054 | Date range / date pair | Valid from <= to |
| FIELD-055 | Archived toggle / switch | Include archived records |
| FIELD-056 | Notification status / tabs | All/Unread/Read |
| FIELD-057 | Report kind / tabs | Role-filtered Stock on Hand/Purchase Orders |
| FIELD-058 | Member role / select | Cannot demote/replace protected Owner |
| FIELD-059 | Notes / textarea | Optional, length-bounded |
| FIELD-060 | Confirm object name / display | Confirmation text repeats affected object |

### 3.3 Table definitions

File 19 owns the immutable `TABLE-001..027` registry. This specification consumes the following canonical table IDs without redefining their columns:

| UI need | Canonical table ID |
|---|---|
| Product list | `TABLE-001` |
| Categories | `TABLE-002` |
| Warehouses | `TABLE-003` |
| Product stock by warehouse | `TABLE-004` |
| Product recent movements | `TABLE-005` |
| Movement history | `TABLE-006` |
| Suppliers/Buyers | `TABLE-007` |
| Partner open POs / history | `TABLE-008`, `TABLE-009` |
| Purchase-order list / lines | `TABLE-010`, `TABLE-011` |
| Receiving lines | `TABLE-012` |
| Stock-on-Hand / PO reports | `TABLE-013`, `TABLE-014` |
| Notifications | `TABLE-015` |
| Team / pending invitations | `TABLE-016`, `TABLE-017` |
| Connections and embedded detail tables | `TABLE-018..020` |
| Supplier / buyer partner catalog | `TABLE-021`, `TABLE-022` |
| Product mappings | `TABLE-023` |
| Dashboard activity, low stock, recent POs, location backing table | `TABLE-024..027` |

All canonical tables define matching skeleton rows, contextual empty state, recoverable error with ACTION-051, cursor pagination where collections can exceed 25, semantic header cells, and text alternatives.

## 4. Page-by-page specifications

The structure column lists the fixed visual order. `Global states` means loading/empty/error/success/denied/validation/submitting as applicable under section 1.

| Screen | Route / surface | Actor and purpose | Structure, actions, and content | Required special states |
|---|---|---|---|---|
| SCREEN-001 Public Home | `/` | Anyone; truthful product introduction | Public header; hero; inventory/procurement explanation; A features; conditional B-Lite section; security/coursework-honest trust copy; ACTION-001/ACTION-002; footer | B disabled copy removes Network claims; no fabricated customers/pricing/uptime |
| SCREEN-002 Sign Up | `/signup` | New user | Brand; FIELD-001/002; ACTION-003; submit; login link | Validation, neutral duplicate/auth failure, pending, success membership routing |
| SCREEN-003 Global Login | `/login` | Returning user | Brand; FIELD-001/002; ACTION-002/003/004 | R2; invalid credentials, pending, membership routing |
| SCREEN-004 Branded Login | `/b/:handle` | User entering known business | Public-safe monogram/name/handle; FIELD-001/002/003; ACTION-002/003 | R2; resolving, not found, ready, neutral auth fail, non-member, role mismatch, correct-role offer, suspended |
| SCREEN-005 Invitation Accept | `/invite/:token` | Invitee | Organization identity, offered role, expiry, sign-in context, ACTION-060 | Pending, accepted, expired, revoked, reused, email mismatch, unauthenticated |
| SCREEN-006 Workspace Selector | `/select-workspace` | Multi-org user | Membership cards with full name/monogram/role/status; ACTION-005; onboarding option if eligible | R2; loading, no active memberships, suspended membership, many memberships |
| SCREEN-007 Onboarding | `/onboarding` | New Owner | Four-step Stepper: business, locale, first warehouse, review; FIELD-004..010; ACTION-006 | Handle invalid/taken/reserved; network retry; atomic success; no half-created org |
| SCREEN-008 App Shell | wrapper | Active member | Header, workspace identity/switcher, role badge, bell, user menu; sidebar sections; PageHeader; ACTION-007/008/053/054 | Expanded/collapsed, role variants, Network flag, unresolved membership skeleton |
| SCREEN-009 Empty Dashboard | `.../dashboard` | Any member | KPI skeleton/zero context; setup checklist; Needs Attention empty; role-allowed setup links | New workspace, limited-role checklist, per-panel error |
| SCREEN-010 Populated Dashboard | same | Any member | KPI row; Needs Attention; TABLE-024/025/026/027; stock-status donut; inventory-by-location bar/table; recent POs | R2; role-filtered cards/actions; per-panel loading/error; final LKR 691,700 state |
| SCREEN-011 Product List | `.../inventory/products` | All read | PageHeader ACTION-009; FilterBar FIELD-049..055; TABLE-001; pagination | R2; no products, no filter results, archived view, reader actions hidden |
| SCREEN-012 Product Create/Edit | `.../products/new`, `.../:id/edit` | Inventory writer | Form FIELD-011..018; Save/Cancel; archive separately | SKU duplicate, invalid money/quantity, unsaved changes, replay-safe success |
| SCREEN-013 Product Detail | `.../products/:id` | All read | Header/status/actions; Overview, Stock, Suppliers, Buyers, Activity tabs; TABLE-004 and recent TABLE-005 | R2; Buyers tab exists only when Network is enabled; archived product; B mapping content flag; permissions |
| SCREEN-014 Categories | `.../inventory/categories` | Inventory writer | Filter/search; TABLE-002; ACTION-012/013 dialogs | Archive blocked/confirmed, empty, duplicate name |
| SCREEN-015 Warehouses | `.../inventory/warehouses` | Inventory writer | TABLE-003; ACTION-014/015; opening-balance entry point | Archive blocked by non-zero balance/open receiving; empty |
| SCREEN-016 Stock Adjustment | Modal on product/list | Inventory writer | Product/SKU; FIELD-020 warehouse, FIELD-021 direction, FIELD-022 quantity, FIELD-023 reason; Current -> Change -> Result; ACTION-017 | R2 full-height sheet; zero, missing reason, negative result, submitting, replayed success with generated movement ID |
| SCREEN-017 Movement History | `.../inventory/movements` | Authorized readers except Viewer | FilterBar; TABLE-006; ACTION-018 | Immutable/no edit actions; no results; source unavailable but snapshot retained |
| SCREEN-018 Suppliers | `.../procurement/suppliers` | Procurement roles | Private/Connected/Pending tabs; TABLE-007; ACTION-019; discovery entry when B enabled | B disabled explanatory state; empty per tab |
| SCREEN-019 Buyers | `.../procurement/buyers` | Procurement roles | Private/Connected/Pending tabs; TABLE-007; ACTION-020 | Directory-only A copy; never sales/order-receivable actions |
| SCREEN-020 Partner Detail | `.../suppliers/:id` or buyers equivalent | Procurement roles | Identity, type/status, contact, related products/mappings/POs/activity | Private vs Connected identity; disabled connection history |
| SCREEN-021 PO List | `.../purchase-orders` | Procurement/write or authorized read | Private/Connected tabs; FilterBar; TABLE-010; ACTION-021 | Role-filtered create; B disabled tab state; status/kind empty states |
| SCREEN-022 PO Builder | `.../purchase-orders/new` | Private PO writer | Four-step Stepper: private supplier, lines, terms, review; FIELD-028..032/059; ACTION-022 Save draft and ACTION-023 Place order | Supplier/product archived, quantity/price errors, empty lines, draft replay; connected draft/submit behavior belongs to SCREEN-038 and FORM-021 |
| SCREEN-023 PO Detail | `.../purchase-orders/:poId` | Authorized PO readers | Header, type badge/status; summary; TABLE-011; totals; actor timeline; state-valid actions | R2; private lifecycle boards; connected buyer/supplier variation; cancelled/rejected/received terminal states |
| SCREEN-024 Receiving | `.../procurement/receiving` and `.../:poId` | Receiver roles | PO selector/summary; TABLE-012; FIELD-033/020; sticky ACTION-025 | R2 priority; partial/full, conversion, over-receipt, zero selection, stale PO, operation replay, 110/120 KG results |
| SCREEN-025 Reports | `.../reports` | Role-filtered analysts/readers | FIELD-057 tabs; filters; authorized TABLE-013/014; PO-status bar on PO tab; ACTION-026 | Viewer sees Stock on Hand only; Storekeeper lacks PO tab; export errors |
| SCREEN-026 Notifications | `.../notifications` | Current user | FIELD-056; TABLE-015; ACTION-027/028 | R2; unread/read/empty/error; per-user privacy |
| SCREEN-027 Team | `.../team` | Owner/Admin | TABLE-016/017; ACTION-029..033; invitation link dialog | Protected Owner, suspended/removed/invited states, invitation errors |
| SCREEN-028 Settings | `.../settings` | Owner/Admin | Organization Profile, Business Defaults, Notifications, and Feature Flags sections; FIELD-036/037; ACTION-034/035 | Supported settings only; no upload/custom roles/multi-currency/dark theme |
| SCREEN-029 Permission Denied | Any guarded route | Authenticated but unauthorized | Required-role explanation without sensitive data; current role; ACTION-052 | Direct URL; suspended membership uses account-state variant |
| SCREEN-030 404 | `*` | Anyone/member | Contextual not-found message; public home or current dashboard action | Authenticated Network-disabled routes resolve here |
| SCREEN-031 Connected Businesses | `.../network/connections` | Owner/Admin/Procurement Manager | Incoming/outgoing/active/disabled filters; TABLE-018; ACTION-036 | B enabled only; incoming decision controls; connection states |
| SCREEN-032 Business Discovery | Panel on 31 | Same | FIELD-038; ACTION-036/037; exact result card | Idle/searching/found/not found/self/already active/already pending |
| SCREEN-033 Connection Detail | `.../network/connections/:id` | Same | Both organizations, status/direction/timeline, mappings, connected POs; ACTION-038/039/040 | Pending incoming/outgoing, active, rejected, disabled history |
| SCREEN-034 Partner Catalog Supplier | `.../network/partner-catalog` | Supplier procurement roles | TABLE-021; ACTION-041/042 | Publish dialog; safe projection preview; unpublished/empty/error |
| SCREEN-035 Partner Catalog Buyer | `.../network/partner-catalog/:supplierOrgId` | Connected buyer roles | Supplier identity; callable-backed TABLE-022; ACTION-043 | Loading latency, stale connection, no published items, callable error |
| SCREEN-036 Product Mapping Wizard | `.../network/mappings/new` | Connected buyer roles | Five-step Stepper; FIELD-045/040/046/047; side-by-side item cards; worked example; ACTION-044/045 | Idle/search/found; seven errors: inactive connection, absent SKU, unpublished, semantic unchecked, invalid factor, stale connection, duplicate |
| SCREEN-037 Mappings List | `.../network/mappings` | Connected buyer roles | FilterBar; TABLE-023; ACTION-043/046 | Verified, disabled, stale connection; no mappings |
| SCREEN-038 Connected PO Buyer | Shared PO detail route | Buyer procurement roles | Dual item representation in TABLE-011, conversion, buyer timeline, ACTION-047 where Draft | Draft/submitted/accepted/rejected/shipped/partial/received/cancelled where allowed |
| SCREEN-039 Connected PO Supplier | Shared PO detail route | Supplier procurement roles | Inbox context, buyer identity, supplier-unit lines, supplier timeline, ACTION-048/049/050 | Submitted decision, accepted, rejected, shipped, terminal states; no buyer receipt action |
| SCREEN-040 Connected Receiving | Shared receiving route | Buyer Owner/Admin/Inventory Manager/Procurement Manager/Storekeeper | Connected TABLE-012 with supplier-unit input/base conversion/current/after/outstanding | Partial/full/over-receipt/stale connection; 8 PACK then 2 PACK canonical states |
| SCREEN-041 Password Reset | `/login` recovery state | Anyone | FIELD-001; ACTION-004; back to login | Neutral response regardless of account existence; invalid email/network retry |
| SCREEN-042 Opening Balance | Dialog from setup/product | Inventory writer | Product/SKU/unit read-only, FIELD-020 warehouse and FIELD-022 quantity; generated operation reference; result preview; ACTION-016 | Duplicate opening, zero/negative, submitting, generated movement reference success |
| SCREEN-043 Mobile Navigation | Drawer | Active member | Monogram/full organization, role, role-filtered nav, bell/user actions; ACTION-055 | R2; focus trap/restore; Network flag; 44 px targets |
| SCREEN-044 Dashboard Owner/Admin | Dashboard variant | Owner/Admin | Full A+B navigation, Team/Settings, all authorized attention items | Role board variant |
| SCREEN-045 Dashboard Inventory Manager | Dashboard variant | Inventory Manager | Inventory/receiving/report attention; no Team/Settings/Network | Role board variant |
| SCREEN-046 Dashboard Procurement Manager | Dashboard variant | Procurement Manager | Procurement/Network attention; no stock adjustment/Team/Settings | Role board variant |
| SCREEN-047 Dashboard Storekeeper | Dashboard variant | Storekeeper | Receiving-first attention, product/movement read access, no stock adjustment | Role board variant |
| SCREEN-048 Stock-on-Hand Report | Tab on SCREEN-025 | Authorized report reader | TABLE-013 and ACTION-026; no chart on this tab | Viewer permitted; text summary/table authoritative |
| SCREEN-049 Purchase-Order Report | Tab on SCREEN-025 | Owner/Admin/Inventory Manager/Procurement Manager/Analyst as matrix allows | TABLE-014; PO-status bar; ACTION-026 | Forbidden tab omitted; text summary/table authoritative |
| SCREEN-050 Invitation Link | Modal on Team | Owner/Admin | One-time raw link, expiry, email/role; ACTION-030 | Copy success/failure; revoked/expired state; no email-sent claim |
| SCREEN-051 Publish Partner Item | Modal on catalog | Supplier procurement role | FIELD-039..044; safe projection preview; ACTION-041 | Exact stock/cost/internal data visibly excluded; validation/unpublish |
| SCREEN-052 Notification Menu | Header popover | Current user | Unread count, five recent items, mark-read, View all | Empty/error/loading; links respect current workspace/permissions |

## 5. Status semantics

| Domain | Statuses | Visible actions |
|---|---|---|
| Stock | In Stock, Low Stock, Out of Stock | View; Adjust only for inventory writers |
| Product/category/warehouse | Active, Archived | Archive/restore only where requirement and role permit; no hard delete |
| Membership | Active, Suspended, Removed | Change/Suspend/Remove under Owner protection |
| Invitation | Pending, Accepted, Expired, Revoked | Accept pending; copy/revoke where authorized |
| Connection | Pending, Active, Rejected, Disabled | Accept/reject incoming; disable active; restart only as contract allows |
| Mapping | Verified, Disabled | Disable verified; create replacement only through valid wizard |
| Private PO | Draft, Ordered, Partially Received, Received, Cancelled | State-valid place/cancel/receive |
| Connected PO | Draft, Submitted, Accepted, Rejected, Shipped, Partially Received, Received, Cancelled | Actor- and state-valid buyer/supplier/receiver actions only |

## 6. Responsive and accessibility acceptance

- R2 screens have dedicated prompts and 390 px images: SCREEN-003, 004, 006, 010, 011, 013, 016, 023, 024, 026, and 043.
- Tables become stacked cards with the field label repeated beside every value; core actions never require horizontal scrolling.
- Receiving keeps warehouse selection, conversion, current/after/outstanding quantities, and sticky confirmation usable one-handed.
- Stock adjustment becomes a full-height sheet with Current -> Change -> Result continuously visible.
- Every interactive element has visible keyboard focus; dialogs trap focus and restore it to the trigger.
- Validation is associated with its field and announced; page-level errors use an alert region; success changes remain visible after toast dismissal.
- Charts have adjacent text summaries and authoritative tables.
- All icons have text or accessible names; status never relies on hue; touch targets are at least 44 x 44 px.

## 7. Freeze result

- All 30 P0 and 10 P1 canonical screens are specified.
- Twelve derived, requirement-backed surfaces are specified without inventing routes.
- Every action has an outcome and role/state constraint.
- Every field has validation behavior.
- Every table has columns, filtering/sorting/mobile/state behavior.
- Release B-PLUS, C, and D surfaces are absent.
- `UI_ARCHITECTURE_FREEZE_CANDIDATE: PASS`
