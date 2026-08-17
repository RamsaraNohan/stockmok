# Stockmok Final UI State and Permission Matrix

**Status:** authoritative Release A + Release B-Lite UI state/RBAC contract  
**Security precedence:** the hard boolean matrix in `06_FINAL_SECURITY_AND_RBAC_MODEL.md` overrides broader prose  
**State precedence:** entity and transition rules in `05_FINAL_DOMAIN_AND_DATA_CONTRACT.md`  
**Tests:** complete v3 ranges in `08_FINAL_TEST_AND_QA_MATRIX.md`; stale abbreviated ranges in `12` are not used  
**Excluded:** Release B-PLUS bilateral mapping approval; Release C storefront; Release D sales, transfer, reservation and multi-level conversion

## 1. Access-state vocabulary

Every role/surface cell uses exactly one of these values.

| Value | Meaning in the UI | Direct request behavior |
|---|---|---|
| `FULL` | Surface and all role-permitted actions are visible. | Render after authentication, membership, ownership and current-state checks. |
| `READ_ONLY` | Data is visible; mutation controls are absent. | Render, but reject any forged mutation at the server. |
| `LIMITED` | Only the named subset, tab or actions are visible. | Render only that subset; forbidden tab/action becomes an inline or page Permission Denied state. |
| `HIDDEN` | Link/action/surface is omitted because it is not useful to the role. | Hiding is not security; a forged call is denied. |
| `DENIED` | A valid route was requested but the role cannot open it. | Render `SCREEN-029` and execute no page query or command. |

For Network routes only, a disabled feature flag is not a role denial: the section is `HIDDEN`, and a direct URL renders authenticated `SCREEN-030` 404.

## 2. Frozen state-ID ledger

This file consumes, and does not redefine, the immutable `STATE-001..043` ledger in `18_FINAL_UI_MASTER_INVENTORY.md`. State instances are addressed as `{SCREEN-ID}:{STATE-ID}`.

### 2.1 Universal states

| State ID | Name | Required behavior |
|---|---|---|
| STATE-001 | Loading | Layout-matched skeleton; unresolved children and tenant data never render. |
| STATE-002 | Empty | Concise explanation and one valid role-permitted next action; no false dead end. |
| STATE-003 | Error | Plain-language explanation and safe Retry; entered data is preserved. |
| STATE-004 | Success | Updated data remains visible; toast/inline acknowledgement includes a reference where available. |
| STATE-005 | Validation error | Field-associated, announced, first invalid field focused; submit stays blocked. |
| STATE-006 | Permission denied | Required capability and current role named; protected query/command does not execute. |
| STATE-007 | Submitting | Initiating action disabled, progress announced and the same `operationId` retained. |
| STATE-008 | Confirmation | Named object and consequence; action-specific confirm label; focus trapped/restored. |

### 2.2 Branded-login states

| State ID | State | Expected UI |
|---|---|---|
| STATE-009 | Resolving organization identity | Branded-login skeleton only. |
| STATE-010 | Handle not found | Safe, non-revealing message; Global Login link. |
| STATE-011 | Branded sign-in ready | Public identity, labelled credentials, optional role preference and providers. |
| STATE-012 | Authentication failed | One neutral message for wrong password and unknown email. |
| STATE-013 | Authenticated but not a member | No organization-private information. |
| STATE-014 | Requested role mismatch | Requested context denied; assigned Membership role controls. |
| STATE-015 | Assigned role offered | Explicit next step using the actual assigned role, after authentication only. |
| STATE-016 | Membership suspended | No tenant render; safe contact-admin guidance. |

### 2.3 Workflow-specific states

| State IDs | Owner/workflow | Values represented |
|---|---|---|
| STATE-017..020 | Onboarding | handle taken; invalid handle; reserved handle; retry leaves no partial organization |
| STATE-021..027 | Discovery | idle; searching; exact result found; not found; already connected; request pending; self-connection blocked |
| STATE-028..034 | Mapping | no active connection; SKU not found; not published; semantic match declined; invalid factor; stale connection; duplicate VERIFIED mapping |
| STATE-035 | Warehouse | archive blocked by stock or an open receipt |
| STATE-036 | Network routes | Network disabled -> authenticated 404 |
| STATE-037 | Stock/receive/ship | identical replay returns stored success/reference |
| STATE-038 | Receiving | over-receipt blocked inline |
| STATE-039 | Purchase order | immutable after ordering/submission/final state |
| STATE-040..041 | Invitation acceptance | invalid/expired/revoked/reused token; email mismatch |
| STATE-042 | Team invitation | invite link displayed once with Copy and warning |
| STATE-043 | Empty dashboard | new-organization setup checklist |

Persisted domain statuses such as `ACTIVE`, `ARCHIVED`, `VERIFIED`, `DRAFT`, `SUBMITTED` and `RECEIVED` retain their enum names from `05`; they are not assigned conflicting UI `STATE-###` IDs. `PENDING` and `REJECTED` mapping statuses are B-PLUS and must not appear as mapping status pills.

## 3. Hard capability-to-role matrix

Abbreviations: `O` Owner, `A` Admin, `IM` Inventory Manager, `PM` Procurement Manager, `SK` Storekeeper, `AN` Analyst, `V` Viewer.

| Capability | O | A | IM | PM | SK | AN | V |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | FULL | FULL | FULL | FULL | FULL | FULL | FULL |
| Products and stock | FULL | FULL | FULL | READ_ONLY | READ_ONLY | READ_ONLY | READ_ONLY |
| Stock movement history | READ_ONLY | READ_ONLY | READ_ONLY | READ_ONLY | READ_ONLY | READ_ONLY | HIDDEN |
| Create/update Product | FULL | FULL | FULL | HIDDEN | HIDDEN | HIDDEN | HIDDEN |
| Archive/restore Product | FULL | FULL | FULL | HIDDEN | HIDDEN | HIDDEN | HIDDEN |
| Manage Category | FULL | FULL | FULL | HIDDEN | HIDDEN | HIDDEN | HIDDEN |
| Create/update Warehouse | FULL | FULL | FULL | HIDDEN | HIDDEN | HIDDEN | HIDDEN |
| Archive/restore Warehouse | FULL | FULL | FULL | HIDDEN | HIDDEN | HIDDEN | HIDDEN |
| Record opening balance | FULL | FULL | FULL | HIDDEN | HIDDEN | HIDDEN | HIDDEN |
| Adjust stock | FULL | FULL | FULL | HIDDEN | HIDDEN | HIDDEN | HIDDEN |
| Receive goods | FULL | FULL | FULL | FULL | FULL | HIDDEN | HIDDEN |
| Manage private suppliers/buyers | FULL | FULL | HIDDEN | FULL | HIDDEN | HIDDEN | HIDDEN |
| Create/edit draft PO | FULL | FULL | HIDDEN | FULL | HIDDEN | HIDDEN | HIDDEN |
| Order/submit/cancel PO | FULL | FULL | HIDDEN | FULL | HIDDEN | HIDDEN | HIDDEN |
| View purchase orders | READ_ONLY | READ_ONLY | READ_ONLY | READ_ONLY | READ_ONLY | READ_ONLY | HIDDEN |
| Request/respond to Connection | FULL | FULL | HIDDEN | FULL | HIDDEN | HIDDEN | HIDDEN |
| Disable Connection | FULL | FULL | HIDDEN | HIDDEN | HIDDEN | HIDDEN | HIDDEN |
| View Connections | READ_ONLY | READ_ONLY | HIDDEN | READ_ONLY | HIDDEN | HIDDEN | HIDDEN |
| Publish/unpublish Partner Catalog | FULL | FULL | HIDDEN | FULL | HIDDEN | HIDDEN | HIDDEN |
| Read connected Partner Catalog | READ_ONLY | READ_ONLY | HIDDEN | READ_ONLY | HIDDEN | HIDDEN | HIDDEN |
| Create/disable Mapping | FULL | FULL | HIDDEN | FULL | HIDDEN | HIDDEN | HIDDEN |
| Accept/reject/ship connected PO | FULL | FULL | HIDDEN | FULL | HIDDEN | HIDDEN | HIDDEN |
| Stock-on-Hand report + export | READ_ONLY | READ_ONLY | READ_ONLY | READ_ONLY | READ_ONLY | READ_ONLY | READ_ONLY |
| Purchase-Order report + export | READ_ONLY | READ_ONLY | READ_ONLY | READ_ONLY | HIDDEN | READ_ONLY | HIDDEN |
| View audit log | READ_ONLY | READ_ONLY | HIDDEN | HIDDEN | HIDDEN | HIDDEN | HIDDEN |
| Invite/remove/suspend members | FULL | FULL | HIDDEN | HIDDEN | HIDDEN | HIDDEN | HIDDEN |
| Change ordinary member role | FULL | FULL | HIDDEN | HIDDEN | HIDDEN | HIDDEN | HIDDEN |
| Modify canonical Owner | LIMITED | HIDDEN | HIDDEN | HIDDEN | HIDDEN | HIDDEN | HIDDEN |
| Organization settings | FULL | FULL | HIDDEN | HIDDEN | HIDDEN | HIDDEN | HIDDEN |

`Modify canonical Owner = LIMITED` means the Owner may edit own ordinary account settings only. Nobody, including Admin, can change, suspend or remove the canonical Owner. Analyst has no Network access despite any broader prose suggesting “everything read-only”; the hard `06` matrix controls.

## 4. Screen access matrix

Public/pre-organization screens use `PUBLIC` or `AUTH-CONTEXT` because no organization role has yet been authorized. All other cells use the access vocabulary above.

| Screen | O | A | IM | PM | SK | AN | V | Notes |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| SCREEN-001 Public Home | PUBLIC | PUBLIC | PUBLIC | PUBLIC | PUBLIC | PUBLIC | PUBLIC | Marketing cannot claim disabled B or any C/D feature. |
| SCREEN-002 Sign Up | PUBLIC | PUBLIC | PUBLIC | PUBLIC | PUBLIC | PUBLIC | PUBLIC | Authenticated users membership-dispatch. |
| SCREEN-003 Global Login | PUBLIC | PUBLIC | PUBLIC | PUBLIC | PUBLIC | PUBLIC | PUBLIC | Generic errors. |
| SCREEN-004 Branded Login | PUBLIC | PUBLIC | PUBLIC | PUBLIC | PUBLIC | PUBLIC | PUBLIC | Role preference is untrusted context. |
| SCREEN-005 Invitation Accept | AUTH-CONTEXT | AUTH-CONTEXT | AUTH-CONTEXT | AUTH-CONTEXT | AUTH-CONTEXT | AUTH-CONTEXT | AUTH-CONTEXT | Final role comes from invitation then Membership. |
| SCREEN-006 Workspace Selector | AUTH-CONTEXT | AUTH-CONTEXT | AUTH-CONTEXT | AUTH-CONTEXT | AUTH-CONTEXT | AUTH-CONTEXT | AUTH-CONTEXT | Lists only user-scoped membership mirrors. |
| SCREEN-007 Onboarding | AUTH-CONTEXT | AUTH-CONTEXT | AUTH-CONTEXT | AUTH-CONTEXT | AUTH-CONTEXT | AUTH-CONTEXT | AUTH-CONTEXT | Zero memberships; successful creator becomes Owner. |
| SCREEN-008 App Shell | FULL | FULL | FULL | FULL | FULL | FULL | FULL | Role-filtered nav, business/role always visible. |
| SCREEN-009 Empty Dashboard | FULL | FULL | FULL | FULL | FULL | FULL | FULL | Checklist links filtered by capability. |
| SCREEN-010 Populated Dashboard | FULL | FULL | FULL | FULL | FULL | FULL | FULL | B attention rows only for eligible roles/flag. |
| SCREEN-011 Product List | FULL | FULL | FULL | READ_ONLY | READ_ONLY | READ_ONLY | READ_ONLY | Mutation row actions hidden for readers. |
| SCREEN-012 Product Create/Edit | FULL | FULL | FULL | DENIED | DENIED | DENIED | DENIED | Direct URL -> SCREEN-029. |
| SCREEN-013 Product Detail | FULL | FULL | FULL | READ_ONLY | READ_ONLY | READ_ONLY | READ_ONLY | Action/tab visibility is role + feature aware. |
| SCREEN-014 Categories | FULL | FULL | FULL | DENIED | DENIED | DENIED | DENIED | Inventory writers only. |
| SCREEN-015 Warehouses | FULL | FULL | FULL | DENIED | DENIED | DENIED | DENIED | Inventory writers only. |
| SCREEN-016 Stock Adjustment modal | FULL | FULL | FULL | HIDDEN | HIDDEN | HIDDEN | HIDDEN | Storekeeper explicitly cannot adjust stock. |
| SCREEN-017 Movement History | READ_ONLY | READ_ONLY | READ_ONLY | READ_ONLY | READ_ONLY | READ_ONLY | DENIED | Viewer excluded. |
| SCREEN-018 Private Suppliers | FULL | FULL | DENIED | FULL | DENIED | DENIED | DENIED | Private remains first-class. |
| SCREEN-019 Private Buyers | FULL | FULL | DENIED | FULL | DENIED | DENIED | DENIED | Directory only; no sales CTA. |
| SCREEN-020 Partner Detail | FULL | FULL | DENIED | FULL | DENIED | DENIED | DENIED | Connected/private identity differs. |
| SCREEN-021 PO List | FULL | FULL | READ_ONLY | FULL | READ_ONLY | READ_ONLY | DENIED | Context link allowed even if sidebar item hidden. |
| SCREEN-022 PO Builder | FULL | FULL | DENIED | FULL | DENIED | DENIED | DENIED | PO writers only. |
| SCREEN-023 PO Detail | FULL | FULL | READ_ONLY | FULL | LIMITED | READ_ONLY | DENIED | SK limited to view + eligible receiving link. |
| SCREEN-024 Receiving | FULL | FULL | FULL | FULL | FULL | DENIED | DENIED | Inventory Manager receiving is allowed by hard matrix. |
| SCREEN-025 Reports shell | FULL | FULL | FULL | FULL | LIMITED | FULL | LIMITED | Tab-level enforcement below. |
| SCREEN-026 Notifications | FULL | FULL | FULL | FULL | FULL | FULL | FULL | Own notifications only; only read flag mutable. |
| SCREEN-027 Team | FULL | LIMITED | DENIED | DENIED | DENIED | DENIED | DENIED | Admin can manage ordinary members but never canonical Owner. |
| SCREEN-028 Settings | FULL | LIMITED | DENIED | DENIED | DENIED | DENIED | DENIED | Admin cannot modify canonical Owner; only A/B flags/settings. |
| SCREEN-029 Permission Denied | FULL | FULL | FULL | FULL | FULL | FULL | FULL | System recovery surface. |
| SCREEN-030 404 | FULL | FULL | FULL | FULL | FULL | FULL | FULL | Unknown and feature-disabled route surface. |
| SCREEN-031 Connections | FULL | FULL | DENIED | LIMITED | DENIED | DENIED | DENIED | PM can request/respond/view but cannot disable. |
| SCREEN-032 Discovery panel | FULL | FULL | HIDDEN | FULL | HIDDEN | HIDDEN | HIDDEN | Exact handle only. |
| SCREEN-033 Connection Detail | FULL | FULL | DENIED | LIMITED | DENIED | DENIED | DENIED | PM cannot disable connection. |
| SCREEN-034 Supplier Partner Catalog | FULL | FULL | DENIED | FULL | DENIED | DENIED | DENIED | Publish controls allowed. |
| SCREEN-035 Buyer Catalog Browse | READ_ONLY | READ_ONLY | DENIED | READ_ONLY | DENIED | DENIED | DENIED | Callable projection only. |
| SCREEN-036 Mapping Wizard | FULL | FULL | DENIED | FULL | DENIED | DENIED | DENIED | Save disabled until every condition passes. |
| SCREEN-037 Mappings List | FULL | FULL | DENIED | FULL | DENIED | DENIED | DENIED | VERIFIED/DISABLED only. |
| SCREEN-038 Connected PO Buyer | FULL | FULL | READ_ONLY | FULL | READ_ONLY | READ_ONLY | DENIED | Buyer draft private until submission; PO read entitlement remains. |
| SCREEN-039 Connected PO Supplier | FULL | FULL | READ_ONLY | FULL | READ_ONLY | READ_ONLY | DENIED | Accept/reject/ship only in legal state. |
| SCREEN-040 Connected Receiving | FULL | FULL | FULL | FULL | FULL | DENIED | DENIED | IM/SK follow Receiving, not Network nav. |
| SCREEN-041 Password Reset | PUBLIC | PUBLIC | PUBLIC | PUBLIC | PUBLIC | PUBLIC | PUBLIC | Focused auth subordinate surface. |
| SCREEN-042 Opening Balance | FULL | FULL | FULL | HIDDEN | HIDDEN | HIDDEN | HIDDEN | Creates movement; never overwrites balance. |
| SCREEN-043 Mobile Navigation | FULL | FULL | FULL | FULL | FULL | FULL | FULL | Mirrors role/flag-filtered sidebar. |
| SCREEN-044 Dashboard Owner/Admin | FULL | FULL | HIDDEN | HIDDEN | HIDDEN | HIDDEN | HIDDEN | Team/settings/audit context allowed. |
| SCREEN-045 Dashboard Inventory Manager | HIDDEN | HIDDEN | FULL | HIDDEN | HIDDEN | HIDDEN | HIDDEN | Inventory actions, no Network. |
| SCREEN-046 Dashboard Procurement Manager | HIDDEN | HIDDEN | HIDDEN | FULL | HIDDEN | HIDDEN | HIDDEN | Procurement/Network actions. |
| SCREEN-047 Dashboard Storekeeper | HIDDEN | HIDDEN | HIDDEN | HIDDEN | FULL | HIDDEN | HIDDEN | Receiving emphasis; no adjustment. |
| SCREEN-048 Stock-on-Hand Report | FULL | FULL | FULL | FULL | FULL | FULL | FULL | All roles; accurate table + authorized CSV. |
| SCREEN-049 Purchase-Order Report | FULL | FULL | FULL | FULL | DENIED | FULL | DENIED | Forbidden query/tab never executes. |
| SCREEN-050 Invitation Link modal | FULL | LIMITED | HIDDEN | HIDDEN | HIDDEN | HIDDEN | HIDDEN | Raw link shown once after create; canonical Owner protected. |
| SCREEN-051 Publish Partner Item | FULL | FULL | HIDDEN | FULL | HIDDEN | HIDDEN | HIDDEN | Network enabled; no private fields exposed. |
| SCREEN-052 Notification Menu | FULL | FULL | FULL | FULL | FULL | FULL | FULL | Own items; reference links permission-checked. |

## 5. Report permissions at tab and action level

| Role | Stock-on-Hand tab | Stock CSV | Purchase-Order tab | PO CSV | Forbidden query behavior |
|---|---|---|---|---|---|
| Owner / Admin | FULL | FULL | FULL | FULL | n/a |
| Inventory Manager | FULL | FULL | FULL | FULL | n/a |
| Procurement Manager | FULL | FULL | FULL | FULL | n/a |
| Storekeeper | FULL | FULL | HIDDEN | HIDDEN | `?tab=purchase-orders` -> inline STATE-006, no query |
| Analyst | FULL | FULL | FULL | FULL | n/a |
| Viewer | FULL | FULL | HIDDEN | HIDDEN | `?tab=purchase-orders` -> inline STATE-006, no query |

CSV export applies the active authorized filters and returns only the table fields visible on that tab. Optional chart permissions never broaden table permissions, and every chart has a text/table alternative.

## 6. Per-screen universal-state coverage

Codes: `R` required, `C` contextual through an action/child state, `N` genuinely not applicable. The universal state columns are Loading, Empty, Error, Success, Permission Denied, Submitting, Validation Error and Confirmation in that order.

| Screens | L | E | ER | S | PD | SB | V | C | Screen-specific requirement |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| SCREEN-001 Public Home | R | N | R | N | N | N | N | N | Error keeps Login/Create Workspace reachable; no B/C/D copy leak. |
| SCREEN-002 Sign Up | R | N | R | R | N | R | R | N | Neutral credential error; success membership-dispatches. |
| SCREEN-003 Global Login | R | N | R | R | N | R | R | N | Unknown email and bad password share STATE-012. |
| SCREEN-004 Branded Login | R | N | R | R | R | R | R | N | STATE-009..016 all required. |
| SCREEN-005 Invitation Accept | R | N | R | R | R | R | R | C | STATE-040..041 plus universal states; acceptance is idempotent. |
| SCREEN-006 Workspace Selector | R | R | R | R | R | R | N | N | Revalidate before any target tenant render. |
| SCREEN-007 Onboarding | R | N | R | R | R | R | R | C | Four steps; STATE-017..020; atomic failure copy. |
| SCREEN-008 App Shell | R | N | R | R | R | N | N | N | Membership listener can withhold shell and render STATE-006/STATE-016. |
| SCREEN-009 Empty Dashboard | R | R | R | C | R | N | N | N | Setup links appear only if role can act. |
| SCREEN-010 Populated Dashboard | R | C | R | R | R | N | N | N | Each KPI/panel has its own skeleton/error/empty summary. |
| SCREEN-011 Product List | R | R | R | R | R | C | C | C | “Add your first product to start tracking inventory.” |
| SCREEN-012 Product Create/Edit | R | N | R | R | R | R | R | C | Duplicate SKU and archived-selection errors explicit. |
| SCREEN-013 Product Detail | R | C | R | R | R | C | C | C | Tabs independently load; B tabs absent when disabled. |
| SCREEN-014 Categories | R | R | R | R | R | R | R | R | Archive/restore named. |
| SCREEN-015 Warehouses | R | R | R | R | R | R | R | R | “Cold Room still holds stock. Move or reduce it to zero before archiving.” |
| SCREEN-016 Stock Adjustment | R | N | R | R | R | R | R | R | STATE-037 replay; validation uses STATE-005; >50% reduction uses STATE-008. |
| SCREEN-017 Movement History | R | R | R | N | R | N | C | N | Immutable read-only ledger; bounded filters/pagination. |
| SCREEN-018 Suppliers | R | R | R | R | R | R | R | R | Private complete; disabled connected/pending state has no `/network/*` link. |
| SCREEN-019 Buyers | R | R | R | R | R | R | R | R | Directory only; no outbound quantity/action. |
| SCREEN-020 Partner Detail | R | C | R | R | R | R | R | R | Private/Connected identity/state visibly distinct. |
| SCREEN-021 PO List | R | R | R | R | R | C | C | C | Private/Connected badges; bounded filters. |
| SCREEN-022 PO Builder | R | N | R | R | R | R | R | C | Zero-line/non-positive quantity blocks transition. |
| SCREEN-023 PO Detail | R | N | R | R | R | R | R | R | Legal transition actions only; actor/org timeline. |
| SCREEN-024 Receiving | R | R | R | R | R | R | R | R | STATE-038 over-receipt; STATE-037 replay; partial/final success use STATE-004. |
| SCREEN-025 Reports shell | R | C | R | N | R | C | C | N | Tab/action permission check precedes query. |
| SCREEN-026 Notifications | R | R | R | R | R | R | C | N | “You're all caught up.”; read mutation changes one field. |
| SCREEN-027 Team | R | R | R | R | R | R | R | R | Protected Owner; pending invite expiry/revoke. |
| SCREEN-028 Settings | R | N | R | R | R | R | R | C | No Release D settings; flag changes recompute nav. |
| SCREEN-029 Permission Denied | N | N | N | N | R | N | N | N | “You need the Procurement Manager role… You're signed in as Storekeeper.” |
| SCREEN-030 404 | N | N | N | N | N | N | N | N | Safe not-found; STATE-036 when Network is disabled. |
| SCREEN-031 Connections | R | R | R | R | R | C | C | R | “Connect a Stockmok supplier to validate product codes and exchange purchase orders.” |
| SCREEN-032 Discovery | R | R | R | R | R | R | R | N | STATE-021..027; exact handle only. |
| SCREEN-033 Connection Detail | R | N | R | R | R | R | C | R | PM cannot see Disable; stale response reloads. |
| SCREEN-034 Supplier Catalog | R | R | R | R | R | R | R | R | Publish projection privacy explanation required. |
| SCREEN-035 Buyer Catalog Browse | R | R | R | N | R | N | C | N | Read-only callable projection; no exact stock/cost. |
| SCREEN-036 Mapping Wizard | R | N | R | R | R | R | R | C | STATE-028..034 all required; Save reason line. |
| SCREEN-037 Mappings List | R | R | R | R | R | R | C | R | VERIFIED and DISABLED only. |
| SCREEN-038 Connected PO Buyer | R | N | R | R | R | R | R | R | Draft is buyer-private; submit creates shared projections. |
| SCREEN-039 Connected PO Supplier | R | R | R | R | R | R | R | R | Accept/reject/ship constrained by the connected-PO enum transition table. |
| SCREEN-040 Connected Receiving | R | N | R | R | R | R | R | R | Supplier unit input, buyer conversion, no drift. |
| SCREEN-041 Password Reset | R | N | R | R | N | R | R | N | Universal states; neutral acknowledgement prevents enumeration. |
| SCREEN-042 Opening Balance | R | N | R | R | R | R | R | C | OPENING_BALANCE movement, operation ID and preview. |
| SCREEN-043 Mobile Navigation | R | N | R | R | R | N | N | N | 44 px targets; drawer focus trap/restore. |
| SCREEN-044..047 Dashboard role variants | R | C | R | R | R | N | N | N | Only actionable panels/links for the active role. |
| SCREEN-048 Stock-on-Hand Report | R | R | R | R | R | R | C | N | Exact columns/filters/table alternative and authorized CSV. |
| SCREEN-049 Purchase-Order Report | R | R | R | R | R | R | C | N | Storekeeper/Viewer use STATE-006 before query. |
| SCREEN-050 Invitation Link modal | N | N | R | R | R | R | C | N | Raw link once, Copy action, irreversible close warning. |
| SCREEN-051 Publish Partner Item | R | N | R | R | R | R | R | R | `orderUnit == baseUnit`; private-field disclosure copy. |
| SCREEN-052 Notification Menu | R | R | R | R | R | R | C | N | Short list plus View all; inaccessible references are non-links. |

`N` is allowed only when the state has no semantic meaning (for example, an empty 404). A contextual state still requires a designed state in the owning screen/action board.

## 7. State machines and action visibility

### 7.1 Membership and invitation

| Entity/current | Allowed transition | UI action | Roles | Illegal/stale behavior |
|---|---|---|---|---|
| Invitation ACCEPTED | Membership -> ACTIVE | Continue to workspace | matching authenticated invitee | email mismatch/expired/revoked/reused shown distinctly |
| Membership ACTIVE | SUSPENDED | Suspend member + STATE-008 | Owner/Admin; not canonical Owner | backend denial; reload member |
| Membership SUSPENDED | ACTIVE | Reactivate | Owner/Admin; not canonical Owner | backend denial; reload member |
| ACTIVE or SUSPENDED | REMOVED | Remove member + STATE-008 | Owner/Admin; not canonical Owner | terminal; no restore action |
| Invitation PENDING | ACCEPTED | Accept invitation | matching invitee | idempotent success if already ACTIVE |
| Invitation PENDING | EXPIRED | automatic/display only | system | no accept action |
| Invitation PENDING | REVOKED | Revoke invitation + STATE-008 | Owner/Admin | stale revoke reloads current state |

### 7.2 Product, category, warehouse and partner

| Entity | Allowed transition | Guard/UI consequence |
|---|---|---|
| Product | ACTIVE <-> ARCHIVED | Archive/Restore for O/A/IM; archived product excluded from new PO/mapping selectors. |
| Category | ACTIVE <-> ARCHIVED | Archive/Restore for O/A/IM; existing historical labels remain. |
| Warehouse | ACTIVE -> ARCHIVED | O/A/IM only; requires all balances zero and no open receiving workflow; show exact blocker. |
| Warehouse | ARCHIVED -> ACTIVE | Restore for O/A/IM; always permitted by lifecycle contract. |
| Private Partner | ACTIVE -> DEACTIVATED | O/A/PM; history remains; deactivated supplier unavailable to new POs. |

### 7.3 Connection and mapping

| Current | Allowed next | Visible action | Roles |
|---|---|---|---|
| none / REJECTED / DISABLED | PENDING | Request connection | O/A/PM; not self |
| PENDING | ACTIVE | Accept | O/A/PM acting for supplier |
| PENDING | REJECTED | Reject | O/A/PM acting for supplier |
| ACTIVE | DISABLED | Disable connection + STATE-008 | O/A only |
| created and backend validated | VERIFIED | Create mapping | O/A/PM acting for buyer |
| VERIFIED | DISABLED | Disable mapping + STATE-008 | O/A/PM acting for buyer |

Disabling a connection blocks new mappings and connected POs but never hides historical mappings or orders. A stale connection/catalog/product check at Mapping submit produces STATE-033 and no partial object.

### 7.4 Private purchase order

| Current | Allowed next | UI action/condition |
|---|---|---|
| DRAFT | ORDERED | Mark Ordered; >=1 valid line; snapshots become immutable. |
| DRAFT | CANCELLED | Cancel Purchase Order + named confirmation. |
| ORDERED | CANCELLED | Only while received total is zero; named confirmation. |
| ORDERED | PARTIALLY_RECEIVED | Confirm Receipt with less than outstanding. |
| ORDERED | RECEIVED | Confirm Receipt with exactly outstanding. |
| PARTIALLY_RECEIVED | PARTIALLY_RECEIVED | Further partial receipt below outstanding. |
| PARTIALLY_RECEIVED | RECEIVED | Final receipt. |

Private POs never display `ACCEPTED`, `SUBMITTED`, `REJECTED` or `SHIPPED`, because the external supplier cannot perform in-platform actions.

### 7.5 Connected purchase order

| Current | Allowed next | Actor/UI action |
|---|---|---|
| DRAFT | SUBMITTED | Buyer O/A/PM: Submit; ACTIVE connection and VERIFIED mappings rechecked. |
| DRAFT | CANCELLED | Buyer O/A/PM: Cancel + confirmation. |
| SUBMITTED | ACCEPTED | Supplier O/A/PM: Accept. |
| SUBMITTED | REJECTED | Supplier O/A/PM: Reject. |
| SUBMITTED | CANCELLED | Buyer O/A/PM: Cancel + confirmation. |
| ACCEPTED | SHIPPED | Supplier O/A/PM: Mark Shipped; supplier stock movement only. |
| SHIPPED | PARTIALLY_RECEIVED | Buyer O/A/IM/PM/SK: Confirm partial receipt; buyer stock movement. |
| SHIPPED | RECEIVED | Buyer O/A/IM/PM/SK: Confirm full receipt. |
| PARTIALLY_RECEIVED | PARTIALLY_RECEIVED | Buyer O/A/IM/PM/SK: further partial receipt. |
| PARTIALLY_RECEIVED | RECEIVED | Buyer O/A/IM/PM/SK: final receipt. |

Cancellation after ACCEPTED and PARTIALLY_SHIPPED are excluded. Buyer stock stays unchanged at SHIPPED. Supplier-unit outstanding quantity is authoritative for partial receiving, preventing conversion drift.

## 8. Confirmation registry

| Confirmation | Required when | Confirm label | Consequence stated |
|---|---|---|---|
| Archive Product | ACTIVE -> ARCHIVED | Archive product | Removed from active selection; history retained. |
| Archive Warehouse | archive command | Archive warehouse | Allowed only at zero stock and no open receiving. |
| Cancel Purchase Order | legal cancellable state | Cancel purchase order | Final status; received history is never erased. |
| Disable Connection | ACTIVE connection | Disable connection | Blocks new mapping/connected PO; history retained. |
| Disable Mapping | VERIFIED mapping | Disable mapping | Blocks new dependent lines; history retained. |
| Suspend Member | ordinary ACTIVE member | Suspend member | Workspace access stops. |
| Remove Member | ordinary ACTIVE/SUSPENDED member | Remove member | Membership removal is terminal. |
| Revoke Invitation | PENDING invitation | Revoke invitation | Link can no longer be accepted. |
| Large Stock Reduction | decrease >50% of current warehouse balance | Confirm stock reduction | Names product, warehouse, current, decrease and result. |

Ordinary saves, reads, mark-notification-read and benign filters never ask for confirmation. The canonical Owner's destructive member controls are absent, not disabled.

## 9. Required state copy and presentation rules

- Products empty: **“Add your first product to start tracking inventory.”** Show Add Product only to O/A/IM; readers get explanatory copy only.
- Connections empty: **“Connect a Stockmok supplier to validate product codes and exchange purchase orders.”** Show Find Business only to O/A/PM when Network is enabled.
- No low stock: **“All tracked products are above their minimum level.”**
- Notifications empty: **“You're all caught up.”**
- Permission denied example: **“You need the Procurement Manager role to open this page. You're signed in as Storekeeper.”** Required role text must be capability-correct for the attempted route.
- Warehouse archive blocked: **“Cold Room still holds stock. Move or reduce it to zero before archiving.”** An open-receipt blocker names the PO instead.
- Disabled Network: **“Connected Businesses is not enabled for this workspace.”** This copy may appear in a non-linking directory tab; a direct `/network/*` path uses authenticated 404.
- Buyer catalog note: this is a partner projection, not supplier inventory; exact stock, costs and warehouses are not visible.
- Publish dialog: connected buyers see only partner fields; they cannot see stock quantities, costs, warehouses or other private data.

Every status uses text plus icon, never color alone. Validation is field-associated and announced; toast-only errors are prohibited. Dialog focus is trapped and restored. All mobile controls meet 44 px targets.

## 10. Test traceability

| State/permission concern | Authoritative tests |
|---|---|
| Authentication and branded-login states | T-AUTH-01..14 |
| Organization, membership, invitation and workspace states | T-ORG-01..12 |
| Product/category/warehouse/archived states | T-CRUD-01..16 |
| Stock preview, validation, idempotency and per-warehouse negative guard | T-STOCK-01..15; T-INT-01..05, T-INT-07..08 |
| Private partners and visual Private/Connected distinction | T-PART-01..05 |
| Private PO transitions/receiving | T-PPO-01..14 |
| Hard RBAC, tenant isolation and direct-route denial | T-SEC-01..23, especially T-SEC-05..07, T-SEC-10..14, T-SEC-17 |
| Connection/catalog/mapping states | T-NET-01..16 |
| Connected PO states, projections, partial receiving and drift | T-CPO-01..17; T-INT-06 |
| Dashboard/report figures and deep links | T-REPORT-01..10 |
| Notification unread/read/empty and field restriction | T-NOTIFY-01..05 |
| Audit creation/read restrictions | T-AUD-01..07; T-SEC-08..09 |
| Universal P0 loading/empty/error/success/denied | T-UI-05..06 |
| Keyboard, focus and responsive task completion | T-UI-02..04, T-UI-07, T-NFR-12 |
| Complete A and B-Lite browser flows | T-UI-01, T-UI-09..12 |

## 11. Permission/state freeze checks

- All seven roles have an explicit state for every capability and every screen.
- Storekeeper receives goods but cannot adjust stock.
- Inventory Manager has no Network access.
- Analyst has no Network access and no audit/team access; allowed operational data is read-only.
- Viewer is limited to dashboard, product/stock read, Stock-on-Hand report and notifications.
- Procurement Manager cannot disable a connection; Owner/Admin can.
- Reports are enforced at tab, query and export-action level.
- Forbidden direct routes render Permission Denied; feature-disabled Network routes render authenticated 404.
- Every P0/P1 screen maps all eight universal states to required, contextual or genuinely not applicable.
- Persisted statuses and allowed transitions match `05`; illegal actions are absent and stale submissions are rejected.
- Release B-PLUS/C/D states and actions are absent.

**Permission/state freeze result:** `PASS`.
