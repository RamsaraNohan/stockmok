# F2 Dashboard and Inventory Prompt

**TASK ROUTING:** dashboard composition Gemini 3.1 Pro High; tables/forms Gemini 3.6 Flash High; C2 adapters/tests Codex Sol high; Antigravity visual repair Flash/Pro.
**WORKTREE/BRANCH:** frontend worktree / `feature/frontend`.

## Purpose and surfaces

Implement SCREEN-009..015 and 044..047, ROUTE-009..015, inventory components and role-specific dashboards.

## Read/reference before coding

Pack 02,04-14; F2 file pack; Gate 6 **new** selected by SHA plus Design System/Gates 11/12/14; DB-03 rows; DB-04 product matrix/dashboard aggregates; DB-06 C-09..12/C-35a/b/C-36/37; frozen C2 registry/repositories/product-matrix interfaces; UI 19-24/28 with conflict decisions applied.

## Reads/commands

Q-011..021b, Q-033, Q-044, Q-048, Q-050..055, Q-058, Q-060, Q-063..065, Q-074..078/Q-074s. C-09..12, C-35a/b, C-36/37; sanctioned category/warehouse create/update only.

## Requirements

Use all 32 approved product-list shapes; cursor pagination; declared sorting; archived Excluded/Only. Product list columns follow DB-03, not stale UI-final. Dashboard role-gates every panel/query, Needs Attention is sequential Q-021a then Q-021b, warehouse value reconciles to KPI, product detail has exactly four tabs.

## Responsive/accessibility

Role dashboards stack at 390; data tables become labelled cards; filters collapse without losing active state; KPI cards retain meaningful links and accessible labels.

## Tests/browser

Test all role compositions, empty/per-panel errors, cursor/filter scope, all product matrix modes, CRUD/archive/refusal UI, canonical figures. Browser all four viewports; measure dashboard/product-list reads but report them as evidence, not assumption.

## Scope/checkpoint/stop

Frontend-owned feature/service/test/evidence paths only. Commit `feat(frontend): complete F2 dashboard and inventory`. Stop for ad-hoc query/index, stale columns, shared-schema edit, client-side archive authorization, or visual redesign. Quota handoff per dashboard panel, table/form family or adapter+tests.

## Executable contract fields

- **TOOL / MODEL / EFFORT:** Pro High dashboard; Flash High repetitive UI; Codex Sol high adapters/tests.
- **WORKTREE / BRANCH:** frontend worktree / `feature/frontend`.
- **CURRENT DEPENDENCIES:** F1, frozen C2, promoted backend for live commands.
- **QUERY IDS / COMMAND IDS:** exact sets listed above and in manifest F2 tasks.
- **ALLOWED SCOPE:** frontend dashboard/inventory/services/tests/evidence. **FORBIDDEN SCOPE:** shared/C2/backend/Rules/indexes/frozen assets.
- **IMPLEMENTATION REQUIREMENTS:** role dashboards and frozen product-matrix behavior.
- **RESPONSIVE / ACCESSIBILITY REQUIREMENTS:** labelled mobile cards, filter collapse, KPI/table/form semantics.
- **TESTS / BROWSER QA:** listed above.
- **EXPECTED OUTPUT / COMMIT CHECKPOINT:** F2 evidence and named phase commit.
- **STOP CONDITIONS / QUOTA HANDOFF CONDITIONS:** listed above.
