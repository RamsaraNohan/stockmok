# Frontend Quota Handoff Prompt

Use this prompt when a model must hand off before a phase finishes.

## Required handoff record

- Phase/task ID and task class.
- Tool/model/effort used and remaining quota condition.
- Worktree, branch and current HEAD.
- Exact changed/untracked paths and allowed-scope confirmation.
- Completed behavior/screens/states and what remains.
- Commands run with actual results; failing command/error verbatim when unresolved.
- Browser viewports, screenshots/evidence and console/a11y status.
- Query IDs, command IDs and frozen visual references already consumed.
- Open blockers/decisions; whether SCREEN-038/backend promotion affects the task.
- Safe next action and recommended primary/fallback/reviewer model.

## Before handoff

Finish the smallest coherent component/screen/adapter unit, run focused tests, inspect the diff and update task status. Commit only if that unit is coherent and green under the commit policy. Never claim phase completion, re-derive the whole architecture, broaden scope, or spend remaining quota on cosmetic cleanup that leaves behavior untested.

The receiver reads the relevant phase prompt, task record, required-files pack, handoff and current diff—nothing broader unless a reported conflict requires it.
