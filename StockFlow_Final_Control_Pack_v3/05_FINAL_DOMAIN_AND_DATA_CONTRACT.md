# StockFlow — Final Domain & Data Contract v3.0

**Status:** authoritative conceptual data, state and invariant contract.
**Database:** Cloud Firestore, Native mode, one multi-tenant database, one region.
**Rule:** field names may be adapted consistently during implementation, but **ownership, zones, states and invariants may not be silently changed.**

**Material changes from v2** (all recorded in `01` §6):

1. Purchase orders, connections and mappings moved **out of root collections**; cross-tenant canonical records are now closed to clients with per-organization projections.
2. Quantities are **integer milli-units**; money is integer minor units.
3. New entities: `HandleReservation`, `UserMembershipRef`, `ProductSkuIndex`, `Counter`, `ConnectedPurchaseOrder`.
4. `CommandReceipt` is organization-scoped and carries a payload hash.
5. Stock status precedence, negative-stock scope and `stockValueMinor` are defined explicitly.
6. New invariant INV-17: a partner catalog order unit equals the supplier product's base unit.

---

# 1. Core architectural rule

StockFlow uses one Firestore database with **four** explicit zones:

1. **Public projections** — readable by anyone, written only by the backend.
2. **User-private** — readable by that user only.
3. **Organization-private tenant data** — readable by ACTIVE members of that organization.
4. **Cross-tenant canonical records** — readable and writable by **no client at all**; surfaced to organizations through backend-written projections in zone 3, or through authorized callables.

> No business ever directly reads or edits another business's private data. A connected business receives a purpose-built shared surface, never access to a tenant space.

**Why zone 4 is closed.** A Security Rule cannot determine which of a caller's organizations they are acting for, because a user may belong to several. Resolving it would require a document read on a path derived from document data, which Firestore disallows in practice for list queries because of the ten-access-call limit per request. Closing zone 4 to clients removes the entire vulnerability class. This is a correction to v2, which placed shared purchase orders and connections in root collections without resolving this.

---

# 2. Canonical path model

```text
# ZONE 1 — PUBLIC
organizationDirectory/{handle}                        get: public · list: DENIED
storefrontCatalog/{handle}/items/{itemId}             get+list: public          [C only]

# ZONE 2 — USER-PRIVATE
users/{uid}
users/{uid}/memberships/{orgId}                       [NEW] backend-written mirror
users/{uid}/notifications/{notificationId}

# ZONE 3 — ORGANIZATION-PRIVATE
organizations/{orgId}
  settings/main
  counters/{counterId}                                [NEW] backend only
  commandReceipts/{operationId}                       backend only
  productSkuIndex/{skuNormalized}                     [NEW] backend only
  members/{uid}
  invitations/{invitationId}
  categories/{categoryId}
  products/{productId}
  warehouses/{warehouseId}
  stockBalances/{productId}__{warehouseId}
  productStockSummaries/{productId}
  stockMovements/{movementId}
  privatePartners/{partnerId}
  purchaseOrders/{poId}                               private canonical OR connected projection
  purchaseOrders/{poId}/items/{itemId}
  purchaseOrders/{poId}/history/{historyId}
  partnerCatalog/{catalogItemId}                      supplier-owned
  productMappings/{mappingId}                         buyer-owned
  connections/{connectionId}                          projection of the canonical record
  auditLogs/{auditId}

# ZONE 4 — CROSS-TENANT CANONICAL · NO CLIENT ACCESS
handleReservations/{handle}                           [NEW]
connections/{buyerOrgId}__{supplierOrgId}
connectedPurchaseOrders/{poId}                        [NEW]
connectedPurchaseOrders/{poId}/items/{itemId}
connectedPurchaseOrders/{poId}/history/{historyId}
```

---

# 3. Identifier rules

| Identifier | Rule |
|---|---|
| `organizationId` | generated, immutable, the sole tenant authority |
| `handle` | normalised lowercase `[a-z0-9-]`, 3–30 characters, globally unique, publicly visible, immutable in A/B, **routing and lookup only — never authorization** |
| `connectionId` | deterministic: `{buyerOrgId}__{supplierOrgId}`, so directional uniqueness is enforced by Firestore's create precondition rather than by application logic |
| `stockBalanceId` | deterministic: `{productId}__{warehouseId}`, making one-balance-per-pair structural |
| `productStockSummaryId` | `{productId}` |
| `productSkuIndexId` | normalised SKU: uppercased, trimmed, internal whitespace collapsed |
| `purchaseOrderId` | generated; the **same id** is used for the canonical connected record and both organization projections, so reconciliation by id is trivial |
| `orderNumber` | human-readable, allocated from `counters/purchaseOrder` inside the ordering transaction, format `{prefix}-{sequence}` |
| `operationId` | client-generated UUID v4, created when the form opens, unique within the organization, required for every idempotent command |
| internal ids | generated stable ids for Product, Warehouse, Partner, Mapping, Movement. A human SKU or order number is never a primary identity. |

---

# 4. Numeric representation

## 4.1 Money

```text
currency: "LKR"            ISO 4217, explicit on every monetary document
unitPriceMinor: 125000     integer minor units (LKR 1,250.00)
lineTotalMinor: integer
stockValueMinor: integer
```

`lineTotalMinor = roundHalfUp(unitPriceMinor × quantityMilli / 1000)`, computed with integers only. All money arithmetic lives in one shared module and is unit-tested at the rounding boundary. Floating-point money is forbidden.

## 4.2 Quantity — integer milli-units

```text
onHandMilli: 18000         = 18.000 KG
quantityMilli: 2000        = 2.000 KG
minimumStockMilli: 20000   = 20.000 KG
unit: "KG"                 always stored alongside
```

**Why integers.** Invariant INV-03 requires `sum(signed movements) == StockBalance` **exactly**. With IEEE-754 doubles, summing several hundred three-decimal movements does not equal the expected total, so the reconciliation test would either fail or — worse — pass by luck on the demo dataset and fail in front of a marker. Integers make the invariant exact by construction.

Maximum precision is three decimal places. A branded TypeScript type prevents a raw decimal from being assigned to a `…Milli` field.

## 4.3 Conversion

```text
supplierOrderUnit          = PACK
buyerBaseUnit              = KG
supplierToBuyerBaseFactorMilli = 5000        # 1 PACK = 5.000 KG

buyerBaseMilli = roundHalfUp(supplierOrderMilli × factorMilli / 1000)
```

Both the supplier-unit and the buyer-base quantities are persisted on every connected purchase-order line, so no value is ever re-derived and no drift is possible. Outstanding quantity is tracked in **supplier order units**; any residual rounding difference of at most one milli-unit is absorbed on the final receipt and is covered by a test.

A factor is never stored without an explicit direction and both units.

---

# 5. Entity contracts

## 5.1 User — `users/{uid}`

`uid` · `displayName` · `email` · `photoUrl?` · `status` · `createdAt` · `lastSeenAt?`

Client-writable: `displayName`, `photoUrl`, `lastSeenAt` only. `email` and `status` are backend-written. **No password or hash is ever stored.** Created idempotently by the client on first authenticated render.

## 5.2 UserMembershipRef — `users/{uid}/memberships/{orgId}` **(new)**

`organizationId` · `handle` · `organizationName` · `monogram` · `monogramColor` · `role` · `status` · `joinedAt` · `updatedAt`

**Purpose:** answers "which organizations does this user belong to?" without a cross-tenant query. v2 had no way to do this, which made the workspace switcher and FR-ORG-009/010 unimplementable without a collection-group index and an extra rules surface.

Backend-written, in the same transaction as the Membership. Readable only by that user. A suspended or removed membership updates the mirror, so the switcher never offers a workspace the user has lost.

## 5.3 OrganizationDirectoryEntry — `organizationDirectory/{handle}`

**Purpose:** public, safe lookup for branded login and exact-handle discovery.

`organizationId` · `handle` · `name` · `logoUrl?` · `monogram` · `monogramColor` · `industry` · `country` · `directoryStatus`

Must exclude: members, settings, inventory, suppliers, analytics, costs — anything not in that list. A rules test asserts the exact key set.

Access: `get` public, **`list` denied** — exact-handle lookup needs only `get`, and permitting `list` would allow anyone to dump every business on the platform.

Created atomically with the Organization and the handle reservation.

## 5.4 HandleReservation — `handleReservations/{handle}` **(new)**

`organizationId` · `createdAt`

Zone 4, no client access. Created with `txn.create` inside `org.create`, so a concurrent duplicate fails at the database level. Separating the reservation from the public directory entry makes the uniqueness guarantee independent of what the directory happens to expose.

## 5.5 Organization — `organizations/{orgId}`

`organizationId` · `name` · `handle` · `industry` · `country` · `currency` · `timezone` · `logoUrl?` · `monogram` · `monogramColor` · `status` · `ownerUid` · `createdAt` · `createdBy`

Lifecycle: `ACTIVE → SUSPENDED | ARCHIVED`.

## 5.6 OrganizationSettings — `organizations/{orgId}/settings/main`

`defaultWarehouseId` · `currency` · `timezone` · `lowStockNotificationsEnabled` · `purchaseOrderPrefix` · `quantityPrecision` (fixed at 3 in A/B) · **feature flags**: `networkEnabled`, `storefrontEnabled`.

Security-relevant changes are audited. Backend-written.

## 5.7 Counter — `organizations/{orgId}/counters/{counterId}` **(new)**

`value` · `updatedAt`. Currently one instance: `purchaseOrder`.

Zone 3 but **no client access**. Read and incremented inside the ordering transaction so order numbers are unique under concurrency. v2 specified an `orderNumber` and a prefix but never said how the number was generated — a gap that three engineers would have closed three different ways.

## 5.8 Membership — `organizations/{orgId}/members/{uid}`

`uid` · `role` · `status` · `invitedBy` · `joinedAt` · `updatedAt`

Roles: `OWNER` · `ADMIN` · `INVENTORY_MANAGER` · `PROCUREMENT_MANAGER` · `STOREKEEPER` · `ANALYST` · `VIEWER`.
Lifecycle: `ACTIVE ↔ SUSPENDED → REMOVED`.

Exactly one canonical Owner per organization, protected from Admin modification. Invitation state is a separate entity. Backend-written; the user mirror is updated in the same transaction.

## 5.9 Invitation — `organizations/{orgId}/invitations/{invitationId}`

`invitationId` · `orgId` · `emailNormalized` · `role` · `tokenHash` · `status` · `expiresAt` · `createdBy` · `createdAt` · `acceptedBy?` · `acceptedAt?`

Lifecycle: `PENDING → ACCEPTED | EXPIRED | REVOKED`.

Only the SHA-256 hash is stored. The raw token is returned exactly once by the creating command and never persisted or logged. Expiry is 7 days. Acceptance requires an authenticated identity whose normalised email matches. Readable by Owner and Admin only.

## 5.10 Category — `organizations/{orgId}/categories/{categoryId}`

`categoryId` · `name` · `description?` · `status` · `createdAt/By` · `updatedAt/By`. Lifecycle `ACTIVE ↔ ARCHIVED`. Client-writable by inventory writers.

## 5.11 Product — `organizations/{orgId}/products/{productId}`

`productId` · `internalSku` · `internalSkuNormalized` · `name` · `description?` · `categoryId` · `baseUnit` · `purchaseCostMinor` · `sellingPriceMinor?` · `currency` · `minimumStockMilli` · `reorderTargetMilli` · `status` · `preferredPrivateSupplierId?` · `partnerPublished` · `storefrontPublished` (C) · `createdAt/By` · `updatedAt/By`

Constraints: `internalSkuNormalized` unique per organization, enforced by `ProductSkuIndex`; an archived product is unavailable for new purchase orders and new mappings. Backend-written (create/update/setStatus) because uniqueness and audit both require a transaction.

## 5.12 ProductSkuIndex — `organizations/{orgId}/productSkuIndex/{skuNormalized}` **(new)**

`productId` · `createdAt`

Zone 3, no client access. Created with `txn.create` inside `product.create`; the create fails if the SKU already exists, so uniqueness is enforced by Firestore rather than by a read-then-write check. A SKU change deletes the old index document and creates the new one in the same transaction. v2 required unique SKUs but allowed client-side product creation, under which uniqueness cannot be enforced at all.

## 5.13 Warehouse — `organizations/{orgId}/warehouses/{warehouseId}`

`warehouseId` · `name` · `code?` · `type` · `status` · `address?` · `createdAt/By` · `updatedAt/By`

Create and update are client-writable by inventory writers. **Archive is a backend command only**, permitted only when every balance for that warehouse is zero and no open receiving workflow targets it — both checked by bounded queries inside the archiving transaction. Rules explicitly deny a client setting `status: 'ARCHIVED'`.

## 5.14 StockBalance — `organizations/{orgId}/stockBalances/{productId}__{warehouseId}`

`productId` · `warehouseId` · `onHandMilli` · `unit` · `updatedAt`

Backend-written only. One document per product-warehouse pair, guaranteed by the deterministic id. The negative-stock rule applies **here**, per warehouse, so stock cannot go negative in one location and be masked by a surplus in another.

## 5.15 ProductStockSummary — `organizations/{orgId}/productStockSummaries/{productId}`

`productId` · `onHandMilli` · `reservedMilli` (constant 0 in A/B/C) · `availableMilli` · `minimumStockMilli` · `stockStatus` · `stockValueMinor` · `unit` · `updatedAt`

`stockStatus ∈ { IN_STOCK, LOW_STOCK, OUT_OF_STOCK }`, derived with explicit precedence:

```ts
if (onHandMilli <= 0)                                   return 'OUT_OF_STOCK';
if (minimumStockMilli > 0 && onHandMilli < minimumStockMilli) return 'LOW_STOCK';
return 'IN_STOCK';
```

`minimumStockMilli === 0` means "not tracked" and can never produce LOW_STOCK. Exactly at the minimum is **not** low.

`stockValueMinor = roundHalfUp(onHandMilli × product.purchaseCostMinor / 1000)`, recomputed inside every stock command **and** whenever the purchase cost changes. This is what allows Inventory Value to be a bounded `sum()` aggregation instead of an unbounded scan.

**Known limit:** this document is written by every movement for its product and is therefore a single-document hotspot under sustained load. Irrelevant at coursework scale; the documented future path is sharded counters or a periodic rollup.

## 5.16 StockMovement — `organizations/{orgId}/stockMovements/{movementId}`

`movementId` · `productId` · `warehouseId` · `movementType` · `signedQuantityMilli` · `unit` · `sourceType` · `sourceId?` · `operationId` · `reason?` · `actorUid` · `createdAt` (server timestamp)

**Immutable.** Rules deny update and delete for every role.

Movement types in A/B: `OPENING_BALANCE` · `ADJUSTMENT_IN` · `ADJUSTMENT_OUT` · `PURCHASE_RECEIPT` · `CONNECTED_DISPATCH_OUT`.
Source types: `MANUAL` · `PRIVATE_PO` · `CONNECTED_PO`.
Future: `SALE` · `TRANSFER` · `RETURN` · `DAMAGE` · `EXPIRED` · `RESERVATION`.

## 5.17 CommandReceipt — `organizations/{orgId}/commandReceipts/{operationId}`

`operationId` · `commandType` · `actorUid` · `payloadHash` · `resultStatus` · `resultRef` · `createdAt`

Zone 3, no client access. **Org-scoped**, so one tenant can neither observe nor squat on another tenant's operation ids — v2's root-level collection allowed both.

Transaction flow, in this exact order:

1. **Read** the receipt as the **first read inside the transaction**.
2. If it exists and `payloadHash` matches → return the stored result, apply no side effects.
3. If it exists and the hash differs → reject with `OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD`.
4. Otherwise apply the command and **create** the receipt as the last write.

Checking before opening the transaction is a race: two concurrent retries would both see "not applied". The payload hash closes the "same id, different data" hole.

## 5.18 PrivatePartner — `organizations/{orgId}/privatePartners/{partnerId}`

`partnerId` · `partnerTypes` (array of `SUPPLIER` | `BUYER`) · `name` · `contactPerson?` · `email?` · `phone?` · `address?` · `notes?` · `status` · `createdAt/By` · `updatedAt/By`

Lifecycle `ACTIVE → DEACTIVATED`. Client-writable by partner writers; deactivation has no side effects, so it needs no command.

**Note on buyers:** in Release A the Buyers view is a directory only — there is no outbound sales workflow, because sales are Release D. This is a deliberate, stated simplification, not an unfinished feature, and the UI must not imply otherwise.

## 5.19 BusinessConnection

**Canonical (zone 4):** `connections/{buyerOrgId}__{supplierOrgId}` — no client access.
**Projection (zone 3):** `organizations/{orgId}/connections/{connectionId}` for both parties — member-readable, backend-written.

`connectionId` · `buyerOrgId` · `supplierOrgId` · `buyerHandle` · `buyerName` · `supplierHandle` · `supplierName` · `status` · `requestedByUid` · `requestedAt` · `respondedByUid?` · `respondedAt?` · `disabledAt?`

Lifecycle: `PENDING → ACTIVE | REJECTED`; `ACTIVE → DISABLED`. A new request is permitted only when no document exists or the existing one is REJECTED or DISABLED. Self-connection is rejected. Historical objects survive disabling.

## 5.20 PartnerCatalogItem — `organizations/{supplierOrgId}/partnerCatalog/{catalogItemId}`

`catalogItemId` · `sourceProductId` · `partnerSku` · `partnerSkuNormalized` · `displayName` · `orderUnit` · `packDescription?` · `availabilityState` · `wholesalePriceMinor?` · `currency?` · `published` · `updatedAt`

Owned by the supplier organization; readable directly by the supplier's own members. **Connected buyers read it only through the authorized `partnerCatalog.list` and `partnerCatalog.lookupBySku` callables** — never by direct client access.

Never exposes: exact stock, internal cost, margin, warehouse, or any private product field.

`partnerSkuNormalized` is unique within the supplier's published catalog.

**INV-17:** `orderUnit` must equal the source product's `baseUnit`. Without this, a shipment command cannot know how much supplier stock to decrement without a second conversion factor. Multi-level conversion is Release D.

## 5.21 ProductMapping — `organizations/{buyerOrgId}/productMappings/{mappingId}`

`mappingId` · `connectionId` · `buyerOrgId` · `buyerProductId` · `supplierOrgId` · `supplierCatalogItemId` · `supplierPartnerSkuSnapshot` · `supplierDisplayNameSnapshot` · `buyerBaseUnit` · `supplierOrderUnit` · `supplierToBuyerBaseFactorMilli` · `semanticConfirmedByUid` · `semanticConfirmedAt` · `status` · `createdAt` · `disabledAt?`

Stored under the **buyer** organization: the conversion factor is the buyer's commercial data and the supplier has no need of it. Backend-written.

Default coursework lifecycle: backend-validated creation → `VERIFIED`; `VERIFIED → DISABLED`.
Bonus (B-PLUS): `PENDING → VERIFIED | REJECTED`.

## 5.22 PurchaseOrder — `organizations/{orgId}/purchaseOrders/{poId}`

This is **the organization's view of every purchase order it participates in**, which lets one list, one dashboard KPI and one report serve both private and connected orders.

`purchaseOrderId` · `orderNumber` · `viewRole` (`BUYER` | `SUPPLIER`) · `supplierKind` (`PRIVATE` | `CONNECTED`) · `counterpartyName` · `privateSupplierId?` · `counterpartyOrgId?` · `counterpartyHandle?` · `connectionId?` · `status` · `currency` · `expectedDate?` · `receivingWarehouseId?` · `createdBy/At` · `submittedAt?` · `orderedAt?` · `acceptedAt?` · `shippedAt?` · `receivedAt?` · `cancelledAt?` · `totalMinor` · `lastOperationId?` · `isProjection` (true for connected orders)

- **Private orders:** this document is canonical. DRAFT editing is client-writable by PO writers under rules; every transition is a backend command.
- **Connected orders:** the buyer's DRAFT lives here and only here, invisible to the supplier. After submission this document becomes a **projection** of `connectedPurchaseOrders/{poId}`, written only by the backend, with an identical `poId` in both organizations.

## 5.23 PurchaseOrderItem — `…/purchaseOrders/{poId}/items/{itemId}`

`itemId` · `buyerProductId` · `buyerProductNameSnapshot` · `buyerSkuSnapshot` · `buyerBaseUnitSnapshot` · `orderedBuyerBaseMilli` · `receivedBuyerBaseMilli` · `unitPriceMinor` · `lineTotalMinor` · `currency`

Connected orders additionally: `mappingId` · `supplierCatalogItemId` · `supplierProductNameSnapshot` · `supplierSkuSnapshot` · `supplierOrderUnitSnapshot` · `orderedSupplierMilli` · `receivedSupplierMilli` · `supplierToBuyerBaseFactorMilliSnapshot`

Snapshots become immutable at ORDERED (private) or SUBMITTED (connected). A purchase-order line is always rendered from its snapshot, never by joining to the live product.

## 5.24 PurchaseOrderHistory — `…/purchaseOrders/{poId}/history/{historyId}`

`historyId` · `fromStatus` · `toStatus` · `actorUid` · `actorOrgId` · `actorOrgName` · `operationId` · `note?` · `createdAt`

Immutable. For connected orders the same rows are written to the canonical record and to both projections, so both parties see an identical, correctly attributed timeline.

## 5.25 ConnectedPurchaseOrder — `connectedPurchaseOrders/{poId}` **(new, zone 4)**

The canonical shared record for a connected order, with `items` and `history` subcollections. Contains only fields both parties are entitled to see. **No client access whatsoever.** Created by `cpo.submit` and mutated only by `cpo.*` commands, each of which updates both organization projections in the same transaction.

## 5.26 Notification — `users/{uid}/notifications/{notificationId}`

`organizationId` · `type` · `title` · `message` · `referenceType` · `referenceId` · `read` · `createdAt`

Backend-created. The recipient may update **only** the `read` flag; any other change is denied by rules. Fan-out is bounded to 50 recipients per event, resolved before any write in the transaction.

## 5.27 AuditLog — `organizations/{orgId}/auditLogs/{auditId}`

`auditId` · `actorUid` · `actorRole` · `organizationId` · `action` · `entityType` · `entityId` · `operationId?` · `summary` · `metadata` (safe scalars only) · `createdAt` (server timestamp)

Server-created, immutable, readable by Owner and Admin only. Update and delete denied for everyone including the Owner. A cross-tenant action writes one record in each organization, each containing only what that organization is entitled to know.

## 5.28 StorefrontCatalogItem — `storefrontCatalog/{handle}/items/{itemId}` — C only

`sourceProductId` · `publicSku` · `displayName` · `description` · `sellingPriceMinor` · `currency` · `imageUrl?` · `categoryName` · `availabilityState` · `publishedAt`

Public `get` and `list`; no write path. Availability is a coarse state, never a quantity. No private field, ever.

---

# 6. Stock command contract

Every stock-changing backend command performs exactly these steps, in this order:

1. Reject if unauthenticated.
2. Validate the payload against the shared Zod schema.
3. Read `organizations/{orgId}/members/{uid}`; reject unless ACTIVE.
4. Reject unless the role is permitted for this command.
5. Open a Firestore transaction.
6. **Read the command receipt first**; short-circuit on a matching replay, reject on a hash mismatch.
7. Read the product (must be ACTIVE) and the warehouse (must be ACTIVE).
8. Read the current balance and summary.
9. Validate quantity, unit and precision.
10. Compute the new balance; reject if it would be negative **for that warehouse**.
11. Create the immutable `StockMovement`.
12. Update the `StockBalance`.
13. Update the `ProductStockSummary`, including `stockStatus` and `stockValueMinor`.
14. Update the purchase-order line and status if this is a receipt or dispatch.
15. Write the audit record.
16. Write notifications if, and only if, the derived stock status changed.
17. Create the `CommandReceipt`.
18. Commit and return a minimal result.

**The Admin SDK bypasses Security Rules**, so steps 1–4 and 7 are the only authorization that exists for a command. They are implemented once, in a shared factory, so they cannot be forgotten.

---

# 7. State machines

## Membership
```text
(invitation ACCEPTED) → ACTIVE
ACTIVE ↔ SUSPENDED
ACTIVE | SUSPENDED → REMOVED
```

## Invitation
```text
PENDING → ACCEPTED
PENDING → EXPIRED
PENDING → REVOKED
```

## Connection
```text
(none) → PENDING
PENDING → ACTIVE
PENDING → REJECTED
ACTIVE  → DISABLED
REJECTED | DISABLED → PENDING     (a fresh request may be raised)
```

## Mapping
```text
default:  (created) → VERIFIED → DISABLED
bonus:    PENDING → VERIFIED | REJECTED ; VERIFIED → DISABLED
```

## Private purchase order
```text
DRAFT → ORDERED
DRAFT → CANCELLED
ORDERED → CANCELLED                  (only while receivedTotal == 0)
ORDERED → PARTIALLY_RECEIVED
ORDERED → RECEIVED
PARTIALLY_RECEIVED → PARTIALLY_RECEIVED
PARTIALLY_RECEIVED → RECEIVED
```

## Connected purchase order
```text
DRAFT → SUBMITTED
DRAFT → CANCELLED
SUBMITTED → ACCEPTED
SUBMITTED → REJECTED
SUBMITTED → CANCELLED
ACCEPTED → SHIPPED
SHIPPED → PARTIALLY_RECEIVED
SHIPPED → RECEIVED
PARTIALLY_RECEIVED → PARTIALLY_RECEIVED
PARTIALLY_RECEIVED → RECEIVED
```

Excluded: `PARTIALLY_SHIPPED` · cancellation after ACCEPTED · amendment negotiation.

## Product / Category / Warehouse
```text
ACTIVE ↔ ARCHIVED        (warehouse archive is guarded; restore is always permitted)
```

Every state machine is implemented as a transition table in shared code and unit-tested, so an illegal transition is rejected in one place rather than in each command.

---

# 8. Data invariants

| ID | Invariant |
|---|---|
| INV-01 | A `StockMovement` belongs to exactly one organization, product and warehouse. |
| INV-02 | A `StockMovement` is immutable once written. |
| INV-03 | `StockBalance.onHandMilli` equals the signed sum of movements for that product and warehouse — **exactly**, because quantities are integers. |
| INV-04 | `ProductStockSummary.onHandMilli` equals the sum of that product's balances. |
| INV-05 | Every stock mutation has an `operationId` and a `CommandReceipt`. |
| INV-06 | Replaying an `operationId` with an identical payload creates no duplicate effect; replaying with a different payload is rejected. |
| INV-07 | A VERIFIED mapping resolves to a stable buyer Product and a stable supplier `PartnerCatalogItem`. |
| INV-08 | A connected purchase order requires an ACTIVE connection at creation and at submission. |
| INV-09 | Connected purchase-order line snapshots are immutable after SUBMITTED. |
| INV-10 | Supplier SHIP changes supplier inventory only. |
| INV-11 | Buyer RECEIVE changes buyer inventory only. |
| INV-12 | Received quantity never exceeds outstanding quantity. |
| INV-13 | Public and partner projections contain only explicitly copied, allow-listed fields. |
| INV-14 | A connection grants no access to private tenant data. |
| INV-15 | Historical references remain resolvable after archive or disable. |
| INV-16 | A public handle resolves to exactly one organization. |
| INV-17 | **(new)** A `PartnerCatalogItem.orderUnit` equals its source product's `baseUnit`. |
| INV-18 | **(new)** `ProductStockSummary.stockValueMinor` equals `roundHalfUp(onHandMilli × purchaseCostMinor / 1000)` at all times, including after a cost change. |
| INV-19 | **(new)** A connected purchase order's canonical record and both organization projections always agree on status and quantities, because all three are written in one transaction. |
| INV-20 | **(new)** `users/{uid}/memberships/{orgId}` always agrees with `organizations/{orgId}/members/{uid}`. |
| INV-21 | **(new)** No client can delete any document in any collection. |

INV-03, INV-04, INV-06, INV-10, INV-11, INV-18, INV-19 and INV-20 are asserted by automated tests after **every** command in the randomised property test — they are not documentation, they are executable.

---

# 9. Query design and indexes

Composite indexes are enumerated in `11` §8 and committed to `firestore.indexes.json`.

Fixed query rules:

- every list query carries `.limit()`; page size 25, hard maximum 100;
- cursor pagination with `startAfter`, never offset;
- sorting is offered only on indexed fields — the UI disables sorting elsewhere rather than sorting a partial page and lying;
- business lookup is a direct `get` on `organizationDirectory/{handle}`, never a query;
- partner SKU lookup is an exact match on `partnerSkuNormalized` inside the supplier's catalog, executed server-side;
- no `collectionGroup` query exists anywhere in Release A or B — the membership mirror removed the only need for one.

---

# 10. Dashboard data strategy

- `ProductStockSummary` powers stock status, counts and value.
- Firestore aggregation queries (`count`, `sum`) compute every KPI, so cost is bounded (one billed read per 1000 index entries) and no collection is read into the client to be counted.
- Inventory Value is `sum('stockValueMinor')` over product summaries.
- Purchase-order KPIs are `count()` with status filters.
- **No manually editable KPI document exists**, and none may be introduced.
- Distributed counters are deliberately avoided as premature.

---

# 11. Future compatibility

The model is designed to extend later without redesign, and none of this is required for current correctness:

dedicated tenant provisioning · a storefront order service · SalesOrder and reservation (`reservedMilli` already exists and is zero) · inter-warehouse transfers · batch, lot and expiry · multiple partial shipments · custom roles (the permission table is already data) · multi-currency (currency is already explicit everywhere) · weighted-average costing (movements already carry everything needed) · Firebase custom claims as a read-path optimisation · a TTL policy on command receipts.
