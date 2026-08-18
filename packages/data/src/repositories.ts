import type {
  Category,
  ConnectionProjection,
  Member,
  Notification,
  Organization,
  OrganizationDirectory,
  OrganizationSettings,
  PoStatus,
  PrivatePartner,
  Product,
  ProductStockSummary,
  PurchaseOrder,
  PurchaseOrderHistory,
  PurchaseOrderItem,
  StockBalance,
  StockMovement,
  User,
  UserMembership,
  Warehouse,
} from '@stockmok/shared';
import type { Firestore, Unsubscribe } from 'firebase/firestore';
import { createReadClient, prefixBounds, type BoundReadScope } from './client.js';
import { listProductsFromMatrix, type ProductListRequest } from './product-matrix.js';
import type { PageRequest, PageResult, QueryParameters, ResolverResult } from './types.js';
import { DataReadError } from './types.js';

export interface DashboardKpis {
  readonly activeSkus: number;
  readonly lowStock: number;
  readonly outOfStock: number;
  readonly inventoryValueMinor: number;
  readonly openPurchaseOrders?: number;
  readonly awaitingReceipt?: number;
}

export interface NeedsAttentionResult {
  readonly items: readonly ProductStockSummary[];
  readonly outOfStockCount: number;
  readonly lowStockCount: number;
}

export type BoundedSearchResult<T> =
  | { readonly status: 'RESULTS'; readonly page: PageResult<T> }
  | { readonly status: 'NARROW_SEARCH'; readonly resolver: ResolverResult<unknown> };

export interface PurchaseOrderReportFilters {
  readonly supplierKind?: 'PRIVATE' | 'CONNECTED';
  readonly from?: unknown;
  readonly to?: unknown;
}

function countValue(result: Readonly<Record<string, number>>): number {
  return result.count ?? 0;
}

export function createStockmokRepositories(db: Firestore, scope: BoundReadScope) {
  const client = createReadClient(db, scope);

  return {
    public: {
      getOrganizationDirectory: (handle: string) =>
        client.get<OrganizationDirectory>('Q-001', { handle }),
    },
    shell: {
      getUser: () => client.get<User>('Q-002'),
      listMemberships: () => client.list<UserMembership>('Q-003'),
      getOrganization: () => client.get<Organization>('Q-006'),
      getSettings: () => client.get<OrganizationSettings>('Q-007'),
      getMember: () => client.get<Member>('Q-008'),
      subscribeMember: (
        onValue: (member: Member | null) => void,
        onError?: (error: unknown) => void,
      ): Unsubscribe => client.subscribe<Member>('Q-008', {}, onValue, onError),
    },
    settings: {
      getMain: () => client.get<OrganizationSettings>('Q-007'),
      listWarehouses: (status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE') =>
        client.list<Warehouse>('Q-017', { status }),
    },
    dashboard: {
      getKpis: async (includeProcurement: boolean): Promise<DashboardKpis> => {
        const [activeSkus, lowStock, outOfStock, inventoryValue] = await Promise.all([
          client.aggregate('Q-050'),
          client.aggregate('Q-051'),
          client.aggregate('Q-052'),
          client.aggregate('Q-053'),
        ]);
        if (!includeProcurement) {
          return {
            activeSkus: countValue(activeSkus),
            lowStock: countValue(lowStock),
            outOfStock: countValue(outOfStock),
            inventoryValueMinor: inventoryValue.stockValueMinor ?? 0,
          };
        }
        const [openPurchaseOrders, awaitingReceipt] = await Promise.all([
          client.aggregate('Q-054'),
          client.aggregate('Q-055'),
        ]);
        return {
          activeSkus: countValue(activeSkus),
          lowStock: countValue(lowStock),
          outOfStock: countValue(outOfStock),
          inventoryValueMinor: inventoryValue.stockValueMinor ?? 0,
          openPurchaseOrders: countValue(openPurchaseOrders),
          awaitingReceipt: countValue(awaitingReceipt),
        };
      },
      getNeedsAttention: async (): Promise<NeedsAttentionResult> => {
        const out = await client.list<ProductStockSummary>('Q-021a', {}, { limit: 5 });
        const remaining = 5 - out.items.length;
        const low =
          remaining === 0
            ? { items: [] as readonly ProductStockSummary[], nextCursor: null }
            : await client.list<ProductStockSummary>('Q-021b', {}, { limit: remaining });
        return {
          items: [...out.items, ...low.items],
          outOfStockCount: out.items.length,
          lowStockCount: low.items.length,
        };
      },
      listRecentMovements: () => client.list<StockMovement>('Q-063'),
      getInventoryByLocation: async (warehouseIds: readonly string[]) =>
        Promise.all(
          warehouseIds.map(async (warehouseId) => ({
            warehouseId,
            stockValueMinor:
              (await client.aggregate('Q-060', { warehouseId })).stockValueMinor ?? 0,
          })),
        ),
      getPendingConnections: () => client.aggregate('Q-064'),
      getConnectedOrdersAwaitingResponse: () => client.aggregate('Q-065'),
    },
    inventory: {
      listProducts: (request: ProductListRequest) => {
        if (!scope.orgId) {
          throw new DataReadError('invalid-argument', 'Product lists require a bound orgId');
        }
        return listProductsFromMatrix(db, scope.orgId, request);
      },
      searchProducts: (
        term: string,
        searchField: 'productName' | 'internalSkuNormalized',
        productStatus: 'ACTIVE' | 'ARCHIVED',
        page?: PageRequest,
      ) =>
        client.list<ProductStockSummary>(
          'Q-015',
          { searchField, productStatus, ...prefixBounds(term) },
          page,
        ),
      getProduct: (productId: string) => client.get<Product>('Q-014', { productId }),
      getSummary: (productId: string) => client.get<ProductStockSummary>('Q-020', { productId }),
      listCategories: (status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE') =>
        client.list<Category>('Q-016', { status }),
      listWarehouses: (status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE') =>
        client.list<Warehouse>('Q-017', { status }),
      listProductBalances: (productId: string) => client.list<StockBalance>('Q-018', { productId }),
      listWarehouseBalances: (warehouseId: string, page?: PageRequest) =>
        client.list<StockBalance>('Q-019', { warehouseId }, page),
      getWarehouseTotals: (warehouseId: string) => client.aggregate('Q-058', { warehouseId }),
      listProductAudit: (productId: string) => client.list('Q-048', { productId }),
    },
    movements: {
      list: (
        queryId: 'Q-022' | 'Q-023' | 'Q-024' | 'Q-025' | 'Q-026' | 'Q-027' | 'Q-028' | 'Q-029',
        parameters: QueryParameters,
        page?: PageRequest,
      ) => client.list<StockMovement>(queryId, parameters, page),
      getTransferPair: (transferId: string) => client.list<StockMovement>('Q-030', { transferId }),
      resolveProducts: (term: string, searchField: 'productName' | 'internalSkuNormalized') =>
        client.resolve<ProductStockSummary>('Q-015r', {
          searchField,
          ...prefixBounds(term),
        }),
      search: async (
        term: string,
        searchField: 'productName' | 'internalSkuNormalized',
        page?: PageRequest,
      ): Promise<BoundedSearchResult<StockMovement>> => {
        const resolver = await client.resolve<ProductStockSummary>('Q-015r', {
          searchField,
          ...prefixBounds(term),
        });
        if (resolver.overflow) return { status: 'NARROW_SEARCH', resolver };
        const productIds = resolver.matches.map(({ productId }) => productId);
        if (productIds.length === 0) {
          return { status: 'RESULTS', page: { items: [], nextCursor: null } };
        }
        return {
          status: 'RESULTS',
          page: await client.list<StockMovement>('Q-083', { productIds }, page),
        };
      },
    },
    partners: {
      listPrivate: (
        partnerType: 'SUPPLIER' | 'BUYER',
        status: 'ACTIVE' | 'DEACTIVATED' = 'ACTIVE',
        page?: PageRequest,
      ) => client.list<PrivatePartner>('Q-031', { partnerType, status }, page),
      getPrivate: (partnerId: string) => client.get<PrivatePartner>('Q-032', { partnerId }),
      listOpenOrders: (partnerId: string) => client.list<PurchaseOrder>('Q-039', { partnerId }),
      listOrderHistory: (partnerId: string) => client.list<PurchaseOrder>('Q-040', { partnerId }),
    },
    procurement: {
      listOrders: (statuses: readonly PoStatus[], page?: PageRequest) =>
        client.list<PurchaseOrder>('Q-033', { statuses }, page),
      listOrdersByKind: (
        supplierKind: 'PRIVATE' | 'CONNECTED',
        statuses: readonly PoStatus[],
        page?: PageRequest,
      ) => client.list<PurchaseOrder>('Q-034', { supplierKind, statuses }, page),
      listAwaitingReceipt: () => client.list<PurchaseOrder>('Q-035'),
      getOrder: (poId: string) => client.get<PurchaseOrder>('Q-036', { poId }),
      subscribeOrder: (
        poId: string,
        onValue: (order: PurchaseOrder | null) => void,
        onError?: (error: unknown) => void,
      ): Unsubscribe => client.subscribe<PurchaseOrder>('Q-036', { poId }, onValue, onError),
      listOrderItems: (poId: string) => client.list<PurchaseOrderItem>('Q-037', { poId }),
      listOrderHistory: (poId: string) => client.list<PurchaseOrderHistory>('Q-038', { poId }),
      searchByOrderNumber: (term: string, page?: PageRequest) =>
        client.list<PurchaseOrder>('Q-084a', prefixBounds(term), page),
      searchBySupplier: async (
        term: string,
        page?: PageRequest,
      ): Promise<BoundedSearchResult<PurchaseOrder>> => {
        const partners = await client.list<PrivatePartner>(
          'Q-031',
          { partnerType: 'SUPPLIER', status: 'ACTIVE', ...prefixBounds(term) },
          { limit: 11 },
        );
        const resolver: ResolverResult<PrivatePartner> = {
          matches: partners.items.slice(0, 10),
          overflow: partners.items.length === 11,
        };
        if (resolver.overflow) return { status: 'NARROW_SEARCH', resolver };
        const partnerIds = resolver.matches.map(({ partnerId }) => partnerId);
        if (partnerIds.length === 0) {
          return { status: 'RESULTS', page: { items: [], nextCursor: null } };
        }
        return {
          status: 'RESULTS',
          page: await client.list<PurchaseOrder>('Q-084b', { partnerIds }, page),
        };
      },
    },
    network: {
      listConnections: (statuses: readonly string[], page?: PageRequest) =>
        client.list<ConnectionProjection>('Q-041', { statuses }, page),
      getConnection: (connectionId: string) =>
        client.get<ConnectionProjection>('Q-042', { connectionId }),
      subscribeConnection: (
        connectionId: string,
        onValue: (connection: ConnectionProjection | null) => void,
        onError?: (error: unknown) => void,
      ): Unsubscribe =>
        client.subscribe<ConnectionProjection>('Q-042', { connectionId }, onValue, onError),
      listMappings: (status: 'VERIFIED' | 'DISABLED', buyerProductId?: string) =>
        client.list('Q-043', { status, buyerProductId }),
      listProductMappings: (buyerProductId: string) => client.list('Q-044', { buyerProductId }),
      listOwnCatalog: (published?: boolean, page?: PageRequest) =>
        client.list('Q-045', { published }, page),
    },
    notifications: {
      list: (
        filters: { readonly read?: boolean; readonly category?: 'STOCK' | 'ORDERS' | 'NETWORK' },
        page?: PageRequest,
      ) => client.list<Notification>('Q-004', filters, page),
    },
    team: {
      listMembers: (page?: PageRequest) => client.list<Member>('Q-009', {}, page),
      listPendingInvitations: (now: unknown, page?: PageRequest) =>
        client.list('Q-010', { now }, page),
    },
    reports: {
      listStockOnHand: (page?: PageRequest) => client.list<ProductStockSummary>('Q-061', {}, page),
      listStockOnHandByCategory: (page?: PageRequest) =>
        client.list<ProductStockSummary>('Q-061b', {}, page),
      listPurchaseOrders: (
        statuses: readonly PoStatus[] | undefined,
        filters: PurchaseOrderReportFilters,
        page?: PageRequest,
      ) => client.list<PurchaseOrder>('Q-062', { statuses, ...filters }, page),
      countStatusFamilies: async (
        families: readonly [
          readonly PoStatus[],
          readonly PoStatus[],
          readonly PoStatus[],
          readonly PoStatus[],
          readonly PoStatus[],
        ],
        filters: PurchaseOrderReportFilters,
      ) => {
        const ids = ['Q-085', 'Q-086', 'Q-087', 'Q-088', 'Q-089'] as const;
        return Promise.all(
          ids.map(async (queryId, index) => ({
            queryId,
            count: countValue(
              await client.aggregate(queryId, { statusFamily: families[index], ...filters }),
            ),
          })),
        );
      },
    },
    raw: client,
  } as const;
}

export type StockmokRepositories = ReturnType<typeof createStockmokRepositories>;
