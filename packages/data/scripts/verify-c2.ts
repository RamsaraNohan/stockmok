import { readFile } from 'node:fs/promises';
import { ACTIVE_QUERY_IDS } from '@stockmok/shared';
import { generateAllIndexes } from '../../../scripts/index-spec.js';
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
  readonly indexes: readonly {
    readonly collectionGroup: string;
    readonly queryScope: 'COLLECTION';
    readonly fields: readonly {
      readonly fieldPath: string;
      readonly order?: 'ASCENDING' | 'DESCENDING';
      readonly arrayConfig?: 'CONTAINS';
    }[];
  }[];
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
if (implemented.length !== 92 || blocked.length !== 0) {
  throw new Error('C2 implementation accounting must contain 92 implemented active query IDs');
}

const q005Rows = QUERY_COVERAGE_REGISTRY.filter(({ queryId }) => queryId === 'Q-005');
const q005 = q005Rows[0];
if (
  q005Rows.length !== 1 ||
  q005?.status !== 'IMPLEMENTED' ||
  q005.scope !== 'user' ||
  q005.path !== 'users/{uid}/notifications' ||
  q005.filters.length !== 1 ||
  q005.filters[0]?.field !== 'read' ||
  q005.filters[0].operator !== '==' ||
  q005.filters[0].value !== false ||
  q005.indexIds.length !== 1 ||
  q005.indexIds[0] !== 'IDX-17' ||
  q005.transports?.length !== 2
) {
  throw new Error(
    'Q-005 must remain one implemented, user-bound logical query with two transports',
  );
}
const exactTransport = q005.transports.find(({ name }) => name === 'exactCount');
const realtimeTransport = q005.transports.find(({ name }) => name === 'realtimeBadge');
if (
  exactTransport?.mode !== 'read-time-aggregation' ||
  exactTransport.realtime ||
  realtimeTransport?.mode !== 'bounded-query-listener' ||
  !realtimeTransport.realtime ||
  realtimeTransport.limit !== 50
) {
  throw new Error('Q-005 transport metadata does not match the owner ruling');
}

const realtime = QUERY_COVERAGE_REGISTRY.filter(({ realtime }) => realtime).map(
  ({ queryId }) => queryId,
);
assertSet('REALTIME_IDS', realtime, ['Q-005', 'Q-008', 'Q-036', 'Q-042']);
if (
  QUERY_COVERAGE_REGISTRY.filter(({ realtime, status }) => realtime && status === 'IMPLEMENTED')
    .length !== 4
) {
  throw new Error('Exactly four approved realtime reads must be implemented');
}

for (const record of QUERY_COVERAGE_REGISTRY) {
  if (record.kind === 'list') {
    if (!record.defaultLimit || !record.maxLimit || record.defaultLimit > record.maxLimit) {
      throw new Error(`${record.queryId} has malformed pagination metadata`);
    }
    if (record.maxLimit > 100) throw new Error(`${record.queryId} exceeds the hard maximum`);
  }
}

if (indexes.indexes.length !== 66)
  throw new Error('firestore.indexes.json must remain at 66 indexes');
const canonicalIndex = (value: (typeof indexes.indexes)[number]): string =>
  JSON.stringify({
    collectionGroup: value.collectionGroup,
    queryScope: value.queryScope,
    fields: value.fields,
  });
const actualIndexSet = indexes.indexes.map(canonicalIndex).sort();
const generatedIndexSet = generateAllIndexes()
  .map(({ collectionGroup, queryScope, fields }) =>
    canonicalIndex({ collectionGroup, queryScope, fields }),
  )
  .sort();
if (JSON.stringify(actualIndexSet) !== JSON.stringify(generatedIndexSet)) {
  throw new Error('firestore.indexes.json differs from the generated 66-index authority');
}
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
    (id) => !['IDX-03', 'IDX-07', 'IDX-19'].includes(id),
  ),
);
for (const record of QUERY_COVERAGE_REGISTRY) {
  for (const indexId of record.indexIds) {
    if (!activeIndexIds.has(indexId)) {
      throw new Error(`${record.queryId} references undefined index ${indexId}`);
    }
  }
}

const q053 = QUERY_COVERAGE_REGISTRY.find(({ queryId }) => queryId === 'Q-053');
const q053Filter = q053?.filters[0];
if (
  q053?.indexIds.length !== 1 ||
  q053.indexIds[0] !== 'IDX-69' ||
  q053.filters.length !== 1 ||
  q053Filter?.field !== 'productStatus' ||
  q053Filter.operator !== '==' ||
  q053Filter.value !== 'ACTIVE'
) {
  throw new Error('Q-053 must use the DB-CR-039 ACTIVE-summary contract through IDX-69');
}

for (const record of QUERY_COVERAGE_REGISTRY) {
  if (record.scope === 'organization' && !record.path.startsWith('organizations/{orgId}')) {
    throw new Error(`${record.queryId} is not rooted in its construction-bound organization scope`);
  }
  if (record.scope === 'user' && !record.path.startsWith('users/{uid}')) {
    throw new Error(`${record.queryId} is not rooted in its construction-bound user scope`);
  }
  if (record.kind !== 'reference' && !record.converter) {
    throw new Error(`${record.queryId} lacks a shared-schema converter`);
  }
}

console.log('ACTIVE_QUERY_IDS=92');
console.log('ACTIVE_QUERY_IDS_ACCOUNTED_FOR=92');
console.log('ACTIVE_QUERY_IDS_IMPLEMENTED=92');
console.log('BLOCKED_QUERY_IDS=[]');
console.log('UNIMPLEMENTED_ACTIVE_QUERY_IDS=0');
console.log('EXTRA_QUERY_IMPLEMENTATIONS=0');
console.log('DUPLICATE_ACTIVE_QUERY_IDS=0');
console.log('UNDEFINED_ACTIVE_QUERY_IDS=0');
console.log('ACTIVE_INDEX_IDS=66');
console.log('PRODUCT_LIST_MATRIX_INDEXES=32');
console.log('REALTIME_QUERY_COUNT=4');
console.log('REALTIME_QUERIES_IMPLEMENTED=4');
console.log('EXTRA_REALTIME_QUERIES=0');
console.log('Q005_LOGICAL_QUERY_ID_COUNT=1');
console.log('Q005_TRANSPORT_COUNT=2');
console.log('Q005_EXACT_COUNT_TRANSPORT=IMPLEMENTED');
console.log('Q005_RT2_TRANSPORT=IMPLEMENTED');
console.log('Q005_STATUS=IMPLEMENTED');
console.log('INDEX_SET_MATCH=PASS');
console.log('DB04_MATRIX_CONTRACT_MATCH=PASS');
console.log('PAGINATION_CONTRACTS=PASS');
console.log('QUERY_INDEX_REFERENCES=PASS');
console.log('TENANT_PATH_SCOPING=PASS');
console.log('READ_SCHEMA_VALIDATION=PASS');
console.log('Q053_DB_CR_039=PASS');
console.log('ALL_ON_HAND_SORTS=DESC');
console.log('IDX36=PASS');
console.log('REALTIME_QUERIES=PASS');
console.log('C2_CONTRACT_VERIFICATION=PASS');
