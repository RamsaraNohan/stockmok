import { readFile } from 'node:fs/promises';
import {
  generateAllIndexes,
  generateProductListMatrix,
  type FirestoreIndexField,
} from './index-spec.js';

interface IndexFile {
  indexes: unknown[];
  fieldOverrides: unknown[];
}

const generated = generateAllIndexes();
const matrix = generateProductListMatrix();
const parsed = JSON.parse(await readFile('firestore.indexes.json', 'utf8')) as IndexFile;
const db04 = await readFile(
  'docs/database-final/DB_04_FINAL_QUERY_INDEX_PAGINATION_REALTIME_CONTRACT.md',
  'utf8',
);
const ids = generated.map(({ id }) => id);
const expectedIds = Array.from(
  { length: 69 },
  (_, offset) => `IDX-${String(offset + 1).padStart(2, '0')}`,
).filter((id) => id !== 'IDX-03' && id !== 'IDX-19' && id !== 'IDX-07');

function canonical(value: unknown): string {
  return JSON.stringify(value);
}

const UPDATED_MATRIX_IDS = [
  'IDX-35',
  'IDX-42',
  'IDX-50',
  'IDX-53',
  'IDX-57',
  'IDX-60',
  'IDX-63',
  'IDX-67',
] as const;
const ON_HAND_MATRIX_IDS = [
  'IDX-36',
  'IDX-41',
  'IDX-47',
  'IDX-49',
  'IDX-56',
  'IDX-59',
  'IDX-62',
  'IDX-66',
] as const;

function authorityIndex(id: string): { collectionGroup: string; fields: FirestoreIndexField[] } {
  const row = db04
    .split(/\r?\n/)
    .find((line) => line.startsWith(`| **${id}** |`) || line.startsWith(`| ${id} |`));
  if (!row) throw new Error(`Missing DB-04 authority row for ${id}`);
  const cells = row.split('|').map((cell) => cell.trim());
  const collectionGroup = cells[2]?.replaceAll('`', '');
  const fieldContract = cells[3]?.replaceAll('`', '');
  if (!collectionGroup || !fieldContract) {
    throw new Error(`Invalid DB-04 authority row for ${id}`);
  }
  const fields = fieldContract.split(',').map((entry): FirestoreIndexField => {
    const field = entry.trim().match(/^(.+?) (ASC|DESC)$/);
    if (!field?.[1] || !field[2]) {
      throw new Error(`Invalid DB-04 field contract for ${id}: ${entry}`);
    }
    return {
      fieldPath: field[1],
      order: field[2] === 'DESC' ? 'DESCENDING' : 'ASCENDING',
    };
  });
  return { collectionGroup, fields };
}

function assertDirectionFamily(
  label: string,
  expectedIds: readonly string[],
  fieldPath: string,
  order: 'ASCENDING' | 'DESCENDING',
): void {
  const matching = matrix.filter(({ fields }) =>
    fields.some((field) => field.fieldPath === fieldPath && field.order === order),
  );
  const matchingIds = matching.map(({ id }) => id).sort();
  const expected = [...expectedIds].sort();
  if (canonical(matchingIds) !== canonical(expected)) {
    throw new Error(
      `${label} drift: expected=${expected.join(',')} actual=${matchingIds.join(',')}`,
    );
  }
}

const generatedPayload = generated.map(({ collectionGroup, queryScope, fields }) => ({
  collectionGroup,
  queryScope,
  fields,
}));

if (new Set(ids).size !== 66)
  throw new Error(`Expected 66 unique index ids, got ${String(new Set(ids).size)}`);
if (matrix.length !== 32)
  throw new Error(`Expected 32 matrix indexes, got ${String(matrix.length)}`);
if (canonical(ids) !== canonical(expectedIds)) throw new Error('Index id set does not match DB-04');
if (parsed.indexes.length !== 66)
  throw new Error(`Expected 66 JSON indexes, got ${String(parsed.indexes.length)}`);
if (canonical(parsed.indexes) !== canonical(generatedPayload)) {
  throw new Error('firestore.indexes.json is stale; run scripts/generate-indexes.ts');
}
if (parsed.fieldOverrides.length !== 0) throw new Error('Unexpected field overrides');

for (const generatedIndex of generated) {
  if (generatedIndex.fields.length < 2) {
    throw new Error(
      `${generatedIndex.id} is a single-field composite index (${generatedIndex.fields
        .map((field) => field.fieldPath)
        .join(
          ', ',
        )}); Firestore rejects composite declarations over one field because it already ` +
        "maintains that field's ASC/DESC index automatically — remove it from index-spec.ts instead",
    );
  }
}

for (const generatedIndex of matrix) {
  const authority = authorityIndex(generatedIndex.id);
  if (
    generatedIndex.collectionGroup !== authority.collectionGroup ||
    canonical(generatedIndex.fields) !== canonical(authority.fields)
  ) {
    throw new Error(
      `${generatedIndex.id} disagrees with DB-04: authority=${canonical(authority)} generated=${canonical(
        {
          collectionGroup: generatedIndex.collectionGroup,
          fields: generatedIndex.fields,
        },
      )}`,
    );
  }
}

assertDirectionFamily(
  'updated matrix direction',
  UPDATED_MATRIX_IDS,
  'productUpdatedAt',
  'DESCENDING',
);
assertDirectionFamily('on-hand matrix direction', ON_HAND_MATRIX_IDS, 'onHandMilli', 'DESCENDING');

const updatedMatrix = matrix.filter(({ fields }) =>
  fields.some((field) => field.fieldPath === 'productUpdatedAt'),
);
const onHandMatrix = matrix.filter(({ fields }) =>
  fields.some((field) => field.fieldPath === 'onHandMilli'),
);

console.log('INDEXES_EXPECTED=66');
console.log('INDEXES_IMPLEMENTED=66');
console.log('PRODUCT_LIST_MATRIX=32');
console.log('MISSING_INDEXES=0');
console.log('EXTRA_INDEXES=0');
console.log('INDEX_SET_MATCH=PASS');
console.log(`UPDATED_MATRIX_INDEXES=${String(updatedMatrix.length)}`);
console.log(
  `UPDATED_DESC_COUNT=${String(
    updatedMatrix.filter(({ fields }) =>
      fields.some(
        (field) => field.fieldPath === 'productUpdatedAt' && field.order === 'DESCENDING',
      ),
    ).length,
  )}`,
);
console.log(
  `UPDATED_ASC_COUNT=${String(
    updatedMatrix.filter(({ fields }) =>
      fields.some((field) => field.fieldPath === 'productUpdatedAt' && field.order === 'ASCENDING'),
    ).length,
  )}`,
);
console.log(`ON_HAND_MATRIX_INDEXES=${String(onHandMatrix.length)}`);
console.log(
  `ON_HAND_DESC_COUNT=${String(
    onHandMatrix.filter(({ fields }) =>
      fields.some((field) => field.fieldPath === 'onHandMilli' && field.order === 'DESCENDING'),
    ).length,
  )}`,
);
console.log('DB04_MATRIX_CONTRACT_MATCH=PASS');
