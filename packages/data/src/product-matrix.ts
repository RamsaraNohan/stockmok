import {
  converters,
  type LifecycleStatus,
  type ProductStockSummary,
  type StockBalance,
  type StockStatus,
} from '@stockmok/shared';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type Firestore,
  type FirestoreDataConverter,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { PageRequest, PageResult, QueryCursor, QueryDirection } from './types.js';
import { DataReadError } from './types.js';

export type ProductListMode = 'summary' | 'warehouse';
export type ProductListFilterKey = 'none' | 'category' | 'status' | 'categoryStatus';
export type ProductListSort = 'name' | 'sku' | 'onHand' | 'updated';

export interface ProductListMatrixShape {
  readonly mode: ProductListMode;
  readonly filter: ProductListFilterKey;
  readonly sort: ProductListSort;
  readonly collection: 'productStockSummaries' | 'stockBalances';
  readonly equalityFields: readonly string[];
  readonly sortField: string;
  readonly sortDirection: QueryDirection;
  readonly indexId: string;
}

const matrixIds: Record<
  ProductListMode,
  Record<ProductListFilterKey, Record<ProductListSort, string>>
> = {
  summary: {
    none: { name: 'IDX-33', sku: 'IDX-37', onHand: 'IDX-47', updated: 'IDX-35' },
    category: { name: 'IDX-34', sku: 'IDX-48', onHand: 'IDX-49', updated: 'IDX-50' },
    status: { name: 'IDX-51', sku: 'IDX-52', onHand: 'IDX-36', updated: 'IDX-53' },
    categoryStatus: { name: 'IDX-54', sku: 'IDX-55', onHand: 'IDX-56', updated: 'IDX-57' },
  },
  warehouse: {
    none: { name: 'IDX-39', sku: 'IDX-43', onHand: 'IDX-41', updated: 'IDX-42' },
    category: { name: 'IDX-40', sku: 'IDX-58', onHand: 'IDX-59', updated: 'IDX-60' },
    status: { name: 'IDX-44', sku: 'IDX-61', onHand: 'IDX-62', updated: 'IDX-63' },
    categoryStatus: { name: 'IDX-64', sku: 'IDX-65', onHand: 'IDX-66', updated: 'IDX-67' },
  },
};

const sortFields: Record<ProductListSort, string> = {
  name: 'productName',
  sku: 'internalSkuNormalized',
  onHand: 'onHandMilli',
  updated: 'productUpdatedAt',
};

const sortDirections: Record<ProductListSort, QueryDirection> = {
  name: 'asc',
  sku: 'asc',
  onHand: 'desc',
  updated: 'desc',
};

export function generateProductListMatrix(): readonly ProductListMatrixShape[] {
  const result: ProductListMatrixShape[] = [];
  const modes: readonly ProductListMode[] = ['summary', 'warehouse'];
  const filters: readonly ProductListFilterKey[] = ['none', 'category', 'status', 'categoryStatus'];
  const sorts: readonly ProductListSort[] = ['name', 'sku', 'onHand', 'updated'];
  for (const mode of modes) {
    for (const currentFilter of filters) {
      for (const sort of sorts) {
        const equalityFields = ['productStatus'];
        if (mode === 'warehouse') equalityFields.push('warehouseId');
        if (currentFilter === 'category' || currentFilter === 'categoryStatus') {
          equalityFields.push('categoryId');
        }
        if (currentFilter === 'status' || currentFilter === 'categoryStatus') {
          equalityFields.push('stockStatus');
        }
        result.push({
          mode,
          filter: currentFilter,
          sort,
          collection: mode === 'summary' ? 'productStockSummaries' : 'stockBalances',
          equalityFields,
          sortField: sortFields[sort],
          sortDirection: sortDirections[sort],
          indexId: matrixIds[mode][currentFilter][sort],
        });
      }
    }
  }
  return result;
}

export const PRODUCT_LIST_MATRIX = generateProductListMatrix();

export interface ProductListRequest extends PageRequest {
  readonly productStatus: LifecycleStatus;
  readonly warehouseId?: string;
  readonly categoryId?: string;
  readonly stockStatus?: StockStatus;
  readonly sort: ProductListSort;
}

function filterKey(request: ProductListRequest): ProductListFilterKey {
  if (request.categoryId && request.stockStatus) return 'categoryStatus';
  if (request.categoryId) return 'category';
  if (request.stockStatus) return 'status';
  return 'none';
}

function signature(orgId: string, request: ProductListRequest): string {
  return JSON.stringify({
    orgId,
    productStatus: request.productStatus,
    warehouseId: request.warehouseId,
    categoryId: request.categoryId,
    stockStatus: request.stockStatus,
    sort: request.sort,
  });
}

function segment(value: string, label: string): string {
  if (value.length === 0 || value.includes('/')) {
    throw new DataReadError('invalid-argument', `${label} must be one non-empty path segment`);
  }
  return value;
}

export function productListShape(request: ProductListRequest): ProductListMatrixShape {
  const mode: ProductListMode = request.warehouseId ? 'warehouse' : 'summary';
  const selected = PRODUCT_LIST_MATRIX.find(
    (shape) =>
      shape.mode === mode && shape.filter === filterKey(request) && shape.sort === request.sort,
  );
  if (!selected)
    throw new DataReadError('invalid-argument', 'Unsupported product-list matrix shape');
  return selected;
}

export async function listProductsFromMatrix(
  db: Firestore,
  orgIdInput: string,
  request: ProductListRequest,
): Promise<PageResult<ProductStockSummary | StockBalance>> {
  const orgId = segment(orgIdInput, 'orgId');
  const shape = productListShape(request);
  const selectedLimit = request.limit ?? 25;
  if (!Number.isInteger(selectedLimit) || selectedLimit < 1 || selectedLimit > 100) {
    throw new DataReadError(
      'invalid-argument',
      'Product-list limit must be an integer from 1 to 100',
    );
  }
  const queryId = shape.mode === 'summary' ? 'Q-011' : 'Q-074';
  const querySignature = signature(orgId, request);
  if (
    request.cursor &&
    (request.cursor.queryId !== queryId || request.cursor.signature !== querySignature)
  ) {
    throw new DataReadError(
      'invalid-argument',
      'Product-list cursor does not match this matrix shape',
    );
  }
  const path = `organizations/${orgId}/${shape.collection}`;
  const selectedConverter = (shape.mode === 'summary'
    ? converters.productStockSummary
    : converters.stockBalance) as unknown as FirestoreDataConverter<
    ProductStockSummary | StockBalance
  >;
  const reference = collection(db, path).withConverter(selectedConverter);
  const constraints: QueryConstraint[] = [where('productStatus', '==', request.productStatus)];
  if (request.warehouseId) {
    constraints.push(where('warehouseId', '==', segment(request.warehouseId, 'warehouseId')));
  }
  if (request.categoryId) {
    constraints.push(where('categoryId', '==', segment(request.categoryId, 'categoryId')));
  }
  if (request.stockStatus) constraints.push(where('stockStatus', '==', request.stockStatus));
  constraints.push(orderBy(shape.sortField, shape.sortDirection), limit(selectedLimit));
  if (request.cursor) constraints.push(startAfter(request.cursor.snapshot));
  const snapshot = await getDocs(query(reference, ...constraints));
  const items = snapshot.docs.map((current) => current.data());
  const last: QueryDocumentSnapshot<ProductStockSummary | StockBalance> | undefined =
    snapshot.docs.at(-1);
  return {
    items,
    nextCursor:
      items.length === selectedLimit && last
        ? ({ queryId, signature: querySignature, snapshot: last } as QueryCursor<
            ProductStockSummary | StockBalance
          >)
        : null,
  };
}
