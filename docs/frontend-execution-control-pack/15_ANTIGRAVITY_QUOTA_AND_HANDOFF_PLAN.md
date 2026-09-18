# Antigravity Quota and Handoff Plan

Quota exhaustion is a normal checkpoint event.

## Switch threshold

Hand off before the remaining quota is insufficient to: finish the current component/screen, run its focused tests, inspect the diff, update status, and create the allowed checkpoint commit. Never start a second major screen below that threshold.

## Safe handoff points

1. One component with stories/tests or one complete screen state set.
2. One service adapter with unit tests.
3. One route family with guard tests.
4. One viewport/browser evidence set with defects recorded.
5. A phase checkpoint only when all phase gates pass.

## Minimum checkpoint

- Working tree diff contains only allowed paths.
- Focused typecheck/tests pass or the exact failure is recorded.
- Status states completed/in-progress/not-started; no false completion.
- Current file list, test commands/results, screenshots/evidence and unresolved decisions are recorded.
- A commit is made only when the unit is coherent and gates pass; otherwise leave a named, reviewed handoff without staging unrelated work.

## Fallback chain

- Visual composition: Pro High -> Flash High -> Codex for implementation correctness -> return to Antigravity for browser QA.
- Repetitive JSX: Flash High -> Flash Medium -> Codex.
- TypeScript/adapters/tests: Codex -> Flash High -> Sonnet Thinking for a difficult defect.
- Integration defect: Codex extra/high -> Opus Thinking or Pro High independent investigation.

The receiving model reads only the relevant prompt, task record, phase files, current diff/status and handoff. It must not re-derive the whole architecture.
