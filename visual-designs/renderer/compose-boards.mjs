#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const manifest = JSON.parse(readFileSync(join(here, "render-manifest.json"), "utf8"));
const require = createRequire(import.meta.url);
const sharp = require("C:\\Users\\ramsa\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\sharp");
const force = process.argv.includes("--force");
const byId = new Map(manifest.targets.map((target) => [target.visualId, target]));

const ranges = (prefix, start, end) => Array.from({ length: end - start + 1 }, (_, index) => `${prefix}-${String(start + index).padStart(3, "0")}`);
const existing = (ids) => [...new Set(ids)].filter((id) => {
  const target = byId.get(id);
  return target && existsSync(join(root, target.canonicalPath));
});

const groups = {
  "VISUAL-BRAND-006": existing(ranges("VISUAL-BRAND", 2, 5)),
  "VISUAL-BOARD-001": existing([...ranges("VISUAL-BRAND", 2, 6), ...ranges("VISUAL-COMP", 1, 10)]),
  "VISUAL-BOARD-002": existing([...ranges("VISUAL-SCREEN", 1, 7), "VISUAL-SCREEN-029", "VISUAL-SCREEN-030", "VISUAL-SCREEN-041", ...ranges("VISUAL-STATE", 1, 1)]),
  "VISUAL-BOARD-003": existing([...ranges("VISUAL-SCREEN", 8, 17), "VISUAL-SCREEN-042", ...ranges("VISUAL-SCREEN", 44, 47), ...ranges("VISUAL-MOBILE", 4, 7), "VISUAL-COMP-009"]),
  "VISUAL-BOARD-004": existing([...ranges("VISUAL-SCREEN", 18, 24), ...ranges("VISUAL-SCREEN", 38, 40), ...ranges("VISUAL-STATE", 4, 5)]),
  "VISUAL-BOARD-005": existing([...ranges("VISUAL-SCREEN", 31, 40), ...ranges("VISUAL-STATE", 6, 8)]),
  "VISUAL-BOARD-006": existing([...ranges("VISUAL-SCREEN", 25, 28), ...ranges("VISUAL-SCREEN", 48, 52), ...ranges("VISUAL-STATE", 9, 11)]),
  "VISUAL-BOARD-007": existing(ranges("VISUAL-MOBILE", 1, 11)),
  "VISUAL-BOARD-008": existing(["VISUAL-BRAND-006", "VISUAL-SCREEN-001", "VISUAL-SCREEN-008", "VISUAL-SCREEN-011", "VISUAL-SCREEN-016", "VISUAL-SCREEN-021", "VISUAL-SCREEN-024", "VISUAL-SCREEN-031", "VISUAL-SCREEN-038", "VISUAL-SCREEN-048", "VISUAL-MOBILE-004", "VISUAL-COMP-009"]),
  "VISUAL-REVIEW-001": existing([...ranges("VISUAL-SCREEN", 1, 7), "VISUAL-SCREEN-029", "VISUAL-SCREEN-030", "VISUAL-SCREEN-041", ...ranges("VISUAL-MOBILE", 1, 3), "VISUAL-STATE-001", "VISUAL-STATE-009"]),
  "VISUAL-REVIEW-002": existing([...ranges("VISUAL-SCREEN", 8, 17), "VISUAL-SCREEN-042", ...ranges("VISUAL-SCREEN", 44, 47), ...ranges("VISUAL-MOBILE", 4, 7), "VISUAL-STATE-002", "VISUAL-STATE-003", "VISUAL-COMP-009"]),
  "VISUAL-REVIEW-003": existing([...ranges("VISUAL-SCREEN", 18, 24), ...ranges("VISUAL-SCREEN", 38, 40), ...ranges("VISUAL-MOBILE", 8, 9), ...ranges("VISUAL-STATE", 4, 5)]),
  "VISUAL-REVIEW-004": existing([...ranges("VISUAL-SCREEN", 31, 40), ...ranges("VISUAL-STATE", 6, 8)]),
  "VISUAL-REVIEW-005": existing([...ranges("VISUAL-SCREEN", 25, 28), ...ranges("VISUAL-SCREEN", 48, 52), ...ranges("VISUAL-STATE", 9, 11)]),
  "VISUAL-REVIEW-006": existing(ranges("VISUAL-MOBILE", 1, 11)),
  "VISUAL-REVIEW-007": existing(ranges("VISUAL-STATE", 1, 11)),
  "VISUAL-REVIEW-008": existing(["VISUAL-BRAND-006", "VISUAL-SCREEN-001", "VISUAL-SCREEN-008", "VISUAL-SCREEN-010", "VISUAL-SCREEN-011", "VISUAL-SCREEN-016", "VISUAL-SCREEN-021", "VISUAL-SCREEN-024", "VISUAL-SCREEN-031", "VISUAL-SCREEN-038", "VISUAL-SCREEN-048", "VISUAL-MOBILE-004", "VISUAL-COMP-009"]),
};

function escapeXml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function titleFor(target) {
  return String(target.context || target.visualId).replaceAll(/[_-]+/g, " ");
}

async function compose(target, sourceIds) {
  if (!sourceIds.length) throw new Error(`${target.visualId} has no current source visuals`);
  const output = join(root, target.canonicalPath);
  if (existsSync(output) && !force) return { visualId: target.visualId, status: "skipped_existing", path: target.canonicalPath, sources: sourceIds };

  const headerHeight = target.height >= 1800 ? 150 : 128;
  const outer = target.width >= 3000 ? 44 : 32;
  const gap = target.width >= 3000 ? 28 : 20;
  const ratio = target.width / Math.max(1, target.height - headerHeight);
  const columns = target.visualId === "VISUAL-BRAND-006" ? 2 : Math.max(2, Math.ceil(Math.sqrt(sourceIds.length * ratio)));
  const rows = Math.ceil(sourceIds.length / columns);
  const cellWidth = Math.floor((target.width - outer * 2 - gap * (columns - 1)) / columns);
  const cellHeight = Math.floor((target.height - headerHeight - outer - gap * (rows - 1)) / rows);
  const labelHeight = target.width >= 3000 ? 42 : 34;
  const composites = [];

  const header = Buffer.from(`<svg width="${target.width}" height="${headerHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ffffff"/><rect y="${headerHeight - 1}" width="100%" height="1" fill="#cbd5e1"/><g transform="translate(${outer} 32) scale(1.333333)"><path fill="#1D4ED8" d="M4 2h12a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2v2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-6v4h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h6v-4h0V6H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"/></g><text x="${outer + 46}" y="56" font-family="Segoe UI,Arial,sans-serif" font-size="30" font-weight="700" fill="#0f172a">Stockmok</text><text x="${outer}" y="103" font-family="Segoe UI,Arial,sans-serif" font-size="24" font-weight="700" fill="#0f172a">${escapeXml(titleFor(target))}</text><text x="${target.width - outer}" y="101" text-anchor="end" font-family="Segoe UI,Arial,sans-serif" font-size="15" fill="#64748b">${escapeXml(target.visualId)} · ${sourceIds.length} accepted sources</text></svg>`);
  composites.push({ input: header, left: 0, top: 0 });

  for (let index = 0; index < sourceIds.length; index += 1) {
    const sourceId = sourceIds[index];
    const source = byId.get(sourceId);
    const x = outer + (index % columns) * (cellWidth + gap);
    const y = headerHeight + (Math.floor(index / columns) * (cellHeight + gap));
    const imageHeight = Math.max(80, cellHeight - labelHeight);
    const thumb = await sharp(join(root, source.canonicalPath)).resize(cellWidth, imageHeight, { fit: "contain", background: "#ffffff" }).png().toBuffer();
    const label = Buffer.from(`<svg width="${cellWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ffffff"/><rect y="0" width="100%" height="1" fill="#cbd5e1"/><text x="12" y="${Math.floor(labelHeight * .65)}" font-family="Segoe UI,Arial,sans-serif" font-size="${target.width >= 3000 ? 14 : 12}" font-weight="700" fill="#0f172a">${escapeXml(sourceId)}</text><text x="${cellWidth - 12}" y="${Math.floor(labelHeight * .65)}" text-anchor="end" font-family="Segoe UI,Arial,sans-serif" font-size="${target.width >= 3000 ? 13 : 11}" fill="#64748b">${escapeXml(source.screenId || source.context || source.category)}</text></svg>`);
    composites.push({ input: thumb, left: x, top: y });
    composites.push({ input: label, left: x, top: y + imageHeight });
  }

  await mkdir(dirname(output), { recursive: true });
  await sharp({ create: { width: target.width, height: target.height, channels: 3, background: "#f8fafc" } }).composite(composites).png().toFile(output);
  const metadata = await sharp(output).metadata();
  if (metadata.width !== target.width || metadata.height !== target.height) throw new Error(`${target.visualId} dimensions mismatch`);
  return { visualId: target.visualId, status: "rendered", path: target.canonicalPath, width: metadata.width, height: metadata.height, sha256: sha256(output), sources: sourceIds };
}

const composites = manifest.targets.filter((target) => target.method === "COMPOSITE_REVIEW_BOARD");
const ordered = [...composites].sort((a, b) => (a.visualId === "VISUAL-BRAND-006" ? -1 : b.visualId === "VISUAL-BRAND-006" ? 1 : a.visualId.localeCompare(b.visualId)));
const results = [];
for (const target of ordered) {
  if (target.visualId !== "VISUAL-BRAND-006") {
    const planned = groups[target.visualId] || target.sourceVisuals || [];
    if (["VISUAL-BOARD-001", "VISUAL-BOARD-008", "VISUAL-REVIEW-008"].includes(target.visualId)) planned.unshift("VISUAL-BRAND-006");
    groups[target.visualId] = existing(planned);
  }
  results.push(await compose(target, groups[target.visualId] || []));
}

const resultPath = join(root, "visual-designs", "qa", "composite-results.json");
await mkdir(dirname(resultPath), { recursive: true });
await writeFile(resultPath, `${JSON.stringify({ schemaVersion: 1, product: "Stockmok", expected: composites.length, results }, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ rendered: results.filter((item) => item.status === "rendered").length, skipped: results.filter((item) => item.status === "skipped_existing").length, results: "visual-designs/qa/composite-results.json" }, null, 2)}\n`);
