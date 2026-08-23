import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/services/data/useRepositories';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { PageHeader } from '@/ui/shell/PageHeader';
import { Button } from '@/ui/primitives/Button';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { executeProductSetStatusCommand } from '@/services/inventory/productService';
import { OpeningBalanceDialog } from '@/features/stock/OpeningBalanceDialog';
import { StockAdjustmentDialog } from '@/features/stock/StockAdjustmentDialog';
import { StockTransferDialog } from '@/features/stock/StockTransferDialog';

export function ProductDetailScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { handle, productId } = useParams<{ handle: string; productId: string }>();
  const repositories = useRepositories();
  const { activeRole, activeOrg, activeSettings } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'overview' | 'stock' | 'movements' | 'purchaseOrders'>(
    'overview',
  );
  const [isMutatingStatus, setIsMutatingStatus] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [adjustmentDialogState, setAdjustmentDialogState] = useState<{
    isOpen: boolean;
    warehouseId: string;
    warehouseName: string;
  } | null>(null);
  const [openingBalanceDialogState, setOpeningBalanceDialogState] = useState<{
    isOpen: boolean;
    warehouseId: string;
    warehouseName: string;
  } | null>(null);

  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!repositories || !productId) return null;
      return repositories.inventory.getProduct(productId);
    },
    enabled: !!repositories && !!productId,
  });

  const { data: summary } = useQuery({
    queryKey: ['productSummary', productId],
    queryFn: async () => {
      if (!repositories || !productId) return null;
      return repositories.inventory.getSummary(productId);
    },
    enabled: !!repositories && !!productId,
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

  // Q-023 = NOT_VIEWER
  const canViewMovements = activeRole !== 'VIEWER';
  const { data: movements } = useQuery({
    queryKey: ['movements', productId],
    queryFn: async () => {
      if (!repositories || !productId) return null;
      return repositories.movements.list('Q-023', { productId });
    },
    enabled: !!repositories && !!productId && canViewMovements && activeTab === 'movements',
  });

  // Q-048 = Owner/Admin only
  const canViewAudit = activeRole === 'OWNER' || activeRole === 'ADMIN';
  const { data: auditLogs } = useQuery({
    queryKey: ['productAudit', productId],
    queryFn: async () => {
      if (!repositories || !productId) return null;
      return repositories.inventory.listProductAudit(productId);
    },
    enabled: !!repositories && !!productId && canViewAudit && activeTab === 'overview',
  });

  // Q-044 = Owner/Admin/Procurement Manager only
  const canViewPO =
    activeRole === 'OWNER' || activeRole === 'ADMIN' || activeRole === 'PROCUREMENT_MANAGER';
  const { data: mappings } = useQuery({
    queryKey: ['productMappings', productId],
    queryFn: async () => {
      if (!repositories || !productId) return null;
      return repositories.network.listProductMappings(productId);
    },
    enabled: !!repositories && !!productId && canViewPO && activeTab === 'purchaseOrders',
  });

  // Stock balances (Q-018)
  const { data: balances } = useQuery({
    queryKey: ['productBalances', productId],
    queryFn: async () => {
      if (!repositories || !productId) return null;
      return repositories.inventory.listProductBalances(productId);
    },
    enabled: !!repositories && !!productId && activeTab === 'stock',
  });

  // Ensure these variables are 'used' to avoid TS6133
  void summary;
  void auditLogs;

  const canWriteInventory =
    activeRole === 'OWNER' || activeRole === 'ADMIN' || activeRole === 'INVENTORY_MANAGER';
  const canPublishToPartners =
    activeSettings?.networkEnabled === true &&
    product?.status === 'ACTIVE' &&
    (activeRole === 'OWNER' || activeRole === 'ADMIN' || activeRole === 'PROCUREMENT_MANAGER');
  const canWriteTransfer = canWriteInventory;

  const handleToggleStatus = async () => {
    if (!product || !activeOrg?.organizationId || !productId) return;
    const newStatus = product.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    if (!window.confirm(`Are you sure you want to ${newStatus.toLowerCase()} this product?`))
      return;

    setIsMutatingStatus(true);
    try {
      await executeProductSetStatusCommand(activeOrg.organizationId, {
        productId,
        status: newStatus,
      });
      await queryClient.invalidateQueries({ queryKey: ['product', productId] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch {
      alert('Failed to change product status');
    } finally {
      setIsMutatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError || !product || !productId) {
    return (
      <div className="p-8">
        <ErrorState title="Failed to load product" message="The product could not be found." />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'stock', label: 'Stock by store room' },
    ...(canViewMovements ? ([{ id: 'movements', label: 'Movement history' }] as const) : []),
    ...(canViewPO ? ([{ id: 'purchaseOrders', label: 'Purchase orders' }] as const) : []),
  ] as const;

  const categoryName =
    categories?.items.find((c) => c.categoryId === product.categoryId)?.name || product.categoryId;

  // Zero-stock ACTIVE warehouse behavior
  const activeWarehouses = warehouses?.items.filter((w) => w.status === 'ACTIVE') || [];
  const stockRows = activeWarehouses.map((w) => {
    const bal = balances?.items.find((b) => b.warehouseId === w.warehouseId);
    return {
      warehouseId: w.warehouseId,
      warehouseName: w.name,
      onHandMilli: bal ? bal.onHandMilli : 0,
      unit: bal ? bal.unit : product.baseUnit,
      hasBalance: Boolean(bal),
    };
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={product.name}
        actions={
          <div className="flex gap-2">
            {canPublishToPartners && (
              <Button
                onClick={() => {
                  void navigate(
                    `/app/${handle ?? ''}/network/partner-catalog?productId=${encodeURIComponent(productId)}`,
                  );
                }}
                variant="secondary"
              >
                Publish to partners
              </Button>
            )}
            {canWriteInventory && (
              <Button
                onClick={() => {
                  void handleToggleStatus();
                }}
                variant="secondary"
                disabled={isMutatingStatus}
              >
                {product.status === 'ACTIVE' ? 'Archive' : 'Restore'}
              </Button>
            )}
            {canWriteInventory && (
              <Button
                onClick={() => {
                  void navigate(`/app/${handle ?? ''}/inventory/products/${productId}/edit`);
                }}
                variant="primary"
              >
                Edit
              </Button>
            )}
          </div>
        }
      />

      <div className="px-4 md:px-8 border-b border-border bg-surface">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
              }}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-8 flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="space-y-6 max-w-3xl">
            <div className="bg-surface p-6 rounded-panel border border-border shadow-sm">
              <h3 className="text-lg font-medium text-text mb-4">Details</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-text-muted">SKU</dt>
                  <dd className="font-medium">{product.internalSku}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Category</dt>
                  <dd className="font-medium">{categoryName}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Base Unit</dt>
                  <dd className="font-medium">{product.baseUnit}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Status</dt>
                  <dd className="font-medium">{product.status}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Description</dt>
                  <dd className="font-medium col-span-2">
                    {product.description || 'No description'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              {canWriteTransfer && stockRows.length > 1 && (
                <Button
                  onClick={() => {
                    setTransferDialogOpen(true);
                  }}
                  variant="secondary"
                >
                  Transfer Stock
                </Button>
              )}
            </div>
            <div className="bg-surface rounded-panel border border-border shadow-sm overflow-hidden">
              {!stockRows.length ? (
                <div className="p-12">
                  <EmptyState
                    title="No store rooms"
                    description="There are no active store rooms."
                  />
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background/50">
                      <th className="py-3 px-4 font-medium text-text-muted">Warehouse</th>
                      <th className="py-3 px-4 font-medium text-text-muted text-right">On Hand</th>
                      <th className="py-3 px-4 font-medium text-text-muted text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stockRows.map((row) => {
                      return (
                        <tr key={row.warehouseId}>
                          <td className="py-3 px-4">{row.warehouseName}</td>
                          <td className="py-3 px-4 text-right">
                            {(row.onHandMilli / 1000).toFixed(0)} {row.unit}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              {canWriteInventory && !row.hasBalance && (
                                <Button
                                  onClick={() => {
                                    setOpeningBalanceDialogState({
                                      isOpen: true,
                                      warehouseId: row.warehouseId,
                                      warehouseName: row.warehouseName,
                                    });
                                  }}
                                  variant="secondary"
                                  size="sm"
                                >
                                  Opening Balance
                                </Button>
                              )}
                              {canWriteInventory && row.hasBalance && (
                                <Button
                                  onClick={() => {
                                    setAdjustmentDialogState({
                                      isOpen: true,
                                      warehouseId: row.warehouseId,
                                      warehouseName: row.warehouseName,
                                    });
                                  }}
                                  variant="secondary"
                                  size="sm"
                                >
                                  Adjust
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'movements' && (
          <div className="bg-surface rounded-panel border border-border shadow-sm overflow-hidden">
            {!canViewMovements ? (
              <div className="p-12 text-center text-text-muted">
                You do not have permission to view movement history.
              </div>
            ) : !movements?.items.length ? (
              <div className="p-12">
                <EmptyState
                  title="No movements"
                  description="No movement history for this product."
                />
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/50">
                    <th className="py-3 px-4 font-medium text-text-muted">Date</th>
                    <th className="py-3 px-4 font-medium text-text-muted">Type</th>
                    <th className="py-3 px-4 font-medium text-text-muted text-right">Quantity</th>
                    <th className="py-3 px-4 font-medium text-text-muted text-right">
                      Balance After
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {movements.items.map((mov) => (
                    <tr key={mov.movementId}>
                      <td className="py-3 px-4">
                        {new Date(
                          (mov.effectiveAt as { seconds: number }).seconds * 1000,
                        ).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">{mov.movementType}</td>
                      <td className="py-3 px-4 text-right">
                        {(mov.signedQuantityMilli / 1000).toFixed(0)} {mov.unit}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {(mov.balanceAfterMilli / 1000).toFixed(0)} {mov.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'purchaseOrders' && (
          <div className="bg-surface rounded-panel border border-border shadow-sm overflow-hidden">
            {!canViewPO ? (
              <div className="p-12 text-center text-text-muted">
                You do not have permission to view purchase orders.
              </div>
            ) : !mappings?.items.length ? (
              <div className="p-12">
                <EmptyState
                  title="No purchase orders"
                  description="No linked suppliers or purchase orders for this product."
                />
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/50">
                    <th className="py-3 px-4 font-medium text-text-muted">Supplier</th>
                    <th className="py-3 px-4 font-medium text-text-muted">SKU</th>
                    <th className="py-3 px-4 font-medium text-text-muted">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(
                    mappings.items as Array<{
                      mappingId: string;
                      supplierDisplayNameSnapshot: string;
                      supplierPartnerSkuSnapshot: string;
                      status: string;
                    }>
                  ).map((mapping) => (
                    <tr key={mapping.mappingId}>
                      <td className="py-3 px-4">{mapping.supplierDisplayNameSnapshot}</td>
                      <td className="py-3 px-4">{mapping.supplierPartnerSkuSnapshot}</td>
                      <td className="py-3 px-4">{mapping.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {transferDialogOpen && (
        <StockTransferDialog
          isOpen={transferDialogOpen}
          onClose={() => {
            setTransferDialogOpen(false);
          }}
          productId={productId}
        />
      )}

      {adjustmentDialogState && (
        <StockAdjustmentDialog
          isOpen={adjustmentDialogState.isOpen}
          onClose={() => {
            setAdjustmentDialogState(null);
          }}
          productId={productId}
          warehouseId={adjustmentDialogState.warehouseId}
          warehouseName={adjustmentDialogState.warehouseName}
        />
      )}

      {openingBalanceDialogState && (
        <OpeningBalanceDialog
          isOpen={openingBalanceDialogState.isOpen}
          onClose={() => {
            setOpeningBalanceDialogState(null);
          }}
          productId={productId}
          warehouseId={openingBalanceDialogState.warehouseId}
          warehouseName={openingBalanceDialogState.warehouseName}
        />
      )}
    </div>
  );
}
