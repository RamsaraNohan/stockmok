#!/usr/bin/env node

import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { constants as fsConstants, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, delimiter, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(here, "..", "..");
const defaultManifestPath = join(here, "render-manifest.json");
const defaultResultsPath = join(workspaceRoot, "visual-designs", "qa", "automated-results.json");
const require = createRequire(import.meta.url);

function usage() {
  return `Stockmok missing-only deterministic batch renderer

Usage:
  node batch-render.mjs [options]

Options:
  --manifest <file>      Manifest path (default: renderer/render-manifest.json)
  --results <file>       QA JSON path (default: visual-designs/qa/automated-results.json)
  --out-root <directory> Redirect PNGs below a noncanonical root for smoke testing
  --concurrency <1-8>    Parallel pages (default: 4)
  --id <id[,id...]>      Restrict to visual, prompt, or screen identifiers
  --limit <count>        Restrict selected missing targets after manifest ordering
  --browser <file>       Chrome/Edge executable override
  --force                Explicitly allow replacement of existing canonical PNGs
  --dry-run              Prevalidate and report only; write no images or QA files
  --help                 Show this help

Default behavior renders only missing DETERMINISTIC_UI_RENDER targets. Existing
canonical PNGs are never replaced unless --force is supplied explicitly.
`;
}

function parseArguments(argv) {
  const options = { concurrency: 4, ids: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") options.help = true;
    else if (token === "--force") options.force = true;
    else if (token === "--dry-run") options.dryRun = true;
    else if (token.startsWith("--")) {
      const rawKey = token.slice(2);
      const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${token}.`);
      if (key === "id") options.ids.push(...value.split(",").map((item) => item.trim()).filter(Boolean));
      else options[key] = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  options.concurrency = Number(options.concurrency);
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 8) {
    throw new Error("--concurrency must be an integer from 1 through 8.");
  }
  if (options.limit !== undefined) {
    options.limit = Number(options.limit);
    if (!Number.isInteger(options.limit) || options.limit < 1) throw new Error("--limit must be a positive integer.");
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

function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function sha256File(filePath) {
  return sha256Buffer(readFileSync(filePath));
}

const CP1252_BYTES = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85],
  [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a],
  [0x2039, 0x8b], [0x0152, 0x8c], [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92],
  [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c],
  [0x017e, 0x9e], [0x0178, 0x9f],
]);

function sanitizeText(value) {
  let text = String(value ?? "");
  for (let pass = 0; pass < 3 && /[ÃÂâ]/.test(text); pass += 1) {
    const bytes = [];
    for (const character of text) {
      const codePoint = character.codePointAt(0);
      if (codePoint <= 0xff) bytes.push(codePoint);
      else if (CP1252_BYTES.has(codePoint)) bytes.push(CP1252_BYTES.get(codePoint));
      else bytes.push(...new TextEncoder().encode(character));
    }
    try {
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes));
      if ((decoded.match(/[ÃÂâ]/g) || []).length >= (text.match(/[ÃÂâ]/g) || []).length) break;
      text = decoded;
    } catch {
      break;
    }
  }
  return text;
}

function pngDimensions(filePath) {
  const bytes = readFileSync(filePath);
  if (bytes.length < 24 || bytes.toString("hex", 0, 8) !== "89504e470d0a1a0a") {
    throw new Error("File is not a valid PNG.");
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function identityMatches(target, requestedIds) {
  if (!requestedIds.length) return true;
  const identities = [target.visualId, target.promptId, target.screenId, target.context]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  return requestedIds.some((wanted) => identities.includes(wanted.toLowerCase()));
}

function prevalidateTarget(target, seenPaths, seenIds) {
  const errors = [];
  const canonicalPath = typeof target.canonicalPath === "string"
    ? resolve(workspaceRoot, target.canonicalPath)
    : "";
  const allowedAssetRoot = join(workspaceRoot, "visual-designs", "generated");

  if (target.method !== "DETERMINISTIC_UI_RENDER") errors.push("method is not DETERMINISTIC_UI_RENDER");
  if (!/^VISUAL-(?:SCREEN|MOBILE|STATE|COMP)-\d{3}$/.test(String(target.visualId || ""))) errors.push("invalid visualId");
  if (!/^PROMPT-(?:SCREEN|MOBILE|STATE|COMP)-\d{3}$/.test(String(target.promptId || ""))) errors.push("invalid promptId");
  if (!target.canonicalPath || extname(target.canonicalPath).toLowerCase() !== ".png") errors.push("canonicalPath must be a PNG");
  if (canonicalPath && !isWithin(allowedAssetRoot, canonicalPath)) errors.push("canonicalPath escapes visual-designs/generated");
  if (!Number.isInteger(target.width) || target.width < 320 || target.width > 4096) errors.push("invalid width");
  if (!Number.isInteger(target.height) || target.height < 320 || target.height > 4096) errors.push("invalid height");
  if (target.viewport?.width !== target.width || target.viewport?.height !== target.height) errors.push("viewport does not match width/height");
  if (!target.render || typeof target.render !== "object") errors.push("missing render payload");
  if (!String(target.render?.title || "").trim()) errors.push("render payload missing title");
  if (!String(target.render?.layoutType || "").trim()) errors.push("render payload missing layoutType");
  if (!target.render?.exactRequirements || typeof target.render.exactRequirements !== "object") errors.push("render payload missing exactRequirements");
  if (seenPaths.has(canonicalPath.toLowerCase())) errors.push("duplicate canonicalPath in selection");
  if (seenIds.has(String(target.visualId).toLowerCase())) errors.push("duplicate visualId in selection");
  seenPaths.add(canonicalPath.toLowerCase());
  seenIds.add(String(target.visualId).toLowerCase());

  return { pass: errors.length === 0, errors, canonicalPath };
}

function remapOutputPath(validation, outRoot) {
  if (!outRoot) return validation.canonicalPath;
  const generatedRoot = join(workspaceRoot, "visual-designs", "generated");
  const relativeAssetPath = relative(generatedRoot, validation.canonicalPath);
  const outputPath = resolve(outRoot, relativeAssetPath);
  if (!isWithin(outRoot, outputPath)) throw new Error(`Remapped output escapes --out-root: ${outputPath}`);
  return outputPath;
}

function playwrightCandidates() {
  const roots = String(process.env.NODE_PATH || "").split(delimiter).filter(Boolean);
  const bundledRoot = process.env.USERPROFILE
    ? join(process.env.USERPROFILE, ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules")
    : "";
  return [
    "playwright",
    ...roots.map((root) => join(root, "playwright", "index.js")),
    bundledRoot ? join(bundledRoot, "playwright", "index.js") : "",
  ].filter(Boolean);
}

function loadPlaywright() {
  for (const candidate of playwrightCandidates()) {
    try {
      const loaded = require(candidate);
      if (loaded?.chromium) return loaded;
    } catch {
      // Continue through the known bundled paths.
    }
  }
  throw new Error("Playwright is unavailable. Set NODE_PATH to the bundled Codex runtime node_modules directory.");
}

function browserCandidates(override) {
  return [
    override,
    process.env.STOCKMOK_BROWSER,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "",
    process.platform === "linux" ? "/usr/bin/google-chrome" : "",
    process.platform === "linux" ? "/usr/bin/chromium" : "",
  ].filter(Boolean);
}

function findBrowser(override) {
  const match = browserCandidates(override).find((candidate) => existsSync(candidate));
  if (!match) throw new Error("No Chrome or Edge executable found. Pass --browser <file>.");
  return match;
}

function contentType(filePath) {
  return ({
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
  })[extname(filePath).toLowerCase()] || "application/octet-stream";
}

function createRendererServer(manifestPath) {
  const routes = new Map([
    ["/", join(here, "index.html")],
    ["/index.html", join(here, "index.html")],
    ["/styles.css", join(here, "styles.css")],
    ["/renderer.js", join(here, "renderer.js")],
    ["/manifest.json", manifestPath],
  ]);
  return createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url || "/", "http://127.0.0.1").pathname;
      const filePath = routes.get(pathname);
      if (!filePath) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }
      response.writeHead(200, {
        "content-type": contentType(filePath),
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      });
      response.end(await readFile(filePath));
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : String(error));
    }
  });
}

async function startServer(manifestPath) {
  const server = createRendererServer(manifestPath);
  await new Promise((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unable to determine renderer server address.");
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

async function closeServer(server) {
  await new Promise((resolvePromise) => server.close(resolvePromise));
}

function domAssertionSummary(snapshot, target) {
  const expectedRoute = Array.isArray(target.route) ? target.route[0] : target.route;
  const expectedRole = String(target.role || "");
  const roleApplicable = Boolean(expectedRole && !/^(?:anyone|not role-specific)$/i.test(expectedRole));
  const requiredActions = (target.render?.requiredActions || []).map((action) => sanitizeText(action?.label || action)).filter(Boolean);
  const tableColumns = (target.render?.tables || []).flatMap((table) => table.columns || []).map(sanitizeText).filter(Boolean);
  const forbiddenActions = (target.render?.forbiddenActions || []).map((action) => sanitizeText(action?.label || action)).filter(Boolean);
  const bodyTextFolded = snapshot.bodyText.toLocaleLowerCase();
  const domTextFolded = snapshot.domText.toLocaleLowerCase();
  const missingActions = requiredActions.filter((label) => !bodyTextFolded.includes(label.toLocaleLowerCase()));
  const availableColumns = new Set(snapshot.tableColumnLabels.map((label) => label.toLocaleLowerCase()));
  const missingColumns = tableColumns.filter((label) => !availableColumns.has(label.toLocaleLowerCase()));
  const visibleForbidden = forbiddenActions.filter((label) => bodyTextFolded.includes(label.toLocaleLowerCase()));
  const expectedNavigation = (target.nav || []).map(sanitizeText).filter(Boolean);
  const missingNavigation = expectedNavigation.filter((label) => !domTextFolded.includes(label.toLocaleLowerCase()));
  const expectedActive = sanitizeText(target.render?.activeNav || "");
  const structuredFields = target.render?.fields;
  const formLayout = /form/i.test(String(target.render?.layoutType || ""));
  const fieldAssertionApplicable = formLayout && (Array.isArray(structuredFields)
    ? structuredFields.length > 0
    : Boolean(structuredFields && typeof structuredFields === "object" && Object.keys(structuredFields).length > 0));
  const sampleCopy = (target.render?.exactSampleDataCopy?.copy || []).filter((value) => !/^\/?(?:app|login|signup|b|invite|select-workspace)\b/i.test(String(value)) && !/visual-designs\/|\.png$/i.test(String(value)));
  const canonicalRowsExpected = tableColumns.length > 0 && (
    sampleCopy.length > 0 ||
    /\bData:/i.test(String(target.render?.states || "")) ||
    /[A-Z]{3,5}-\d{3}/.test(String(target.render?.fields?.fieldsAndValidation || "") + String(target.render?.exactRequirements?.content || "")) ||
    (target.render?.blocks || []).some((block) => Array.isArray(block.rows) && block.rows.length > 0)
  );
  const requirementsText = sanitizeText(`${target.render?.exactRequirements?.surface || ""} ${target.render?.exactRequirements?.content || ""}`);
  const namedChartMatch = requirementsText.match(/Charts?:\s*exactly\s+(.+?)(?:,\s*each\b|\.\s|$)/i);
  const namedCharts = namedChartMatch ? namedChartMatch[1].split(/\s+and\s+|\s*,\s*/i).map((value) => value.replace(/\s+(?:donut|bar)(?:\s+chart)?\b.*$/i, "").trim()).filter(Boolean) : [];
  const explicitChartCount = (target.render?.blocks || []).filter((block) => /chart|donut/i.test(String(block.type || block.kind || ""))).length;
  const requiredChartCount = Math.max(explicitChartCount, namedCharts.length);
  const missingChartLabels = namedCharts.filter((label) => !snapshot.bodyText.includes(label));
  return [
    { name: "render-ready", expected: "ready", actual: snapshot.renderStatus || null, pass: snapshot.renderStatus === "ready" },
    { name: "visual-id", expected: target.visualId, actual: snapshot.visualId || null, pass: snapshot.visualId === target.visualId },
    { name: "stockmok-brand", expected: true, actual: snapshot.brandPresent, pass: snapshot.brandPresent },
    { name: "canonical-mark-single-geometry", expected: true, actual: snapshot.brandMarkPresent, pass: snapshot.brandMarkPresent },
    { name: "no-legacy-stockflow", expected: false, actual: snapshot.legacyBrandPresent, pass: !snapshot.legacyBrandPresent },
    { name: "no-mojibake", expected: false, actual: snapshot.mojibakePresent, pass: !snapshot.mojibakePresent },
    { name: "no-horizontal-overflow", expected: `<=${target.width}`, actual: snapshot.scrollWidth, pass: snapshot.scrollWidth <= target.width },
    { name: "no-critical-vertical-clipping", expected: `<=${target.height}`, actual: snapshot.scrollHeight, pass: snapshot.scrollHeight <= target.height },
    { name: "substantive-content-block", expected: ">=1", actual: snapshot.blockCount, pass: snapshot.blockCount >= 1 },
    { name: "required-actions-visible", expected: requiredActions, actual: missingActions.length ? { missing: missingActions } : "all visible", pass: missingActions.length === 0 },
    { name: "table-columns-visible", expected: tableColumns, actual: missingColumns.length ? { missing: missingColumns } : "all visible", pass: missingColumns.length === 0 },
    { name: "forbidden-actions-absent", expected: forbiddenActions, actual: visibleForbidden, pass: visibleForbidden.length === 0 },
    { name: "authorized-navigation-present", expected: expectedNavigation, actual: missingNavigation.length ? { missing: missingNavigation } : "all present", pass: missingNavigation.length === 0 },
    { name: "active-navigation", applicable: Boolean(expectedActive), expected: expectedActive || null, actual: { labels: snapshot.activeNavLabels, visible: snapshot.activeNavVisible }, pass: !expectedActive || (snapshot.activeNavLabels.includes(expectedActive) && (snapshot.activeNavVisible || target.width <= 767)) },
    { name: "form-field-labels", applicable: fieldAssertionApplicable, expected: fieldAssertionApplicable ? `all ${snapshot.fieldControlCount} controls labelled` : null, actual: snapshot.fieldLabels, pass: !fieldAssertionApplicable || (snapshot.fieldControlCount >= 1 && snapshot.fieldLabels.length === snapshot.fieldControlCount && snapshot.fieldLabels.every(Boolean)) },
    { name: "canonical-table-rows", applicable: canonicalRowsExpected, expected: canonicalRowsExpected ? ">=1" : null, actual: snapshot.tableRowCount, pass: !canonicalRowsExpected || snapshot.tableRowCount >= 1 },
    { name: "required-chart-count", applicable: requiredChartCount > 0, expected: requiredChartCount || null, actual: snapshot.chartCount, pass: requiredChartCount === 0 || snapshot.chartCount >= requiredChartCount },
    { name: "required-chart-labels", applicable: namedCharts.length > 0, expected: namedCharts, actual: missingChartLabels.length ? { missing: missingChartLabels } : "all visible", pass: missingChartLabels.length === 0 },
    {
      name: "route-visible",
      applicable: Boolean(expectedRoute),
      expected: expectedRoute || null,
      actual: expectedRoute ? snapshot.textIncludesRoute : null,
      pass: !expectedRoute || snapshot.textIncludesRoute,
    },
    {
      name: "role-visible",
      applicable: roleApplicable,
      expected: roleApplicable ? expectedRole : null,
      actual: roleApplicable ? snapshot.textIncludesRole : null,
      pass: !roleApplicable || snapshot.textIncludesRole,
    },
  ];
}

async function renderTarget(browser, origin, manifestPath, item, options, tempDirectory) {
  const { target, validation } = item;
  const outputPath = validation.outputPath || validation.canonicalPath;
  const resultBase = {
    promptId: target.promptId,
    visualId: target.visualId,
    screenId: target.screenId || null,
    role: target.role || null,
    canonicalPath: toPosixPath(relative(workspaceRoot, outputPath)),
    registeredCanonicalPath: toPosixPath(relative(workspaceRoot, validation.canonicalPath)),
    expectedDimensions: { width: target.width, height: target.height },
    prevalidation: { pass: validation.pass, errors: validation.errors },
  };

  if (!validation.pass) return { ...resultBase, status: "prevalidation_failed", domAssertions: [], error: validation.errors.join("; ") };

  const existsAtStart = existsSync(outputPath);
  if (existsAtStart && !options.force) {
    try {
      const dimensions = pngDimensions(outputPath);
      return {
        ...resultBase,
        status: "skipped_existing",
        actualDimensions: dimensions,
        sha256: sha256File(outputPath),
        domAssertions: [{
          name: "png-dimensions",
          expected: `${target.width}x${target.height}`,
          actual: `${dimensions.width}x${dimensions.height}`,
          pass: dimensions.width === target.width && dimensions.height === target.height,
        }],
      };
    } catch (error) {
      return { ...resultBase, status: "existing_invalid", domAssertions: [], error: error instanceof Error ? error.message : String(error) };
    }
  }

  const page = await browser.newPage({
    viewport: { width: target.width, height: target.height },
    deviceScaleFactor: 1,
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const temporaryPng = join(tempDirectory, `${target.visualId}.png`);
  try {
    const query = new URLSearchParams({ manifest: "/manifest.json", id: target.visualId });
    await page.goto(`${origin}/index.html?${query}`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__STOCKMOK_RENDER_READY__ === true, null, { timeout: 15_000 });
    const snapshot = await page.evaluate(({ visualId, route, role }) => {
      const root = document.querySelector("#app");
      const text = document.body.innerText;
      const domText = document.body.textContent || "";
      const routeValue = Array.isArray(route) ? route[0] : route;
      return {
        renderStatus: root?.dataset.renderStatus || null,
        visualId: root?.dataset.visualId || document.querySelector("[data-visual-id]")?.dataset.visualId || null,
        renderError: window.__STOCKMOK_RENDER_ERROR__ || null,
        brandPresent: [...document.querySelectorAll(".brand-wordmark")].some((node) => node.textContent?.trim() === "Stockmok"),
        brandMarkPresent: Boolean(document.querySelector(".brand-mark path")),
        legacyBrandPresent: /StockFlow/i.test(text),
        mojibakePresent: /[ÃÂâ]/.test(domText),
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        blockCount: document.querySelectorAll(".block, .auth-card .form-card, .auth-card .card, .auth-card .table-card, .auth-card .empty-state, .auth-card .error-state").length,
        bodyText: text,
        domText,
        activeNavLabels: [...document.querySelectorAll(".nav-item--active .nav-item__label")].map((node) => node.textContent?.trim()).filter(Boolean),
        activeNavVisible: [...document.querySelectorAll(".nav-item--active")].some((node) => {
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
        }),
        fieldLabels: [...document.querySelectorAll(".field-label")].map((node) => node.textContent?.trim()).filter(Boolean),
        tableColumnLabels: [...document.querySelectorAll(".data-table th, .data-table td[data-label]")].map((node) => node.getAttribute("data-label") || node.textContent?.trim()).filter(Boolean),
        fieldControlCount: document.querySelectorAll(".field-control").length,
        tableRowCount: document.querySelectorAll(".data-table tbody tr").length,
        chartCount: document.querySelectorAll(".chart, .donut").length,
        textIncludesRoute: routeValue ? text.includes(routeValue) : null,
        textIncludesRole: role ? role.split("|").map((value) => value.trim()).filter(Boolean).some((value) => text.includes(value)) : null,
      };
    }, { visualId: target.visualId, route: target.route, role: target.role });
    if (snapshot.renderStatus !== "ready") throw new Error(snapshot.renderError || "Client renderer did not reach ready state.");
    const domAssertions = domAssertionSummary(snapshot, target);
    await page.screenshot({ path: temporaryPng, type: "png", fullPage: false, animations: "disabled" });
    const dimensions = pngDimensions(temporaryPng);
    const dimensionAssertion = {
      name: "png-dimensions",
      expected: `${target.width}x${target.height}`,
      actual: `${dimensions.width}x${dimensions.height}`,
      pass: dimensions.width === target.width && dimensions.height === target.height,
    };
    domAssertions.push(dimensionAssertion);
    if (domAssertions.some((assertion) => assertion.applicable !== false && !assertion.pass)) {
      // Preserve failed noncanonical smoke captures for visual diagnosis. The
      // canonical path remains protected; only an explicit --out-root receives
      // this QA evidence.
      if (options.outRoot) {
        await mkdir(dirname(outputPath), { recursive: true });
        await copyFile(temporaryPng, outputPath);
      }
      return {
        ...resultBase,
        status: "qa_failed",
        actualDimensions: dimensions,
        sha256: sha256File(temporaryPng),
        domAssertions,
        error: "One or more DOM or PNG assertions failed; canonical output was not written.",
      };
    }

    await mkdir(dirname(outputPath), { recursive: true });
    if (existsSync(outputPath) && !options.force) {
      return { ...resultBase, status: "skipped_race_existing", actualDimensions: pngDimensions(outputPath), sha256: sha256File(outputPath), domAssertions };
    }
    await copyFile(temporaryPng, outputPath, options.force ? 0 : fsConstants.COPYFILE_EXCL);
    return {
      ...resultBase,
      status: options.outRoot ? "rendered_noncanonical" : options.force && existsAtStart ? "replaced" : "rendered",
      actualDimensions: dimensions,
      sha256: sha256File(outputPath),
      domAssertions,
    };
  } catch (error) {
    return { ...resultBase, status: "render_failed", domAssertions: [], error: error instanceof Error ? error.message : String(error) };
  } finally {
    await page.close();
  }
}

async function mapConcurrent(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function runWorker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker));
  return results;
}

function summarize(results) {
  return results.reduce((summary, result) => {
    summary[result.status] = (summary[result.status] || 0) + 1;
    return summary;
  }, {});
}

async function writeResults(resultsPath, manifestHash, options, results) {
  const qaRoot = join(workspaceRoot, "visual-designs", "qa");
  const allowedResultsRoot = options.outRoot || qaRoot;
  if (!isWithin(allowedResultsRoot, resultsPath) || extname(resultsPath).toLowerCase() !== ".json") {
    throw new Error(`--results must be a JSON file inside ${options.outRoot ? "--out-root" : "visual-designs/qa"}.`);
  }
  const document = {
    schemaVersion: 1,
    product: "Stockmok",
    manifestSha256: manifestHash,
    method: "DETERMINISTIC_UI_RENDER",
    concurrency: options.concurrency,
    force: Boolean(options.force),
    summary: summarize(results),
    results,
  };
  await mkdir(dirname(resultsPath), { recursive: true });
  const temporaryPath = `${resultsPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  await rename(temporaryPath, resultsPath);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  const manifestPath = resolveInputPath(options.manifest, defaultManifestPath);
  options.outRoot = options.outRoot ? resolveInputPath(options.outRoot) : null;
  if (options.outRoot && isWithin(join(workspaceRoot, "visual-designs", "generated"), options.outRoot)) {
    throw new Error("--out-root must not be inside the canonical visual-designs/generated tree.");
  }
  const resultsPath = resolveInputPath(options.results, options.outRoot ? join(options.outRoot, "automated-results.json") : defaultResultsPath);
  if (!existsSync(manifestPath) || !statSync(manifestPath).isFile()) throw new Error(`Manifest not found: ${manifestPath}`);
  const manifestBuffer = await readFile(manifestPath);
  const manifest = JSON.parse(manifestBuffer.toString("utf8"));
  if (manifest.product !== "Stockmok" || !Array.isArray(manifest.targets)) throw new Error("Manifest must be a Stockmok targets manifest.");

  const selectedTargets = manifest.targets
    .filter((target) => target.method === "DETERMINISTIC_UI_RENDER")
    .filter((target) => identityMatches(target, options.ids));
  if (options.ids.length && selectedTargets.length === 0) throw new Error("No deterministic targets matched --id.");

  const seenPaths = new Set();
  const seenIds = new Set();
  const items = selectedTargets.map((target, index) => ({
    index,
    target,
    validation: prevalidateTarget(target, seenPaths, seenIds),
  }));
  for (const item of items) item.validation.outputPath = remapOutputPath(item.validation, options.outRoot);
  const missingOrForced = items.filter((item) => options.force || !existsSync(item.validation.outputPath));
  const renderQueue = options.limit ? missingOrForced.slice(0, options.limit) : missingOrForced;
  const omittedByLimit = new Set(missingOrForced.slice(renderQueue.length).map((item) => item.target.visualId));

  if (options.dryRun) {
    const invalid = items.filter((item) => !item.validation.pass);
    process.stdout.write(`${JSON.stringify({
      status: invalid.length ? "FAIL" : "PASS",
      manifest: toPosixPath(relative(workspaceRoot, manifestPath)),
      deterministicTargets: items.length,
      existing: items.filter((item) => existsSync(item.validation.outputPath)).length,
      outRoot: options.outRoot || null,
      selectedForRender: renderQueue.length,
      omittedByLimit: omittedByLimit.size,
      invalid: invalid.map((item) => ({ visualId: item.target.visualId, errors: item.validation.errors })),
      concurrency: options.concurrency,
      force: Boolean(options.force),
      writes: false,
    }, null, 2)}\n`);
    if (invalid.length) process.exitCode = 1;
    return;
  }

  const invalidQueued = renderQueue.filter((item) => !item.validation.pass);
  if (invalidQueued.length) throw new Error(`Prevalidation failed for ${invalidQueued.length} selected target(s).`);

  const playwright = loadPlaywright();
  const executablePath = findBrowser(options.browser);
  const browser = await playwright.chromium.launch({ headless: true, executablePath });
  const { server, origin } = await startServer(manifestPath);
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "stockmok-batch-"));
  let renderedResults = [];
  try {
    renderedResults = await mapConcurrent(renderQueue, options.concurrency, (item) => (
      renderTarget(browser, origin, manifestPath, item, options, temporaryDirectory)
    ));
  } finally {
    await closeServer(server);
    await browser.close();
    await rm(temporaryDirectory, { recursive: true, force: true });
  }

  const resultById = new Map(renderedResults.map((result) => [result.visualId, result]));
  const results = items.map((item) => {
    const rendered = resultById.get(item.target.visualId);
    if (rendered) return rendered;
    const outputPath = item.validation.outputPath;
    if (omittedByLimit.has(item.target.visualId)) {
      return {
        promptId: item.target.promptId,
        visualId: item.target.visualId,
        screenId: item.target.screenId || null,
        role: item.target.role || null,
        canonicalPath: toPosixPath(relative(workspaceRoot, outputPath)),
        expectedDimensions: { width: item.target.width, height: item.target.height },
        prevalidation: { pass: item.validation.pass, errors: item.validation.errors },
        status: "omitted_by_limit",
        domAssertions: [],
      };
    }
    if (existsSync(outputPath)) {
      try {
        const dimensions = pngDimensions(outputPath);
        return {
          promptId: item.target.promptId,
          visualId: item.target.visualId,
          screenId: item.target.screenId || null,
          role: item.target.role || null,
          canonicalPath: toPosixPath(relative(workspaceRoot, outputPath)),
          expectedDimensions: { width: item.target.width, height: item.target.height },
          actualDimensions: dimensions,
          sha256: sha256File(outputPath),
          prevalidation: { pass: item.validation.pass, errors: item.validation.errors },
          status: "skipped_existing",
          domAssertions: [{ name: "png-dimensions", expected: `${item.target.width}x${item.target.height}`, actual: `${dimensions.width}x${dimensions.height}`, pass: dimensions.width === item.target.width && dimensions.height === item.target.height }],
        };
      } catch (error) {
        return { promptId: item.target.promptId, visualId: item.target.visualId, canonicalPath: toPosixPath(relative(workspaceRoot, outputPath)), status: "existing_invalid", prevalidation: { pass: item.validation.pass, errors: item.validation.errors }, domAssertions: [], error: error instanceof Error ? error.message : String(error) };
      }
    }
    return { promptId: item.target.promptId, visualId: item.target.visualId, canonicalPath: toPosixPath(relative(workspaceRoot, outputPath)), status: "not_selected", prevalidation: { pass: item.validation.pass, errors: item.validation.errors }, domAssertions: [] };
  });

  await writeResults(resultsPath, sha256Buffer(manifestBuffer), options, results);
  const summary = summarize(results);
  process.stdout.write(`${JSON.stringify({ results: toPosixPath(relative(workspaceRoot, resultsPath)), summary }, null, 2)}\n`);
  if (results.some((result) => ["prevalidation_failed", "render_failed", "qa_failed", "existing_invalid"].includes(result.status))) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`batch-render.mjs: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
