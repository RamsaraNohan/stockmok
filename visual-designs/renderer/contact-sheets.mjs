#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, delimiter, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(here, "..", "..");
const defaultManifestPath = join(here, "render-manifest.json");
const defaultOutputDirectory = join(workspaceRoot, "visual-designs", "qa", "contact-sheets");
const require = createRequire(import.meta.url);

function usage() {
  return `Stockmok accepted-visual contact-sheet composer

Usage:
  node contact-sheets.mjs [options]

Options:
  --manifest <file>       Manifest path (default: renderer/render-manifest.json)
  --out-dir <directory>   Output directory (default: visual-designs/qa/contact-sheets)
  --group-by <mode>       method, directory, category, or batch (default: method)
  --family <name>         Restrict to one normalized family name
  --per-sheet <12-16>     Preferred tile count (default: 14)
  --include-partial       Include a final sheet with fewer than 12 tiles
  --force                 Replace existing QA contact sheets
  --dry-run               Show deterministic sheet plan; write nothing
  --help                  Show this help

Only manifest-listed canonical PNGs that currently exist are used. Source images
are read-only. Complete sheets contain 12-16 images; underfilled remainders stay
pending unless --include-partial is supplied explicitly.
`;
}

function parseArguments(argv) {
  const options = { groupBy: "method", perSheet: 14 };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") options.help = true;
    else if (token === "--dry-run") options.dryRun = true;
    else if (token === "--include-partial") options.includePartial = true;
    else if (token === "--force") options.force = true;
    else if (token.startsWith("--")) {
      const rawKey = token.slice(2);
      const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${token}.`);
      options[key] = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  options.perSheet = Number(options.perSheet);
  if (!Number.isInteger(options.perSheet) || options.perSheet < 12 || options.perSheet > 16) {
    throw new Error("--per-sheet must be an integer from 12 through 16.");
  }
  if (!new Set(["method", "directory", "category", "batch"]).has(options.groupBy)) {
    throw new Error("--group-by must be method, directory, category, or batch.");
  }
  return options;
}

function resolveInputPath(value, fallback) {
  if (!value) return fallback;
  return isAbsolute(value) ? resolve(value) : resolve(process.cwd(), value);
}

function isWithin(parent, child) {
  const value = relative(parent, child);
  return value === "" || (!value.startsWith(`..${sep}`) && value !== ".." && !isAbsolute(value));
}

function toPosixPath(value) {
  return value.split(sep).join("/");
}

function normalizeName(value) {
  return String(value || "unclassified")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "unclassified";
}

function titleCase(value) {
  return String(value).replaceAll("-", " ").replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function familyFor(target, groupBy) {
  if (groupBy === "directory") return normalizeName(basename(dirname(target.canonicalPath)));
  if (groupBy === "category") return normalizeName(target.category);
  if (groupBy === "batch") return normalizeName(target.batch);
  return normalizeName(String(target.method || "").replace(/_RENDER$/, "").replace(/_BOARD$/, ""));
}

function sharpCandidates() {
  const roots = String(process.env.NODE_PATH || "").split(delimiter).filter(Boolean);
  const bundledRoot = process.env.USERPROFILE
    ? join(process.env.USERPROFILE, ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules")
    : "";
  return [
    "sharp",
    ...roots.map((root) => join(root, "sharp")),
    bundledRoot ? join(bundledRoot, "sharp") : "",
  ].filter(Boolean);
}

function loadSharp() {
  for (const candidate of sharpCandidates()) {
    try {
      const loaded = require(candidate);
      if (typeof loaded === "function") return loaded;
    } catch {
      // Continue through known bundled paths.
    }
  }
  throw new Error("Sharp is unavailable. Set NODE_PATH to the bundled Codex runtime node_modules directory.");
}

function partitionSizes(count, preferred) {
  for (let covered = count; covered >= 12; covered -= 1) {
    const minimumGroups = Math.ceil(covered / 16);
    const maximumGroups = Math.floor(covered / 12);
    if (minimumGroups > maximumGroups) continue;
    let chosen = null;
    let chosenDistance = Number.POSITIVE_INFINITY;
    for (let groups = minimumGroups; groups <= maximumGroups; groups += 1) {
      const average = covered / groups;
      const distance = Math.abs(average - preferred);
      if (distance < chosenDistance) {
        chosen = groups;
        chosenDistance = distance;
      }
    }
    if (!chosen) continue;
    const base = Math.floor(covered / chosen);
    const remainder = covered % chosen;
    const sizes = Array.from({ length: chosen }, (_, index) => base + (index < remainder ? 1 : 0));
    if (sizes.every((size) => size >= 12 && size <= 16)) return { sizes, covered };
  }
  return { sizes: [], covered: 0 };
}

function planFamily(family, items, preferred, includePartial) {
  const { sizes, covered } = partitionSizes(items.length, preferred);
  const sheets = [];
  let cursor = 0;
  for (const size of sizes) {
    sheets.push(items.slice(cursor, cursor + size));
    cursor += size;
  }
  if (includePartial && cursor < items.length) sheets.push(items.slice(cursor));
  return {
    family,
    sheets,
    pending: includePartial ? [] : items.slice(covered),
  };
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function truncate(value, limit) {
  const text = String(value || "");
  return text.length <= limit ? text : `${text.slice(0, Math.max(1, limit - 1))}…`;
}

function roleLabel(target) {
  const role = String(target.role || "not role-specific").replaceAll("|", "·");
  return truncate(role, 64);
}

function baseSheetSvg({ width, height, family, sheetNumber, sheetCount, items, columns, tileWidth, tileHeight, margin, headerHeight, imageHeight }) {
  const cards = items.map((target, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = margin + column * tileWidth;
    const y = headerHeight + row * tileHeight;
    const labelY = y + imageHeight + 24;
    return `<g>
      <rect x="${x}" y="${y}" width="${tileWidth - 12}" height="${tileHeight - 12}" rx="12" fill="#FFFFFF" stroke="#CBD5E1"/>
      <line x1="${x}" y1="${y + imageHeight}" x2="${x + tileWidth - 12}" y2="${y + imageHeight}" stroke="#E2E8F0"/>
      <text x="${x + 16}" y="${labelY}" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="17" font-weight="700" fill="#0F172A">${escapeXml(target.visualId)}</text>
      <text x="${x + 16}" y="${labelY + 24}" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="13" font-weight="600" fill="#475569">SCREEN_ID: ${escapeXml(target.screenId || target.context || "none")}</text>
      <text x="${x + 16}" y="${labelY + 46}" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="13" fill="#475569">ROLE: ${escapeXml(roleLabel(target))}</text>
    </g>`;
  }).join("");
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#F8FAFC"/>
    <text x="${margin}" y="42" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="27" font-weight="700" fill="#0F172A">Stockmok · ${escapeXml(titleCase(family))}</text>
    <text x="${margin}" y="70" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="14" fill="#475569">Current accepted visuals · Sheet ${sheetNumber} of ${sheetCount} · ${items.length} sources</text>
    ${cards}
  </svg>`);
}

async function composeSheet(sharp, familyPlan, sheetItems, sheetIndex, outputPath) {
  const columns = 4;
  const tileWidth = 560;
  const tileHeight = 380;
  const imageHeight = 286;
  const margin = 36;
  const headerHeight = 94;
  const rows = Math.ceil(sheetItems.length / columns);
  const width = margin * 2 + columns * tileWidth;
  const height = headerHeight + rows * tileHeight + margin;
  const composites = [{
    input: baseSheetSvg({
      width,
      height,
      family: familyPlan.family,
      sheetNumber: sheetIndex + 1,
      sheetCount: familyPlan.sheets.length,
      items: sheetItems,
      columns,
      tileWidth,
      tileHeight,
      margin,
      headerHeight,
      imageHeight,
    }),
    left: 0,
    top: 0,
  }];

  for (let index = 0; index < sheetItems.length; index += 1) {
    const target = sheetItems[index];
    const metadata = await sharp(target.sourcePath).metadata();
    if (!metadata.width || !metadata.height) throw new Error(`Unreadable image dimensions: ${target.canonicalPath}`);
    const preview = await sharp(target.sourcePath)
      .resize({ width: tileWidth - 44, height: imageHeight - 24, fit: "contain", background: "#FFFFFF", withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const column = index % columns;
    const row = Math.floor(index / columns);
    composites.push({
      input: preview,
      left: margin + column * tileWidth + 16,
      top: headerHeight + row * tileHeight + 12,
    });
  }

  const png = await sharp({ create: { width, height, channels: 4, background: "#F8FAFC" } })
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
  await writeFile(outputPath, png);
  return { width, height, sha256: createHash("sha256").update(png).digest("hex") };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  const manifestPath = resolveInputPath(options.manifest, defaultManifestPath);
  const outputDirectory = resolveInputPath(options.outDir, defaultOutputDirectory);
  if (!existsSync(manifestPath) || !statSync(manifestPath).isFile()) throw new Error(`Manifest not found: ${manifestPath}`);
  if (!isWithin(defaultOutputDirectory, outputDirectory)) throw new Error("--out-dir must be visual-designs/qa/contact-sheets or a child directory.");
  const manifest = JSON.parse((await readFile(manifestPath)).toString("utf8"));
  if (manifest.product !== "Stockmok" || !Array.isArray(manifest.targets)) throw new Error("Manifest must be a Stockmok targets manifest.");

  const groups = new Map();
  for (const target of manifest.targets) {
    if (!target.canonicalPath || extname(target.canonicalPath).toLowerCase() !== ".png") continue;
    const sourcePath = resolve(workspaceRoot, target.canonicalPath);
    if (!isWithin(workspaceRoot, sourcePath) || !existsSync(sourcePath) || !statSync(sourcePath).isFile()) continue;
    const family = familyFor(target, options.groupBy);
    if (options.family && normalizeName(options.family) !== family) continue;
    if (!groups.has(family)) groups.set(family, []);
    groups.get(family).push({ ...target, sourcePath });
  }

  const plans = [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([family, items]) => planFamily(
      family,
      items.sort((left, right) => String(left.visualId).localeCompare(String(right.visualId))),
      options.perSheet,
      Boolean(options.includePartial),
    ));
  const planSummary = plans.map((plan) => ({
    family: plan.family,
    acceptedSources: plan.sheets.reduce((count, sheet) => count + sheet.length, 0) + plan.pending.length,
    sheets: plan.sheets.map((sheet, index) => ({
      file: `${plan.family}-${String(index + 1).padStart(2, "0")}.png`,
      count: sheet.length,
      visualIds: sheet.map((item) => item.visualId),
    })),
    pending: plan.pending.map((item) => item.visualId),
  }));

  if (options.dryRun) {
    process.stdout.write(`${JSON.stringify({
      manifest: toPosixPath(relative(workspaceRoot, manifestPath)),
      outputDirectory: toPosixPath(relative(workspaceRoot, outputDirectory)),
      groupBy: options.groupBy,
      preferredPerSheet: options.perSheet,
      includePartial: Boolean(options.includePartial),
      writes: false,
      families: planSummary,
    }, null, 2)}\n`);
    return;
  }

  const sharp = loadSharp();
  await mkdir(outputDirectory, { recursive: true });
  const outputs = [];
  for (const plan of plans) {
    for (let index = 0; index < plan.sheets.length; index += 1) {
      const outputPath = join(outputDirectory, `${plan.family}-${String(index + 1).padStart(2, "0")}.png`);
      if (existsSync(outputPath) && !options.force) {
        outputs.push({ family: plan.family, path: toPosixPath(relative(workspaceRoot, outputPath)), count: plan.sheets[index].length, status: "skipped_existing" });
        continue;
      }
      const evidence = await composeSheet(sharp, plan, plan.sheets[index], index, outputPath);
      outputs.push({ family: plan.family, path: toPosixPath(relative(workspaceRoot, outputPath)), count: plan.sheets[index].length, status: "written", ...evidence });
    }
  }
  process.stdout.write(`${JSON.stringify({ outputs, pending: planSummary.flatMap((family) => family.pending) }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`contact-sheets.mjs: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
