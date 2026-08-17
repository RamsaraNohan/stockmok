# StockFlow — Final Implementation Plan v3.0

**Status:** EXECUTABLE. This is the build order, not a roadmap.
**Authority:** owns stage sequencing, dependencies and acceptance gates. Task-level detail lives in `13_FINAL_IMPLEMENTATION_TASK_REGISTER.md`.
**Calendar:** Day 1 = **Monday 10 August 2026**. Day 13 = **Saturday 22 August 2026**. Submission window 23–24 August 2026.
**Rule:** a stage is not "done" because the code exists. A stage is done when its acceptance criteria pass and the checkpoint commit is pushed with CI green.

---

## 0. Calendar and stage map

| Day | Date | Stages | Track |
|---|---|---|---|
| 1 | Mon 10 Aug | **S0** repo + architecture baseline · **S1** Firebase/emulator bootstrap · **Blaze decision** · throwaway deploy | UI design starts in parallel from `17` |
| 2 | Tue 11 Aug | **S2** design system + public site + auth | **UI design freeze at end of day** |
| 3 | Wed 12 Aug | **S3** organization onboarding + handle reservation | |
| 4 | Thu 13 Aug | **S4** membership + RBAC + command framework | |
| 5 | Fri 14 Aug | **S5** products / categories / warehouses | |
| 6 | Sat 15 Aug | **S6** stock command architecture + ledger | |
| 7 | Sun 16 Aug | **S7** private partners · **S8** private purchase orders | |
| 8 | Mon 17 Aug | **S9** receiving · **S10** dashboard + reports | |
| 9 | Tue 18 Aug | **S11 RELEASE A QA GATE** — security, integrity, E2E | **Dependency freeze (VP-03)** |
| 10 | Wed 19 Aug | **S12** business connections · **S13** partner catalog | |
| 11 | Thu 20 Aug | **S14** product mapping · **S15** connected PO (part 1) | **Feature-freeze decision point** |
| 12 | Fri 21 Aug | **S15** connected PO (part 2) · **S16 RELEASE B QA GATE** | |
| 13 | Sat 22 Aug | **S17** UI polish / responsive / a11y · **S18** production deployment | **Code freeze end of day** |
| 14 | Sun 23 Aug | **S19** final QA + evidence · **S20** report + demo + submission | |
| — | Mon 24 Aug | **Deadline.** Buffer only. No code. | |

**Slack budget:** Day 13 and Day 14 contain roughly one full day of absorbable slippage. If Stage 11 does not pass on Day 9, Release B is cut on Day 10 rather than compressed — see §22.

---

## 1. How to read a stage

Every stage below carries: objective, dependencies, documents to read, requirement IDs, use-case IDs, test IDs, primary tool, model effort, implementation scope, expected files, detailed tasks, acceptance criteria, validation commands, expected output, stop conditions, checkpoint requirement, next-stage gate.

**Model effort key** — `LOW` = Sonnet-class, mechanical; `MED` = Sonnet-class with careful review; `HIGH` = Opus-class, security- or correctness-critical, reviewed by a second model.

---

# STAGE 0 — Repository and architecture baseline

| | |
|---|---|
| **STAGE-ID** | S0 |
| **OBJECTIVE** | A clean, typed, linted, CI-verified repository that builds and runs, with the control pack and AGENTS.md in place, before a single feature exists. |
| **DEPENDENCIES** | none |
| **DOCUMENTS TO READ** | `10` (whole), `15` (whole) |
| **REQUIREMENT IDs** | NFR-011, NFR-012, NFR-013, ADM-003 |
| **USE CASE IDs** | — |
| **TEST IDs** | T-NFR-03, T-NFR-04 |
| **PRIMARY TOOL** | Claude Code |
| **MODEL EFFORT** | MED |
| **IMPLEMENTATION SCOPE** | Scaffolding only. No feature code, no Firebase code. |
| **FILES / FOLDERS** | `package.json`, `tsconfig*.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc`, `.gitignore`, `.nvmrc`, `.env.example`, `README.md`, `AGENTS.md`, `docs/final/**`, `packages/shared/**`, `src/**` skeleton, `.github/workflows/ci.yml` |
| **DETAILED TASKS** | 1. `npm create vite@latest` React+TS; pin versions per `10` §17. 2. Configure `tsconfig` strictness per TECH-061. 3. ESLint flat config with `typescript-eslint`, `react-hooks`, `jsx-a11y` (errors), `import`, plus the `no-restricted-imports` architecture rules. 4. Prettier + `simple-git-hooks` + `lint-staged`. 5. Create `packages/shared` with a path alias from both the app and (later) `functions`. 6. Copy this control pack into `docs/final/`. 7. Write `AGENTS.md` exactly per `15`. 8. Folder skeleton: `src/{app,ui,features,services,lib,styles}`. 9. `.github/workflows/ci.yml` running typecheck → lint → build. 10. Public GitHub repo, first commit, verify CI green. |
| **ACCEPTANCE CRITERIA** | `npm ci && npm run verify && npm run build` succeeds from a fresh clone. CI is green. `AGENTS.md` exists and matches `15`. Repository is public and loads in a signed-out browser. No `.env` committed. |
| **VALIDATION** | `rm -rf node_modules && npm ci && npm run build && npx tsc --noEmit && npx eslint .` |
| **EXPECTED OUTPUT** | Green CI badge; a repo URL that a stranger can clone and build. |
| **STOP CONDITIONS** | CI cannot be made green; the repository cannot be made public. |
| **CHECKPOINT** | `git tag s0-baseline`; push. |
| **NEXT-STAGE GATE** | Fresh-clone build verified by the student personally, not by an agent's assertion. |

---

# STAGE 1 — Firebase project, emulators, deploy dry-run

| | |
|---|---|
| **STAGE-ID** | S1 |
| **OBJECTIVE** | Prove, on Day 1, that this student's account can deploy a Cloud Function and a Hosting site — and that the emulator suite runs locally. |
| **DEPENDENCIES** | S0 |
| **DOCUMENTS TO READ** | `11` §1–4, §27–29; `10` TECH-022..027, TECH-064..069 |
| **REQUIREMENT IDs** | NFR-013, SEC-016, ADM-… (Blaze) |
| **USE CASE IDs** | — |
| **TEST IDs** | T-NFR-05, T-NFR-06 |
| **PRIMARY TOOL** | Student (console work) + Claude Code (config files) |
| **MODEL EFFORT** | MED |
| **IMPLEMENTATION SCOPE** | Firebase project, billing, emulator config, one throwaway callable, one throwaway deploy. |
| **FILES / FOLDERS** | `.firebaserc`, `firebase.json`, `firestore.rules` (deny-all), `firestore.indexes.json` (empty), `functions/**`, `src/lib/firebase/app.ts`, `.env.local`, `.env.production` |
| **DETAILED TASKS** | 1. Create the Firebase project; **choose the Firestore region and record it in the README — it is permanent.** 2. **Decide Blaze.** Enable it, or declare Profile P0 (`10` §16) and re-plan before S2. 3. Set the $5 GCP budget with alerts; screenshot it into `docs/evidence/`. 4. Enable Email/Password and Google auth providers. 5. `firebase init` for firestore, functions (TS, Node 22), hosting, emulators with the fixed ports. 6. `firestore.rules` = deny-all catch-all only. 7. Client Firebase init with the emulator switch and the amber EMULATOR ribbon. 8. Write one throwaway callable `ping` that returns the server time; **deploy it and hosting to production and call it from the deployed site.** 9. Delete `ping` afterwards, keeping the deployment scripts. |
| **ACCEPTANCE CRITERIA** | Emulators start and the Emulator UI is reachable. The app connects to emulators and shows the ribbon. A callable deployed to production returns a value to the deployed site. Budget alert configured. Blaze decision recorded in `01`. |
| **VALIDATION** | `npm run emu`; `firebase deploy`; open the `.web.app` URL and trigger `ping`. |
| **EXPECTED OUTPUT** | A live URL, a working deploy pipeline, and certainty about Blaze on Day 1 rather than Day 12. |
| **STOP CONDITIONS** | **Blaze cannot be enabled** → stop, switch to Profile P0, re-plan Stages 4–16 before proceeding. This is the single most important stop condition in the project. |
| **CHECKPOINT** | `git tag s1-firebase`. |
| **NEXT-STAGE GATE** | A production deployment has succeeded at least once. |

---

# STAGE 2 — Design system, app shell, public site, authentication

| | |
|---|---|
| **STAGE-ID** | S2 |
| **OBJECTIVE** | A visually complete public site and a working authentication surface on top of the component library everything else will reuse. |
| **DEPENDENCIES** | S1; UI design output from `17` |
| **DOCUMENTS TO READ** | `07` §1–8, §22, §25–26; `17`; `02` §4.1; `04` SC-02; `11` §4 |
| **REQUIREMENT IDs** | FR-AUTH-001..010, NFR-001, NFR-002, NFR-016 |
| **USE CASE IDs** | UC-01, UC-02, UC-04 |
| **TEST IDs** | T-AUTH-01..10, T-UI-02, T-UI-05, T-UI-07, T-UI-08 |
| **PRIMARY TOOL** | Claude Code |
| **MODEL EFFORT** | MED (design system) / HIGH (auth guards) |
| **IMPLEMENTATION SCOPE** | `src/ui` component library; theme tokens; `AuthProvider`; router skeleton; public home; login; signup; branded login; 404. Not the authenticated app. |
| **FILES / FOLDERS** | `src/styles/theme.css`, `src/ui/**`, `src/app/router.tsx`, `src/app/layouts/PublicLayout.tsx`, `src/lib/auth/AuthProvider.tsx`, `src/app/guards/RequireAuth.tsx`, `src/features/marketing/**`, `src/features/auth/**` |
| **DETAILED TASKS** | 1. Theme tokens per `17` §5. 2. Build exactly the components listed in `17` §8 — no more. 3. `AuthProvider` with the tri-state `status`. 4. Router with `PublicLayout` and a `RequireAuth` that renders a skeleton while loading. 5. Public home page, all sections from `07` §7, honest about what is built. 6. `/signup`, `/login` with email/password + Google popup + password reset. 7. `/b/:handle` branded login: public directory `get`, all eight states from `07` §8; the role selector defaults to **"Detect automatically"** and is optional. 8. Neutral, non-enumerating auth error copy. 9. 404 route. |
| **ACCEPTANCE CRITERIA** | A user can sign up, sign out, sign in, reset a password, and sign in with Google, against emulators. `/b/unknown-handle` shows a safe not-found. No console errors. Keyboard navigation works on every public screen. Lighthouse accessibility ≥ 90 on the home page. |
| **VALIDATION** | `npm run test:unit`, manual pass of the eight branded-login states, `npx lighthouse` on `/`. |
| **EXPECTED OUTPUT** | Screenshots of the home page, login and all branded-login states into `docs/evidence/screenshots/stage-02/`. |
| **STOP CONDITIONS** | Google popup cannot be made to work locally → record the defect, continue with email/password, fix before S18. |
| **CHECKPOINT** | `git tag s2-auth`. |
| **NEXT-STAGE GATE** | **UI design is frozen at the end of Day 2.** No further visual redesign after this point; only defect fixes and responsive/a11y work in S17. |

---

# STAGE 3 — Organization onboarding and handle reservation

| | |
|---|---|
| **STAGE-ID** | S3 |
| **OBJECTIVE** | A user with no organization can create one atomically, and lands inside a real, organization-scoped workspace. |
| **DEPENDENCIES** | S2 |
| **DOCUMENTS TO READ** | `05` §5.2–5.4, `11` §18–19, `07` §9, `04` SC-01 |
| **REQUIREMENT IDs** | FR-ORG-001..010, BR-017, SEC-005 |
| **USE CASE IDs** | UC-03 |
| **TEST IDs** | T-ORG-01, T-ORG-02, T-ORG-03, T-ORG-04, T-SEC-16 |
| **PRIMARY TOOL** | Claude Code |
| **MODEL EFFORT** | HIGH (the first transactional command sets the pattern for all others) |
| **IMPLEMENTATION SCOPE** | `defineCommand` framework, `org.create`, onboarding wizard, `OrgProvider`, `/select-workspace`, `AppShell`. |
| **FILES / FOLDERS** | `functions/src/core/**`, `functions/src/commands/org.ts`, `packages/shared/src/schemas/org.ts`, `packages/shared/src/handle.ts`, `src/features/onboarding/**`, `src/lib/org/OrgProvider.tsx`, `src/app/layouts/{AuthLayout,OrgLayout}.tsx`, `src/services/organizations.ts` |
| **DETAILED TASKS** | 1. Build `defineCommand()` in full (auth → Zod → membership → role → transaction → idempotency → audit → typed errors). 2. Handle normalisation + the reserved-word list, unit-tested. 3. `org.create` transaction exactly per `11` §14. 4. Four-step onboarding wizard with live handle normalisation, availability check and the immutability warning. 5. `OrgProvider` resolving `:handle` → directory → orgId → membership via `onSnapshot`. 6. `/select-workspace` reading `users/{uid}/memberships`. 7. Post-login routing: zero memberships → onboarding; one → straight in; many → selector. 8. App shell with business name, monogram and active role always visible. |
| **ACCEPTANCE CRITERIA** | SC-01 passes end to end. Two concurrent `org.create` calls with the same handle produce exactly one organization and one clean `already-exists` error. `FreshFoods` and `freshfoods` cannot both exist. The public directory document contains exactly the allowed keys. Logout/login returns the Owner to the same workspace. |
| **VALIDATION** | `npm run test:int -- org`, plus a scripted concurrency test firing two identical creates. |
| **EXPECTED OUTPUT** | Onboarding screenshots; the concurrency test output pasted into `docs/qa/`. |
| **STOP CONDITIONS** | The transaction cannot be made atomic → stop; nothing downstream is trustworthy. |
| **CHECKPOINT** | `git tag s3-org`. |
| **NEXT-STAGE GATE** | `defineCommand` reviewed by Codex before any further command is written. **This is a mandatory external review point.** |

---

# STAGE 4 — Membership, invitations, RBAC

| | |
|---|---|
| **STAGE-ID** | S4 |
| **OBJECTIVE** | Authorization becomes real: roles are enforced in rules, in the backend and in the UI, from one shared table. |
| **DEPENDENCIES** | S3 |
| **DOCUMENTS TO READ** | `06` (whole), `11` §9, §20; `05` §5.5–5.6; `07` §4, §21 |
| **REQUIREMENT IDs** | FR-TEAM-001..009, SEC-002..004, SEC-008, BR-015, BR-016 |
| **USE CASE IDs** | UC-05, UC-06, UC-14 |
| **TEST IDs** | T-ORG-05..08, T-SEC-01..09, T-SEC-17 |
| **PRIMARY TOOL** | Claude Code; **Codex reviews the rules file** |
| **MODEL EFFORT** | HIGH |
| **IMPLEMENTATION SCOPE** | `ROLE_PERMISSIONS`, four team commands, the first real `firestore.rules`, the rules test harness, Team screen, invite accept screen, role-aware navigation. |
| **FILES / FOLDERS** | `packages/shared/src/permissions.ts`, `functions/src/commands/team.ts`, `firestore.rules`, `tests/rules/**`, `src/features/team/**`, `src/app/guards/RequireRole.tsx`, `src/features/invite/**` |
| **DETAILED TASKS** | 1. `ROLE_PERMISSIONS` table encoding `06` §5 with **no ambiguous cells** (see `06` v3 §5). 2. `team.createInvitation` (token + hash + one-time return), `acceptInvitation`, `changeMemberRole`, `setMemberStatus`, all with the `users/{uid}/memberships` mirror and Owner protection. 3. `firestore.rules` per `11` §9 for every collection that exists so far. 4. Rules test harness + the first ~25 assertions. 5. Team screen with invite, copy-link, change role, suspend, remove; Owner row protected. 6. `/invite/:token` acceptance flow. 7. Role-aware sidebar and `RequireRole` route guard. |
| **ACCEPTANCE CRITERIA** | SC-03 passes. An Admin cannot modify the Owner. A suspended member is denied by rules *and* by every command. A wrong-email invite acceptance is rejected. Expired and reused invites are rejected. Every rules assertion in the harness passes. |
| **VALIDATION** | `npm run test:rules && npm run test:int -- team` |
| **EXPECTED OUTPUT** | Rules test output saved to `docs/qa/security-rules-results.md` (first run). |
| **STOP CONDITIONS** | Any cross-tenant assertion fails → fix before any further feature work. |
| **CHECKPOINT** | `git tag s4-rbac`. |
| **NEXT-STAGE GATE** | Codex security review of `firestore.rules` and `defineCommand` completed and its findings resolved or logged. |

---

# STAGE 5 — Products, categories, warehouses

| | |
|---|---|
| **STAGE-ID** | S5 |
| **OBJECTIVE** | The CRUD backbone the coursework brief explicitly demands, done properly. |
| **DEPENDENCIES** | S4 |
| **DOCUMENTS TO READ** | `05` §5.7–5.9, `02` §4.4, `07` §11–12, `11` §14 |
| **REQUIREMENT IDs** | FR-INV-001..012, BR-013, BR-014, NFR-003, NFR-004 |
| **USE CASE IDs** | UC-07 |
| **TEST IDs** | T-CRUD-01..12 |
| **PRIMARY TOOL** | Claude Code |
| **MODEL EFFORT** | MED (HIGH for SKU uniqueness) |
| **IMPLEMENTATION SCOPE** | Category CRUD (client+rules), Warehouse create/update (client+rules) + `warehouse.archive` (command), Product commands, list/detail/form screens, indexes. |
| **FILES / FOLDERS** | `functions/src/commands/{product,warehouse}.ts`, `packages/shared/src/schemas/product.ts`, `src/features/inventory/**`, `src/services/{products,categories,warehouses}.ts`, `firestore.indexes.json` |
| **DETAILED TASKS** | 1. Product Zod schema shared by form and command. 2. `product.create/update/setStatus` with the `productSkuIndex` uniqueness transaction. 3. `warehouse.archive` with the in-transaction bounded queries for non-zero stock and open receiving. 4. Category and warehouse client CRUD plus their rules. 5. Product list: search, category filter, status filter, archived toggle, sort, 25-row cursor pagination. 6. Product detail with Overview / Stock / Suppliers / Activity tabs. 7. Product create/edit form with inline validation. 8. Add IDX-01..03, IDX-08..10 to `firestore.indexes.json`. |
| **ACCEPTANCE CRITERIA** | SC-05 passes. A duplicate SKU is rejected — including two concurrent creates. An archived product is hidden by default, stays in history, and cannot be chosen for a new PO. A warehouse with stock cannot be archived. Pagination shows no duplicate or missing rows. |
| **VALIDATION** | `npm run test:int -- product warehouse` plus a concurrent duplicate-SKU script. |
| **EXPECTED OUTPUT** | CRUD screenshots — these are the primary evidence for CW-04..CW-07. |
| **STOP CONDITIONS** | SKU uniqueness cannot be made race-free → stop and fix; it is a data-integrity invariant. |
| **CHECKPOINT** | `git tag s5-inventory`. |
| **NEXT-STAGE GATE** | All T-CRUD tests green. |

---

# STAGE 6 — Stock command architecture and the ledger

| | |
|---|---|
| **STAGE-ID** | S6 |
| **OBJECTIVE** | The correctness heart of StockFlow: an immutable ledger with atomic, idempotent, exactly-reconciling balances. |
| **DEPENDENCIES** | S5 |
| **DOCUMENTS TO READ** | `05` §4, §6, §8; `11` §15, §21; `02` §4.5; `07` §13 |
| **REQUIREMENT IDs** | FR-STOCK-001..014, BR-002..005, INV-01..06 |
| **USE CASE IDs** | UC-08, UC-09 |
| **TEST IDs** | T-STOCK-01..12, T-INT-01..08 |
| **PRIMARY TOOL** | Claude Code; **Codex independent review mandatory** |
| **MODEL EFFORT** | HIGH — the highest-risk stage in the project |
| **IMPLEMENTATION SCOPE** | Quantity/money utilities, `stock.recordOpeningBalance`, `stock.adjust`, movement history screen, adjustment modal, ledger property tests. |
| **FILES / FOLDERS** | `packages/shared/src/{quantity,money}.ts`, `functions/src/commands/stock.ts`, `functions/src/core/{idempotency,audit,notify}.ts`, `src/features/stock/**`, `tests/integration/ledger.test.ts` |
| **DETAILED TASKS** | 1. Branded `Milli` type + `toMilli`/`fromMilli`/`roundHalfUp`, 100 % unit-tested including boundaries. 2. Money helpers with the same treatment. 3. `deriveStockStatus` with explicit precedence. 4. `stock.recordOpeningBalance` and `stock.adjust` per `11` §21, including `stockValueMinor` maintenance and low-stock notification on transition only. 5. Idempotency with payload hashing, receipt read **first** inside the transaction. 6. Adjustment modal with the Current → Change → Result preview, negative-result blocking, and submit disabled while pending. 7. Movement history with filters and pagination. 8. Property test T-INT-03: hundreds of random valid commands with random replays, reconciling after every step. |
| **ACCEPTANCE CRITERIA** | SC-04 and SC-06 pass. Replaying an `operationId` never creates a second movement. A negative result is rejected. `sum(movements) == balance` and `sum(balances) == summary` hold exactly after every command in the property test. Concurrent adjustments lose no update. Direct writes to balances and movements are denied by rules. |
| **VALIDATION** | `npm run test:unit -- quantity money` · `npm run test:int -- stock ledger` · `npm run test:rules` |
| **EXPECTED OUTPUT** | The property-test output pasted into `docs/qa/` — this is the strongest single piece of quality evidence in the project. |
| **STOP CONDITIONS** | Any ledger reconciliation failure. Do not continue to S7 with a known mismatch. |
| **CHECKPOINT** | `git tag s6-ledger`. |
| **NEXT-STAGE GATE** | Codex review of `stock.ts` and `idempotency.ts` complete; T-INT-01..05 green. |

---

# STAGE 7 — Private suppliers and buyers

| | |
|---|---|
| **STAGE-ID** | S7 |
| **OBJECTIVE** | Partner directory, cleanly separated in the UI from connected businesses. |
| **DEPENDENCIES** | S5 |
| **DOCUMENTS TO READ** | `05` §5.14, `02` §4.6, `07` §14 |
| **REQUIREMENT IDs** | FR-PART-001..006 |
| **USE CASE IDs** | UC-10 |
| **TEST IDs** | T-PART-01..05 |
| **PRIMARY TOOL** | Claude Code |
| **MODEL EFFORT** | LOW |
| **IMPLEMENTATION SCOPE** | `PrivatePartner` client CRUD, Suppliers and Buyers screens with Private / Connected / Pending tabs (Connected tab shows a "Release B" empty state until S12). |
| **FILES / FOLDERS** | `src/features/partners/**`, `src/services/partners.ts`, `packages/shared/src/schemas/partner.ts` |
| **DETAILED TASKS** | 1. Schema + rules for `privatePartners`. 2. List with type and status filters. 3. Create/edit form. 4. Detail page with contacts, status, related POs. 5. Deactivate with confirmation; history preserved. 6. IDX-10. |
| **ACCEPTANCE CRITERIA** | Supplier and buyer CRUD work. A deactivated partner keeps its PO history and cannot be selected for a new PO. Private and Connected are visually distinct and Private is not presented as a degraded option. |
| **VALIDATION** | `npm run test:int -- partners` |
| **EXPECTED OUTPUT** | Screenshots of both tabs. |
| **STOP CONDITIONS** | none material |
| **CHECKPOINT** | `git tag s7-partners`. |
| **NEXT-STAGE GATE** | T-PART green. |

---

# STAGE 8 — Private purchase orders

| | |
|---|---|
| **STAGE-ID** | S8 |
| **OBJECTIVE** | Draft, order, cancel — with immutable snapshots and a generated order number. |
| **DEPENDENCIES** | S6, S7 |
| **DOCUMENTS TO READ** | `05` §5.18–5.20, `02` §4.7, `07` §18, `04` SC-08 |
| **REQUIREMENT IDs** | FR-PO-001..005, FR-PO-011, BR-012, BR-019 |
| **USE CASE IDs** | UC-11 |
| **TEST IDs** | T-PPO-01..04, T-PPO-09..12 |
| **PRIMARY TOOL** | Claude Code |
| **MODEL EFFORT** | MED |
| **IMPLEMENTATION SCOPE** | Draft PO client+rules editing, `po.order`, `po.cancel`, PO list, PO builder, PO detail with timeline. |
| **FILES / FOLDERS** | `functions/src/commands/po.ts`, `src/features/procurement/**`, `packages/shared/src/schemas/po.ts`, `packages/shared/src/stateMachines.ts` |
| **DETAILED TASKS** | 1. PO and PO-item schemas; the private state machine as a transition table. 2. Draft create/edit through rules, restricted to draft-editable fields. 3. `po.order`: allocate `orderNumber` from the counter, freeze snapshots, validate every line and the supplier, write history and audit. 4. `po.cancel` with the "not after any receipt" rule. 5. PO list with private/connected tabs, status filter, pagination. 6. PO builder: supplier → items → delivery → review → Mark Ordered. 7. PO detail with an actor-attributed timeline and **no fake in-platform supplier acceptance**. 8. IDX-11..13. |
| **ACCEPTANCE CRITERIA** | SC-08 passes. A zero-line PO cannot be ordered. Zero or negative quantities are rejected. Archived products and deactivated suppliers are rejected. Renaming a product later does not change an ordered PO. Order numbers are unique under concurrency. |
| **VALIDATION** | `npm run test:int -- po` |
| **EXPECTED OUTPUT** | PO screenshots; a snapshot-immutability test result. |
| **STOP CONDITIONS** | Order-number collisions under concurrency. |
| **CHECKPOINT** | `git tag s8-po`. |
| **NEXT-STAGE GATE** | Snapshot immutability proven by test, not by inspection. |

---

# STAGE 9 — Receiving

| | |
|---|---|
| **STAGE-ID** | S9 |
| **OBJECTIVE** | The moment procurement becomes inventory — partial and full, atomic and idempotent. |
| **DEPENDENCIES** | S8 |
| **DOCUMENTS TO READ** | `11` §22, `02` §4.7, `07` §19, `04` SC-09 |
| **REQUIREMENT IDs** | FR-PO-006..010, INV-12 |
| **USE CASE IDs** | UC-12 |
| **TEST IDs** | T-PPO-05..08, T-INT-04 |
| **PRIMARY TOOL** | Claude Code |
| **MODEL EFFORT** | HIGH |
| **IMPLEMENTATION SCOPE** | `po.receive`, the Receiving screen (mobile-first), receipt history. |
| **FILES / FOLDERS** | `functions/src/commands/po.ts`, `src/features/receiving/**` |
| **DETAILED TASKS** | 1. `po.receive` per `11` §14: one movement per line, balances, summaries, item received quantities, PO status, history, audit, notification, receipt. 2. Over-receipt rejection. 3. Receiving screen with per-line quantity, warehouse selection, current → after preview, outstanding-after display, sticky confirm. 4. Store `receivingWarehouseId` on first receipt so warehouse archive can see the dependency. 5. Receipt history on the PO detail. |
| **ACCEPTANCE CRITERIA** | SC-09 passes: 40 then 10 against an order of 50, with the correct statuses and stock at each step. Receiving 11 when 10 are outstanding is rejected. Replaying the receipt does not double stock. A warehouse targeted by an open receipt cannot be archived. |
| **VALIDATION** | `npm run test:int -- receiving` |
| **EXPECTED OUTPUT** | Mobile receiving screenshots at 390 px. |
| **STOP CONDITIONS** | Any double-application of a receipt. |
| **CHECKPOINT** | `git tag s9-receiving`. |
| **NEXT-STAGE GATE** | **Release A functional scope is now complete.** |

---

# STAGE 10 — Dashboard, reports, notifications

| | |
|---|---|
| **STAGE-ID** | S10 |
| **OBJECTIVE** | Make the system explainable: every number traceable, every card actionable. |
| **DEPENDENCIES** | S9 |
| **DOCUMENTS TO READ** | `05` §10, `10` TECH-045, `07` §10, §20, `02` §4.10, `04` SC-18 |
| **REQUIREMENT IDs** | FR-DASH-001..007, FR-NOTIFY-001, FR-AUD-001..004 |
| **USE CASE IDs** | UC-13 |
| **TEST IDs** | T-REPORT-01..08, T-AUD-01..04, T-NOTIFY-01..02 |
| **PRIMARY TOOL** | Claude Code |
| **MODEL EFFORT** | MED |
| **IMPLEMENTATION SCOPE** | Dashboard KPIs via aggregation queries, Needs Attention, Recent Activity, three charts, Stock-on-Hand and Purchase-Order reports, Notifications screen, Activity tab. |
| **FILES / FOLDERS** | `src/features/dashboard/**`, `src/features/reports/**`, `src/features/notifications/**`, `src/services/analytics.ts` |
| **DETAILED TASKS** | 1. KPI queries using `count()` and `sum('stockValueMinor')`. 2. Needs Attention items, each linking to the exact filtered screen. 3. Recent Activity from `auditLogs` / `stockMovements`. 4. Three lazy-loaded charts, each with a text summary. 5. Stock-on-Hand report with warehouse and status filters and CSV export. 6. Purchase-Order report with status and date filters. 7. Notifications list with unread count and mark-as-read. 8. Empty dashboard state with a setup checklist. |
| **ACCEPTANCE CRITERIA** | SC-18 passes: every KPI reconciles against the seeded dataset table in `16` §7. No KPI is stored as a hand-editable document. Cost changes move the inventory value. Every Needs Attention item navigates correctly. |
| **VALIDATION** | `npm run test:int -- reports` and a manual reconciliation against the seed table. |
| **EXPECTED OUTPUT** | Dashboard screenshot plus a reconciliation table for the report. |
| **STOP CONDITIONS** | A KPI that cannot be traced to operational data → remove the KPI rather than fake it. |
| **CHECKPOINT** | `git tag s10-dashboard`. |
| **NEXT-STAGE GATE** | Seed-value reconciliation signed off by the student. |

---

# STAGE 11 — RELEASE A QA GATE

| | |
|---|---|
| **STAGE-ID** | S11 |
| **OBJECTIVE** | Prove Release A is a complete, secure, error-free Inventory & Procurement Management System — before any Release B work starts. |
| **DEPENDENCIES** | S10 |
| **DOCUMENTS TO READ** | `08` (whole), `06` §17, `09` §11 |
| **REQUIREMENT IDs** | all A-MUST |
| **USE CASE IDs** | UC-01..UC-15 |
| **TEST IDs** | every P0 test |
| **PRIMARY TOOL** | Codex (review) + Antigravity (browser QA) + Playwright |
| **MODEL EFFORT** | HIGH |
| **IMPLEMENTATION SCOPE** | No new features. Tests, fixes, seed script, E2E specs 1–6. |
| **FILES / FOLDERS** | `tests/**`, `e2e/**`, `scripts/seed.ts`, `docs/qa/test-run-release-a.md` |
| **DETAILED TASKS** | 1. Complete the rules suite to all ~45 assertions. 2. Complete command integration tests: 8 cases × every A command. 3. Write E2E specs 1–6. 4. Write `scripts/seed.ts` producing the canonical dataset in `16` §7. 5. Antigravity: all 7 roles × key screens; responsive 390/768/1280. 6. Codex full security review of rules + all commands. 7. Fix every Critical and High. 8. Record the run in `docs/qa/test-run-release-a.md` with date, commit and environment. |
| **ACCEPTANCE CRITERIA** | **GATE-A: every P0 test green.** Zero Critical, zero High. Tenant isolation, RBAC and idempotency all proven by automated tests. No unhandled console error on the canonical flow. The seed script is reproducible from empty. |
| **VALIDATION** | `npm run verify && npm run e2e` |
| **EXPECTED OUTPUT** | A dated QA report and a full screenshot set. |
| **STOP CONDITIONS** | **If GATE-A does not pass on Day 9, Release B is cancelled** and Days 10–12 are spent on Release A hardening plus the report. This is a decision, not a failure. |
| **CHECKPOINT** | `git tag release-a`. |
| **NEXT-STAGE GATE** | Student's explicit written go/no-go for Release B in `docs/qa/`. |

---

# STAGE 12 — Business connections

| | |
|---|---|
| **STAGE-ID** | S12 |
| **OBJECTIVE** | Two StockFlow organizations can find each other by handle and form a directional, auditable relationship. |
| **DEPENDENCIES** | S11 passed |
| **DOCUMENTS TO READ** | `11` §23, `02` §4.8, `07` §15, `04` SC-11 |
| **REQUIREMENT IDs** | FR-NET-001..007, FR-NET-018, BR-011 |
| **USE CASE IDs** | UC-16 |
| **TEST IDs** | T-NET-01..06, T-NET-12, T-SEC-12..14 |
| **PRIMARY TOOL** | Claude Code |
| **MODEL EFFORT** | HIGH |
| **IMPLEMENTATION SCOPE** | `connection.request/respond/disable`, canonical + projection writes, discovery UI, connections list and detail, notifications. |
| **FILES / FOLDERS** | `functions/src/commands/connection.ts`, `src/features/network/connections/**` |
| **DETAILED TASKS** | 1. Deterministic `connectionId` and `txn.create` uniqueness. 2. Self-connection rejection. 3. Both org projections written in the same transaction. 4. Discovery by exact handle using the public directory `get`. 5. Business card + Connect as Supplier. 6. Incoming requests with accept/reject. 7. Disable with confirmation. 8. Notifications to the counterparty. 9. IDX-14. |
| **ACCEPTANCE CRITERIA** | SC-11 passes. A duplicate directional request is impossible. Disabling blocks new work but preserves history. A third organization cannot read either projection. |
| **VALIDATION** | `npm run test:int -- connection && npm run test:rules` |
| **EXPECTED OUTPUT** | Two-organization screenshots. |
| **STOP CONDITIONS** | Any cross-tenant leak → stop Release B. |
| **CHECKPOINT** | `git tag s12-connections`. |
| **NEXT-STAGE GATE** | T-SEC-12..14 green. |

---

# STAGE 13 — Partner catalog

| | |
|---|---|
| **STAGE-ID** | S13 |
| **OBJECTIVE** | A supplier publishes a deliberately limited projection of its products; connected buyers can read only that. |
| **DEPENDENCIES** | S12 |
| **DOCUMENTS TO READ** | `11` §7, `06` §11, `02` §4.8, `07` §16, `04` SC-12 |
| **REQUIREMENT IDs** | FR-NET-008, FR-NET-009, SEC-009, BR-021 |
| **USE CASE IDs** | UC-17 |
| **TEST IDs** | T-NET-07, T-SEC-10, T-SEC-11 |
| **PRIMARY TOOL** | Claude Code |
| **MODEL EFFORT** | HIGH |
| **IMPLEMENTATION SCOPE** | `partnerCatalog.publish/unpublish/list/lookupBySku`, supplier publishing table, buyer browse view. |
| **FILES / FOLDERS** | `functions/src/commands/partnerCatalog.ts`, `src/features/network/catalog/**` |
| **DETAILED TASKS** | 1. Publish dialog copying only the allow-listed fields, with the explicit "buyers see these fields, not your private inventory" statement. 2. Partner SKU normalisation and uniqueness within the published catalog. 3. `list` and `lookupBySku` callables authorizing via the ACTIVE connection. 4. Buyer browse screen backed by the callable. 5. Unpublish. 6. IDX-16. |
| **ACCEPTANCE CRITERIA** | SC-12 passes. A connected buyer reads catalog items and **cannot** read the supplier's products, balances, movements, members, partners, settings or audit. An unconnected organization gets `permission-denied` from the callables. |
| **VALIDATION** | `npm run test:int -- catalog && npm run test:rules` |
| **EXPECTED OUTPUT** | Side-by-side screenshots of what the supplier sees vs what the buyer sees — high-value security evidence for the report. |
| **STOP CONDITIONS** | Any private field visible to a buyer. |
| **CHECKPOINT** | `git tag s13-catalog`. |
| **NEXT-STAGE GATE** | T-SEC-10/11 green. |

---

# STAGE 14 — Product mapping (the signature workflow)

| | |
|---|---|
| **STAGE-ID** | S14 |
| **OBJECTIVE** | The differentiating workflow: validate a supplier's real code, confirm semantics, define the conversion. |
| **DEPENDENCIES** | S13 |
| **DOCUMENTS TO READ** | `11` §24, `07` §17, `02` §4.8, `04` SC-13 |
| **REQUIREMENT IDs** | FR-NET-010..016, BR-008..010 |
| **USE CASE IDs** | UC-18 |
| **TEST IDs** | T-NET-08..11, T-NET-13, T-NET-14 |
| **PRIMARY TOOL** | Claude Code |
| **MODEL EFFORT** | HIGH |
| **IMPLEMENTATION SCOPE** | `mapping.create/disable`, the five-step wizard with every error state, mappings list, product-detail mappings. |
| **FILES / FOLDERS** | `functions/src/commands/mapping.ts`, `src/features/network/mappings/**` |
| **DETAILED TASKS** | 1. Wizard: supplier → SKU → matched card → semantic confirmation → conversion with live preview → save. 2. Save disabled until every condition passes. 3. All seven error states from `07` §17. 4. Backend re-validation in the order given in `11` §24. 5. Store stable IDs plus a SKU snapshot, never the typed string as the link. 6. Disable mapping. 7. IDX-15. |
| **ACCEPTANCE CRITERIA** | SC-13 passes. An invalid SKU yields no result and a disabled Save. A valid SKU without semantic confirmation creates nothing. A factor of zero or less is rejected. A connection disabled between page load and submit is caught by the backend. |
| **VALIDATION** | `npm run test:int -- mapping` |
| **EXPECTED OUTPUT** | A screenshot of every wizard state — this is the workflow most worth showing a marker. |
| **STOP CONDITIONS** | The typed SKU is stored as the link rather than resolved to an ID. |
| **CHECKPOINT** | `git tag s14-mapping`. |
| **NEXT-STAGE GATE** | All mapping error states demonstrated. |

---

# STAGE 15 — Connected purchase orders

| | |
|---|---|
| **STAGE-ID** | S15 |
| **OBJECTIVE** | A purchase order that crosses a tenant boundary safely, with each side's ledger moved only by its own actions. |
| **DEPENDENCIES** | S14 |
| **DOCUMENTS TO READ** | `11` §25, `02` §4.9, `07` §18, `04` SC-14..SC-16 |
| **REQUIREMENT IDs** | FR-CPO-001..014, INV-08..12 |
| **USE CASE IDs** | UC-19, UC-20, UC-21 |
| **TEST IDs** | T-CPO-01..14, T-SEC-15 |
| **PRIMARY TOOL** | Claude Code; **Codex review mandatory** |
| **MODEL EFFORT** | HIGH — the most complex stage |
| **IMPLEMENTATION SCOPE** | Five `cpo.*` commands, canonical + dual projections, buyer and supplier views, shared timeline, connected receiving. |
| **FILES / FOLDERS** | `functions/src/commands/cpo.ts`, `src/features/procurement/connected/**` |
| **DETAILED TASKS** | 1. Connected draft in the buyer tenant only. 2. `cpo.submit` freezing the full dual-identity snapshot and creating the canonical document plus both projections. 3. `cpo.respond` accept/reject. 4. `cpo.ship` writing supplier outbound movements only. 5. `cpo.receive` writing buyer inbound movements only, entered in supplier order units and converted. 6. `cpo.cancel` for DRAFT/SUBMITTED only. 7. Dual-representation UI on every screen (your item / supplier item / conversion). 8. Shared, actor-attributed timeline on both sides. 9. Notifications on every transition. |
| **ACCEPTANCE CRITERIA** | SC-14, SC-15, SC-16 pass. Buyer stock is unchanged at SHIPPED. Supplier stock is unchanged by the buyer's receipt. Replaying ship or receive creates no duplicate movement. Cancelling after ACCEPTED is blocked. Later product or mapping edits do not alter the snapshot. |
| **VALIDATION** | `npm run test:int -- cpo && npm run e2e -- connected` |
| **EXPECTED OUTPUT** | A full two-organization round-trip recording. |
| **STOP CONDITIONS** | Either party's ledger moved by the other's action → stop; this violates the project's central security claim. |
| **CHECKPOINT** | `git tag s15-connected-po`. |
| **NEXT-STAGE GATE** | Codex review complete; INV-10 and INV-11 proven by test. |

---

# STAGE 16 — RELEASE B QA GATE

| | |
|---|---|
| **STAGE-ID** | S16 |
| **OBJECTIVE** | Prove the connected-business subset is as trustworthy as Release A, or freeze the largest stable subset. |
| **DEPENDENCIES** | S15 |
| **DOCUMENTS TO READ** | `08` §11–12, §17; `06` §17 |
| **REQUIREMENT IDs** | all implemented B-MUST |
| **USE CASE IDs** | UC-16..UC-21 |
| **TEST IDs** | all P1 |
| **PRIMARY TOOL** | Codex + Antigravity + Playwright |
| **MODEL EFFORT** | HIGH |
| **IMPLEMENTATION SCOPE** | Tests and fixes only. E2E spec 7. |
| **DETAILED TASKS** | 1. Complete P1 rules and integration tests. 2. E2E spec 7 (two-organization round trip). 3. Antigravity buyer/supplier walkthroughs. 4. Codex review of all B commands. 5. Fix Critical and High. 6. `docs/qa/test-run-release-b.md`. |
| **ACCEPTANCE CRITERIA** | **GATE-B-LITE: every implemented P1 test green.** Zero Critical, zero High. If a feature cannot be made green, it is **removed from the UI and documented as future scope** rather than shipped broken. |
| **VALIDATION** | `npm run verify && npm run e2e` |
| **STOP CONDITIONS** | An unfixable Critical → disable that feature and re-run the gate. |
| **CHECKPOINT** | `git tag release-b-lite`. |
| **NEXT-STAGE GATE** | **Feature freeze. From here: defects, polish, deployment and report only.** |

---

# STAGE 17 — UI polish, responsive, accessibility

| | |
|---|---|
| **STAGE-ID** | S17 |
| **OBJECTIVE** | Make it feel finished and make it usable by everyone. |
| **DEPENDENCIES** | S16 (or S11 if B was cut) |
| **DOCUMENTS TO READ** | `07` §22–25, `17` §7, `10` TECH-058 |
| **REQUIREMENT IDs** | NFR-001, NFR-002, NFR-009, NFR-015, NFR-016 |
| **TEST IDs** | T-UI-01..10, T-PERF-01..03 |
| **PRIMARY TOOL** | Claude Code + Antigravity |
| **MODEL EFFORT** | MED |
| **DETAILED TASKS** | 1. Verify loading / empty / error / success / permission-denied on every P0 and P1 screen. 2. Responsive sweep at 390 / 768 / 1280 / 1920, prioritising login, dashboard, product, adjustment, PO detail, receiving. 3. Keyboard pass: tab order, focus rings, focus restoration after dialogs, skip link. 4. Contrast audit against the tokens. 5. Chart text summaries. 6. Global error boundary with a recoverable UI. 7. Remove every dead route, TODO and console statement. 8. Lighthouse on the public home page and the dashboard; record the numbers. 9. Bundle report; lazy-load charts. |
| **ACCEPTANCE CRITERIA** | Lighthouse Performance ≥ 90 and Accessibility ≥ 90 on both target pages. No unhandled console error anywhere on the canonical flow. Every P0 screen usable at 390 px. Initial JS bundle < 350 kB gzipped. |
| **VALIDATION** | `npx lighthouse`, Antigravity responsive pass, `npm run build -- --report` |
| **EXPECTED OUTPUT** | Lighthouse reports and the bundle report saved into `docs/evidence/performance/`. |
| **STOP CONDITIONS** | none — this stage is timeboxed and stops when the day ends. |
| **CHECKPOINT** | `git tag s17-polish`. |

---

# STAGE 18 — Production deployment

| | |
|---|---|
| **STAGE-ID** | S18 |
| **OBJECTIVE** | A live, seeded, verified system at a URL the marker can open. |
| **DEPENDENCIES** | S17 |
| **DOCUMENTS TO READ** | `11` §28–29, `10` TECH-066 |
| **REQUIREMENT IDs** | NFR-005, NFR-013, ADM-003 |
| **TEST IDs** | T-NFR-06..09 |
| **PRIMARY TOOL** | Student + Claude Code |
| **MODEL EFFORT** | MED |
| **DETAILED TASKS** | 1. Deploy in the mandated order: indexes → rules → functions → hosting. 2. Add the Hosting domains to Auth Authorized Domains. 3. Seed production with the canonical demo dataset. 4. Run the full post-deploy smoke checklist. 5. Verify from a signed-out private window that no private collection is readable. 6. Warm every function before any recording. 7. Rehearse `firebase hosting:rollback` once. 8. README: setup, scripts, architecture, live URL, test instructions. |
| **ACCEPTANCE CRITERIA** | The production URL loads with no console error. Both sign-in methods work in production. A full private-PO cycle completes in production. A signed-out client is denied. Dashboard numbers match the seed table. |
| **VALIDATION** | Manual smoke checklist recorded in `docs/qa/production-smoke.md`. |
| **STOP CONDITIONS** | Google sign-in fails in production → fix Authorized Domains before continuing. |
| **CHECKPOINT** | `git tag deployed-v1`. |

---

# STAGE 19 — Final QA and evidence capture

| | |
|---|---|
| **STAGE-ID** | S19 |
| **OBJECTIVE** | Everything the report needs, captured from the real system, once. |
| **DEPENDENCIES** | S18 |
| **DOCUMENTS TO READ** | `08` §19–20, `16` (whole) |
| **TEST IDs** | full regression list |
| **PRIMARY TOOL** | Student + Antigravity |
| **MODEL EFFORT** | LOW |
| **DETAILED TASKS** | 1. Run the 15-step final regression from `08` §20 against production. 2. Capture every screenshot listed in `16` §4. 3. Export test-run outputs, coverage and CI history. 4. Finalise `known-issues.md` honestly. 5. Draw the architecture, data and security diagrams. 6. Record the demo per the script in `16` §9. 7. **Verify the GitHub repository loads while signed out.** |
| **ACCEPTANCE CRITERIA** | Every artifact in `16` exists on disk. The regression passes with no manual database correction. |
| **STOP CONDITIONS** | A Critical defect found in production → fix, redeploy, re-run. |
| **CHECKPOINT** | `git tag final-qa`. |

---

# STAGE 20 — Report, demo, submission

| | |
|---|---|
| **STAGE-ID** | S20 |
| **OBJECTIVE** | Convert 13 days of work into the marks the rubric actually awards. |
| **DEPENDENCIES** | S19 |
| **DOCUMENTS TO READ** | `16` (whole), the original brief |
| **REQUIREMENT IDs** | ADM-001..008, CW-11..CW-21 |
| **PRIMARY TOOL** | Student writing; ChatGPT/Claude for structure and critique only |
| **MODEL EFFORT** | HIGH (student), MED (assistance) |
| **DETAILED TASKS** | 1. Write the report to the structure in `16` §2. 2. Insert the GitHub URL and the live URL. 3. Technologies section explaining *why*, referencing `10`. 4. Problems-and-solutions section from the running log. 5. Reflection. 6. Testing, security, performance and adaptability evidence sections. 7. Individual-contribution evidence: commit history, CI runs, decision log. 8. References in the required style. 9. Turnitin/Draft Coach check. 10. **Export to PDF and rename to the index number.** 11. Submit the report and the source code to the DLE. 12. Reopen the submitted PDF to confirm it is intact. |
| **ACCEPTANCE CRITERIA** | Every submission-gate checkbox in `09` §11 is ticked. |
| **STOP CONDITIONS** | GitHub not publicly accessible — **this is the documented zero-mark risk in the brief.** |
| **CHECKPOINT** | `git tag submission`. |

---

# 21. Dependency graph

```text
S0 ─► S1 ─► S2 ─► S3 ─► S4 ─┬─► S5 ─┬─► S6 ─┬─► S8 ─► S9 ─► S10 ─► S11(GATE A)
                            │       │       │                          │
                            └─► S7 ─┘       └──────────────────────────┤
                                                                       ▼
                                             S12 ─► S13 ─► S14 ─► S15 ─► S16(GATE B)
                                                                            │
                                                              S17 ─► S18 ─► S19 ─► S20
```

**Explicit prohibitions**

- Stock adjustment cannot begin before Product, Warehouse, Membership and the command framework exist (S3, S4, S5).
- Receiving cannot begin before the stock ledger and private POs exist (S6, S8).
- Connected PO cannot begin before Connection, Partner Catalog, Mapping, and the private PO/receiving foundations exist (S8, S9, S12, S13, S14).
- **No Release B work may begin before GATE-A passes.** Not "mostly passes".
- Dashboard cannot be built before the ledger, because every KPI derives from it.
- E2E tests are not written before S11, because they would be rewritten.

---

# 22. Slippage protocol

Checked at the end of every day against the calendar in §0.

| Situation | Action |
|---|---|
| Half a day behind | Absorb it. Drop charts (`10` TECH-015 names them as the first cut). |
| One day behind at the end of Day 6 | Cut Release C entirely (it is already the default). Reduce E2E from 8 specs to 5. |
| One day behind at the end of Day 8 | Reduce Release B to **Connection + Partner Catalog + Mapping only** — CUT-3 in `03` §9. Connected PO is dropped. This still demonstrates the differentiator. |
| GATE-A not passed on Day 9 | **Cancel Release B.** Spend Days 10–12 hardening Release A and writing the report. A polished Release A scores better than a broken A+B. |
| Two days behind at the end of Day 10 | Freeze whatever is green, disable everything else in the UI, jump straight to S17. |
| Anything behind after Day 12 | Stop building. The remaining days are QA, deployment and the report. **The report is worth marks; an extra half-feature is not.** |

**Non-negotiable:** the report and the deployment are never the thing that gets compressed. They are scheduled before the optional features, and features are cut to protect them.

---

# 23. Daily rhythm

| Time | Activity |
|---|---|
| Start | Read the stage entry. Read the documents it names. Do not start from memory. |
| Build | Claude Code implements one task from `13` at a time. |
| Verify | `npm run verify` after every task. |
| Commit | One task, one commit, conventional message referencing the task id. |
| Review | Codex reviews any task touching security, money, quantity or cross-tenant logic. |
| Evidence | Capture the screenshot or test output listed in `16` for that stage **now**, not later. |
| End of day | Update `docs/PROGRESS.md`: what shipped, what slipped, one problem-and-solution entry. Push. Confirm CI is green. |

The end-of-day log is not bureaucracy: it is the raw material for the reflection section, and reconstructing it from memory on Day 14 is how good projects lose marks on a criterion worth half the total.
