# Frontend Definition of Done

## Task done

- Behavior matches the controlling route/screen/query/command/RBAC/visual contract.
- Loading, empty, error, denied, submitting, confirmation and success behavior is covered.
- Focused tests and affected browser viewports pass; no console error.
- Diff is within allowed paths and contains no secret or authority change.

## Phase done

- Every manifest task is `COMPLETE`; all phase screens/routes/forms/tables/components are accounted for.
- Phase typecheck, lint, unit/component/service tests and browser checks pass with actual results recorded.
- Responsive and accessibility requirements for phase surfaces pass.
- One coherent local checkpoint commit and handoff exist; no push/deploy.

## F0-F6 frontend freeze

- 53 screens, 36 routes, 24 forms, 27 tables, 25 components and 44 states reconcile.
- All frontend reads use frozen C2 interfaces; all writes use one of six direct surfaces or one of 38 active commands.
- No P0/P1 defects; no unauthorized feature; independent reviewer authored none of the implementation under review.
- SCREEN-038 limitation remains explicit until amended; it cannot be waived by UI completion.

## F7 release candidate

- Exact promoted lane SHAs integrated; full emulator and capped E2E gates pass.
- Canonical seed and chain reconcile; tenant/RBAC/privacy flows pass; measured NFR budgets recorded.
- Integration evidence is complete. Production deployment remains separately owner-authorized.
