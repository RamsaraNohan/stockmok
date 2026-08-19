# Integration Dependency Map

## Lane state

| Lane     | Current state                             | Integration rule                                              |
| -------- | ----------------------------------------- | ------------------------------------------------------------- |
| baseline | frozen `a0d500a...`                       | common ancestor                                               |
| C2       | frozen `694a697...`                       | integrate exactly this reviewed commit                        |
| backend  | candidate `c4e2c2d...`, promotion pending | integrate only the later independently approved frozen commit |
| frontend | F0-F6 on `feature/frontend`               | freeze after independent frontend review                      |

## Before integration

F0-F6 may build frontend-owned presentation, routing, form validation, adapter interfaces/mocks and focused tests against frozen contracts. They must not manually copy C2/backend source or claim real emulator E2E where the branch lacks those implementations. Command-backed UI remains visibly gated in development until real integration.

## F7 sequence

1. Owner authorizes `C:\Users\ramsa\stockflow-worktrees\integration` on `integration/parallel-implementation`.
2. Verify clean protected worktrees and exact promoted/frozen SHAs.
3. Integrate C2, promoted backend and reviewed frontend with normal Git history; resolve only mechanical conflicts whose authority winner is explicit.
4. Re-run architecture exact-set gates before wiring imports.
5. Replace test/gated adapters with actual `@stockmok/data` repositories and callable clients; do not change contracts to fit UI code.
6. Run full emulator, canonical seed/chain, rules/security/backend/data/frontend and capped E2E gates.
7. Record integration evidence and stop before production deployment.

## SCREEN-038 integration gate

Full connected-draft line creation/editing cannot pass F7 until an owner-approved amendment defines an authorized intent/persistence path and is implemented/reviewed in the owning lanes. Without it, F7 may test existing connected-order states but must report the end-to-end create/edit/submit flow blocked.
