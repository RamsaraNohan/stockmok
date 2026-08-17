# Stockmok — Final Requirements Specification v3.0

**Status:** FROZEN baseline for UI design and implementation.
**Scope:** Release A + Release B-Lite. Release C default **NOT BUILT**.
**Coursework authority:** the actual PUSL2021 Referral Coursework 2025/26 brief, verified.
**Companion authorities:** Scope = `03` · Data = `05` · Security = `06` · UI = `07` · Tests = `08` · Technology = `10` · Firebase = `11`.
**Changes from v2:** all v2 IDs are preserved. New requirements are appended with new numbers. Ambiguities are resolved in place and every substantive change is listed in `01` §6.

---

## 1. Product objective

Stockmok shall be implemented as a secure, multi-tenant **Inventory & Procurement Management System** that lets a business create a workspace, manage products, categories, warehouses and stock, manage private suppliers and buyers, create and receive purchase orders, control staff access by role, view analytics that trace to operational data, and optionally collaborate with another Stockmok organization through validated product mappings and connected purchase orders.

The coursework release prioritises **complete, correct, demonstrable management-system functionality** over feature count.

---

## 2. Requirement classes

| Mark | Meaning |
|---|---|
| A-MUST | Release A. Coursework core. Cannot be dropped without a scope reset. |
| B-MUST | Release B-Lite differentiator, after the Release A gate passes. |
| B-PLUS | Full Release B enhancement. First to cut if the schedule slips. |
| C-OPTIONAL | Only if every gate is green by end of Day 11. Default: not built. |
| D-FUTURE | Excluded from coursework implementation. |

---

## 3. Actors

Visitor · User · Owner · Admin · Inventory Manager · Procurement Manager · Storekeeper · Analyst · Viewer · Private Supplier (external, no account) · Private Buyer (external, no account) · Connected Supplier Organization · Connected Buyer Organization · Storefront Visitor (C only).

---

# 4. Functional requirements

## 4.1 Public site and authentication

| ID | Priority | Requirement |
|---|---|---|
| FR-AUTH-001 | A-MUST | Provide a one-page public Stockmok site explaining Inventory, Procurement, Connected Businesses and analytics, describing only functionality that is actually built. |
| FR-AUTH-002 | A-MUST | Support email/password registration and sign-in through Firebase Authentication. |
| FR-AUTH-003 | A-MUST | Support Google registration and sign-in through Firebase Authentication using a popup flow. |
| FR-AUTH-004 | A-MUST | Support logout, which also clears all cached tenant data in the client. |
| FR-AUTH-005 | A-MUST | Support Firebase password reset. The application never stores passwords or password hashes. |
| FR-AUTH-006 | A-MUST | After sign-in, route by membership count: zero → onboarding; one → that workspace; more than one → workspace selector. |
| FR-AUTH-007 | A-MUST | `/b/:handle` resolves only a public `OrganizationDirectoryEntry` before authentication, by exact document `get`. |
| FR-AUTH-008 | A-MUST | Any role selected before authentication is requested context only; authorization is derived from Membership after authentication. |
| FR-AUTH-009 | A-MUST | An authenticated non-member is denied access to the business and told so clearly. |
| FR-AUTH-010 | A-MUST | An invalid requested role is denied; the user's actual assigned role may be offered as a next step. |
| FR-AUTH-011 | A-MUST | **(new)** Authentication error messages must not reveal whether an account exists for a given email. |
| FR-AUTH-012 | A-MUST | **(new)** A `users/{uid}` profile document is created idempotently on first authenticated render, containing only `displayName`, `photoUrl` and `lastSeenAt` as client-writable fields. |

## 4.2 Organization onboarding

| ID | Priority | Requirement |
|---|---|---|
| FR-ORG-001 | A-MUST | A user with no organization can create a business. |
| FR-ORG-002 | A-MUST | Required organization fields: name, handle, industry, country, currency, timezone. |
| FR-ORG-003 | A-MUST | Logo is optional. A generated monogram is the default identity. **No file upload is implemented.** |
| FR-ORG-004 | A-MUST | Generate an immutable `organizationId` that is the sole tenant authority. |
| FR-ORG-005 | A-MUST | The handle is normalised, globally unique, atomically reserved and immutable in Releases A and B. |
| FR-ORG-006 | A-MUST | Creation also creates the canonical Owner membership, `OrganizationSettings`, the public directory entry and the first warehouse — all in one transaction. |
| FR-ORG-007 | A-MUST | Authenticated routes are organization-explicit: `/app/:handle/…`. |
| FR-ORG-008 | A-MUST | The current business identity and the active role are always visible in the app shell. |
| FR-ORG-009 | A-MUST | One Firebase identity may belong to multiple organizations. |
| FR-ORG-010 | A-MUST | Switching workspace re-validates membership before rendering any organization data. |
| FR-ORG-011 | A-MUST | **(new)** A user-scoped membership index (`users/{uid}/memberships/{orgId}`) is maintained by the backend so the user's organizations can be listed without a cross-tenant query. |
| FR-ORG-012 | A-MUST | **(new)** Handles matching the reserved-word list in `11` §18 are rejected at validation time, because application routes depend on those segments. |
| FR-ORG-013 | A-MUST | **(new)** Organization settings expose feature flags (`networkEnabled`, `storefrontEnabled`) so Release B and C surfaces can be enabled per organization. |

## 4.3 Team and roles

| ID | Priority | Requirement |
|---|---|---|
| FR-TEAM-001 | A-MUST | Owner or Admin can create an invitation for an email address and one built-in role. |
| FR-TEAM-002 | A-MUST | An invitation produces a secure single-use link; only the token hash is stored; the raw token is returned exactly once. Email delivery is not implemented. |
| FR-TEAM-003 | A-MUST | Accepting an invitation requires an authenticated identity whose email matches the invited email. |
| FR-TEAM-004 | A-MUST | Membership supports ACTIVE, SUSPENDED and REMOVED. Invitation state is separate. |
| FR-TEAM-005 | A-MUST | Owner or Admin can suspend or remove ordinary members. |
| FR-TEAM-006 | A-MUST | Owner or Admin can change an ordinary member's role. |
| FR-TEAM-007 | A-MUST | An Admin cannot change, suspend or remove the canonical Owner. |
| FR-TEAM-008 | A-MUST | Exactly one role per membership in the UI. The schema may remain future-compatible. |
| FR-TEAM-009 | A-MUST | Navigation is role-aware, but visibility is never the security boundary. |
| FR-TEAM-010 | A-MUST | **(new)** Invitations expire after 7 days and are single-use; expired, revoked and reused tokens are rejected with distinct reasons. |
| FR-TEAM-011 | A-MUST | **(new)** Accepting an invitation when already an ACTIVE member succeeds idempotently without creating a duplicate membership. |

## 4.4 Products, categories, warehouses

| ID | Priority | Requirement |
|---|---|---|
| FR-INV-001 | A-MUST | Create, read, update and archive Products. |
| FR-INV-002 | A-MUST | Create, read, update and archive Categories. |
| FR-INV-003 | A-MUST | Create, read, update and archive Warehouses. |
| FR-INV-004 | A-MUST | `internalSku` is unique within an organization, enforced race-free by a uniqueness index document inside the create/update transaction. |
| FR-INV-005 | A-MUST | Every Product has an explicit base unit. |
| FR-INV-006 | A-MUST | Product supports purchase cost, optional selling price, minimum stock and reorder target. |
| FR-INV-007 | A-MUST | Product list supports search, category filter, status filter, archived toggle, sort on indexed columns, and bounded cursor pagination. |
| FR-INV-008 | A-MUST | Historical references are never destroyed by hard deletion. Client deletes are denied for every collection. |
| FR-INV-009 | A-MUST | An archived Product cannot be selected for a new purchase order or a new mapping. |
| FR-INV-010 | A-MUST | Warehouse archive is blocked while any non-zero on-hand balance exists for that warehouse. |
| FR-INV-011 | A-MUST | Warehouse archive is blocked while an open receiving workflow targets that warehouse. |
| FR-INV-012 | A-MUST | Product detail shows Overview, Stock, Suppliers/Buyers where relevant, and Activity. Storefront tab only if Release C is built. |
| FR-INV-013 | A-MUST | **(new)** Changing a Product's purchase cost recomputes that product's stored stock value in the same transaction, so the Inventory Value KPI stays correct. |
| FR-INV-014 | A-MUST | **(new)** Warehouse archive is executed by a trusted backend command, because the required checks cannot be expressed in Security Rules. |

## 4.5 Stock ledger

| ID | Priority | Requirement |
|---|---|---|
| FR-STOCK-001 | A-MUST | Every material stock change creates an immutable `StockMovement`. |
| FR-STOCK-002 | A-MUST | A `StockBalance` exists per Organization + Product + Warehouse. |
| FR-STOCK-003 | A-MUST | A `ProductStockSummary` maintains per-product totals for query-friendly UI and KPIs. |
| FR-STOCK-004 | A-MUST | Material stock commands execute through a trusted backend command in the recommended deployment profile. |
| FR-STOCK-005 | A-MUST | Movement, Balance and Summary updates occur in one atomic transaction. |
| FR-STOCK-006 | A-MUST | A manual adjustment requires a reason. |
| FR-STOCK-007 | A-MUST | The adjustment UI previews Current → Change → Result before confirmation. |
| FR-STOCK-008 | A-MUST | An adjustment that would make **any single warehouse balance** negative is rejected. |
| FR-STOCK-009 | A-MUST | Low stock means `onHand > 0 AND minimumStock > 0 AND onHand < minimumStock`. Exactly at the minimum is **not** low. |
| FR-STOCK-010 | A-MUST | Out of stock means `onHand <= 0`, and **takes precedence over** low stock. |
| FR-STOCK-011 | A-MUST | Authorised users can view the immutable movement history, filtered and paginated. |
| FR-STOCK-012 | A-MUST | Every stock command carries a unique `operationId` and is idempotent. Replay with a different payload is rejected rather than silently returning the earlier result. |
| FR-STOCK-013 | A-MUST | Quantities always carry an explicit unit and are persisted as integers in milli-units (three decimal places of precision). |
| FR-STOCK-014 | A-MUST | Opening balance is an `OPENING_BALANCE` movement, never a direct overwrite. |
| FR-STOCK-015 | D-FUTURE | Reservation is excluded because Storefront checkout is excluded. `reservedMilli` is constant zero. |
| FR-STOCK-016 | A-MUST | **(new)** Each product summary stores a derived `stockValueMinor` maintained inside stock commands, so inventory value is computable with a bounded aggregation rather than a full scan. |
| FR-STOCK-017 | A-MUST | **(new)** A stock command emits a low-stock or out-of-stock notification only when the derived status *changes*, never on every write. |

## 4.6 Private suppliers and buyers

| ID | Priority | Requirement |
|---|---|---|
| FR-PART-001 | A-MUST | Create, read, update and deactivate private suppliers. |
| FR-PART-002 | A-MUST | Create, read, update and deactivate private B2B buyers. |
| FR-PART-003 | A-MUST | A private partner supports contact details and notes. |
| FR-PART-004 | A-MUST | A private supplier is selectable on a private purchase order; a deactivated one is not. |
| FR-PART-005 | A-MUST | A partner with history is deactivated, never hard-deleted. |
| FR-PART-006 | A-MUST | The UI clearly distinguishes Private from Connected without presenting Private as a degraded option. |
| FR-PART-007 | A-MUST | **(new)** Private suppliers and private buyers are the same entity distinguished by `partnerTypes`. In Release A the Buyers view is a directory only — there is no outbound sales workflow, and the UI must not imply one. |

## 4.7 Private procurement

| ID | Priority | Requirement |
|---|---|---|
| FR-PO-001 | A-MUST | A Procurement Manager can create a private DRAFT purchase order. |
| FR-PO-002 | A-MUST | A DRAFT requires at least one valid line before it can move to ORDERED. |
| FR-PO-003 | A-MUST | Private flow: DRAFT → ORDERED → PARTIALLY_RECEIVED → RECEIVED. |
| FR-PO-004 | A-MUST | DRAFT or ORDERED may be CANCELLED before any receipt. Received history is never erased. |
| FR-PO-005 | A-MUST | At ORDERED, each line snapshots product name, SKU, unit, quantity and price; snapshots are immutable thereafter. |
| FR-PO-006 | A-MUST | Full or partial receipt is supported, per line. |
| FR-PO-007 | A-MUST | Receiving more than the outstanding quantity is rejected. |
| FR-PO-008 | A-MUST | A receipt creates a buyer `PURCHASE_RECEIPT` movement per line. |
| FR-PO-009 | A-MUST | The receive command is idempotent by `operationId`. |
| FR-PO-010 | A-MUST | Received quantities and PO status update atomically with the inventory change. |
| FR-PO-011 | A-MUST | A final or cancelled PO is no longer editable as a draft. |
| FR-PO-012 | A-MUST | **(new)** Order numbers are allocated from a per-organization counter inside the ordering transaction and are unique under concurrency. |
| FR-PO-013 | A-MUST | **(new)** The receiving warehouse is chosen per receipt event and recorded on the PO so warehouse archive can detect the dependency. |

## 4.8 Connected-business network

| ID | Priority | Requirement |
|---|---|---|
| FR-NET-001 | B-MUST | Each organization has a public `OrganizationDirectoryEntry` containing only safe fields. |
| FR-NET-002 | B-MUST | Support exact-handle lookup such as `@freshfoods` by document `get`. |
| FR-NET-003 | B-PLUS | Name-prefix discovery, only if it requires no external search infrastructure. |
| FR-NET-004 | B-MUST | A buyer sends a directional connection request to a supplier organization. |
| FR-NET-005 | B-MUST | The supplier accepts or rejects. |
| FR-NET-006 | B-MUST | A directional connection is unique for `buyerOrgId + supplierOrgId`, enforced by a deterministic document id. |
| FR-NET-007 | B-MUST | An ACTIVE connection is required for any new mapping or connected purchase order. |
| FR-NET-008 | B-MUST | A supplier publishes selected Products as `PartnerCatalogItem` projections containing only allow-listed fields. |
| FR-NET-009 | B-MUST | A connected buyer reads the supplier's partner catalog **only through authorized backend callables**, never by direct client access. |
| FR-NET-010 | B-MUST | The buyer enters an exact supplier partner SKU. |
| FR-NET-011 | B-MUST | The matched supplier item is displayed beside the buyer's product before confirmation. |
| FR-NET-012 | B-MUST | Explicit semantic-match confirmation is required; a valid SKU alone is insufficient. |
| FR-NET-013 | B-MUST | An explicit supplier-unit → buyer-base-unit conversion factor is required and must be greater than zero. |
| FR-NET-014 | B-MUST | A mapping stores stable identifiers plus a SKU snapshot; the typed SKU is never the link. |
| FR-NET-015 | B-MUST | The backend re-validates connection status, catalog publication and product status when a mapping is created. |
| FR-NET-016 | B-MUST | A mapping becomes VERIFIED on successful backend-validated buyer confirmation. |
| FR-NET-017 | B-PLUS | Bilateral supplier confirmation of a mapping. |
| FR-NET-018 | B-MUST | Disabling a connection blocks new mappings and new connected POs but preserves all history. |
| FR-NET-019 | B-MUST | **(new)** A partner catalog item's order unit must equal the supplier product's base unit. Multi-level unit conversion on the supplier side is Release D. |
| FR-NET-020 | B-MUST | **(new)** An organization cannot connect to itself. |

## 4.9 Connected purchase orders

| ID | Priority | Requirement |
|---|---|---|
| FR-CPO-001 | B-MUST | A connected DRAFT PO requires an ACTIVE connection and a VERIFIED mapping for every line. |
| FR-CPO-002 | B-MUST | Flow: DRAFT → SUBMITTED → ACCEPTED → SHIPPED → PARTIALLY_RECEIVED → RECEIVED. |
| FR-CPO-003 | B-MUST | The supplier may REJECT from SUBMITTED. |
| FR-CPO-004 | B-MUST | The buyer may CANCEL from DRAFT or SUBMITTED. Cancellation after ACCEPTED is excluded. |
| FR-CPO-005 | B-MUST | Submission snapshots buyer and supplier item identity, both units, the conversion factor, both quantities, and price. |
| FR-CPO-006 | B-MUST | The supplier sees only legitimate shared transaction fields, never buyer-private data. |
| FR-CPO-007 | B-MUST | Supplier ACCEPT and SHIP transitions execute through trusted backend commands. |
| FR-CPO-008 | B-MUST | SHIP creates a supplier outbound movement only. |
| FR-CPO-009 | B-MUST | Buyer stock is unchanged at SHIPPED. |
| FR-CPO-010 | B-MUST | Buyer receipt creates a buyer inbound movement only. |
| FR-CPO-011 | B-MUST | Partial receipt is supported; receipt quantities are entered in the supplier order unit and converted. |
| FR-CPO-012 | B-MUST | All connected transitions are idempotent by `operationId`. |
| FR-CPO-013 | B-MUST | `PARTIALLY_SHIPPED` is not implemented. |
| FR-CPO-014 | B-MUST | Both parties see the same status history with correct actor and organization attribution. |
| FR-CPO-015 | B-MUST | **(new)** A connected DRAFT exists only in the buyer's tenant and is invisible to the supplier until submission. |
| FR-CPO-016 | B-MUST | **(new)** Each participating organization reads the order through a backend-maintained projection inside its own tenant, written in the same transaction as the canonical shared record. |
| FR-CPO-017 | B-MUST | **(new)** Outstanding quantity is tracked in supplier order units to prevent conversion drift across partial receipts. |

## 4.10 Dashboard, reporting, notifications

| ID | Priority | Requirement |
|---|---|---|
| FR-DASH-001 | A-MUST | Dashboard shows Inventory Value, active SKU count, Low Stock count, Open POs and Awaiting Receipt, plus Recent Activity. |
| FR-DASH-002 | A-MUST | A Needs Attention panel links each item to the exact filtered screen that resolves it. |
| FR-DASH-003 | A-MUST | Every dashboard figure derives from authoritative operational data. |
| FR-DASH-004 | A-MUST | Stock-on-Hand report. |
| FR-DASH-005 | A-MUST | Purchase-Order report. |
| FR-DASH-006 | A-MUST | Date and status filtering where applicable. |
| FR-DASH-007 | A-MUST | No manually editable KPI records exist anywhere in the system. |
| FR-DASH-008 | A-MUST | **(new)** KPIs are computed with Firestore aggregation queries (`count`, `sum`) over indexed fields, not by reading collections into the client. |
| FR-DASH-009 | A-MUST | **(new)** Inventory Value is the sum of each product's stored stock value, computed from current purchase cost. Stockmok reports replacement-cost value; weighted-average costing is Release D and this must be stated in the UI and the report. |
| FR-NOTIFY-001 | **A-MUST** | In-app notifications for low stock and staff-relevant events, with an unread count and a Notifications screen. *(v2 marked the screen P1; corrected — this is Release A.)* |
| FR-NOTIFY-002 | B-MUST | Notifications for connection and connected-PO transitions. |
| FR-NOTIFY-003 | B-PLUS | Mapping-confirmation notification, only if the bilateral flow is built. |
| FR-NOTIFY-004 | A-MUST | **(new)** Notification fan-out is bounded to at most 50 recipients per event; the recipient set is resolved before any write in the transaction. |

## 4.11 Audit and history

| ID | Priority | Requirement |
|---|---|---|
| FR-AUD-001 | A-MUST | Immutable, server-created audit events for sensitive stock and access actions. |
| FR-AUD-002 | A-MUST | Audit opening balance, adjustment, receipt, role change, status change, product archive and product cost change. |
| FR-AUD-003 | B-MUST | Audit connection responses, mapping verification and connected-PO transitions. |
| FR-AUD-004 | A-MUST | Audit fields include actor, organization, action, entity type and id, operation reference, summary and server timestamp. |
| FR-AUD-005 | A-MUST | **(new)** Audit logs are readable by Owner and Admin only, and can never be updated or deleted by any client, including the Owner. |
| FR-AUD-006 | B-MUST | **(new)** A cross-tenant action writes one audit record in each organization, each containing only what that organization is entitled to know. |

## 4.12 Storefront projection — Release C

| ID | Priority | Requirement |
|---|---|---|
| FR-SF-001 | C-OPTIONAL | Owner or Admin may publish a safe `StorefrontCatalogItem`. |
| FR-SF-002 | C-OPTIONAL | Public fields only: display name, public SKU, description, image or placeholder, selling price, category name, coarse availability state. |
| FR-SF-003 | C-OPTIONAL | Release C is read-only. No checkout, reservation or write path. |
| FR-SF-004 | D-FUTURE | Full storefront order integration is excluded. |
| FR-SF-005 | C-OPTIONAL | **(new)** Availability is a coarse state, never an exact quantity. |

---

# 5. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-001 | Primary flows are responsive. Login and Receiving have the highest mobile priority. |
| NFR-002 | Every P0 and P1 screen defines loading, empty, error, success and permission-denied states. |
| NFR-003 | Operational lists use bounded queries with a page size of 25 and a hard maximum of 100. |
| NFR-004 | All Firestore indexes are declared in `firestore.indexes.json` and committed. |
| NFR-005 | No critical workflow requires manual database correction during a demo. |
| NFR-006 | All persisted timestamps are server timestamps; display uses the organization timezone. |
| NFR-007 | Money is stored as integer minor units with an explicit currency. No floating-point money arithmetic. |
| NFR-008 | Quantities carry an explicit unit and are stored as integer milli-units. No floating-point quantity arithmetic. |
| NFR-009 | Meaningful destructive actions require a confirmation naming the specific object. |
| NFR-010 | Public, partner and private data are physically separate documents. |
| NFR-011 | UI components are separated from data and command services, enforced by lint. |
| NFR-012 | No secrets or credentials are committed. |
| NFR-013 | Production deployment is reproducible from the README by someone who has never seen the project. |
| NFR-014 | The demo dataset is reproducible from a committed seed script, not from an exported database. |
| NFR-015 | No unhandled console or runtime error occurs on the canonical demo flow. |
| NFR-016 | Accessibility baseline: labels, visible focus, WCAG AA contrast, status conveyed by more than colour, associated validation errors, semantic tables, 44 px touch targets. |
| NFR-017 | **(new)** Performance targets: Lighthouse Performance ≥ 90 and Accessibility ≥ 90 on the public home page and the dashboard; initial JavaScript bundle < 350 kB gzipped; dashboard first render ≤ 12 Firestore reads; product list page ≤ 27 reads. |
| NFR-018 | **(new)** Continuous integration runs typecheck, lint, unit, component, rules and integration tests, plus a production build and a secret scan, on every push. |
| NFR-019 | **(new)** Adaptability is demonstrable: roles, units, currencies, categories, warehouses, design tokens and Release B/C feature flags are configuration, not hard-coded behaviour. |
| NFR-020 | **(new)** No dependency is added that is not listed in `10` §17, and no dependency is upgraded after Day 9. |

---

# 6. Business rules and invariants

| ID | Rule |
|---|---|
| BR-001 | A Product belongs to exactly one Organization. |
| BR-002 | Stock is never directly overwritten by a user. |
| BR-003 | `StockMovement` is immutable and append-only. |
| BR-004 | Movement, Balance and `ProductStockSummary` are updated atomically. |
| BR-005 | Stock commands are idempotent by `operationId`. |
| BR-006 | A buyer never writes supplier-private stock, and a supplier never writes buyer-private stock. |
| BR-007 | Shipment affects the supplier ledger; receipt affects the buyer ledger. |
| BR-008 | SKU validation reads the Partner Catalog projection, never the supplier's private Product. |
| BR-009 | A valid SKU still requires explicit semantic confirmation. |
| BR-010 | `buyerBaseQty = supplierOrderQty × supplierToBuyerBaseFactor`, computed with integers and half-up rounding. |
| BR-011 | An ACTIVE connection is required for any new mapping or connected PO. |
| BR-012 | Purchase-order line snapshots preserve history and are never rewritten. |
| BR-013 | Historical records are archived or disabled, never destroyed. Client deletes are denied everywhere. |
| BR-014 | Warehouse archive is blocked by non-zero stock or an open receiving dependency. |
| BR-015 | A client-selected role is never authorization truth. |
| BR-016 | There is one canonical Owner, protected from Admin modification. |
| BR-017 | The handle is globally unique and immutable in Releases A and B. |
| BR-018 | Exact-handle lookup satisfies the Release B discovery requirement. |
| BR-019 | The private supplier workflow never claims in-platform supplier acceptance. |
| BR-020 | `PARTIALLY_SHIPPED` is excluded. |
| BR-021 | Public and partner projections contain only explicitly allow-listed fields. |
| BR-022 | A disabled mapping or connection remains historical but unavailable for new work. |
| BR-023 | **(new)** A Security Rule never performs a document read on a path derived from document data. Cross-tenant authorization is performed by backend commands. |
| BR-024 | **(new)** Every cross-tenant record has exactly one canonical document, written only by the backend, with per-organization projections written in the same transaction. |
| BR-025 | **(new)** A partner catalog item's order unit equals the supplier product's base unit. |

---

# 7. Security requirements

| ID | Requirement |
|---|---|
| SEC-001 | Firebase Authentication owns all credentials. |
| SEC-002 | Every private operation requires an authenticated UID. |
| SEC-003 | Every organization operation requires an ACTIVE membership in that organization. |
| SEC-004 | Role is re-derived from the Membership document; the client-supplied role is untrusted. |
| SEC-005 | `OrganizationDirectoryEntry` is a public-safe projection, readable by exact `get` only — listing the directory is denied. |
| SEC-006 | Own-tenant, low-consequence data may be written by the client under Security Rules; the complete list is fixed in `11` §9.3. |
| SEC-007 | Material stock changes execute through trusted backend commands in the recommended profile. |
| SEC-008 | Backend commands using the Admin SDK explicitly re-check authentication, membership, role, ownership and state. |
| SEC-009 | Partner Catalog access by a buyer requires an ACTIVE directional connection, verified server-side. |
| SEC-010 | All cross-business state transitions are backend-controlled. |
| SEC-011 | Audit records are server-created; update and delete are denied to every client. |
| SEC-012 | Unauthenticated reads of private and partner data are denied. |
| SEC-013 | The storefront reads only `StorefrontCatalogItem`. |
| SEC-014 | Client-supplied totals, balances, role claims and organization claims are always revalidated server-side. |
| SEC-015 | Replaying a command cannot duplicate side effects. |
| SEC-016 | Secrets and service-account credentials are never exposed or committed. |
| SEC-017 | **(new)** Cross-tenant canonical collections have no client read or write access whatsoever. |
| SEC-018 | **(new)** Firestore Security Rules deny by default and end with an explicit catch-all denial, verified by a test against an unknown path. |
| SEC-019 | **(new)** Client deletes are denied on every collection without exception. |
| SEC-020 | **(new)** Firebase Web API keys are public identifiers, not secrets. The security boundary is Security Rules plus backend authorization, and the report must state this rather than implying the key protects anything. |

---

# 8. Administrative and coursework requirements

| ID | Requirement | Status |
|---|---|---|
| ADM-001 | Deadline. The brief states **TBA**; the student has confirmed **24 August 2026** and cannot access the DLE to re-verify. | **ASSUMPTION — plan to 24 Aug, re-verify if DLE access is regained** |
| ADM-002 | Presentation. The student has confirmed **no presentation is required**. The brief's reference to "submission and presentation" appears only in the feedback-timing paragraph. | **CLOSED** |
| ADM-003 | The GitHub repository must be accessible to evaluators before submission. Verified from a signed-out browser. | OPEN until S19 |
| ADM-004 | The GitHub URL appears in the final report. | OPEN until S20 |
| ADM-005 | The final PDF is renamed with the student's index number. | OPEN until S20 |
| ADM-006 | Both the report and the source code are submitted to the DLE. | OPEN until S20 |
| ADM-007 | The student reviews the report for own-word compliance, originality and referencing. | ONGOING |
| ADM-008 | AI use. The university and module have granted permission for any tools and technologies. The report still includes a factual AI-assistance statement and full referencing. | **CLOSED, with a disclosure obligation** |
| ADM-009 | **(new)** Firebase Blaze billing must be enabled on Day 1, or Profile P0 declared and Stages 4–16 re-planned. | **DAY-1 DECISION** |

---

# 9. Coursework traceability

| Brief requirement | Stockmok evidence |
|---|---|
| Individual assignment | one student, one repository, commit history with task ids, AI-assistance statement |
| Management System of your choice | Inventory & Procurement Management System |
| Fully working software application | Release A independently complete and deployed |
| Create | Product, Category, Warehouse, Partner, PO, Invitation, Connection, Mapping |
| Read/View | lists, detail pages, dashboard, reports, movement history, audit |
| Update | product/category/warehouse/partner edits, role changes, PO transitions |
| Delete | safe archive and deactivate everywhere; hard delete denied by rules to protect history — an explicit, defended design decision |
| Database connection | Firebase Authentication + Cloud Firestore |
| All major features fully functional | scope freeze plus release gates prevent partial features counting as major features |
| Error-free system emphasis | P0 test suite, rules tests, ledger property tests, CI, zero Critical/High at submission |
| Quality | design system, typed contracts, shared validation, accessibility baseline |
| Performance | aggregation queries, bounded queries, indexes, Lighthouse and bundle evidence (NFR-017) |
| Adaptability | multi-tenant, configurable roles/units/currency/tokens, feature flags (NFR-019) |
| Reflection: technologies, problems, solutions | `10` plus the daily progress log |
| Descriptive report | structure defined in `16` §2 |
| Plagiarism and referencing | reference log from Day 1, Turnitin check, own-words rule |

---

# 10. Requirement freeze rule

No Release A or B requirement may be added during implementation unless it:

1. closes an actual coursework gap;
2. fixes a correctness or security defect;
3. is approved by the student in writing;
4. updates the affected tests and documents;
5. still passes the schedule gate in `12` §22.

Everything else becomes Release D.

**AI agents may not approve a scope change.**
