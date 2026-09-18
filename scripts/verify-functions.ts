import { readFile } from 'node:fs/promises';

const firebase = JSON.parse(await readFile('firebase.json', 'utf8')) as {
  functions?: { source?: string; runtime?: string };
  firestore?: { rules?: string };
};
const packageJson = JSON.parse(await readFile('functions/package.json', 'utf8')) as {
  engines?: { node?: string };
};
const source = await readFile('functions/src/index.ts', 'utf8');

if (firebase.functions?.source !== 'functions' || firebase.functions.runtime !== 'nodejs22') {
  throw new Error('Functions codebase configuration is not Node 22');
}
if (packageJson.engines?.node !== '22')
  throw new Error('Functions package does not require Node 22');

// B1 owns firestore.rules. C1's inverse assertion ("C1 must not configure
// firestore.rules") described the phase before this one and is superseded.
if (firebase.firestore?.rules !== 'firestore.rules')
  throw new Error('firebase.json must point firestore.rules at the B1 ruleset');
await readFile('firestore.rules', 'utf8');

// B1 built the command frame only, so the deployed export surface was empty and
// this guard asserted exactly that. B2 filled in the first 17 of the 38 active
// callables (C-01…C-12, C-35a, C-35b, C-36, C-37, C-38 — DB-06 §1), B3 added
// inventory, transfer and private procurement (C-13, C-14, C-15, C-16, C-17,
// C-33) for 23, and B4 completes the catalog with the remaining 15 connected
// commands (C-18…C-31, C-34) for **38**.
//
// The count is asserted as an equality and never as a floor: `>= 38` would pass
// for a thirty-ninth callable that names no active command id, which is exactly
// the drift this guard exists to catch — in both directions. Comments are
// stripped first, because the file documents its own phase structure and a guard
// that trips on its own documentation is not a guard.
const code = source.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/\/\/.*$/gm, '');
const callableExports = code.match(/^export const \w+ = toCallable\(/gm) ?? [];
const EXPECTED_CALLABLE_EXPORTS = 38; // the complete Release A/B surface — B2 17 + B3 6 + B4 15
if (callableExports.length !== EXPECTED_CALLABLE_EXPORTS) {
  throw new Error(
    `Expected ${String(EXPECTED_CALLABLE_EXPORTS)} callable exports, found ${String(callableExports.length)}`,
  );
}

console.log('FUNCTIONS_CODEBASE_CONFIG=PASS');
console.log('FIRESTORE_RULES_CONFIGURED=YES');
console.log(`CALLABLE_EXPORTS=${String(callableExports.length)}`);
