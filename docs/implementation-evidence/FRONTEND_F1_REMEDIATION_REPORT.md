# Stockmok — Targeted F1 Promotion Remediation Report

**Phase:** Targeted F1 Remediation
**Base HEAD:** `ed787a65c0755f5c07f240cc0340a98769691a96`
**Date:** 2026-08-19
**Worktree Path:** `C:\Users\ramsa\stockflow-worktrees\frontend`

---

## 1. Executive Summary

All 3 independently confirmed F1 findings (P1-01, P1-02, P2) have been repaired with narrow, targeted code changes and 100% verified via automated regression test suites, typechecks, lint, and browser E2E tests.

---

## 2. Remediation Details

### P1-01: Q-005 Exact Contract & Transport Alignment

- **Transport A (Exact One-Shot):** Implemented `fetchUnreadNotificationCount(uid)` using `getCountFromServer(query(notifRef, where('read', '==', false)))` returning `{ count, isCapped: false }`.
- **Transport B (Bounded Realtime Badge):** Updated `subscribeToUnreadNotifications(uid, onUpdate)` with constraints `where('read', '==', false)`, `orderBy('createdAt', 'desc')`, and `limit(50)`. Snapshot size 0..49 returns exact count; size 50 sets `isCapped: true` (rendering `"50+"`).
- **Cache Semantics:** Suppressed stale cache-only snapshots (`snap.metadata.fromCache === true`) to enforce server-backed authoritative metadata.
- **Tests Added:** `tests/q005-notifications-contract.test.ts` (5 unit tests covering Transport A, Transport B boundary values 0, 1, 49, 50, query constraints, stale cache suppression, and unsubscribe cleanup).

### P1-02: Procurement Manager Product Route Entitlement

- **Sidebar Visibility:** Preserved `showProducts` sidebar filter for `PROCUREMENT_MANAGER` as **HIDDEN**.
- **Route Authorization:** Updated `src/app/router.tsx` `RoleGuard` `allowedRoles` for `inventory/products` to include `PROCUREMENT_MANAGER`.
- **Tests Added:** `tests/rbac-entitlements.test.ts` proving `PM_PRODUCTS_SIDEBAR = HIDDEN`, `PM_PRODUCTS_ROUTE_READ = ALLOWED`, and `STOREKEEPER` PO sidebar/route remains hidden and denied.

### P2: Drawer Breakpoint Resize (1023px → 1024px)

- **Runtime Reproduction:** Confirmed that opening `MobileDrawer` at 1023px and resizing to 1024px retained Radix `Dialog.Root open={true}`, leaving Radix body scroll-lock and focus trap active while `lg:hidden` CSS hid the drawer elements visually.
- **Remediation:** Added `useEffect` in `MobileDrawer.tsx` subscribing to `window.matchMedia('(min-width: 1024px)')` to trigger `onClose()` cleanly when transitioning to desktop viewports.
- **Tests Added:** `tests/mobile-drawer-responsive.test.tsx` verifying auto-close cleanup on 1023px → 1024px viewport transition.

---

## 3. Verification Metrics

| Quality Gate      | Command                | Result                               |
| :---------------- | :--------------------- | :----------------------------------- |
| Code Formatting   | `npm run format:check` | **PASS**                             |
| Strict Typecheck  | `npm run typecheck`    | **PASS**                             |
| ESLint Compliance | `npm run lint`         | **PASS**                             |
| Unit Tests        | `npm run test:unit`    | **PASS (14 files, 40 tests passed)** |
| Workspace Build   | `npm run build`        | **PASS**                             |
| E2E Tests         | `npm run test:e2e`     | **PASS (10 tests passed)**           |
| Diff Formatting   | `git diff --check`     | **PASS (0 errors)**                  |
