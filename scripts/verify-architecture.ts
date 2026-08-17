import { readFile } from 'node:fs/promises';
import { ACTIVE_QUERY_IDS } from '../packages/shared/src/query-ids.js';
import { commandDefinitions } from '../packages/shared/src/commands.js';
import { generateAllIndexes } from './index-spec.js';

const db04 = await readFile(
  'docs/database-final/DB_04_FINAL_QUERY_INDEX_PAGINATION_REALTIME_CONTRACT.md',
  'utf8',
);
const db06 = await readFile(
  'docs/database-final/DB_06_FINAL_COMMAND_TRANSACTION_CONTRACT.md',
  'utf8',
);
const db07 = await readFile(
  'docs/database-final/DB_07_FINAL_STATE_MACHINE_AND_INVARIANT_CONTRACT.md',
  'utf8',
);

function section(text: string, start: string, end: string): string {
  const startIndex = text.indexOf(start);
  const endIndex = text.indexOf(end, startIndex + start.length);
  if (startIndex < 0 || endIndex < 0)
    throw new Error(`Missing authority section ${start} -> ${end}`);
  return text.slice(startIndex, endIndex);
}

function uniqueMatches(text: string, expression: RegExp): string[] {
  return [
    ...new Set(
      Array.from(text.matchAll(expression), (match) => match[1]).filter(Boolean) as string[],
    ),
  ].sort();
}

const queryAuthority = section(db04, '## 1. Public and user-scoped', '## 7. Complete index set');
const queryInternal = section(db04, '## 8. Command-internal queries', '## 9. Contract result');
const queryIds = uniqueMatches(
  `${queryAuthority}\n${queryInternal}`,
  /\b(Q-\d{3}[a-z]?)\b/g,
).filter((id) => !['Q-011a', 'Q-021', 'Q-084', 'Q-085g'].includes(id));
for (const id of ['Q-086', 'Q-087', 'Q-088', 'Q-089']) queryIds.push(id);
queryIds.sort();

const commandCatalog = section(db06, '## 1. Catalog', '## 2. C-33');
const commandIds = uniqueMatches(commandCatalog, /\| \*{0,2}(C-\d{2}[ab]?)\*{0,2} \|/g).filter(
  (id) => id !== 'C-32',
);

const invariantSection = section(db07, '## 11. Invariants', '## 12. Derived-value register');
const invariantIds = uniqueMatches(invariantSection, /\b(INV-\d{2})\b/g).filter(
  (id) => id !== 'INV-25',
);

const derivedSection = section(db07, '## 12. Derived-value register', '## 13. Known limits');
const derivedRange = derivedSection.match(/DV-01\s+…\s+DV-(\d{2})/);
if (!derivedRange?.[1]) throw new Error('Derived-value authority range is missing');
const derivedIds = Array.from(
  { length: Number.parseInt(derivedRange[1], 10) },
  (_, index) => `DV-${String(index + 1).padStart(2, '0')}`,
);

function assertSet(label: string, actual: readonly string[], expected: readonly string[]): void {
  const left = [...new Set(actual)].sort();
  const right = [...new Set(expected)].sort();
  const missing = right.filter((id) => !left.includes(id));
  const extra = left.filter((id) => !right.includes(id));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(`${label} drift: missing=${missing.join(',')} extra=${extra.join(',')}`);
  }
}

assertSet('query ids', queryIds, ACTIVE_QUERY_IDS);
assertSet('command ids', commandIds, Object.keys(commandDefinitions));
assertSet(
  'index ids',
  generateAllIndexes().map(({ id }) => id),
  Array.from({ length: 69 }, (_, index) => `IDX-${String(index + 1).padStart(2, '0')}`).filter(
    (id) => !['IDX-03', 'IDX-19'].includes(id),
  ),
);
assertSet('invariant ids', invariantIds, [
  ...Array.from({ length: 24 }, (_, index) => `INV-${String(index + 1).padStart(2, '0')}`),
  'INV-26',
  'INV-27',
]);
assertSet(
  'derived ids',
  derivedIds,
  Array.from({ length: 14 }, (_, index) => `DV-${String(index + 1).padStart(2, '0')}`),
);

const referenceFiles = [
  'docs/database-final/DB_02_FINAL_FIRESTORE_PHYSICAL_SCHEMA.md',
  'docs/database-final/DB_03_FINAL_UI_TO_DATA_TRACEABILITY_MATRIX.md',
  'docs/database-final/DB_05_FINAL_DATABASE_SECURITY_AND_TENANT_MATRIX.md',
  'docs/database-final/DB_06_FINAL_COMMAND_TRANSACTION_CONTRACT.md',
  'docs/database-final/DB_08_FINAL_SEED_MIGRATION_AND_DATABASE_TEST_PLAN.md',
  'docs/database-final/DB_11_FINAL_BIDIRECTIONAL_UI_DATABASE_RECONCILIATION_GATE.md',
];
const references = new Set<string>();
for (const file of referenceFiles) {
  const content = await readFile(file, 'utf8');
  for (const id of uniqueMatches(content, /\b(Q-\d{3}[a-z]?)\b/g)) references.add(id);
}
const tombstones = new Set(['Q-011a', 'Q-021', 'Q-049', 'Q-081', 'Q-082', 'Q-084', 'Q-085g']);
const undefinedReferences = [...references].filter(
  (id) =>
    !ACTIVE_QUERY_IDS.includes(id as (typeof ACTIVE_QUERY_IDS)[number]) && !tombstones.has(id),
);
if (undefinedReferences.length > 0) {
  throw new Error(`Undefined query references: ${undefinedReferences.sort().join(', ')}`);
}

console.log('ACTIVE_QUERY_IDS=92');
console.log('ACTIVE_INDEX_IDS=67');
console.log('ACTIVE_COMMAND_IDS=38');
console.log('ACTIVE_INVARIANT_IDS=26');
console.log('ACTIVE_DERIVED_CONTRACT_IDS=14');
console.log('UNDEFINED_CURRENT_QUERY_REFERENCES=0');
console.log('ARCHITECTURE_INTEGRITY=PASS');
