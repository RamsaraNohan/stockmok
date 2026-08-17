# Parallel Lane Ownership

This manifest is operational guidance, not architecture authority. Exact file-level ownership for newly
created implementation modules must be frozen in each lane's master prompt before coding starts.

## Shared read-only and controlled boundaries

- Frozen normative authority: `docs/database-final/**`, `docs/implementation/**`,
  `docs/implementation-evidence/C1_*`, and `docs/implementation-evidence/A3R_P2_*`.
- Frozen contracts include canonical IDs/counts, seed figures, Firebase paths, roles/RBAC, movement
  taxonomy, state machines, and tenant boundaries.
- `packages/shared/**` is controlled shared implementation. No feature lane modifies it independently.
  A proven mechanical need becomes a narrow centrally reviewed shared-foundation patch.

## Lane A — Codex C2

**Branch/worktree:** `feature/data-c2` · `C:\Users\ramsa\stockflow-worktrees\data-c2`  
**Purpose:** read/query/data-access implementation only.

Use the exact 92 active QueryIds defined by current DB-04; never infer `Q-001…Q-092`. Historical and
tombstoned IDs remain excluded.

Owns conceptually: query/read layer, cursor pagination, query builders, aggregations, approved realtime
subscriptions, read repositories/services, read-side tests, and query/index/read-budget verification.

Does not own: Security Rules, authoritative RBAC, command bodies, stock transactions, backend workflow
enforcement, frontend UI, or independent `packages/shared/**` changes.

## Lane B — Claude Code

**Branch/worktree:** `feature/backend-security` ·
`C:\Users\ramsa\stockflow-worktrees\backend-security`  
**Purpose:** security-sensitive backend implementation.

Owns conceptually: Firestore Security Rules and tests, server authorization/RBAC, Firebase Functions,
C-01…C-38, transactions, idempotency, stock/procurement/connected workflows, mappings, invitations,
audit integrity, notifications/projections, and backend attack/security tests.

Does not own frontend implementation, read-architecture redesign, frozen-contract redefinition, or
independent `packages/shared/**` changes.

## Lane C — Antigravity

**Branch/worktree:** `feature/frontend` · `C:\Users\ramsa\stockflow-worktrees\frontend`  
**Purpose:** frontend implementation and browser QA.

Owns conceptually: React/Vite UI, routes, frozen approved screens, components, responsive behavior,
frontend adapters/state/validation/tests, Playwright, accessibility, and visual verification.

Does not own ad-hoc Firestore architecture, privileged writes, Security Rules, backend business logic,
cross-tenant reads, frozen-contract redefinition, or independent `packages/shared/**` changes.

If any lane believes frozen authority is wrong, it must stop and report rather than invent a second
contract.
