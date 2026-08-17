# StockFlow — Final Security & RBAC Model v2.0

**Status:** Security authority for coursework implementation  
**Principle:** UI visibility is convenience. Security is enforced by Firebase Auth, Firestore Security Rules and trusted backend authorization.

---

# 1. Security objectives

StockFlow must guarantee:

1. URL change cannot grant another business.
2. Role field cannot promote user.
3. Org A cannot read Org B private data.
4. Connected business sees only deliberate shared surfaces.
5. Stock cannot be changed by writing Balance.
6. Retry cannot duplicate inventory.
7. Public pages cannot leak private fields.
8. Admin SDK backend re-authorizes explicitly.

---

# 2. Trust boundary

## Trusted after verification
- Firebase authenticated UID/callable auth context;
- Membership from Firestore;
- role from Membership;
- resource ownership stored in database;
- stable IDs after validation;
- BusinessConnection status from DB;
- server timestamp;
- backend-computed results.

## Untrusted
- URL handle/orgId;
- role dropdown;
- local/session role;
- typed email before auth;
- client stock balance;
- client order total;
- client "connection active" flag;
- typed partner SKU;
- client supplier/buyer org claims;
- client conversion result;
- client clock;
- hidden browser fields.

---

# 3. Authentication

Firebase Authentication is sole credential authority.

Supported:
- email/password;
- Google;
- reset;
- logout.

Never stored in Firestore:
- plaintext password;
- password hash;
- long-lived temporary employee password.

---

# 4. Authorization formula

Every private operation conceptually requires:

```text
authenticated(uid)
AND
membership(orgId, uid).status == ACTIVE
AND
roleAllows(action)
AND
resourceBelongsTo(orgId)
```

Role selection never replaces this.

---

# 5. Built-in RBAC matrix

| Capability | Owner | Admin | Inv Mgr | Proc Mgr | Storekeeper | Analyst | Viewer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| View dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View products/stock | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create/update Product | ✓ | ✓ | ✓ | – | – | – | – |
| Archive Product | ✓ | ✓ | ✓ | – | – | – | – |
| Manage Category | ✓ | ✓ | ✓ | – | – | – | – |
| Manage Warehouse | ✓ | ✓ | ✓ | – | – | – | – |
| Stock adjustment | ✓ | ✓ | ✓ | – | limited/– | – | – |
| Receive goods | ✓ | ✓ | ✓ | ✓ | ✓ | – | – |
| Private supplier/buyer | ✓ | ✓ | – | ✓ | – | – | – |
| Create/submit PO | ✓ | ✓ | – | ✓ | – | – | – |
| Manage Connection | ✓ | ✓ | view | ✓ | – | – | – |
| Publish Partner Catalog | ✓ | ✓ | – | ✓ | – | – | – |
| Create Mapping | ✓ | ✓ | – | ✓ | – | – | – |
| View reports | ✓ | ✓ | ✓ | ✓ | limited | ✓ | limited |
| Manage ordinary Team | ✓ | ✓ | – | – | – | – | – |
| Change ordinary role | ✓ | ✓ | – | – | – | – | – |
| Modify canonical Owner | limited owner settings | **NO** | – | – | – | – | – |
| Org settings | ✓ | ✓ | – | – | – | – | – |

Do not broaden permissions silently.

---

# 6. Client vs backend boundary

## 6.1 Client + Security Rules allowed

With proper rules:
- own-tenant read;
- Product field CRUD;
- Category CRUD;
- Warehouse CRUD subject to safe constraints;
- stock/history read;
- private Partner CRUD;
- DRAFT PO edit;
- mark Notification read;
- own PartnerCatalog publish/unpublish if rules constrain;
- PartnerCatalog read from ACTIVE supplier connection.

## 6.2 Trusted backend command required in recommended profile

- create Organization + reserve handle + Owner;
- invitation/member role/status changes;
- Product archive when reference/audit check required;
- opening balance;
- adjustment;
- PO receiving;
- request/respond Connection;
- create/verify Mapping;
- submit connected PO if it changes shared visibility/notification;
- accept/reject connected PO;
- ship connected PO;
- receive connected PO;
- sensitive Audit creation;
- cross-business Notification generation.

---

# 7. Admin SDK rule

Server/Admin SDK bypasses Firestore Security Rules.

Every backend command MUST:
1. require auth;
2. read Membership;
3. enforce role;
4. resolve resource ownership;
5. validate current state;
6. validate payload;
7. transact where required;
8. create idempotency/audit evidence;
9. return minimal result.

Never trust `request.data.role`, `request.data.orgId`, `request.data.currentBalance` without authoritative checks.

---

# 8. Firebase billing prerequisite

Current Firebase production constraints:
- Cloud Functions deployment requires **Blaze**;
- Cloud Storage for Firebase requires Blaze.

Day 1 must decide.

Recommended:
- Blaze;
- budget alerts;
- small coursework traffic;
- avoid unnecessary services.

If Blaze unavailable:
- do not replace backend with open client writes;
- follow fallback in Scope/Readiness.

Official:
- https://firebase.google.com/docs/functions
- https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024

---

# 9. Firestore Rules principles

## Deny by default
No broad public private-data rules.

## Helpers
Conceptually:
```text
isSignedIn()
isActiveMember(orgId)
hasRole(orgId, roles)
isOwnerOrAdmin(orgId)
```

## Structural tenant ownership
Private data under:
`organizations/{orgId}/...`.

## Rules are not filters
Queries must be structured to return only permitted data.

## get/exists
Use for membership/connection checks with access-call limits in mind.

## getAfter
Can validate coordinated transaction/batch fallback writes, but recommended complex stock logic stays backend.

---

# 10. Public directory boundary

Public-safe:
- name;
- handle;
- logo/monogram;
- industry;
- country;
- directory status;
- orgId only if needed for lookup.

Never:
- members;
- inventory;
- costs;
- settings;
- suppliers;
- analytics.

Handle lookup does not grant membership.

---

# 11. Partner Catalog boundary

Connected buyer reads supplier Partner Catalog only when:

```text
connection(buyerOrgId, supplierOrgId).status == ACTIVE
```

Buyer never gets supplier private:
- Products;
- StockBalance;
- Summary;
- Movement;
- Audit;
- Members;
- PrivatePartners;
- Settings.

---

# 12. Shared PO boundary

Connected PO visible only to:
- buyer org;
- named supplier org.

Third connected org cannot read it.

Shared PO contains only transaction fields legitimately shared.

---

# 13. Storefront boundary — C

Public view reads StorefrontCatalogItem only.

No C write path.

Do not put sensitive fields in same public-readable doc and merely hide them in UI.

---

# 14. Audit security

AuditLog:
- server-created;
- org-private;
- immutable;
- update denied;
- delete denied.

Owner can read but not rewrite.

---

# 15. Invitation security

Invite token:
- unpredictable;
- expiring;
- single-use;
- org-bound;
- email-bound;
- only accepted after authentication.

No shared/temporary password storage.

---

# 16. Threat model

| Threat | Attack | Control |
|---|---|---|
| IDOR | change org/product ID | tenant path + membership check |
| Role escalation | choose OWNER | authoritative Membership |
| Cross-tenant read | connected buyer reads private Product | Partner Catalog projection only |
| Balance tampering | direct onHand write | deny Balance write + backend command |
| Replay | double receive/ship | operationId + CommandReceipt |
| Invalid mapping | wrong typed SKU | exact lookup + matched card + confirmation |
| Stale connection | connection disabled after UI loaded | backend re-check |
| Public leak | Storefront reads Product | separate StorefrontCatalogItem |
| Fake total | altered client total | backend validation |
| Audit tamper | delete log | deny update/delete |
| Open rules | `allow true` | emulator rules tests |
| Server bypass | Admin SDK assumes rules protect it | explicit backend authorization |

---

# 17. Minimum security tests

Submission requires:
- Org A private Product read by Org B denied;
- cross-org Stock write denied;
- Storekeeper Admin action denied;
- forged Owner role denied;
- suspended user denied;
- non-party shared PO read denied;
- connected buyer supplier-private read denied;
- connected buyer Partner Catalog read allowed only when ACTIVE;
- audit update/delete denied;
- direct StockBalance write denied;
- same operationId no duplicate;
- unauthenticated private/partner read denied.

---

# 18. Security acceptance statement

> A connected business receives access to a **purpose-built shared surface**, never to the other business's private tenant space.
