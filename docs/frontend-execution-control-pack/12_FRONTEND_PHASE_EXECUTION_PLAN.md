# Frontend Phase Execution Plan

## Common controls

F0-F6 use `C:\Users\ramsa\stockflow-worktrees\frontend` on `feature/frontend`. Each phase reads its exact pack in file 14, changes only frontend-owned/config/test/evidence paths declared by its prompt, runs local gates, records evidence, commits one coherent checkpoint, and stops. No phase edits shared, C2, backend, Rules, frozen authority or canonical visual assets.

## F0 — intake, scaffold, authority verification

- **Purpose:** revalidate locks; add approved React/Vite/TypeScript/Tailwind/test scaffold and frontend directory architecture without feature screens.
- **Screens/routes:** registry only; no production screen completion claim.
- **Components:** token foundation and empty component entry points only.
- **Prerequisites:** owner-approved execution pack; clean `feature/frontend`; Node 22.
- **Tests:** dependency allow-list, strict typecheck/lint/build, test harness smoke, no client import of Zone 4/Firebase from components.
- **Browser:** Vite shell loads with emulator ribbon in emulator mode; no console error.
- **Checkpoint:** `feat(frontend): complete F0 scaffold and authority gate`.
- **Stop:** dependency conflict, need to edit shared/config owned by another lane, authority contradiction, or unexpected tracked changes.

## F1 — shell, routing, auth, workspace, onboarding

- **Screens:** 001-008, 029, 030, 041, 043, 052.
- **Routes:** ROUTE-001..009 and ROUTE-030/404 behavior.
- **Components:** 001-008, 011, 014-021, 023, 025; shell compositions.
- **Reads/writes:** Q-001..008; Auth; safe user/notification writes; C-01, C-03, C-06.
- **Tests/browser:** auth dispatch 0/1/many memberships, tenant/role guard, branded states 009..016, invite states 040/041, keyboard drawer/dialog, 390/768/1280/1920.
- **Checkpoint:** `feat(frontend): complete F1 shell auth and onboarding`.
- **Stop:** backend not promoted for a command-backed path—finish UI/adapter contract and gate live wiring; never emulate command success.

## F2 — dashboard and inventory

- **Screens:** 009-015, 044-047.
- **Routes:** ROUTE-009..015.
- **Components:** KPI, table, pagination, tabs, filters, page headers, inventory forms.
- **Reads/writes:** product matrix and dashboard queries; C-09..12, C-35a/b, C-36/37; sanctioned category/warehouse direct writes.
- **Tests/browser:** all role dashboards, 32 product-list shapes through C2, cursor/filter scope, zero-row and per-panel failure, product/detail/category/warehouse actions, canonical figures and read budgets.
- **Checkpoint:** `feat(frontend): complete F2 dashboard and inventory`.
- **Stop:** ad-hoc Firestore query/index, stale UI-final columns, shared-schema change, backend-only guard in the client.

## F3 — stock, movements, private partners/PO, receiving

- **Screens:** 016-024, 042, 053.
- **Routes:** ROUTE-016..025.
- **Components:** timeline, steppers, receiving rows, quantity/money fields, confirmations.
- **Reads/writes:** Q-014..018, Q-015r, Q-022..040, Q-083, Q-084a/b; C-13..17, C-33, C-38; strict private-draft direct writes.
- **Tests/browser:** zero opening balance, positive adjustments, >50% confirm, transfer same-room/negative refusal, immutable movement ledger, private PO draft/order/cancel/partial/final receive, mobile receiving.
- **Checkpoint:** `feat(frontend): complete F3 stock and private procurement`.
- **Stop:** decimal persistence, optimistic stock, client archive guard, direct balance/movement write.

## F4 — network, catalog, mapping, connected procurement

- **Screens:** 031-040, 051 and connected variants of 023/024.
- **Routes:** ROUTE-031..036 plus reused ROUTE-017..021.
- **Reads/writes:** Q-001,011,014,017,018,034,036..047; C-18..31 and C-34 only within its frozen header behavior.
- **Tests/browser:** feature flag, exact-handle discovery, cross-tenant privacy, catalog callable boundary, seven mapping refusals, connection state/actions, one-shipment supplier flow, supplier-unit partial receiving.
- **Checkpoint:** `feat(frontend): complete F4 network and connected procurement`.
- **Stop:** SCREEN-038 line persistence remains gated; no raw write, new command, C-34 widening or frontend-only persistence.

## F5 — team, notifications, reports, settings

- **Screens:** 025-028, 048-050, 052.
- **Routes:** ROUTE-026..029.
- **Reads/writes:** Q-004..007,009,010,016,017,061,061b,062,074..076,085..089; C-02,04,05,07,08; notification read flag; bounded CSV.
- **Tests/browser:** Owner protection, one-time invite link, Q-005 exact/capped states, report tab RBAC, filtered CHART-003 aggregations, desktop-only export, settings feature-flag effects.
- **Checkpoint:** `feat(frontend): complete F5 administration notifications and reports`.
- **Stop:** raw token persistence/logging, page-1 chart, mobile export, undeclared Team filtering.

## F6 — responsive, accessibility, visual and frontend regression

- **Scope:** all 53 screens, 36 routes, 24 forms, 27 tables, 25 components and 44 states.
- **Work:** close responsive gaps; keyboard/focus/labels/table/dialog/chart semantics; visual comparison; browser console; bundle and read-budget evidence.
- **Tests/browser:** canonical viewport matrix, axe/manual keyboard, component/frontend regression, Playwright UI subset, Lighthouse and bundle analysis.
- **Checkpoint:** `test(frontend): complete F6 responsive accessibility and visual QA` followed by independent frontend review/freeze evidence.
- **Stop:** any frozen-design change request, cross-contract defect, P0/P1, or incomplete evidence.

## F7 — integrated E2E and release-candidate QA

- **Worktree/branch:** later `C:\Users\ramsa\stockflow-worktrees\integration`, `integration/parallel-implementation`.
- **Prerequisites:** frozen C2, promoted/frozen backend, reviewed frontend freeze, owner authorization to create/use integration checkout.
- **Work:** merge promoted lane commits through controlled Git integration; replace gated adapters with real imports/wiring; run emulator canonical flows and release-candidate gates.
- **Tests:** eight capped Chromium specs, security/backend/data regressions, canonical seed/chain, cross-role/cross-org flows, NFR read budgets.
- **Checkpoint:** integration evidence commit; no production deploy.
- **Stop:** backend still pending, SCREEN-038 amendment absent for full connected-draft save, merge conflict in frozen/shared authority, production credential/deploy request.
