# 48 — Post-Design Phase Plan

Sequence after OWNER GATE 2. Aligns with the frozen stack (Firebase Auth + Firestore + Hosting + Cloud Functions callables; Local Emulator Suite; no Cloud Storage) and the scope-freeze schedule/cut-ladder. **Report and tests are protected by cutting features, never the reverse.**

---

## Stage plan (high level)

### FRONTEND STAGE 1 — Presentation on fixtures
Implement routes, app shell, design tokens, component library, all screens, responsive layouts, forms, tables, and every state — **using typed mock/fixture data only.** Do **not** embed business rules into UI components yet.
- Exit: every P0/P1 screen + states render from fixtures; a11y lint green; no engineering copy in UI.

### FRONTEND STAGE 2 — Visual comparison
Screenshot every screen (desktop + 390px) and diff against approved design. Fix visual drift.
- Exit: screenshot comparison passes. **Only now may real data wiring begin.**

### DATABASE STAGE — Firestore realisation (use existing approved architecture; do not redesign)
Implement and validate against the frozen domain/data/Firebase design: collection structure (4 zones), `firestore.indexes.json`, Security Rules (deny-by-default + catch-all), emulator rules tests, seed script (the canonical seed), data converters/validators, query shapes.
- Exit: rules tests green (T-SEC-01…23); seed reproduces the dashboard numbers; **before** any privileged mutation is wired.

### BACKEND STAGE — Trusted commands (`defineCommand()` factory)
Implement callables with auth+membership+role+ownership+state re-checks, transactions, `operationId`/payload-hash idempotency, tenant isolation, bounded fan-out: org creation, invitations, membership changes, opening balance, adjustment, private PO ordering/cancel/receive, warehouse archive, connection request/respond/disable, partner-catalog publish/list/lookup, mapping create/disable, connected-PO submit/accept/reject/ship/receive, audit creation, notifications.
- Exit: property test reconciles the ledger (INV-03/04/06/10/11/18/19/20); idempotency proven.

### INTEGRATION STRATEGY — validated vertical slices (do NOT wait for "all backend complete")
| Slice | Scope | Gate |
|---|---|---|
| 1 | Auth / organization creation | atomic org + handle uniqueness under concurrency |
| 2 | Inventory CRUD | product/category/warehouse; SKU race-free; guarded archive |
| 3 | Stock ledger | opening/adjust; atomic+idempotent; exact reconcile |
| 4 | Private procurement | PO order + partial/full receive; over-receipt blocked |
| 5 | Reports & dashboard | KPIs reconcile to seed |
| — | **GATE-A** | every P0 test green, zero Critical/High → go/no-go for Release B |
| 6 | Connections + Partner Catalog | no cross-tenant leakage |
| 7 | Mapping | all 7 error states; server-validated VERIFIED |
| 8 | Connected PO | submit/accept/ship/receive; dual-ledger; attributed timeline |

### QA STAGE
P0 security/rules/ledger/property tests; component + integration tests; CI (typecheck, lint, unit, component, rules, integration, production build, secret scan); Lighthouse ≥90 perf/a11y on home + dashboard; responsive + a11y pass (Stage 17).

### REPORT / DEMO EVIDENCE STAGE
Record the canonical demo (SC-01→SC-22 chain); capture all state screenshots; write the reflective report (technologies, problems, solutions per file 16); public GitHub repo verified signed-out; PDF renamed with index number.

---

## Guardrails
- Apply the cut-ladder on any slip (CUT-0 charts → CUT-1 Release C → CUT-2 B-PLUS → CUT-3 Connected PO → CUT-4 all Release B → CUT-5 E2E 8→5). **Never cut:** CRUD, DB connection, auth, tenant isolation, stock correctness, private procurement/receiving, dashboard basics, the test suite, production deploy, the report.
- Design is frozen after Gate 2; only defect + responsive/a11y changes.
- AI agents may not self-approve scope changes; a suspected gap → stop and report to the owner.
- No dependency added that isn't in file 10 §17; none upgraded after Day 9.
