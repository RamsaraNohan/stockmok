export interface FirestoreIndexField {
  readonly fieldPath: string;
  readonly order?: 'ASCENDING' | 'DESCENDING';
  readonly arrayConfig?: 'CONTAINS';
}

export interface NamedFirestoreIndex {
  readonly id: string;
  readonly collectionGroup: string;
  readonly queryScope: 'COLLECTION';
  readonly fields: readonly FirestoreIndexField[];
  readonly matrix: boolean;
}

const asc = (fieldPath: string): FirestoreIndexField => ({ fieldPath, order: 'ASCENDING' });
const desc = (fieldPath: string): FirestoreIndexField => ({ fieldPath, order: 'DESCENDING' });
const array = (fieldPath: string): FirestoreIndexField => ({ fieldPath, arrayConfig: 'CONTAINS' });
const index = (
  id: string,
  collectionGroup: string,
  fields: readonly FirestoreIndexField[],
  matrix = false,
): NamedFirestoreIndex => ({ id, collectionGroup, queryScope: 'COLLECTION', fields, matrix });

export const NON_MATRIX_INDEXES = [
  index('IDX-01', 'products', [asc('status'), asc('name')]),
  index('IDX-02', 'products', [asc('status'), asc('categoryId'), asc('name')]),
  index('IDX-04', 'productStockSummaries', [asc('stockStatus'), asc('onHandMilli')]),
  index('IDX-05', 'stockMovements', [asc('productId'), desc('createdAt')]),
  index('IDX-06', 'stockMovements', [asc('warehouseId'), desc('createdAt')]),
  // IDX-07 deleted: single-field `stockMovements.createdAt DESC` — Firestore rejects a composite
  // index over one field, since it already maintains that field's ASC/DESC index automatically.
  // Q-022 and Q-063 remain served by that automatic single-field index. See DB_04 §"A3 index changes".
  index('IDX-08', 'stockBalances', [asc('warehouseId'), desc('onHandMilli')]),
  index('IDX-09', 'stockBalances', [asc('productId'), desc('onHandMilli')]),
  index('IDX-10', 'privatePartners', [array('partnerTypes'), asc('status'), asc('name')]),
  index('IDX-11', 'purchaseOrders', [asc('status'), desc('createdAt')]),
  index('IDX-12', 'purchaseOrders', [asc('supplierKind'), asc('status'), desc('createdAt')]),
  index('IDX-13', 'purchaseOrders', [asc('status'), asc('expectedDate')]),
  index('IDX-14', 'connections', [asc('status'), desc('updatedAt')]),
  index('IDX-15', 'productMappings', [asc('status'), asc('buyerProductId')]),
  index('IDX-16', 'partnerCatalog', [asc('published'), asc('partnerSkuNormalized')]),
  index('IDX-17', 'notifications', [asc('read'), desc('createdAt')]),
  index('IDX-18', 'auditLogs', [asc('entityType'), asc('entityId'), desc('createdAt')]),
  index('IDX-20', 'stockMovements', [asc('movementType'), desc('createdAt')]),
  index('IDX-21', 'stockMovements', [asc('productId'), asc('warehouseId'), desc('createdAt')]),
  index('IDX-22', 'stockMovements', [asc('productId'), asc('movementType'), desc('createdAt')]),
  index('IDX-23', 'stockMovements', [asc('warehouseId'), asc('movementType'), desc('createdAt')]),
  index('IDX-24', 'stockMovements', [
    asc('productId'),
    asc('warehouseId'),
    asc('movementType'),
    desc('createdAt'),
  ]),
  index('IDX-25', 'members', [asc('status'), asc('role')]),
  index('IDX-26', 'purchaseOrders', [asc('privateSupplierId'), asc('status'), desc('createdAt')]),
  index('IDX-27', 'invitations', [asc('status'), asc('expiresAt')]),
  index('IDX-28', 'categories', [asc('status'), asc('name')]),
  index('IDX-29', 'warehouses', [asc('status'), asc('name')]),
  index('IDX-30', 'products', [asc('status'), asc('internalSkuNormalized')]),
  index('IDX-31', 'members', [asc('status'), asc('joinedAt')]),
  index('IDX-32', 'productMappings', [
    asc('buyerProductId'),
    asc('supplierCatalogItemId'),
    asc('status'),
  ]),
  index('IDX-38', 'products', [asc('categoryId'), asc('status')]),
  index('IDX-45', 'notifications', [asc('category'), desc('createdAt')]),
  index('IDX-46', 'productStockSummaries', [
    asc('productStatus'),
    asc('stockStatus'),
    desc('shortfallMilli'),
  ]),
  index('IDX-68', 'stockBalances', [asc('warehouseId'), asc('stockValueMinor')]),
  index('IDX-69', 'productStockSummaries', [asc('productStatus'), asc('stockValueMinor')]),
] as const;

type Mode = 'summary' | 'warehouse';
type FilterKey = 'none' | 'category' | 'status' | 'categoryStatus';
type SortKey = 'name' | 'sku' | 'onHand' | 'updated';

const matrixId: Record<Mode, Record<FilterKey, Record<SortKey, string>>> = {
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

const sortField: Record<SortKey, string> = {
  name: 'productName',
  sku: 'internalSkuNormalized',
  onHand: 'onHandMilli',
  updated: 'productUpdatedAt',
};

const sortDirection: Record<SortKey, 'ASCENDING' | 'DESCENDING'> = {
  name: 'ASCENDING',
  sku: 'ASCENDING',
  onHand: 'DESCENDING',
  updated: 'DESCENDING',
};

export function generateProductListMatrix(): readonly NamedFirestoreIndex[] {
  const generated: NamedFirestoreIndex[] = [];
  const modes: readonly Mode[] = ['summary', 'warehouse'];
  const filters: readonly FilterKey[] = ['none', 'category', 'status', 'categoryStatus'];
  const sorts: readonly SortKey[] = ['name', 'sku', 'onHand', 'updated'];

  for (const mode of modes) {
    for (const filter of filters) {
      for (const sort of sorts) {
        const fields: FirestoreIndexField[] = [asc('productStatus')];
        if (mode === 'warehouse') fields.push(asc('warehouseId'));
        if (filter === 'category' || filter === 'categoryStatus') fields.push(asc('categoryId'));
        if (filter === 'status' || filter === 'categoryStatus') fields.push(asc('stockStatus'));
        const id = matrixId[mode][filter][sort];
        fields.push(
          sortDirection[sort] === 'DESCENDING' ? desc(sortField[sort]) : asc(sortField[sort]),
        );
        generated.push(
          index(id, mode === 'summary' ? 'productStockSummaries' : 'stockBalances', fields, true),
        );
      }
    }
  }
  return generated;
}

export function generateAllIndexes(): readonly NamedFirestoreIndex[] {
  return [...NON_MATRIX_INDEXES, ...generateProductListMatrix()].sort((left, right) =>
    left.id.localeCompare(right.id, undefined, { numeric: true }),
  );
}
