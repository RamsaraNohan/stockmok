# Stockmok — Final Firebase Implementation Architecture v3.0

**Status:** FROZEN implementation-ready Firebase design.
**Authority:** owns Firebase project layout, collection paths, rules strategy, command catalog, transaction boundaries and deployment mechanics.
**Depends on:** `05_FINAL_DOMAIN_AND_DATA_CONTRACT.md` (entities/states), `06_FINAL_SECURITY_AND_RBAC_MODEL.md` (trust boundary), `10_FINAL_TECH_STACK_DECISION.md` (technology).
**Does not contain:** production source code. Illustrative fragments only.

---

# 1. Firebase project structure

| Item | Value |
|---|---|
| Projects | **One.** `stockmok-prod` (display name "Stockmok"). No staging project — see TECH-064. |
| Billing plan | **Blaze**, with a $5 GCP budget and alerts at 50/90/100 %. |
| Region | One region for Firestore and all Functions, chosen on Day 1 and never changed. Recommended `asia-south1` (Mumbai) for latency from Sri Lanka, or `europe-west2` if the marker is UK-based. **Firestore location is permanent — decide once, record it in the README.** |
| Enabled products | Authentication, Cloud Firestore, Cloud Functions, Hosting. |
| Disabled / unused | Cloud Storage, Realtime Database, App Check, Remote Config, Analytics, Extensions, Data Connect, App Hosting. |
| Hosting site | default `stockmok-prod.web.app`. Custom domain optional and not on the critical path. |

**Local files**

```text
.firebaserc              { "projects": { "default": "stockmok-prod" } }
firebase.json            hosting, firestore, functions, emulators
firestore.rules
firestore.indexes.json
functions/               Node 22 TypeScript
packages/shared/         schemas, types, domain logic (shared by app + functions)
src/                     React app
```

---

# 2. Environments

There are exactly two, and they are unambiguous at runtime.

| Environment | Backend | Data | Who uses it |
|---|---|---|---|
| **Local** | Local Emulator Suite (auth 9099, firestore 8080, functions 5001, hosting 5000, UI 4000) | seeded, disposable, persisted to `./.emulator-data` | all development, all automated tests, CI |
| **Production** | live `stockmok-prod` | seeded demo dataset for the marker | deployment smoke tests, the recorded demo, the marker |

**Runtime selection.** The client connects to emulators **only** when `import.meta.env.VITE_USE_EMULATORS === 'true'`. When that flag is on, the app renders a fixed amber `EMULATOR` ribbon in the top bar. This makes it structurally impossible to record a demo against the wrong backend or to believe a production bug is a local one.

```ts
// src/lib/firebase/app.ts  (illustrative)
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const fns = getFunctions(app, FIREBASE_REGION);

if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(fns, '127.0.0.1', 5001);
}
```

---

# 3. Emulator configuration

```jsonc
// firebase.json (emulators block, illustrative)
{
  "emulators": {
    "auth":      { "port": 9099 },
    "firestore": { "port": 8080 },
    "functions": { "port": 5001 },
    "hosting":   { "port": 5000 },
    "ui":        { "enabled": true, "port": 4000 },
    "singleProjectMode": true
  }
}
```

**Scripts**

| Script | Command | Purpose |
|---|---|---|
| `emu` | `firebase emulators:start --import ./.emulator-data --export-on-exit` | day-to-day development with persisted seed |
| `emu:clean` | `firebase emulators:start` | fresh empty state |
| `seed` | `tsx scripts/seed.ts --target=emulator` | build the canonical demo dataset |
| `test:rules` | `firebase emulators:exec --only firestore "vitest run --project rules"` | rules suite |
| `test:int` | `firebase emulators:exec --only auth,firestore,functions "vitest run --project integration"` | command suite |
| `e2e` | `firebase emulators:exec --only auth,firestore,functions "playwright test"` | E2E against emulators |

`.emulator-data/` is git-ignored. The seed script is the reproducible source of the dataset (NFR-014), not the exported binary state.

---

# 4. Authentication configuration

| Item | Decision |
|---|---|
| Providers enabled | Email/Password; Google. Nothing else. |
| Email enumeration protection | Left **enabled** (Firebase default). Consequence: sign-in errors are deliberately generic (`auth/invalid-credential`). The UI must show one neutral message — "Email or password is incorrect" — and must never reveal whether an account exists. This is both the secure behaviour and a good report note. |
| Google sign-in | `signInWithPopup`. Not redirect (TECH-022). |
| Password reset | `sendPasswordResetEmail`, Firebase-hosted action page. No custom email templates on the critical path. |
| Authorised domains | `localhost`, `127.0.0.1`, `stockmok-prod.web.app`, `stockmok-prod.firebaseapp.com`. **Adding these is a Stage-18 checklist item** — a missing entry breaks Google sign-in in production only, which is a classic submission-day failure. |
| Display name | Captured at sign-up for email/password (`updateProfile`), taken from the Google profile otherwise. |
| Sign-out | `signOut()` plus `queryClient.clear()` so no cached tenant data survives into the next session. |
| Account deletion | Out of scope for A/B; documented as Release D. |

**User profile bootstrap.** `05` v2 never said who creates `users/{uid}`. Decision: **the client creates and maintains its own profile document**, restricted by rules to its own uid and to a whitelist of fields (`displayName`, `photoUrl`, `lastSeenAt`). It is created idempotently on first authenticated render via `setDoc(..., { merge: true })`. No Auth-triggered Cloud Function is used, because blocking/auth-trigger functions add Identity Platform configuration for no benefit here. `email` and `status` are written only by backend commands.

---

# 5. Firestore collection paths (canonical)

This section **supersedes `05` v2 §2**. The changes are driven by verified fact VF-03 (rules access-call limits) and VF-05 (rules are not filters): a Security Rule may only `get()` a path that is constant across the whole request, which means cross-tenant documents cannot be safely exposed to client queries.

```text
# ── PUBLIC ZONE ─────────────────────────────────────────────────────────────
organizationDirectory/{handle}                       get: public · list: DENIED
storefrontCatalog/{handle}/items/{itemId}            get+list: public   (Release C only)

# ── USER ZONE (owner-only) ──────────────────────────────────────────────────
users/{uid}                                          self read/write (whitelisted fields)
users/{uid}/memberships/{orgId}                      self read · backend write   [NEW]
users/{uid}/notifications/{notificationId}           self read · self update `read` only

# ── TENANT-PRIVATE ZONE ─────────────────────────────────────────────────────
organizations/{orgId}                                member read · backend write
organizations/{orgId}/settings/main                  member read · backend write
organizations/{orgId}/counters/{counterId}           NO CLIENT ACCESS            [NEW]
organizations/{orgId}/members/{uid}                  member read · backend write
organizations/{orgId}/invitations/{invitationId}     owner/admin read · backend write
organizations/{orgId}/categories/{categoryId}        member read · role-gated client write
organizations/{orgId}/products/{productId}           member read · backend write
organizations/{orgId}/productSkuIndex/{skuNorm}      NO CLIENT ACCESS            [NEW]
organizations/{orgId}/warehouses/{warehouseId}       member read · role-gated client create/update
organizations/{orgId}/stockBalances/{productId__warehouseId}   member read · backend write
organizations/{orgId}/productStockSummaries/{productId}        member read · backend write
organizations/{orgId}/stockMovements/{movementId}    member read · backend write · immutable
organizations/{orgId}/privatePartners/{partnerId}    member read · role-gated client write
organizations/{orgId}/purchaseOrders/{poId}          member read · client write ONLY while DRAFT+PRIVATE
organizations/{orgId}/purchaseOrders/{poId}/items/{itemId}     same as parent
organizations/{orgId}/purchaseOrders/{poId}/history/{histId}   member read · backend write · immutable
organizations/{orgId}/partnerCatalog/{catalogItemId} member read (own org only) · backend write
organizations/{orgId}/productMappings/{mappingId}    member read (buyer org) · backend write
organizations/{orgId}/connections/{connectionId}     member read · backend write   (projection)
organizations/{orgId}/auditLogs/{auditId}            owner/admin read · backend write · immutable
organizations/{orgId}/commandReceipts/{operationId}  NO CLIENT ACCESS

# ── CROSS-TENANT CANONICAL ZONE — NO CLIENT ACCESS AT ALL ───────────────────
connections/{connectionId}                           backend only
connectedPurchaseOrders/{poId}                       backend only
connectedPurchaseOrders/{poId}/items/{itemId}        backend only
connectedPurchaseOrders/{poId}/history/{histId}      backend only
handleReservations/{handle}                          backend only                 [NEW]
```

**Deterministic identifiers**

| Document | ID |
|---|---|
| `connections/{connectionId}` | `{buyerOrgId}__{supplierOrgId}` — makes the directional-uniqueness invariant (FR-NET-006) enforced by Firestore's `create` precondition rather than by application logic. |
| `stockBalances/{id}` | `{productId}__{warehouseId}` — makes the one-balance-per-product-per-warehouse invariant structural. |
| `productStockSummaries/{id}` | `{productId}` |
| `productSkuIndex/{id}` | normalised SKU (uppercased, trimmed, internal whitespace collapsed) |
| `handleReservations/{id}` | normalised handle |
| `commandReceipts/{id}` | client-generated `operationId` (UUID v4) |
| `connectedPurchaseOrders/{poId}` and both org projections | the **same** `poId`, so the three documents can be reconciled by id in a test |

---

# 6. Canonical document ownership

| Data | Canonical location | Derived / projected copies | Written by |
|---|---|---|---|
| Organization identity | `organizations/{orgId}` | `organizationDirectory/{handle}` (public subset), `users/{uid}/memberships/{orgId}` (name + monogram) | `org.create` |
| Handle uniqueness | `handleReservations/{handle}` | `organizationDirectory/{handle}` | `org.create` |
| Membership | `organizations/{orgId}/members/{uid}` | `users/{uid}/memberships/{orgId}` | team commands |
| Product | `organizations/{orgId}/products/{productId}` | `productSkuIndex/{skuNorm}` (uniqueness), `partnerCatalog` item (partner subset), `storefrontCatalog` item (public subset, C) | `product.*`, `partnerCatalog.*` |
| Stock truth | `stockMovements` (the ledger) | `stockBalances` (per warehouse), `productStockSummaries` (per product, incl. `stockValueMinor`) | stock commands only |
| Private PO | `organizations/{buyerOrgId}/purchaseOrders/{poId}` | — | client (DRAFT) + `po.*` commands |
| Connected PO | `connectedPurchaseOrders/{poId}` | `organizations/{buyerOrgId}/purchaseOrders/{poId}` and `organizations/{supplierOrgId}/purchaseOrders/{poId}` | `cpo.*` commands |
| Connection | `connections/{connectionId}` | `organizations/{orgId}/connections/{connectionId}` for both parties | `connection.*` commands |
| Mapping | `organizations/{buyerOrgId}/productMappings/{mappingId}` | — | `mapping.*` commands |

**Rule:** a projection is only ever written inside the same transaction that writes its canonical document. There are no synchronisation jobs, no triggers and no reconciliation scripts. If the transaction commits, the projections are correct; if it aborts, nothing changed.

---

# 7. Public / private / shared zones

| Zone | Contents | Read access | Write access |
|---|---|---|---|
| **Public** | `organizationDirectory` (get only), `storefrontCatalog` (C) | anyone, unauthenticated | backend only |
| **User-private** | `users/{uid}` and subcollections | that user | that user (whitelisted fields) + backend |
| **Tenant-private** | `organizations/{orgId}/**` | ACTIVE members of that org, further role-gated for invitations and audit logs | backend, plus the narrow client-writable list in §9.3 |
| **Cross-tenant canonical** | `connections`, `connectedPurchaseOrders`, `handleReservations` | **nobody via the client** | backend only |
| **Cross-tenant projected** | `organizations/{orgId}/connections`, connected POs projected into each org's `purchaseOrders` | ACTIVE members of the receiving org, exactly like any other tenant data | backend only |
| **Partner-shared, on demand** | `organizations/{supplierOrgId}/partnerCatalog` | the supplier's own members via rules; connected buyers **only through the `partnerCatalog.list` / `partnerCatalog.lookupBySku` callables** | backend |

**Why the partner catalog is callable-only for buyers.** A rule on `organizations/{supplierOrgId}/partnerCatalog/**` cannot determine which of the caller's organizations is the buyer, because a user may be a member of several. Resolving that would need a `get()` per candidate org — unbounded, and forbidden by VF-03 for list queries. The catalog is read infrequently (browse and one exact SKU lookup during mapping), needs no realtime, and the SKU lookup already has to be server-validated (FR-NET-015). Making it callable-only costs one function and removes an entire vulnerability class.

---

# 8. Required indexes

All of these live in `firestore.indexes.json` and are deployed before the app. Single-field indexes that Firestore creates automatically are not listed.

| # | Collection | Fields | Serves |
|---|---|---|---|
| IDX-01 | `products` | `status ASC, name ASC` | default product list |
| IDX-02 | `products` | `status ASC, categoryId ASC, name ASC` | category filter |
| IDX-03 | `products` | `status ASC, updatedAt DESC` | "recently updated" sort |
| IDX-04 | `productStockSummaries` | `stockStatus ASC, onHandMilli ASC` | low-stock list + low-stock `count()` |
| IDX-05 | `stockMovements` | `productId ASC, createdAt DESC` | product movement history |
| IDX-06 | `stockMovements` | `warehouseId ASC, createdAt DESC` | warehouse movement history |
| IDX-07 | `stockMovements` | `createdAt DESC` | org-wide recent activity |
| IDX-08 | `stockBalances` | `warehouseId ASC, onHandMilli DESC` | warehouse archive check + inventory-by-location |
| IDX-09 | `stockBalances` | `productId ASC, onHandMilli DESC` | product detail per-warehouse table |
| IDX-10 | `privatePartners` | `partnerTypes ARRAY, status ASC, name ASC` | supplier / buyer tabs |
| IDX-11 | `purchaseOrders` | `status ASC, createdAt DESC` | PO list + open-PO `count()` |
| IDX-12 | `purchaseOrders` | `supplierKind ASC, status ASC, createdAt DESC` | private vs connected tabs |
| IDX-13 | `purchaseOrders` | `status ASC, expectedDate ASC` | awaiting-receipt panel |
| IDX-14 | `connections` (projection) | `status ASC, updatedAt DESC` | connections list |
| IDX-15 | `productMappings` | `status ASC, buyerProductId ASC` | mappings list + product-detail mappings |
| IDX-16 | `partnerCatalog` | `published ASC, partnerSkuNormalized ASC` | supplier catalog table + buyer SKU lookup |
| IDX-17 | `notifications` | `read ASC, createdAt DESC` | notification list + unread count |
| IDX-18 | `auditLogs` | `entityType ASC, entityId ASC, createdAt DESC` | product/PO activity tab |
| IDX-19 | `auditLogs` | `createdAt DESC` | org audit stream |

**Aggregation-backed KPIs** (VF-07) reuse IDX-01, IDX-04, IDX-11 and a single-field index on `productStockSummaries.stockValueMinor`. No dedicated aggregation index is needed.

**No collection-group indexes are required**, because TECH-046 replaced the `collectionGroup('members')` query with the `users/{uid}/memberships` mirror.

---

# 9. Security Rules strategy

## 9.1 Shape

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ---- helpers (§9.2) ----

    // ---- public zone ----
    match /organizationDirectory/{handle} {
      allow get: if true;
      allow list: if false;                 // no enumeration of all businesses
      allow write: if false;                // backend only
    }

    // ---- user zone ----
    match /users/{uid} { ... }
    match /users/{uid}/memberships/{orgId} { allow read: if isSelf(uid); allow write: if false; }
    match /users/{uid}/notifications/{id}  { allow read: if isSelf(uid);
                                             allow update: if isSelf(uid) && onlyChanged(['read']);
                                             allow create, delete: if false; }

    // ---- tenant zone ----
    match /organizations/{orgId} {
      allow get, list: if isActiveMember(orgId);
      allow write: if false;

      match /settings/main            { allow read: if isActiveMember(orgId); allow write: if false; }
      match /counters/{c}             { allow read, write: if false; }
      match /commandReceipts/{op}     { allow read, write: if false; }
      match /productSkuIndex/{sku}    { allow read, write: if false; }

      match /members/{memberUid}      { allow read: if isActiveMember(orgId); allow write: if false; }
      match /invitations/{id}         { allow read: if hasRole(orgId, ['OWNER','ADMIN']); allow write: if false; }
      match /auditLogs/{id}           { allow read: if hasRole(orgId, ['OWNER','ADMIN']);
                                        allow create, update, delete: if false; }

      match /products/{id}            { allow read: if isActiveMember(orgId); allow write: if false; }
      match /stockBalances/{id}       { allow read: if isActiveMember(orgId); allow write: if false; }
      match /productStockSummaries/{id}{ allow read: if isActiveMember(orgId); allow write: if false; }
      match /stockMovements/{id}      { allow read: if isActiveMember(orgId); allow write: if false; }

      match /categories/{id}          { allow read: if isActiveMember(orgId);
                                        allow create, update: if hasRole(orgId, INVENTORY_WRITERS) && validCategory(); }
      match /warehouses/{id}          { allow read: if isActiveMember(orgId);
                                        allow create, update: if hasRole(orgId, INVENTORY_WRITERS)
                                                              && validWarehouse()
                                                              && statusNotChangedToArchived(); }
      match /privatePartners/{id}     { allow read: if isActiveMember(orgId);
                                        allow create, update: if hasRole(orgId, PARTNER_WRITERS) && validPartner(); }

      match /purchaseOrders/{poId} {
        allow read: if isActiveMember(orgId);
        allow create: if hasRole(orgId, PO_WRITERS) && isNewPrivateDraft();
        allow update: if hasRole(orgId, PO_WRITERS) && isEditableDraft() && draftFieldsOnly();
        allow delete: if false;
        match /items/{itemId} {
          allow read: if isActiveMember(orgId);
          allow write: if hasRole(orgId, PO_WRITERS) && parentIsEditableDraft();
        }
        match /history/{h} { allow read: if isActiveMember(orgId); allow write: if false; }
      }

      match /partnerCatalog/{id}      { allow read: if isActiveMember(orgId);   // own org only
                                        allow write: if false; }
      match /productMappings/{id}     { allow read: if isActiveMember(orgId); allow write: if false; }
      match /connections/{id}         { allow read: if isActiveMember(orgId); allow write: if false; }
    }

    // ---- cross-tenant canonical: fully closed ----
    match /connections/{id}                 { allow read, write: if false; }
    match /connectedPurchaseOrders/{id}     { allow read, write: if false; }
    match /connectedPurchaseOrders/{id}/{rest=**} { allow read, write: if false; }
    match /handleReservations/{h}           { allow read, write: if false; }

    // ---- storefront (Release C only) ----
    match /storefrontCatalog/{handle}/items/{id} { allow get, list: if true; allow write: if false; }

    // ---- catch-all ----
    match /{document=**} { allow read, write: if false; }
  }
}
```

## 9.2 Helper functions

```text
function isSignedIn()        { return request.auth != null; }
function isSelf(uid)         { return isSignedIn() && request.auth.uid == uid; }

function memberDoc(orgId)    { return get(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid)); }
function isActiveMember(orgId){ return isSignedIn()
                                 && exists(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid))
                                 && memberDoc(orgId).data.status == 'ACTIVE'; }
function role(orgId)         { return memberDoc(orgId).data.role; }
function hasRole(orgId, roles){ return isActiveMember(orgId) && role(orgId) in roles; }

function onlyChanged(fields) { return request.resource.data.diff(resource.data).affectedKeys().hasOnly(fields); }
function unchanged(field)    { return request.resource.data[field] == resource.data[field]; }
```

**Critical property.** Every `get()` above uses the path `organizations/{orgId}/members/{request.auth.uid}`, where `orgId` comes from the **matched path**, not from document data. It is therefore identical for every document in a list query and is cached, consuming one access call regardless of page size (VF-03). **No rule in Stockmok may ever `get()` a path derived from `resource.data`.** That single prohibition is what keeps the rules within limits and is the reason cross-tenant collections are closed.

**Role constants** (duplicated from `packages/shared/permissions.ts` by necessity — Rules cannot import TypeScript):

```text
INVENTORY_WRITERS = ['OWNER','ADMIN','INVENTORY_MANAGER']
PARTNER_WRITERS   = ['OWNER','ADMIN','PROCUREMENT_MANAGER']
PO_WRITERS        = ['OWNER','ADMIN','PROCUREMENT_MANAGER']
```

A rules test asserts these lists match the shared table for every role (T-SEC-17).

## 9.3 The complete client-writable set

There are exactly six client-writable surfaces. Anything not on this list is backend-only, and the catch-all denies anything unlisted.

1. `users/{uid}` — own profile, fields `displayName`, `photoUrl`, `lastSeenAt`.
2. `users/{uid}/notifications/{id}` — the `read` boolean only.
3. `organizations/{orgId}/categories/**` — create/update by inventory writers.
4. `organizations/{orgId}/warehouses/**` — create/update by inventory writers; **status may not be changed to `ARCHIVED`** (that is `warehouse.archive`).
5. `organizations/{orgId}/privatePartners/**` — create/update by partner writers, including `status` toggling (deactivation has no side effects).
6. `organizations/{orgId}/purchaseOrders/{poId}` (+ `items`) — create/update **only** while `supplierKind == 'PRIVATE'` and `status == 'DRAFT'`, by PO writers, and only the draft-editable field set. Every transition out of DRAFT is a command that re-validates the whole document server-side.

**Deletes are denied everywhere, without exception.** BR-013 (archive, never destroy) is therefore enforced by rules, not by convention.

---

# 10. Rules-testing strategy

`tests/rules/` uses `@firebase/rules-unit-testing` with `initializeTestEnvironment`, seeding fixture data with `withSecurityRulesDisabled`.

Fixtures: two organizations (`org-grand-ocean`, `org-fresh-foods`), one ACTIVE connection between them, and six users — Owner, Admin, Inventory Manager, Procurement Manager, Storekeeper and a suspended member — plus one authenticated non-member and one unauthenticated context.

Assertion groups (≈45 assertions, all P0):

1. Unauthenticated reads of every private collection → denied.
2. Non-member reads of every tenant collection → denied.
3. Cross-tenant read and write for products, balances, movements, members, audit, POs → denied.
4. Direct writes to `stockBalances`, `stockMovements`, `productStockSummaries`, `products`, `members`, `auditLogs`, `commandReceipts`, `counters`, `productSkuIndex` → denied for every role including Owner.
5. Audit log `update` and `delete` by Owner → denied.
6. Suspended member → denied everywhere.
7. Role matrix: for each of the six client-writable surfaces, allowed roles succeed and every other role fails.
8. Warehouse update that sets `status: 'ARCHIVED'` → denied.
9. PO update when `status != 'DRAFT'` → denied; PO update when `supplierKind == 'CONNECTED'` → denied.
10. `organizationDirectory` `get` → allowed unauthenticated; `list` → denied.
11. Every cross-tenant canonical collection → denied for all six roles in both orgs.
12. An invented path (`/somethingElse/x`) → denied.
13. Notification update touching any field other than `read` → denied.

---

# 11. Backend command catalog

Thirty-two commands. Each is one `onCall` export produced by `defineCommand()` (TECH-029). `RELEASE` marks when it is built.

| # | Command | Roles | Release | Idempotent | Transaction | Audit |
|---|---|---|---|---|---|---|
| C-01 | `org.create` | any authenticated user with no membership constraint | A | yes | yes | yes |
| C-02 | `org.updateSettings` | OWNER, ADMIN | A | no | no | yes (security-relevant fields) |
| C-03 | `user.bootstrapProfile` *(optional; client `setDoc` covers this — implemented only if a server-side field is needed)* | self | A | yes | no | no |
| C-04 | `team.createInvitation` | OWNER, ADMIN | A | yes | yes | yes |
| C-05 | `team.revokeInvitation` | OWNER, ADMIN | A | no | no | yes |
| C-06 | `team.acceptInvitation` | authenticated invitee | A | yes | yes | yes |
| C-07 | `team.changeMemberRole` | OWNER, ADMIN | A | no | yes | yes |
| C-08 | `team.setMemberStatus` | OWNER, ADMIN | A | no | yes | yes |
| C-09 | `product.create` | INVENTORY_WRITERS | A | yes | yes | yes |
| C-10 | `product.update` | INVENTORY_WRITERS | A | no | yes | yes |
| C-11 | `product.setStatus` (archive / restore) | INVENTORY_WRITERS | A | no | yes | yes |
| C-12 | `warehouse.archive` | INVENTORY_WRITERS | A | no | yes | yes |
| C-13 | `stock.recordOpeningBalance` | INVENTORY_WRITERS | A | **yes** | yes | yes |
| C-14 | `stock.adjust` | INVENTORY_WRITERS | A | **yes** | yes | yes |
| C-15 | `po.order` (DRAFT → ORDERED) | PO_WRITERS | A | yes | yes | yes |
| C-16 | `po.cancel` | PO_WRITERS | A | no | yes | yes |
| C-17 | `po.receive` (private, partial or full) | RECEIVERS | A | **yes** | yes | yes |
| C-18 | `connection.request` | PARTNER_WRITERS | B | yes | yes | yes |
| C-19 | `connection.respond` (accept / reject) | PARTNER_WRITERS | B | yes | yes | yes |
| C-20 | `connection.disable` | OWNER, ADMIN | B | no | yes | yes |
| C-21 | `partnerCatalog.publish` | PARTNER_WRITERS | B | no | yes | yes |
| C-22 | `partnerCatalog.unpublish` | PARTNER_WRITERS | B | no | yes | yes |
| C-23 | `partnerCatalog.list` *(read)* | PARTNER_WRITERS of a connected buyer org | B | n/a | no | no |
| C-24 | `partnerCatalog.lookupBySku` *(read)* | PARTNER_WRITERS of a connected buyer org | B | n/a | no | no |
| C-25 | `mapping.create` | PARTNER_WRITERS | B | yes | yes | yes |
| C-26 | `mapping.disable` | PARTNER_WRITERS | B | no | yes | yes |
| C-27 | `cpo.submit` (DRAFT → SUBMITTED) | PO_WRITERS (buyer) | B | **yes** | yes | yes |
| C-28 | `cpo.respond` (ACCEPT / REJECT) | PO_WRITERS (supplier) | B | **yes** | yes | yes |
| C-29 | `cpo.ship` | PO_WRITERS (supplier) | B | **yes** | yes | yes |
| C-30 | `cpo.receive` (partial or full) | RECEIVERS (buyer) | B | **yes** | yes | yes |
| C-31 | `cpo.cancel` (DRAFT / SUBMITTED only) | PO_WRITERS (buyer) | B | no | yes | yes |
| C-32 | `storefront.publish` / `unpublish` | OWNER, ADMIN | C | no | yes | yes |

`RECEIVERS = ['OWNER','ADMIN','INVENTORY_MANAGER','PROCUREMENT_MANAGER','STOREKEEPER']`.

Commands marked idempotent **require** an `operationId` in the payload; the client generates it once when the form is opened, not when submit is pressed, so a double-click and a retry after a network error both reuse the same id.

This catalog corrects `09` v2, which omitted `warehouse.archive`, `po.order`, `po.cancel`, `product.create/update`, `connection.disable`, `mapping.disable`, `partnerCatalog.*`, `cpo.cancel` and `org.updateSettings`.

---

# 12. Functions grouping and file layout

```text
functions/src/
  index.ts                 // re-exports every command; nothing else
  core/
    defineCommand.ts       // auth → validate → membership → role → txn → idempotency → audit
    idempotency.ts
    audit.ts
    notify.ts
    errors.ts
    firestore.ts           // admin app init, typed collection refs
  commands/
    org.ts  team.ts  product.ts  warehouse.ts  stock.ts
    po.ts   connection.ts  partnerCatalog.ts  mapping.ts  cpo.ts
```

`index.ts` exports each command individually (`export const stockAdjust = ...`) so Firebase deploys them as separate functions. Grouping several commands behind one function is rejected: individual functions give per-command logs, per-command metrics and independent redeploys.

**Deployment name convention:** `dot.case` in the catalog maps to `camelCase` exports (`stock.adjust` → `stockAdjust`), and the client calls it through a typed wrapper so the string appears exactly once in the codebase.

---

# 13. Callable vs HTTP

**All 32 endpoints are callable (`onCall`).** Zero HTTP endpoints. Rationale in TECH-030. Two consequences worth recording:

- Callables are **not** automatically retried by the platform, so every retry is user- or client-initiated and always carries the same `operationId`. This makes the idempotency story simple and complete.
- Callables surface `HttpsError.code` and `details` to the client SDK, which is what makes the typed error model in TECH-033 work end to end.

---

# 14. Transaction boundaries

Each row is one atomic unit. If any write fails, none is applied.

| Command | Reads inside the transaction | Writes inside the transaction |
|---|---|---|
| `org.create` | `handleReservations/{handle}` (must not exist) | `handleReservations`, `organizations/{orgId}`, `organizationDirectory/{handle}`, `settings/main`, `members/{uid}` (OWNER), `users/{uid}/memberships/{orgId}`, first `warehouses/{id}`, `auditLogs` |
| `team.acceptInvitation` | invitation, existing membership | invitation → ACCEPTED, `members/{uid}`, `users/{uid}/memberships/{orgId}`, `auditLogs`, receipt |
| `team.changeMemberRole` / `setMemberStatus` | target membership, organization (to protect the canonical Owner) | membership, `users/{uid}/memberships/{orgId}`, `auditLogs`, notification |
| `product.create` | `productSkuIndex/{skuNorm}` (must not exist) | product, sku index, `productStockSummaries/{productId}` (zeroed), `auditLogs`, receipt |
| `product.update` | product, old + new sku index docs, summary | product, sku index delete+create if the SKU changed, summary `stockValueMinor` recomputed if the cost changed, `auditLogs` |
| `product.setStatus` | product | product, summary `stockStatus`, `auditLogs` |
| `warehouse.archive` | **query** `stockBalances where warehouseId == W and onHandMilli > 0 limit 1`; **query** `purchaseOrders where status in [ORDERED, PARTIALLY_RECEIVED, ACCEPTED, SHIPPED] and receivingWarehouseId == W limit 1` | warehouse → ARCHIVED, `auditLogs` |
| `stock.recordOpeningBalance` | receipt, product, warehouse, balance, summary | movement (OPENING_BALANCE), balance, summary (+`stockValueMinor`), `auditLogs`, receipt |
| `stock.adjust` | receipt, product, warehouse, balance, summary | movement (ADJUSTMENT_IN/OUT), balance, summary, `auditLogs`, receipt, low-stock notifications if the status changed |
| `po.order` | receipt, PO, all PO items, supplier, every referenced product, `counters/purchaseOrder` | counter increment, PO (status ORDERED, `orderNumber`, snapshots frozen), items, history, `auditLogs`, receipt |
| `po.receive` | receipt, PO, the affected items, warehouse, balances, summaries | one movement per line, balances, summaries, item `receivedMilli`, PO status, history, `auditLogs`, receipt, notifications |
| `connection.request` | `connections/{buyer__supplier}` (must not exist or be REJECTED/DISABLED), both directory entries | canonical connection, both org projections, `auditLogs` ×2, notification to the supplier's owners/admins, receipt |
| `connection.respond` | canonical connection | canonical connection, both projections, `auditLogs` ×2, notification, receipt |
| `mapping.create` | receipt, connection (must be ACTIVE), buyer product (must be ACTIVE), supplier catalog item (must be published), existing mapping for the pair | mapping (VERIFIED), `auditLogs`, receipt |
| `cpo.submit` | receipt, buyer PO draft + items, connection, every mapping, every supplier catalog item, `counters/purchaseOrder` | canonical connected PO + items (snapshots frozen), **both** org projections, history, `auditLogs` ×2, notification to the supplier, receipt |
| `cpo.respond` | receipt, canonical PO, connection | canonical PO, both projections, history, `auditLogs` ×2, notification, receipt |
| `cpo.ship` | receipt, canonical PO, supplier balances and summaries for every line | supplier movements (CONNECTED_DISPATCH_OUT), supplier balances, supplier summaries, canonical PO → SHIPPED, both projections, history, `auditLogs`, notification, receipt |
| `cpo.receive` | receipt, canonical PO, buyer balances and summaries, warehouse | buyer movements (PURCHASE_RECEIPT), buyer balances, buyer summaries, canonical PO received quantities + status, both projections, history, `auditLogs`, notification, receipt |

**Rules obeyed in every transaction**

- All reads precede all writes (a Firestore requirement).
- Every in-transaction query carries `.limit()`.
- Largest transaction (`cpo.ship` with 5 lines) writes ~18 documents — far under the 500 limit.
- The receipt is read **first** and written **last**.

---

# 15. Idempotency strategy

```ts
// functions/src/core/idempotency.ts (illustrative)
const receiptRef = db.doc(`organizations/${orgId}/commandReceipts/${operationId}`);

await db.runTransaction(async (txn) => {
  const receipt = await txn.get(receiptRef);              // FIRST read
  if (receipt.exists) {
    const prior = receipt.data()!;
    if (prior.payloadHash !== payloadHash) {
      throw new HttpsError('failed-precondition', 'Replayed with different payload',
                           { reason: 'OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD' });
    }
    replayed = prior.result;                              // no side effects
    return;
  }
  // ... command body ...
  txn.create(receiptRef, { commandType, actorUid, payloadHash, result, createdAt: FieldValue.serverTimestamp() });
});
```

- `operationId` is a UUID v4 generated by the client **when the form opens**, so a double-click, a retry after a timeout and a page refresh that resubmits all carry the same id.
- `payloadHash` is a SHA-256 of the canonicalised payload with `operationId` removed. It closes the "same id, different data" hole that a naive implementation leaves open.
- The receipt is org-scoped, so one tenant can neither observe nor squat on another tenant's operation ids.
- Receipts are never deleted during the coursework; a TTL policy is the documented future path.

---

# 16. Audit generation strategy

`writeAudit(txn, { orgId, actorUid, action, entityType, entityId, operationId, summary, metadata })` is called inside the transaction by every command that the requirements mark as auditable (FR-AUD-002, FR-AUD-003).

- `createdAt` is always `FieldValue.serverTimestamp()`.
- `summary` is a short human sentence for the Activity tab ("Adjusted Chicken Breast by +2 KG in Cold Room").
- `metadata` carries only safe scalars — never a full document, never another tenant's data.
- Rules deny client `create`, `update` and `delete` on `auditLogs` (§9.1), so immutability is structural.
- Ordinary product field edits rely on `updatedBy`/`updatedAt` rather than an audit row (RC-15), except archive/restore and cost changes, which are audited.
- Cross-tenant actions write **two** audit rows, one in each organization, each describing only what that organization is entitled to know.

---

# 17. Notification generation strategy

`notify(txn, { recipients, orgId, type, title, message, referenceType, referenceId })` writes one document per recipient into `users/{uid}/notifications/{id}` inside the same transaction.

| Trigger | Recipients | Release |
|---|---|---|
| Product crosses into LOW_STOCK or OUT_OF_STOCK during a stock command | Owner, Admin, Inventory Manager of that org | A |
| Membership role or status changed | the affected member | A |
| Private PO fully received | the PO creator | A |
| Connection request received | Owner + Admin of the supplier org | B |
| Connection accepted or rejected | the requesting user | B |
| Connected PO submitted / accepted / rejected / shipped / received | Owner, Admin and Procurement Managers of the counterparty org | B |

**Bounds.** The recipient list is resolved with a `limit(50)` query on `members` filtered by role. If an organization somehow exceeds 50 matching members, the notification is skipped and a warning is logged rather than blowing the transaction budget. Notification writes are best-effort *within* the transaction: they are part of the atomic unit, so a notification failure would abort the command — which is why the recipient query is bounded and executed before any write.

**Low-stock detection** compares the `stockStatus` computed *before* the command with the one computed *after*, inside the same transaction. A notification is emitted only on a transition, never on every write, so receiving 10 partial shipments of a low product produces one notification, not ten.

---

# 18. Handle reservation

Handles are global, unique and immutable in Releases A and B (BR-017).

**Normalisation.** Lowercase; trim; convert internal whitespace and `_` to `-`; collapse repeated `-`; strip leading/trailing `-`; permitted characters `[a-z0-9-]`; length 3–30.

**Reserved handles (rejected at validation time).** `app`, `api`, `admin`, `auth`, `b`, `store`, `storefront`, `invite`, `login`, `signup`, `signin`, `logout`, `settings`, `support`, `help`, `docs`, `status`, `www`, `mail`, `static`, `assets`, `public`, `new`, `select-workspace`, `onboarding`, `stockmok`, `firebase`. This list exists because `/b/:handle`, `/app/:handle` and `/store/:handle` are real routes; without it a business could reserve `app` and break routing. `05` v2 did not define this.

**Atomic reservation.** Inside `org.create`'s transaction: `txn.create(handleReservations/{handle})` — Firestore's `create` fails if the document already exists, so two concurrent requests for the same handle produce exactly one winner and one `already-exists` error, with no partially-created organization. The directory entry and the organization are written in the same transaction, so a dangling reservation is impossible.

**Client-side availability check** is a `get` on `organizationDirectory/{handle}` and is advisory only; the transaction is the authority (test T-ORG-02).

---

# 19. OrganizationDirectoryEntry creation

Written only by `org.create`, in the same transaction as the organization.

```text
organizationDirectory/{handle} = {
  organizationId, handle, name, monogram, monogramColor,
  logoUrl: null, industry, country, directoryStatus: 'LISTED', createdAt
}
```

No other field is ever added. A rules test asserts that the document contains exactly this key set (T-SEC-16), so a future careless write cannot leak a private field into a publicly readable document. `directoryStatus` supports `LISTED` / `UNLISTED`; unlisted entries still resolve by exact handle for branded login but are excluded from any future discovery surface.

---

# 20. Invitation acceptance

1. **Create** — `team.createInvitation` generates a 32-byte random token, stores only `tokenHash` (SHA-256) plus `emailNormalized`, `role`, `expiresAt` (now + 7 days) and `status: 'PENDING'`, and **returns the raw token exactly once** in the callable response. The UI shows a copyable `/invite/<token>` link. The raw token is never persisted and never logged.
2. **Open** — `/invite/:token` is a public route showing the organization name and the offered role (resolved via a lookup that reveals nothing beyond public directory data), then prompts sign-in or sign-up.
3. **Accept** — `team.acceptInvitation({ token, operationId })` runs a transaction that verifies: the hash matches a PENDING invitation, it has not expired, and `request.auth.token.email` (normalised) equals `emailNormalized`. On success it flips the invitation to ACCEPTED, creates the membership as ACTIVE, writes the `users/{uid}/memberships/{orgId}` mirror, writes audit, and writes the receipt.
4. **Idempotent** — accepting twice returns the same result. If the user is already an ACTIVE member of that organization, the command succeeds without creating a duplicate.
5. **Failure modes, all tested** — wrong email → `permission-denied / INVITE_EMAIL_MISMATCH`; expired → `failed-precondition / INVITE_EXPIRED`; already used or revoked → `failed-precondition / INVITE_NOT_PENDING`; unknown token → `not-found`.
6. **Token in the URL** is an accepted, documented trade-off: it is single-use, short-lived, email-bound and useless without an authenticated matching identity. The report should state this reasoning rather than ignore it.

---

# 21. Product stock operations

Every material stock change follows one shape:

```text
validate payload (Zod)
→ resolve org + ACTIVE membership + role
→ open transaction
  → read receipt (must not exist)
  → read product (ACTIVE), warehouse (ACTIVE), balance, summary
  → compute newBalanceMilli = currentMilli + signedQuantityMilli
  → if newBalanceMilli < 0 → failed-precondition / INSUFFICIENT_STOCK
  → create stockMovements/{auto}  (immutable, server timestamp, operationId, actorUid)
  → set stockBalances/{productId__warehouseId}.onHandMilli = newBalanceMilli
  → set productStockSummaries/{productId}
        onHandMilli      += signedQuantityMilli
        availableMilli    = onHandMilli            (reservedMilli is 0 in A/B/C)
        stockValueMinor   = round(onHandMilli × purchaseCostMinor / 1000)
        stockStatus       = derive(onHandMilli, minimumStockMilli)
  → write audit
  → write notification if stockStatus changed into LOW_STOCK or OUT_OF_STOCK
  → create receipt
→ commit
```

**Stock status derivation — precedence is explicit** (this was ambiguous in `02` v2, where FR-STOCK-009 and FR-STOCK-010 overlap):

```ts
function deriveStockStatus(onHandMilli: number, minimumStockMilli: number) {
  if (onHandMilli <= 0) return 'OUT_OF_STOCK';          // checked first
  if (minimumStockMilli > 0 && onHandMilli < minimumStockMilli) return 'LOW_STOCK';
  return 'IN_STOCK';
}
```

`minimumStockMilli === 0` means "not tracked" and can never produce LOW_STOCK. Exactly at the minimum is **not** low (strict `<`), matching test T-STOCK-12.

**Negative-stock rule** applies per `StockBalance` (product × warehouse), not to the product total, so stock cannot be driven negative in one warehouse and masked by another.

---

# 22. Private PO receiving

- Receipt quantities are entered in the product's **base unit** for private POs (there is no supplier order unit — the supplier is not a Stockmok tenant).
- `receiveMilli` per line must satisfy `0 < receiveMilli <= orderedMilli - receivedMilli`; otherwise `failed-precondition / OVER_RECEIPT`.
- One `PURCHASE_RECEIPT` movement per line per receipt event, with `sourceType: 'PRIVATE_PO'` and `sourceId: poId`, so the movement history explains every unit.
- PO status after the transaction: `RECEIVED` if every line is fully received, otherwise `PARTIALLY_RECEIVED`.
- A receiving warehouse is chosen per receipt event (not per PO), defaulting to `settings.defaultWarehouseId`. It is stored on the PO as `receivingWarehouseId` on the first receipt so `warehouse.archive` can detect the open dependency (FR-INV-011).
- Cancellation after any receipt is rejected (`INVALID_TRANSITION`).

---

# 23. Connection lifecycle

```text
(none) --request--> PENDING --accept--> ACTIVE --disable--> DISABLED
                        \--reject--> REJECTED
```

- Direction matters: `connections/{buyerOrgId}__{supplierOrgId}`. A reverse relationship is a separate document, so two businesses can be each other's supplier without ambiguity.
- `connection.request` uses `txn.create` on the deterministic id, so a duplicate active request is impossible by construction (FR-NET-006, test T-NET-04). A new request is permitted only if no document exists or the existing one is `REJECTED` or `DISABLED`, in which case the document is rewritten with a fresh `requestedAt` and full history retained in the audit trail.
- An organization may not connect to itself (`buyerOrgId === supplierOrgId` → `invalid-argument`).
- `DISABLED` blocks new mappings and new connected POs but leaves every historical mapping, PO and stock movement intact and readable (SC-17).
- Both org projections are written in the same transaction so each side's Connections list is always consistent with the canonical record.

---

# 24. Mapping validation

`mapping.create({ operationId, buyerOrgId, connectionId, buyerProductId, supplierCatalogItemId, supplierPartnerSkuTyped, supplierToBuyerBaseFactorMilli, semanticConfirmed })`.

Server re-validates, in this order, and refuses to trust any of it from the client:

1. Caller is an ACTIVE member of `buyerOrgId` with a PARTNER_WRITERS role.
2. `connections/{connectionId}` exists, `status === 'ACTIVE'`, and its `buyerOrgId` equals the caller's org.
3. The buyer product exists, belongs to the buyer org and is `ACTIVE`.
4. The supplier catalog item exists under `connections[...].supplierOrgId`, is `published`, and its `partnerSkuNormalized` equals the normalised typed SKU — **the typed SKU is only ever used as a lookup key, never as the stored link** (FR-NET-014, BR-008).
5. `semanticConfirmed === true` (BR-009). A valid SKU is not sufficient.
6. `supplierToBuyerBaseFactorMilli > 0`.
7. No existing `VERIFIED` mapping already links this buyer product to this supplier item.

On success the mapping is created directly as `VERIFIED` (RC-13) with a snapshot of the partner SKU, both units and the factor. The bilateral supplier-confirmation flow remains B-PLUS and is not a dependency.

---

# 25. Connected PO transitions

```text
DRAFT --submit--> SUBMITTED --accept--> ACCEPTED --ship--> SHIPPED
  |                   |  \--reject--> REJECTED                 |
  \--cancel-->CANCELLED  \--cancel--> CANCELLED                v
                                              PARTIALLY_RECEIVED <--> (more receipts)
                                                        \--> RECEIVED
```

- The buyer's DRAFT connected PO lives only in the buyer's tenant (`purchaseOrders` with `supplierKind: 'CONNECTED'`, `status: 'DRAFT'`) and is **not** visible to the supplier. The canonical `connectedPurchaseOrders/{poId}` document is created by `cpo.submit`, which is the moment the order becomes shared. This is why a draft cannot leak.
- `cpo.submit` freezes the snapshot: buyer product id/name/SKU/base unit, supplier catalog item id/name/partner SKU/order unit, the conversion factor, the supplier order quantity, the buyer-base-equivalent quantity, unit price and currency (FR-CPO-005, INV-09). Later edits to the product, the catalog item or the mapping never rewrite it (test T-CPO-14).
- `cpo.ship` writes **supplier** outbound movements only; the buyer's stock is untouched (INV-10, FR-CPO-009).
- `cpo.receive` writes **buyer** inbound movements only (INV-11). Receipt quantities are entered in the **supplier order unit** and converted: `buyerBaseMilli = roundHalfUp(receiveSupplierMilli × factorMilli / 1000)`. Outstanding is tracked in supplier order units to prevent conversion drift across partial receipts; any residual rounding difference of at most one milli-unit on the final receipt is absorbed into the last line and is covered by test T-INT-06.
- `PARTIALLY_SHIPPED` does not exist (BR-020). Cancellation after ACCEPTED does not exist (FR-CPO-004).
- Every transition writes a `history` row on the canonical document **and** on both projections, so both parties see the same timeline with correct actor attribution (FR-CPO-014).

---

# 26. Storefront (Release C) boundary

- Path `storefrontCatalog/{handle}/items/{itemId}`; public `get` and `list`; no write path of any kind.
- Written only by `storefront.publish` / `storefront.unpublish`, which copy an explicit allow-list of fields: display name, public SKU, description, selling price (minor) + currency, image URL or placeholder, category name, availability state.
- **Availability is a coarse state (`IN_STOCK` / `OUT_OF_STOCK`), never a quantity.** Publishing an exact on-hand number to an anonymous page would leak commercially sensitive data and is forbidden.
- Purchase cost, margin, suppliers, warehouses, minimum stock and movement history must never appear. Rules cannot hide fields within a document (VF: Firestore reads are whole-document), so the projection is a separate document — this is the reason for its existence, and the report should say so.
- **Release C is not built unless every P0 and every implemented P1 test is green by end of Day 11.** Default expectation: not built.

---

# 27. Local emulator workflow

Daily loop:

1. `npm run emu` (persisted data) in one terminal.
2. `npm run dev` in another; `.env.local` sets `VITE_USE_EMULATORS=true`; the amber ribbon confirms it.
3. Write code → `npm run test:unit -- --watch` for domain logic.
4. Before any commit: `npm run verify` = `tsc --noEmit && eslint . && vitest run && firebase emulators:exec "vitest run --project rules --project integration"`.
5. `npm run seed` whenever the dataset needs resetting.

The Auth emulator lets tests create users with arbitrary emails and verified states instantly, which is what makes the invitation and cross-tenant tests practical.

---

# 28. Production deployment

**Order matters.** Deploying the app before the rules and indexes it depends on produces a live site that fails in ways that look like application bugs.

```bash
npm ci
npm run build:shared
npm run verify                       # typecheck, lint, all tests
firebase deploy --only firestore:indexes    # 1. indexes first (may take minutes to build)
firebase deploy --only firestore:rules      # 2. rules
firebase deploy --only functions            # 3. backend
npm run build                               # 4. app bundle
firebase deploy --only hosting              # 5. frontend last
```

Post-deploy smoke checklist (Stage 18 / T-NFR-06..08):

- production URL loads with no console error;
- Google sign-in works (proves Authorized Domains is right);
- email/password sign-up works;
- create a throwaway organization, then a product, then an adjustment — proves Functions, Firestore, rules and indexes are all live together;
- a signed-out browser cannot read `organizations/**` (verified with a scripted client, recorded as evidence);
- the seeded demo dataset is present and the dashboard numbers match the expected table in `16`.

**Rollback:** `firebase hosting:rollback` restores the previous release instantly. Functions roll back by redeploying the previous tagged commit. Both are rehearsed once, on Day 12, not discovered on Day 16.

---

# 29. Billing and cost guardrails

| Control | Setting |
|---|---|
| GCP budget | $5, alerts at 50 / 90 / 100 %, emailed to the student |
| Function concurrency | `maxInstances: 10` on every function |
| Function memory/timeout | 256 MiB, 60 s |
| Query bounds | every list query has `.limit()`; page size 25, hard maximum 100 |
| Aggregation | `count()`/`sum()` instead of reading documents to count them |
| Public write surface | none — there is no unauthenticated write path anywhere |
| Rules `get()` discipline | one cached membership read per request (VF-04: denied reads are still billed) |
| Storage | not enabled |
| Expected monthly cost | effectively $0; Blaze no-cost tier covers 2 M invocations and 50 k Firestore reads/day, orders of magnitude above coursework usage. Only container storage for deployed functions may incur cents. |

A screenshot of the budget configuration goes into `docs/evidence/` as cost-awareness evidence for the report.

---

# 30. Security testing plan (Firebase-specific)

| Layer | Tool | What it proves |
|---|---|---|
| Rules | `@firebase/rules-unit-testing` against the Firestore emulator | tenant isolation, RBAC, immutability, deny-by-default, no enumeration — ~45 assertions (§10) |
| Commands | Vitest + Functions/Auth/Firestore emulators | unauthenticated rejection, wrong-role rejection, cross-tenant `orgId` forgery rejection, invalid-state rejection, replay safety, payload-hash mismatch rejection — 8 cases × 32 commands |
| Ledger | property tests over random valid command sequences | `sum(movements) == balance` and `sum(balances) == summary` after **every** command (T-INT-01..03) |
| Production | scripted signed-out client + manual console check | live rules match the tested rules |
| Repository | `gitleaks` in CI | no credential ever committed |

**The single most important test in the project** is T-INT-03: generate a few hundred random valid stock commands across products and warehouses, replay a random subset with identical operation ids, and assert after every step that the ledger, the balances and the summaries agree exactly. If that test is green, the core claim of the entire system is proven — and integer milli-units (TECH-043) are what make the equality exact rather than approximate.

---

# 31. Known limits, stated honestly

These belong in the report as engineering awareness, not as defects hidden from the marker.

1. **Per-product summary hotspot.** `productStockSummaries/{productId}` is written by every movement for that product. Firestore guidance (VF-08) warns about sustained single-document write rates. At coursework scale this is irrelevant; at commercial scale the fix is sharded counters or a periodic rollup. Documented, not implemented.
2. **Cross-tenant reads cost a function call.** Partner catalog browsing is not realtime. Accepted trade for a provably safe boundary.
3. **Role lists are duplicated between `firestore.rules` and TypeScript.** Rules cannot import code. Mitigated by a synchronisation test.
4. **No App Check.** A determined attacker with a stolen ID token could call callables directly. Every callable still enforces membership and role, so the blast radius is limited to what that user could already do in the UI. App Check is the documented next step.
5. **Audit records are written by the same trusted process that performs the action.** True tamper-evidence would need append-only external storage. Out of scope, stated.
6. **Single region.** No multi-region failover. Appropriate for coursework, noted as a production consideration.
7. **Cold starts.** First call after idle takes 1–3 s. Mitigated for the demo by a warm-up script, not by paying for `minInstances`.

---

# 32. Freeze statement

> This Firebase architecture is frozen. Implementation may choose field names and file names freely, but may not move a document between zones, add a client write path outside §9.3, add an HTTP endpoint, add a Firestore trigger, or perform a `get()` on a data-derived path in Security Rules. Any of those requires a scope-change entry in `01_FINAL_RECONCILIATION_REPORT.md`.
