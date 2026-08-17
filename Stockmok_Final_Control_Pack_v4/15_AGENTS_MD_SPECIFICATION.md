# Stockmok — AGENTS.md Specification v3.0

**Purpose:** the exact specification for the repository's `AGENTS.md`.
**How to use:** the content of §2 below is the file. Copy it to `/AGENTS.md` at the repository root in task SF-0008, adjusting only the placeholders marked `<…>`.
**Why it exists:** every coding agent session starts with no memory of this conversation. `AGENTS.md` is the only thing guaranteed to be read. It must therefore contain the non-negotiables in full, not links to them.

---

# 1. Requirements this file must satisfy

| # | Requirement | Where it appears in §2 |
|---|---|---|
| 1 | Project purpose | §A |
| 2 | Source-of-truth documents | §B |
| 3 | File authority order | §B |
| 4 | Release A/B/C/D boundaries | §C |
| 5 | Mandatory read/reference before coding | §D |
| 6 | No-scope-expansion rule | §E |
| 7 | Stock invariants | §F |
| 8 | Tenant isolation rules | §G |
| 9 | Backend authorization rule | §H |
| 10 | operationId / idempotency rule | §I |
| 11 | PO snapshot rule | §J |
| 12 | Public / partner / private projection rule | §K |
| 13 | Testing before completion | §L |
| 14 | Commit / checkpoint rules | §M |
| 15 | Stop conditions | §N |
| 16 | Forbidden autonomous decisions | §O |
| 17 | Evidence requirements | §P |

Additional sections that experience says are needed: coding conventions (§Q), the dependency allow-list (§R), and a definition of done (§S).

---

# 2. THE FILE

````markdown
# AGENTS.md — Stockmok

You are working on a graded university coursework project with a hard deadline.
Read this entire file before writing any code. It overrides your defaults.

---

## A. Project purpose

Stockmok is a secure, multi-tenant **Inventory & Procurement Management System**
built with React + TypeScript + Firebase.

It has two objectives, in this order:

1. Score as highly as possible on PUSL2021 Referral Coursework 2025/26, which
   rewards a **complete, error-free system** plus quality, performance,
   adaptability, testing and reflection.
2. Remain a credible professional portfolio project.

Priority order when anything conflicts:

```
CORRECTNESS  >  FEATURE COUNT
SECURITY     >  CONVENIENCE
RELIABILITY  >  FUTURE SAAS COMPLETENESS
CLEAR CONTRACT > MORE IDEAS
```

A smaller system that is provably correct beats a larger system that might be.

---

## B. Source of truth

All specifications live in `docs/final/`. When two documents disagree, the one
that **owns** the concern wins. Never silently pick the convenient sentence —
stop and ask.

| Concern | Owner |
|---|---|
| Coursework requirements | the original brief (`docs/final/brief/`) |
| What is and is not built | `03_FINAL_SCOPE_FREEZE.md` |
| Functional / non-functional requirements | `02_FINAL_REQUIREMENTS_SPECIFICATION.md` |
| Entities, states, invariants, ownership | `05_FINAL_DOMAIN_AND_DATA_CONTRACT.md` |
| Auth, authorization, rules, trust boundary | `06_FINAL_SECURITY_AND_RBAC_MODEL.md` |
| Use cases and acceptance behaviour | `04_FINAL_USE_CASES_AND_ACCEPTANCE.md` |
| Routes, screens, UI states | `07_FINAL_UI_INFORMATION_ARCHITECTURE.md` |
| Tests, evidence, release gates | `08_FINAL_TEST_AND_QA_MATRIX.md` |
| Whether work may proceed | `09_FINAL_IMPLEMENTATION_READINESS_GATE.md` |
| Every technology choice | `10_FINAL_TECH_STACK_DECISION.md` |
| Firebase paths, rules, commands, transactions | `11_FINAL_FIREBASE_IMPLEMENTATION_ARCHITECTURE.md` |
| Build order and gates | `12_FINAL_IMPLEMENTATION_PLAN.md` |
| The task queue | `13_FINAL_IMPLEMENTATION_TASK_REGISTER.md` |
| Who does what | `14_FINAL_AI_DEVELOPMENT_WORKFLOW.md` |
| Decision history | `01_FINAL_RECONCILIATION_REPORT.md` |

---

## C. Release boundaries

**Release A — must be complete and independently gradeable.**
Public site, auth (email/password + Google), organization onboarding with a
globally unique immutable handle, team + RBAC, product/category/warehouse CRUD,
stock ledger with opening balance and adjustments, private suppliers and buyers,
private purchase orders, receiving, dashboard, reports, notifications, audit.

**Release B-Lite — the differentiator, only after Release A passes its gate.**
Public organization directory, exact-handle discovery, buyer→supplier
connections, partner catalog publishing, validated product mapping with unit
conversion, connected purchase orders with accept/ship/receive.

**Release C — optional, default NOT BUILT.**
Read-only public storefront catalog projection. No checkout, ever.

**Release D — forbidden before submission.**
Storefront ordering, POS, sales subsystem, per-tenant databases, webhooks,
automatic reorder, AI forecasting, accounting, subscriptions, mobile app,
supplier marketplace, custom role builder, multi-owner governance,
batch/lot/expiry, serial/barcode, multi-currency, multiple shipments,
full-text search.

If you find yourself implementing something in the Release D list, stop.

---

## D. Read before coding — mandatory

Before starting a task:

1. Read the task row in `13_FINAL_IMPLEMENTATION_TASK_REGISTER.md`.
2. Read the stage entry in `12_FINAL_IMPLEMENTATION_PLAN.md`.
3. Read every document that stage names. Actually read them; do not infer.
4. If the task touches authorization, also read `06` §5 and `11` §9.
5. If the task touches stock, money or quantities, also read `11` §15 and §21.

Never implement from memory of a previous session. Never guess a requirement.
If the specification does not answer your question, **stop and ask** — do not
choose for the project.

---

## E. No scope expansion

Implement exactly the task. Nothing adjacent, nothing "while I'm here".

Do not add: a feature, a field, a screen, a route, a collection, a dependency,
an abstraction layer, a configuration option, or a "nice to have" — unless the
task says to.

Do not refactor code outside the task's file list.

If you believe something is missing, say so and stop. The student decides.

---

## F. Stock invariants — never violate

1. Stock quantity is **never** written directly. Every change creates an
   immutable `StockMovement`.
2. `StockMovement` is append-only. Never update it. Never delete it.
3. `StockBalance.onHandMilli` must always equal the signed sum of movements for
   that product + warehouse.
4. `ProductStockSummary.onHandMilli` must always equal the sum of that product's
   balances.
5. Movement + Balance + Summary are written in **one Firestore transaction**.
   Never separately, never "and then".
6. Every stock command carries an `operationId` and is idempotent.
7. A command that would make any single warehouse balance negative is rejected.
8. All persisted quantities are **integers in milli-units** (1 unit = 1000).
   Use the `Milli` branded type from `packages/shared/src/quantity.ts`.
   Never store a decimal quantity. Never do quantity arithmetic with floats.
9. All money is **integer minor units** with an explicit currency.
   Never use floating-point for money.
10. Opening balance is an `OPENING_BALANCE` movement, never a direct write.
11. Supplier shipment affects the **supplier's** ledger only.
    Buyer receipt affects the **buyer's** ledger only.

If a task seems to require breaking one of these, the task is wrong. Stop.

---

## G. Tenant isolation

1. Every private document lives under `organizations/{orgId}/…`.
2. A Security Rule may only `get()` the path
   `organizations/{orgId}/members/{request.auth.uid}` where `orgId` comes from
   the **matched path**.
   **Never `get()` a path derived from `resource.data`.** Doing so breaks list
   queries under Firestore's access-call limits and is forbidden.
3. Cross-tenant collections — `connections`, `connectedPurchaseOrders`,
   `handleReservations` — have **no client access at all**. Clients see
   backend-written projections inside their own tenant, or call a callable.
4. A connected business never reads the other's products, balances, movements,
   members, private partners, settings or audit logs. Only the partner catalog
   projection, and only through the authorized callables.
5. The URL handle is context, never authorization. Authorization always resolves
   to the immutable `organizationId` and the Membership document.
6. Deletes are denied everywhere in `firestore.rules`. Archive, never destroy.

---

## H. Backend authorization

**The Firebase Admin SDK bypasses Security Rules completely.** A Cloud Function
is not protected by `firestore.rules`. Therefore every command must, in order:

1. reject if unauthenticated;
2. validate the payload with the shared Zod schema;
3. read `organizations/{orgId}/members/{uid}` from Firestore;
4. reject unless `status === 'ACTIVE'`;
5. reject unless the role is permitted for this command;
6. verify the target resource actually belongs to that organization;
7. verify the current state permits the transition.

Never trust `request.data.role`, `request.data.orgId` as an authorization claim,
`request.data.currentBalance`, a client-computed total, a client "connection is
active" flag, or a client timestamp.

Use `defineCommand()` from `functions/src/core/`. Do not hand-roll a command
that skips the framework — the framework *is* the guarantee.

---

## I. operationId and idempotency

1. Every stock-changing and every cross-tenant command requires an
   `operationId` (UUID v4) supplied by the client.
2. The client generates it **when the form opens**, not when submit is pressed,
   so a double-click and a retry reuse the same id.
3. Inside the transaction, **read the receipt first**:
   `organizations/{orgId}/commandReceipts/{operationId}`.
   - exists and the payload hash matches → return the stored result, no side
     effects;
   - exists and the hash differs → throw `failed-precondition` with reason
     `OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD`;
   - does not exist → apply the command and create the receipt.
4. Never check the receipt before opening the transaction. That is a race.
5. Receipts are organization-scoped. Never global.

---

## J. Purchase order snapshots

1. When a private PO moves DRAFT → ORDERED, and when a connected PO moves
   DRAFT → SUBMITTED, every line snapshots: product name, SKU, unit, ordered
   quantity, unit price, currency — and for connected orders additionally the
   supplier catalog item id, supplier name, partner SKU, supplier order unit,
   supplier order quantity and the conversion factor.
2. Snapshots are **immutable** thereafter. Editing a product, a mapping or a
   catalog item must never change an existing purchase order.
3. Never render a purchase order line by joining to the live product. Render the
   snapshot.
4. Received quantity may never exceed outstanding quantity.
5. A private PO never claims in-platform supplier acceptance. Private flow is
   DRAFT → ORDERED → PARTIALLY_RECEIVED → RECEIVED, plus CANCELLED before any
   receipt.

---

## K. Projections

Firestore reads whole documents. You cannot hide a field with a rule.
Therefore public, partner and private data live in **separate documents**.

| Projection | Contains | Never contains |
|---|---|---|
| `organizationDirectory/{handle}` | orgId, handle, name, monogram, logo, industry, country, status | members, inventory, costs, settings, analytics |
| `organizations/{orgId}/partnerCatalog/{id}` | partner SKU, display name, order unit, pack description, availability state, optional wholesale price | exact stock quantity, internal cost, margin, warehouse, private product fields |
| `storefrontCatalog/{handle}/items/{id}` | name, public SKU, description, selling price, image, category name, coarse availability | purchase cost, margin, supplier, warehouse, minimum stock, movement history, exact quantity |

Copy only explicitly allow-listed fields. Never spread a private document into a
projection. Availability is a coarse state, never a number.

---

## L. Testing before completion

A task is not done until its tests exist and pass.

- Pure domain logic in `packages/shared` → Vitest unit tests, aiming at 100 %.
- Anything touching `firestore.rules` → a rules test proving both the allow and
  the deny case.
- Every command → integration tests against the emulators covering:
  happy path, unauthenticated, wrong role, wrong tenant, invalid payload,
  invalid state transition, replay with the same operationId, replay with a
  different payload.
- Every stock command → the ledger reconciliation assertions.

**Never weaken, skip, `.only`, `.skip` or delete a test to make a suite pass.**
If a test fails, either the code is wrong or the specification is wrong. Both
are worth stopping for. A silently weakened test is the most damaging thing you
can do to this project.

Run `npm run verify` before reporting a task complete.

---

## M. Commits and checkpoints

- One task, one commit.
- Conventional commit format, with the task id:
  `feat(stock): add adjust command with idempotency [SF-0137]`
- Never commit with a failing `npm run verify`.
- Never commit `.env`, a service-account JSON, or any credential.
- Do not commit; **report and stop**. The student reviews the diff and commits.
- Control documents in `docs/final/` and application code never change in the
  same commit.

---

## N. Stop conditions

Stop immediately, report, and wait — do not improvise — if:

- a required document is missing or contradicts another;
- the specification does not answer a question you must answer to proceed;
- you would need to add a dependency;
- you would need to change a Firestore path, a state machine, or a Security Rule
  beyond the task's stated scope;
- you would need to relax a security rule or weaken a test;
- a test fails and the only way to pass it is to change the assertion;
- the task appears to require a Release D feature;
- you notice a data-integrity or tenant-isolation risk anywhere, even outside
  your task;
- the task looks like it will take more than one focused session.

Reporting a blocker is a success. Guessing is a failure.

---

## O. Forbidden autonomous decisions

You may never decide, on your own:

1. to add, remove or rename a requirement;
2. to move a feature between releases;
3. to add or upgrade a dependency;
4. to change a Firestore collection path or move data between zones;
5. to relax a Security Rule;
6. to change a state machine;
7. to weaken, skip or delete a test;
8. that a Critical or High defect is acceptable;
9. to build Release C;
10. to deploy to production;
11. that a stage gate has passed;
12. to write the report's reflection, problems-and-solutions or
    individual-contribution sections.

All twelve belong to the student.

---

## P. Evidence requirements

This is coursework. Evidence is worth marks. Capture it while building.

After each task, if `16_FINAL_COURSEWORK_EVIDENCE_AND_REPORT_PLAN.md` lists an
artifact for this stage, produce it now:

- screenshots into `docs/evidence/screenshots/stage-NN/`;
- test output into `docs/qa/`;
- performance measurements into `docs/evidence/performance/`;
- one problem-and-solution entry per day into `docs/PROGRESS.md`.

When you solve a non-obvious problem, write two or three sentences in
`docs/PROGRESS.md`: what broke, why, how it was fixed. That file becomes the
reflection section of the report, and it cannot be reconstructed later.

---

## Q. Coding conventions

- TypeScript strict. No `any`. Use `unknown` plus a Zod parse at boundaries.
- React components never import `firebase/firestore`. All data access goes
  through `src/services/*`. ESLint enforces this.
- One Zod schema per payload in `packages/shared`, used by both the form and the
  command. Never hand-write a payload type.
- Derive types with `z.infer`. Never duplicate a shape.
- Query keys come from the `qk` factory. Never a raw string array.
- Every list query has `.limit()`. Page size 25, maximum 100.
- Every timestamp is written with `FieldValue.serverTimestamp()`.
- Every icon-only button has an `aria-label`.
- Every form field is associated with its label and its error by id.
- Files under ~300 lines. Split by feature, not by type.
- No commented-out code. No `console.log` in committed code.

---

## R. Dependency allow-list

The complete runtime dependency list is in
`docs/final/10_FINAL_TECH_STACK_DECISION.md` §17.

**Do not install anything that is not on that list.** If you believe a
dependency is needed, stop and explain why. The answer is usually "write ten
lines instead".

Do not upgrade any dependency. Versions are frozen after Day 9.

---

## S. Definition of done

A task is done when **all** of these are true:

- [ ] it does exactly what the task row says, and nothing more;
- [ ] `npx tsc --noEmit` passes;
- [ ] `npx eslint .` passes with no new suppressions;
- [ ] the tests named in the task row exist and pass;
- [ ] `npm run verify` is green;
- [ ] rules and indexes are updated if the task needed them;
- [ ] no new dependency;
- [ ] no secret added;
- [ ] the evidence artifact for this stage is captured;
- [ ] the diff is small enough for a human to read in full.

If any box is unchecked, the task is not done. Report the gap.
````

---

# 3. Notes for whoever creates the file

- Keep it at the repository root as `/AGENTS.md`. Also symlink or copy to
  `/CLAUDE.md` if a tool looks for that name — the content is identical.
- Do **not** shorten it. Its length is the point: it is the only context an agent
  is guaranteed to read, and every section prevents a specific failure that has
  a real cost in this 13-day schedule.
- Update it only when a control document changes, and record the change in
  `01_FINAL_RECONCILIATION_REPORT.md`.
- Section F (stock invariants) and Section H (backend authorization) are the two
  most important. If the file ever has to be trimmed for a tool with a small
  context window, those two survive.
- The file contains no application code, by design.
