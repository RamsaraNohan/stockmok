# StockFlow — Final Technology Stack Decision v3.0

**Status:** FROZEN. No technology in this document may be changed during implementation without a written scope-change entry in `01_FINAL_RECONCILIATION_REPORT.md`.
**Authority:** This file owns every technology, library, runtime and service decision.
**Decision date:** 09 August 2026
**Build window:** 10 August 2026 → 22 August 2026 (13 calendar days). Submission 23–24 August 2026.
**Verified against:** official Firebase documentation and the public npm registry on 09 August 2026.

---

## 0. Decision principles applied

Every choice below was scored against, in this order:

1. Correctness and security first.
2. Can it be implemented and *proved* inside 13 days.
3. Does it produce coursework evidence (quality / performance / adaptability / testing / reflection).
4. Is it free or free-tier.
5. Does it avoid unnecessary complexity a single student must defend in a viva.
6. Does it leave a credible commercial upgrade path.

**Rejected on principle, before evaluation:** Kubernetes, Docker for the app runtime, microservices, Redis, SQL/Supabase migration, message buses, custom auth, GraphQL, SSR frameworks, monorepo tooling (Nx/Turborepo), Storybook, i18n frameworks, state machines libraries (XState), ORM layers.

---

## 1. Verified technical facts underpinning these decisions

| VF-ID | Fact | Consequence for StockFlow | Source |
|---|---|---|---|
| VF-01 | Production deployment of Cloud Functions requires the **Blaze** (pay-as-you-go) plan. Blaze includes a monthly no-cost tier (2M invocations, 400k GB-s, 200k CPU-s, 5 GB egress). | Blaze is a **Day-1 hard prerequisite** for the primary profile. Coursework traffic is far below the no-cost tier, so expected spend ≈ $0 plus trivial container-storage cents. | firebase.google.com/docs/functions, /docs/projects/billing/firebase-pricing-plans |
| VF-02 | Cloud Storage for Firebase also requires Blaze (default bucket change, Sept 2024 / Feb 2026). | Logo upload is **not** implemented. Monogram fallback only. Removes a Blaze-coupled feature from the critical path. | firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024 |
| VF-03 | Firestore Security Rules allow **10 document access calls** per single-document or query request, and **20** for multi-document reads / transactions / batched writes (the 10 limit still applies per operation). Cached identical calls do not count. Exceeding either limit = permission denied. | Rules may only perform `get()` on paths that are **constant for the whole request** (e.g. `organizations/{orgId}/members/{uid}` where `orgId` is in the matched path). Any rule whose `get()` path varies per candidate document is forbidden. This single fact drives the entire cross-tenant architecture. | firebase.google.com/docs/firestore/security/rules-conditions#access_call_limits |
| VF-04 | Rules `get()`/`exists()` calls are **billed reads even when the request is denied**. | Keep rules shallow; push cross-tenant authorization into backend commands. | same page, "Access calls and pricing" |
| VF-05 | Security Rules **are not filters**; a query is rejected unless the rules can permit the whole potential result set. | Every list screen must query within a single tenant path. No cross-tenant `collectionGroup` list screens. | firebase.google.com/docs/firestore/security/rules-conditions |
| VF-06 | The Admin/server SDK **bypasses Security Rules entirely**. | Every Cloud Function must re-authenticate and re-authorize explicitly. Non-negotiable. | firebase.google.com/docs/firestore/security/insecure-rules |
| VF-07 | Firestore supports read-time aggregation queries: `count()`, `sum()`, `average()`. Billing = 1 document read per 1000 index entries scanned (minimum 1). Deadline 60 s. | Dashboard KPIs (SKU count, low-stock count, open POs, inventory value) can be computed with bounded cost and **no manually maintained KPI documents**. | firebase.google.com/docs/firestore/query-data/aggregation-queries |
| VF-08 | Firestore recommends the **500/50/5** ramp rule and warns that sustained high write rates to a *single document* create hotspots. | `productStockSummaries/{productId}` is a per-product hot document. Acceptable at coursework scale; documented as a known limit with sharded-counter as the future path. | firebase.google.com/docs/firestore/best-practices |
| VF-09 | Cloud Functions / Firebase CLI fully support **Node.js 20 and 22** (24 GA, 26 preview). Node 18 deprecated. | Functions runtime = **Node 22**. Local dev Node = 22 LTS. | firebase.google.com/docs/functions/manage-functions |
| VF-10 | The Local Emulator Suite emulates Authentication, Firestore (with Security Rules), Cloud Functions (HTTP, callable, background), Hosting, Storage, Pub/Sub. | 100 % of development and automated testing runs on emulators. No cloud spend during development. | firebase.google.com/docs/emulator-suite |

Current published versions observed on the npm registry, 09 August 2026: react 19.2.8, vite 8.2.1, typescript 7.0.2 (5.9.3 available), react-router-dom 7.18.2, vitest 4.1.10, @playwright/test 1.61.0, tailwindcss 4.3.3, zod 4.4.3, react-hook-form 7.77.0, @tanstack/react-query 5.101.4, firebase 12.17.1, firebase-admin 14.1.0, firebase-functions 7.2.5, firebase-tools 15.26.0, @firebase/rules-unit-testing 5.0.1, typescript-eslint 8.66.0.

---

## 2. Version policy

**VP-01.** Exact versions are pinned by `package-lock.json`, committed. `npm ci` is the only install command used in CI and in the README.
**VP-02.** Dependency ranges use caret (`^`) for libraries and tilde (`~`) for TypeScript.
**VP-03.** **No dependency upgrade after Day 9 (18 August).** Security patches only, and only if a test suite is green before and after.
**VP-04.** No package is added without an entry in this document. AI agents may not add dependencies autonomously.

---

# 3. CORE

### TECH-001 — Frontend framework

| Field | Value |
|---|---|
| Category | Core / UI runtime |
| Chosen | **React** |
| Version policy | `^19.2.8` (React 19 line) |
| Purpose | Component-based SPA rendering the whole authenticated application and the public site. |
| Why chosen | Largest ecosystem for the exact libraries below; the student's existing UI board is React-shaped; hooks model matches the "components separate from services" NFR-011; huge amount of correct training data for the AI coding agents, which directly reduces defect rate inside a 13-day window. |
| Alternatives rejected | **Vue/Svelte** — smaller Firebase-specific ecosystem, fewer reliable AI-generated patterns. **Next.js** — SSR/App Router adds a server runtime, a second deployment target (App Hosting/Cloud Run), and hydration bugs for zero coursework benefit; StockFlow is a private authenticated dashboard where SEO is irrelevant. **Angular** — ceremony cost too high for 13 days. |
| Coursework benefit | Enables clean separation of presentation and business services; supports the "quality" and "adaptability" criteria with a component library. |
| Complexity | LOW |
| Cost | FREE |
| Day needed | Day 1 |
| Files created | `package.json`, `src/main.tsx`, `src/App.tsx` |
| Risks | React 19 + a stale third-party library peer-dep conflict. |
| Mitigation | Every library in this document was checked to have a current React-19-compatible release. Install all of them on Day 1 in one go and resolve peers immediately. |
| Future path | Same code runs unchanged if the app later moves behind Next.js or React Native Web. |

### TECH-002 — Build tool

| Field | Value |
|---|---|
| Category | Core / build |
| Chosen | **Vite** |
| Version policy | `^8.2.1` |
| Purpose | Dev server with HMR, production bundling, environment-variable injection, code splitting. |
| Why chosen | Sub-second HMR is worth real hours across 13 days; first-class TS support without extra config; `import.meta.env` gives a clean, documented way to inject Firebase config; `build --report`-style bundle analysis feeds the *performance* evidence the rubric asks for. |
| Alternatives rejected | **Create React App** — unmaintained. **Webpack** — configuration time is unaffordable. **Parcel/Rspack** — no advantage here. |
| Coursework benefit | Fast iteration; measurable bundle-size performance evidence; trivially reproducible `npm run build`. |
| Complexity | LOW |
| Cost | FREE |
| Day needed | Day 1 |
| Files created | `vite.config.ts`, `.env.example`, `index.html` |
| Risks | Vite 8 plugin ecosystem drift. |
| Mitigation | Only two plugins are used: `@vitejs/plugin-react` and `vite-tsconfig-paths`. Both verified current. |
| Future path | Vite is also the Vitest engine, so test and build config stay unified. |

### TECH-003 — Language

| Field | Value |
|---|---|
| Category | Core / language |
| Chosen | **TypeScript** |
| Version policy | **`~5.9.3` — deliberately pinned to the 5.9 line, not 7.x** |
| Purpose | Static typing across frontend, Cloud Functions and shared domain code. |
| Why chosen | Types are the cheapest defect-prevention mechanism available in a 13-day build; shared domain types make the client and the Cloud Functions provably agree on payloads. |
| Why 5.9 and not 7.0.2 | TypeScript 7 is the native (Go) compiler port. `typescript-eslint@8.66.0` and the wider lint/IDE plugin ecosystem are built and tested against the 5.x line. Adopting a compiler rewrite during a 13-day graded build is an uncompensated risk with zero coursework benefit. This is a deliberate stability decision, recorded so it can be defended. |
| Alternatives rejected | **Plain JavaScript** — loses the strongest quality signal and makes shared client/server contracts unverifiable. **TS 7.x** — see above. |
| Coursework benefit | "Quality" criterion; compile-time proof that no code path uses an undefined field; excellent reflection material on the TS 7 decision. |
| Complexity | LOW |
| Cost | FREE |
| Day needed | Day 1 |
| Files created | `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `functions/tsconfig.json` |
| Risks | Over-strict typing slowing early velocity. |
| Mitigation | Strictness profile fixed in TECH-045; no `any` escape hatches except behind an ESLint-suppressed, commented boundary. |
| Future path | Migrate to TS 7 native compiler after submission as a documented post-coursework task. |

### TECH-004 — Package manager

| Field | Value |
|---|---|
| Category | Core / tooling |
| Chosen | **npm** (bundled with Node 22) |
| Version policy | npm 10/11 as shipped with Node 22 |
| Purpose | Dependency install, script running, lockfile. |
| Why chosen | Zero install step; `npm ci` is deterministic; every marker and every AI agent understands it; Firebase CLI docs assume it. |
| Alternatives rejected | **pnpm** — faster but the symlinked `node_modules` layout occasionally confuses the Firebase Functions packager. **yarn/bun** — no benefit, extra install instruction in the README. |
| Coursework benefit | README reproducibility (NFR-013). |
| Complexity | LOW |
| Cost | FREE |
| Day needed | Day 0 |
| Files created | `package.json`, `package-lock.json`, `functions/package.json`, `functions/package-lock.json` |
| Risks | None material. |
| Mitigation | — |
| Future path | — |

### TECH-005 — Runtime / version target

| Field | Value |
|---|---|
| Category | Core / runtime |
| Chosen | **Node.js 22 LTS** locally and for Cloud Functions; browser target `baseline-widely-available` (Vite default) |
| Version policy | `"engines": { "node": "22" }` in both `package.json` files; `.nvmrc` = `22` |
| Purpose | Consistent runtime between local emulators, CI and deployed Functions. |
| Why chosen | Node 22 is fully supported by Cloud Functions and the Firebase CLI (VF-09) and is an LTS line, so it will not be deprecated before submission. |
| Alternatives rejected | **Node 20** — supported but older. **Node 24/26** — 24 is GA and 26 preview; no reason to be on the newest runtime during a graded build. |
| Coursework benefit | Eliminates "works on my machine" defects between emulator and deployment. |
| Complexity | LOW |
| Cost | FREE |
| Day needed | Day 1 |
| Files created | `.nvmrc`, `engines` fields |
| Risks | Student's local Node differs. |
| Mitigation | Day-1 gate checks `node -v`. CI pins Node 22. |
| Future path | Bump to the next LTS post-submission. |

---

# 4. ROUTING

### TECH-006 — Routing library

| Field | Value |
|---|---|
| Category | Routing |
| Chosen | **React Router (`react-router-dom`) in declarative/data-router mode** |
| Version policy | `^7.18.2` |
| Purpose | Public routes, authenticated organization-scoped routes, protected-route guards, invitation route, 404. |
| Why chosen | The de-facto standard; nested layout routes map exactly onto the app-shell + `/app/:handle/...` structure in `07`; `useParams` gives the handle; loader/guard patterns keep authorization checks in one place. Used purely as a client-side library — **framework mode / SSR is not used.** |
| Alternatives rejected | **TanStack Router** — excellent type safety but a smaller ecosystem and more setup ceremony than 13 days justify. **Wouter** — too minimal for nested layouts and guards. **Next.js routing** — rejected with Next.js in TECH-001. |
| Coursework benefit | Demonstrates route-level authorization, deep-linking and the "direct URL permission denied" test (T-UI-06). |
| Complexity | LOW |
| Cost | FREE |
| Day needed | Day 2 |
| Files created | `src/app/router.tsx`, `src/app/routes/*` |
| Risks | Accidentally adopting framework-mode APIs. |
| Mitigation | AGENTS.md forbids `react-router` framework mode, loaders that fetch data, and any file-based routing. |
| Future path | Straightforward migration to framework mode if SSR is ever needed. |

### TECH-007 — Route architecture

| Field | Value |
|---|---|
| Category | Routing |
| Chosen | **Three-layer nested route tree: `PublicLayout` → `AuthLayout` → `OrgLayout`** |
| Version policy | n/a |
| Purpose | Guarantee that every authenticated screen resolves identity → membership → organization *before* rendering. |
| Why chosen | Guarding once at the layout level removes an entire class of "screen rendered before permission known" defects, and makes the denial UX consistent. |
| Structure | `PublicLayout`: `/`, `/login`, `/signup`, `/b/:handle`, `/invite/:token`, `/store/:handle` (C). `AuthLayout` (requires Firebase user): `/select-workspace`, `/onboarding`. `OrgLayout` (requires user **and** ACTIVE membership resolved from `:handle`): everything under `/app/:handle/*`. |
| Alternatives rejected | Per-page guards — repetitive and easy to forget on one screen, which is exactly how graded systems leak. |
| Coursework benefit | Directly evidences RBAC and tenant isolation in the UI layer. |
| Complexity | LOW |
| Cost | FREE |
| Day needed | Day 2–3 |
| Files created | `src/app/layouts/*.tsx`, `src/app/guards/RequireAuth.tsx`, `RequireMembership.tsx`, `RequireRole.tsx` |
| Risks | Guard flicker during async membership resolution. |
| Mitigation | Layouts render a dedicated `AppBootSkeleton` until membership state is `resolved`. Never render children in `unknown` state. |
| Future path | Same tree supports additional org-scoped modules. |

---

# 5. UI

### TECH-008 — UI component approach

| Field | Value |
|---|---|
| Category | UI |
| Chosen | **Hand-built local component library in `src/ui/`, styled with Tailwind, using Radix UI primitives only for the four accessibility-critical widgets (Dialog, DropdownMenu, Select, Tooltip)** |
| Version policy | `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-select`, `@radix-ui/react-tooltip` — current majors |
| Purpose | Consistent buttons, inputs, cards, tables, badges, tabs, modals, toasts, empty/loading/error states. |
| Why chosen | A component library the student wrote is defensible in a viva and is direct evidence of individual contribution. Radix supplies focus trapping, escape handling and ARIA wiring for modals and menus, which are the parts most likely to fail the accessibility baseline (NFR-016) if hand-rolled. This is the minimum-dependency route to an accessible UI. |
| Alternatives rejected | **shadcn/ui** — copy-in components are attractive, but it pulls a large surface of code the student did not write, which weakens the individual-contribution claim and adds review burden. **MUI / Chakra / Ant Design** — heavy bundles, opinionated visual identity that fights the StockFlow design board, and a large API to learn. **Headless UI** — fine, but Radix has better Select/Tooltip primitives. |
| Coursework benefit | "Quality" and "individual contribution"; the design-system section of the report writes itself. |
| Complexity | MEDIUM |
| Cost | FREE |
| Day needed | Day 2 (design system), continuously thereafter |
| Files created | `src/ui/**` (~20 components), `src/ui/index.ts` |
| Risks | Component library sprawl eating build days. |
| Mitigation | Hard cap: the component list in `17_UI_DESIGN_EXECUTION_BRIEF.md` §8 is exhaustive. No component outside that list without a scope-change entry. |
| Future path | Extractable into a published package. |

### TECH-009 — CSS approach

| Field | Value |
|---|---|
| Category | UI |
| Chosen | **Tailwind CSS v4 via the Vite plugin (`@tailwindcss/vite`)** |
| Version policy | `^4.3.3` |
| Purpose | All styling. |
| Why chosen | v4's CSS-first configuration (`@theme` in a stylesheet) means design tokens live in one file with no JS config; utility classes keep styles co-located with markup, which is the fastest safe way to build ~30 screens; no runtime cost; automatic unused-style elimination gives a small CSS bundle for the performance evidence. |
| Alternatives rejected | **CSS Modules** — more files, more naming decisions, slower. **styled-components/Emotion** — runtime cost and React 19 friction. **Plain CSS** — unmaintainable at this screen count. **Tailwind v3** — v4 is current and the Vite plugin removes PostCSS config entirely. |
| Coursework benefit | Design tokens + dark-mode-ready variables = concrete "adaptability" evidence. |
| Complexity | LOW |
| Cost | FREE |
| Day needed | Day 2 |
| Files created | `src/styles/theme.css`, `src/styles/index.css` |
| Risks | Class-string sprawl in JSX. |
| Mitigation | `clsx` + `tailwind-merge` in a `cn()` helper; any element with more than ~12 utilities becomes a `src/ui` component. |
| Future path | Tokens are plain CSS custom properties, portable to any styling system. |

### TECH-010 — Design tokens

| Field | Value |
|---|---|
| Category | UI |
| Chosen | **CSS custom properties declared in a single `@theme` block** |
| Version policy | n/a |
| Purpose | Colour, spacing, radius, shadow, typography scale, and the six semantic status colours (in-stock, low, out, draft, pending, error). |
| Why chosen | One file to change to rebrand the whole product — a literal demonstration of adaptability that can be shown live in a demo. |
| Alternatives rejected | Hard-coded hex values — untestable, unbrandable. Theme objects in JS — extra runtime indirection. |
| Coursework benefit | Adaptability criterion; also underpins the organization monogram colour derivation. |
| Complexity | LOW |
| Cost | FREE |
| Day needed | Day 2 |
| Files created | `src/styles/theme.css` |
| Risks | Contrast failures. |
| Mitigation | Contrast checked once at token-definition time against WCAG AA; recorded in the QA evidence folder. |
| Future path | Per-organization theming. |

### TECH-011 — Icons

| Field | Value |
|---|---|
| Category | UI |
| Chosen | **lucide-react** |
| Version policy | current major |
| Purpose | All iconography. |
| Why chosen | Tree-shakeable individual ESM exports (no icon-font weight), consistent 24px grid, MIT licence, covers every icon the IA needs (package, warehouse, truck, link, alert-triangle, users, settings). |
| Alternatives rejected | **Font Awesome** — licence tiers and font loading. **react-icons** — bundles many sets, easy to accidentally import several. **Heroicons** — smaller set, missing logistics icons. |
| Coursework benefit | Bundle-size discipline (performance evidence). |
| Complexity | LOW |
| Cost | FREE |
| Day needed | Day 2 |
| Files created | none |
| Risks | Icon-only buttons failing accessibility. |
| Mitigation | `IconButton` component requires an `aria-label` prop at the type level. |
| Future path | — |

### TECH-012 — Table solution

| Field | Value |
|---|---|
| Category | UI |
| Chosen | **Custom `<DataTable>` component over semantic `<table>` markup. No table library.** |
| Version policy | n/a |
| Purpose | Product list, PO list, movement history, team, reports, partner catalog, mappings. |
| Why chosen | Every StockFlow list is server-paginated by Firestore with at most 25 rows on screen. Client-side sorting/filtering/virtualisation — the reasons to adopt TanStack Table — are therefore unnecessary. Semantic `<table>` with proper `<th scope>` also satisfies the accessibility requirement more directly than a headless library's div-based default. |
| Alternatives rejected | **TanStack Table** — powerful, but its column-def API costs a day to learn and would sit on top of server-side paging anyway. **AG Grid** — commercial licence for the useful features; massive bundle. |
| Coursework benefit | Accessible tables (NFR-016); measurable bundle savings. |
| Complexity | LOW |
| Cost | FREE |
| Day needed | Day 4 |
| Files created | `src/ui/DataTable.tsx`, `src/ui/TableEmptyState.tsx`, `src/ui/Pagination.tsx` |
| Risks | Reimplementing sorting badly. |
| Mitigation | Sorting is delegated to Firestore `orderBy` on indexed fields only. No client-side sort of a partial page — the UI disables sort on non-indexed columns rather than lying. |
| Future path | Swap in TanStack Table behind the same props if client-side features are ever needed. |

### TECH-013 — Modal / dialog approach

| Field | Value |
|---|---|
| Category | UI |
| Chosen | **`@radix-ui/react-dialog` wrapped as `src/ui/Modal.tsx` and `src/ui/ConfirmDialog.tsx`** |
| Version policy | current major |
| Purpose | Stock adjustment, destructive confirmations, invite link display, publish-to-catalog dialog, receive-goods sheet on mobile. |
| Why chosen | Correct focus trap, restore-focus, `Esc`, scroll lock and `aria-modal` out of the box. These are the exact behaviours a marker checking accessibility will test, and the exact behaviours hand-rolled modals get wrong. |
| Alternatives rejected | Native `<dialog>` — inconsistent styling/behaviour across browsers for non-modal cases. Hand-rolled portal — accessibility risk. |
| Coursework benefit | NFR-016, NFR-009. |
| Complexity | LOW |
| Cost | FREE |
| Day needed | Day 3 |
| Files created | `src/ui/Modal.tsx`, `src/ui/ConfirmDialog.tsx` |
| Risks | Nested dialogs. |
| Mitigation | Forbidden by AGENTS.md: at most one dialog open at a time. |
| Future path | — |

### TECH-014 — Toast / notification UI

| Field | Value |
|---|---|
| Category | UI |
| Chosen | **`sonner`** |
| Version policy | current major |
| Purpose | Transient success/error feedback after every command. |
| Why chosen | One `<Toaster />` and a `toast.success()/error()` API; announces via an ARIA live region; ~3 kB. Writing an accessible toast queue by hand is a half-day for zero marks. |
| Alternatives rejected | **react-hot-toast** — equivalent; sonner has better default a11y and stacking. **Custom** — time. |
| Coursework benefit | Consistent success/error states (NFR-002). |
| Complexity | LOW |
| Cost | FREE |
| Day needed | Day 3 |
| Files created | `src/ui/toast.ts` |
| Risks | Toast used to report errors that need a persistent inline message. |
| Mitigation | Rule: validation errors render inline on the field; toasts are for command outcomes only. |
| Future path | — |
| **Note** | This is UI-layer toast only. The **in-app Notification entity** (`FR-NOTIFY-*`) is persisted data with its own screen and is unrelated. |

### TECH-015 — Charts

| Field | Value |
|---|---|
| Category | UI |
| Chosen | **Recharts** |
| Version policy | current major with React 19 support |
| Purpose | Exactly three charts: dashboard stock-status donut, inventory-by-location bar, PO-status bar on the reports screen. |
| Why chosen | Declarative React components, responsive container, minimal config; three charts is the ceiling so a light-touch library is right. |
| Alternatives rejected | **Chart.js** — imperative canvas, awkward in React, and canvas output cannot carry a text alternative easily. **D3 direct** — days of work. **Nivo** — heavier. **No charts** — the rubric rewards quality and the dashboard is the demo centrepiece. |
| Coursework benefit | Visual quality in the demo; each chart ships with a text summary for accessibility. |
| Complexity | LOW |
| Cost | FREE |
| Day needed | Day 8 |
| Files created | `src/features/dashboard/charts/*` |
| Risks | Charts imported into the main bundle. |
| Mitigation | Charts are `React.lazy()`-loaded; measured in the bundle report. |
| Future path | — |
| **Hard rule** | Charts never replace an accurate table (`07` §20). If time is short, **charts are the first UI cut.** |

---

# 6. FORMS

### TECH-016 — Form handling

| Field | Value |
|---|---|
| Category | Forms |
| Chosen | **React Hook Form** |
| Version policy | `^7.77.0` |
| Purpose | Product form, onboarding wizard, PO builder, adjustment form, mapping wizard, receiving form, invite form, settings. |
| Why chosen | Uncontrolled inputs mean no re-render per keystroke on the large PO/receiving forms; first-class resolver integration with Zod so one schema validates both the form and the command payload; `formState.errors` maps directly to accessible inline messages. |
| Alternatives rejected | **Formik** — heavier, slower, less actively developed. **Raw `useState`** — ~12 forms × manual error/touched/dirty state is a guaranteed source of defects. **TanStack Form** — newer, smaller ecosystem. |
| Coursework benefit | Consistent validation UX; measurable input responsiveness. |
| Complexity | LOW |
| Cost | FREE |
| Day needed | Day 3 |
| Files created | `src/ui/form/*` (Field, FieldError, FormRow) |
| Risks | Mixing controlled and uncontrolled patterns. |
| Mitigation | All fields go through the `Field` wrapper. |
| Future path | — |

### TECH-017 — Schema validation

| Field | Value |
|---|---|
| Category | Forms / contracts |
| Chosen | **Zod** |
| Version policy | `^4.4.3` |
| Purpose | **Single source of truth for every command payload.** The same schema object validates the browser form (via `@hookform/resolvers/zod`) and re-validates inside the Cloud Function. Types are derived with `z.infer`. |
| Why chosen | This is the highest-leverage decision in the stack. It makes SEC-014 ("client input is revalidated") structurally true rather than aspirational, removes any possibility of client and server disagreeing about a payload shape, and gives free TypeScript types for both sides. |
| Alternatives rejected | **Yup** — weaker inference. **Valibot/ArkType** — smaller ecosystems. **Manual validation** — duplicated logic, the classic source of security holes. |
| Coursework benefit | Security evidence, quality evidence, and one of the strongest reflection topics available ("how a shared schema removed a whole class of trust bugs"). |
| Complexity | LOW |
| Cost | FREE |
| Day needed | Day 3 |
| Files created | `packages/shared/src/schemas/*.ts` (see TECH-036) |
| Risks | Schema drift between form and command. |
| Mitigation | Impossible by construction: both import the same module. A lint rule bans defining a payload type by hand. |
| Future path | Zod schemas can generate OpenAPI if a public API is ever exposed. |

---

# 7. APPLICATION STATE

**Governing decision:** StockFlow does **not** adopt a global client state library. This is a deliberate, defended choice, not an omission.

### TECH-018 — Local UI state

| Field | Value |
|---|---|
| Chosen | **React `useState` / `useReducer`, component-local** |
| Why chosen | Filters, dialog open/closed, wizard step and form drafts are used by exactly one subtree. Hoisting them into a store adds indirection and makes each screen harder to reason about. |
| Alternatives rejected | Redux/Zustand for UI state — unjustified. |
| Complexity | LOW · Cost FREE · Day 2 |
| Risks | Prop drilling. **Mitigation:** if a value crosses more than two levels, it belongs in a feature-local context, not a global store. |

### TECH-019 — Authentication state

| Field | Value |
|---|---|
| Chosen | **`AuthProvider` React Context wrapping `onAuthStateChanged` / `onIdTokenChanged`** |
| Purpose | Exposes `{ status: 'loading'|'signedOut'|'signedIn', user, refreshToken() }`. |
| Why chosen | Exactly one subscription to Firebase Auth for the whole app; a tri-state `status` makes the "never render before auth is known" rule enforceable. |
| Alternatives rejected | `react-firebase-hooks` — an extra dependency for ~30 lines. Per-component listeners — duplicate subscriptions and race conditions. |
| Complexity | LOW · Cost FREE · Day 2 |
| Files | `src/lib/auth/AuthProvider.tsx` |
| Risks | Rendering during `loading`. **Mitigation:** `RequireAuth` renders a skeleton for `loading`; unit-tested. |

### TECH-020 — Organization / membership state

| Field | Value |
|---|---|
| Chosen | **`OrgProvider` React Context, resolved from the `:handle` route param** |
| Purpose | Exposes `{ organization, membership, role, permissions, orgId }` to the whole `/app/:handle` subtree. |
| Why chosen | Every authenticated screen needs the same four values; resolving once at the layout removes repeated lookups and repeated permission bugs. `permissions` is a derived object from the single `ROLE_PERMISSIONS` table (TECH-034) so no screen invents its own rule. |
| Alternatives rejected | Reading membership per screen — N duplicate reads and N chances to forget the check. |
| Complexity | LOW · Cost FREE · Day 3 |
| Files | `src/lib/org/OrgProvider.tsx`, `src/lib/org/permissions.ts` |
| Risks | Stale membership after a role change. **Mitigation:** the membership document is subscribed with `onSnapshot`, so suspension or a role change takes effect in the open tab within a second — and the backend re-checks anyway. |

### TECH-021 — Server / cache state

| Field | Value |
|---|---|
| Chosen | **TanStack Query v5 for all callable-command results and all one-shot reads; raw Firestore `onSnapshot` for the small set of screens that genuinely need realtime** |
| Version policy | `^5.101.4` |
| Purpose | Caching, background refetch, loading/error state, request de-duplication, cursor pagination, and — most importantly — **mutation lifecycle with cache invalidation** after every command. |
| Why chosen | Without it, every screen hand-writes `loading/error/data` state; that is roughly 25 screens × 15 lines of identical, bug-prone code, and it is the single biggest source of "spinner never stops" defects in rushed builds. `useMutation` + `invalidateQueries` gives the correct post-command refresh behaviour for free, which is directly what NFR-002 and the "error-free system" criterion reward. Also gives `isPending` for disabling submit buttons, preventing double-submits (which pairs with the `operationId` idempotency contract). |
| Realtime carve-out | Realtime subscriptions are used on exactly four surfaces: the current membership document, the notification unread count, the connected-PO detail screen, and the dashboard "Needs Attention" panel. Everywhere else uses TanStack Query. Mixing the two arbitrarily is forbidden; the list is closed. |
| Alternatives rejected | **Redux Toolkit / RTK Query** — a store, slices, and boilerplate for an app whose server state is entirely remote; the reducer layer buys nothing here. **Zustand** — good, but it is a *client* store; it does not solve caching, refetch or invalidation, so it would have to be paired with hand-written fetching anyway. **Context + useEffect everywhere** — the status quo this decision exists to avoid. **`react-firebase-hooks`** — realtime only, no mutation/invalidation story. |
| Coursework benefit | Consistent loading/empty/error/success on every screen (NFR-002, T-UI-05); de-duplicated reads are literal Firestore-cost/performance evidence. |
| Complexity | MEDIUM |
| Cost | FREE |
| Day needed | Day 3 |
| Files created | `src/lib/query/queryClient.ts`, `src/lib/query/keys.ts`, one `use*Query`/`use*Mutation` hook per feature |
| Risks | Cache keys drifting; stale data after a command. |
| Mitigation | All keys are constructed by the `qk` factory in `keys.ts` — string literals as keys are banned by AGENTS.md. Every mutation declares its `invalidates` list next to the command call. |
| Future path | Unchanged if the backend later becomes REST/GraphQL. |

**State-library verdict, stated explicitly as required:** Redux — **NO**. Zustand — **NO**. Context — **YES**, for auth and organization only. TanStack Query — **YES**, as the server-state layer. Nothing else.

---

# 8. FIREBASE

### TECH-022 — Authentication

| Field | Value |
|---|---|
| Chosen | **Firebase Authentication**, providers: Email/Password + Google |
| Version policy | via `firebase@^12.17.1` modular SDK |
| Purpose | Sole credential authority (SEC-001). Sign-up, sign-in, sign-out, password reset, Google OAuth. |
| Why chosen | Removes all credential storage from the application, which is both the secure answer and a strong, honest thing to write in the report. Password reset is a hosted flow — zero email infrastructure needed. Emulated locally. |
| Google sign-in implementation | `signInWithPopup(auth, new GoogleAuthProvider())` on desktop and mobile. **`signInWithRedirect` is not used** — it depends on third-party-cookie behaviour that is unreliable across current browsers, and popup failures are recoverable with a clear error message. Authorised domains must include the Hosting domain and `localhost`. |
| Alternatives rejected | **Custom auth** — never. **Auth0/Clerk** — external account, extra cost, no benefit. **Anonymous auth** — creates orphan identities. **Phone auth** — SMS billing. |
| Coursework benefit | CW "database connection" + security criterion; password reset demoed live. |
| Complexity | LOW · Cost FREE (Spark limits are ample) · Day 2 |
| Files | `src/lib/firebase/app.ts`, `src/lib/firebase/auth.ts` |
| Risks | Google popup blocked; unauthorised domain after deploy. |
| Mitigation | Popup-blocked error is handled with a visible, actionable message. Adding the Hosting domain to Authorized Domains is an explicit Stage-18 checklist item. |
| Future path | Add providers or MFA without code changes elsewhere. |

### TECH-023 — Database

| Field | Value |
|---|---|
| Chosen | **Cloud Firestore, Native mode, single multi-tenant database, one region (`asia-south1` or nearest to the marker; fixed at creation and never changed)** |
| Purpose | All persistent application data. |
| Why chosen | Satisfies the brief's "database connection" requirement; real ACID multi-document transactions (needed for the stock ledger); declarative Security Rules that can be *unit-tested*, which is unusually strong evidence for the security criterion; realtime where useful; generous free tier. |
| Alternatives rejected | **MySQL/PostgreSQL + a Node API** — would require hosting a server, a connection pool, migrations and a separate auth integration; adds 3–4 days and a monthly cost for zero extra marks. **Realtime Database** — weaker querying and no rules-testable structured queries. **Supabase** — good product, but swapping now discards the entire verified security model in this pack. **Firestore Datastore mode** — no realtime, no rules. |
| Coursework benefit | Transactions, rules tests, aggregation queries and index files are all directly demonstrable artifacts. |
| Complexity | MEDIUM · Cost FREE at coursework scale · Day 1 |
| Files | `firestore.rules`, `firestore.indexes.json` |
| Risks | Region cannot be changed later; document-level read granularity. |
| Mitigation | Region chosen once on Day 1 and recorded. Public/partner/private data are physically separate documents (NFR-010). |
| Future path | Firestore → BigQuery export for analytics; per-tenant databases are a documented Release-D option. |

### TECH-024 — Cloud Functions

| Field | Value |
|---|---|
| Chosen | **Cloud Functions for Firebase, 2nd generation, `onCall` callable functions, Node 22, region pinned to the Firestore region, `minInstances: 0`, `maxInstances: 10`, `memory: 256MiB`, `timeoutSeconds: 60`** |
| Version policy | `firebase-functions@^7.2.5`, `firebase-admin@^14.1.0` |
| Purpose | Every trusted backend command (see `11` §11). |
| Why chosen | 2nd gen has better concurrency and configuration; callable functions give automatic Firebase Auth context (`request.auth.uid`) with no token-parsing code, automatic CORS, and a typed client SDK. |
| Alternatives rejected | **1st gen** — legacy. **Raw HTTP endpoints** — would require manual ID-token verification and CORS; see TECH-027. **Firestore background triggers as the primary mechanism** — eventually consistent, at-least-once delivery, no way to return an error to the user, and they make idempotency harder, not easier. Background triggers are therefore **not used at all** in Release A/B. |
| Coursework benefit | The entire security narrative; also the "problems and solutions" section (Admin SDK bypasses rules → explicit re-authorization). |
| Complexity | MEDIUM–HIGH · Cost FREE within the Blaze no-cost tier · Day 1 (scaffold), Day 4 onwards (commands) |
| Files | `functions/src/**` |
| Risks | **Requires Blaze (VF-01).** Cold starts (~1–3 s) during the demo. |
| Mitigation | Blaze decided on Day 1 — see the fallback profile in §16. Before the recorded demo, warm every function with a scripted no-op call. `maxInstances: 10` caps runaway cost. |
| Future path | Same handlers can move to Cloud Run unchanged. |

### TECH-025 — Hosting

| Field | Value |
|---|---|
| Chosen | **Firebase Hosting (classic, static) with an SPA rewrite to `/index.html`** |
| Purpose | Serve the built Vite bundle over HTTPS on a `*.web.app` domain. |
| Why chosen | Free, global CDN, automatic TLS, one command to deploy, atomic releases with instant rollback, and it lives in the same project as Auth and Firestore. |
| Alternatives rejected | **Firebase App Hosting** — designed for SSR frameworks, backed by Cloud Run, more cost and more moving parts for a static SPA. **Vercel/Netlify** — a second vendor and a second dashboard for the marker to trust. **GitHub Pages** — no rewrite support for client-side routing without hacks. |
| Coursework benefit | A live, reachable URL in the report; rollback is a legitimate "reliability" talking point. |
| Complexity | LOW · Cost FREE · Day 12 (first deploy on Day 1 as a smoke test) |
| Files | `firebase.json` (`hosting.rewrites`, cache headers) |
| Risks | Deploying a stale build; caching an old `index.html`. |
| Mitigation | `npm run build && firebase deploy` is a single npm script. `index.html` is served with `Cache-Control: no-cache`; hashed assets get `max-age=31536000, immutable`. |
| Future path | Custom domain. |

### TECH-026 — Cloud Storage

| Field | Value |
|---|---|
| Chosen | **DO NOT USE** |
| Why | Requires Blaze (VF-02) and its only use would be organization/product logo upload, which `03` already reduced to a monogram fallback. Every hour spent on upload UI, image resizing, storage rules and cleanup is an hour not spent on stock correctness. |
| Consequence | Organization identity uses a generated monogram (initials on a token-derived colour). Product images in Release C use a placeholder or an external URL field that is validated and rendered with `referrerPolicy="no-referrer"`. |
| Future path | Add Storage post-coursework with resize extension. |

### TECH-027 — Emulator Suite

| Field | Value |
|---|---|
| Chosen | **Firebase Local Emulator Suite: Auth, Firestore, Functions, Hosting, plus the Emulator UI** |
| Version policy | via `firebase-tools@^15.26.0` (devDependency, not global) |
| Purpose | 100 % of development and automated testing. |
| Why chosen | VF-10 confirms full support including Security Rules evaluation and callable functions. It means rules tests, command integration tests and E2E tests all run offline, for free, deterministically, and in CI. It also means a broken rule can never leak production data during development. |
| Alternatives rejected | Developing against the live project — slow, costly, destroys demo data, and makes tests non-deterministic. |
| Coursework benefit | Reproducible test evidence; `firebase emulators:exec` in CI is a strong quality signal. |
| Complexity | LOW–MEDIUM · Cost FREE · Day 1 |
| Files | `firebase.json` (`emulators` block with fixed ports), `.firebaserc` |
| Risks | Port conflicts; client accidentally pointing at production. |
| Mitigation | Fixed ports (auth 9099, firestore 8080, functions 5001, hosting 5000, UI 4000). The client connects to emulators **only** when `import.meta.env.VITE_USE_EMULATORS === 'true'`, and the app renders a persistent amber "EMULATOR" ribbon in that mode so a demo can never be recorded against the wrong backend. |
| Future path | Same config supports a CI matrix. |

---

# 9. BACKEND

### TECH-028 — Functions runtime and language

| Field | Value |
|---|---|
| Chosen | **Node 22 + TypeScript, compiled with `tsc` to `functions/lib`** |
| Why chosen | Shares the domain package and Zod schemas with the frontend; `tsc` (not a bundler) keeps the deployed artifact debuggable and the sourcemaps honest. |
| Alternatives rejected | **Python functions** — cannot share the TypeScript domain/schemas; a second language for one student to maintain. **Bundling with esbuild** — marginal cold-start gain, extra config, harder stack traces. |
| Complexity LOW · Cost FREE · Day 1 · Files `functions/tsconfig.json`, `functions/package.json` |
| Risk: the shared package must be compiled before deploy. **Mitigation:** `predeploy` hook in `firebase.json` runs `npm run build` in the shared package and in `functions`. |

### TECH-029 — Function architecture

| Field | Value |
|---|---|
| Chosen | **One exported callable per business command, generated by a shared `defineCommand()` factory** |
| Shape | `defineCommand({ name, schema, requiredRoles, idempotent, handler })` returns an `onCall` function that performs, in fixed order: (1) reject unauthenticated; (2) validate the payload with the Zod schema; (3) resolve `orgId` from the payload and load `organizations/{orgId}/members/{uid}`; (4) reject unless `status === 'ACTIVE'`; (5) reject unless the role is in `requiredRoles`; (6) open a Firestore transaction; (7) inside it, read and check the `commandReceipt` for the `operationId`; (8) run the handler; (9) write movement/balance/summary/entity changes; (10) write audit and history; (11) write the receipt; (12) commit; (13) return a minimal result. |
| Why chosen | The authorization, validation, idempotency and audit steps are written **once** and are therefore impossible to forget in command number 27 at 2 a.m. on Day 11. It also means one integration test proves the guarantee for every command. This is the single most important structural decision for the "error-free system" criterion. |
| Alternatives rejected | Ad-hoc functions each doing their own checks — the standard way graded projects leak. A generic "do anything" endpoint — unauditable. |
| Complexity MEDIUM · Cost FREE · Day 4 · Files `functions/src/core/defineCommand.ts`, `functions/src/commands/**` |
| Risk: over-abstraction. **Mitigation:** the factory is ~120 lines and has no plugin system. |

### TECH-030 — Callable vs HTTP

| Field | Value |
|---|---|
| Chosen | **`onCall` (callable) for 100 % of application endpoints. Zero HTTP endpoints in Release A/B.** |
| Why chosen | Callables handle auth context, CORS, serialization and error codes for free, and the client SDK is typed. The only reasons to use raw HTTP — webhooks, third-party callbacks, public APIs — are all Release D. |
| Alternatives rejected | HTTP + manual `verifyIdToken` — more code, more to get wrong, no benefit. |
| Complexity LOW · Cost FREE · Day 4 |
| Risk: none material. |

### TECH-031 — Validation

| Field | Value |
|---|---|
| Chosen | **Zod schemas from the shared package, executed on the server as the authoritative check** |
| Rule | The client-side validation is a UX convenience only. The server validation result is the truth. Any field the client did not send is not defaulted to a permissive value. |
| Complexity LOW · Cost FREE · Day 4 |

### TECH-032 — Authorization

| Field | Value |
|---|---|
| Chosen | **Authoritative Firestore Membership read on every command. No Firebase Auth custom claims.** |
| Why chosen | Custom claims would make Security Rules cheaper, but claims live in the ID token and are stale for up to an hour, so a suspended member would retain rules-level read access until refresh. Reading `organizations/{orgId}/members/{uid}` costs one document read and is always current. Because every write is a backend command anyway (TECH-029), the rules-cost argument for claims mostly disappears. |
| Alternatives rejected | **Custom claims** — staleness risk, 1000-byte limit, token-refresh choreography, and a subtle failure mode where a newly invited user cannot see their workspace. **Trusting `request.data.role` or `request.data.orgId` without verification** — forbidden. |
| Complexity LOW · Cost FREE (1 read/command) · Day 4 |
| Risk: one extra read per command. **Mitigation:** negligible; documented in the performance section. |
| Future path | Claims can be added later as a read-path optimisation with `revokeRefreshTokens` on suspension. |

### TECH-033 — Error model

| Field | Value |
|---|---|
| Chosen | **`HttpsError` with a fixed code set and a machine-readable `reason` in `details`** |
| Codes used | `unauthenticated`, `permission-denied`, `invalid-argument`, `failed-precondition`, `not-found`, `already-exists`, `aborted`, `resource-exhausted`, `internal`. |
| Payload | `details: { reason: 'HANDLE_TAKEN' | 'SKU_DUPLICATE' | 'INSUFFICIENT_STOCK' | 'INVALID_TRANSITION' | 'CONNECTION_NOT_ACTIVE' | 'MAPPING_NOT_VERIFIED' | 'OVER_RECEIPT' | 'OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD' | ..., field?: string }`. |
| Why chosen | The UI can map a `reason` to a precise inline message and a test can assert on it, instead of string-matching an English sentence. Internal errors never leak stack traces or document paths to the client; they are logged server-side with the `operationId` for correlation. |
| Alternatives rejected | Throwing raw errors — leaks internals and produces `internal` for everything, making the UI unable to explain anything. |
| Complexity LOW · Cost FREE · Day 4 · Files `packages/shared/src/errors.ts`, `src/lib/commands/mapError.ts` |

### TECH-034 — Permission table

| Field | Value |
|---|---|
| Chosen | **A single exported `ROLE_PERMISSIONS` constant in the shared package, consumed by the UI (to hide actions), by `defineCommand` (to authorize), and mirrored — by necessity — in `firestore.rules`** |
| Why chosen | One table, one place to change, one place to test. `06` §5 becomes executable code rather than prose. |
| Rules duplication | Security Rules cannot import TypeScript. The role lists in `firestore.rules` are therefore duplicated. This is an accepted, documented risk, mitigated by a rules test per role that asserts the rules and the table agree. |
| Complexity LOW · Cost FREE · Day 3 · Files `packages/shared/src/permissions.ts` |

### TECH-035 — Idempotency model

| Field | Value |
|---|---|
| Chosen | **Client-generated `operationId` (UUID v4, `crypto.randomUUID()`), checked and written inside the same transaction, with a payload hash** |
| Contract | `organizations/{orgId}/commandReceipts/{operationId}` stores `{ commandType, actorUid, payloadHash, resultStatus, resultRef, createdAt }`. Inside the transaction: read the receipt first. If it exists **and** `payloadHash` matches, return the stored result with no side effects. If it exists and the hash differs, throw `failed-precondition / OPERATION_REPLAYED_WITH_DIFFERENT_PAYLOAD`. |
| Why the receipt is org-scoped | A globally-scoped `commandReceipts/{operationId}` collection would let one tenant occupy or probe another tenant's operation ids. Org scoping removes that entirely. |
| Why the payload hash | Without it, a retried request carrying different data would silently return the old result — a correctness bug that is invisible in testing unless you look for it. |
| Why read inside the transaction | Checking before opening the transaction is a race: two concurrent retries both see "no receipt" and both apply the command. This is the defect most likely to survive to submission if unstated. |
| Complexity MEDIUM · Cost FREE · Day 4 · Files `functions/src/core/idempotency.ts` |
| Risk: receipts accumulate. **Mitigation:** none needed at coursework volume; a TTL policy is the documented future path. |

### TECH-036 — Shared code package

| Field | Value |
|---|---|
| Chosen | **`packages/shared` — a plain TypeScript folder consumed by both the app and `functions` via a path alias / `file:` dependency. Not a published package, not a monorepo tool.** |
| Contents | Zod schemas, `z.infer` types, `ROLE_PERMISSIONS`, error reasons, quantity/money utilities, state-machine transition tables, pure domain functions. |
| Why chosen | It is what makes "one definition of the contract" real. The alternative — copy-pasting types into `functions/` — guarantees drift by Day 7. |
| Alternatives rejected | **npm workspaces with a build step for `functions`** — needed anyway for deploy; kept as simple as possible with a `predeploy` build. **Nx/Turborepo** — enormous overkill. |
| Complexity MEDIUM · Cost FREE · Day 1 · Files `packages/shared/**`, path aliases in both tsconfigs |
| Risk: the Functions deploy packager must include the built shared code. **Mitigation:** `functions` depends on `"@stockflow/shared": "file:../packages/shared"` and the `predeploy` hook builds it. **This is verified on Day 1 with a throwaway deploy — not on Day 12.** |

### TECH-037 — Transactions

| Field | Value |
|---|---|
| Chosen | **Firestore transactions via the Admin SDK, one transaction per command, all reads before all writes** |
| Why chosen | The stock ledger's core invariant (movement + balance + summary are all-or-nothing) is only expressible as a transaction. Admin SDK transactions also support **query reads inside the transaction**, which is what makes the "archive warehouse only if no non-zero balance exists" check race-free rather than best-effort. |
| Boundaries | Defined per command in `11` §14. |
| Limits respected | ≤ 500 writes per transaction (never approached: the largest command writes ~8 documents); no unbounded query inside a transaction (every in-transaction query carries `.limit()`). |
| Alternatives rejected | Batched writes — atomic but cannot read. Client-side transactions — possible but subject to rules access-call limits and much harder to prove correct. |
| Complexity MEDIUM · Cost FREE · Day 5 |
| Risk: contention retries on a hot summary document. **Mitigation:** VF-08 accepted at coursework scale; the SDK retries automatically; a concurrency test (T-STOCK-10) proves no lost update. |

---

# 10. DATA

### TECH-038 — Collection approach

| Field | Value |
|---|---|
| Chosen | **Three physical zones: public projections at the root, tenant-private data under `organizations/{orgId}/…`, and canonical cross-tenant records in root collections that no client may read.** |
| Why chosen | VF-03 and VF-05 make this mandatory, not stylistic. A Security Rule may only call `get()` on a path that is constant for the entire request; putting private data under a path whose first segment is the `orgId` is the only structure that guarantees a single, cacheable membership lookup. Cross-tenant documents have no such constant, so they are simply closed to clients and exposed through backend commands and backend-written per-org projections. |
| Consequence | Purchase orders, connections and mappings move **out of root collections and into (or alongside) the tenant subtree** — this is a correction to `05` v2. See `11` §5 for the full path map. |
| Complexity MEDIUM · Cost FREE · Day 1 |

### TECH-039 — Repository / service layer

| Field | Value |
|---|---|
| Chosen | **Three layers, enforced by lint: `features/*` (React) → `services/*` (Firestore reads + command calls) → Firebase SDK. React components never import `firebase/firestore` directly.** |
| Why chosen | NFR-011; makes every data access testable and mockable; makes a future backend swap a `services/` rewrite rather than an app rewrite. |
| Complexity LOW · Cost FREE · Day 3 · Files `src/services/**` |
| Risk: a rushed component importing Firestore directly. **Mitigation:** ESLint `no-restricted-imports` blocks `firebase/firestore` outside `src/services` and `src/lib/firebase`. |

### TECH-040 — Types strategy

| Field | Value |
|---|---|
| Chosen | **Zod schema is the source; TypeScript types are derived with `z.infer`. Firestore converters (`withConverter`) map documents to typed objects and stamp `id`.** |
| Why chosen | Prevents the classic Firestore bug of reading a field that does not exist on old documents; converters put parsing in one place. |
| Complexity LOW · Cost FREE · Day 3 |

### TECH-041 — Timestamp handling

| Field | Value |
|---|---|
| Chosen | **Every persisted timestamp is a Firestore `Timestamp` written with `FieldValue.serverTimestamp()`. Client clocks are never persisted. Display converts to the organization's IANA timezone with `Intl.DateTimeFormat`. No date library.** |
| Why chosen | SEC/NFR-006 and INT-08; `Intl` is built into the browser, so date-fns/dayjs/luxon are unnecessary weight for the small number of formats StockFlow shows. |
| Alternatives rejected | `date-fns` — would be justified if there were date arithmetic; there is essentially none. |
| Complexity LOW · Cost FREE · Day 3 · Files `src/lib/format/datetime.ts` |
| Risk: `serverTimestamp()` reads back as `null` immediately after a local write. **Mitigation:** commands return the committed server value; the UI never renders an optimistic timestamp. |

### TECH-042 — Money representation

| Field | Value |
|---|---|
| Chosen | **Integer minor units (`…Minor`) plus an explicit ISO-4217 `currency` string on every monetary document. Single organization currency in A/B.** |
| Arithmetic | `lineTotalMinor = roundHalfUp(unitPriceMinor × quantityMilli / 1000)` computed with integers only. All money maths lives in `packages/shared/src/money.ts` and is unit-tested including the rounding boundary. |
| Why chosen | NFR-007. Floating-point currency is the most common silent defect in inventory software and would break the report/dashboard reconciliation tests. |
| Alternatives rejected | `decimal.js` / `dinero.js` — a dependency to do what two integer helpers do at this scale. Floats — rejected outright. |
| Complexity LOW · Cost FREE · Day 3 |

### TECH-043 — Quantity representation

| Field | Value |
|---|---|
| Chosen | **All persisted quantities are integers in *milli-units*: `quantityMilli`, where 1 base unit = 1000. Maximum displayed precision is 3 decimals. Unit is always stored alongside.** |
| Why chosen | This is a correctness requirement, not a style preference. INV-01 demands `sum(signed movements) == StockBalance.onHand` **exactly**. With IEEE-754 doubles, summing a few hundred 0.001 movements does not equal the expected total, so the ledger reconciliation test would fail — or worse, pass by luck in the demo dataset and fail in front of a marker. Integers make the invariant exact by construction. |
| Conversion | `supplierToBuyerBaseFactorMilli` is also an integer (1 PACK = 5 KG → `5000`). `buyerBaseMilli = roundHalfUp(supplierOrderMilli × factorMilli / 1000)`. Both the supplier-unit and buyer-base quantities are persisted on the PO line so no re-derivation drift is possible. |
| Alternatives rejected | Floating-point quantities with "round to 3dp after each operation" — still accumulates error and makes the invariant probabilistic. |
| Complexity MEDIUM (touches every quantity field and input) · Cost FREE · Day 3 · Files `packages/shared/src/quantity.ts` |
| Risk: a developer writing a raw decimal into a `…Milli` field. **Mitigation:** branded TypeScript type `Milli = number & { __brand: 'Milli' }`; the only way to produce one is `toMilli()`. Enforced at compile time. |
| Coursework benefit | One of the strongest "problems and solutions" entries available for the reflection report. |

### TECH-044 — Indexes

| Field | Value |
|---|---|
| Chosen | **All composite indexes declared in `firestore.indexes.json`, committed, and deployed with `firebase deploy --only firestore:indexes`. No index is ever created by clicking the console error link without also adding it to the file.** |
| Why chosen | NFR-004; also means a fresh clone of the repo deploys to a working system, which is exactly what "reproducible from README" means. |
| Required set | Enumerated in `11` §8. Includes the **collection-group single-field index** decision (avoided entirely by TECH-046). |
| Complexity LOW · Cost FREE · Day 4 onward |
| Risk: a missing index only fails at runtime in production. **Mitigation:** every list query has an emulator integration test; the emulator reports missing composite indexes. A Stage-18 checklist item deploys indexes **before** the app build. |

### TECH-045 — Aggregation strategy

| Field | Value |
|---|---|
| Chosen | **Read-time Firestore aggregation queries (`count()`, `sum()`) for dashboard KPIs, over a denormalised `stockValueMinor` field maintained atomically on `ProductStockSummary`.** |
| Specifics | SKU count = `count()` over active products. Low-stock count = `count()` over summaries where `stockStatus == 'LOW_STOCK'`. Open POs / awaiting receipt = `count()` with status filters. **Inventory value = `sum('stockValueMinor')` over `productStockSummaries`**, where `stockValueMinor = roundHalfUp(onHandMilli × purchaseCostMinor / 1000)` is recomputed inside every stock command and inside `product.update` when the purchase cost changes. |
| Why chosen | VF-07 makes these bounded and cheap (1 read per 1000 index entries). It satisfies FR-DASH-003 and FR-DASH-007 — every number traces to operational data and nothing is hand-maintained. It also closes a real gap: `02` v2 required an Inventory Value KPI without specifying how it could be computed without an unbounded scan. |
| Alternatives rejected | **Distributed counters** — premature (`05` §10 already says so). **A KPI document updated by triggers** — violates FR-DASH-007 and is eventually consistent. **Client-side summation of all products** — unbounded reads; breaks NFR-003. |
| Complexity MEDIUM · Cost FREE · Day 8 |
| Risk: cost revaluation forgotten when a product's purchase cost changes. **Mitigation:** `product.update` recomputes and writes the summary in the same transaction; test T-REPORT-05 changes a cost and asserts the KPI moves. |

### TECH-046 — User→organization index

| Field | Value |
|---|---|
| Chosen | **A backend-maintained mirror at `users/{uid}/memberships/{orgId}`, readable only by that user.** |
| Purpose | The workspace switcher, the post-login "where do I go?" decision (FR-AUTH-006), and the multi-membership requirements FR-ORG-009/010. |
| Why chosen | `05` v2 had **no way to answer "which organizations does this user belong to?"** — memberships live in a subcollection under each org. The alternatives are a `collectionGroup('members')` query, which needs a manually declared collection-group index plus a collection-group rules block, or this mirror. The mirror is one extra write inside commands that already exist (`org.create`, `team.acceptInvitation`, `team.changeMemberRole`, `team.setMemberStatus`), needs no special index, gives the switcher the org name/monogram without extra reads, and cannot leak another user's memberships. |
| Alternatives rejected | Collection-group query — more index and rules surface for a worse result. |
| Complexity LOW · Cost FREE · Day 3 |
| Risk: mirror drift. **Mitigation:** written in the same transaction as the membership document; a rules test asserts clients cannot write it; an integration test asserts mirror == membership after every membership command. |

---

# 11. SECURITY

### TECH-047 — Security Rules strategy

| Field | Value |
|---|---|
| Chosen | **Default deny. Clients may *read* their own tenant data and may *write* only a small, explicitly enumerated low-consequence set. Everything else is a backend command.** |
| Client-writable set (the complete list) | `users/{uid}` (own profile, whitelisted fields); `users/{uid}/notifications/{id}` (the `read` flag only); `organizations/{orgId}/categories/**`; `organizations/{orgId}/warehouses/**` (create/update only — **archive is a backend command** because it requires an unbounded stock check); `organizations/{orgId}/privatePartners/**`; `organizations/{orgId}/purchaseOrders/{poId}` and its `items` **only while `status == 'DRAFT'` and `supplierKind == 'PRIVATE'`**. Nothing else. |
| Backend-only | Products, stock (balances, movements, summaries), memberships, invitations, audit logs, command receipts, counters, SKU index, partner catalog publishing, connections, mappings, all connected-PO documents, all PO state transitions. |
| Why this split | It gives a defensible one-sentence rule — *"client-and-rules for low-consequence own-tenant data; trusted backend for anything touching uniqueness, stock, money, access control, cross-tenant state or audit"* — and it keeps a genuine, testable Security Rules surface for the coursework rather than reducing rules to "deny everything", while removing every path where a rule bug could corrupt the ledger. |
| Complexity MEDIUM–HIGH · Cost FREE · Day 2 (skeleton), hardened per stage · Files `firestore.rules` |

### TECH-048 — Tenant isolation mechanism

| Field | Value |
|---|---|
| Chosen | **Structural: every private document's path begins `organizations/{orgId}/`, and every rule calls exactly one helper, `isActiveMember(orgId)`, which does a single `get()` on `organizations/{orgId}/members/{request.auth.uid}` — a path that is constant for the whole request and therefore cached (VF-03).** |
| Why chosen | It is the only pattern that provably stays inside the access-call limit for list queries. |
| Risk: a future collection added outside the tenant path. **Mitigation:** `firestore.rules` ends with an explicit `match /{document=**} { allow read, write: if false; }` catch-all, and a rules test asserts that an unknown path is denied. |

### TECH-049 — Cross-tenant surfaces

| Field | Value |
|---|---|
| Chosen | **No direct client access to any cross-tenant document. Two mechanisms only: (a) backend callables for on-demand reads (partner catalog list and SKU lookup); (b) backend-written per-organization projections for anything that needs to appear in a list, a dashboard or realtime.** |
| Why chosen | A Security Rule protecting a shared document cannot determine *which* of the caller's organizations they are acting for, because a user may belong to several. Any rule attempting it must `get()` a path that varies per document, which violates VF-03 for list queries and is unbounded in general. Closing client access removes the whole class of bug. This is a correction to `05`/`06` v2, which placed `purchaseOrders`, `connections` and `productMappings` in root collections without resolving this. |
| Applied to | Connected purchase orders → projected into `organizations/{orgId}/purchaseOrders/{poId}` for both parties, so the Release-A PO list, dashboard and reports work unchanged for connected orders. Connections → projected into `organizations/{orgId}/connections/{connectionId}`. Partner catalog → callable read only. Mappings → stored under the buyer org (the supplier does not need them). |
| Complexity MEDIUM · Cost FREE · Day 12–15 |

### TECH-050 — Public projections

| Field | Value |
|---|---|
| Chosen | **`organizationDirectory/{handle}` — `allow get: if true; allow list: if false;`** |
| Why `list` is denied | Permitting `list` would let anyone dump the entire customer base of the platform. Exact-handle lookup (FR-NET-002) only needs `get`. This closes an enumeration hole that `06` v2 left unstated. |
| Contents | organizationId, handle, name, monogram, logoUrl (nullable), industry, country, directoryStatus. Nothing else, ever. |
| Complexity LOW · Cost FREE · Day 3 |

### TECH-051 — Secrets and environment variables

| Field | Value |
|---|---|
| Chosen | **Firebase Web config in `.env` files consumed via `import.meta.env.VITE_*`, with `.env.example` committed and `.env*` git-ignored. No service-account JSON ever exists in the repository; Cloud Functions use Application Default Credentials.** |
| Explicit position on the public repo | The repository **must be public** for evaluator access (CW-14). Firebase web API keys are identifiers, not secrets — they are visible in any deployed web app — so committing them would not be a vulnerability. StockFlow still keeps them in `.env` because (a) it is the correct habit, (b) it lets the emulator and production configs differ, and (c) NFR-012 says no credentials are committed. **The real security boundary is Security Rules plus backend authorization, and the report must say so explicitly rather than implying the API key protects anything.** |
| Alternatives rejected | Committing `.env` — fails NFR-012 review. Secret Manager — nothing secret exists to store. |
| Complexity LOW · Cost FREE · Day 1 · Files `.env.example`, `.gitignore` |
| Risk: a service-account key accidentally downloaded into the repo. **Mitigation:** `.gitignore` blocks `*serviceAccount*.json`, `*-firebase-adminsdk-*.json`; a `gitleaks` step runs in CI. |

---

# 12. TESTING

### TECH-052 — Unit testing

| Field | Value |
|---|---|
| Chosen | **Vitest** `^4.1.10` |
| Scope | Pure domain logic in `packages/shared`: quantity/money maths and rounding, unit conversion, PO state-machine transition tables, stock-status derivation, handle normalisation, permission table lookups, Zod schema acceptance/rejection. Target: **100 % statement coverage of `packages/shared`.** |
| Why chosen | Shares Vite's config and transform pipeline, so there is no second build setup; near-instant watch mode; Jest-compatible API so AI agents generate correct tests first time. |
| Alternatives rejected | **Jest** — separate transform config for TS + ESM, slower, more setup. |
| Complexity LOW · Cost FREE · Day 3 · Files `packages/shared/**/*.test.ts`, `vitest.config.ts` |

### TECH-053 — Component testing

| Field | Value |
|---|---|
| Chosen | **React Testing Library + `@testing-library/user-event` + `jsdom`, run by Vitest** |
| Scope | Deliberately narrow — roughly 12 tests on the components where a defect is both likely and expensive: the stock adjustment form (preview arithmetic, negative-result blocking, disabled-while-submitting), the mapping wizard (Save stays disabled until every condition passes), the receiving form (conversion preview and over-receipt blocking), the role-aware navigation, and the empty/loading/error states of one representative list. |
| Why chosen | RTL tests behaviour through the accessible tree, so they double as accessibility assertions (`getByRole`, `getByLabelText`). Full component coverage is not affordable in 13 days and has poor defect-detection value compared with rules and integration tests. |
| Alternatives rejected | **Enzyme** — dead. **Snapshot testing** — noise, no defect detection. **Cypress component testing** — a second runner. |
| Complexity MEDIUM · Cost FREE · Day 6 onward |

### TECH-054 — Security Rules testing

| Field | Value |
|---|---|
| Chosen | **`@firebase/rules-unit-testing` `^5.0.1` against the Firestore emulator, executed by Vitest** |
| Scope | Every row of the `06` threat model and every row of the RBAC matrix. Approximately 45 assertions: cross-tenant read/write denial for each private collection, direct StockBalance/StockMovement write denial, audit immutability, suspended-member denial, per-role allow/deny for the client-writable set, `organizationDirectory` get-allowed/list-denied, unknown-path denial, and denial of all cross-tenant collections. |
| Why chosen | **This is the highest-value testing per hour in the entire project.** It converts the security model from a claim into machine-verified evidence, runs in seconds, needs no UI, and produces a test report that can be pasted directly into the coursework report under the security criterion. |
| Alternatives rejected | Manual console poking — not reproducible, not evidence. |
| Complexity MEDIUM · Cost FREE · Day 3 (first tests) and continuously |
| Files | `tests/rules/*.rules.test.ts`, `tests/rules/helpers.ts` |

### TECH-055 — Backend integration testing

| Field | Value |
|---|---|
| Chosen | **Vitest against the Functions + Firestore + Auth emulators, driven by `firebase-functions-test` in *offline-free* mode or by calling the callables through the client SDK pointed at the emulator (preferred).** |
| Scope | Every command in the catalog: happy path, unauthorized caller, wrong role, wrong tenant, invalid payload, invalid state transition, **replay with the same `operationId`**, and replay with a different payload. Plus the ledger property tests INT-01…INT-08. |
| Why chosen | These tests prove the invariants the whole project rests on. A random-command-sequence test that reconciles the ledger after every step (INT-03) is worth more than a hundred component tests. |
| Complexity MEDIUM–HIGH · Cost FREE · Day 5 onward · Files `tests/integration/**` |
| Risk: slow suite. **Mitigation:** emulator started once per run with `firebase emulators:exec`; Firestore cleared between test files via the emulator REST endpoint. |

### TECH-056 — End-to-end testing

| Field | Value |
|---|---|
| Chosen | **Playwright** `^1.61.0`, Chromium only, **capped at 8 specs** |
| Scope | (1) sign-up → create organization → land on dashboard; (2) product CRUD; (3) opening balance → adjustment → movement history; (4) private PO → partial receipt → full receipt; (5) role denial by direct URL; (6) invitation accept; (7) B-Lite buyer↔supplier connected-PO round trip; (8) mobile receiving flow at 390×844. |
| Why chosen | Playwright's trace viewer, video and screenshot artifacts *are* the coursework demo evidence — they are captured automatically while the tests run, which satisfies the "capture evidence while building" rule in `16` at near-zero marginal cost. Auto-waiting removes the flakiness that makes E2E suites a liability. |
| Alternatives rejected | **Cypress** — no multi-origin/multi-context story for the two-organization B-Lite test, which is the single most valuable E2E scenario StockFlow has. **Selenium** — slow, brittle. **No E2E** — would leave the demo unrehearsed and the evidence manual. |
| Hard cap rationale | E2E is the easiest place to burn two days. Eight specs is the budget; a ninth requires a scope-change entry. |
| Complexity MEDIUM · Cost FREE · Day 10 onward · Files `e2e/*.spec.ts`, `playwright.config.ts` |
| Risk: E2E written too early against changing UI. **Mitigation:** no E2E before Stage 11. Selectors use `data-testid` or accessible roles only — never CSS classes. |

### TECH-057 — Browser QA / regression

| Field | Value |
|---|---|
| Chosen | **Google Antigravity for exploratory, role-based and responsive regression passes; Chrome DevTools Lighthouse for performance/accessibility scores.** |
| Scope | Repetitive role walkthroughs (7 roles × key screens), responsive checks at 390/768/1280/1920, visual regression by eye, and evidence screenshots for the report. |
| Why chosen | These are exactly the tasks that are expensive to automate and cheap to delegate to a browser agent. Antigravity does not replace Playwright; it covers the long tail Playwright's 8 specs deliberately skip. |
| Complexity LOW · Cost FREE/existing · Day 11 onward |

### TECH-058 — Performance evidence

| Field | Value |
|---|---|
| Chosen | **Lighthouse (Chrome DevTools) + `rollup-plugin-visualizer` bundle report + a Firestore read-count log per screen** |
| Targets | Lighthouse Performance ≥ 90 and Accessibility ≥ 90 on the public home page and the dashboard; initial JS bundle < 350 kB gzipped; dashboard first render ≤ 12 Firestore reads; product list page ≤ 27 reads (25 rows + count + summary). |
| Why chosen | The rubric explicitly rewards *performance*. Numbers with a method beat adjectives. All three artifacts are free and take under an hour total. |
| Complexity LOW · Cost FREE · Day 16 · Files `docs/evidence/performance/*` |

---

# 13. QUALITY

### TECH-059 — Linting

| Field | Value |
|---|---|
| Chosen | **ESLint 9 flat config + `typescript-eslint` `^8.66.0` + `eslint-plugin-react-hooks` + `eslint-plugin-jsx-a11y` + `eslint-plugin-import`** |
| Key custom rules | `no-restricted-imports` blocking `firebase/firestore` outside `src/services` and `src/lib/firebase`; blocking `packages/shared` internals from being bypassed; banning raw string query keys; `jsx-a11y` recommended set enabled as **errors**, not warnings. |
| Why chosen | `jsx-a11y` as an error is the cheapest possible way to hold the accessibility baseline (NFR-016) across 30 screens built at speed. The architectural `no-restricted-imports` rules make NFR-011 enforced rather than hoped for. |
| Complexity LOW · Cost FREE · Day 1 · Files `eslint.config.js` |

### TECH-060 — Formatter

| Field | Value |
|---|---|
| Chosen | **Prettier**, default config plus `printWidth: 100`, with `eslint-config-prettier` to disable conflicting rules. |
| Why chosen | Removes all formatting discussion and, critically, makes AI-generated diffs reviewable — an unformatted agent commit is impossible to code-review quickly. |
| Alternatives rejected | Biome — faster, but Prettier has better editor/agent ubiquity. |
| Complexity LOW · Cost FREE · Day 1 |

### TECH-061 — TypeScript strictness

| Field | Value |
|---|---|
| Chosen | `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `noImplicitOverride: true`, `noFallthroughCasesInSwitch: true`, `verbatimModuleSyntax: true`, `erasableSyntaxOnly: true`. **`any` is banned by lint; `unknown` + a Zod parse is the required pattern at every boundary.** |
| Why chosen | `noUncheckedIndexedAccess` alone prevents a large family of "undefined is not an object" runtime errors when indexing Firestore result arrays — precisely the kind of error the "error-free system" criterion punishes. |
| Complexity LOW–MEDIUM · Cost FREE · Day 1 |
| Risk: friction on Day 1. **Mitigation:** enabled from the first commit, never retrofitted. |

### TECH-062 — Pre-commit hooks

| Field | Value |
|---|---|
| Chosen | **`simple-git-hooks` + `lint-staged`** running Prettier and ESLint `--fix` on staged files, plus `tsc --noEmit` on commit. **Tests do not run on commit.** |
| Why chosen | Justified because multiple AI agents will be committing; a hook is the only thing that reliably stops an agent from committing unformatted or non-compiling code. Kept fast (< 5 s) so it is never bypassed. |
| Alternatives rejected | **Husky** — heavier for the same result. **Running tests on commit** — too slow; that is CI's job. |
| Complexity LOW · Cost FREE · Day 1 |

### TECH-063 — Continuous integration

| Field | Value |
|---|---|
| Chosen | **GitHub Actions: one workflow on push and pull request running `npm ci` → `tsc --noEmit` → `eslint` → `vitest run` (unit + component) → `firebase emulators:exec "vitest run --project rules --project integration"` → `npm run build` → `gitleaks`.** |
| Why chosen | Justified, not decorative: it produces a **timestamped, third-party-verifiable record that the test suite passed on specific commits**, which is exactly the kind of evidence that supports both the "error-free system" criterion and the individual-contribution claim. It is free for public repositories, takes about 40 minutes to set up, and catches "works on my machine" before submission day. A green badge in the README is the cheapest quality signal available. |
| Alternatives rejected | No CI — loses the evidence trail. Deploy-on-merge — unnecessary risk; deployment stays manual and deliberate. |
| Complexity LOW–MEDIUM · Cost FREE (public repo) · Day 1 (skeleton), Day 2 (full) · Files `.github/workflows/ci.yml` |
| Risk: a red CI on submission day. **Mitigation:** CI must be green before every stage checkpoint, not just at the end. |

---

# 14. DEPLOYMENT

### TECH-064 — Firebase project strategy

| Field | Value |
|---|---|
| Chosen | **ONE Firebase project (`stockflow-<suffix>`), Blaze plan, used as production. All development and all automated testing run on the Local Emulator Suite. No separate staging project.** |
| Why chosen | A second project doubles the configuration surface (auth providers, authorised domains, indexes, rules deploys, budget alerts) and doubles the chance of demoing against the wrong backend — for a system with one developer, no real users and full emulator fidelity. The emulator *is* the development environment, and it is a better one than a shared cloud project because it is deterministic and free. |
| Alternatives rejected | **dev + prod projects** — correct at team scale; here the cost/benefit is negative within 13 days. Recorded as the documented post-coursework upgrade. |
| Complexity LOW · Cost FREE (within Blaze no-cost tier) · Day 1 |
| Risk: a destructive script run against production. **Mitigation:** the seed/reset script refuses to run unless `--project` is passed explicitly *and* a `--i-understand-this-is-production` flag is present for the live project. |

### TECH-065 — Development environment

| Field | Value |
|---|---|
| Chosen | **`npm run dev` starts Vite; `npm run emu` starts the emulator suite with persisted data (`--import ./.emulator-data --export-on-exit`); `npm run dev:all` runs both with `concurrently`.** |
| Why chosen | Persisted emulator data means the seeded demo dataset survives restarts, which removes a daily 10-minute re-seed tax. |
| Complexity LOW · Cost FREE · Day 1 · Files `firebase.json`, npm scripts |

### TECH-066 — Production environment

| Field | Value |
|---|---|
| Chosen | **Firebase Hosting + Cloud Functions (Node 22) + Firestore, all in one region. Deploy is a single script: build shared → build functions → build app → `firebase deploy`.** |
| Ordering rule | Indexes and rules deploy **before** functions and hosting, so the new app never runs against an old ruleset. |
| Complexity LOW · Cost FREE · Day 12 (first real deploy), Day 16 (final) |
| Risk: first-ever deploy failing on Day 16. **Mitigation:** a throwaway "hello world" deploy of hosting *and* one callable function is a **Day-1 gate item**. This single 20-minute task de-risks the most common catastrophic end-of-project failure. |

### TECH-067 — GitHub

| Field | Value |
|---|---|
| Chosen | **Public GitHub repository, `main` as the only long-lived branch, short-lived `feat/<stage>` branches merged by fast-forward or squash, conventional-commit messages, tags at each stage checkpoint.** |
| Evaluator access | Public visibility satisfies CW-14 with no invitation management. **Verified by opening the repository URL in a signed-out private browser window** — this is a submission-gate item because the brief warns of zero marks for inaccessible repositories. |
| Repository contents | Source, `docs/final/` (this pack), `docs/qa/`, `docs/evidence/`, README with setup + the live URL, LICENSE, `.env.example`, rules, indexes, CI workflow. |
| Why chosen | Simplest possible thing that satisfies the brief with zero access risk. |
| Complexity LOW · Cost FREE · Day 1 |
| Risk: committing a secret to a public repo. **Mitigation:** `gitleaks` in CI plus the `.gitignore` rules in TECH-051. |

### TECH-068 — Environment variable management

| Field | Value |
|---|---|
| Chosen | **`.env.local` (emulator) and `.env.production` (live), both git-ignored; `.env.example` committed and documented in the README. Only `VITE_`-prefixed variables reach the browser. Cloud Functions read runtime configuration from `process.env` / `defineString` parameters, with no secrets required.** |
| Complexity LOW · Cost FREE · Day 1 |

### TECH-069 — Budget alerts and cost guardrails

| Field | Value |
|---|---|
| Chosen | **A Google Cloud budget on the project set to **$5** with alert thresholds at 50 %, 90 % and 100 %, emailing the student; plus `maxInstances: 10` on every function; plus a hard `limit()` on every query.** |
| Why chosen | Blaze is pay-as-you-go and the account is a student's. A budget alert is a five-minute task that removes the only financial risk in the project. Note honestly in the report that a budget alert *notifies*, it does not cap spend — the real cap is `maxInstances`, query limits, and the fact that the app has no public write surface. |
| Complexity LOW · Cost FREE · Day 1 · Evidence: screenshot of the budget page for the report |

---

# 15. OPTIONAL SERVICES — EXPLICIT VERDICTS

| Service | Verdict | Reasoning |
|---|---|---|
| **Firebase Cloud Storage** | **DO NOT USE** | Blaze-gated (VF-02); only use case is logo upload, already replaced by monograms. Saves ~half a day of upload/rules/cleanup work. |
| **Email provider** (SendGrid / Resend / Firebase Trigger Email extension) | **DO NOT USE** | RC-14 already removed the email dependency from invitations: the callable returns a single-use invite link the Owner copies. Adding a provider means an account, an API key, a domain, deliverability debugging and a secret to protect — for a feature the acceptance criteria explicitly do not require. Password reset is handled by Firebase Auth's own hosted email. |
| **Algolia / Typesense / full-text search** | **DO NOT USE** | FR-NET-002 requires exact-handle lookup, which is a single `get()`. Product search is a prefix filter within one tenant. Release D explicitly excludes enterprise search. |
| **Sentry / error monitoring** | **POST-COURSEWORK** | Genuinely useful in production, but during a 13-day build the errors are found by the test suite and the emulator, and a free-tier Sentry project adds a DSN to manage. Cloud Functions logs already go to Cloud Logging, which covers backend errors. A global React error boundary that shows a recoverable UI is implemented instead — that is what the marker will see. |
| **Google Analytics / telemetry** | **DO NOT USE** | No product-analytics question is being asked, it adds a consent obligation, and it puts a tracking script on a coursework artifact for no marks. |
| **Redis** | **DO NOT USE** | No demonstrated caching requirement; TanStack Query is the cache. Adding a Memorystore instance would introduce real monthly cost and a VPC connector. |
| **SQL database (Cloud SQL / Postgres)** | **DO NOT USE** | Firestore transactions already provide the atomicity the ledger needs. Migrating would discard the entire verified security model and add server hosting. |
| **Supabase** | **DO NOT USE** | A viable alternative platform, but switching now with 13 days left would invalidate this pack's rules, transactions and emulator strategy. |
| **Docker** | **DO NOT USE** for the app. | Emulators run natively via the Firebase CLI. Docker would be an extra install and an extra failure mode. |
| **n8n / workflow automation** | **DO NOT USE** | No integration surface exists in A/B. |
| **Webhooks / event bus** | **POST-COURSEWORK** | Release D. |
| **Payment provider** | **DO NOT USE** | Storefront is read-only in C; checkout is Release D. |
| **External API gateway** | **DO NOT USE** | Callables are the only surface; no third-party consumers exist. |
| **Firebase App Check** | **POST-COURSEWORK** | Real value against callable abuse, but requires reCAPTCHA Enterprise setup, debug tokens for the emulator and CI, and a failure mode that silently blocks legitimate calls during a demo. Documented as the next security hardening step — which is itself good reflection material. |
| **Firebase Remote Config** | **DO NOT USE** | Feature flags live in `OrganizationSettings`, which is simpler and already exists. |
| **Firebase Data Connect** | **DO NOT USE** | Introduces Cloud SQL and a second data model. |
| **Firebase Extensions** | **DO NOT USE** | Each one is a Cloud Function the student did not write and cannot fully explain in a viva. |
| **Firebase App Hosting** | **DO NOT USE** | For SSR frameworks; classic Hosting is correct for a Vite SPA (TECH-025). |
| **Dependabot / Renovate** | **DO NOT USE** during the build | VP-03 freezes dependencies after Day 9; automated upgrade PRs would be noise. Enable after submission. |

---

# 16. FALLBACK PROFILE — IF BLAZE CANNOT BE ENABLED

This is the only fork in the architecture and it **must be resolved on Day 1, before Stage 2 begins.**

**Profile P1 (assumed, recommended):** Blaze enabled. Everything above applies.

**Profile P0 (contingency):** Blaze unavailable (no payment card accepted, account restriction, or institutional constraint).

| Aspect | P0 behaviour |
|---|---|
| Commands | Move from Cloud Functions into the browser, executed inside **client-side Firestore transactions**, using the *same* pure domain functions from `packages/shared` — this is why the domain logic is kept free of any SDK dependency. |
| Security Rules | Must become far stricter and far more complex: every write is validated in rules (field whitelists, `request.resource.data` arithmetic checks, `getAfter()` to require that a movement, a balance and a summary are written together). Rules access-call limits (VF-03) must be respected. |
| Idempotency | The receipt document is created with `create` inside the same client transaction; the `create` fails if the operation id already exists, giving replay protection from Firestore itself. |
| Audit | Written by the client in the same transaction; rules allow `create` only, never `update`/`delete`. Weaker than P1 (the actor writes their own audit record) and this weakness **must be stated honestly in the report**. |
| Release B | **CUT.** Cross-tenant state transitions cannot meet the security contract without a trusted server. Connection, Partner Catalog and Mapping may be retained read-only within a single tenant for demonstration only if time allows; connected purchase orders are removed. |
| Scope result | Release A only, fully secure within its own tenant. |
| Schedule impact | +1.5 days on rules and rules tests, −4 days from cutting Release B. Net: the project finishes earlier with less differentiation. |

**Decision rule:** *A smaller, fully secure Release A beats a larger insecure system.* Never resolve a Blaze failure by opening client write access without the corresponding rules.

---

# 17. FINAL_STACK_SUMMARY

| Layer | Technology | Version policy | Notes |
|---|---|---|---|
| Language | TypeScript | `~5.9.3` | Deliberately not 7.x |
| Runtime | Node.js | 22 LTS | app tooling + Functions |
| Framework | React | `^19.2.8` | SPA, no SSR |
| Build | Vite | `^8.2.1` | + `@vitejs/plugin-react` |
| Routing | react-router-dom | `^7.18.2` | declarative mode only |
| Styling | Tailwind CSS | `^4.3.3` | `@tailwindcss/vite`, CSS `@theme` tokens |
| Components | Local `src/ui` + Radix primitives | current | Dialog, DropdownMenu, Select, Tooltip only |
| Icons | lucide-react | current | tree-shaken |
| Charts | Recharts | current | 3 charts, lazy-loaded, first thing cut |
| Toasts | sonner | current | UI feedback only |
| Forms | React Hook Form | `^7.77.0` | + `@hookform/resolvers` |
| Validation | Zod | `^4.4.3` | **shared client+server contract** |
| UI state | React `useState`/`useReducer` | — | no global store |
| Auth state | React Context (`AuthProvider`) | — | one `onIdTokenChanged` |
| Org state | React Context (`OrgProvider`) | — | membership via `onSnapshot` |
| Server state | TanStack Query | `^5.101.4` | + 4 named realtime carve-outs |
| Auth | Firebase Authentication | SDK `^12.17.1` | Email/Password + Google popup |
| Database | Cloud Firestore | — | single multi-tenant DB, one region |
| Backend | Cloud Functions 2nd gen | `firebase-functions@^7.2.5` | Node 22, `onCall` only, `defineCommand` factory |
| Admin SDK | firebase-admin | `^14.1.0` | explicit authorization on every call |
| Hosting | Firebase Hosting (static) | — | SPA rewrite |
| Storage | — | — | **not used** (monograms) |
| Emulators | Firebase Local Emulator Suite | `firebase-tools@^15.26.0` | auth, firestore, functions, hosting |
| Money | integer minor units | — | `packages/shared/money.ts` |
| Quantity | integer milli-units | — | branded type, exact ledger reconciliation |
| Idempotency | org-scoped `commandReceipts` + payload hash | — | read inside the transaction |
| Unit tests | Vitest | `^4.1.10` | 100 % of `packages/shared` |
| Component tests | React Testing Library | current | ~12 targeted tests |
| Rules tests | `@firebase/rules-unit-testing` | `^5.0.1` | ~45 assertions |
| Integration tests | Vitest + emulators | — | every command × 8 cases |
| E2E | Playwright | `^1.61.0` | Chromium, **8 specs max** |
| Browser QA | Google Antigravity | — | roles, responsive, evidence |
| Lint | ESLint 9 + typescript-eslint + jsx-a11y | `^8.66.0` | a11y rules as errors |
| Format | Prettier | current | + `eslint-config-prettier` |
| Hooks | simple-git-hooks + lint-staged | current | format, lint, typecheck |
| CI | GitHub Actions | — | typecheck, lint, all tests, build, gitleaks |
| Repo | GitHub, **public** | — | evaluator access verified signed-out |
| Cost guard | GCP budget $5 + `maxInstances: 10` | — | screenshot kept as evidence |

**Total third-party runtime packages in the browser bundle: 17** — `react`, `react-dom`, `react-router-dom`, `firebase`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`, `lucide-react`, `recharts`, `sonner`, `clsx`, `tailwind-merge`, and the four Radix primitives. Tailwind is build-time only and ships no runtime code. Every one is justified above. **Any eighteenth requires a scope-change entry in `01`.**

---

# 18. Freeze statement

> This stack is frozen as of 09 August 2026. The only decision still open is **Blaze vs no-Blaze (§16)**, which must be closed on Day 1. Every other question an implementer might ask about "which library" is answered in this document; if it is not answered here, the answer is "do not add it".
