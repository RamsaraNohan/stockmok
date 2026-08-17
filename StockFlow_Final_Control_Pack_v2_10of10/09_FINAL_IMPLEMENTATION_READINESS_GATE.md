# StockFlow — Final Implementation Readiness Gate v2.0

**Review date:** 09 August 2026  
**Authority:** final go/no-go before UI and implementation execution

---

# 1. Readiness verdict

## READY_TO_DESIGN_UI: **YES**

No unresolved conceptual blocker remains.

UI must follow:
- `03_FINAL_SCOPE_FREEZE.md`
- `07_FINAL_UI_INFORMATION_ARCHITECTURE.md`

Do not reopen product scope during visual design.

## READY_TO_IMPLEMENT_AFTER_UI: **YES — CONDITIONAL ON DAY-1 PREREQUISITES**

Project is implementation-ready.

Remaining prerequisites are operational/administrative, not conceptual.

---

# 2. BLOCKER-00

## Original coursework brief verification: **CLOSED**

Actual brief has been read and reconciled.

### Technology compatibility
**PASS**

Java/Python/PHP/MySQL are examples, not exclusive mandated technologies.

React + TypeScript + Firebase Auth + Firestore does not conflict with the supplied brief.

---

# 3. Remaining prerequisites

## PREREQ-01 — Official deadline

**OPEN ADMIN**

Brief says TBA.
Student's working date: 24 Aug 2026.

Check DLE:
- date;
- time;
- timezone;
- late rule.

Blocks submission planning, not UI/code start.

---

## PREREQ-02 — Presentation details

**OPEN ADMIN**

Brief references presentation but no format/date.

Check DLE/module announcements.

---

## PREREQ-03 — Firebase Blaze decision

**MUST RESOLVE DAY 1**

Recommended architecture uses Cloud Functions for:
- stock commands;
- cross-business transitions;
- idempotent privileged changes.

Production Functions require Blaze.
Storage also requires Blaze if Firebase Storage logo upload is used.

### Preferred
Enable Blaze + budget alert.

### If unavailable
Do not weaken security.

Follow fallback:
- keep secure A;
- rules-constrained own-tenant transaction only where safely tested;
- remove B cross-tenant state changes that cannot meet security model.

---

## PREREQ-04 — AI/academic policy

**OPEN ADMIN**

Brief says own work and referencing but no AI-specific rule.

Verify module/university policy for:
- declarations;
- attribution;
- allowed assistance.

---

# 4. Architecture readiness

| Area | Status |
|---|---|
| Product concept | PASS |
| Coursework fit | PASS |
| Scope | FROZEN |
| Actors | PASS |
| CRUD | PASS conceptually |
| Tenant model | PASS |
| Auth | PASS |
| RBAC | PASS |
| Stock ledger | PASS |
| Atomicity | PASS |
| Idempotency | PASS |
| Private PO | PASS |
| Connected PO | PASS |
| Product mapping | PASS |
| Partner Catalog | PASS |
| Storefront boundary | PASS |
| Audit | PASS |
| UI IA | PASS |
| QA matrix | PASS |
| 12-day scope control | PASS |

---

# 5. AGENTS.md non-negotiables

Repository instructions must include:

1. Read final docs first.
2. `03_FINAL_SCOPE_FREEZE.md` controls scope.
3. No direct material stock quantity edit.
4. Stock change = backend command + Firestore transaction in P1 profile.
5. Movement + Balance + ProductStockSummary atomic.
6. Every stock/B command uses operationId.
7. Buyer never writes supplier private stock.
8. Supplier never writes buyer private stock.
9. Client role never authorization.
10. Admin SDK backend explicitly checks auth/membership/role.
11. Mapping uses Partner Catalog, not private supplier Product.
12. PO items snapshot identity/unit/conversion/price.
13. Public/partner/private projections remain separate.
14. Audit immutable.
15. No Release D feature before submission.
16. Stop if required reference missing/conflicting.

---

# 6. Minimum backend command catalog

```text
createOrganization

createInvitation
acceptInvitation
changeMemberRoleOrStatus

archiveProduct
recordOpeningBalance
adjustStock
receivePurchaseOrder

requestConnection
respondConnection
createProductMapping

submitConnectedPurchaseOrder
respondConnectedPurchaseOrder
shipConnectedPurchaseOrder
receiveConnectedPurchaseOrder
```

Functions/services may be grouped in code, but business commands remain separate/testable.

---

# 7. UI-to-code sequence

## UI
1. design system;
2. shell;
3. auth;
4. dashboard;
5. Product list/detail/form;
6. adjustment;
7. private supplier;
8. private PO;
9. receiving;
10. Connection;
11. Partner Catalog;
12. Mapping;
13. connected PO;
14. reports/team/settings.

Freeze P0 before optional C.

## Implementation dependency

```text
Auth
→ Organization
→ Membership/RBAC
→ Product/Category/Warehouse
→ Stock
→ Private Partner
→ Private PO
→ Receiving
→ Dashboard/Reports
→ Release A QA
→ Connection
→ Partner Catalog
→ Mapping
→ Connected PO
→ Release B QA
→ optional C
```

---

# 8. Release decision tree

If A green by Day 8:
→ B-Lite.

If B-Lite green by Day 10:
→ B polish.

If B-Lite not green:
→ keep highest stable Connection/Catalog/Mapping subset or cut B.

If A has Critical:
→ no B/C.

---

# 9. UI design gate

UI may start now if designer:

- gets final docs 02–07;
- treats 03 as scope authority;
- does not promote Storefront/POS into A/B;
- separates private/connected PO;
- designs mapping validation/error states;
- designs role/membership denial;
- keeps organization-explicit context.

**UI_GATE = PASS**

---

# 10. Implementation start gate

Before first feature branch:

- [ ] DLE deadline checked
- [ ] repo initialized
- [ ] v2 final docs copied to `/docs/final`
- [ ] AGENTS.md created
- [ ] Firebase project created
- [ ] Emulator Suite initialized
- [ ] Blaze decision made
- [ ] Firestore rules default-deny baseline
- [ ] `.env.example`
- [ ] secrets excluded
- [ ] test commands work
- [ ] clean baseline commit

If Blaze unavailable, secure fallback must be documented before stock/network implementation.

---

# 11. Submission gate

- [ ] Release A P0 QA green
- [ ] visible B tests green
- [ ] no Critical/High open
- [ ] tenant isolation passes
- [ ] idempotency passes
- [ ] production URL works
- [ ] public/evaluator GitHub verified while signed out
- [ ] repo link in report
- [ ] report to DLE
- [ ] source code to DLE
- [ ] PDF named with index number
- [ ] report describes actual technologies/problems/solutions
- [ ] references checked
- [ ] AI policy complied
- [ ] presentation checked
- [ ] submitted artifact reopened/verified where possible

---

# 12. Final control summary

```text
ACTUAL_COURSEWORK_BRIEF_READ: YES

CONCEPTUAL_BLOCKERS: 0
TECHNICAL_BLOCKERS: 0

ADMIN_PREREQUISITES:
- DLE deadline
- presentation
- AI-use policy

DAY_1_TECH_PREREQUISITE:
- Blaze decision

COURSEWORK_FIT: PASS
TECHNOLOGY_COMPATIBILITY: PASS
DATABASE_CONCEPT: PASS
SECURITY_MODEL: PASS
UI_READY: YES
IMPLEMENTATION_READY_AFTER_UI: YES

RECOMMENDED_SCOPE:
A + B-Lite
Full B after gates
C optional
D excluded
```

---

# 13. Final verdict

StockFlow is ready to move from conceptual planning into **UI design now**.

After P0/P1 UI structure is frozen, implementation can begin without another broad architecture review.

From this point, new thinking should answer:

> "How do we implement and prove the frozen requirements safely before the deadline?"

—not—

> "What else could StockFlow become?"
