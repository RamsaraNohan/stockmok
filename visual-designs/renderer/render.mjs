#!/usr/bin/env node

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { access, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { delimiter, dirname, extname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rendererDirectory = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function usage() {
  return `Stockmok deterministic visual renderer

Usage:
  node render.mjs --manifest <file> --id <visual-id> --out <png>

Options:
  --manifest <file>   Render manifest (default: ./render-manifest.json)
  --id <id>           visualId, screenId, promptId, id, or slug to render
  --out <png>         Required PNG output path
  --viewport <name>   desktop or mobile; passed to the client
  --width <pixels>    Viewport width (default: manifest, or 1280/390)
  --height <pixels>   Viewport height (default: manifest, or 900/844)
  --browser <file>    Chrome or Edge executable override
  --list              List render entry identifiers
  --help              Show this help
`;
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") options.help = true;
    else if (token === "--list") options.list = true;
    else if (token.startsWith("--")) {
      const key = token.slice(2);
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${token}.`);
      options[key] = value;
      index += 1;
    } else throw new Error(`Unknown argument: ${token}`);
  }
  return options;
}

function manifestEntries(manifest) {
  if (Array.isArray(manifest)) return manifest;
  for (const key of ["targets", "renders", "entries", "visuals", "screens", "items"]) {
    if (Array.isArray(manifest?.[key])) return manifest[key];
  }
  for (const key of ["targets", "renders", "entries", "visuals", "screens"]) {
    if (manifest?.[key] && typeof manifest[key] === "object") {
      return Object.entries(manifest[key]).map(([id, value]) => ({ id, ...(value || {}) }));
    }
  }
  return manifest && typeof manifest === "object" ? [manifest] : [];
}

function entryIdentity(entry) {
  return entry?.visualId || entry?.visual_id || entry?.id || entry?.screenId || entry?.screen_id || entry?.promptId || entry?.prompt_id || entry?.slug || "";
}

function selectEntry(manifest, requestedId) {
  const entries = manifestEntries(manifest);
  if (!requestedId) return entries[0];
  const wanted = requestedId.toLowerCase();
  return entries.find((entry) => [
    entryIdentity(entry), entry?.visualId, entry?.visual_id, entry?.id,
    entry?.screenId, entry?.screen_id, entry?.promptId, entry?.prompt_id, entry?.slug,
  ].some((value) => String(value || "").toLowerCase() === wanted));
}

function viewportFrom(entry, options) {
  const requested = String(options.viewport || entry?.viewport?.name || entry?.breakpoint || "desktop").toLowerCase();
  const defaults = requested === "mobile" ? { width: 390, height: 844 } : { width: 1280, height: 900 };
  const width = Number(options.width || entry?.viewport?.width || entry?.width || defaults.width);
  const height = Number(options.height || entry?.viewport?.height || entry?.height || defaults.height);
  if (!Number.isInteger(width) || width < 320 || width > 4096) throw new Error(`Invalid viewport width: ${width}`);
  if (!Number.isInteger(height) || height < 320 || height > 4096) throw new Error(`Invalid viewport height: ${height}`);
  return { name: requested, width, height };
}

function browserCandidates(override) {
  return [
    override,
    process.env.STOCKMOK_BROWSER,
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "",
    process.platform === "linux" ? "/usr/bin/google-chrome" : "",
    process.platform === "linux" ? "/usr/bin/chromium" : "",
  ].filter(Boolean);
}

function playwrightCandidates() {
  const nodePathRoots = String(process.env.NODE_PATH || "").split(delimiter).filter(Boolean);
  const bundledRoot = process.env.USERPROFILE
    ? join(process.env.USERPROFILE, ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules")
    : "";
  return [
    "playwright",
    ...nodePathRoots.map((root) => join(root, "playwright")),
    bundledRoot ? join(bundledRoot, "playwright") : "",
  ].filter(Boolean);
}

function loadPlaywright() {
  for (const candidate of playwrightCandidates()) {
    try {
      const packagePath = candidate === "playwright" ? candidate : join(candidate, "index.js");
      const loaded = require(packagePath);
      if (loaded?.chromium) return loaded;
    } catch {
      // The renderer can still fall back to a locally installed Chromium browser.
    }
  }
  return null;
}

async function findBrowser(override) {
  for (const candidate of browserCandidates(override)) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next known local executable.
    }
  }
  throw new Error("No local Chrome or Edge executable was found. Pass --browser <file>.");
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
  const allowed = new Map([
    ["/", join(rendererDirectory, "index.html")],
    ["/index.html", join(rendererDirectory, "index.html")],
    ["/styles.css", join(rendererDirectory, "styles.css")],
    ["/renderer.js", join(rendererDirectory, "renderer.js")],
    ["/manifest.json", manifestPath],
  ]);
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url || "/", "http://127.0.0.1").pathname;
      const filePath = allowed.get(pathname);
      if (!filePath) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }
      const body = await readFile(filePath);
      response.writeHead(200, {
        "content-type": contentType(filePath),
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      });
      response.end(body);
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : String(error));
    }
  });
  return server;
}

function runBrowser(browser, arguments_, captureOutput = false) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(browser, arguments_, {
      stdio: captureOutput ? ["ignore", "pipe", "pipe"] : ["ignore", "ignore", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    if (captureOutput) child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) resolvePromise({ stdout, stderr });
      else rejectPromise(new Error(`Headless browser exited with code ${code}${stderr ? `: ${stderr.trim()}` : ""}`));
    });
  });
}

function baseBrowserArguments(profileDirectory, viewport) {
  return [
    "--headless=new",
    "--disable-gpu",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-default-apps",
    "--disable-sync",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--force-color-profile=srgb",
    "--force-device-scale-factor=1",
    `--user-data-dir=${profileDirectory}`,
    `--window-size=${viewport.width},${viewport.height}`,
    "--virtual-time-budget=2500",
  ];
}

function pngDimensions(filePath) {
  const bytes = readFileSync(filePath);
  if (bytes.length < 24 || bytes.toString("hex", 0, 8) !== "89504e470d0a1a0a") throw new Error("Browser output is not a valid PNG.");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function renderWithPlaywright(playwright, executablePath, url, outputPath, viewport) {
  const browser = await playwright.chromium.launch({ headless: true, executablePath });
  try {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      colorScheme: "light",
      reducedMotion: "reduce",
    });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__STOCKMOK_RENDER_READY__ === true, null, { timeout: 10_000 });
    const state = await page.evaluate(() => ({
      status: document.querySelector("#app")?.dataset.renderStatus,
      error: window.__STOCKMOK_RENDER_ERROR__,
    }));
    if (state.status !== "ready") throw new Error(`Client render did not reach ready state${state.error ? `: ${state.error}` : "."}`);
    await page.screenshot({ path: outputPath, type: "png", fullPage: false, animations: "disabled" });
  } finally {
    await browser.close();
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  const manifestPath = options.manifest
    ? (isAbsolute(options.manifest) ? options.manifest : resolve(process.cwd(), options.manifest))
    : join(rendererDirectory, "render-manifest.json");
  if (!existsSync(manifestPath) || !statSync(manifestPath).isFile()) throw new Error(`Manifest not found: ${manifestPath}`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const entries = manifestEntries(manifest);

  if (options.list) {
    process.stdout.write(`${entries.map(entryIdentity).filter(Boolean).join("\n")}\n`);
    return;
  }
  if (!options.out) throw new Error("--out <png> is required; the renderer never writes into canonical asset folders implicitly.");
  const entry = selectEntry(manifest, options.id);
  if (!entry) throw new Error(`No render entry matched “${options.id || "(first entry)"}”.`);
  const visualId = entryIdentity(entry);
  if (!visualId) throw new Error("The selected render entry has no identifier.");
  const viewport = viewportFrom(entry, options);
  const outputPath = isAbsolute(options.out) ? options.out : resolve(process.cwd(), options.out);
  if (extname(outputPath).toLowerCase() !== ".png") throw new Error("--out must use a .png extension.");
  await mkdir(dirname(outputPath), { recursive: true });

  const server = createRendererServer(manifestPath);
  await new Promise((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(0, "127.0.0.1", resolvePromise);
  });

  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Unable to determine renderer server address.");
    const query = new URLSearchParams({ manifest: "/manifest.json", id: visualId, viewport: viewport.name });
    const url = `http://127.0.0.1:${address.port}/index.html?${query}`;
    const playwright = loadPlaywright();
    if (playwright) {
      const executablePath = await findBrowser(options.browser);
      await renderWithPlaywright(playwright, executablePath, url, outputPath, viewport);
    } else {
      const browser = await findBrowser(options.browser);
      const profileDirectory = await mkdtemp(join(tmpdir(), "stockmok-render-"));
      try {
        const baseArguments = baseBrowserArguments(profileDirectory, viewport);
        const dom = await runBrowser(browser, [...baseArguments, "--dump-dom", url], true);
        if (!dom.stdout.includes('data-render-status="ready"')) {
          const errorMatch = dom.stdout.match(/<main class="render-error">[\s\S]*?<p>(.*?)<\/p>/);
          throw new Error(`Client render did not reach ready state${errorMatch ? `: ${errorMatch[1].replace(/<[^>]+>/g, "")}` : "."}`);
        }
        await runBrowser(browser, [...baseArguments, `--screenshot=${outputPath}`, url]);
      } finally {
        await rm(profileDirectory, { recursive: true, force: true });
      }
    }
    const dimensions = pngDimensions(outputPath);
    if (dimensions.width !== viewport.width || dimensions.height !== viewport.height) {
      throw new Error(`PNG dimensions ${dimensions.width}x${dimensions.height} do not match requested ${viewport.width}x${viewport.height}.`);
    }
    process.stdout.write(`${visualId}\n${outputPath}\n${dimensions.width}x${dimensions.height}\n`);
  } finally {
    await new Promise((resolvePromise) => server.close(resolvePromise));
  }
}

main().catch((error) => {
  process.stderr.write(`render.mjs: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
