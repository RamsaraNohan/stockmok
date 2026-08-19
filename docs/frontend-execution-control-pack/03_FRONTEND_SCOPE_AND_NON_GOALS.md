# Frontend Scope and Non-Goals

## In scope

- Release A and B-Lite React 19/Vite application, 53 screens/surfaces, 36 routes, 24 forms, 27 tables, 25 components and 44 required states.
- Public/auth/onboarding, tenant shell, dashboard, inventory, stock, private procurement, network/connected procurement, team, notifications, reports and settings.
- Role-aware action visibility and direct-route denial matching backend/rules authority.
- Typed C2 repository consumption, trusted callable adapters, and exactly six sanctioned direct-write helpers after integration.
- Responsive behavior at 390, 768, 1280 and 1920; WCAG-AA behaviors; Chromium Playwright and browser evidence.

## Explicitly out of scope

- Release C storefront, sales orders, POS, accounting, AI/forecasting, batches/lots/expiry, barcode workflows, reservations, multi-shipment, reconnect, mapping restore, PO print/PDF, mobile report export, Storage, server export jobs, fuzzy/global search.
- Any direct Firestore write outside the six frozen surfaces.
- Any ad-hoc query, offset/infinite pagination, client-side full-dataset sorting, or hidden server-only read.
- Editing `packages/shared/**`, C2, backend, Rules, frozen docs, generated indexes, seed figures, or canonical design files from `feature/frontend`.
- Production deploy, merge, rebase, push, or creation of the F7 checkout during F0-F6.

## Hard implementation invariants

- Quantities are integer milli-units; money is integer minor units; timestamps are Firestore `Timestamp`; display uses organization timezone.
- React components never import `firebase/firestore`; feature code calls services/adapters.
- `operationId` is generated once per idempotent form opening and retained across bounded retries.
- Tenant, UID, role and trusted organization context are never accepted from an editable payload when the server derives them.
- Loading, empty, filtered-empty, error, success, denied, submitting and confirmation behavior is explicit; raw backend codes are not user copy.
- SCREEN-038 line persistence remains blocked until an owner-approved contract provides an authorized production path.
