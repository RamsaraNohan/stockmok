# Stockmok — Final Security & RBAC Model v3.0

**Status:** the security authority for implementation.
**Principle:** UI visibility is convenience. Security is enforced by Firebase Authentication, Firestore Security Rules and trusted backend authorization — and every one of those is tested.

**Material changes from v2** (recorded in `01` §6):

1. The RBAC matrix contains **no ambiguous cells**. Every capability × role is a hard yes or no.
2. Cross-tenant collections are **closed to clients entirely**; the "which of my organizations am I acting for?" problem is resolved rather than left implicit.
3. A hard prohibition is added: a Security Rule may never read a path derived from document data.
4. Warehouse archive moved to the backend-only list (its checks cannot be expressed in rules).
5. Product create and update moved to the backend-only list (SKU uniqueness cannot be enforced in rules).
6. `organizationDirectory` allows `get` but denies `list`, closing a business-enumeration hole.
7. Client deletes are denied on every collection without exception.

---

# 1. Security objectives

Stockmok must guarantee, and prove by test, that:

1. Changing a URL cannot grant access to another business.
2. Changing a role field cannot promote a user.
3. Organization A cannot read or write Organization B's private data.
4. A connected business sees only a deliberately constructed shared surface.
5. Stock cannot be changed by writing a balance document.
6. A retry cannot duplicate inventory.
7. A public page cannot leak a private field.
8. A backend function using the Admin SDK re-authorizes explicitly, because Security Rules do not apply to it.
9. Nothing can be deleted by a client.
10. An unknown collection path is denied by default.

---

# 2. Trust boundary

## Trusted, after verification

Firebase-authenticated UID from the callable context · the Membership document read from Firestore at request time · the role on that Membership · resource ownership as stored in the database · stable identifiers after validation · connection status read from the canonical document · server timestamps · values computed by the backend.

## Untrusted, always

The handle or organization id in a URL · a role dropdown · local or session storage · an email typed before authentication · a client-reported stock balance · a client-computed order total · a client "connection is active" flag · a typed partner SKU (a lookup key only, never a link) · a client claim about which organization it represents · a client-computed unit conversion · the client clock · any hidden form field.

**Operational form of this rule:** a backend command must be able to produce the correct outcome using only the authenticated UID and identifiers it has independently verified. If removing a field from the request payload would change an authorization decision, that field is being trusted and the design is wrong.

---

# 3. Authentication

Firebase Authentication is the sole credential authority.

Supported: email/password · Google (popup) · password reset · sign-out.

Never stored anywhere in Firestore: a plaintext password · a password hash · a shared or temporary employee password · a long-lived session token.

Email-enumeration protection stays enabled, so sign-in failures are deliberately generic. The UI shows one neutral message and must not reveal whether an account exists.

Sign-out clears the client query cache so no cached tenant data survives into the next session.

---

# 4. Authorization formula

Every private operation requires, conceptually:

```text
authenticated(uid)
AND membership(orgId, uid).status == ACTIVE
AND roleAllows(action)
AND resourceBelongsTo(orgId)
AND currentStateAllows(transition)
```

Role *selection* never substitutes for any part of this. The final clause matters as much as the others: a correctly authorized user performing a transition the state machine forbids must still be rejected.

---

# 5. Built-in RBAC matrix

Seven roles. Every cell is a hard boolean — v2 left several as "limited" or "view", which would have produced three different implementations from three different engineers.

| Capability | Owner | Admin | Inventory Mgr | Procurement Mgr | Storekeeper | Analyst | Viewer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| View dashboard | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| View products and stock | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| View stock movement history | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✘ |
| Create / update Product | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ |
| Archive / restore Product | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ |
| Manage Category | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ |
| Create / update Warehouse | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ |
| Archive Warehouse | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ |
| Record opening balance | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ |
| **Adjust stock** | ✔ | ✔ | ✔ | ✘ | **✘** | ✘ | ✘ |
| Receive goods | ✔ | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ |
| Manage private suppliers and buyers | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ |
| Create / edit draft PO | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ |
| Order / submit / cancel PO | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ |
| View purchase orders | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✘ |
| Request / respond to Connection | ✔ | ✔ | **✘** | ✔ | ✘ | ✘ | ✘ |
| Disable Connection | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ |
| View Connections | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ |
| Publish / unpublish Partner Catalog | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ |
| Read connected Partner Catalog | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ |
| Create / disable Mapping | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ |
| Accept / reject / ship connected PO | ✔ | ✔ | ✘ | ✔ | ✘ | ✘ | ✘ |
| View Stock-on-Hand report | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| View Purchase-Order report | ✔ | ✔ | ✔ | ✔ | ✘ | ✔ | ✘ |
| View audit log | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ |
| Invite / remove / suspend members | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ |
| Change ordinary member role | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ |
| **Modify the canonical Owner** | own settings only | **✘** | ✘ | ✘ | ✘ | ✘ | ✘ |
| Organization settings | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ |
| Publish to Storefront (C) | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ |

**Resolved ambiguities, with reasoning**

- **Storekeeper cannot adjust stock.** Receiving is a documented, referenced event; a free-form adjustment is not. Separating them is the standard segregation-of-duties control and is easy to explain in a viva.
- **Inventory Manager has no Network access.** Connections are commercial relationships; procurement owns them. Removing the vague "view" cell removes a whole set of ambiguous test cases.
- **Viewer** sees the dashboard, products, stock and the Stock-on-Hand report, and nothing else. Purchase orders and movement history are excluded, which is what makes Viewer meaningfully different from Analyst.
- **Analyst** sees everything read-only except audit logs and team management.

This matrix is encoded once as `ROLE_PERMISSIONS` in shared code, consumed by the UI and by every backend command, and mirrored by necessity in `firestore.rules` — with a test asserting the two agree.

**Permissions may never be broadened silently.** Widening a cell requires a scope-change entry.

---

# 6. Client versus backend boundary

## 6.1 Client + Security Rules — the complete list

Six surfaces. Nothing else is client-writable, and the catch-all rule denies anything unlisted.

| # | Surface | Permitted | Constraint |
|---|---|---|---|
| 1 | `users/{uid}` | create, update | self only; fields `displayName`, `photoUrl`, `lastSeenAt` |
| 2 | `users/{uid}/notifications/{id}` | update | the `read` flag only |
| 3 | `organizations/{orgId}/categories/**` | create, update | inventory writers; validated shape |
| 4 | `organizations/{orgId}/warehouses/**` | create, update | inventory writers; **status may not be set to ARCHIVED** |
| 5 | `organizations/{orgId}/privatePartners/**` | create, update | partner writers; deactivation permitted (no side effects) |
| 6 | `organizations/{orgId}/purchaseOrders/{poId}` and `items` | create, update | PO writers; **only while `supplierKind == 'PRIVATE'` and `status == 'DRAFT'`**; draft-editable fields only |

**Reads** are broader: any ACTIVE member may read their own organization's data, with invitations and audit logs additionally restricted to Owner and Admin.

**Deletes are denied on every collection, everywhere, without exception.**

## 6.2 Trusted backend command required

Organization creation and handle reservation · all invitation and membership changes · product create, update, archive and restore · **warehouse archive** · opening balance · stock adjustment · purchase-order ordering, cancellation and receiving · connection request, response and disable · partner catalog publish, unpublish, list and SKU lookup · mapping create and disable · every connected purchase-order transition · all audit creation · all notification creation · storefront publish (C).

**The one-sentence rule, which the report should quote:** *client-and-rules for low-consequence own-tenant data; trusted backend for anything that touches uniqueness, stock, money, access control, cross-tenant state or audit.*

## 6.3 Why product writes are backend-only

`internalSku` must be unique within the organization. A Security Rule cannot query a collection, so uniqueness cannot be enforced client-side. The backend creates a `productSkuIndex/{skuNormalized}` document with `create` inside the same transaction; Firestore's create precondition fails if the SKU already exists, which makes uniqueness race-free rather than best-effort. v2 listed product CRUD as client-writable while also requiring unique SKUs — those two statements could not both be satisfied.

## 6.4 Why warehouse archive is backend-only

FR-INV-010 and FR-INV-011 require proof that no non-zero balance and no open receiving workflow exist. Both are unbounded queries, which rules cannot express. The Admin SDK supports query reads inside a transaction, so the archive command performs both checks with `.limit(1)` **inside** the transaction, making the guard race-free.

---

# 7. The Admin SDK rule

> **The Firebase Admin SDK bypasses Firestore Security Rules completely. A Cloud Function is not protected by `firestore.rules`.**

Every backend command therefore must:

1. require authentication;
2. validate the payload with the shared schema;
3. read the Membership document;
4. enforce ACTIVE status;
5. enforce the role;
6. resolve and verify resource ownership;
7. validate the current state;
8. run inside a transaction where atomicity is required;
9. create idempotency and audit evidence;
10. return a minimal result.

Never trust `request.data.role`, `request.data.orgId` as a claim, `request.data.currentBalance`, or a client-computed total.

This is implemented **once**, in `defineCommand()`, so it cannot be forgotten in the twenty-seventh command written late on Day 11. That inversion — "the server is not protected by the rules; the rules protect the client path" — is the single most important security insight in the project and belongs in the report.

---

# 8. Billing prerequisite

Production Cloud Functions require the Firebase **Blaze** plan. Cloud Storage also requires Blaze, which is one reason Storage is not used at all.

**Decide on Day 1.** Recommended: enable Blaze, set a $5 budget alert, cap functions at `maxInstances: 10`. Expected spend is effectively zero within the Blaze no-cost tier.

**If Blaze is unavailable, do not replace backend commands with open client writes.** Follow the P0 contingency in `03` §8: keep a secure Release A with rules-constrained client transactions, and cut Release B. A smaller secure system beats a larger insecure one, and that judgement is itself worth marks.

---

# 9. Firestore Security Rules principles

## 9.1 Deny by default

The ruleset ends with `match /{document=**} { allow read, write: if false; }`, and a test asserts that an invented path is denied. No rule grants broad access to private data.

## 9.2 Structural tenant ownership

Every private document's path begins `organizations/{orgId}/`. This is not stylistic — it is what makes the next rule possible.

## 9.3 The path-constancy rule — the most important rule in the file

> **A Security Rule may only call `get()` or `exists()` on a path that is constant for the entire request. In practice this means `organizations/{orgId}/members/{request.auth.uid}`, where `orgId` comes from the matched path. A rule must never read a path derived from `resource.data`.**

Firestore permits at most ten document access calls per single-document or query request (twenty for multi-document reads, transactions and batched writes), and identical calls are cached. A rule that reads a fixed path consumes one cached call regardless of page size. A rule that reads a path varying per candidate document consumes one call per document and fails a page of twenty-five rows outright.

Every cross-tenant access-control question in Stockmok — "can this buyer read that supplier's catalog?", "is this user a party to that shared order?" — requires exactly the forbidden kind of read, because the answer depends on which of the caller's organizations they are acting for. **That is why zone 4 is closed to clients.** The rule is not a limitation worked around; it is the reason the architecture takes the shape it does.

## 9.4 Rules are not filters

A query is rejected unless the ruleset can permit its entire potential result set. Every list screen therefore queries within a single tenant path. No cross-tenant list query exists in Release A or B.

## 9.5 Helper functions

```text
isSignedIn()                     request.auth != null
isSelf(uid)                      isSignedIn() && request.auth.uid == uid
isActiveMember(orgId)            exists(members/uid) && members/uid.status == 'ACTIVE'
hasRole(orgId, roles)            isActiveMember(orgId) && members/uid.role in roles
onlyChanged(fields)              request.resource.data.diff(resource.data).affectedKeys().hasOnly(fields)
unchanged(field)                 request.resource.data[field] == resource.data[field]
```

## 9.6 `getAfter()`

Available for validating coordinated writes and used in the P0 contingency profile. **Not used in the recommended profile**, because the operations that would need it are backend commands.

---

# 10. Public directory boundary

Public-safe: organization id, handle, name, logo or monogram, industry, country, directory status.

Never public: members, inventory, costs, settings, suppliers, analytics, anything else.

Access: **`get` allowed to anyone; `list` denied.** Exact-handle lookup requires only `get`; permitting `list` would let any visitor enumerate every business on the platform. v2 did not state this and would likely have shipped a permissive rule.

Exposing `organizationId` publicly is an accepted, deliberate decision: the id is not a secret, membership is the gate, and branded login needs it.

Resolving a handle grants nothing. It is context, never authorization.

---

# 11. Partner catalog boundary

A connected buyer may read a supplier's partner catalog only when `connections/{buyerOrgId}__{supplierOrgId}.status == 'ACTIVE'` — verified **server-side**, inside the `partnerCatalog.list` and `partnerCatalog.lookupBySku` callables. There is no direct client read path.

The buyer never obtains the supplier's Products, StockBalances, ProductStockSummaries, StockMovements, AuditLogs, Members, PrivatePartners, Settings, Invitations or Counters. A dedicated test suite asserts denial on each of those collections for a connected buyer, not merely for an unrelated organization — a connected party is the more interesting attacker.

The published projection deliberately omits exact stock: availability is a coarse state.

---

# 12. Shared purchase-order boundary

A connected purchase order has one canonical record in zone 4, readable by no client, plus one projection inside each participating organization.

- Each party reads its own projection with the ordinary `isActiveMember(orgId)` rule — no special case, no data-derived read.
- A third organization has no projection and cannot read the canonical record, so it sees nothing.
- The shared record contains only fields both parties are entitled to see. Buyer-private context — internal notes, private cost, unrelated tenant data — is never copied into it.
- A buyer's connected **draft** exists only in the buyer's tenant and does not become shared until submission.

---

# 13. Storefront boundary — Release C

The public page reads `StorefrontCatalogItem` only. There is no write path.

Firestore reads whole documents, so a sensitive field cannot be hidden by a rule — which is precisely why the storefront projection is a separate document rather than a filtered view of the Product. Availability is coarse; an exact quantity is never published.

---

# 14. Audit security

Audit records are server-created, organization-private, immutable, and readable by Owner and Admin only. Rules deny `create`, `update` and `delete` to every client, including the Owner.

**Stated limitation:** the audit record is written by the same trusted process that performs the action, so this is tamper-*resistant*, not tamper-*evident*. True tamper evidence would require append-only external storage. Saying so in the report is stronger than implying a guarantee the system does not make.

---

# 15. Invitation security

The token is 32 random bytes, returned exactly once by the creating command and never persisted or logged; only its SHA-256 hash is stored. It is single-use, expires after 7 days, is bound to one organization and one normalised email, and is only redeemable by an authenticated identity whose email matches.

No shared or temporary password is ever created.

**Accepted trade-off, stated:** the token appears in a URL and therefore in browser history. It is single-use, short-lived, email-bound and useless without a matching authenticated identity. The report should give this reasoning rather than ignore the exposure.

---

# 16. Threat model

| Threat | Attack | Control |
|---|---|---|
| IDOR | change an organization or document id in a URL or payload | tenant-scoped paths + authoritative membership read in every command |
| Role escalation | select OWNER at login, or send `role: 'OWNER'` | authorization derived only from the Membership document |
| Cross-tenant read | query another organization's collection | rules restrict to path-scoped membership; catch-all denies the rest |
| Cross-tenant read by a *connected* party | a connected buyer reads supplier private data | partner catalog is a separate projection, exposed only through connection-verified callables |
| Balance tampering | write `onHandMilli` directly | balances are backend-write-only; a rules test proves the denial for every role |
| Ledger forgery | insert or edit a StockMovement | movements are backend-write-only and immutable |
| Replay | submit the same receipt twice | `operationId` receipt read inside the transaction |
| Replay with mutation | reuse an operation id with different data | payload hash comparison, explicit rejection |
| Race on uniqueness | two simultaneous identical SKUs or handles | `txn.create` on an index document; Firestore enforces it |
| Race on archive | add stock while a warehouse is being archived | bounded query inside the archive transaction |
| Invalid mapping | type a valid SKU for the wrong product | exact catalog lookup + matched card + explicit semantic confirmation |
| Stale authorization | connection disabled after the page loaded | the backend re-reads connection status at submit time |
| Suspended user | keeps an open tab | membership `onSnapshot` in the client, plus a server check on every command |
| Public leak | storefront or directory exposes a private field | separate projection documents with allow-listed fields, asserted by a key-set test |
| Directory enumeration | list every business | `list` denied on `organizationDirectory` |
| Fake total | alter a client-computed order total | totals recomputed server-side from snapshots |
| Audit tampering | delete or edit an audit record | create/update/delete denied to all clients |
| Open rules | an `allow true` slips in | emulator rules test suite + a catch-all denial test |
| Server bypass | a function assumes rules protect it | `defineCommand()` performs authorization for every command |
| Data destruction | delete a product with history | client deletes denied everywhere; archive only |
| Cost abuse | someone hammers a callable | authenticated-only, `maxInstances: 10`, bounded queries, budget alert |

---

# 17. Minimum security tests

Submission requires every one of these to be green. IDs match `08`.

| Test | Assertion |
|---|---|
| T-SEC-01 | unauthenticated read of any private collection → denied |
| T-SEC-02 | Org A reads Org B's Product → denied |
| T-SEC-03 | Org A writes Org B's Product → denied |
| T-SEC-04 | Org A writes Org B's StockBalance → denied |
| T-SEC-05 | forged Owner role in a payload → denied by the command |
| T-SEC-06 | Storekeeper opens Team by direct URL, and calls the team command → denied both times |
| T-SEC-07 | suspended member with a cached UI → denied by rules and by every command |
| T-SEC-08 | any client creates or edits an audit record → denied |
| T-SEC-09 | Owner deletes an audit record → denied |
| T-SEC-10 | connected buyer reads supplier Products, balances, movements, members, partners, settings → denied |
| T-SEC-11 | connected buyer reads the partner catalog → allowed only while the connection is ACTIVE |
| T-SEC-12 | a non-party organization reads a connected purchase order → denied at every path |
| T-SEC-13 | mapping creation on a disabled connection → denied |
| T-SEC-14 | a command called with a forged `orgId` → denied after the membership read |
| T-SEC-15 | replay of any Release B command → no duplicate effect |
| T-SEC-16 | public directory and storefront payloads contain exactly the allowed key set |
| T-SEC-17 | the role lists in `firestore.rules` match the shared permission table |
| T-SEC-18 | an unknown collection path → denied by the catch-all |
| T-SEC-19 | a client delete on every collection → denied |
| T-SEC-20 | `list` on `organizationDirectory` → denied; `get` → allowed |
| T-SEC-21 | a client sets warehouse `status: 'ARCHIVED'` → denied |
| T-SEC-22 | a client updates a purchase order that is not a private DRAFT → denied |
| T-SEC-23 | a notification update touching any field other than `read` → denied |

**No exceptions are permitted at the final security gate.** A failure here blocks submission, not because of a rule in this document, but because the coursework explicitly rewards an error-free system and penalises one that leaks.

---

# 18. Security acceptance statement

> A connected business receives access to a **purpose-built shared surface**, never to the other business's private tenant space. A backend command is the only thing that can move stock, and it re-authorizes every caller from the database on every call. A Security Rule never asks a question it cannot answer within Firestore's limits — which is why the cross-tenant surface is closed to clients entirely, and why that closure is a design decision rather than an omission.
