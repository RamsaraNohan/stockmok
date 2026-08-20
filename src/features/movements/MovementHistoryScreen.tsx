import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/services/data/useRepositories';
import { PageHeader } from '@/ui/shell/PageHeader';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { StatusPill } from '@/ui/primitives/StatusPill';
import { Input } from '@/ui/primitives/Input';
import type { MovementType } from '@stockmok/shared';

type QueryId = 'Q-022' | 'Q-023' | 'Q-024' | 'Q-025' | 'Q-026' | 'Q-027' | 'Q-028' | 'Q-029';

export function MovementHistoryScreen() {
  const repositories = useRepositories();
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [movementType, setMovementType] = useState<MovementType | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const normalizedSearch = searchTerm.trim();

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      type ListReq = Parameters<NonNullable<typeof repositories>['inventory']['listProducts']>[0];
      const req: ListReq = { productStatus: 'ACTIVE', sort: 'name' };
      return repositories?.inventory.listProducts(req) ?? { items: [], nextCursor: null };
    },
    enabled: !!repositories,
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => repositories?.settings.listWarehouses() ?? { items: [], nextCursor: null },
    enabled: !!repositories,
  });

  const {
    data: page,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['movements', productId, warehouseId, movementType, normalizedSearch],
    queryFn: async () => {
      if (!repositories) return null;
      if (normalizedSearch.length >= 2) {
        const searchField = /[0-9-]/.test(normalizedSearch)
          ? 'internalSkuNormalized'
          : 'productName';
        const result = await repositories.movements.search(normalizedSearch, searchField);
        if (result.status === 'NARROW_SEARCH') {
          return { items: [], nextCursor: null, narrowSearch: true };
        }
        return { ...result.page, narrowSearch: false };
      }

      let q: QueryId = 'Q-022';
      const p = !!productId;
      const w = !!warehouseId;
      const m = !!movementType;
      if (p && !w && !m) q = 'Q-023';
      else if (!p && w && !m) q = 'Q-024';
      else if (!p && !w && m) q = 'Q-025';
      else if (p && w && !m) q = 'Q-026';
      else if (p && !w && m) q = 'Q-027';
      else if (!p && w && m) q = 'Q-028';
      else if (p && w && m) q = 'Q-029';

      const params: Record<string, unknown> = {};
      if (p) params.productId = productId;
      if (w) params.warehouseId = warehouseId;
      if (m) params.movementTypes = [movementType];

      const result = await repositories.movements.list(q, params);
      return { ...result, narrowSearch: false };
    },
    enabled: !!repositories,
  });

  const movementTypes: { value: MovementType; label: string }[] = [
    { value: 'OPENING_BALANCE', label: 'Opening Balance' },
    { value: 'ADJUSTMENT_IN', label: 'Adjustment In' },
    { value: 'ADJUSTMENT_OUT', label: 'Adjustment Out' },
    { value: 'PURCHASE_RECEIPT', label: 'Purchase Receipt' },
    { value: 'CONNECTED_DISPATCH_OUT', label: 'Connected Dispatch Out' },
    { value: 'TRANSFER_IN', label: 'Transfer In' },
    { value: 'TRANSFER_OUT', label: 'Transfer Out' },
  ];

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Movement History" />
      <div className="p-4 md:p-6 lg:p-8 flex-1 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:flex-wrap gap-4 bg-surface p-4 rounded-panel border border-border shadow-sm">
          <div className="flex-1 min-w-[200px]">
            <label
              htmlFor="movement-search"
              className="block text-xs font-medium text-text-muted mb-1"
            >
              Search
            </label>
            <Input
              id="movement-search"
              placeholder="Search product or SKU"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
              }}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label
              htmlFor="filter-product"
              className="block text-xs font-medium text-text-muted mb-1"
            >
              Product
            </label>
            <select
              id="filter-product"
              className="w-full h-10 px-3 rounded-control border border-border bg-surface text-text text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              value={productId}
              disabled={normalizedSearch.length >= 2}
              onChange={(e) => {
                setProductId(e.target.value);
              }}
            >
              <option value="">All Products</option>
              {productsData?.items.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.productName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label
              htmlFor="filter-warehouse"
              className="block text-xs font-medium text-text-muted mb-1"
            >
              Store Room
            </label>
            <select
              id="filter-warehouse"
              className="w-full h-10 px-3 rounded-control border border-border bg-surface text-text text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              value={warehouseId}
              disabled={normalizedSearch.length >= 2}
              onChange={(e) => {
                setWarehouseId(e.target.value);
              }}
            >
              <option value="">All Store Rooms</option>
              {warehousesData?.items.map((w) => (
                <option key={w.warehouseId} value={w.warehouseId}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label
              htmlFor="filter-movement-type"
              className="block text-xs font-medium text-text-muted mb-1"
            >
              Movement Type
            </label>
            <select
              id="filter-movement-type"
              className="w-full h-10 px-3 rounded-control border border-border bg-surface text-text text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              value={movementType}
              disabled={normalizedSearch.length >= 2}
              onChange={(e) => {
                setMovementType(e.target.value as MovementType | '');
              }}
            >
              <option value="">All Types</option>
              {movementTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 bg-surface rounded-panel border border-border shadow-sm overflow-hidden flex flex-col">
          {isLoading && (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {isError && (
            <div className="p-6">
              <ErrorState
                title="Could not load movements"
                message={error instanceof Error ? error.message : 'Unknown error'}
              />
            </div>
          )}
          {!isLoading && !isError && page && page.items.length === 0 && (
            <div className="flex-1 flex items-center justify-center p-12">
              <EmptyState
                title="No movements found"
                description={
                  page.narrowSearch
                    ? 'Narrow the product search to ten or fewer matches.'
                    : 'Adjust your filters to see results.'
                }
              />
            </div>
          )}
          {!isLoading && !isError && page && page.items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/50">
                    <th className="py-3 px-4 font-medium text-text-muted">Date</th>
                    <th className="py-3 px-4 font-medium text-text-muted">Type</th>
                    <th className="py-3 px-4 font-medium text-text-muted">Product</th>
                    <th className="py-3 px-4 font-medium text-text-muted">Store Room</th>
                    <th className="py-3 px-4 font-medium text-text-muted text-right">Quantity</th>
                    <th className="py-3 px-4 font-medium text-text-muted">Actor / Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {page.items.map((m) => (
                    <tr key={m.movementId} className="hover:bg-background/50 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatDate(m.effectiveAt.toDate())}
                      </td>
                      <td className="py-3 px-4">
                        <StatusPill
                          status={m.movementType}
                          label={m.movementType.replace(/_/g, ' ')}
                          variant="neutral"
                        />
                      </td>
                      <td className="py-3 px-4">{m.productNameSnapshot}</td>
                      <td className="py-3 px-4">{m.warehouseNameSnapshot}</td>
                      <td className="py-3 px-4 text-right tabular-nums font-medium">
                        <span
                          className={
                            m.signedQuantityMilli > 0
                              ? 'text-success'
                              : m.signedQuantityMilli < 0
                                ? 'text-destructive'
                                : ''
                          }
                        >
                          {m.signedQuantityMilli > 0 ? '+' : ''}
                          {m.signedQuantityMilli / 1000} {m.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>{m.actorName}</div>
                        {(m.sourceReferenceSnapshot || m.adjustmentReason) && (
                          <div className="text-xs text-text-muted mt-0.5">
                            {m.adjustmentReason?.replace(/_/g, ' ') ?? m.sourceReferenceSnapshot}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
