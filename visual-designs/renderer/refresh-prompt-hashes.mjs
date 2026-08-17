import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..", "..");
const read = (relative) => readFile(join(root, relative), "utf8");
const contracts = new Map();

const library = await read("docs/ui-final/26_FINAL_VISUAL_GENERATION_PROMPT_LIBRARY.md");
const headings = [...library.matchAll(/^### +`?(PROMPT-[A-Z]+-\d{3})`?[^\r\n]*$/gm)];
for (let index = 0; index < headings.length; index += 1) {
  const start = headings[index].index + headings[index][0].length;
  const end = headings[index + 1]?.index ?? library.length;
  const match = library.slice(start, end).match(/\*\*Prompt:\*\*\s*([^\r\n]+)/);
  if (match) contracts.set(headings[index][1], match[1].trim());
}

const boards = await read("docs/ui-final/27_FINAL_MULTI_SCREEN_BOARD_PROMPTS.md");
const boardHeadings = [...boards.matchAll(/^### +(PROMPT-(?:BOARD|REVIEW)-\d{3})[^\r\n]*$/gm)];
for (let index = 0; index < boardHeadings.length; index += 1) {
  const start = boardHeadings[index].index + boardHeadings[index][0].length;
  const end = boardHeadings[index + 1]?.index ?? boards.length;
  const section = boards.slice(start, end);
  const fenceStart = section.indexOf("```text");
  const bodyStart = fenceStart < 0 ? -1 : section.indexOf("\n", fenceStart) + 1;
  const fenceEnd = bodyStart <= 0 ? -1 : section.indexOf("```", bodyStart);
  if (bodyStart > 0 && fenceEnd > bodyStart) contracts.set(boardHeadings[index][1], section.slice(bodyStart, fenceEnd).trim().replace(/\s+/g, " "));
}

const manifestPath = join(root, "visual-designs", "renderer", "render-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
for (const target of manifest.targets) {
  const contract = contracts.get(target.promptId);
  if (!contract) throw new Error(`Missing current prompt body for ${target.promptId}`);
  target.promptSha256 = createHash("sha256").update(contract, "utf8").digest("hex");
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ refreshed: manifest.targets.length, contracts: contracts.size })}\n`);
