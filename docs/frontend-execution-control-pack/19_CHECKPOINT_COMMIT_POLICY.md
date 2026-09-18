# Checkpoint and Commit Policy

## Commit boundaries

- One coherent task checkpoint or one completed phase; no unrelated cleanup.
- Conventional examples: `feat(frontend): complete F2 dashboard composition`, `test(frontend): verify F2 inventory browser states`, `docs(frontend): record F2 checkpoint`.
- Phase completion means implementation, focused/full local gates, browser evidence and status are all complete.

## Staging and review

1. Inspect `git status --short` and `git diff --name-only`.
2. Stage an explicit path allowlist; never `git add .` or a broad directory containing unrelated files.
3. Inspect `git diff --cached --name-only` and the cached diff.
4. Run the approved secret scan and relevant validation after staging.
5. Commit locally; do not push, merge, rebase or deploy without explicit authorization.

## Protected paths

No frontend phase independently changes `packages/shared/**`, `packages/data/**`, `functions/**`, `firestore.rules`, `firestore.indexes.json`, `docs/database-final/**`, `docs/implementation/**`, canonical design files, sibling worktrees or production configuration. Raise a narrow owner/owning-lane patch request instead.

## Handoff record

Every checkpoint states branch/SHA, allowed changed paths, tasks/screens completed, tests with actual results, browser evidence, blockers, quota state and the exact next task. Author completion is never represented as independent approval.
