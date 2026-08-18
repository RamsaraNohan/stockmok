import { readFile } from 'node:fs/promises';
import { ACTIVE_QUERY_IDS } from '@stockmok/shared';
import { PRODUCT_LIST_MATRIX } from '../src/product-matrix.js';
import { QUERY_COVERAGE_REGISTRY } from '../src/registry.js';

function assertSet(label: string, actual: readonly string[], expected: readonly string[]): void {
  const left = [...new Set(actual)].sort();
  const right = [...new Set(expected)].sort();
  const missing = right.filter((value) => !left.includes(value));
  const extra = left.filter((value) => !right.includes(value));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(`${label}: missing=${missing.join(',')} extra=${extra.join(',')}`);
  }
}

const root = new URL('../../../', import.meta.url);
const db04 = await readFile(
  new URL('docs/database-final/DB_04_FINAL_QUERY_INDEX_PAGINATION_REALTIME_CONTRACT.md', root),
  'utf8',
);
const indexes = JSON.parse(await readFile(new URL('firestore.indexes.json', root), 'utf8')) as {
  readonly indexes: readonly { readonly collectionGroup: string }[];
};

const authorityStart = db04.indexOf('## 1. Public and user-scoped');
const authorityEnd = db04.indexOf('## 7. Complete index set');
const internalStart = db04.indexOf('## 8. Command-internal queries');
const internalEnd = db04.indexOf('## 9. Contract result');
if ([authorityStart, authorityEnd, internalStart, internalEnd].some((value) => value < 0)) {
  throw new Error('DB-04 query authority sections are missing');
}
const authorityText = `${db04.slice(authorityStart, authorityEnd)}\n${db04.slice(internalStart, internalEnd)}`;
const authorityIds = [
  ...new Set(Array.from(authorityText.matchAll(/\b(Q-\d{3}[a-z]?)\b/g), (match) => match[1])),
].filter(
  (value): value is string =>
    typeof value === 'string' && !['Q-011a', 'Q-021', 'Q-084', 'Q-085g'].includes(value),
);
for (const id of ['Q-086', 'Q-087', 'Q-088', 'Q-089']) authorityIds.push(id);

const registryIds = QUERY_COVERAGE_REGISTRY.map(({ queryId }) => queryId);
assertSet('DB04_TO_C2_REGISTRY', registryIds, authorityIds);
assertSet('SHARED_TO_C2_REGISTRY', registryIds, ACTIVE_QUERY_IDS);

if (QUERY_COVERAGE_REGISTRY.length !== 92 || new Set(registryIds).size !== 92) {
  throw new Error('C2 registry must contain 92 unique rows');
}
const implemented = QUERY_COVERAGE_REGISTRY.filter(({ status }) => status === 'IMPLEMENTED');
const blocked = QUERY_COVERAGE_REGISTRY.filter(
  ({ status }) => status === 'BLOCKED_PENDING_OWNER_RULING',
);
if (implemented.length !== 91 || blocked.length !== 1 || blocked[0]?.queryId !== 'Q-005') {
  throw new Error('C2 implementation accounting must be 91 implemented plus blocked Q-005');
}

const realtime = QUERY_COVERAGE_REGISTRY.filter(({ realtime }) => realtime).map(
  ({ queryId }) => queryId,
);
assertSet('REALTIME_IDS', realtime, ['Q-005', 'Q-008', 'Q-036', 'Q-042']);
if (
  QUERY_COVERAGE_REGISTRY.filter(({ realtime, status }) => realtime && status === 'IMPLEMENTED')
    .length !== 3
) {
  throw new Error('Exactly three feasible realtime reads must be implemented');
}

for (const record of QUERY_COVERAGE_REGISTRY) {
  if (record.kind === 'list') {
    if (!record.defaultLimit || !record.maxLimit || record.defaultLimit > record.maxLimit) {
      throw new Error(`${record.queryId} has malformed pagination metadata`);
    }
    if (record.maxLimit > 100) throw new Error(`${record.queryId} exceeds the hard maximum`);
  }
}

if (indexes.indexes.length !== 67)
  throw new Error('firestore.indexes.json must remain at 67 indexes');
if (PRODUCT_LIST_MATRIX.length !== 32) throw new Error('Product-list matrix must contain 32 rows');
if (
  PRODUCT_LIST_MATRIX.some(
    ({ sort, sortDirection }) => sort === 'onHand' && sortDirection !== 'desc',
  )
) {
  throw new Error('Every product-list on-hand order must be descending');
}
if (PRODUCT_LIST_MATRIX.find(({ indexId }) => indexId === 'IDX-36')?.sortDirection !== 'desc') {
  throw new Error('IDX-36 must order onHandMilli descending');
}

const activeIndexIds = new Set(
  Array.from({ length: 69 }, (_, index) => `IDX-${String(index + 1).padStart(2, '0')}`).filter(
    (id) => !['IDX-03', 'IDX-19'].includes(id),
  ),
);
for (const record of QUERY_COVERAGE_REGISTRY) {
  for (const indexId of record.indexIds) {
    if (!activeIndexIds.has(indexId)) {
      throw new Error(`${record.queryId} references undefined index ${indexId}`);
    }
  }
}

console.log('ACTIVE_QUERY_IDS=92');
console.log('ACTIVE_QUERY_IDS_ACCOUNTED_FOR=92');
console.log('ACTIVE_QUERY_IDS_IMPLEMENTED=91');
console.log('BLOCKED_QUERY_IDS=Q-005');
console.log('UNIMPLEMENTED_ACTIVE_QUERY_IDS=1');
console.log('EXTRA_QUERY_IMPLEMENTATIONS=0');
console.log('DUPLICATE_ACTIVE_QUERY_IDS=0');
console.log('UNDEFINED_ACTIVE_QUERY_IDS=0');
console.log('ACTIVE_INDEX_IDS=67');
console.log('PRODUCT_LIST_MATRIX_INDEXES=32');
console.log('REALTIME_QUERY_COUNT=4');
console.log('REALTIME_QUERIES_IMPLEMENTED=3');
console.log('C2_CONTRACT_VERIFICATION=PASS');
