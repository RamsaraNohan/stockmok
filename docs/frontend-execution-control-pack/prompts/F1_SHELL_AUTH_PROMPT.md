# F1 Shell, Auth, Workspace, and Onboarding Prompt

**PRIMARY ROUTING:** Codex Sol high for router/auth/services/tests; Gemini 3.6 Flash High for shell/auth JSX; Antigravity Flash High for browser QA.
**WORKTREE/BRANCH:** `C:\Users\ramsa\stockflow-worktrees\frontend` / `feature/frontend`.

## Purpose and surfaces

Implement SCREEN-001..008, 029,030,041,043,052 and ROUTE-001..009/030 behavior using frozen Gate 5/10-12/14 composition.

## Read/reference before coding

Pack 02-06,09-14; phase F1 file pack; UI 19,20,22,23,28; DB-03 F1 rows; DB-04 Q-001..010; DB-05; DB-06 C-01/03/06; shared user/org/membership/notification schemas. Inspect exact frozen visual artifacts and corresponding current visual rows.

## Dependencies, reads, writes

Q-001..008; Q-004/005 notification menu; Auth providers; safe self profile/lastSeenAt/notification-read writes; C-01, C-03, C-06. Backend live wiring is gated until promotion/integration—do not simulate command success.

## Allowed/forbidden scope

Frontend routes/layouts/guards/providers/services/components/tests/evidence only. No shared/C2/backend/Rules/query/index/design edits; no role from editable input; no protected query before guard success.

## Implementation requirements

Implement public/auth layouts, membership dispatch for 0/1/many, tenant-scoped OrgLayout, workspace switch cache clearing, role/feature-aware shell, permission/404 outcomes, branded states 009..016, invite states 040/041, mobile drawer and Q-005 capped badge semantics.

## Responsive/accessibility

Desktop sidebar; under 1024 drawer; no bottom tabs. Test visible labels, neutral auth errors, keyboard-only auth/onboarding, drawer and modal focus trap/return, 44px mobile targets.

## Tests/browser

Unit/component/service guard tests; direct URL denial executes no protected operation; sign-out clears private cache. Browser 390/768/1280/1920; no tenant flash/console error.

## Output/checkpoint/stop

Update F1 evidence; commit `feat(frontend): complete F1 shell auth and onboarding`; stop. Stop for missing backend authority, new query/path need, tenant leak, or unresolved frozen visual conflict. Quota handoff at a complete route/guard or screen-state family with focused tests.

## Executable contract fields

- **TOOL / MODEL / EFFORT:** Codex Sol high for services; Flash High for UI; Antigravity Flash High browser reviewer.
- **WORKTREE / BRANCH:** frontend worktree / `feature/frontend`.
- **CURRENT DEPENDENCIES:** F0; backend promotion for live C-01/C-03/C-06 wiring.
- **QUERY IDS:** Q-001..008. **COMMAND IDS:** C-01, C-03, C-06.
- **ALLOWED SCOPE / FORBIDDEN SCOPE:** listed above.
- **IMPLEMENTATION / RESPONSIVE / ACCESSIBILITY REQUIREMENTS:** listed above.
- **TESTS / BROWSER QA / EXPECTED OUTPUT:** listed above.
- **COMMIT CHECKPOINT / STOP CONDITIONS / QUOTA HANDOFF CONDITIONS:** listed above.
