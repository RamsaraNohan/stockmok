# 43 — Stockmok Design Direction Recommendation

**Input to:** Claude Design (via the master prompt, file 45). **Constraint:** presentation/product-design only; no business-rule, RBAC, data-ownership, or scope changes.

---

## 1. Design philosophy — what Stockmok should feel like

> **Stockmok is a calm, precise operations tool that a busy storekeeper trusts at 7am and a marker respects at first glance.** It should feel *operational, honest, and quietly confident* — closer to a well-run kitchen pass than to a flashy dashboard product.

| Question | Answer |
|---|---|
| How dense? | **Comfortably dense.** Tables are the workhorse; rows scannable, tabular numerals, no wasted chrome. Detail/receiving use summary strips + focused panels, not walls of fields. |
| How premium? | **Understated-premium.** Precision and restraint signal quality — not gradients or motion. Alignment, spacing discipline, and typographic hierarchy do the work. |
| How operational? | **Very.** Every screen answers "what do I do next?" The primary action is obvious; consequences are previewed before commit. |
| How branded? | **Lightly at platform level, strongly at organization level.** The org monogram + full name is the loudest identity on every authenticated screen (wrong-workspace prevention). The Stockmok mark stays small. |
| How calm? | **Calm.** One blue, quiet slate canvas, restrained status colour, almost no motion. Colour is reserved for status meaning, not decoration. |
| How data-heavy? | **Data-honest.** Every number traces to a query; charts are secondary and always have a text alternative. No vanity BI. |
| How much colour? | **Minimal.** Primary blue for action/selection; success/warning/danger only for state. Neutral everywhere else. |
| How much personality? | **A little, in the right place.** Personality lives in the *connected-business lane* (a distinct, trustworthy visual language for cross-org workflows) and in crisp empty-state copy — not in chrome. |
| How should business context appear? | Persistent header band: org monogram + untruncated name + active role badge; workspace switcher when multi-org. |

### What must distinguish Stockmok from…
- **Generic admin templates:** by *operational clarity* (previews, states, receiving-first mobile) and the signature connected workflow — not by novel widgets.
- **Old ERP:** by restraint, plain language, and role-appropriate simplicity — no dense menus of everything.
- **Consumer SaaS:** by seriousness and data-honesty — no playful gradients, no marketing fluff inside the app.
- **BI dashboards:** by actionability — KPIs deep-link to the screen that resolves them; charts never replace an accurate table.
- **Marketplaces:** by privacy and intent — exact-handle connection only, no browse/discovery grid, no public catalog surfing.

---

## 2. Elements to preserve (carry forward unchanged)

1. **Design-system tokens** (file 21): `primary #1D4ED8`, neutral slate ramp, status palette with documented AA contrast, 4px spacing scale, radius/shadow, Inter + tabular numerals, `bp-390`. Do not alter.
2. **Monogram identity system** (BRAND-005): deterministic AA-safe palette, full-name pairing.
3. **Information architecture** (files 07/19): routes, nav grouping, role-aware sidebar, guard layers, feature-flagged NETWORK, permission-denied/404 as designed screens. Do not re-architect.
4. **Reference-quality assets:** branded login (004), populated dashboard w/ chart text-alts (010), mobile receiving (009), mobile drawer (043), connected-PO dual representation (038), permission-denied copy (029).
5. **Scope discipline:** zero Sales/POS/Accounting/Marketplace/AI. Private buyers = directory only. Storefront (C) and all Release D absent from A/B UI.
6. **Honesty rules:** advertise only what's built; non-enumerating auth errors; "hidden ≠ security"; charts optional with text alternatives.

---

## 3. Elements to rethink

1. **Every deterministic form/workflow screen** — replace spec-scaffold with real, labelled, component-built UI. (files 38/42.)
2. **Product Mapping wizard** — design from scratch as the signature workflow.
3. **Desktop receiving & adjustment** — raise to mobile standard.
4. **Network lane** — design connection/discovery/catalog/publish with a distinct, trustworthy "connected" visual language and prominent privacy messaging.
5. **Private vs Connected** — make the distinction structural, not a pill.
6. **State coverage** — turn state boards from text lists into designed state galleries.
7. **Dashboards** — one adaptive dashboard with role deltas, not five pages.
8. **Brand mark** — resolve the S-readability question (OWNER).

---

## 4. Design priorities (ordered)

1. Remove all engineering copy; establish real microcopy voice. (DI-002)
2. Signature: Product Mapping wizard. (DI-001)
3. Signature ops: Receiving (desktop+connected) and Adjustment to mobile standard. (DI-003/005)
4. Core CRUD forms legible (Product/Category/Warehouse/Opening balance). (DI-004)
5. Network lane + privacy messaging. (DI-006)
6. Private/Connected structural distinction. (DI-008)
7. App shell + dashboards + reports + timelines. (DI-009/010/013/018)
8. States, tables, a11y labels, boards regenerated. (DI-011/014/016/019)

---

## 5. Representative-screen requirements (for the 3 territories in Gate 2)

Each of the three visual territories must design the **same nine** screens so the owner can compare like-for-like:

1. Public Homepage (`/`)
2. Branded Login (`/b/:handle`) — including the role-mismatch state
3. Dashboard (populated, Owner/Admin) — KPIs + Needs Attention + one chart with text alt
4. Product List (`…/inventory/products`) — table + filters + row actions + mobile card note
5. Product Detail (`…/products/:id`) — tabs incl. per-warehouse Stock
6. Receiving (`…/procurement/receiving`) — desktop, the full arithmetic
7. Product Mapping wizard (`…/network/mappings/new`) — full 5-step signature
8. Connected PO — Buyer (`…/purchase-orders/:poId`) — dual representation + timeline
9. **390px mobile Receiving** — one-handed, sticky confirm

Territories must differ **meaningfully** in information density, navigation treatment, card/table language, typographic hierarchy, brand expression, and data presentation — **not merely colour**. All three must stay within token/scope/a11y constraints and remain implementable in the frozen stack.

---

## 6. Constraints (hard)

- No new business modules, RBAC changes, stock-accounting changes, PO state-machine changes, connected-privacy changes, or data-ownership changes.
- No Release C or D surfaces.
- No motion systems, gradients, glass, dark theme, global search, command palette, custom illustration sets, or BI/trend charts.
- No UI that shows another tenant's private data or requires an unbounded query.
- Design frozen after owner approval; only defect + responsive/a11y passes thereafter.

---

## 7. Success definition

The redesign succeeds when: (a) a marker can watch the SC-01→SC-22 demo and understand every screen without seeing an identifier or route; (b) the signature mapping and receiving flows are self-explanatory; (c) Release A looks visually complete with charts removed; (d) mobile receiving is one-handed; (e) nothing implies an unbuilt capability; (f) every design is buildable within the 13-day window using the existing token/component system.
