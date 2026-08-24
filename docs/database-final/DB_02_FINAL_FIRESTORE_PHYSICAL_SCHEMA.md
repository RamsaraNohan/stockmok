# DB-02 — FINAL FIRESTORE PHYSICAL SCHEMA

**Status:** FROZEN. Precise enough to generate TypeScript types, Zod schemas and Firestore converters
without a further decision.
**Covers:** every collection and document in Release A + B-Lite, including amendment A1 (Transfer).

## 0. Conventions

- `ts` = Firestore `Timestamp`, always `FieldValue.serverTimestamp()` on write unless stated.
- `…Milli` = integer milli-units (3 dp). `…Minor` = integer currency minor units. **Never floats.**
- **Immutable** = written once at create; any later write is a defect and is rejected by the command layer.
- **Access class**: `CR` client read · `CW` client write · `CMD` command-only · `BE` backend-only (no client access at all).
- **Privacy class**: `PUBLIC` · `USER` · `TENANT` · `PARTNER_SHARED` · `CROSS_TENANT`.
- Optional fields are marked `?`. A field that is *absent* and a field that is `null` are never given
  different meanings; prefer absent.
- No field anywhere is an unbounded array. No `map` field is untyped.
- Retention is **permanent** for every collection in Release A/B. Where a future policy is anticipated it
  is named.

### 0.1 Shared enums

```ts
Role            = 'OWNER' | 'ADMIN' | 'INVENTORY_MANAGER' | 'PROCUREMENT_MANAGER'
                | 'STOREKEEPER' | 'ANALYST' | 'VIEWER'
MemberStatus    = 'ACTIVE' | 'SUSPENDED' | 'REMOVED'
InviteStatus    = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'
LifecycleStatus = 'ACTIVE' | 'ARCHIVED'
PartnerStatus   = 'ACTIVE' | 'DEACTIVATED'
StockStatus     = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
MovementType    = 'OPENING_BALANCE' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT'
                | 'PURCHASE_RECEIPT' | 'CONNECTED_DISPATCH_OUT'
                | 'TRANSFER_OUT' | 'TRANSFER_IN'                       // A1
SourceType      = 'MANUAL' | 'PRIVATE_PO' | 'CONNECTED_PO' | 'TRANSFER' // A1
AdjustmentReason= 'RECOUNT_CORRECTION' | 'DAMAGED_IN_STORAGE' | 'EXPIRED'
                | 'WASTAGE' | 'THEFT_OR_LOSS' | 'OTHER'                 // DB-CR-009
ConnectionStatus= 'PENDING' | 'ACTIVE' | 'REJECTED' | 'DISABLED'
MappingStatus   = 'VERIFIED' | 'DISABLED'
PoStatus        = 'DRAFT' | 'ORDERED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'
                | 'SHIPPED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
SupplierKind    = 'PRIVATE' | 'CONNECTED'
ViewRole        = 'BUYER' | 'SUPPLIER'
Availability    = 'IN_STOCK' | 'OUT_OF_STOCK'
Unit            = 'KG' | 'L' | 'EACH' | 'PACK'   // A3 · F-L-01: BOX/CAN/BOTTLE deleted — in no seed value, no frozen screen
WarehouseType   = 'STORE_ROOM' | 'REFRIGERATED' | 'FREEZER' | 'KITCHEN' | 'OTHER'
DirectoryStatus = 'LISTED'  // A3 · F-M-05: UNLISTED deleted — org.create writes LISTED
```

`PoStatus` is one union for storage convenience; the **legal** transitions differ by `supplierKind` and
are enforced by the transition tables in DB-07. A private order may never carry `SUBMITTED`,
`ACCEPTED`, `REJECTED` or `SHIPPED`.

### 0.2 `movementKind` — derived, never persisted (DB-CR-005)

The frozen ledger filter offers exactly six words. They are computed from `movementType` at render and
query time; **no discriminator column exists.**

| Frozen word | `movementType` | Query predicate |
|---|---|---|
| Opening balance | `OPENING_BALANCE` | `==` |
| Received | `PURCHASE_RECEIPT` | `==` |
| Issued | `CONNECTED_DISPATCH_OUT` | `==` |
| Transferred in | `TRANSFER_IN` | `==` |
| Transferred out | `TRANSFER_OUT` | `==` |
| Correction | `ADJUSTMENT_IN`, `ADJUSTMENT_OUT` | `in [...]` |

---

## 1. Zone 1 — public

### 1.1 `organizationDirectory/{handle}`

Public, safe lookup for branded login and exact-handle discovery. **Written only by `org.create`.**

| Field | Type | Req | Notes |
|---|---|:-:|---|
| `organizationId` | string | ✔ | immutable |
| `handle` | string | ✔ | = document id; normalised, 3–30, `[a-z0-9-]` |
| `name` | string | ✔ | |
| `logoUrl` | string \| null | ✔ | always `null` in A/B — no upload exists |
| `monogram` | string | ✔ | 1–2 chars |
| `monogramColor` | string | ✔ | token id, not a raw hex |
| `industry` | string | ✔ | |
| `country` | string | ✔ | ISO 3166-1 alpha-2 |
| `directoryStatus` | `DirectoryStatus` | ✔ | default `LISTED` |
| `createdAt` | ts | ✔ | immutable |

**Exactly this key set. No other field may ever be added** — `T-SEC-16` asserts the key set, so a
careless future write cannot leak a private field into a publicly readable document.
Access: `get` **public** · `list` **DENIED** · write `CMD`. Privacy `PUBLIC`. Retention permanent.
Indexes: none (document `get` only — never queried).

### 1.2 `storefrontCatalog/{handle}/items/{itemId}` — **RELEASE C, NOT BUILT**

Declared so no agent reintroduces it. If ever built: public `get`+`list`, no write path, allow-listed
fields only, coarse availability, never a quantity.

---

## 2. Zone 2 — user-private

### 2.1 `users/{uid}`

| Field | Type | Req | Access | Notes |
|---|---|:-:|:-:|---|
| `uid` | string | ✔ | CR | = document id, immutable |
| `displayName` | string | ✔ | **CW** | 1–80 chars |
| `email` | string | ✔ | CMD | normalised lowercase; **backend-written only** |
| `photoUrl` | string? | – | **CW** | |
| `status` | `'ACTIVE' \| 'DISABLED'` | ✔ | CMD | |
| `createdAt` | ts | ✔ | CW (create) | |
| `lastSeenAt` | ts? | – | **CW** | |

Created idempotently by the client on first authenticated render via `setDoc(..., { merge: true })`. No
Auth-trigger function is used. **No password or hash is ever stored anywhere in Firestore.**
Client-writable fields: `displayName`, `photoUrl`, `lastSeenAt` — **only**. Privacy `USER`.

### 2.2 `users/{uid}/memberships/{orgId}`

Answers *"which organizations does this user belong to?"* without a cross-tenant query, which is what
makes the workspace switcher and `FR-ORG-009/010` implementable with no collection-group index.

| Field | Type | Req | Notes |
|---|---|:-:|---|
| `organizationId` | string | ✔ | = document id |
| `handle` | string | ✔ | denormalised |
| `organizationName` | string | ✔ | denormalised |
| `monogram` | string | ✔ | denormalised |
| `monogramColor` | string | ✔ | denormalised |
| `role` | `Role` | ✔ | mirror of the Membership |
| `status` | `MemberStatus` | ✔ | mirror |
| `joinedAt` | ts | ✔ | |
| `updatedAt` | ts | ✔ | |

Access: self read · `CMD` write. Written in the **same transaction** as the Membership (`INV-20`).
A suspended or removed membership updates the mirror, so the switcher never offers a lost workspace.
Privacy `USER`. Indexes: none — the collection is read whole and is bounded by how many organizations
one person joins.

### 2.3 `users/{uid}/notifications/{notificationId}`

> **A3 · DB-CR-A3/F-M-09 — `category: 'STOCK' | 'ORDERS' | 'NETWORK'`.** The canonical Gate 10 board draws
> the tabs `All 8 · Unread 3 · **Stock 4** · **Orders 2** · **Network 2**` — **not** the registry's
> *All / Unread / Read*. There is no *Read* tab; read/unread stays a state (owner brief §C.9). Set by
>
> **A3R-14 — the mapping is total over the ten `type` values, and the tabs sum to All.**
>
> | `category` | `type` values |
> |---|---|
> | `STOCK` | `LOW_STOCK` · `OUT_OF_STOCK` |
> | `ORDERS` | `PO_RECEIVED` · `CPO_SUBMITTED` · `CPO_RESPONDED` · `CPO_SHIPPED` · `CPO_RECEIVED` |
> | `NETWORK` | `CONNECTION_REQUESTED` · `CONNECTION_RESPONDED` · **`MEMBERSHIP_CHANGED`** |
>
> `MEMBERSHIP_CHANGED` was the gap: with three categories and ten types, the first team-role change would
> have produced a notification reachable only from *All*, breaking the board's own arithmetic
> (`8 = 4 + 2 + 2`). It sits under `NETWORK` — the tab that already carries *"who you are connected to and
> who has access"* events — rather than under a fourth tab the frozen design does not draw.
> `notify()` sets `category` from this table; the mapping is exhaustive and is asserted by `T-CMD-41`.
> Index **`IDX-45`** `category ASC, createdAt DESC`.

| Field | Type | Req | Notes |
|---|---|:-:|---|
| `organizationId` | string | ✔ | context of the event |
| `organizationName` | string | ✔ | denormalised for display |
| `type` | string enum | ✔ | `LOW_STOCK` · `OUT_OF_STOCK` · `MEMBERSHIP_CHANGED` · `PO_RECEIVED` · `CONNECTION_REQUESTED` · `CONNECTION_RESPONDED` · `CPO_SUBMITTED` · `CPO_RESPONDED` · `CPO_SHIPPED` · `CPO_RECEIVED` |
| `title` | string | ✔ | ≤ 120 |
| `message` | string | ✔ | ≤ 400 |
| `referenceType` | string enum | ✔ | `PRODUCT` · `PURCHASE_ORDER` · `CONNECTION` · `MEMBERSHIP` |
| `referenceId` | string | ✔ | |
| `read` | boolean | ✔ | default `false` — **the only client-writable field** |
| `createdAt` | ts | ✔ | immutable |

Access: self read · self `update` **restricted to `read`** · `create`/`delete` denied to everyone.
Backend-created; fan-out bounded to **50 recipients per event**, resolved before any write in the
transaction. Privacy `USER`. Index: `IDX-17` `read ASC, createdAt DESC`.

---

## 3. Zone 3 — organization-private · identity, access, control

### 3.1 `organizations/{orgId}`

| Field | Type | Req | Notes |
|---|---|:-:|---|
| `organizationId` | string | ✔ | = id, **immutable**, sole tenant authority |
| `name` | string | ✔ | |
| `handle` | string | ✔ | **immutable in A/B** |
| `industry` · `country` | string | ✔ | editable via `C-02 org.updateSettings`; **projected to `organizationDirectory/{handle}` in the same transaction** (A3 · DB-CR-032) |
| `logoUrl` | string \| null | ✔ | always null in A/B |
| `monogram` · `monogramColor` | string | ✔ | |
| `status` | `'ACTIVE'` | ✔ | A3 · F-M-05 — `SUSPENDED`/`ARCHIVED` deleted; no command writes them and DB-07 has no organization machine |
| `ownerUid` | string | ✔ | the canonical Owner |
| `createdAt` · `createdBy` | ts · string | ✔ | immutable |

Access: member read · `CMD` write. Privacy `TENANT`.

### 3.2 `organizations/{orgId}/settings/main`

| Field | Type | Req | Notes |
|---|---|:-:|---|
| `defaultWarehouseId` | string | ✔ | pre-selected on receive/adjust/transfer; the default warehouse may not be archived while it holds that status |
| `currency` · `timezone` | string | ✔ | **A3 · DB-CR-032 — the single source of truth.** The duplicates on `organizations/{orgId}` are deleted (DB-CR-013's reasoning for `defaultWarehouseId`). |
| `lowStockNotificationsEnabled` | boolean | ✔ | default `true` |
| `purchaseOrderPrefix` | string | ✔ | e.g. `PO` |
| `quantityPrecision` | number | ✔ | **fixed at 3**, read-only in the UI |
| `networkEnabled` | boolean | ✔ | feature flag — Release B surfaces |
| `storefrontEnabled` | boolean | ✔ | feature flag — **false**, Release C not built |
| `updatedAt` · `updatedBy` | ts · string | ✔ | |

Access: member read · `CMD` write. Security-relevant changes are audited.

### 3.3 `organizations/{orgId}/members/{uid}`

| Field | Type | Req | Notes |
|---|---|:-:|---|
| `uid` | string | ✔ | = id |
| `role` | `Role` | ✔ | exactly one per membership |
| `status` | `MemberStatus` | ✔ | |
| `displayName` · `email` | string | ✔ | denormalised for the Team table |
| `invitedBy` | string? | – | absent for the canonical Owner |
| `joinedAt` · `updatedAt` | ts | ✔ | |

Access: member read · `CMD` write. **Exactly one canonical Owner** per organization
(`organizations/{orgId}.ownerUid`), protected from Admin modification. This is the document every
Security Rule reads — on the constant path `organizations/{orgId}/members/{request.auth.uid}`.

### 3.4 `organizations/{orgId}/invitations/{invitationId}`

| Field | Type | Req | Notes |
|---|---|:-:|---|
| `invitationId` · `organizationId` | string | ✔ | |
| `emailNormalized` | string | ✔ | lowercase, trimmed |
| `role` | `Role` | ✔ | **never `OWNER`** |
| `tokenHash` | string | ✔ | SHA-256 hex. The **raw token is returned exactly once** by the creating command and is never persisted or logged |
| `status` | `InviteStatus` | ✔ | |
| `expiresAt` | ts | ✔ | create + 7 days |
| `createdBy` · `createdAt` | string · ts | ✔ | |
| `acceptedBy` · `acceptedAt` | string? · ts? | – | |

Access: **Owner/Admin read only** · `CMD` write. Privacy `TENANT`.

### 3.5 `organizations/{orgId}/counters/{counterId}` — **BE, no client access**

`{ value: number, updatedAt: ts }`. One instance in A/B: `purchaseOrder`. Read and incremented **inside**
the ordering transaction so order numbers are unique under concurrency.

### 3.6 `organizations/{orgId}/commandReceipts/{operationId}` — **BE, no client access**

| Field | Type | Req | Notes |
|---|---|:-:|---|
| `operationId` | string | ✔ | = id, client UUID v4 |
| `commandType` | string | ✔ | e.g. `stock.transfer` |
| `actorUid` | string | ✔ | |
| `payloadHash` | string | ✔ | SHA-256 of the canonicalised payload with `operationId` removed |
| `resultStatus` | `'OK'` | ✔ | |
| `result` | map | ✔ | the minimal result replayed verbatim; safe scalars only |
| `createdAt` | ts | ✔ | immutable |

Organization-scoped, so one tenant can neither observe nor squat on another's operation ids. Never
deleted in A/B; a TTL policy is the documented future path.

### 3.7 `organizations/{orgId}/productSkuIndex/{skuNormalized}` — **BE, no client access**

`{ productId: string, createdAt: ts }`. Created with `txn.create` inside `product.create`; the create
precondition fails if the SKU exists, which makes uniqueness **race-free by database enforcement**
rather than by a read-then-write check. A SKU change deletes the old index document and creates the new
one in the same transaction.

---

## 4. Zone 3 — inventory and the stock ledger

### 4.1 `organizations/{orgId}/categories/{categoryId}` — **CW**

`categoryId` · `name` (≤ 80, required) · `description?` (≤ 400) · `status: LifecycleStatus` ·
`createdAt/By` · `updatedAt/By`. Client create/update by `INVENTORY_WRITERS` with a validated shape.

**DB-CR-012 — `status` is NOT client-writable.** The frozen design blocks category archive *"by physical
truth rather than by permission"*: an archive is refused while ACTIVE products still reference the
category. That is an unbounded query, which a Security Rule cannot express — exactly the warehouse-archive
situation. Archive and restore are therefore **`C-35a category.archive` / `C-35b category.restore`**, and rules
deny a client setting `status`. Index: `IDX-28` `status ASC, name ASC`; guard index **`IDX-38`**
`products` `categoryId ASC, status ASC`.

> **A2 · DB-CR-023 (VR-06).** This paragraph previously named the guard index `IDX-33`, which DB-04 §7
> assigns to `productStockSummaries`. **DB-04 §7 is the sole authority for index numbering.** The guard is
> `IDX-38`.

**`name` remains client-writable, and no rename fanout exists.** DB-CR-016 (A2) deleted
`ProductStockSummary.categoryName`, so a category rename now touches exactly one document. The
`TABLE-001` **Category** column renders from the ACTIVE-category reference set the page already loads for
its own filter (`Q-016`). Read: `all 7` — the category filter is offered on `SCREEN-011` and `SCREEN-048`,
both of which every role may open; the document carries only `name`, `description` and `status`.

### 4.2 `organizations/{orgId}/warehouses/{warehouseId}` — **CW, except archive**

| Field | Type | Req | Notes |
|---|---|:-:|---|
| `warehouseId` | string | ✔ | = id |
| `name` | string | ✔ | ≤ 80 |
| `code` | string? | – | |
| `type` | `WarehouseType` | ✔ | descriptive only — changes no rule |
| `status` | `LifecycleStatus` | ✔ | **a client may not set `ARCHIVED`** |
| `address` | string? | – | |
| `createdAt/By` · `updatedAt/By` | | ✔ | |

**DB-CR-013 — there is no `isDefault` field.** The default warehouse has exactly one source of truth,
`settings.defaultWarehouseId`. A boolean on each warehouse would be a second copy whose "exactly one
true" constraint no Security Rule can enforce, and switching it is inherently a two-document write. The
frozen dialog's *"Make this the default store room"* is therefore **`C-36 warehouse.setDefault`**, which
writes one settings field plus audit.

Archive is `warehouse.archive` only, because its guards are unbounded queries that rules cannot express.
Restore is always permitted.

### 4.3 `organizations/{orgId}/products/{productId}` — **CMD**

| Field | Type | Req | Notes |
|---|---|:-:|---|
| `productId` | string | ✔ | = id |
| `internalSku` | string | ✔ | as typed |
| `internalSkuNormalized` | string | ✔ | uppercased, trimmed, whitespace collapsed; **unique per organization** via `productSkuIndex` |
| `name` | string | ✔ | ≤ 120 |
| `description` | string? | – | ≤ 1000 |
| `categoryId` | string | ✔ | must reference an ACTIVE category at write time |
| `baseUnit` | `Unit` | ✔ | **immutable once any movement exists** for the product |
| `purchaseCostMinor` | integer ≥ 0 | ✔ | a change recomputes `stockValueMinor` in the same transaction |
| `sellingPriceMinor` | integer ≥ 0 ? | – | not a sales feature |
| `currency` | string | ✔ | |
| `minimumStockMilli` | integer ≥ 0 | ✔ | `0` means "not tracked" and can never produce LOW_STOCK |
| `reorderTargetMilli` | integer ≥ 0 | ✔ | normally ≥ minimum |
| `status` | `LifecycleStatus` | ✔ | archived ⇒ unavailable for a new PO or mapping |
| `partnerPublished` | boolean | ✔ | default `false` |
| `storefrontPublished` | boolean | ✔ | default `false` — Release C, never set in A/B |
| `createdAt/By` · `updatedAt/By` | | ✔ | |

Backend-written because uniqueness and audit both require a transaction.
Indexes: `IDX-01` `status, name` · `IDX-02` `status, categoryId, name` (PO-builder picker, category-scoped — DB-03 §3 SCREEN-022).
**A3 · F-M-03 — `IDX-03` is deleted**: no surface consumes it after DB-CR-011.
**A3 · §8.5 — `preferredPrivateSupplierId` is deleted**: the canonical Gate 6 artifact contains zero occurrences of *Preferred*, and owner brief §C.8 forbids introducing the field on registry evidence alone.

### 4.4 `organizations/{orgId}/stockBalances/{productId}__{warehouseId}` — **CMD**

| Field | Type | Req | Notes |
|---|---|:-:|---|
| `productId` · `warehouseId` | string | ✔ | immutable; both encoded in the id |
| `onHandMilli` | integer ≥ 0 | ✔ | **the negative-stock rule applies here, per warehouse** |
| `unit` | `Unit` | ✔ | copy of the product base unit |
| **`productName`** | string | ✔ | **A2 · DB-CR-017** — denormalised from the product |
| **`internalSku`** | string | ✔ | **DB-CR-017** |
| **`internalSkuNormalized`** | string | ✔ | **DB-CR-017** — serves the SKU prefix search on the warehouse-filtered list |
| **`categoryId`** | string | ✔ | **DB-CR-017** — serves the category-plus-warehouse filter combination |
| **`productStatus`** | `LifecycleStatus` | ✔ | **DB-CR-017** — mirrors `products.status`; keeps archived rows out of the default list |
| **`baseUnitPriceMinor`** | integer | ✔ | **DB-CR-017** — the purchase cost, for the per-store-room **Stock value** column |
| **`minimumStockMilli`** | integer ≥ 0 | ✔ | **DB-CR-017** — the input to the derived per-row `stockStatus` (DV-11) |
| **`productUpdatedAt`** | ts | ✔ | **DB-CR-017** — the list's *Updated* sort |
| **`stockValueMinor`** | integer ≥ 0 | ✔ | **A3 · DB-CR-025** — `roundHalfUp(onHandMilli × baseUnitPriceMinor / 1000)`. The per-store-room **Stock value** column, `Q-060` *Inventory by location*, and `Q-058`'s archive-refusal figure. |
| **`stockStatus`** | `StockStatus` | ✔ | **A3 · DB-CR-025** — `deriveStockStatus(onHandMilli, minimumStockMilli)`, the §4.5 function unchanged. Persisted so the frozen **Store room × Status** filter combination is an ordinary query. |
| **`shortfallMilli`** | integer ≥ 0 | ✔ | **A3 · DB-CR-025** — `max(0, minimumStockMilli − onHandMilli)`. |
| `updatedAt` | ts | ✔ | |

> **A3 · DB-CR-027 — `warehouseName` is DELETED from this document.** Its source
> `warehouses/{warehouseId}.name` is a `SAFE_DIRECT_CLIENT_WRITE` document while its host is
> command-written, so it violated the DB-07 §12 audit rule A2 introduced and rotted on any warehouse
> rename. The report's *Warehouse* column renders from `Q-017`, which SCREEN-011 and SCREEN-048 already
> load for their **Store room** filter dropdown. `INV-25` is withdrawn with the field.

Backend-write-only. The deterministic id makes one-balance-per-pair structural. A balance is **never**
written without its movement.
Indexes: `IDX-08` `warehouseId, onHandMilli DESC` · `IDX-09` `productId, onHandMilli DESC` ·
**`IDX-39 … IDX-43`** (DB-04 §7) for the warehouse-filtered `TABLE-001` sorts and filters ·
**`IDX-44`** `productStatus, warehouseId, stockStatus, productName` for the **Store room × Status**
combination (A3 · DB-CR-025) · single-field `stockValueMinor` for the `sum()` aggregation.

**A2 · DB-CR-017 — why these nine fields exist.** *"Products held in store room W"* is a per-`(product,
warehouse)` fact that lives only here. Serving the frozen **Store room** filter on `TABLE-001`
(`19` `TABLE-001`; `22` `FIELD-051`; canonical Gate 6 board `Store room: All ▾`) by reading 25
`stockBalances` and then joining 25 `productStockSummaries` costs **50 reads** against the `NFR-017`
budget of **27** — the same defect DB-CR-011 repaired for the unfiltered list. Denormalising the product's
display fields onto the balance makes the filtered list **25 reads from one collection**. It also removes
the identical undeclared join from `Q-061` (Stock-on-Hand report).

**Consistency.** Single source document (`products/{productId}`). Writers: `product.create` (no balances yet), **`product.update`**, **`product.setStatus`**,
and every stock command that creates a balance. `product.update` / `product.setStatus` fan out to that
product's balances with `IDX-09` and `limit(100)` **inside the same transaction** — one product, at most one
document per ACTIVE warehouse. Bounded by the warehouse count, not by the product count, which is what
distinguishes it from the category fanout A2 deleted. Governed by **DV-11** (DB-07 §12).

**A3 · DB-CR-025 — `stockStatus` IS persisted here. DB-CR-018 is REVERSED.**
DB-CR-018 refused the field on the grounds that persisting it *"would force a fanout across every
warehouse of a product on every movement."* That is arithmetically wrong. A movement changes
`onHandMilli` on **exactly one** balance row — two for a transfer, and a transfer writes both regardless.
`stockStatus`, `stockValueMinor` and `shortfallMilli` are each computed from fields **already on the row
being written**, inside a transaction **already writing that row**: zero extra reads, zero extra writes.
The only inputs that can move without a movement are `minimumStockMilli` and `baseUnitPriceMinor`, and
DB-CR-017 **already** established the bounded fanout that maintains both. The `movementKind` render-time
technique remains correct for `movementKind`; it was misapplied here. Governed by **DV-11**.

**`stock.transfer` is unchanged in shape.** It already reads `products/{productId}` and both warehouses and
already writes both balances, creating the destination when absent; it populates these fields on that
create. The write set stays at **six documents** and the summary stays untouched (`INV-23`).

### 4.5 `organizations/{orgId}/productStockSummaries/{productId}` — **CMD**

| Field | Type | Req | Notes |
|---|---|:-:|---|
| `productId` | string | ✔ | = id |
| **`productName`** | string | ✔ | **DB-CR-011** — denormalised from the product |
| **`internalSku`** | string | ✔ | **DB-CR-011** |
| **`internalSkuNormalized`** | string | ✔ | **DB-CR-011** — serves the SKU prefix search |
| **`categoryId`** | string | ✔ | **DB-CR-011** — an identifier, not a label; serves the category filter |
| **`productStatus`** | `LifecycleStatus` | ✔ | **DB-CR-011** — mirrors `products.status` |
| **`baseUnitPriceMinor`** | integer | ✔ | **DB-CR-011** — the purchase cost, for the report's Value column |
| **`productUpdatedAt`** | ts | ✔ | **DB-CR-011** — the list's Updated column |
| `onHandMilli` | integer | ✔ | = sum of that product's balances (`INV-04`) |
| `reservedMilli` | integer | ✔ | **constant `0`** in A/B/C |
| `availableMilli` | integer | ✔ | = `onHandMilli` while reserved is 0 |
| `minimumStockMilli` | integer | ✔ | denormalised from the product |
| `stockStatus` | `StockStatus` | ✔ | derived, precedence below |
| `stockValueMinor` | integer | ✔ | `roundHalfUp(onHandMilli × purchaseCostMinor / 1000)` |
| **`shortfallMilli`** | integer ≥ 0 | ✔ | **A3 · DB-CR-028** — `max(0, minimumStockMilli − onHandMilli)`. Makes the frozen Needs-Attention ordering (*"out first, then shortfall"*) queryable instead of approximated. |
| `unit` | `Unit` | ✔ | |
| `updatedAt` | ts | ✔ | |

```ts
if (onHandMilli <= 0) return 'OUT_OF_STOCK';                                   // checked first
if (minimumStockMilli > 0 && onHandMilli < minimumStockMilli) return 'LOW_STOCK';
return 'IN_STOCK';                       // exactly at the minimum is NOT low (strict <)
```

**`stock.transfer` does not write this document** (`INV-23`) — a transfer cannot change a product total,
so leaving the summary untouched makes the invariant structural and removes the only contention point
from the operation. Every other stock command writes it.
Indexes: `IDX-04` `stockStatus, onHandMilli` · single-field `stockValueMinor` for the `sum()` aggregation ·
`IDX-33 … IDX-37` (DB-04 §7) · **`IDX-46`** `productStatus, stockStatus, shortfallMilli DESC` for
Needs Attention (A3 · DB-CR-028).

> **A2 · DB-CR-016 — two fields deleted.** `categoryName` and `preferredSupplierName` are **removed from
> this document**. Both were sourced from a *different* document than the rest of the DV-10 set —
> `categories/**` and `privatePartners/**` respectively — and both of those are
> `SAFE_DIRECT_CLIENT_WRITE`. DV-10 declared them strongly consistent and named the fanout as happening
> *"inside `category.update`"*, **a command that does not exist in the 36-command catalog**; a private-
> supplier rename had no maintenance story at all. `preferredSupplierName` was additionally a privacy
> defect: after DB-CR-015 restricted `privatePartners` to `PARTNER_WRITERS`, copying a partner name into a
> document every one of the seven roles may read would hand Viewer, Analyst, Storekeeper and Inventory
> Manager exactly the partner data the RBAC matrix denies them.
>
> **What replaces them.** The **Category** column renders from the ACTIVE-category reference set the page
> already loads for its filter dropdown (`Q-016`). The **Preferred Supplier** column renders only for
> `PARTNER_WRITERS`, from the partner set those screens already load (`Q-031`); for every other role the
> column is absent. The canonical Gate 6 product-list board shows neither column — it draws
> `Product ↑ · SKU · Category · On hand · Minimum · Stock value`, all of which this document already
> carries.
>
> **Result:** every remaining DV-10 field has **one** source document (`products/{productId}`) and **three**
> writers, each already transactional. No cross-document fanout survives anywhere in the derived-data
> contract.

### 4.6 `organizations/{orgId}/stockMovements/{movementId}` — **CMD · IMMUTABLE**

The ledger. The single source of stock truth. Rules deny `update` and `delete` for **every** role.

| Field | Type | Req | Notes |
|---|---|:-:|---|
| `movementId` | string | ✔ | = id, generated |
| `productId` · `warehouseId` | string | ✔ | |
| `productNameSnapshot` · `skuSnapshot` | string | ✔ | so the ledger renders after archive without a join |
| `movementType` | `MovementType` | ✔ | 7 values incl. `TRANSFER_OUT`/`TRANSFER_IN` |
| `signedQuantityMilli` | integer · `≠ 0` for every `movementType` **except** `OPENING_BALANCE`, which permits `≥ 0` | ✔ | sign carried by the value, never by a separate flag. **A3R-P2 · C1-AUTH-007 (OWNER-APPROVED):** zero is legal for `OPENING_BALANCE` alone — see the rule below §4.6's type ↔ sign ↔ source matrix |
| `unit` | `Unit` | ✔ | |
| **`balanceAfterMilli`** | integer ≥ 0 | ✔ | **DB-CR-006** — the balance of *this* product-and-warehouse immediately after this movement (`INV-24`). Required by the frozen `TABLE-005/006` **Balance After** column, which cannot be computed from a filtered, paginated page. |
| `sourceType` | `SourceType` | ✔ | `MANUAL` · `PRIVATE_PO` · `CONNECTED_PO` · `TRANSFER` |
| `sourceId` | string? | – | PO id for receipts/dispatch; absent for manual |
| **`transferId`** | string? | – | **A1** — present on exactly the two halves of a transfer; identical on both |
| **`counterpartWarehouseId`** | string? | – | **A1** — the other warehouse of the pair, so a row renders *"Transferred out · to Cold Room"* without a second read |
| `adjustmentReason` | `AdjustmentReason`? | – | **required** when `movementType ∈ {ADJUSTMENT_IN, ADJUSTMENT_OUT}`, absent otherwise |
| `note` | string? | – | ≤ 280. **Required** when `adjustmentReason == 'OTHER'` |
| `operationId` | string | ✔ | links to the command receipt |
| `actorUid` · `actorName` | string | ✔ | attribution shown in the ledger |
| `effectiveAt` | ts | ✔ | business date. Equals `createdAt` for every type except `OPENING_BALANCE`, where the frozen form permits back-dating (*"As at … cannot be later than today"*). **Never used for ordering or for computing balances.** |
| `createdAt` | ts | ✔ | server timestamp; **the only ordering key** |

Indexes: `IDX-05` … `IDX-07`, plus `IDX-20` … `IDX-24` (DB-04 §7).
Retention permanent — this document class is never deleted, archived or expired.

**A3R-15 · DV-14 — `warehouseNameSnapshot: string`** and **`counterpartWarehouseNameSnapshot: string?`**
are added. The canonical Gate 6 board requires them explicitly, in the warehouse-archive copy: *"An empty
store room archives with a plain confirmation. **Its past movements keep the name, so old lines still read
correctly.**"* A ledger row must show the store-room name **as it was when the movement happened**, so a
join to the live `warehouses` document would render it *wrong*, not merely expensively — and
`counterpartWarehouseId` alone cannot render a transfer row's *"Transferred out · to Cold Room"*. Written
once, at create, on an immutable host: drift is structurally impossible. This is also what makes deleting
`warehouseName` from `stockBalances` (DB-CR-027) safe for SCREEN-017, which does **not** load `Q-017`.

**A3 · DB-CR-031 — `sourceReferenceSnapshot: string?`** is added. `TABLE-005`/`TABLE-006` render the human
order number (`Received · CPO-2026-003`), which lives on `purchaseOrders/{poId}.orderNumber`; the movement
stored only `sourceId`, so the frozen *Reference* column was a per-row join and `JOINED_LISTS = 0` was
false. Written by `po.receive`, `cpo.receive` and `cpo.ship` from the order number already inside the
transaction. A DV-09-class snapshot on an immutable document: no fanout, no drift obligation, zero new
reads. `JOINED_LISTS = 0` is restored to truth.

**Type ↔ sign ↔ source matrix.** Any other combination is invalid and is rejected by the command layer.

| `movementType` | sign | `sourceType` | `sourceId` | `transferId` | `adjustmentReason` |
|---|:-:|---|:-:|:-:|:-:|
| `OPENING_BALANCE` | **`+` or `0`** (`≥ 0`) | `MANUAL` | – | – | – |
| `ADJUSTMENT_IN` | + | `MANUAL` | – | – | **required** |
| `ADJUSTMENT_OUT` | − | `MANUAL` | – | – | **required** |
| `PURCHASE_RECEIPT` | + | `PRIVATE_PO` \| `CONNECTED_PO` | **required** | – | – |
| `CONNECTED_DISPATCH_OUT` | − | `CONNECTED_PO` | **required** | – | – |
| `TRANSFER_OUT` | − | `TRANSFER` | – | **required** | – |
| `TRANSFER_IN` | + | `TRANSFER` | – | **required** | – |

**A3R-P2 · C1-AUTH-007 — the zero opening balance is legal, and only for `OPENING_BALANCE`.**
An **OWNER-APPROVED** semantic exception, discovered during executable C1 implementation:

```text
if movementType == OPENING_BALANCE:
    signedQuantityMilli >= 0
else:
    signedQuantityMilli != 0
```

An explicitly recorded zero opening balance is a different fact from a product that was never initialized,
and DB-08 §2 requires the canonical seed to record exactly that: **Cooking Oil** carries
`movementType = OPENING_BALANCE`, `signedQuantityMilli = 0`, `balanceAfterMilli = 0`, which is what makes
the out-of-stock KPI provable **from the ledger** rather than from an absence. It is one of the twelve t₀
opening movements, not a gap in them.

Zero remains **rejected** for `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `PURCHASE_RECEIPT`,
`CONNECTED_DISPATCH_OUT`, `TRANSFER_IN` and `TRANSFER_OUT` — a zero-quantity movement of any of those types
records no event. `C-13 stock.recordOpeningBalance` therefore accepts `quantityMilli >= 0` (DB-06 §3.1) and
must not be wired to the shared non-zero quantity validator the other stock commands use.
*(The unconditional A3-era wording "`signedQuantityMilli` | integer ≠ 0" is **SUPERSEDED for
`OPENING_BALANCE` only**; it stands unchanged for the other six types.)*

---

## 5. Zone 3 — partners and procurement

### 5.1 `organizations/{orgId}/privatePartners/{partnerId}` — **CW**

> **A3 · DB-CR-035 — one maintained counter: `ordersPlacedCount: integer ≥ 0`.**
> The canonical Gate 7 board draws the supplier-list column
> **Orders placed** (`1 · 1 · 0 · 1`), the archive dialog *"Green Farm Poultry has 1 completed order"*,
> and the rule *"A supplier with an order still open cannot be archived"*. Owner brief §C.10 rules that a
> displayed aggregate is supported, not deleted. Written transactionally by `po.order` (+1)
> and `po.cancel` (−1), so it counts **non-cancelled orders placed**. **Backend-write-only** — excluded
> from the client-write allowlist even though the rest of the document is `SAFE_DIRECT_CLIENT_WRITE`.
> Governed by **DV-13**.
>
> **A3R-11 — `openOrdersCount` does not exist, and `status` is no longer client-writable here.** The first
> A3 pass made the archive guard a maintained counter read by the client. That is not a guard (there was
> no `partner.archive` command, and the document is a client-write surface), and the counter had an
> unreachable zero: its decrements were terminal receipt and cancellation, while DB-06 §3.3 forbids
> cancelling after any receipt — so a stalled `PARTIALLY_RECEIVED` order stranded the supplier
> permanently. Archive/restore is now **`C-38 partner.setStatus`**, which runs the guard
> `purchaseOrders where privateSupplierId == P and status in [open] limit(1)` **inside its transaction**:
> one read, on one action, no drift, no stuck state.

`partnerId` · `partnerTypes: ('SUPPLIER'|'BUYER')[]` (≥ 1, ≤ 2 — a **bounded** array, the only array in
the schema) · `name` · `contactPerson?` · `email?` · `phone?` · `address?` · `notes?` (≤ 1000) ·
`status: PartnerStatus` · `createdAt/By` · `updatedAt/By`.
Client create/update by `PARTNER_WRITERS`, including deactivation, which has no side effects.
In Release A the Buyers view is a **directory only** — there is no outbound sales workflow and the UI
must not imply one. Index: `IDX-10` `partnerTypes ARRAY_CONTAINS, status, name`.

### 5.2 `organizations/{orgId}/purchaseOrders/{poId}` — **CW only while PRIVATE + DRAFT**

The organization's view of every purchase order it participates in, so one list, one KPI and one report
serve both private and connected orders.

| Field | Type | Req | Notes |
|---|---|:-:|---|
| `purchaseOrderId` | string | ✔ | = id; **the same id** as the canonical connected record and the counterparty projection |
| `orderNumber` | string? | – | allocated from `counters/purchaseOrder` at ORDERED / SUBMITTED |
| `viewRole` | `ViewRole` | ✔ | |
| `supplierKind` | `SupplierKind` | ✔ | **immutable after create** |
| `counterpartyName` | string | ✔ | |
| `privateSupplierId` | string? | – | private only |
| `counterpartyOrgId` · `counterpartyHandle` · `connectionId` | string? | – | connected only |
| `status` | `PoStatus` | ✔ | |
| `currency` | string | ✔ | |
| `expectedDate` | ts? | – | |
| `receivingWarehouseId` | string? | – | recorded on the **first** receipt so `warehouse.archive` can detect the dependency |
| `totalMinor` | integer | ✔ | recomputed server-side from snapshots; a client total is never trusted |
| `isProjection` | boolean | ✔ | `true` for connected orders after submission |
| `lastOperationId` | string? | – | |
| `createdBy/At` · `submittedAt?` · `orderedAt?` · `acceptedAt?` · `shippedAt?` · `receivedAt?` · `cancelledAt?` | | | |

Client `create`/`update` permitted **only** while `supplierKind == 'PRIVATE'` **and** `status ==
'DRAFT'`, restricted to draft-editable fields. Every transition out of DRAFT is a command that
re-validates the whole document server-side.
Indexes: `IDX-11` `status, createdAt DESC` · `IDX-12` `supplierKind, status, createdAt DESC` ·
`IDX-13` `status, expectedDate ASC`.

### 5.3 `…/purchaseOrders/{poId}/items/{itemId}`

`itemId` · `buyerProductId` · `buyerProductNameSnapshot` · `buyerSkuSnapshot` · `buyerBaseUnitSnapshot` ·
`orderedBuyerBaseMilli` · `receivedBuyerBaseMilli` · `unitPriceMinor` · `lineTotalMinor` · `currency`.

Connected orders additionally: `mappingId` · `supplierCatalogItemId` · `supplierProductNameSnapshot` ·
`supplierSkuSnapshot` · `supplierOrderUnitSnapshot` · `orderedSupplierMilli` · `receivedSupplierMilli` ·
`supplierToBuyerBaseFactorMilliSnapshot`.

**Snapshots become immutable at ORDERED (private) or SUBMITTED (connected).** A line is always rendered
from its snapshot, never by joining to the live product — which is why renaming a product afterwards
leaves the order display unchanged.

### 5.4 `…/purchaseOrders/{poId}/history/{historyId}` — **IMMUTABLE**

`historyId` · `fromStatus` · `toStatus` · `actorUid` · `actorName` · `actorOrgId` · `actorOrgName` ·
`operationId` · `note?` · `createdAt`. For connected orders the identical row is written to the canonical
record **and** both projections, so both parties see one timeline with correct attribution.

---

## 6. Zone 3 — network (Release B-Lite)

### 6.1 `organizations/{supplierOrgId}/partnerCatalog/{catalogItemId}` — `PARTNER_SHARED`

> **A3 · DB-CR-036 — two display snapshots.** `internalProductNameSnapshot` and `internalSkuSnapshot`,
> written at create time from the source product. `TABLE-021` draws *Internal Product* and *Internal SKU*;
> the document carried only `sourceProductId`, so both columns were per-row joins. DV-09-class snapshots:
> no fanout, no drift obligation. **These are supplier-private display values and are never included in
> the projection a connected buyer reads** — the buyer's view is the partner-facing fields only.

`catalogItemId` · `sourceProductId` · `partnerSku` · `partnerSkuNormalized` (unique within the
supplier's published catalog) · `displayName` · `orderUnit` · `packDescription?` · `availabilityState:
Availability` · `wholesalePriceMinor?` · `currency?` · `published: boolean` · `updatedAt`.

**Never exposes** exact stock, internal cost, margin, warehouse or any private product field.
**`INV-17`: `orderUnit` must equal the source product's `baseUnit`** — without it, `cpo.ship` could not
know how much supplier stock to decrement without a second conversion factor.
Readable directly by the supplier's own members. **Connected buyers read it only through the
`partnerCatalog.list` and `partnerCatalog.lookupBySku` callables.** Index: `IDX-16` `published,
partnerSkuNormalized`.

### 6.2 `organizations/{buyerOrgId}/productMappings/{mappingId}` — **CMD**

> **A3 · DB-CR-036 — three display snapshots.** `buyerProductNameSnapshot`, `buyerSkuSnapshot` and
> `semanticConfirmedByName`, written at create/verify time. `TABLE-023` draws *Buyer Product/SKU* and
> *Verified By*; resolving the last needed `members`, which is `ADMINS`-only and therefore unreadable by
> the Procurement Manager who owns SCREEN-037. Snapshotting the display name removes the cross-role read
> entirely. The registry's *sort verified time* and supplier filter are dropped (A3 §8.5).

`mappingId` · `connectionId` · `buyerOrgId` · `buyerProductId` · `supplierOrgId` ·
`supplierCatalogItemId` · `supplierPartnerSkuSnapshot` · `supplierDisplayNameSnapshot` · `buyerBaseUnit` ·
`supplierOrderUnit` · `supplierToBuyerBaseFactorMilli` (> 0) · `semanticConfirmedByUid` ·
`semanticConfirmedAt` · `status: MappingStatus` · `createdAt` · `disabledAt?`.

Stored under the **buyer** organization: the conversion factor is the buyer's commercial data and the
supplier has no need of it. `PENDING`/`REJECTED` are B-PLUS and must never appear.
Index: `IDX-15` `status, buyerProductId`.

### 6.3 `organizations/{orgId}/connections/{connectionId}` — projection, **CMD**

> **A3 · DB-CR-035; DB-CR-040 — `ordersPlacedCount: integer ≥ 0`.** The canonical Gate 8 board draws the sub-line
> *"Connected since 9 Aug 2026 · **1 order placed**"* on each connection row. Written by `cpo.submit` in
> the same transaction that writes both projections (`INV-19`). It is a historical count of successfully
> submitted connected orders: later cancellation does not decrement it. `submittedAt` is the retained
> submission evidence used by **DV-12** rebuild. `19` `TABLE-018`'s
> *Mapped Items* and *Open Connected POs* columns are **deleted** — the canonical board draws
> `Business · Handle · Relationship · State · Action` and neither column appears (A3 §8.5).

Same field set as the canonical record (§7.2), written for **both** parties in the same transaction.
Member read. Index: `IDX-14` `status, updatedAt DESC`.

### 6.4 `organizations/{orgId}/auditLogs/{auditId}` — **CMD · IMMUTABLE**

`auditId` · `actorUid` · `actorName` · `actorRole` · `organizationId` · `action` (dot-case, e.g.
`stock.transfer`) · `entityType` · `entityId` · `operationId?` · `summary` (a short human sentence for
the Activity tab) · `metadata: map` (**safe scalars only** — never a whole document, never another
tenant's data) · `createdAt`.

**Owner/Admin read only.** `create`, `update` and `delete` denied to every client including the Owner.
A cross-tenant action writes **one record in each organization**, each carrying only what that
organization is entitled to know. Indexes: `IDX-18` `entityType, entityId, createdAt DESC` ·
`IDX-19` `createdAt DESC`.

---

## 7. Zone 4 — cross-tenant canonical · no client access

### 7.1 `handleReservations/{handle}`

`{ organizationId: string, createdAt: ts }`. Created with `txn.create` inside `org.create`, so two
concurrent requests for the same handle produce exactly one winner and one `already-exists` error with
no partially-created organization. Separating the reservation from the public directory entry makes the
uniqueness guarantee independent of what the directory happens to expose.

### 7.2 `connections/{buyerOrgId}__{supplierOrgId}`

`connectionId` · `buyerOrgId` · `supplierOrgId` · `buyerHandle` · `buyerName` · `supplierHandle` ·
`supplierName` · `status: ConnectionStatus` · `requestedByUid` · `requestedAt` · `respondedByUid?` ·
`respondedAt?` · `disabledAt?` · `updatedAt`.

Direction matters — a reverse relationship is a separate document, so two businesses can be each other's
supplier without ambiguity. `buyerOrgId === supplierOrgId` is rejected.

### 7.3 `connectedPurchaseOrders/{poId}` (+ `items`, `history`)

The canonical shared record. Contains **only fields both parties are entitled to see** — buyer-private
context such as internal notes, private cost or unrelated tenant data is never copied into it. Created
by `cpo.submit` and mutated only by `cpo.*`, each of which updates both organization projections in the
same transaction (`INV-19`). No client access whatsoever.

---

## 8. Access-class summary

| Path | Client read | Client write | Command | Backend-only | Privacy |
|---|:-:|:-:|:-:|:-:|---|
| `organizationDirectory/{handle}` | `get` only | ✘ | ✔ | – | PUBLIC |
| `users/{uid}` | self | 3 fields | ✔ | – | USER |
| `users/{uid}/memberships/**` | self | ✘ | ✔ | – | USER |
| `users/{uid}/notifications/**` | self | `read` only | ✔ | – | USER |
| `organizations/{orgId}` | member | ✘ | ✔ | – | TENANT |
| `…/settings/main` | member | ✘ | ✔ | – | TENANT |
| `…/counters/**` | ✘ | ✘ | ✔ | **✔** | TENANT |
| `…/commandReceipts/**` | ✘ | ✘ | ✔ | **✔** | TENANT |
| `…/productSkuIndex/**` | ✘ | ✘ | ✔ | **✔** | TENANT |
| `…/members/**` | **`get`: self or Owner/Admin · `list`: Owner/Admin** | ✘ | ✔ | – | TENANT |
| `…/invitations/**` | Owner/Admin | ✘ | ✔ | – | TENANT |
| `…/categories/**` | member (all 7) | **✔** | – | – | TENANT |
| `…/warehouses/**` | member (all 7) | **✔** (not →ARCHIVED) | archive | – | TENANT |
| `…/products/**` | member (all 7) | ✘ | ✔ | – | TENANT |
| `…/stockBalances/**` | member (all 7) | ✘ | ✔ | – | TENANT |
| `…/productStockSummaries/**` | member (all 7) | ✘ | ✔ | – | TENANT |
| `…/stockMovements/**` | **`NOT_VIEWER`** | ✘ | ✔ | – | TENANT |
| `…/privatePartners/**` | **`PARTNER_WRITERS`** | **✔** `PARTNER_WRITERS` | – | – | TENANT |
| `…/purchaseOrders/**` | **`NOT_VIEWER`** | **✔** PRIVATE+DRAFT only | ✔ | – | TENANT |
| `…/partnerCatalog/**` | **own-org `PARTNER_WRITERS`** | ✘ | ✔ | – | PARTNER_SHARED |
| `…/productMappings/**` | **`PARTNER_WRITERS`** | ✘ | ✔ | – | TENANT |
| `…/connections/**` | **`PARTNER_WRITERS`** | ✘ | ✔ | – | TENANT |
| `…/auditLogs/**` | Owner/Admin | ✘ | ✔ | – | TENANT |
| `handleReservations/**` | ✘ | ✘ | ✔ | **✔** | CROSS_TENANT |
| `connections/**` | ✘ | ✘ | ✔ | **✔** | CROSS_TENANT |
| `connectedPurchaseOrders/**` | ✘ | ✘ | ✔ | **✔** | CROSS_TENANT |

**A2 · DB-CR-015.** The seven bolded read cells were previously *"every ACTIVE member"*. They now match
the hard-boolean matrix in `06` §5 and the screen matrix in `23` §4 exactly, enforced in `firestore.rules`
by `hasRole()` on the **same constant path** `isActiveMember()` already reads — so the tightening costs
zero additional document access calls and `DATA_DERIVED_RULE_READS` stays `0`. DB-05 §4 is the full matrix
and the binding authority; this table is its summary.

**Client `delete` is denied on every row of this table, without exception.**

---

## 9. Schema freeze

No collection, document, field, enum value or identifier strategy in this file may be changed, added or
removed without an owner-approved amendment in the form of DB-00 / A1. Field *names* may be adapted
consistently during implementation; ownership, zone, access class, privacy class, immutability and
invariants may not.
