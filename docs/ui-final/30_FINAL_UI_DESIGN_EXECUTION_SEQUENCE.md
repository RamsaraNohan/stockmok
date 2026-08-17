# Stockmok Final UI Design Execution Sequence

**Status:** `EXECUTION_SEQUENCE_FREEZE = PASS`  
**Upstream gate:** `UI_ARCHITECTURE_FREEZE = PASS`  
**Downstream gates:** `PROMPT_QA = PASS`; `VISUAL_GENERATION_AND_QA = IN_PROGRESS`  
**Scope:** documentation and generated design visuals only; no application code, routes, schemas, components, tests, Firebase configuration, or production assets may be created or changed.

## 1. Frozen execution contract

This document is the generation-order authority. Files 26 and 27 own the prompt bodies; file 31 owns final asset paths; file 32 owns prompt-to-image status; file 33 owns independent visual QA; and the generated manifest owns physical-file evidence. This document does not duplicate prompt bodies or invent a second asset registry. The 2026-08-10 owner continuation overrides the former exact-raw-dimension and global-stop rules: semantic QA precedes deterministic output normalization, and an isolated visual failure blocks only direct dependants and final approval.

The migrated generation set contains **106 stable prompt/visual contracts, of which 105 are approved and require current visuals**. `PROMPT-BRAND-001` is the sole retired contract under the owner’s controlled-brand decision.

| Owning document | Prompt families | Prompt count | Visual families | Required current visuals |
|---|---|---:|---|---:|
| File 26 | `PROMPT-SCREEN-001..052` | 52 | `VISUAL-SCREEN-001..052` | 52 |
| File 26 | `PROMPT-MOBILE-001..011` | 11 | `VISUAL-MOBILE-001..011` | 11 |
| File 26 | `PROMPT-STATE-001..011` | 11 | `VISUAL-STATE-001..011` | 11 |
| File 26 | `PROMPT-COMP-001..010` | 10 | `VISUAL-COMP-001..010` | 10 |
| File 26 | `PROMPT-BRAND-001..006` | 6 contracts: 5 approved, 1 retired | `VISUAL-BRAND-001..006` | 5 |
| File 27 | `PROMPT-BOARD-001..008` | 8 | `VISUAL-BOARD-001..008` | 8 |
| File 27 | `PROMPT-REVIEW-001..008` | 8 | `VISUAL-REVIEW-001..008` | 8 |
| **Total** | **6 prompt families** | **106 contracts / 105 approved** | **6 visual families** | **105** |

Every mapping is ordinal within its family: for example, `PROMPT-SCREEN-016` maps only to `VISUAL-SCREEN-016`. A prompt or visual ID may appear in exactly one batch. A rejected or superseded attempt is history and does not increase the current-visual count.

### 1.1 Fixed R2 mobile mapping

| Mobile prompt | Visual | Screen | Surface |
|---|---|---|---|
| `PROMPT-MOBILE-001` | `VISUAL-MOBILE-001` | `SCREEN-003` | Global Login |
| `PROMPT-MOBILE-002` | `VISUAL-MOBILE-002` | `SCREEN-004` | Branded Business Login |
| `PROMPT-MOBILE-003` | `VISUAL-MOBILE-003` | `SCREEN-006` | Workspace Selector |
| `PROMPT-MOBILE-004` | `VISUAL-MOBILE-004` | `SCREEN-010` | Populated Dashboard |
| `PROMPT-MOBILE-005` | `VISUAL-MOBILE-005` | `SCREEN-011` | Product List |
| `PROMPT-MOBILE-006` | `VISUAL-MOBILE-006` | `SCREEN-013` | Product Detail |
| `PROMPT-MOBILE-007` | `VISUAL-MOBILE-007` | `SCREEN-016` | Stock Adjustment sheet |
| `PROMPT-MOBILE-008` | `VISUAL-MOBILE-008` | `SCREEN-023` | Purchase Order Detail |
| `PROMPT-MOBILE-009` | `VISUAL-MOBILE-009` | `SCREEN-024` | Receiving |
| `PROMPT-MOBILE-010` | `VISUAL-MOBILE-010` | `SCREEN-026` | Notifications |
| `PROMPT-MOBILE-011` | `VISUAL-MOBILE-011` | `SCREEN-043` | Mobile Application Navigation |

### 1.2 Fixed state-board mapping

| Prompt / visual ordinal | Board |
|---|---|
| `001` | Login states |
| `002` | Product List states |
| `003` | Stock Adjustment states |
| `004` | Purchase Order states |
| `005` | Receiving states |
| `006` | Connection states |
| `007` | Product Mapping states |
| `008` | Connected Purchase Order states |
| `009` | Invitation states |
| `010` | Permission states |
| `011` | Loading, Empty, and Error patterns |

### 1.3 Fixed component-board mapping

The ten boards cover all and only `COMP-001..025`; they do not create a 26th primitive.

| Prompt / visual ordinal | Board | Frozen component coverage |
|---|---|---|
| `001` | Buttons | `COMP-001..002` |
| `002` | Fields and forms | `COMP-003..007`, `COMP-023` |
| `003` | Tables | `COMP-012..013`, `COMP-024` |
| `004` | Badges and status | `COMP-010..011` |
| `005` | Navigation and identity | `COMP-014`, `COMP-021`, `COMP-025` |
| `006` | Dialogs and drawers | `COMP-015..016` |
| `007` | Alerts and toasts | `COMP-017` plus alert compositions from existing primitives |
| `008` | Cards and KPIs | `COMP-008..009`, `COMP-022` |
| `009` | Approved charts | `CHART-001..003` with their table/text alternatives; no fourth chart |
| `010` | Loading, empty, and error | `COMP-018..020` |

### 1.4 Fixed board mapping

| Prompt | Visual | Board |
|---|---|---|
| `PROMPT-BOARD-001` | `VISUAL-BOARD-001` | Brand + Design System |
| `PROMPT-BOARD-002` | `VISUAL-BOARD-002` | Public + Authentication |
| `PROMPT-BOARD-003` | `VISUAL-BOARD-003` | Dashboard + Inventory |
| `PROMPT-BOARD-004` | `VISUAL-BOARD-004` | Procurement + Receiving |
| `PROMPT-BOARD-005` | `VISUAL-BOARD-005` | Connected Businesses + Mapping |
| `PROMPT-BOARD-006` | `VISUAL-BOARD-006` | Reports + Team + Settings |
| `PROMPT-BOARD-007` | `VISUAL-BOARD-007` | Mobile Responsive |
| `PROMPT-BOARD-008` | `VISUAL-BOARD-008` | Complete Stockmok Product Showcase |
| `PROMPT-REVIEW-001` | `VISUAL-REVIEW-001` | All Public + Auth contact sheet |
| `PROMPT-REVIEW-002` | `VISUAL-REVIEW-002` | All Dashboard + Inventory contact sheet |
| `PROMPT-REVIEW-003` | `VISUAL-REVIEW-003` | All Procurement contact sheet |
| `PROMPT-REVIEW-004` | `VISUAL-REVIEW-004` | All Network contact sheet |
| `PROMPT-REVIEW-005` | `VISUAL-REVIEW-005` | All Admin contact sheet |
| `PROMPT-REVIEW-006` | `VISUAL-REVIEW-006` | All Mobile contact sheet |
| `PROMPT-REVIEW-007` | `VISUAL-REVIEW-007` | All States contact sheet |
| `PROMPT-REVIEW-008` | `VISUAL-REVIEW-008` | Complete Product Overview contact sheet |

## 2. B01-B16 batch register

The owner-mandated execution order is `B01`, `B03..B14`, `B02`, `B15`, `B16`: freeze the five Stockmok brand boards, generate real application screens first, then mobile, component/state boards, and finally showcase/review boards. Independent items may continue around an isolated failure. Within a batch, each approved prompt receives one built-in image-generation call per attempt.

| Batch | Prompt IDs in exact generation order | Visual IDs | Hard dependencies | Destination group | Batch-specific QA |
|---|---|---|---|---|---|
| `B01 Brand` | `PROMPT-BRAND-002`, `PROMPT-BRAND-003`, `PROMPT-BRAND-004`, `PROMPT-BRAND-005`, `PROMPT-BRAND-006` | `VISUAL-BRAND-002`, `VISUAL-BRAND-003`, `VISUAL-BRAND-004`, `VISUAL-BRAND-005`, `VISUAL-BRAND-006` | Architecture and Stockmok rename plan frozen; targeted prompt QA passed for all five | `generated/01_brand/` | One exact Stackline-S geometry, exact “Stockmok” wordmark, `stockmok.com` only where a domain belongs, controlled opaque backgrounds, `DESIGN_AS_VECTOR` labels, no new exploration. |
| `B02 Design System` | `PROMPT-COMP-001`, `PROMPT-COMP-002`, `PROMPT-COMP-003`, `PROMPT-COMP-004`, `PROMPT-COMP-005`, `PROMPT-COMP-006`, `PROMPT-COMP-007`, `PROMPT-COMP-008`, `PROMPT-COMP-009`, `PROMPT-COMP-010` | `VISUAL-COMP-001`, `VISUAL-COMP-002`, `VISUAL-COMP-003`, `VISUAL-COMP-004`, `VISUAL-COMP-005`, `VISUAL-COMP-006`, `VISUAL-COMP-007`, `VISUAL-COMP-008`, `VISUAL-COMP-009`, `VISUAL-COMP-010` | Execute after B14; frozen tokens, Stockmok brand, and application examples available | `generated/21_component-boards/` | All 25 components covered once; three brand-neutral current boards may be kept after audit; regenerated boards use Stockmok and never invent navigation. |
| `B03 Public/Auth` | `PROMPT-SCREEN-001`, `PROMPT-SCREEN-002`, `PROMPT-SCREEN-003`, `PROMPT-SCREEN-041`, `PROMPT-SCREEN-004`, `PROMPT-SCREEN-005`, `PROMPT-SCREEN-006`, `PROMPT-SCREEN-007`, `PROMPT-SCREEN-029`, `PROMPT-SCREEN-030` | `VISUAL-SCREEN-001`, `VISUAL-SCREEN-002`, `VISUAL-SCREEN-003`, `VISUAL-SCREEN-041`, `VISUAL-SCREEN-004`, `VISUAL-SCREEN-005`, `VISUAL-SCREEN-006`, `VISUAL-SCREEN-007`, `VISUAL-SCREEN-029`, `VISUAL-SCREEN-030` | `B01` Stockmok brand freeze; architecture and copy frozen | registered paths under `generated/03_public/`, `04_auth/`, and `05_onboarding/` | Correct public/auth shell and routes; Stockmok platform identity; neutral non-enumerating auth/reset copy; branded role choice grants no authority; zero scope-invented navigation. |
| `B04 Shell/Dashboard` | `PROMPT-SCREEN-008`, `PROMPT-SCREEN-043`, `PROMPT-SCREEN-009`, `PROMPT-SCREEN-010`, `PROMPT-SCREEN-044`, `PROMPT-SCREEN-045`, `PROMPT-SCREEN-046`, `PROMPT-SCREEN-047` | `VISUAL-SCREEN-008`, `VISUAL-SCREEN-043`, `VISUAL-SCREEN-009`, `VISUAL-SCREEN-010`, `VISUAL-SCREEN-044`, `VISUAL-SCREEN-045`, `VISUAL-SCREEN-046`, `VISUAL-SCREEN-047` | `B03` pass; shell identity and navigation frozen | `generated/06_dashboard/` plus registered shell path | Organization monogram/full name, role badge, conditional workspace switcher, bell, user menu, breadcrumb, expanded/collapsed/mobile navigation are coherent; all role variants expose only authorized actions; Storekeeper receives Receiving, not Adjust Stock; all five KPIs remain KPIs; only `CHART-001..002` appear. |
| `B05 Inventory` | `PROMPT-SCREEN-011`, `PROMPT-SCREEN-012`, `PROMPT-SCREEN-013`, `PROMPT-SCREEN-014`, `PROMPT-SCREEN-015` | `VISUAL-SCREEN-011`, `VISUAL-SCREEN-012`, `VISUAL-SCREEN-013`, `VISUAL-SCREEN-014`, `VISUAL-SCREEN-015` | `B04` pass | `generated/07_inventory/` | Exact product/category/warehouse fields, tabs, filters, columns, cursor pagination, archive rules, units, and values; read-only roles have no write actions; Product Detail preserves Overview/Stock/Suppliers/Buyers-when-relevant/Activity behavior. |
| `B06 Stock Operations` | `PROMPT-SCREEN-016`, `PROMPT-SCREEN-042`, `PROMPT-SCREEN-017` | `VISUAL-SCREEN-016`, `VISUAL-SCREEN-042`, `VISUAL-SCREEN-017` | `B05` pass | `generated/08_stock/` | Adjustment and opening balance are overlays, not invented routes; current/result quantities and operation reference are explicit; >50% decrease confirms; movement history shows exact types/actors/timestamps; canonical chain starts `18 -> 20 -> 60 -> 70 KG`; replay is visibly idempotent. |
| `B07 Private Procurement` | `PROMPT-SCREEN-018`, `PROMPT-SCREEN-019`, `PROMPT-SCREEN-020`, `PROMPT-SCREEN-021`, `PROMPT-SCREEN-022`, `PROMPT-SCREEN-023` | `VISUAL-SCREEN-018`, `VISUAL-SCREEN-019`, `VISUAL-SCREEN-020`, `VISUAL-SCREEN-021`, `VISUAL-SCREEN-022`, `VISUAL-SCREEN-023` | `B06` pass | `generated/09_procurement/` | Private Supplier and Buyer remain first-class and never imply connection; PO builder and detail use Green Farm, 50 KG at LKR 1,200.00/KG; lifecycle actions/statuses follow the private PO state machine; read-only roles receive no mutation controls. |
| `B08 Receiving` | `PROMPT-SCREEN-024` | `VISUAL-SCREEN-024` | `B07` pass and valid ordered PO detail | `generated/10_receiving/` | Highest-priority core workflow; each line visibly shows ordered, previously received, receive-now, warehouse, current stock, after stock, and outstanding; first receipt `40 KG` produces `60 -> 100 KG`, second `10 KG` produces `110 -> 120 KG`; over-receipt is blocked; unit/currency and operation reference are readable. |
| `B09 Connections` | `PROMPT-SCREEN-031`, `PROMPT-SCREEN-032`, `PROMPT-SCREEN-033` | `VISUAL-SCREEN-031`, `VISUAL-SCREEN-032`, `VISUAL-SCREEN-033` | `B08` pass; Network flag on | `generated/11_connections/` | O/A full and PM limited; IM/SK/AN/VW have no Network UI; discovery is exact `@handle` only, never browsing/fuzzy search; pending/incoming/active/disabled distinctions and directional supplier relationship are explicit; disabled history is retained. |
| `B10 Partner Catalog` | `PROMPT-SCREEN-034`, `PROMPT-SCREEN-051`, `PROMPT-SCREEN-035` | `VISUAL-SCREEN-034`, `VISUAL-SCREEN-051`, `VISUAL-SCREEN-035` | `B09` pass and ACTIVE connection | `generated/12_partner-catalog/` | Supplier publishing dialog is hosted, not routed; buyer sees only allow-listed published data; exact stock, cost/margin, warehouses, members, settings, audit, and private partners never leak; `CKN-B5`, PACK, “5 KG,” and Private/Connected distinction are correct. |
| `B11 Product Mapping` | `PROMPT-SCREEN-036`, `PROMPT-SCREEN-037` | `VISUAL-SCREEN-036`, `VISUAL-SCREEN-037` | `B10` pass and published supplier item | `generated/13_product-mapping/` | Wizard clearly shows supplier lookup, exact partner SKU, matched item, unticked semantic confirmation, conversion, worked preview `1 PACK = 5 KG` and `10 PACK = 50 KG`, verification, and failure states; no automatic mapping or semantic assumption. |
| `B12 Connected PO` | `PROMPT-SCREEN-038`, `PROMPT-SCREEN-039`, `PROMPT-SCREEN-040` | `VISUAL-SCREEN-038`, `VISUAL-SCREEN-039`, `VISUAL-SCREEN-040` | `B11` pass and VERIFIED mapping | `generated/14_connected-po/` | Buyer and supplier projections are unmistakable; transitions and role ownership are valid; shipment changes supplier stock `200 -> 190 PACK` while buyer remains `70 KG` until receipt; connected receipt reaches `110 KG` before the final private receipt reaches `120 KG`; conversion and outstanding values stay visible. |
| `B13 Reports/Admin` | `PROMPT-SCREEN-025`, `PROMPT-SCREEN-048`, `PROMPT-SCREEN-049`, `PROMPT-SCREEN-026`, `PROMPT-SCREEN-052`, `PROMPT-SCREEN-027`, `PROMPT-SCREEN-050`, `PROMPT-SCREEN-028` | `VISUAL-SCREEN-025`, `VISUAL-SCREEN-048`, `VISUAL-SCREEN-049`, `VISUAL-SCREEN-026`, `VISUAL-SCREEN-052`, `VISUAL-SCREEN-027`, `VISUAL-SCREEN-050`, `VISUAL-SCREEN-028` | `B12` pass | `generated/15_reports/`, `16_notifications/`, `17_team/`, `18_settings/` | Report tabs/actions enforce authorization; `CHART-003` exists only on PO report and retains its table; notifications have read/unread semantics; one-time invite link and Owner protection are explicit; settings contain no Storefront/Release D controls; Network-off consequence is documented as nav omission plus authenticated 404. |
| `B14 Mobile` | `PROMPT-MOBILE-001`, `PROMPT-MOBILE-002`, `PROMPT-MOBILE-003`, `PROMPT-MOBILE-004`, `PROMPT-MOBILE-005`, `PROMPT-MOBILE-006`, `PROMPT-MOBILE-007`, `PROMPT-MOBILE-008`, `PROMPT-MOBILE-009`, `PROMPT-MOBILE-010`, `PROMPT-MOBILE-011` | `VISUAL-MOBILE-001`, `VISUAL-MOBILE-002`, `VISUAL-MOBILE-003`, `VISUAL-MOBILE-004`, `VISUAL-MOBILE-005`, `VISUAL-MOBILE-006`, `VISUAL-MOBILE-007`, `VISUAL-MOBILE-008`, `VISUAL-MOBILE-009`, `VISUAL-MOBILE-010`, `VISUAL-MOBILE-011` | `B13` pass and the corresponding screen visuals approved | `generated/19_mobile/` | Exactly the 11 frozen R2 surfaces at 390 px; no core-flow horizontal scroll; 44 px targets; labels and units remain visible; tables become labelled cards; overlays become usable sheets; chart alternatives precede optional charts; navigation remains role/flag filtered; Receiving remains one-handed and complete. |
| `B15 State Boards` | `PROMPT-STATE-001`, `PROMPT-STATE-002`, `PROMPT-STATE-003`, `PROMPT-STATE-004`, `PROMPT-STATE-005`, `PROMPT-STATE-006`, `PROMPT-STATE-007`, `PROMPT-STATE-008`, `PROMPT-STATE-009`, `PROMPT-STATE-010`, `PROMPT-STATE-011` | `VISUAL-STATE-001`, `VISUAL-STATE-002`, `VISUAL-STATE-003`, `VISUAL-STATE-004`, `VISUAL-STATE-005`, `VISUAL-STATE-006`, `VISUAL-STATE-007`, `VISUAL-STATE-008`, `VISUAL-STATE-009`, `VISUAL-STATE-010`, `VISUAL-STATE-011` | `B14` pass and all source screens approved | `generated/20_state-boards/` | Every named state is readable and visibly distinct; transitions are legal; errors retain safe input and expose Retry where valid; loading uses geometry-matched skeletons; permissions identify current/required role; mapping and connected PO boards contain no impossible transition or data leak. |
| `B16 Final Showcase Boards` | `PROMPT-BOARD-001`, `PROMPT-BOARD-002`, `PROMPT-BOARD-003`, `PROMPT-BOARD-004`, `PROMPT-BOARD-005`, `PROMPT-BOARD-006`, `PROMPT-BOARD-007`, `PROMPT-BOARD-008`, then `PROMPT-REVIEW-001`, `PROMPT-REVIEW-002`, `PROMPT-REVIEW-003`, `PROMPT-REVIEW-004`, `PROMPT-REVIEW-005`, `PROMPT-REVIEW-006`, `PROMPT-REVIEW-007`, `PROMPT-REVIEW-008` | `VISUAL-BOARD-001`, `VISUAL-BOARD-002`, `VISUAL-BOARD-003`, `VISUAL-BOARD-004`, `VISUAL-BOARD-005`, `VISUAL-BOARD-006`, `VISUAL-BOARD-007`, `VISUAL-BOARD-008`, then `VISUAL-REVIEW-001`, `VISUAL-REVIEW-002`, `VISUAL-REVIEW-003`, `VISUAL-REVIEW-004`, `VISUAL-REVIEW-005`, `VISUAL-REVIEW-006`, `VISUAL-REVIEW-007`, `VISUAL-REVIEW-008` | `B01..B15` all pass; only current approved images may be referenced | boards to `generated/22_showcase-boards/`; reviews to `visual-designs/review-boards/` | Boards are additional overview artifacts, never substitutes for primary screens; source images remain recognizable and unaltered in meaning; labels and grouping are accurate; no rejected/superseded image appears; complete overview covers A + B-Lite only and preserves the canonical data chain and final `LKR 691,700.00`. |

Batch counts reconcile exactly:

| Batch group | Count |
|---|---:|
| `B01` approved brand | 5 |
| `B02` component boards | 10 |
| `B03..B13` screen visuals | 52 |
| `B14` mobile visuals | 11 |
| `B15` state boards | 11 |
| `B16` showcase/review boards | 16 |
| **Total approved/current target** | **105** |

## 3. Roles, locks, and hand-off protocol

At most three specialists may be active alongside ROOT. Parallel read-only review is allowed; concurrent writes to the same authoritative document, registry row, prompt record, or visual path are prohibited.

| Lock | Sole writer while held | Protected output | Release condition |
|---|---|---|---|
| `LOCK-PROMPT-26` | Prompt Engineer | File 26 prompt bodies and approval fields | ROOT records `PROMPT_QA = PASS`; later changes require a ROOT-opened revision transaction |
| `LOCK-PROMPT-27` | Prompt Engineer | File 27 prompt bodies and approval fields | Same as above |
| `LOCK-ASSET-31` | Traceability/Packaging | File 31 asset rows and final paths | All 106 stable rows reconcile, 105 approved targets are explicit, and the batch hand-off is recorded |
| `LOCK-TRACE-32` | Traceability/Packaging | File 32 status rows and attempt history | Current batch status is reconciled with the filesystem and QA report |
| `LOCK-VISUAL-{VISUAL-ID}` | Image Generator | One current output plus its rejected/superseded attempt files | Generator has copied and technically verified the candidate, then hands it to QA read-only |
| `LOCK-QA-33` | Independent Visual QA | File 33 findings and verdicts | Verdict and defects are recorded for the candidate checksum |
| `LOCK-MANIFEST` | Traceability/Packaging | Generated visual manifest | Manifest, file 31, file 32, file 33, and actual files agree |
| `LOCK-GATE-34` | ROOT | Final approval gate | Package decision is signed after all reconciliation |

The original visual author may not perform final QA. Image QA is read-only against the candidate; the reviewer never silently edits an image or prompt. The traceability writer records only evidence returned by the generator and reviewer. ROOT resolves prompt/spec conflicts and is the only role allowed to reopen a frozen prompt.

For each prompt the hand-off is:

1. Traceability/Packaging confirms the row is `NOT_STARTED`, the prompt is `APPROVED_FOR_GENERATION`, the registered destination is unique, and no current file exists.
2. Image Generator claims `LOCK-VISUAL-{VISUAL-ID}`; Traceability/Packaging records `GENERATING`.
3. Image Generator produces, copies, decodes, measures, hashes, and visually inspects the candidate, then returns the evidence and releases the visual lock.
4. Traceability/Packaging records `GENERATED` and the candidate checksum.
5. Independent Visual QA compares the candidate at original detail with files 18-29 and records `PASS`, `PASS_WITH_NOTES`, or `FAIL` in file 33.
6. Traceability/Packaging copies the verdict into file 32 and the manifest. ROOT either approves the item or opens the retry procedure.

## 4. Built-in generation, save, and technical verification

The default and required generation path is the built-in image-generation tool. The word “batch” does not authorize CLI/API batch generation. Execute **one approved prompt per built-in call**. Do not use `OPENAI_API_KEY`, the fallback CLI, a destination-path argument, or a different model path unless the user explicitly authorizes that separate fallback.

For every prompt:

1. **Preflight:** read the one prompt body from file 26 or 27; verify `APPROVED_FOR_GENERATION`, prompt/visual/screen IDs, output folder, filename, format, aspect ratio, transparency flag, viewport, role, route/host, and batch against files 31-32. Stop on any mismatch.
2. **Input references:** for an edit/composite, inspect every local reference with the image viewer first and pass all target images through local reference paths. For a new design, omit image inputs unless the approved prompt explicitly names a supplied reference. Reference images influence hierarchy/density only and never override requirements.
3. **Generate:** submit the approved prompt unchanged through the built-in image-generation call. Separate prompts always receive separate calls, even when visually similar.
4. **Locate:** identify the returned selected file under the Codex generated-image location (`$CODEX_HOME/generated_images/...`). Never describe OS temp as the source and never leave a project-bound visual only under `$CODEX_HOME`.
5. **Collision check:** resolve the absolute registered workspace destination and confirm it is inside `visual-designs/generated/` or `visual-designs/review-boards/`. If the destination already exists, stop; apply the rejected/superseded policy before any copy. Never overwrite.
6. **Copy:** copy the selected generated file to the exact file-31 path. The filename must begin with the exact `VISUAL-ID` and end in `.png`.
7. **Semantic inspection:** open the raw workspace copy at original detail and check composition, crop, legibility, spelling, text density, geometry, content, role, route, workflow, data, scope, accessibility cues, image artifacts, and prohibited content. A technically valid but semantically defective PNG is still a failure.
8. **Normalize:** a semantically accepted raw output whose aspect ratio is within 2% of target may be deterministically normalized using proportional high-quality resize plus minimal crop or padding. Never stretch UI elements. The current registered asset must match exact registered dimensions.
9. **Technical verification:** confirm the normalized file exists and is non-zero; validate the eight-byte PNG signature; fully decode it; record width, height, colour mode, byte size, SHA-256, and exact final dimensions. Retain rejected or unnormalized evidence non-destructively.
10. **Register:** return source path, destination, raw and normalized dimensions, ratio, byte size, SHA-256, generation timestamp, batch, attempt number, semantic verdict, and tool path (`BUILT_IN_IMAGEGEN`) to the traceability writer.
11. **No transparent-logo substitution:** all five approved Stockmok brand boards use controlled opaque backgrounds. Final logos remain `DESIGN_AS_VECTOR`; generated PNG boards are not production logo files. If an approved future simple opaque cutout genuinely requires transparency, ROOT must first approve the built-in chroma-key plus installed removal-helper workflow and alpha-channel QA. Complex/native transparency or CLI fallback requires explicit user approval.

Contact sheets and showcase boards in `B16` must use only registered current approved images as references. They may reframe, label, and arrange those visuals, but must not reinterpret routes, values, permissions, statuses, or copy. Generation of a board does not modify its source files.

## 5. Independent visual QA contract

Every current candidate is inspected at original detail by a reviewer who did not author it. The reviewer compares the file against the exact prompt and files 18-29, not against memory or an earlier showcase.

| QA dimension | Required evidence |
|---|---|
| Identity and context | Correct Stockmok/organization identity, role, route or overlay host, breadcrumb, sidebar/navigation state, feature-flag state, and Private versus Connected label |
| UI contract | Exact title, fields, labels, table columns, filters, sorting affordances, pagination, tabs, buttons, outcomes, statuses, units, and explicit currency |
| Permissions and security | Only authorized role actions visible; contextual disabled control has explanation; report tabs/actions follow hard RBAC; no cross-tenant/private-data leakage; disabled Network direct access is authenticated 404 |
| Workflow and state | State-machine transition is valid; confirmations and immutable/final states are truthful; mapping and receiving expose all required decision data; replay behavior is idempotent where shown |
| Canonical data | `18 -> 20 -> 60 -> 70 -> 70 -> 110 -> 120 KG`; `1 PACK = 5 KG`; `10 PACK = 50 KG`; supplier ship `200 -> 190 PACK`; final `LKR 691,700.00`; never `18 -> 58 -> 68 KG` |
| Visual system | Light-first operational SaaS, `#1D4ED8`, restrained slate, one sans family, 4-point rhythm, frozen radii/shadows, Lucide-style icons, no dark/glass/neon/decorative animation |
| Charts | Exactly `CHART-001..003` on their authorized surfaces; Inventory Value, Active SKUs, Low Stock, Open POs, and Awaiting Receipt stay KPIs; every chart has a visible table/text alternative |
| Responsive/accessibility | Required viewport is represented; visible focus; meaningful labels; status is text plus icon; 44 px mobile targets; no clipped core action, unreadable text, or core horizontal scroll |
| Scope and honesty | Release A/B-Lite only; no B-PLUS/C/D, storefront, marketplace, AI, forecast, POS, customer proof, invented pricing, awards, statistics, or unsupported marketing claims |
| Technical file | Correct prompt/visual ID, registered filename/folder, PNG decode, dimensions/ratio, checksum, and no duplicate current file |

Verdicts are strict:

- `PASS`: every functional, scope, data, permission, technical, and visual criterion passes.
- `PASS_WITH_NOTES`: all functional criteria pass; notes are minor non-functional polish observations that do not impair readability, implementation fidelity, consistency, accessibility cues, or review. A spelling, label, route, role, value, status, field, table, chart, crop, legibility, or scope defect can never receive this status.
- `FAIL`: any required criterion is incorrect, missing, unreadable, unverifiable, inconsistent, or out of scope.

A batch becomes `BATCH_QA_PASS` only when every prompt in it is `GENERATED`, every current visual is `PASS` or `PASS_WITH_NOTES`, every final approval is `APPROVED`, all registered/manifest checksums match, and the batch has zero `FAILED`, `BLOCKED`, `REJECTED` current items, orphan files, or missing files.

## 6. Retry, rejection, and supersession

The initial generation is attempt `0`; at most two retries are allowed. All history is append-only and every attempt retains the same prompt ID and visual ID.

1. On failure, record the exact defect in file 33, set QA to `FAIL`, set final approval to `REJECTED`, and increment `REGENERATION-COUNT` only when the next attempt begins.
2. Move the failed candidate to `visual-designs/generated/24_rejected/` before generating again. Use a unique filename beginning with the same `VISUAL-ID` and containing `-attempt-0`, `-retry-1`, or `-retry-2` plus a UTC timestamp. Record original and history paths and checksums; never overwrite or delete the failed file.
3. **Retry 1:** keep the approved prompt body and approved UI invariant. Add one narrowly targeted defect-correction directive to the attempt record, approved by ROOT; do not introduce a new feature, state, route, component, or prompt ID.
4. Re-run technical verification and independent QA. The same reviewer may review a retry because they remain independent of authorship, but must compare against the recorded defect and all original criteria.
5. **Retry 2:** if ambiguity in the prompt caused the failure, ROOT reopens only that prompt record under its document lock. The Prompt Engineer revises the wording without changing the frozen UI, keeps the same prompt and visual IDs, increments the prompt revision, preserves the earlier revision in the audit record, and re-runs prompt QA before generation.
6. A previously approved current image replaced because of a later approved consistency correction moves to `visual-designs/generated/25_superseded/`, with a unique timestamped filename and `SUPERSEDES`/`SUPERSEDED BY` links. Never place a never-approved failure in `25_superseded`; never place a formerly approved version in `24_rejected`.
7. After initial attempt + Retry 1 + Retry 2 all fail, set `GENERATION-STATUS = BLOCKED`, `QA-STATUS = FAIL`, and `FINAL-APPROVAL = REJECTED`; document the exact blocker. Do not continue to the next batch and do not claim 100% generation or traceability coverage.

Retry files are audit history and excluded from `I`, the current generated-image numerator. Only the one current approved path registered in files 31-32 and the manifest counts.

## 7. Gate transitions and stop rules

| Gate/state | Entry requirements | Pass transition | Failure transition |
|---|---|---|---|
| `INPUT_READ_CONFIRMATION` | All 17 canonical files and required brief/images found, read/inspected, and source hashes captured | `PASS -> UI_ARCHITECTURE_FREEZE` | Missing/unreadable/changed authority -> `STOP` |
| `UI_ARCHITECTURE_FREEZE` | Files 18-25 reconcile: 52 surfaces, 11 R2, 25 components, 3 charts, seven roles, A/B-Lite only, brand selected | `PASS -> PROMPT_DRAFT` | Any unresolved architecture decision -> `STOP`; no prompt generation |
| `PROMPT_DRAFT` | Files 26-27 contain exactly the 106 stable IDs in this document; files 31-32 contain one unique row per ID | `COMPLETE -> PROMPT_QA` | Duplicate, orphan, missing, or conflicting ID/path -> return to locked author |
| `PROMPT_QA` | Every active prompt is self-contained and reconciled for screen, role, route/host, fields, actions, table, status, data, unit, currency, scope, responsive class, exclusions, and output path | 105 `APPROVED_FOR_GENERATION`, one explicit `RETIRED`, and zero failed/blockers -> `PASS_AFTER_STOCKMOK_MIGRATION`, open `B01` | Any active prompt unresolved -> `FAIL`; image generation prohibited |
| `B01..B16` | Direct dependencies are available or a documented provisional mark is permitted; all prompt rows preflight clean | Current batch reconciles; independent batches may proceed | Any semantic `FAIL` enters retry; an individual `BLOCKED` item blocks only direct dependants and final approval. Global stop is limited to unavailable generation capability, unreadable authorities, systemic source/security conflict, or unusable output across multiple unrelated prompts. |
| `VISUAL_GENERATION_AND_QA` | All 105 approved targets complete; `P=105`; `I=105`; every current file independently reviewed | 100% generation + traceability, zero failed/blockers/orphans, unchanged source hashes -> `PASS` | Any discrepancy -> `FAIL`; preserve partial package |
| `UI_DESIGN_APPROVAL_GATE` | Files 31-33 and manifest reconcile; cross-document matrix passes; ZIP contents verified; source hashes unchanged | `UI_DESIGN_PACKAGE_COMPLETE = YES`; `READY_FOR_HUMAN_REVIEW = YES`; `READY_FOR_PRODUCTION_CODING = NO` | `UI_DESIGN_PACKAGE_COMPLETE = NO`; `READY_FOR_HUMAN_REVIEW = NO`; `READY_FOR_PRODUCTION_CODING = NO` |

Hard stop conditions are: source hash change; unapproved prompt; ID/path collision; attempted overwrite; prompt/file count mismatch; malformed or undecodable PNG; wrong batch dependency; unresolved role/scope/data conflict; generation after two retries; or any request to write production code. A stop preserves all evidence and reports the exact affected IDs.

Final reconciliation uses registry-derived counts, never estimates:

```text
P = count(unique PROMPT-ID where prompt status = APPROVED_FOR_GENERATION) = 105
I = count(unique current generated files mapped one-to-one to those prompt IDs)
VISUAL_GENERATION_COVERAGE = I / P * 100
PROMPT_IMAGE_TRACEABILITY = fully reconciled prompt rows / P * 100
```

Approval requires `I = P = 105`, both percentages equal `100%`, every current image has independent `PASS` or `PASS_WITH_NOTES`, `VISUAL_QA_FAILED = 0`, `TOTAL_BLOCKED = 0`, `UNRESOLVED_UI_BLOCKERS = 0`, and the post-execution source hashes match the input-gate hashes exactly.
