# StockFlow — Final Scope Freeze v2.0

**Authority:** This file controls what is and is not built before coursework submission.

---

## 1. Target release

**Required target:** Release A + Release B-Lite  
**Stretch:** full Release B  
**Optional:** Release C read-only Storefront Catalog  
**Never before submission:** Release D

---

# 2. Release A — Grade-protecting core

Release A must be complete, tested and independently demoable before B work begins.

## A1 — Public/authentication
- one-page public site;
- email/password;
- Google;
- logout;
- password reset;
- global login;
- branded login `/b/:handle`.

## A2 — Organization/onboarding
- create business;
- name;
- immutable globally unique handle;
- industry;
- country;
- currency;
- timezone;
- optional logo / monogram fallback;
- first warehouse;
- Owner membership;
- organization-explicit `/app/:handle/...` routes.

## A3 — Team/RBAC
- fixed built-in roles;
- one role per membership UI;
- invite by email + secure link/token;
- accept invite;
- change ordinary staff role;
- suspend/remove ordinary member;
- canonical Owner protected;
- role-aware navigation;
- authoritative authorization.

## A4 — Inventory master data
- Product CRUD/archive;
- Category CRUD/archive;
- Warehouse CRUD/archive;
- search/filter/sort/pagination;
- product detail;
- location-aware stock.

## A5 — Stock integrity
- opening balance movement;
- StockBalance;
- ProductStockSummary;
- adjustment with reason;
- low/out-of-stock;
- movement history;
- backend stock commands;
- operationId idempotency;
- required audit events.

## A6 — Private partners
- private supplier CRUD;
- private buyer CRUD;
- Private vs Connected visual distinction.

## A7 — Private procurement
- DRAFT;
- ORDERED;
- full/partial receiving;
- stock update;
- cancellation before receipt;
- snapshots/history.

## A8 — Dashboard/reports
Dashboard:
- Inventory Value;
- SKU count;
- Low Stock;
- Open POs;
- Awaiting Receipt;
- Recent Activity;
- Needs Attention.

Reports:
- Stock on Hand;
- Purchase Orders.

## A9 — Quality/security
- tenant isolation;
- permissions;
- loading/empty/error/success;
- responsive primary flows;
- no critical console errors;
- seed/demo data;
- safe public GitHub configuration.

### Release A gate

A marker must be able to grade Release A alone as a complete **Inventory & Procurement Management System**.

---

# 3. Release B-Lite — Required differentiator after A

Minimum connected-business story:

1. public OrganizationDirectoryEntry;
2. exact-handle lookup;
3. buyer→supplier connection request;
4. supplier accept/reject;
5. supplier publishes Partner Catalog item;
6. buyer selects connected supplier;
7. buyer enters supplier partner SKU;
8. system validates;
9. matched item shown;
10. semantic confirmation;
11. explicit unit conversion;
12. backend creates VERIFIED mapping;
13. buyer creates connected DRAFT PO;
14. SUBMIT;
15. supplier ACCEPT/REJECT;
16. supplier SHIP;
17. supplier stock decreases via supplier-side command;
18. buyer full/partial receive;
19. buyer stock increases via buyer-side command;
20. status history visible;
21. in-app connection/PO notifications.

---

# 4. Full Release B — Stretch

Only after B-Lite is green:

- richer connection detail;
- name-prefix lookup;
- mapping filters;
- bilateral mapping confirmation;
- richer notification routing;
- connected supplier analytics.

No B-PLUS item may delay QA.

---

# 5. Release C — Optional read-only Storefront proof

Allowed:
- publish StorefrontCatalogItem;
- public read-only page;
- safe fields;
- availability.

Not allowed:
- checkout;
- sales order;
- reservation;
- payment;
- POS;
- external stock write.

---

# 6. Release D — Explicitly excluded

- Storefront order API;
- POS;
- physical sales subsystem beyond future concept;
- dedicated Firestore DB per business;
- customer-owned Firebase project;
- webhooks/event bus;
- automatic reorder;
- AI forecasting/recommendations;
- accounting;
- subscriptions;
- mobile app;
- supplier marketplace;
- custom role builder;
- multi-owner governance;
- batch/lot/expiry;
- serial/barcode;
- multi-currency PO;
- multiple/partial shipments;
- enterprise full-text search.

---

# 7. Deliberate coursework simplifications

| Area | Coursework | Future |
|---|---|---|
| Roles | one role/member UI | multiple/custom roles |
| Owner | one canonical Owner | transfer/multi-owner |
| Discovery | exact handle | fuzzy search |
| Mapping | buyer-confirmed after valid match | bilateral confirmation |
| Shipment | one SHIPPED event | multiple/partial |
| Receiving | full/partial | GRN/QC/batch |
| Invitation | secure link, email optional | full mail workflow |
| Logo | optional/monogram | Storage upload |
| Storefront | read-only optional | ordering/sync |
| Analytics | core actionable KPIs | forecasting/BI |

---

# 8. Technical deployment profile

## P1 — Recommended production-like profile

- Firebase Auth
- Firestore
- Hosting
- Cloud Functions
- optional Cloud Storage

**Requires Blaze** for production Functions; Storage also requires Blaze under current Firebase rules.

Use budget alerts.

## P0 — If Blaze unavailable

Do not weaken security.

Fallback order:
1. retain secure Release A;
2. rules-constrained own-tenant transaction only where safely tested;
3. remove/disable B cross-tenant state-changing features that cannot meet security contract;
4. document B concept as future if needed.

A smaller secure Release A is preferable to insecure B.

---

# 9. Feature-cut ladder

**CUT-1:** Release C.  
**CUT-2:** B-PLUS extras.  
**CUT-3:** Connected PO while keeping Connection + Partner Catalog + Mapping.  
**CUT-4:** Release B entirely if private PO/receiving unstable.

Never cut:
- CRUD;
- database;
- auth;
- tenant isolation;
- stock correctness;
- private procurement;
- dashboard basics;
- report/evidence.

---

# 10. Daily gates

**End Day 1**
- repo;
- final docs;
- Firebase/emulator;
- Blaze decision;
- DLE deadline checked;
- no stack ambiguity.

**End Day 3**
Auth + organization + RBAC stable.

**End Day 5**
Product CRUD + stock ledger correct.

**End Day 7**
Private PO + receiving correct.

**End Day 8**
Release A independently gradeable.

**End Day 10**
B-Lite works end-to-end or highest stable subset is frozen.

**Day 11 onward**
Feature freeze: defects/QA/polish/deployment/report only.

---

# 11. Scope-change protocol

New implementation feature only if:
1. Release A green;
2. closes requirement gap or defect;
3. student approves;
4. tests/docs updated;
5. ≥2 build days remain;
6. no stable core redesign.

AI agents cannot self-approve scope.

---

# 12. Design-scope freeze

Designers must design:
- P0 Release A;
- P1 B-Lite;
- P2 Release C only if separately requested.

Do not produce Release D screens that distract implementation.

---

# 13. Final declaration

> **StockFlow Coursework Release = complete Release A + the largest stable B-Lite subset that passes all security/data-integrity tests before code freeze.**
