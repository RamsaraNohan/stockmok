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

// B1 builds the command frame only. Callable bodies belong to B2/B3/B4, so the
// deployed export surface is still empty and this stays the guard that says so.
// Comments are stripped first: the file documents the shape B2 will add, and a
// guard that trips on its own documentation is not a guard.
const code = source.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/\/\/.*$/gm, '');
if (/export\s+(const|function|\{\s*\w)/.test(code)) throw new Error('Callable export detected');

console.log('FUNCTIONS_CODEBASE_CONFIG=PASS');
console.log('FIRESTORE_RULES_CONFIGURED=YES');
console.log('CALLABLE_EXPORTS=0');
