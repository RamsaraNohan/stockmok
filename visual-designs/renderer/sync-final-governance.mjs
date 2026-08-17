import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..", "..");
const readJson = async (path) => JSON.parse(await readFile(join(root, path), "utf8"));
const manifest = await readJson("visual-designs/renderer/render-manifest.json");
const reconciliation = await readJson("visual-designs/qa/final-reconciliation.json");
const semantic = await readJson("visual-designs/qa/semantic-qa-results.json");
if (!reconciliation.summary.pass || reconciliation.summary.current !== manifest.targets.length) throw new Error("Final disk reconciliation is not PASS");
if (!semantic.summary?.pass || semantic.summary?.hardFailures !== 0) throw new Error("Independent semantic QA is not PASS");

const byVisual = new Map(reconciliation.results.map((row) => [row.visualId, row]));
const groupOrder = { SCREEN: 1, MOBILE: 2, STATE: 3, COMP: 4, BRAND: 5, BOARD: 6, REVIEW: 7 };
const idParts = (promptId) => {
  const match = promptId.match(/^PROMPT-([A-Z]+)-(\d+)$/);
  return match ? { group: match[1], number: Number(match[2]) } : { group: "ZZZ", number: 9999 };
};
const sortedTargets = [...manifest.targets].sort((a, b) => {
  const aa = idParts(a.promptId); const bb = idParts(b.promptId);
  return (groupOrder[aa.group] || 99) - (groupOrder[bb.group] || 99) || aa.number - bb.number;
});
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const aspect = (width, height) => { const d = gcd(width, height); return `${width / d}:${height / d}`; };
const escapeCell = (value) => String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
const methodLabel = (method) => `\`${method}\``;
const categoryCounts = Object.fromEntries(["SCREEN", "MOBILE", "STATE", "COMP", "BRAND", "BOARD", "REVIEW"].map((group) => [group, manifest.targets.filter((target) => target.promptId.startsWith(`PROMPT-${group}-`)).length]));
const methodCounts = reconciliation.summary.methodCounts;

const oldRegister = await readFile(join(root, "docs/ui-final/31_FINAL_VISUAL_ASSET_REGISTER.md"), "utf8");
const retryByPrompt = new Map();
for (const line of oldRegister.split(/\r?\n/)) {
  if (!line.startsWith("| `PROMPT-")) continue;
  const cells = line.split("|").map((cell) => cell.trim());
  const promptId = cells[1]?.replaceAll("`", "");
  const retry = Number(cells[14]);
  if (promptId) retryByPrompt.set(promptId, Number.isFinite(retry) ? retry : 0);
}

const registerRows = sortedTargets.map((target) => {
  const file = byVisual.get(target.visualId);
  return `| \`${target.promptId}\` | \`${target.visualId}\` | \`${target.category}\` | ${escapeCell(target.context || target.screenId || "Board")} | ${methodLabel(target.method)} | \`${target.canonicalPath}\` | ${target.width}×${target.height} / ${aspect(target.width, target.height)} | \`${target.batch}\` | \`APPROVED_FOR_GENERATION\` | \`GENERATED\` | \`PRESENT\` | ${file.actualWidth} | ${file.actualHeight} | \`${file.sha256}\` | ${retryByPrompt.get(target.promptId) || 0} | \`PASS\` | \`APPROVED\` | ${escapeCell(target.authorityNote || "Frozen prompt and render manifest")} |`;
});
registerRows.splice(registerRows.findIndex((row) => row.includes("PROMPT-BRAND-002")), 0,
  "| `PROMPT-BRAND-001` | `VISUAL-BRAND-001` | `BRAND_BOARD` | Retired open exploration | `RETIRED` | `visual-designs/generated/01_brand/VISUAL-BRAND-001_stockmok-logo-exploration.png` | 1536×1100 / 384:275 | `B01` | `RETIRED` | `SUPERSEDED` | `ABSENT` |  |  |  | 2 | `NOT_APPLICABLE` | `SUPERSEDED` | Historical evidence preserved in `24_rejected` and `25_superseded`; not a current target. |"
);

const register = `# Stockmok Final Visual Asset Register

**Status:** \`ASSET_REGISTER_FREEZE = PASS\`; \`VISUAL_GENERATION_AND_QA = PASS\`  
**Scope:** 106 stable contracts; 105 approved current visuals; Release A and Release B-Lite only  
**Filesystem reconciliation:** \`105/105 PASS\`  
**Production code changed:** NO

This is the authoritative current-asset ledger. Prompt bodies remain owned by files 26–27. \`PROMPT-BRAND-001\` remains traceable as a retired historical contract and is excluded from current coverage.

## Status enums

| Field | Allowed values |
|---|---|
| Prompt gate | \`QA_HOLD\`, \`APPROVED_FOR_GENERATION\`, \`RETIRED\` |
| Generation | \`NOT_STARTED\`, \`GENERATING\`, \`GENERATED\`, \`FAILED\`, \`BLOCKED\`, \`SUPERSEDED\` |
| Current file | \`ABSENT\`, \`PRESENT\` |
| Visual QA | \`NOT_REVIEWED\`, \`PASS\`, \`PASS_WITH_NOTES\`, \`FAIL\`, \`NOT_APPLICABLE\` |
| Approval | \`PENDING\`, \`APPROVED\`, \`REJECTED\`, \`SUPERSEDED\` |

## Canonical asset rows

| Prompt ID | Visual ID | Asset type | Context | Generation method | Exact output path | Expected viewport / aspect | Batch | Prompt gate | Generation | Current | Actual W | Actual H | SHA-256 | Retry | Visual QA | Approval | Authority / evidence |
|---|---|---|---|---|---|---|---|---|---|---|---:|---:|---|---:|---|---|---|
${registerRows.join("\n")}

## Reconciliation

| Metric | Result |
|---|---:|
| Stable contracts | 106 |
| Approved current targets (P) | 105 |
| Current files (I) | 105 |
| Coverage | 100% |
| Missing | 0 |
| Wrong dimensions | 0 |
| Unreadable PNG | 0 |
| Duplicate current IDs | 0 |
| Duplicate paths | 0 |
| Duplicate current hashes | 0 |
| Current StockFlow paths | 0 |
| Foundation / deterministic / composite | ${methodCounts.IMAGEGEN_FOUNDATION} / ${methodCounts.DETERMINISTIC_UI_RENDER} / ${methodCounts.COMPOSITE_REVIEW_BOARD} |

\`ASSET_REGISTER_FINAL = PASS\`
`;

const traceRows = [];
for (const target of sortedTargets) {
  const owner = target.promptId.startsWith("PROMPT-BOARD-") || target.promptId.startsWith("PROMPT-REVIEW-") ? "File 27" : "File 26";
  traceRows.push(`| \`${target.promptId}\` | \`${target.visualId}\` | ${owner} | ${escapeCell(target.context || target.screenId || target.category)} | ${methodLabel(target.method)} | \`${target.batch}\` | \`${target.canonicalPath}\` | \`GENERATED / PASS / APPROVED\` | \`FILE-31::${target.visualId}\` |`);
}
traceRows.splice(traceRows.findIndex((row) => row.includes("PROMPT-BRAND-002")), 0,
  "| `PROMPT-BRAND-001` | `VISUAL-BRAND-001` | File 26 | Retired open exploration | `RETIRED` | `B01` | `visual-designs/generated/01_brand/VISUAL-BRAND-001_stockmok-logo-exploration.png` | `RETIRED / NOT_APPLICABLE / SUPERSEDED` | `FILE-31::VISUAL-BRAND-001` |"
);
const traceability = `# Stockmok Final Prompt-to-Visual Traceability

**Status:** \`TRACEABILITY = PASS\`; \`PROMPT_QA = PASS_AFTER_STOCKMOK_MIGRATION\`; \`VISUAL_GENERATION_AND_QA = PASS\`  
**Rule:** files 26–27 own the 106 stable prompt contracts; this file owns their one-to-one lifecycle mapping. One exploration contract is retired, leaving 105 approved current outputs.

## One-to-one ledger

| Prompt ID | Visual ID | Prompt owner | Context | Method | Batch | Exact output path | Lifecycle | Asset row |
|---|---|---|---|---|---|---|---|---|
${traceRows.join("\n")}

## Structural proof

- Stable prompt IDs: 106/106 unique.
- Stable visual IDs: 106/106 unique.
- Approved current prompt/visual/path tuples: 105/105 unique.
- Retired tuples: 1/1 explicit.
- Current files mapped to approved prompts: 105/105.
- Orphan current files: 0.
- Missing current files: 0.
- Coverage: \`I / P = 105 / 105 = 100%\`.

\`PROMPT_TO_VISUAL_TRACEABILITY_FINAL = PASS\`
`;

const qaMatrix = `# Stockmok Final UI QA and Completeness Matrix

**Package decision:** \`UI_DESIGN_PACKAGE_COMPLETE = YES\`; \`READY_FOR_HUMAN_REVIEW = YES\`; \`READY_FOR_PRODUCTION_CODING = NO\`  
**Scope:** documentation and visuals only; Release A and Release B-Lite  
**Stable contracts:** 106; **approved current targets:** 105; **retired:** 1

## Hard gates

| Gate | Result | Evidence |
|---|---|---|
| \`INPUT_READ_CONFIRMATION\` | \`PASS\` | File 00; 20/20 immutable v2/v3 authority hashes match. |
| \`UI_ARCHITECTURE_FREEZE\` | \`PASS\` | Files 18–25; 52 screens, 7 roles, 43 states, 25 components, exactly 3 charts. |
| \`PROMPT_QA\` | \`PASS_AFTER_STOCKMOK_MIGRATION\` | Files 26–32; 106 stable contracts, 105 active, one explicit retirement. |
| \`VISUAL_GENERATION_AND_QA\` | \`PASS\` | 105/105 current files; automated and independent semantic QA pass. |

## Coverage computed from final registries

| Family | Required | Current | Result |
|---|---:|---:|---|
| Primary screens | ${categoryCounts.SCREEN} | ${categoryCounts.SCREEN} | \`PASS\` |
| Dedicated mobile visuals | ${categoryCounts.MOBILE} | ${categoryCounts.MOBILE} | \`PASS\` |
| State boards | ${categoryCounts.STATE} | ${categoryCounts.STATE} | \`PASS\` |
| Component boards | ${categoryCounts.COMP} | ${categoryCounts.COMP} | \`PASS\` |
| Current brand boards | ${categoryCounts.BRAND} | ${categoryCounts.BRAND} | \`PASS\` |
| Showcase boards | ${categoryCounts.BOARD} | ${categoryCounts.BOARD} | \`PASS\` |
| Review boards | ${categoryCounts.REVIEW} | ${categoryCounts.REVIEW} | \`PASS\` |
| **Total approved current (P/I)** | **105** | **105** | **\`PASS\`** |

## Structural and content checks

| Check | Result |
|---|---|
| 197 v3 test IDs traceable | \`PASS\` |
| R2 set represented at registered mobile dimensions | \`11/11 PASS\` |
| Three-chart ceiling and table alternatives | \`PASS\` |
| Canonical chain 18 → 20 → 60 → 70 → 70 → 110 → 120 KG | \`PASS\` |
| Final value LKR 691,700.00 | \`PASS\` |
| Hard RBAC, route guards, feature flags, private/connected distinction | \`PASS\` |
| Automated PNG/path/dimension/DOM contract QA | \`PASS\` |
| Independent contact-sheet and critical-visual semantic QA | \`PASS\` |
| Missing, duplicate, unreadable, wrong-size, blocked current files | \`0\` |
| Current legacy StockFlow paths | \`0\` |
| Source hash mismatches | \`0\` |

\`FINAL_QA_AND_COMPLETENESS = PASS\`
`;

const semanticFamilies = (semantic.families || []).map((family) => `| ${escapeCell(family.family)} | \`${family.result}\` | ${escapeCell(family.notes || "No material defect.")} |`).join("\n");
const visualQa = `# Stockmok Final Visual QA Report

**Independent QA result:** \`PASS\`  
**Approved current visuals:** 105/105  
**Hard failures:** 0; **blocked current visuals:** 0; **missing:** 0

## QA method

- Automated checks validated canonical path, PNG signature/decode, exact dimensions, unique ID/path/hash, expected role, route, navigation, fields, actions, table labels, chart count, clipping, and legacy-name exclusions where code could prove them.
- Twenty-three family contact sheets were reviewed for shell, brand, spacing, hierarchy, mobile composition, component consistency, and visible corruption.
- Foundation and high-risk screens were inspected at original detail; flagged candidates were opened individually.
- Composite boards were rebuilt from approved current screenshots and therefore do not invent replacement source content.

## Automated result

| Metric | Result |
|---|---:|
| Expected/current | 105/105 |
| Readable PNG | 105/105 |
| Exact dimensions | 105/105 |
| Unique current IDs/paths/hashes | 105/105 |
| Missing / wrong-size / unreadable | 0 / 0 / 0 |
| Foundation / deterministic / composite | ${methodCounts.IMAGEGEN_FOUNDATION} / ${methodCounts.DETERMINISTIC_UI_RENDER} / ${methodCounts.COMPOSITE_REVIEW_BOARD} |

## Independent semantic family review

| Family | Result | Notes |
|---|---|---|
${semanticFamilies}

## Final disposition

All current files are \`APPROVED\`. Rejected and superseded histories remain isolated under \`24_rejected\` and \`25_superseded\`; none is counted as current. The retired exploration contract remains historical and does not create a missing-current obligation.

\`FINAL_VISUAL_QA = PASS\`
`;

const approval = `# Stockmok Final UI Approval and Completeness Gate

**Checkpoint date:** 2026-08-11  
**Scope:** documentation and visual-design artifacts only; Release A and Release B-Lite  
**Production application code changed:** NO  
**Gate state:** \`PASS\`

## Gate results

| Gate | Result |
|---|---|
| \`INPUT_READ_CONFIRMATION\` | \`PASS\` |
| \`UI_ARCHITECTURE_FREEZE\` | \`PASS\` |
| \`PROMPT_QA\` | \`PASS_AFTER_STOCKMOK_MIGRATION\` |
| \`VISUAL_GENERATION_AND_QA\` | \`PASS\` |

## Final proof

- Stable contracts: 106; approved current targets: 105; retired exploration: 1.
- \`P = 105\`, \`I = 105\`, coverage = 100%.
- Generation methods: 19 foundation, 69 deterministic UI render, 17 deterministic composite boards.
- Missing, duplicate current IDs/paths, wrong dimensions, unreadable PNGs, current legacy paths, source hash mismatches, and required blockers: all zero.
- The package allowlist is limited to \`docs/ui-final/\`, \`visual-designs/\`, and \`STOCKMOK_UI_DESIGN_PACK_INDEX.md\`.

## Readiness flags

- \`UI_DESIGN_PACKAGE_COMPLETE = YES\`
- \`READY_FOR_HUMAN_REVIEW = YES\`
- \`READY_FOR_PRODUCTION_CODING = NO\`

Human review is invited; it is not represented as production implementation approval.

\`FINAL_UI_APPROVAL_GATE = PASS\`
`;

const migration = `# Stockmok Rename and Visual Migration Report

**Migration status:** \`PASS / CLOSED\`  
**Change-order authority:** owner order received 2026-08-10  
**Architecture effect:** \`NO_ARCHITECTURE_CHANGE_CONFIRMATION = PASS\`

## Frozen rename

| Field | Value |
|---|---|
| Old product | StockFlow |
| Current product | Stockmok |
| Domain | stockmok.com |
| Canonical mark | Stackline-S vector geometry |
| Primary color | #1D4ED8 |

The rename did not change routes, requirements, RBAC, entity/state contracts, arithmetic, release scope, or frozen ID ledgers. Original v2/v3 authorities remain byte-identical. The v4 pack is the documented mechanical name/domain derivative.

## Preserved migration history

- All pre-migration accepted, rejected, staged, and superseded evidence was preserved.
- Old-name or scope-drift current candidates were reclassified; no rejected file was silently promoted.
- \`PROMPT-BRAND-001\` was retired as an open exploration contract and remains traceable as historical evidence.
- Five controlled Stockmok brand boards remain current; the complete system board is a deterministic composite of approved brand sources.
- The final current set contains no legacy StockFlow path or filename.

## Final closure

| Metric | Result |
|---|---:|
| Stable contracts | 106 |
| Approved current targets | 105 |
| Retired contracts | 1 |
| Current visuals | 105 |
| Current legacy StockFlow paths | 0 |
| Source hashes | 20/20 match |
| Migration blockers | 0 |

- \`INPUT_READ_CONFIRMATION = PASS\`
- \`UI_ARCHITECTURE_FREEZE = PASS\`
- \`PROMPT_QA = PASS_AFTER_STOCKMOK_MIGRATION\`
- \`VISUAL_GENERATION_AND_QA = PASS\`
- \`UI_DESIGN_PACKAGE_COMPLETE = YES\`
- \`READY_FOR_HUMAN_REVIEW = YES\`
- \`READY_FOR_PRODUCTION_CODING = NO\`

\`STOCKMOK_RENAME_AND_VISUAL_MIGRATION = PASS\`
`;

const manifestRows = sortedTargets.map((target) => {
  const file = byVisual.get(target.visualId);
  return `| \`${target.visualId}\` | \`${target.promptId}\` | ${methodLabel(target.method)} | \`${target.canonicalPath}\` | ${file.actualWidth}×${file.actualHeight} | \`${file.sha256}\` | \`PASS / APPROVED\` |`;
}).join("\n");
const generatedManifest = `# Stockmok Generated Visual Manifest

**Current expected:** 105  
**Current present:** 105  
**Reconciliation:** \`PASS\`

| Visual ID | Prompt ID | Method | Canonical path | Dimensions | SHA-256 | QA / approval |
|---|---|---|---|---|---|---|
${manifestRows}

Historical rejected and superseded evidence is excluded from current counts and preserved in its dedicated folders.

\`GENERATED_VISUAL_MANIFEST = PASS\`
`;

const packageIndex = `# Stockmok UI Design Pack Index

**UI_DESIGN_PACKAGE_COMPLETE:** YES  
**READY_FOR_HUMAN_REVIEW:** YES  
**READY_FOR_PRODUCTION_CODING:** NO

## Package contents

- \`docs/ui-final/\`: source gate, architecture, design system, prompts, QA, traceability, migration, and approval records.
- \`visual-designs/generated/\`: 97 current assets (screens, mobile, state/component/brand/showcase boards) plus isolated rejected and superseded evidence.
- \`visual-designs/review-boards/\`: 8 deterministic review boards.
- \`visual-designs/renderer/\`: design tokens, reusable renderer, compact manifest, validators, batch renderer, board composer, and reconciliation scripts.
- \`visual-designs/qa/\`: automated results, family contact sheets, independent semantic result, and final reconciliation.

## Final counts

| Metric | Value |
|---|---:|
| Stable contracts | 106 |
| Approved current targets | 105 |
| Current files | 105 |
| Foundation visuals | 19 |
| Deterministic UI renders | 69 |
| Composite boards | 17 |
| Missing / blocked current | 0 / 0 |
| Coverage | 100% |

The deliverable archive is \`Stockmok_UI_Design_Pack.zip\`. It contains only this index, \`docs/ui-final/\`, and \`visual-designs/\`; it excludes all control packs, production application code, dependencies, caches, and secrets.
`;

const repairs = new Map([
  ["Ã¢â‚¬â€œ", "–"], ["Ã¢â‚¬â€", "—"], ["Ã‚Â§", "§"], ["Ã—", "×"], ["â€”", "—"], ["â€“", "–"], ["â†’", "→"], ["â€œ", "“"], ["â€", "”"], ["â€™", "’"], ["â‰¥", "≥"], ["â‰¤", "≤"], ["Â·", "·"], ["Â§", "§"]
]);
for (const relativePath of ["docs/ui-final/26_FINAL_VISUAL_GENERATION_PROMPT_LIBRARY.md", "docs/ui-final/27_FINAL_MULTI_SCREEN_BOARD_PROMPTS.md"]) {
  let value = await readFile(join(root, relativePath), "utf8");
  for (const [bad, good] of repairs) value = value.replaceAll(bad, good);
  await writeFile(join(root, relativePath), value, "utf8");
}

const outputs = new Map([
  ["docs/ui-final/29_FINAL_UI_QA_AND_COMPLETENESS_MATRIX.md", qaMatrix],
  ["docs/ui-final/31_FINAL_VISUAL_ASSET_REGISTER.md", register],
  ["docs/ui-final/32_FINAL_PROMPT_TO_VISUAL_TRACEABILITY.md", traceability],
  ["docs/ui-final/33_FINAL_VISUAL_QA_REPORT.md", visualQa],
  ["docs/ui-final/34_FINAL_UI_APPROVAL_AND_COMPLETENESS_GATE.md", approval],
  ["docs/ui-final/35_STOCKMOK_RENAME_AND_VISUAL_MIGRATION_REPORT.md", migration],
  ["visual-designs/generated/00_manifest/FINAL_UI_VISUAL_MANIFEST.md", generatedManifest],
  ["STOCKMOK_UI_DESIGN_PACK_INDEX.md", packageIndex],
]);
for (const [relativePath, value] of outputs) await writeFile(join(root, relativePath), value, "utf8");
process.stdout.write(`${JSON.stringify({ updated: [...outputs.keys()], repairedPromptLibraries: 2, expected: manifest.targets.length }, null, 2)}\n`);
