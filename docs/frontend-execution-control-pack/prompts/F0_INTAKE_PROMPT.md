# F0 Intake and Scaffold Prompt

**TOOL/MODEL/EFFORT:** Codex / GPT-5.6 Sol / high; Flash High reviews visual-token scaffold.
**WORKTREE/BRANCH:** `C:\Users\ramsa\stockflow-worktrees\frontend` / `feature/frontend`.

## Purpose

Create only the approved React/Vite/TypeScript frontend scaffold, test harness, token foundation and directory/service boundaries. Do not implement feature screens.

## Read/reference before coding

Read `AGENTS.md`, pack files 00,02,03,12-14,19; current implementation checkpoint/status/ownership; control-pack 03,06,08,10,11,14,15; DB-00 A1, DB-02/03/04/06/09; design freeze/checkpoint/manifest; UI files 19-23,28,31; shared entrypoints and server-only path boundary. Confirm C2 frozen SHA and backend status.

## Dependencies and registries

Node 22; current lockfile; exact counts 53/36/24/27/25/44 and 92/67/38. No query or command is executed in F0.

## Allowed scope

Frontend package/scaffold, `src/**`, frontend test/config entries required by the frozen tech stack, `.env.example` additions without secrets, and F0 evidence. Modify root workspace config only where the frontend workspace requires it and the path is not owned by another lane; otherwise stop.

## Forbidden scope

Shared/C2/backend/Rules/indexes/frozen docs/design assets, deploy, push, merge/rebase, extra dependencies.

## Requirements

React 19 + Vite 8 + TypeScript 5.9 strict; React Router; Tailwind v4; approved Radix primitives only; TanStack Query; Firebase modular client; Vitest/RTL/Playwright setup. Establish `features -> services -> data/Firebase` lint boundary and prevent Zone-4/client imports. Add emulator-mode ribbon infrastructure.

## Tests/browser

Run install only from lock/approved dependency list, format check, strict typecheck, lint, unit smoke, build. Launch the shell at 390 and 1280; verify ribbon mode and zero console errors. No screen-fidelity claim.

## Output/checkpoint

F0 evidence with exact versions/commands/results and allowed changed paths. Commit `feat(frontend): complete F0 scaffold and authority gate`; stop.

## Stop/quota handoff

Stop for dependency/peer conflict requiring an unapproved version, shared/config ownership collision, authority conflict, or dirty unrelated path. Handoff only after scaffold or test-boundary unit passes its focused gate.

## Executable contract fields

- **TOOL / MODEL / EFFORT:** Codex / GPT-5.6 Sol / high.
- **WORKTREE / BRANCH:** frontend worktree / `feature/frontend`.
- **CURRENT DEPENDENCIES:** baseline and owner-reviewed pack.
- **QUERY IDS / COMMAND IDS:** none executed.
- **ALLOWED SCOPE / FORBIDDEN SCOPE:** as listed above.
- **IMPLEMENTATION REQUIREMENTS:** strict scaffold and dependency boundary only.
- **RESPONSIVE REQUIREMENTS:** shell smoke at 390 and 1280; establish under-1024 breakpoint support.
- **ACCESSIBILITY REQUIREMENTS:** title, landmarks, visible focus and test harness.
- **TESTS / BROWSER QA:** listed above.
- **EXPECTED OUTPUT / COMMIT CHECKPOINT:** F0 evidence and named commit.
- **STOP CONDITIONS / QUOTA HANDOFF CONDITIONS:** listed above.
