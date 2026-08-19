import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/services/data/useRepositories';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { PageHeader } from '@/ui/shell/PageHeader';
import { Button } from '@/ui/primitives/Button';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { EmptyState } from '@/ui/primitives/EmptyState';

export function ProductDetailScreen() {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const repositories = useRepositories();
  const { activeRole } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'overview' | 'stock' | 'movements' | 'purchaseOrders'>('overview');

  const { data: product, isLoading, isError } = useQuery({
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
  const canViewPO = activeRole === 'OWNER' || activeRole === 'ADMIN' || activeRole === 'PROCUREMENT_MANAGER';

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

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-10 w-48 mb-6" /><Skeleton className="h-32 w-full" /></div>;
  }
  
  if (isError || !product) {
    return <div className="p-8"><ErrorState title="Failed to load product" message="The product could not be found." /></div>;
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'stock', label: 'Stock by store room' },
    { id: 'movements', label: 'Movement history' },
    { id: 'purchaseOrders', label: 'Purchase orders' }
  ] as const;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={product.name}
        actions={
          <Button onClick={() => navigate(`/app/inventory/products/${productId}/edit`)} variant="secondary">
            Edit
          </Button>
        }
      />

      <div className="px-4 md:px-8 border-b border-border bg-surface">
        <div className="flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
                  <dt className="text-text-muted">Category ID</dt>
                  <dd className="font-medium">{product.categoryId}</dd>
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
                  <dd className="font-medium col-span-2">{product.description || 'No description'}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="bg-surface rounded-panel border border-border shadow-sm overflow-hidden">
            {!balances?.items.length ? (
              <div className="p-12"><EmptyState title="No stock" description="This product has no stock balances in any warehouse." /></div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/50">
                    <th className="py-3 px-4 font-medium text-text-muted">Warehouse</th>
                    <th className="py-3 px-4 font-medium text-text-muted text-right">On Hand</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {balances.items.map(bal => (
                    <tr key={bal.warehouseId}>
                      <td className="py-3 px-4">{bal.warehouseId}</td>
                      <td className="py-3 px-4 text-right">{(bal.onHandMilli / 1000).toFixed(0)} {bal.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'movements' && (
          <div className="bg-surface rounded-panel border border-border shadow-sm overflow-hidden">
            {!canViewMovements ? (
              <div className="p-12 text-center text-text-muted">You do not have permission to view movement history.</div>
            ) : !movements?.items.length ? (
              <div className="p-12"><EmptyState title="No movements" description="No movement history for this product." /></div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/50">
                    <th className="py-3 px-4 font-medium text-text-muted">Date</th>
                    <th className="py-3 px-4 font-medium text-text-muted">Type</th>
                    <th className="py-3 px-4 font-medium text-text-muted text-right">Quantity</th>
                    <th className="py-3 px-4 font-medium text-text-muted text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {movements.items.map(mov => (
                    <tr key={mov.movementId}>
                      <td className="py-3 px-4">
                        {mov.effectiveAt && typeof mov.effectiveAt === 'object' && 'seconds' in mov.effectiveAt 
                          ? new Date(mov.effectiveAt.seconds * 1000).toLocaleDateString()
                          : String(mov.effectiveAt)}
                      </td>
                      <td className="py-3 px-4">{mov.movementType}</td>
                      <td className="py-3 px-4 text-right">{(mov.signedQuantityMilli / 1000).toFixed(0)} {mov.unit}</td>
                      <td className="py-3 px-4 text-right">{(mov.balanceAfterMilli / 1000).toFixed(0)} {mov.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'purchaseOrders' && (
           <div className="p-12 text-center text-text-muted">
             {canViewPO ? "PO functionality will be available in the next phase." : "You do not have permission to view purchase orders."}
           </div>
        )}
      </div>
    </div>
  );
}
