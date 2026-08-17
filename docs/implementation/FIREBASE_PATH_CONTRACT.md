# FIREBASE_PATH_CONTRACT

**Derived from `DB_01` §4 and `DB_02`, which are derived from `Stockmok_Final_Control_Pack_v4/11` §5 —
the physical-path authority. This file introduces no path. If it disagrees with `DB_01` §4, `DB_01` §4
wins and this file is the defect.**

Status: **FROZEN** at database amendment **A3** (`DB_00` §8), 2026-08-17.
Consumers: Antigravity (frontend) · Codex (data platform) · Claude Code (rules + functions).

## 0. The rule that makes this file worth having

Three agents will write code against these paths. **No agent may invent, relocate, rename or add a path.**
A path that is not in §1 does not exist. If an implementation appears to need one, that is an architecture
question, not an implementation decision: stop and raise it against `DB_00`.

## 1. The registry — Release A + B-Lite, complete

```text
# ── ZONE 1 · PUBLIC ─────────────────────────────────────────────────────────
organizationDirectory/{handle}                            get: public · list: DENIED · backend write
storefrontCatalog/{handle}/items/{itemId}                 [RELEASE C — NOT BUILT, declared-inert scope guard]

# ── ZONE 2 · USER-PRIVATE ───────────────────────────────────────────────────
users/{uid}                                               self read · self write (3 fields)
users/{uid}/memberships/{orgId}                           self read · backend write
users/{uid}/notifications/{notificationId}                self read · self update `read` only

# ── ZONE 3 · ORGANIZATION-PRIVATE ───────────────────────────────────────────
organizations/{orgId}                                     member read · backend write
organizations/{orgId}/settings/main                       member read · backend write
organizations/{orgId}/counters/{counterId}                NO CLIENT ACCESS
organizations/{orgId}/commandReceipts/{operationId}       NO CLIENT ACCESS
organizations/{orgId}/productSkuIndex/{skuNormalized}     NO CLIENT ACCESS
organizations/{orgId}/members/{uid}                       get: self or Owner/Admin · list: Owner/Admin · backend write
organizations/{orgId}/invitations/{invitationId}          Owner/Admin read · backend write
organizations/{orgId}/categories/{categoryId}             member read (all 7) · CLIENT WRITE (INVENTORY_WRITERS)
organizations/{orgId}/warehouses/{warehouseId}            member read (all 7) · CLIENT WRITE (INVENTORY_WRITERS) · `status` IMMUTABLE to clients in BOTH directions
organizations/{orgId}/products/{productId}                member read (all 7) · backend write
organizations/{orgId}/stockBalances/{productId}__{warehouseId}    member read (all 7) · backend write
organizations/{orgId}/productStockSummaries/{productId}   member read (all 7) · backend write
organizations/{orgId}/stockMovements/{movementId}         NOT_VIEWER read · backend write · IMMUTABLE
organizations/{orgId}/privatePartners/{partnerId}         PARTNER_WRITERS read · CLIENT WRITE (PARTNER_WRITERS) · counter fields BACKEND-ONLY
organizations/{orgId}/purchaseOrders/{poId}               NOT_VIEWER read · CLIENT WRITE only while PRIVATE + DRAFT
organizations/{orgId}/purchaseOrders/{poId}/items/{itemId}        same as parent
organizations/{orgId}/purchaseOrders/{poId}/history/{historyId}   NOT_VIEWER read · backend write · IMMUTABLE
organizations/{orgId}/partnerCatalog/{catalogItemId}      own-org PARTNER_WRITERS read · backend write
organizations/{orgId}/productMappings/{mappingId}         PARTNER_WRITERS read (buyer org) · backend write
organizations/{orgId}/connections/{connectionId}          PARTNER_WRITERS read · backend write   (PROJECTION)
organizations/{orgId}/auditLogs/{auditId}                 Owner/Admin read · backend write · IMMUTABLE

# ── ZONE 4 · CROSS-TENANT CANONICAL · NO CLIENT ACCESS AT ALL ───────────────
handleReservations/{handle}                               backend only
connections/{buyerOrgId}__{supplierOrgId}                 backend only   (CANONICAL)
connectedPurchaseOrders/{poId}                            backend only   (CANONICAL)
connectedPurchaseOrders/{poId}/items/{itemId}             backend only
connectedPurchaseOrders/{poId}/history/{historyId}        backend only
```

`client.delete` is denied on **every** path above, without exception.

## 2. Zone semantics

| Zone | Meaning | Client reachability |
|---|---|---|
| 1 | Public projection. Exact-`get` only; `list` is denied so a handle cannot be enumerated. | `get` |
| 2 | Keyed by the caller's own `uid`. | self |
| 3 | Keyed by `orgId`. Every rule resolves membership on a **constant path**, never a data-derived one. | member, role-gated |
| 4 | Cross-tenant canonical truth. **Closed to clients absolutely** — this is what makes tenant isolation structural rather than rule-dependent. | none |

**Zone 3 and Zone 4 both hold connected-order state, and the direction of truth is one-way.**
`connectedPurchaseOrders/{poId}` (zone 4) is canonical; each side's
`organizations/{orgId}/purchaseOrders/{poId}` is a **projection** written in the same transaction
(`INV-19`). A client never reads the canonical document, and never writes a projection of a connected
order.

## 3. Deterministic identifiers

| Document | Identifier |
|---|---|
| `connections/{id}` (zone 4) | `{buyerOrgId}__{supplierOrgId}` — directional uniqueness by Firestore `create` precondition |
| `stockBalances/{id}` | `{productId}__{warehouseId}` — one balance per pair, structurally |
| `productStockSummaries/{id}` | `{productId}` |
| `productSkuIndex/{id}` | normalised SKU — uppercased, trimmed, internal whitespace collapsed |
| `handleReservations/{id}` | normalised handle — lowercase `[a-z0-9-]`, 3–30 chars |
| `commandReceipts/{id}` | client-generated `operationId`, UUID v4 |
| `connectedPurchaseOrders/{poId}` + both projections | the **same** `poId`, so all three reconcile by id in a test |
| `stockMovements/{id}` | generated; `transferId` links the two halves of a transfer |

Human-readable strings — SKU, order number, handle — are **never** primary identity.

## 4. Typed path builders — the only sanctioned construction

Codex generates these; Antigravity and Claude Code consume them. **String concatenation of a Firestore
path is a review-blocking defect in any of the three codebases.**

```ts
export const paths = {
  orgDirectory:      (handle: string)              => `organizationDirectory/${handle}`,
  user:              (uid: string)                 => `users/${uid}`,
  membership:        (uid: string, orgId: string)  => `users/${uid}/memberships/${orgId}`,
  notification:      (uid: string, id: string)     => `users/${uid}/notifications/${id}`,
  org:               (o: string)                   => `organizations/${o}`,
  settings:          (o: string)                   => `organizations/${o}/settings/main`,
  counter:           (o: string, c: string)        => `organizations/${o}/counters/${c}`,
  commandReceipt:    (o: string, opId: string)     => `organizations/${o}/commandReceipts/${opId}`,
  skuIndex:          (o: string, sku: string)      => `organizations/${o}/productSkuIndex/${sku}`,
  member:            (o: string, uid: string)      => `organizations/${o}/members/${uid}`,
  invitation:        (o: string, id: string)       => `organizations/${o}/invitations/${id}`,
  category:          (o: string, id: string)       => `organizations/${o}/categories/${id}`,
  warehouse:         (o: string, id: string)       => `organizations/${o}/warehouses/${id}`,
  product:           (o: string, id: string)       => `organizations/${o}/products/${id}`,
  stockBalance:      (o: string, p: string, w: string) => `organizations/${o}/stockBalances/${p}__${w}`,
  stockSummary:      (o: string, p: string)        => `organizations/${o}/productStockSummaries/${p}`,
  stockMovement:     (o: string, id: string)       => `organizations/${o}/stockMovements/${id}`,
  privatePartner:    (o: string, id: string)       => `organizations/${o}/privatePartners/${id}`,
  purchaseOrder:     (o: string, id: string)       => `organizations/${o}/purchaseOrders/${id}`,
  poItem:            (o: string, po: string, i: string) => `organizations/${o}/purchaseOrders/${po}/items/${i}`,
  poHistory:         (o: string, po: string, h: string) => `organizations/${o}/purchaseOrders/${po}/history/${h}`,
  partnerCatalogItem:(o: string, id: string)       => `organizations/${o}/partnerCatalog/${id}`,
  productMapping:    (o: string, id: string)       => `organizations/${o}/productMappings/${id}`,
  connectionProj:    (o: string, id: string)       => `organizations/${o}/connections/${id}`,
  auditLog:          (o: string, id: string)       => `organizations/${o}/auditLogs/${id}`,

  // ── zone 4 · server only. Importing these into client code must fail the build. ──
  handleReservation: (handle: string)              => `handleReservations/${handle}`,
  connectionCanon:   (b: string, s: string)        => `connections/${b}__${s}`,
  connectedPo:       (poId: string)                => `connectedPurchaseOrders/${poId}`,
} as const;
```

The zone-4 builders live in a **server-only module** that the frontend build cannot resolve. This is the
mechanical form of "clients never touch zone 4"; the Firestore rules are the second layer, not the first.

## 5. Change control

Adding, removing, renaming or relocating a path requires an owner-approved amendment in `DB_00`, followed
by a synchronised update to `DB_01` §4, `DB_02`, this file, and `INTEGRATION_STATUS.md`. No agent may do
it unilaterally, and no agent may work around a missing path by nesting under an existing one.
