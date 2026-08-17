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
if (firebase.firestore?.rules !== undefined)
  throw new Error('C1 must not configure firestore.rules');
if (/export\s+(const|function|\{\s*\w)/.test(source)) throw new Error('Callable export detected');

console.log('FUNCTIONS_CODEBASE_CONFIG=PASS');
console.log('CALLABLE_EXPORTS=0');
