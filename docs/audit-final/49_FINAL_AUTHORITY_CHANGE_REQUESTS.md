# 49 — Authority Change Requests (OWNER decisions)

These require owner approval before Claude Design or Claude Code acts on them. Claude Design must NOT resolve them independently. Only two exist; the audit deliberately keeps this list minimal because the underlying architecture is sound.

---

## ACR-001 — Add a first-class Audit Log screen (Owner/Admin)

- **AUDIT-ISSUE-ID:** DI-O2
- **Source:** files 37 §1 (MISSING_USEFUL), 39 §2, 42.
- **Current decision:** audit data exists (`auditLogs`, Owner/Admin readable) but there is **no dedicated audit screen**; audit is surfaced only inside per-object Activity/movement views.
- **Problem:** a dedicated, filterable Audit Log strengthens the trust/security story (a headline coursework and portfolio asset) and gives Owners a single place to review sensitive actions.
- **Evidence:** 05 §5.27 (AuditLog entity), 06 §14 (audit security), 07 has no audit route.
- **Severity:** MEDIUM
- **Impact:** adds one route `/app/:handle/audit` (or under Settings) + one screen + one table + states.
- **Recommendation:** **Default = do NOT add for the coursework release** — keep audit in Activity to avoid scope growth before the deadline. Add only if the owner wants the stronger trust demo AND the schedule is green (post GATE-A).
- **CHANGE TYPE:** ADD (owner-gated)
- **ARCHITECTURE_CHANGE_REQUIRED:** **YES** (new route/screen — an IA change; Claude Design may not add a route on its own).
- **Affected files:** 07, 19, 23; new design screen.
- **Owner decision:** ☐ Add now ☐ Keep in Activity (recommended) ☐ Defer to post-submission

---

## ACR-002 — Stackline-S mark letterform readability

- **AUDIT-ISSUE-ID:** DI-O1
- **Source:** files 36 §4.6, 40 §5.1, 42.
- **Current decision:** the mark is specified (file 25) as an "unmistakable abstract S" built from three horizontal bars + a vertical spine; primary `#1D4ED8`.
- **Problem:** on first viewing the glyph reads as an **F/E**, not an S. For a product named "Stock**m**ok" this weakens brand recognition and is a mild portfolio first-impression risk. (Also: BRAND-006 is self-acknowledged as containing invented colour/ratio values yet marked APPROVED — regenerate regardless of the glyph decision.)
- **Evidence:** direct inspection of VISUAL-BRAND-002/003/006 and the wordmark lockups.
- **Severity:** MEDIUM (brand presentation only)
- **Impact:** glyph refinement affects the mark, favicon, and lockups — not routes, RBAC, or data.
- **Recommendation:** **(b) refine the glyph so the S reads at a glance, or (c) go mark-light** (lead with the strong typeset "Stockmok" wordmark + the excellent monogram system) — whichever the owner prefers. Do not let this block the deadline; the wordmark and monograms already carry the identity. Separately, **SUPERSEDE BRAND-006** and regenerate the composite from corrected sources.
- **CHANGE TYPE:** REFINE (owner-gated brand presentation)
- **ARCHITECTURE_CHANGE_REQUIRED:** **NO** (presentation only; Claude Design may explore within owner-approved brand boundaries once the owner picks a direction).
- **Affected files:** 25, brand boards; favicon/lockups.
- **Owner decision:** ☐ Keep glyph as-is ☐ Refine glyph so "S" reads (recommended) ☐ Go mark-light, lead with wordmark + monograms ☐ (in all cases) regenerate BRAND-006

---

**No other conceptual or business-rule change is requested.** RBAC, stock accounting, PO state machines, connected-business privacy, zone model, data ownership, and release scope are all sound and must remain unchanged.

---

# AMENDMENT — post complete-read pass

## ACR-001 — audit-log screen: cost basis corrected

The original ACR recorded this as MED complexity. The complete read of file 11 shows the
infrastructure **already exists**:

- `organizations/{orgId}/auditLogs/{auditId}` — *"owner/admin read · backend write · immutable"* (§5 L144)
- Owner/Admin read rule with create/update/delete denied (§9.1), asserted by rules tests 4 and 5 (§10)
- **Two indexes already declared** — IDX-18 (per-object Activity) and **IDX-19 `createdAt DESC`, labelled
  *"org audit stream"*** (§8 L226)

**A dedicated Audit Log screen therefore costs one route, one paginated table and its states — no new
collection, command, security rule or index.** The complexity estimate in file 41 §6 is an overstatement.

Three honesty constraints if the owner adds it:
1. The trail is deliberately incomplete — file 11 §16 L539: ordinary product field edits rely on
   `updatedBy`/`updatedAt`, *"except archive/restore and cost changes, which are audited"*. The screen
   must not be labelled "every change".
2. Filtering is limited to **entity or chronology**. An actor or action-type filter needs a new index.
3. Audit rows are written by the same trusted process that performs the action, so the screen must make
   no tamper-evidence claim.

**Decision unchanged and still required:** add the route now, or keep audit inside per-object Activity
(default). `ARCHITECTURE_CHANGE_REQUIRED = YES` (adds a route/screen).

**Related, and worth deciding together:** Movement History (SCREEN-017) is the designated audit-read
surface and currently has **no timestamps** (DI-022) and no actor filter. If audit stays inside Activity,
DI-022 must be fixed for that answer to be defensible.

## ACR-002 — brand glyph: independent evidence added

File 52 §4 records an independent letterform read across BRAND-002/003/004/006 at 16, 24, 32 and 48 px.
Verdict: **the mark reads as an "F", not an "S"**, because the spine is a single straight vertical with
three orthogonal arms — the skeleton of F/E/T rather than a reversing S. The BRAND-003 lockup reads
**"F Stockmok"**. This strengthens the mark-light option. Decision still the owner's:
keep / refine the glyph so the S reads / go mark-light (wordmark + monograms).
`ARCHITECTURE_CHANGE_REQUIRED = NO`.

## ACR-003 — **NEW** — amend file 26 (the specification orders the brand burn-in)

**Finding.** File 26 explicitly instructs the generator to burn approval metadata into the brand
artwork: L459 — *"Label this generated PNG \"APPROVAL REFERENCE — DESIGN_AS_VECTOR\", not production
art. Route/role/shell/fields/tables/actions: brand review, none."*; L464 and L469 repeat it. File 25
does **not** authorise this — §4 lists only design content for BRAND-002.

**Consequence.** DI-002 is not purely a generator failure. Unless file 26 is amended, the defect
**regenerates on any re-run**, including by Claude Design if file 26 is treated as authoritative.

**Requested change.** Amend file 26 to (a) delete the "APPROVAL REFERENCE — DESIGN_AS_VECTOR" and
"Route/role/shell/fields/tables/actions: none" burn-in instructions from all brand prompt records;
(b) add a standing Exclude clause to every prompt record: *"Never render prompt metadata, identifiers,
routes, backticked tokens or specification sentences as visible text in the artwork"*;
(c) resolve the notation collision with file 28 §1.2 (*"Text inside backticks is exact display copy"*)
by adopting a distinct notation for identifiers; (d) cite `COPY-###` IDs in prompts, as file 28 §1.1
requires and file 26 currently never does.

`ARCHITECTURE_CHANGE_REQUIRED = NO` · **Owner approval required: YES** (amends a frozen authority document)

## ACR-004 — **NEW** — authorise or retire `DETERMINISTIC_UI_RENDER`, and correct the QA record

**Finding 1.** File 30 §4 states *"The default and required generation path is the built-in
image-generation tool"* (`BUILT_IN_IMAGEGEN`). The token `DETERMINISTIC_UI_RENDER` is defined nowhere in
files 25–30 and appears only in files 31–32. File 34 records **69** assets produced by it — exactly the
DI-002b defect population.

**Finding 2.** File 32 records all 105 rows as `GENERATED / PASS / APPROVED` with zero `PASS_WITH_NOTES`,
zero retries and zero rejections. This breaches file 30 §5's own verdict rule: *"A technically valid but
semantically defective PNG is still a failure"* and *"A spelling, label, route, role, value, status,
field, table, chart, crop, legibility, or scope defect can never receive this status."*

**Finding 3.** File 32 L99 assigns `PROMPT-BRAND-006` the method `COMPOSITE_REVIEW_BOARD`, contradicting
file 25 §4 and file 26 L479 — the documented cause of DI-015.

**Requested change.** (a) Either formally define and authorise `DETERMINISTIC_UI_RENDER` in file 30, or
retire it and record that the 69 assets were produced off-process; (b) reopen the 69 affected rows in
file 32 from `APPROVED` to `REJECTED` or `PASS_WITH_NOTES` with the DI-002b reason, and correct L99;
(c) note in file 33 that the PASS verdict was granted on file-integrity criteria that structurally
cannot detect copy, label or usability defects.

**Constraint to be aware of:** file 30 §6 allows *"at most two retries"* per prompt and §6.5 reopens
*"only that prompt record … without changing the frozen UI"*. A 69-asset remediation must be formally
reopened rather than absorbed silently.

`ARCHITECTURE_CHANGE_REQUIRED = NO` · **Owner approval required: YES** (corrects a frozen QA record)

---

## Owner decisions now outstanding: **4**

| ACR | Decision | Architecture change | Blocks Claude Design? |
|---|---|---|---|
| ACR-001 | Audit-log route: add now / keep in Activity | **YES** | Only Gate 5 |
| ACR-002 | Brand glyph: keep / refine / mark-light | NO | Only Gate 2 |
| ACR-003 | Amend file 26 to remove the burn-in instruction | NO | **No** — but must be done before any regeneration |
| ACR-004 | Authorise or retire `DETERMINISTIC_UI_RENDER`; correct the file 32/33 record | NO | **No** — record-keeping integrity |
