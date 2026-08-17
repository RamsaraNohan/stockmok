import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { generateAllIndexes } from './index-spec.js';

const output = {
  indexes: generateAllIndexes().map(({ collectionGroup, queryScope, fields }) => ({
    collectionGroup,
    queryScope,
    fields,
  })),
  fieldOverrides: [],
};

await writeFile(resolve('firestore.indexes.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
