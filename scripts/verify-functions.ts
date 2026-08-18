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

// B1 built the command frame only, so the deployed export surface was empty
// and this guard asserted exactly that. B2 fills in the first 17 of the 38
// active callables (C-01…C-12, C-35a, C-35b, C-36, C-37, C-38 — DB-06 §1);
// B3 (+6) and B4 (+15) complete the remaining 21. The guard now asserts the
// exact expected count per phase, so a callable added outside its owning
// phase's id set — or one silently dropped — is still caught. Comments are
// stripped first: the file documents the shape a later phase will add, and a
// guard that trips on its own documentation is not a guard.
const code = source.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/\/\/.*$/gm, '');
const callableExports = code.match(/^export const \w+ = toCallable\(/gm) ?? [];
const EXPECTED_CALLABLE_EXPORTS = 17; // B2: C-01…C-12, C-35a, C-35b, C-36, C-37, C-38
if (callableExports.length !== EXPECTED_CALLABLE_EXPORTS) {
  throw new Error(
    `Expected ${String(EXPECTED_CALLABLE_EXPORTS)} callable exports (B2), found ${String(callableExports.length)}`,
  );
}

console.log('FUNCTIONS_CODEBASE_CONFIG=PASS');
console.log('FIRESTORE_RULES_CONFIGURED=YES');
console.log(`CALLABLE_EXPORTS=${String(callableExports.length)}`);
