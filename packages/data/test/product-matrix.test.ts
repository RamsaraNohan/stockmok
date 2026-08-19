import { describe, expect, it } from 'vitest';
import { generateProductListMatrix as generateIndexMatrix } from '../../../scripts/index-spec.js';
import {
  PRODUCT_LIST_MATRIX,
  productListShape,
  type ProductListRequest,
} from '../src/product-matrix.js';

describe('product-list query matrix', () => {
  it('matches the generated 32-index authority exactly', () => {
    const implementation = PRODUCT_LIST_MATRIX.map((shape) => ({
      id: shape.indexId,
      collectionGroup: shape.collection,
      fields: [
        ...shape.equalityFields.map((fieldPath) => ({ fieldPath, order: 'ASCENDING' })),
        {
          fieldPath: shape.sortField,
          order: shape.sortDirection === 'desc' ? 'DESCENDING' : 'ASCENDING',
        },
      ],
    })).sort((left, right) => left.id.localeCompare(right.id));
    const authority = generateIndexMatrix()
      .map(({ id, collectionGroup, fields }) => ({ id, collectionGroup, fields }))
      .sort((left, right) => left.id.localeCompare(right.id));
    expect(implementation).toEqual(authority);
  });

  it('uses descending order for every on-hand and updated matrix shape', () => {
    expect(
      PRODUCT_LIST_MATRIX.filter(({ sort }) => sort === 'onHand' || sort === 'updated').every(
        ({ sortDirection }) => sortDirection === 'desc',
      ),
    ).toBe(true);
  });

  it('selects IDX-36 for the summary status/on-hand shape', () => {
    const request: ProductListRequest = {
      productStatus: 'ACTIVE',
      stockStatus: 'LOW_STOCK',
      sort: 'onHand',
    };
    expect(productListShape(request).indexId).toBe('IDX-36');
  });

  it('selects the four-filter warehouse matrix without an Included archive mode', () => {
    expect(
      productListShape({
        productStatus: 'ARCHIVED',
        warehouseId: 'warehouse-1',
        categoryId: 'category-1',
        stockStatus: 'OUT_OF_STOCK',
        sort: 'updated',
      }).indexId,
    ).toBe('IDX-67');
  });
});
