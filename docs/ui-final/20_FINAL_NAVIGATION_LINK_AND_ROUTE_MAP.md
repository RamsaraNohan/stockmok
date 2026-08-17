# Stockmok Final Navigation, Link and Route Map

**Status:** authoritative Release A + Release B-Lite navigation contract  
**Gate contribution:** `UI_ARCHITECTURE_FREEZE`  
**Sources:** `02` requirements, `04` use cases, `05` domain/state contract, `06` hard RBAC matrix, `07` UI information architecture, `08` test matrix  
**Exclusions:** Release B-PLUS, C and D; no storefront route, sales workflow, marketplace, global search or command palette

## 1. Route and link rules

1. `:handle` is display and lookup context only. Every organization route resolves the immutable `organizationId`, then an `ACTIVE` Membership, before rendering tenant data.
2. Route guards render a layout-matched `SCREEN-008` application-shell skeleton while authentication, handle or membership state is unresolved. Children never render during that interval.
3. A role-forbidden direct URL renders `SCREEN-029` Permission Denied. It is not silently redirected.
4. If `settings.networkEnabled == false`, the NETWORK section and every `/network/*` link are omitted. An authenticated direct request to any Network route renders `SCREEN-030` 404, not Permission Denied; this prevents a disabled product area from appearing to exist.
5. Unknown public or authenticated paths render `SCREEN-030`. A missing resource on an otherwise allowed detail route also renders `SCREEN-030`, without revealing whether a cross-tenant resource exists.
6. Actions that a role cannot perform are hidden. A disabled control is retained only when omission would make the current state confusing; its tooltip names the required role or unmet state condition.
7. Route entitlement and sidebar inclusion are distinct. A role may open a read-only detail through a workflow link even when the corresponding list is not in its sidebar.
8. Query strings carry filters and selected tabs, never authorization claims. Canonical query keys are `tab`, `stockStatus`, `poStatus`, `supplierKind`, `warehouseId`, `categoryId`, `archived`, `unread`, `connectionStatus`, and `mappingStatus`.
9. Query values use domain enums exactly (`LOW_STOCK`, `OUT_OF_STOCK`, `ORDERED`, `SHIPPED`, `PRIVATE`, `CONNECTED`, and so on). Repeated filters use repeated keys; invalid values are ignored and announced as a cleared filter.
10. The public home describes Connected Businesses only when the deployment-level Release B switch is enabled. Organization-scoped marketing or onboarding copy mentions Network only when that organization's `networkEnabled` flag is true.

## 2. Guard outcomes

| Guard | Resolving | Pass | Failure outcome | Evidence |
|---|---|---|---|---|
| `PublicLayout` | Page skeleton where handle lookup is required | Render public page | Safe 404 for unknown public route/handle | FR-AUTH-007; T-AUTH-06..07 |
| `AuthLayout` | Authentication skeleton | Render `/select-workspace` or `/onboarding` | Return to `/login` with a local `returnTo`; never expose tenant data | FR-AUTH-006; T-AUTH-12..14 |
| `OrgLayout` | Shell skeleton with no child data | Render after ACTIVE membership is resolved | `SCREEN-029` for no membership/suspended membership; `SCREEN-030` for unknown resource | FR-ORG-007..010; T-SEC-02, T-SEC-07 |
| `RequireRole` | Action/page skeleton only if role is still unresolved | Render FULL, READ_ONLY or LIMITED surface | `SCREEN-029`; message names required capability and active role | BR-015; T-SEC-06; T-UI-06 |
| `RequireNetwork` | No speculative Network content | Render only when enabled | Authenticated `SCREEN-030`; no Network item/link remains | FR-ORG-013; scope freeze |

Post-authentication dispatch is exact: zero memberships -> `/onboarding`; one ACTIVE membership -> `/app/:handle/dashboard`; more than one -> `/select-workspace`. A workspace switch clears tenant queries, revalidates membership, and only then opens the target dashboard (`T-ORG-04`, `T-UI-12`).

## 3. Complete route registry

`SCREEN-001` through `SCREEN-040` preserve the canonical P0/P1 numbers from `07` as direct aliases. The frozen derived ledger is: `SCREEN-041` Password Reset, `SCREEN-042` Opening Balance, `SCREEN-043` Mobile Navigation, `SCREEN-044` Dashboard Owner/Admin, `SCREEN-045` Dashboard Inventory Manager, `SCREEN-046` Dashboard Procurement Manager, `SCREEN-047` Dashboard Storekeeper, `SCREEN-048` Stock-on-Hand Report, `SCREEN-049` Purchase-Order Report, `SCREEN-050` Invitation Link modal, `SCREEN-051` Publish Partner Item dialog, and `SCREEN-052` Notification Menu. Derived dialogs, responsive views and role variants do not create routes.

### 3.1 Public and pre-organization routes

| Route ID | Pattern | Screen | Release | Entry links | Successful outcome | Failure outcome |
|---|---|---|---|---|---|---|
| ROUTE-001 | `/` | SCREEN-001 Public Home | A | direct, logo, footer | Login -> ROUTE-003; Create Workspace -> ROUTE-002 | SCREEN-030 |
| ROUTE-002 | `/signup` | SCREEN-002 Sign Up | A | home header/closing CTA, login cross-link | authenticate then membership dispatch | neutral auth error; no enumeration |
| ROUTE-003 | `/login` | SCREEN-003 Global Login | A | home header, branded-login escape, auth redirects | authenticate then membership dispatch | neutral auth error |
| ROUTE-004 | `/b/:handle` | SCREEN-004 Branded Login | A | shared business link | authenticate, verify membership/role, open organization dashboard | safe handle-not-found; non-member/wrong-role/suspended state |
| ROUTE-005 | `/invite/:token` | SCREEN-005 Invitation Accept | A | one-time invitation link | accepted/idempotent -> organization dashboard | sign-in interstitial; email mismatch, expired, revoked or reused state |
| ROUTE-006 | `/select-workspace` | SCREEN-006 Workspace Selector | A | post-auth dispatch, header switcher | selected membership revalidated -> target dashboard | removed/suspended membership stays unrendered and is explained |
| ROUTE-007 | `/onboarding` | SCREEN-007 Business Onboarding | A | zero-membership dispatch, Create Workspace | atomic creation -> new dashboard | validation/retry; no half-created organization |
| ROUTE-008 | `*` | SCREEN-030 404 | A | unknown path/resource, disabled Network | contextual recovery link | never reveals resource existence |

`SCREEN-041` Password Reset is a focused subordinate surface launched from ROUTE-003 or ROUTE-004 and returns to its launching login after the Firebase reset request. It is deliberately not an invented route.

### 3.2 Organization-scoped Release A routes

Abbreviation: `APP = /app/:handle`.

| Route ID | Pattern | Canonical screen | Route access | Primary links/outcomes |
|---|---|---|---|---|
| ROUTE-009 | `APP/dashboard` | SCREEN-009 empty / SCREEN-010 populated; SCREEN-044..047 role variants | all seven roles | KPIs and attention rows deep-link to exact filtered routes |
| ROUTE-010 | `APP/inventory/products` | SCREEN-011 | all roles; writers get actions | New -> ROUTE-011; row -> ROUTE-012; filters stay here |
| ROUTE-011 | `APP/inventory/products/new` | SCREEN-012 | Owner, Admin, Inventory Manager | Save -> ROUTE-012; Cancel -> ROUTE-010 |
| ROUTE-012 | `APP/inventory/products/:productId` | SCREEN-013 | all roles | tabs via `?tab=`; edit/stock dialogs only when allowed |
| ROUTE-013 | `APP/inventory/products/:productId/edit` | SCREEN-012 | Owner, Admin, Inventory Manager | Save -> ROUTE-012; Cancel -> ROUTE-012 |
| ROUTE-014 | `APP/inventory/categories` | SCREEN-014 | Owner, Admin, Inventory Manager | create/edit/archive/restore remain on route |
| ROUTE-015 | `APP/inventory/warehouses` | SCREEN-015 | Owner, Admin, Inventory Manager | create/edit/archive/restore remain on route |
| ROUTE-016 | `APP/inventory/movements` | SCREEN-017 | all except Viewer | product/warehouse/type/date filters remain on route |
| ROUTE-017 | `APP/procurement/purchase-orders` | SCREEN-021 | Owner, Admin, Inventory Manager, Procurement Manager, Storekeeper, Analyst; Viewer denied | New visible only to PO writers; row -> ROUTE-019 |
| ROUTE-018 | `APP/procurement/purchase-orders/new` | SCREEN-022 | Owner, Admin, Procurement Manager | saved draft/ordered -> ROUTE-019; Cancel builder -> ROUTE-017 |
| ROUTE-019 | `APP/procurement/purchase-orders/:poId` | SCREEN-023 | Owner, Admin, Inventory Manager, Procurement Manager, Storekeeper, Analyst; Viewer denied | Receive -> ROUTE-021; legal transitions stay on detail |
| ROUTE-020 | `APP/procurement/receiving` | SCREEN-024 | Owner, Admin, Inventory Manager, Procurement Manager, Storekeeper | eligible PO -> ROUTE-021 |
| ROUTE-021 | `APP/procurement/receiving/:poId` | SCREEN-024 / SCREEN-040 connected | Owner, Admin, Inventory Manager, Procurement Manager, Storekeeper | confirmed receipt -> ROUTE-019 with movement reference |
| ROUTE-022 | `APP/procurement/suppliers` | SCREEN-018 | Owner, Admin, Procurement Manager | private row -> ROUTE-023; connected tab uses Network links only when enabled |
| ROUTE-023 | `APP/procurement/suppliers/:partnerId` | SCREEN-020 | Owner, Admin, Procurement Manager | edit/deactivate stay on detail; PO -> ROUTE-019 |
| ROUTE-024 | `APP/procurement/buyers` | SCREEN-019 | Owner, Admin, Procurement Manager | private row -> ROUTE-025; no sales CTA |
| ROUTE-025 | `APP/procurement/buyers/:partnerId` | SCREEN-020 | Owner, Admin, Procurement Manager | edit/deactivate stay on detail; no outbound workflow |
| ROUTE-026 | `APP/reports` | SCREEN-025 shell; SCREEN-048/049 report tabs | all roles with tab-level restriction | `?tab=stock-on-hand` or `?tab=purchase-orders`; export if tab is allowed |
| ROUTE-027 | `APP/notifications` | SCREEN-026 | all seven roles | reference -> allowed target; mark read remains on route |
| ROUTE-028 | `APP/team` | SCREEN-027 | Owner, Admin | invitations/member commands remain on route |
| ROUTE-029 | `APP/settings` | SCREEN-028 | Owner, Admin | profile/defaults/feature flags remain on route |
| ROUTE-030 | any role-forbidden valid path | SCREEN-029 | any authenticated member | recovery -> dashboard or nearest allowed parent | no silent redirect |

Stock Adjustment, `SCREEN-042` Record Opening Balance, Invite Member, `SCREEN-050` invitation-link success, destructive confirmations, `SCREEN-052` notification menu and user menus are modal, popover or drawer surfaces. They never receive a URL.

### 3.3 Organization-scoped Release B-Lite routes

All routes below require `networkEnabled == true` and one of Owner, Admin or Procurement Manager. Analyst has no Network access.

| Route ID | Pattern | Canonical screen | Primary links/outcomes |
|---|---|---|---|
| ROUTE-031 | `APP/network/connections` | SCREEN-031 | Find Business opens SCREEN-032 panel; row -> ROUTE-032; request stays on list |
| ROUTE-032 | `APP/network/connections/:connectionId` | SCREEN-033 | accept/reject/disable stay on detail; catalog -> ROUTE-034 |
| ROUTE-033 | `APP/network/partner-catalog` | SCREEN-034 supplier view; SCREEN-051 publish dialog | Publish/Unpublish dialog stays on route |
| ROUTE-034 | `APP/network/partner-catalog/:supplierOrgId` | SCREEN-035 buyer browse | Map item -> ROUTE-036 with selected supplier/catalog context |
| ROUTE-035 | `APP/network/mappings` | SCREEN-037 | New Mapping -> ROUTE-036; row expands/details in list; disable stays on list |
| ROUTE-036 | `APP/network/mappings/new` | SCREEN-036 | Create -> ROUTE-035 filtered to VERIFIED; Cancel -> ROUTE-035 |

Connected purchase orders reuse ROUTE-017 through ROUTE-021. SCREEN-038 and SCREEN-039 are role/state variants of ROUTE-019; SCREEN-040 is the connected variant of ROUTE-021. No duplicate Connected PO route is invented.

## 4. Sidebar, header and utility navigation

### 4.1 Sidebar order and access

| Item / LINK ID | Destination | Owner | Admin | Inventory Mgr | Procurement Mgr | Storekeeper | Analyst | Viewer | Flag |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| LINK-001 Dashboard | ROUTE-009 | FULL | FULL | FULL | FULL | FULL | FULL | FULL | A |
| LINK-002 Products | ROUTE-010 | FULL | FULL | FULL | READ_ONLY | READ_ONLY | READ_ONLY | READ_ONLY | A |
| LINK-003 Categories | ROUTE-014 | FULL | FULL | FULL | HIDDEN | HIDDEN | HIDDEN | HIDDEN | A |
| LINK-004 Warehouses | ROUTE-015 | FULL | FULL | FULL | HIDDEN | HIDDEN | HIDDEN | HIDDEN | A |
| LINK-005 Stock Movements | ROUTE-016 | FULL | FULL | FULL | READ_ONLY | FULL | READ_ONLY | HIDDEN | A |
| LINK-006 Purchase Orders | ROUTE-017 | FULL | FULL | HIDDEN | FULL | HIDDEN | READ_ONLY | HIDDEN | A |
| LINK-007 Receiving | ROUTE-020 | FULL | FULL | FULL | FULL | FULL | HIDDEN | HIDDEN | A |
| LINK-008 Suppliers | ROUTE-022 | FULL | FULL | HIDDEN | FULL | HIDDEN | HIDDEN | HIDDEN | A |
| LINK-009 Buyers | ROUTE-024 | FULL | FULL | HIDDEN | FULL | HIDDEN | HIDDEN | HIDDEN | A |
| LINK-010 Connected Businesses | ROUTE-031 | FULL | FULL | HIDDEN | FULL | HIDDEN | HIDDEN | HIDDEN | B + enabled |
| LINK-011 Partner Catalog | ROUTE-033 | FULL | FULL | HIDDEN | FULL | HIDDEN | HIDDEN | HIDDEN | B + enabled |
| LINK-012 Product Mappings | ROUTE-035 | FULL | FULL | HIDDEN | FULL | HIDDEN | HIDDEN | HIDDEN | B + enabled |
| LINK-013 Reports | ROUTE-026 | FULL | FULL | FULL | FULL | HIDDEN | FULL | LIMITED | A |
| LINK-014 Notifications | ROUTE-027 | FULL | FULL | FULL | FULL | FULL | FULL | FULL | A |
| LINK-015 Team | ROUTE-028 | FULL | FULL | HIDDEN | HIDDEN | HIDDEN | HIDDEN | HIDDEN | A |
| LINK-016 Settings | ROUTE-029 | FULL | FULL | HIDDEN | HIDDEN | HIDDEN | HIDDEN | HIDDEN | A |

`HIDDEN` in this table means absent from the sidebar. It does not broaden or narrow the hard route/capability decisions in file 23. In particular, Inventory Manager and Storekeeper can follow contextual read links to a PO they are entitled to view even though Purchase Orders is not a sidebar item.

### 4.2 Header and mobile shell links

| Link ID | Control | Outcome |
|---|---|---|
| LINK-017 | Stockmok mark | ROUTE-009 when authenticated; ROUTE-001 when public |
| LINK-018 | Organization identity | no navigation; prevents wrong-workspace action |
| LINK-019 | Workspace switcher | opens selector drawer; selection performs the ROUTE-006 revalidation flow |
| LINK-020 | Notification bell | opens SCREEN-052 notification menu; View all -> ROUTE-027 |
| LINK-021 | Notification row | allowed reference route; if inaccessible, ROUTE-027 keeps the row and explains that access changed |
| LINK-022 | User menu / Profile | opens account popover; no invented profile route |
| LINK-023 | Sign out | clears tenant cache, signs out, then ROUTE-003 |
| LINK-024 | Skip to content | focuses the current page's main landmark |
| LINK-025 | Mobile menu | opens SCREEN-043, the role-filtered navigation drawer; selection closes it and follows LINK-001..016 |

## 5. Breadcrumb contract

Breadcrumbs begin with the linked Dashboard crumb and end with an unlinked current-page label. On 390 px, keep Dashboard, the immediate parent and current page; intermediate crumbs collapse into an accessible overflow menu.

| Route family | Breadcrumb pattern |
|---|---|
| Dashboard | `Dashboard` |
| Product list | `Dashboard / Products` |
| Product new | `Dashboard / Products / New product` |
| Product detail | `Dashboard / Products / {Product name}` |
| Product edit | `Dashboard / Products / {Product name} / Edit` |
| Categories / Warehouses / Movements | `Dashboard / {Current inventory page}` |
| PO list | `Dashboard / Purchase Orders` |
| PO new | `Dashboard / Purchase Orders / New purchase order` |
| PO detail | `Dashboard / Purchase Orders / {Order number}` |
| Receiving list | `Dashboard / Receiving` |
| Receiving detail | `Dashboard / Receiving / {Order number}` |
| Supplier or Buyer list | `Dashboard / {Suppliers|Buyers}` |
| Partner detail | `Dashboard / {Suppliers|Buyers} / {Partner name}` |
| Connections | `Dashboard / Connected Businesses` |
| Connection detail | `Dashboard / Connected Businesses / @{handle}` |
| Supplier catalog | `Dashboard / Partner Catalog` |
| Buyer browse | `Dashboard / Partner Catalog / @{supplierHandle}` |
| Mappings | `Dashboard / Product Mappings` |
| Mapping new | `Dashboard / Product Mappings / New mapping` |
| Reports / Notifications / Team / Settings | `Dashboard / {Current page}` |

Dynamic crumb labels render only after the allowed resource has loaded; they never leak names from a forbidden organization.

## 6. Tabs and internal links

| Link IDs | Surface | Tab values and access |
|---|---|---|
| LINK-026..030 | Product detail | `overview`, `stock`, `suppliers`, `buyers`, `activity`; Buyers exists only when Network enabled; Storefront never exists in A/B |
| LINK-031..033 | Suppliers/Buyers directory | `private`, `connected`, `pending`; connected/pending explain availability when B is disabled and never link to disabled routes |
| LINK-034 | Reports: Stock on Hand | SCREEN-048 at `?tab=stock-on-hand`; all roles; Viewer is LIMITED to this tab |
| LINK-035 | Reports: Purchase Orders | SCREEN-049 at `?tab=purchase-orders`; Owner, Admin, Inventory Manager, Procurement Manager and Analyst only |
| LINK-036..039 | Settings | `organization-profile`, `business-defaults`, `notifications`, `feature-flags`; Owner/Admin only, supported settings only and no Release D setting |

Report tab enforcement is three-layered: a forbidden tab is absent; manually typing its query value renders an inline Permission Denied report panel without executing its query; its CSV export action is also absent and backend authorization still applies. Storekeeper and Viewer receive Stock on Hand only. This is the authoritative resolution of report permissions at tab/action level.

## 7. Dashboard and operational deep links

| Link ID | Source | Canonical destination |
|---|---|---|
| LINK-040 | Inventory Value KPI | ROUTE-026 `?tab=stock-on-hand` |
| LINK-041 | Active SKUs KPI | ROUTE-010 `?archived=false` |
| LINK-042 | Low Stock KPI/row | ROUTE-010 `?stockStatus=LOW_STOCK` |
| LINK-043 | Out of Stock row | ROUTE-010 `?stockStatus=OUT_OF_STOCK` |
| LINK-044 | Open POs KPI | ROUTE-017 with repeated `poStatus` for all non-final statuses the role may view |
| LINK-045 | Awaiting Receipt KPI/row | ROUTE-020; direct row links to ROUTE-021 |
| LINK-046 | Pending connection request | ROUTE-031 `?connectionStatus=PENDING`; omitted if Network disabled or role lacks Network |
| LINK-047 | Connected PO awaiting response | ROUTE-017 `?supplierKind=CONNECTED&poStatus=SUBMITTED`; omitted if Network disabled or role lacks permission |
| LINK-048 | Recent Activity object | its allowed detail route; non-link text if the role cannot open the object |
| LINK-049 | Inventory by Location | ROUTE-026 `?tab=stock-on-hand&warehouseId={id}` |

Filter serialization must be deterministic so `T-REPORT-08` can assert the exact destination. Cards remain non-interactive when the active role lacks the destination; they expose an explanatory text summary instead of a dead link.

## 8. Action and CTA outcome registry

| Action ID | Label / source | Visible to | Preconditions | Outcome |
|---|---|---|---|---|
| ACTION-001 | Get started | visitor | deployment available | ROUTE-002 `/signup` |
| ACTION-061 | Create account | visitor | valid sign-up fields/provider response | membership dispatch; generic failure otherwise |
| ACTION-002 | Sign in | visitor | valid provider response | membership dispatch; generic failure otherwise |
| ACTION-003 | Continue with Google | visitor | valid popup response | membership dispatch; generic failure otherwise |
| ACTION-004 | Reset password | visitor | syntactically valid email | SCREEN-041 request; neutral response; return to login |
| ACTION-005 | Select workspace | multi-org user | ACTIVE membership after revalidation | target ROUTE-009; previous tenant cache cleared |
| ACTION-006 | Create workspace | zero-membership user | all onboarding validation passes | atomic creation -> ROUTE-009 |
| ACTION-009 | Add product | Owner/Admin/Inventory Manager | active organization | ROUTE-011 |
| ACTION-010 | Save product | same | valid unique SKU and fields | ROUTE-012; field error remains on form |
| ACTION-016 | Set opening balance | Owner/Admin/Inventory Manager | active product/warehouse; valid quantity | opens SCREEN-042; success updates Stock tab and movements |
| ACTION-017 | Adjust stock | Owner/Admin/Inventory Manager | active product/warehouse | opens SCREEN-016; success stays on source and shows movement reference |
| ACTION-011 | Archive product | Owner/Admin/Inventory Manager | named confirmation | stays on detail/list with Archived state; history preserved |
| ACTION-015 | Archive warehouse | Owner/Admin/Inventory Manager | zero balances and no open receipt | stays on route; blocked reason identifies stock/open receipt |
| ACTION-019 | Add private supplier | Owner/Admin/Procurement Manager | valid fields | creates supplier and opens/updates detail |
| ACTION-020 | Add private buyer | Owner/Admin/Procurement Manager | valid fields | creates buyer directory entry; no sales workflow |
| ACTION-021 | Create purchase order | Owner/Admin/Procurement Manager | active selectable supplier | ROUTE-018 |
| ACTION-023 | Place order | Owner/Admin/Procurement Manager | private Draft with at least one valid line | ROUTE-019 status Ordered |
| ACTION-047 | Submit connected PO | Owner/Admin/Procurement Manager | Active connection, Verified mappings, valid lines | ROUTE-019 status Submitted |
| ACTION-024 | Cancel order | role permitted for order type | allowed pre-receipt/pre-acceptance state | named confirmation -> ROUTE-019 Cancelled |
| ACTION-025 | Receive selected items | Owner/Admin/Inventory Manager/Procurement Manager/Storekeeper | outstanding quantity and active warehouse | ROUTE-021; live conversion; success -> ROUTE-019 |
| ACTION-036 | Find business | Owner/Admin/Procurement Manager | Network enabled; exact valid handle | opens SCREEN-032 result; no fuzzy/browse route |
| ACTION-037 | Send connection request | Owner/Admin/Procurement Manager | not self; eligible prior state | ROUTE-031/032 Pending |
| ACTION-038 | Accept connection | Owner/Admin/Procurement Manager | incoming Pending | ROUTE-032 Active |
| ACTION-039 | Reject connection | Owner/Admin/Procurement Manager | incoming Pending | ROUTE-032 Rejected |
| ACTION-040 | Disable connection | Owner/Admin | Active; named confirmation | ROUTE-032 Disabled; history retained |
| ACTION-041 | Publish partner item | Owner/Admin/Procurement Manager | safe fields and active source product | SCREEN-051 success stays ROUTE-033 |
| ACTION-042 | Unpublish partner item | Owner/Admin/Procurement Manager | currently published | stays ROUTE-033; history retained |
| ACTION-043 | Start mapping | Owner/Admin/Procurement Manager | Active connection | ROUTE-036 |
| ACTION-045 | Create verified mapping | same | exact published SKU, semantic confirmation, factor >0 | ROUTE-035 `?mappingStatus=VERIFIED` |
| ACTION-046 | Disable mapping | same | Verified; named confirmation | ROUTE-035 Disabled; PO history retained |
| ACTION-048 | Accept connected PO | Owner/Admin/Procurement Manager acting for supplier | Submitted | ROUTE-019 Accepted |
| ACTION-049 | Reject connected PO | same | Submitted and reason supplied | ROUTE-019 Rejected |
| ACTION-050 | Mark shipped | same | Accepted | ROUTE-019 Shipped; supplier movement only |
| ACTION-026 | Export CSV | role allowed on active report tab | report query loaded | downloads current authorized filtered table |
| ACTION-027 | Mark read | all members, own notification | notification belongs to user | remains ROUTE-027; only read state changes |
| ACTION-029 | Invite user | Owner/Admin | valid email/role | invite dialog -> SCREEN-050 one-time link surface |
| ACTION-031 | Change role | Owner/Admin | ordinary member, not canonical Owner | stays ROUTE-028 and records audit |
| ACTION-032 | Suspend member | Owner/Admin | ordinary member; named confirmation | stays ROUTE-028; status Suspended |
| ACTION-033 | Remove member | Owner/Admin | ordinary member; named confirmation | stays ROUTE-028; status Removed |
| ACTION-034 | Save organization profile | Owner/Admin | valid supported fields | remains ROUTE-029 |
| ACTION-035 | Save business defaults | Owner/Admin | valid supported defaults | remains ROUTE-029; Network navigation recomputes if flag changes |
| ACTION-053 | Sign out | authenticated user | none | clear cache -> ROUTE-003 |

Every submitting command disables its initiating control, preserves one `operationId` across retry, and returns the same successful destination on an identical replay. A replay with changed payload remains on the source surface and shows `OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD` in plain language (`UC-25`, `T-STOCK-09/13`, `T-INT-04`).

## 9. Dead-link and scope-leak audit

- No route or link exists for stock adjustment, opening balance, publish-to-catalog, invitations, discovery results, confirmations, audit log, user profile, global search, sales orders, storefront, checkout, POS, AI or forecasting.
- Connected/Private directory tabs do not link into `/network/*` while Network is disabled.
- Notification and activity links are permission-checked before they become anchors.
- Archived/deactivated objects remain linkable from history, but cannot be selected for new work.
- A connected buyer never receives a direct link to supplier tenant inventory; buyer catalog browsing uses ROUTE-034 only.
- A connected DRAFT PO has no supplier-side link until submission.
- Public and branded login footers never expose organization-private paths.

## 10. Navigation acceptance traceability

| Concern | Requirements/use cases | Tests |
|---|---|---|
| Auth dispatch and branded login | FR-AUTH-001..012; UC-01, UC-02, UC-04, UC-06 | T-AUTH-01..14 |
| Multi-workspace context | FR-ORG-007..011; UC-23 | T-ORG-04, T-ORG-11, T-UI-10, T-UI-12 |
| Role-forbidden direct URL | FR-TEAM-009; UC-14, UC-15 | T-SEC-02, T-SEC-06..07, T-UI-06 |
| Inventory and stock links | FR-INV-001..014; FR-STOCK-001..017; UC-07..09 | T-CRUD-01..16, T-STOCK-01..15, T-UI-03 |
| Private procurement | FR-PART-001..007; FR-PO-001..013; UC-10..12 | T-PART-01..05, T-PPO-01..14 |
| Network links and disabled flag | FR-ORG-013; FR-NET-001..020; UC-16..18 | T-NET-01..16, T-UI-09 |
| Connected PO shared routes | FR-CPO-001..017; UC-19..21 | T-CPO-01..17, T-UI-09 |
| Dashboard deep links/reports | FR-DASH-001..009; UC-13 | T-REPORT-01..10, especially T-REPORT-08 |
| Notifications | FR-NOTIFY-001..004; UC-24 | T-NOTIFY-01..05 |
| Responsive navigation | NFR-001, NFR-016 | T-UI-02..04, T-UI-07, T-NFR-12 |

**Navigation freeze result:** `PASS`, subject only to exact cross-document ID reconciliation; no route invention or unresolved destination remains in this authority.
