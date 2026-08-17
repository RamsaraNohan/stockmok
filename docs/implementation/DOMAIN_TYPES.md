# DOMAIN_TYPES

**Derived from `DB_02` (physical schema) with amendment **A3** applied. `DB_02` wins on any disagreement.**
One type system. Codex generates it; Antigravity and Claude Code import it. **No agent defines a second.**

Status: **FROZEN** at A3; propagated at **A3R-P2** (C1 implementation-discovery), 2026-08-17.

## 0. Representation rules — non-negotiable

| Concern | Rule | Why |
|---|---|---|
| Quantity | integer **milli-units**, max 3 decimals. `120.000 KG` is `120_000`. | Float quantities do not sum to the ledger. |
| Money | integer **minor units**. `LKR 691,700.00` is `69_170_000`. | Same. |
| Rounding | `roundHalfUp` only, applied once, at the point of derivation. | Two rounding modes produce two totals. |
| Time | Firestore `Timestamp`. Never a string, never a client clock for anything a command trusts. | |
| Money + quantity | never multiplied on the client for a *stored* value. | Derived values are written by the command that writes their host. |

```ts
type Milli = number;   // integer, 3-decimal quantity
type Minor = number;   // integer, currency minor unit
```

## 1. Enumerations

```ts
export type Role =
  | 'OWNER' | 'ADMIN' | 'INVENTORY_MANAGER' | 'PROCUREMENT_MANAGER'
  | 'STOREKEEPER' | 'ANALYST' | 'VIEWER';                    // exactly seven. ANALYST is real.

export type MemberStatus      = 'ACTIVE' | 'SUSPENDED' | 'REMOVED';
export type InviteStatus      = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
export type LifecycleStatus   = 'ACTIVE' | 'ARCHIVED';       // products, categories, warehouses
export type PartnerStatus     = 'ACTIVE' | 'DEACTIVATED';    // A3R-P2 · C1-AUTH-004 — private partners
export type OrganizationStatus= 'ACTIVE';                    // A3 · F-M-05
export type UserStatus        = 'ACTIVE' | 'DISABLED';       // A3R-P2 · C1-AUTH-005 — DB_02 §2.1
                                                             // owns both values
export type DirectoryStatus   = 'LISTED';                    // A3 · F-M-05
export type Unit              = 'KG' | 'L' | 'EACH' | 'PACK';// A3 · F-L-01
export type StockStatus       = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type NotificationCategory = 'STOCK' | 'ORDERS' | 'NETWORK';   // A3 · F-M-09

// A3R-P2 · C1-AUTH-001 — the seven persisted values, exactly as DB_02 §0.1 declares them.
// The generic 'ADJUSTMENT' was never a storage value and 'CONNECTED_DISPATCH_OUT' was missing.
export type MovementType =
  | 'OPENING_BALANCE'
  | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT'
  | 'PURCHASE_RECEIPT' | 'CONNECTED_DISPATCH_OUT'
  | 'TRANSFER_OUT' | 'TRANSFER_IN';

export type PoKind        = 'PRIVATE' | 'CONNECTED';
export type ConnectionStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'DISABLED';  // A3R-P2 · C1-AUTH-002
export type MappingStatus    = 'VERIFIED' | 'DISABLED';                        // A3R-P2 · C1-AUTH-003

// One shared union. Private orders never reach SUBMITTED/ACCEPTED/SHIPPED/REJECTED;
// connected orders never reach the private-only transitions. The state machine, not the
// type, enforces which subset applies — see DB_07.
export type PoStatus =
  | 'DRAFT' | 'ORDERED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'
  | 'SHIPPED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
```

**`InviteStatus.EXPIRED` is derived on read** (A3 · F-M-05). No scheduled job writes it; `Q-010` filters
`expiresAt > now`, the pill is derived, and `team.acceptInvitation` / `team.revokeInvitation` write the
terminal value lazily when they encounter an expired document.

**`movementKind` is never persisted.** The UI's *Received / Issued / Corrected / Transferred* label is
derived from `type` and the sign of `quantityMilli` (`DB_02` §0.2). *Correction* is
`in ['ADJUSTMENT_IN','ADJUSTMENT_OUT']`; *Issued* is `CONNECTED_DISPATCH_OUT`.

**A3R-P2 — C1 implementation-discovery propagation.** Five enum defects in this file are corrected against
`DB_02` §0.1 / §2.1 / §5.1, which is the authority and which C1 implemented: `MovementType`
(`C1-AUTH-001`), `ConnectionStatus` — `REJECTED`, never `DECLINED` (`C1-AUTH-002`), `MappingStatus` —
`VERIFIED` / `DISABLED` only; `DRAFT` and `INVALID` are not Release A/B mapping states and
`PENDING`/`REJECTED` remain B-PLUS-only (`C1-AUTH-003`), `PrivatePartner` — bounded `partnerTypes` +
`PartnerStatus`, never singular `kind` + `LifecycleStatus` (`C1-AUTH-004`), and `UserStatus` —
`ACTIVE | DISABLED` (`C1-AUTH-005`). No enum is widened beyond what `DB_02` already declares.

**The zero opening balance — `C1-AUTH-007`, OWNER-APPROVED.** One rule, and the only place in this type
system where a movement quantity may be zero:

```ts
// DB_02 §4.6 · DB_06 §3.1
if (movementType === 'OPENING_BALANCE') { /* signed quantity >= 0 */ }
else                                    { /* signed quantity !== 0 */ }
```

The canonical seed's **Cooking Oil** row is exactly that — `OPENING_BALANCE`, signed quantity `0`,
`balanceAfterMilli` `0` — a *recorded* zero, which is a different fact from a product that was never
initialized. A shared `nonZeroQuantity` guard must therefore **not** be applied to
`C-13 stock.recordOpeningBalance`; every other stock command keeps its strictly-positive rule.

## 2. Core documents — the A3 field set

Only fields whose ownership or A3 status matters are annotated. `DB_02` is the complete table.

```ts
export interface Product {                    // organizations/{orgId}/products/{productId}
  productId: string;
  internalSku: string;
  internalSkuNormalized: string;              // unique per org via productSkuIndex
  name: string;
  description?: string;
  categoryId: string;
  baseUnit: Unit;                             // immutable once any movement exists
  purchaseCostMinor: Minor;
  sellingPriceMinor?: Minor;
  currency: string;
  minimumStockMilli: Milli;                   // 0 means "not tracked" — can never be LOW_STOCK
  reorderTargetMilli: Milli;
  status: LifecycleStatus;
  partnerPublished: boolean;
  storefrontPublished: boolean;               // always false in A/B
  // A3: preferredPrivateSupplierId DELETED — 0 occurrences in the canonical artifact
}

export interface StockBalance {               // .../stockBalances/{productId}__{warehouseId}
  productId: string; warehouseId: string;     // both encoded in the id
  onHandMilli: Milli;                         // >= 0 — the negative-stock rule applies HERE, per warehouse
  unit: Unit;
  // DB-CR-017 display denormalisation (source: products/{productId}, same transactional writer)
  productName: string; internalSku: string; internalSkuNormalized: string;
  categoryId: string; productStatus: LifecycleStatus;
  baseUnitPriceMinor: Minor; minimumStockMilli: Milli; productUpdatedAt: Timestamp;
  // A3 · DB-CR-025 — derived WITHIN this document, by the writer already writing it
  stockValueMinor: Minor;                     // roundHalfUp(onHandMilli * baseUnitPriceMinor / 1000)
  stockStatus: StockStatus;                   // deriveStockStatus(onHandMilli, minimumStockMilli)
  shortfallMilli: Milli;                      // max(0, minimumStockMilli - onHandMilli)
  updatedAt: Timestamp;
  // A3 · DB-CR-027: warehouseName DELETED — it came from a client-written document
}

export interface ProductStockSummary {        // .../productStockSummaries/{productId}
  productId: string;
  productName: string; internalSku: string; internalSkuNormalized: string;
  categoryId: string; productStatus: LifecycleStatus;
  baseUnitPriceMinor: Minor; productUpdatedAt: Timestamp;
  onHandMilli: Milli;                         // = sum of that product's balances (INV-04)
  reservedMilli: Milli;                       // FUTURE_PLACEHOLDER, constant 0 in A/B/C (A3 · F-L-02)
  availableMilli: Milli;                      // derived: = onHandMilli while reserved is 0
  minimumStockMilli: Milli;
  stockStatus: StockStatus;
  stockValueMinor: Minor;
  shortfallMilli: Milli;                      // A3 · DB-CR-028 — makes "out first, then shortfall" queryable
  unit: Unit; updatedAt: Timestamp;
  // INV-27: stockValueMinor == SUM of this product's balances' stockValueMinor.
  // Value is rounded ONCE, at the balance grain. Do not recompute it from onHandMilli x price
  // -- that is a second rounding, and it makes CHART-002's bars disagree with the KPI.
}

export interface StockMovement {              // .../stockMovements/{movementId} — IMMUTABLE
  movementId: string; productId: string; warehouseId: string;
  type: MovementType;                         // DB_02 §4.6 names the stored field `movementType`
  quantityMilli: Milli;                       // signed; DB_02 §4.6 names it `signedQuantityMilli`
                                              // A3R-P2 · C1-AUTH-007: !== 0 for every type EXCEPT
                                              // 'OPENING_BALANCE', which permits >= 0
  balanceAfterMilli: Milli;                   // INV-24
  unit: Unit;
  productNameSnapshot: string; skuSnapshot: string; actorName: string;
  sourceId?: string;                          // the PO document id
  sourceReferenceSnapshot?: string;           // A3 · DB-CR-031 — the human order number, e.g. "CPO-2026-003"
  warehouseNameSnapshot: string;              // A3R-15 · DV-14 — the store-room name AS IT WAS.
  counterpartWarehouseNameSnapshot?: string;  // A3R-15 · DV-14 — the transfer's other side.
    // The board requires these: "Its past movements keep the name, so old lines still read correctly."
    // A join to the live warehouses document would render an archived/renamed room WRONG, not just slowly.
  transferId?: string;                        // links the two halves of a transfer (INV-22)
  adjustmentReason?: AdjustmentReason; note?: string; effectiveAt?: Timestamp;
  operationId: string; createdAt: Timestamp; createdBy: string;
}

export interface PrivatePartner {             // .../privatePartners/{partnerId}
  partnerId: string; name: string;
  contactPerson?: string; phone?: string; email?: string; address?: string;
  // A3R-P2 · C1-AUTH-004 — a BOUNDED array (>= 1, <= 2), not a singular `kind`: one record may
  // be both supplier and buyer.  DB_02 §5.1; the only array in the schema.
  partnerTypes: ('SUPPLIER' | 'BUYER')[];
  status: PartnerStatus;                      // ACTIVE | DEACTIVATED — 'ARCHIVED' is never
                                              // persisted here; UI archive -> DEACTIVATED,
                                              // restore -> ACTIVE
  linkedConnectionId?: string;                // renders the "Connected" badge
  ordersPlacedCount: number;                  // A3 · DV-13 — BACKEND-WRITE-ONLY.
                                              // Counts NON-CANCELLED orders placed: +1 on po.order,
                                              // -1 on po.cancel. There is no openOrdersCount — the
                                              // archive guard is C-38's in-transaction limit(1) query.
}
```

`ordersPlacedCount` sits on an otherwise `SAFE_DIRECT_CLIENT_WRITE` document and is **excluded from the
client-write allowlist**, as is `status` — archive and restore are `C-38 partner.setStatus`, because a
guard the client evaluates is not a guard. Codex's generated client-write helper must expose neither;
`T-SEC-36` asserts the rule. **A3R-P2 · C1-AUTH-004:** the UI words map onto `PartnerStatus` —
**archive → `DEACTIVATED`**, **restore → `ACTIVE`** — and `T-SEC-41` asserts the open-order guard on
`DEACTIVATED`. `C-38`'s authorization and guard semantics are unchanged.

## 3. Pure domain functions — one definition, three consumers

```ts
export function deriveStockStatus(onHandMilli: Milli, minimumStockMilli: Milli): StockStatus {
  if (onHandMilli <= 0) return 'OUT_OF_STOCK';                       // checked FIRST
  if (minimumStockMilli > 0 && onHandMilli < minimumStockMilli) return 'LOW_STOCK';
  return 'IN_STOCK';                          // exactly AT the minimum is NOT low — strict <
}

export function deriveShortfall(minimumStockMilli: Milli, onHandMilli: Milli): Milli {
  return Math.max(0, minimumStockMilli - onHandMilli);
}

export function deriveStockValueMinor(onHandMilli: Milli, unitPriceMinor: Minor): Minor {
  return roundHalfUp((onHandMilli * unitPriceMinor) / 1000);
}
```

All three are required **at both grains** — summary and balance — and both grains must produce identical
answers for a single-warehouse product. Unit-tested against the canonical twelve products, both at t₀ and
post-chain.

## 4. Where a type may not be redefined

Antigravity may derive **view models** from these types. It may not redeclare a domain enum, widen a
union, or introduce a parallel `Product`. Claude Code may not narrow a union inside a command in a way the
shared type does not express — if a command accepts only a subset of `PoStatus`, that subset belongs in
the transition table (`DB_07`), not in a private type.

Any change here requires a `DB_02` amendment first.
