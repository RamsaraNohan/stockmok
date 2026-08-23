import type { PageRequest, PageResult, QueryCursor, StockmokRepositories } from '@stockmok/data';
import type {
  Category,
  PoStatus,
  ProductStockSummary,
  PurchaseOrder,
  StockBalance,
  SupplierKind,
  Warehouse,
} from '@stockmok/shared';

export type StockReportRow = ProductStockSummary | StockBalance;

export interface StockReportFilters {
  readonly warehouseId?: string;
  readonly categoryId?: string;
}

export interface StockReportFilterOptions {
  readonly categories: readonly Category[];
  readonly warehouses: readonly Warehouse[];
}

export interface StockReportGroup {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly rows: readonly StockReportRow[];
  readonly stockValueMinor: number;
}

type ReportRepositories = Pick<StockmokRepositories, 'inventory' | 'reports' | 'raw'>;

export type PurchaseOrderStatusFamily = 'DRAFT' | 'PENDING' | 'ACTIVE' | 'COMPLETE' | 'CANCELLED';

export interface PurchaseOrderReportFilters {
  readonly statusFamily?: PurchaseOrderStatusFamily;
  readonly supplierKind?: SupplierKind;
  readonly from?: unknown;
  readonly to?: unknown;
}

export function purchaseOrderDateFilters(
  fromDate?: string,
  toDate?: string,
): Pick<PurchaseOrderReportFilters, 'from' | 'to'> {
  const parseDate = (value: string, endOfDay: boolean): Date => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(
      year ?? 0,
      (month ?? 1) - 1,
      day ?? 1,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0,
    );
  };

  return {
    ...(fromDate ? { from: parseDate(fromDate, false) } : {}),
    ...(toDate ? { to: parseDate(toDate, true) } : {}),
  };
}

export interface PurchaseOrderStatusFamilyDefinition {
  readonly key: PurchaseOrderStatusFamily;
  readonly label: string;
  readonly statuses: readonly PoStatus[];
  readonly queryId: 'Q-085' | 'Q-086' | 'Q-087' | 'Q-088' | 'Q-089';
}

export interface PurchaseOrderStatusCount extends PurchaseOrderStatusFamilyDefinition {
  readonly count: number;
}

export const PURCHASE_ORDER_STATUS_FAMILIES = [
  { key: 'DRAFT', label: 'Draft', statuses: ['DRAFT'], queryId: 'Q-085' },
  {
    key: 'PENDING',
    label: 'Pending',
    statuses: ['ORDERED', 'SUBMITTED'],
    queryId: 'Q-086',
  },
  {
    key: 'ACTIVE',
    label: 'Active',
    statuses: ['ACCEPTED', 'SHIPPED', 'PARTIALLY_RECEIVED'],
    queryId: 'Q-087',
  },
  { key: 'COMPLETE', label: 'Complete', statuses: ['RECEIVED'], queryId: 'Q-088' },
  {
    key: 'CANCELLED',
    label: 'Cancelled',
    statuses: ['REJECTED', 'CANCELLED'],
    queryId: 'Q-089',
  },
] as const satisfies readonly PurchaseOrderStatusFamilyDefinition[];

export async function loadStockReportFilterOptions(
  repositories: ReportRepositories,
): Promise<StockReportFilterOptions> {
  const [categories, warehouses] = await Promise.all([
    repositories.inventory.listCategories('ACTIVE'),
    repositories.inventory.listWarehouses('ACTIVE'),
  ]);

  return { categories: categories.items, warehouses: warehouses.items };
}

/**
 * Reads one bounded report page through the frozen C2 repository methods.
 * The category-only mode uses Q-061b so rows arrive in category order; its
 * bounded result is narrowed locally because Q-061b has no category predicate.
 */
export async function loadStockOnHandPage(
  repositories: ReportRepositories,
  filters: StockReportFilters,
  page: PageRequest = { limit: 25 },
): Promise<PageResult<StockReportRow>> {
  if (filters.warehouseId) {
    return repositories.inventory.listProducts({
      productStatus: 'ACTIVE',
      warehouseId: filters.warehouseId,
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      sort: 'name',
      ...page,
    });
  }

  if (filters.categoryId) {
    const result = await repositories.reports.listStockOnHandByCategory(page);
    return {
      items: result.items.filter(({ categoryId }) => categoryId === filters.categoryId),
      nextCursor: result.nextCursor,
    };
  }

  return repositories.reports.listStockOnHand(page);
}

export function groupStockReportRows(
  rows: readonly StockReportRow[],
  categories: readonly Category[],
): readonly StockReportGroup[] {
  const categoryNames = new Map(categories.map(({ categoryId, name }) => [categoryId, name]));
  const groups = new Map<string, StockReportRow[]>();

  for (const row of rows) {
    const existing = groups.get(row.categoryId);
    if (existing) existing.push(row);
    else groups.set(row.categoryId, [row]);
  }

  return [...groups.entries()]
    .map(([categoryId, groupedRows]) => ({
      categoryId,
      categoryName: categoryNames.get(categoryId) ?? 'Unknown category',
      rows: groupedRows,
      stockValueMinor: groupedRows.reduce((total, row) => total + row.stockValueMinor, 0),
    }))
    .sort((left, right) => left.categoryName.localeCompare(right.categoryName));
}

function csvCell(value: string | number): string {
  const serialized = String(value);
  return /[",\r\n]/.test(serialized) ? `"${serialized.replaceAll('"', '""')}"` : serialized;
}

export function buildStockReportCsv(
  rows: readonly StockReportRow[],
  categories: readonly Category[],
): string {
  const categoryNames = new Map(categories.map(({ categoryId, name }) => [categoryId, name]));
  const header = ['Product', 'SKU', 'Category', 'On hand', 'Unit cost', 'Stock value'];
  const records = rows.map((row) => [
    row.productName,
    row.internalSku,
    categoryNames.get(row.categoryId) ?? 'Unknown category',
    `${(row.onHandMilli / 1000).toFixed(3)} ${row.unit}`,
    (row.baseUnitPriceMinor / 100).toFixed(2),
    (row.stockValueMinor / 100).toFixed(2),
  ]);

  return [header, ...records].map((record) => record.map(csvCell).join(',')).join('\r\n');
}

function purchaseOrderRepositoryFilters(filters: PurchaseOrderReportFilters) {
  return {
    ...(filters.supplierKind ? { supplierKind: filters.supplierKind } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
  };
}

export function statusesForPurchaseOrderReport(
  statusFamily?: PurchaseOrderStatusFamily,
): readonly PoStatus[] | undefined {
  return statusFamily
    ? PURCHASE_ORDER_STATUS_FAMILIES.find(({ key }) => key === statusFamily)?.statuses
    : undefined;
}

export async function loadPurchaseOrderReportPage(
  repositories: ReportRepositories,
  filters: PurchaseOrderReportFilters,
  page: PageRequest = { limit: 25 },
): Promise<PageResult<PurchaseOrder>> {
  return repositories.reports.listPurchaseOrders(
    statusesForPurchaseOrderReport(filters.statusFamily),
    purchaseOrderRepositoryFilters(filters),
    page,
  );
}

/**
 * Q-085..Q-089 provide the complete filtered distribution. When one family is
 * selected, the other four counts are mathematically zero; only the selected
 * aggregation is issued so Firestore never receives an invalid empty `in` list.
 */
export async function loadPurchaseOrderStatusCounts(
  repositories: ReportRepositories,
  filters: PurchaseOrderReportFilters,
): Promise<readonly PurchaseOrderStatusCount[]> {
  const repositoryFilters = purchaseOrderRepositoryFilters(filters);

  if (filters.statusFamily) {
    const selected = PURCHASE_ORDER_STATUS_FAMILIES.find(({ key }) => key === filters.statusFamily);
    if (!selected) return [];

    const result = await repositories.raw.aggregate(selected.queryId, {
      statusFamily: selected.statuses,
      ...repositoryFilters,
    });

    return PURCHASE_ORDER_STATUS_FAMILIES.map((family) => ({
      ...family,
      count: family.key === selected.key ? (result.count ?? 0) : 0,
    }));
  }

  const counts = await repositories.reports.countStatusFamilies(
    PURCHASE_ORDER_STATUS_FAMILIES.map(({ statuses }) => statuses) as unknown as readonly [
      readonly PoStatus[],
      readonly PoStatus[],
      readonly PoStatus[],
      readonly PoStatus[],
      readonly PoStatus[],
    ],
    repositoryFilters,
  );

  return PURCHASE_ORDER_STATUS_FAMILIES.map((family, index) => ({
    ...family,
    count: counts[index]?.count ?? 0,
  }));
}

export function buildPurchaseOrderReportCsv(rows: readonly PurchaseOrder[]): string {
  const header = [
    'PO Number',
    'Counterparty',
    'Kind',
    'Status',
    'Total',
    'Currency',
    'Created',
    'Expected',
  ];
  const records = rows.map((row) => [
    row.orderNumber ?? row.purchaseOrderId,
    row.counterpartyName,
    row.supplierKind === 'CONNECTED' ? 'Connected' : 'Private',
    row.status,
    (row.totalMinor / 100).toFixed(2),
    row.currency,
    row.createdAt.toDate().toISOString(),
    row.expectedDate?.toDate().toISOString() ?? '',
  ]);

  return [header, ...records].map((record) => record.map(csvCell).join(',')).join('\r\n');
}

export function describePurchaseOrderReportFilters(filters: PurchaseOrderReportFilters): string {
  const status = filters.statusFamily
    ? PURCHASE_ORDER_STATUS_FAMILIES.find(({ key }) => key === filters.statusFamily)?.label
    : 'All statuses';
  const kind =
    filters.supplierKind === 'CONNECTED'
      ? 'Connected'
      : filters.supplierKind === 'PRIVATE'
        ? 'Private'
        : 'All kinds';
  const from = filters.from ? 'From date set' : 'Any start date';
  const to = filters.to ? 'To date set' : 'Any end date';
  return `${status ?? 'All statuses'} · ${kind} · ${from} · ${to}`;
}

export type StockReportCursor = QueryCursor<StockReportRow>;
