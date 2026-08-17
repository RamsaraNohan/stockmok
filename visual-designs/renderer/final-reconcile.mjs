import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("C:\\Users\\ramsa\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\sharp");

const root = resolve(import.meta.dirname, "..", "..");
const manifestPath = join(root, "visual-designs", "renderer", "render-manifest.json");
const outputPath = join(root, "visual-designs", "qa", "final-reconciliation.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const targets = manifest.targets || [];
const results = [];

for (const target of targets) {
  const absolutePath = join(root, target.canonicalPath);
  const row = {
    promptId: target.promptId,
    visualId: target.visualId,
    screenId: target.screenId || null,
    method: target.method,
    canonicalPath: target.canonicalPath,
    expectedWidth: target.width,
    expectedHeight: target.height,
    exists: existsSync(absolutePath),
    readablePng: false,
    dimensionsMatch: false,
    legacyPath: /stockflow/i.test(target.canonicalPath),
    sha256: null,
    actualWidth: null,
    actualHeight: null,
    bytes: null,
    errors: [],
  };
  if (!row.exists) {
    row.errors.push("MISSING");
    results.push(row);
    continue;
  }
  try {
    const bytes = await readFile(absolutePath);
    row.bytes = bytes.length;
    row.sha256 = createHash("sha256").update(bytes).digest("hex");
    if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
      row.errors.push("INVALID_PNG_SIGNATURE");
    }
    const metadata = await sharp(bytes).metadata();
    row.actualWidth = metadata.width || null;
    row.actualHeight = metadata.height || null;
    row.readablePng = metadata.format === "png";
    row.dimensionsMatch = metadata.width === target.width && metadata.height === target.height;
    if (!row.readablePng) row.errors.push("UNREADABLE_PNG");
    if (!row.dimensionsMatch) row.errors.push("WRONG_DIMENSIONS");
  } catch (error) {
    row.errors.push(`DECODE_ERROR: ${error.message}`);
  }
  if (row.legacyPath) row.errors.push("LEGACY_STOCKFLOW_PATH");
  results.push(row);
}

const duplicateValues = (key) => {
  const counts = new Map();
  for (const row of results) {
    const value = row[key];
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value, count]) => ({ value, count }));
};

const methodCounts = Object.fromEntries([...new Set(targets.map((target) => target.method))].sort().map((method) => [method, targets.filter((target) => target.method === method).length]));
const summary = {
  generatedAt: new Date().toISOString(),
  product: "Stockmok",
  expected: targets.length,
  current: results.filter((row) => row.exists).length,
  missing: results.filter((row) => !row.exists).length,
  readablePng: results.filter((row) => row.readablePng).length,
  wrongDimensions: results.filter((row) => row.exists && !row.dimensionsMatch).length,
  unreadablePng: results.filter((row) => row.exists && !row.readablePng).length,
  currentLegacyStockflowPaths: results.filter((row) => row.legacyPath).length,
  duplicateCurrentIds: duplicateValues("visualId"),
  duplicateCanonicalPaths: duplicateValues("canonicalPath"),
  duplicateCurrentHashes: duplicateValues("sha256"),
  methodCounts,
  pass: results.every((row) => row.errors.length === 0) && duplicateValues("visualId").length === 0 && duplicateValues("canonicalPath").length === 0,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ schemaVersion: 1, summary, results }, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (!summary.pass) process.exitCode = 1;
