import type { LifecycleStatus, StockStatus } from '@stockmok/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useRepositories } from '@/services/data/useRepositories';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { Button } from '@/ui/primitives/Button';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { PageHeader } from '@/ui/shell/PageHeader';

type ProductSort = 'name' | 'sku' | 'onHand' | 'updated';

export function ProductListScreen() {
  const navigate = useNavigate();
  const { handle } = useParams<{ handle: string }>();
  const repositories = useRepositories();
  const { activeRole } = useWorkspace();
  const [productStatus, setProductStatus] = useState<LifecycleStatus>('ACTIVE');
  const [categoryId, setCategoryId] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [stockStatus, setStockStatus] = useState<StockStatus | ''>('');
  const [sort, setSort] = useState<ProductSort>('name');
  const [searchTerm, setSearchTerm] = useState('');

  const normalizedSearch = searchTerm.trim();
  const canWriteInventory =
    activeRole === 'OWNER' || activeRole === 'ADMIN' || activeRole === 'INVENTORY_MANAGER';

  const {
    data: page,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: [
      'products',
      productStatus,
      categoryId,
      warehouseId,
      stockStatus,
      sort,
      normalizedSearch,
    ],
    queryFn: async () => {
      if (!repositories) return null;
      if (normalizedSearch) {
        const searchField = /[0-9-]/.test(normalizedSearch)
          ? 'internalSkuNormalized'
          : 'productName';
        return repositories.inventory.searchProducts(normalizedSearch, searchField, productStatus);
      }
      type ListReq = Parameters<typeof repositories.inventory.listProducts>[0];
      const req: ListReq = {
        productStatus,
        sort,
        ...(categoryId ? { categoryId } : {}),
        ...(warehouseId ? { warehouseId } : {}),
        ...(stockStatus ? { stockStatus } : {}),
      };
      return repositories.inventory.listProducts(req);
    },
    enabled: !!repositories,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () =>
      repositories?.inventory.listCategories() ?? { items: [], nextCursor: null },
    enabled: !!repositories,
  });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => repositories?.settings.listWarehouses() ?? { items: [], nextCursor: null },
    enabled: !!repositories,
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Products"
        actions={
          canWriteInventory ? (
            <Button
              onClick={() => {
                void navigate(`/app/${handle ?? ''}/inventory/products/new`);
              }}
              variant="primary"
            >
              Create Product
            </Button>
          ) : undefined
        }
      />

      <div className="p-4 md:p-6 lg:p-8 flex-1 flex flex-col gap-6">
        <div className="grid gap-4 bg-surface p-4 rounded-panel border border-border shadow-sm md:grid-cols-2 xl:grid-cols-6">
          <div className="md:col-span-2 xl:col-span-2">
            <label
              className="block text-xs font-medium text-text-muted mb-1"
              htmlFor="product-search"
            >
              Search products
            </label>
            <input
              id="product-search"
              className="w-full h-10 px-3 rounded-control border border-border bg-surface text-text text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              placeholder="Search products by name or SKU"
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
              }}
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label
              className="block text-xs font-medium text-text-muted mb-1"
              htmlFor="filter-category"
            >
              Category
            </label>
            <select
              id="filter-category"
              className="w-full h-10 px-3 rounded-control border border-border bg-surface text-text text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              value={categoryId}
              disabled={Boolean(normalizedSearch)}
              onChange={(e) => {
                setCategoryId(e.target.value);
              }}
            >
              <option value="">All Categories</option>
              {categories?.items.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label
              className="block text-xs font-medium text-text-muted mb-1"
              htmlFor="filter-warehouse"
            >
              Store room
            </label>
            <select
              id="filter-warehouse"
              className="w-full h-10 px-3 rounded-control border border-border bg-surface text-text text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              value={warehouseId}
              disabled={Boolean(normalizedSearch)}
              onChange={(e) => {
                setWarehouseId(e.target.value);
              }}
            >
              <option value="">All Store Rooms</option>
              {warehouses?.items.map((w) => (
                <option key={w.warehouseId} value={w.warehouseId}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label
              className="block text-xs font-medium text-text-muted mb-1"
              htmlFor="filter-archived"
            >
              Archived
            </label>
            <select
              id="filter-archived"
              className="w-full h-10 px-3 rounded-control border border-border bg-surface text-text text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              value={productStatus}
              onChange={(e) => {
                setProductStatus(e.target.value as LifecycleStatus);
              }}
            >
              <option value="ACTIVE">Excluded</option>
              <option value="ARCHIVED">Only</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label
              className="block text-xs font-medium text-text-muted mb-1"
              htmlFor="filter-stock-status"
            >
              Status
            </label>
            <select
              id="filter-stock-status"
              className="w-full h-10 px-3 rounded-control border border-border bg-surface text-text text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              value={stockStatus}
              disabled={Boolean(normalizedSearch)}
              onChange={(event) => {
                setStockStatus(event.target.value as StockStatus | '');
              }}
            >
              <option value="">All</option>
              <option value="IN_STOCK">In stock</option>
              <option value="LOW_STOCK">Low stock</option>
              <option value="OUT_OF_STOCK">Out of stock</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label
              className="block text-xs font-medium text-text-muted mb-1"
              htmlFor="sort-products"
            >
              Sort
            </label>
            <select
              id="sort-products"
              className="w-full h-10 px-3 rounded-control border border-border bg-surface text-text text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              value={normalizedSearch ? 'name' : sort}
              disabled={Boolean(normalizedSearch)}
              onChange={(event) => {
                setSort(event.target.value as ProductSort);
              }}
            >
              <option value="name">Product name</option>
              <option value="sku">SKU</option>
              <option value="onHand">On hand</option>
              <option value="updated">Recently updated</option>
            </select>
          </div>
        </div>

        <div className="flex-1 bg-surface rounded-panel border border-border shadow-sm overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isError ? (
            <div className="p-8">
              <ErrorState
                title="Failed to load products"
                message={error instanceof Error ? error.message : 'An unknown error occurred'}
              />
            </div>
          ) : !page?.items.length ? (
            <div className="p-12">
              <EmptyState
                title="No products found"
                description="Try adjusting your filters or create a new product."
              />
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-border bg-background/50">
                    <th className="py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">
                      Product
                    </th>
                    <th className="py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">
                      Category
                    </th>
                    <th className="py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider text-right">
                      On hand
                    </th>
                    <th className="py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider text-right">
                      Minimum
                    </th>
                    <th className="py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider text-right">
                      Stock value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {page.items.map((product) => (
                    <tr
                      key={product.productId}
                      className="hover:bg-background/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <Link
                          to={`/app/${handle ?? ''}/inventory/products/${product.productId}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {product.productName}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-sm text-text-muted">{product.internalSku}</td>
                      <td className="py-3 px-4">
                        <span className="text-sm">
                          {categories?.items.find((c) => c.categoryId === product.categoryId)
                            ?.name || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium">
                        {(product.onHandMilli / 1000).toFixed(0)} {product.unit}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-text-muted">
                        {(product.minimumStockMilli / 1000).toFixed(0)} {product.unit}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-text-muted">
                        {((product.stockValueMinor || 0) / 100).toFixed(2)}
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
