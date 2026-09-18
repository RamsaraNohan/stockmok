# F5 Administration, Notifications, Reports, and Settings Prompt

**TASK ROUTING:** Codex Sol high for report/query adapters/tests; Flash High for team/settings/notification JSX; Pro/Flash High chart and browser QA.
**WORKTREE/BRANCH:** frontend worktree / `feature/frontend`.

## Purpose and surfaces

Implement SCREEN-025..028,048..050,052 and ROUTE-026..029.

## Required authority

Read pack 02-16 and F5 pack; DB-03 F5 rows; DB-04 Q-004/005/009/010/report families; DB-06 C-02/04/05/07/08; UI 19-24/28 conflicts; Gate 10, Gate 6 `new`, Gates 11/12/14 and current assets.

## Reads/commands

Q-004..007,Q-009,010,Q-016,017,Q-061,061b,062,Q-074..076,Q-085..089. C-02,04,05,07,08; notification read flag; bounded in-browser CSV only.

## Requirements

Team is one bounded joinedAt-ordered page with no stale search/role filter. Protect Owner. Display invite token once and never log/persist it. Q-005 uses exact initial count plus capped bounded listener and cache suppression. Stock report uses DB-03 columns/filters. PO chart uses five aggregations over identical filters, not page rows. Hide all mobile exports.

## Responsive/accessibility

Team/report tables become labelled cards where frozen; report tabs keyboard accessible and RBAC filtered; charts have text/table alternatives; invitation and settings controls have correct focus/labels.

## Tests/browser

Owner/Admin differences, invitation lifecycle, Q-005 0/1/49/50/57 and transitions, notification mark-read isolation, all report role matrices/filters/CSV, settings/network flag. Browser four viewports.

## Checkpoint/stop

Commit `feat(frontend): complete F5 administration notifications and reports`. Stop for token exposure, page-sample chart, mobile export, undeclared Team query/filter or new backend reason. Quota handoff per admin/report feature with tests.

## Executable contract fields

- **TOOL / MODEL / EFFORT:** Codex Sol high report/realtime adapters/tests; Flash High admin UI; Pro/Flash chart QA.
- **WORKTREE / BRANCH:** frontend worktree / `feature/frontend`.
- **CURRENT DEPENDENCIES:** F4; frozen C2; promoted backend for live admin commands.
- **QUERY IDS / COMMAND IDS:** exact sets listed above and in manifest F5 tasks.
- **ALLOWED SCOPE:** frontend admin/notifications/reports/services/tests/evidence. **FORBIDDEN SCOPE:** token logs, mobile export, shared/C2/backend/Rules/frozen assets.
- **IMPLEMENTATION REQUIREMENTS / RESPONSIVE REQUIREMENTS / ACCESSIBILITY REQUIREMENTS:** listed above.
- **TESTS / BROWSER QA / EXPECTED OUTPUT:** listed above.
- **COMMIT CHECKPOINT / STOP CONDITIONS / QUOTA HANDOFF CONDITIONS:** listed above.
