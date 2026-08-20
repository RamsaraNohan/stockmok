import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRepositories } from '@/services/data/useRepositories';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/ui/shell/PageHeader';
import { Button } from '@/ui/primitives/Button';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { Input } from '@/ui/primitives/Input';
import type { PoStatus, PurchaseOrder } from '@stockmok/shared';

export function PurchaseOrderListScreen() {
  const navigate = useNavigate();
  const repositories = useRepositories();
  const { activeRole } = useWorkspace();
  const canWritePurchaseOrders =
    activeRole === 'OWNER' || activeRole === 'ADMIN' || activeRole === 'PROCUREMENT_MANAGER';
  const [status, setStatus] = useState<PoStatus>('DRAFT');
  const [supplierKind, setSupplierKind] = useState<'ALL' | 'PRIVATE' | 'CONNECTED'>('ALL');
  const [searchMode, setSearchMode] = useState<'NUMBER' | 'SUPPLIER'>('NUMBER');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: page,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['purchaseOrders', status, supplierKind, searchMode, searchQuery],
    queryFn: async () => {
      if (!repositories) return null;

      if (searchQuery.trim().length >= 2) {
        if (searchMode === 'NUMBER') {
          return repositories.procurement.searchByOrderNumber(searchQuery.trim().toUpperCase());
        } else {
          const res = await repositories.procurement.searchBySupplier(searchQuery.trim());
          if (res.status === 'NARROW_SEARCH') {
            return { items: [] as PurchaseOrder[] }; // Fallback for too short term
          }
          return res.page;
        }
      }

      if (supplierKind === 'ALL') {
        return repositories.procurement.listOrders([status]);
      } else {
        return repositories.procurement.listOrdersByKind(supplierKind, [status]);
      }
    },
    enabled: !!repositories,
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Purchase Orders"
        actions={
          canWritePurchaseOrders ? (
            <Button
              onClick={() => {
                void navigate('new');
              }}
              variant="primary"
            >
              Create Order
            </Button>
          ) : undefined
        }
      />
      <div className="p-4 md:p-8">
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            className="w-48"
          />
          <select
            className="h-10 px-3 rounded-control border border-border bg-surface text-text text-sm focus:ring-2 focus:ring-primary outline-none"
            value={searchMode}
            onChange={(e) => {
              setSearchMode(e.target.value as 'NUMBER' | 'SUPPLIER');
            }}
          >
            <option value="NUMBER">By PO Number</option>
            <option value="SUPPLIER">By Supplier</option>
          </select>
          <div className="w-px h-6 bg-border mx-2" />
          <select
            className="h-10 px-3 rounded-control border border-border bg-surface text-text text-sm focus:ring-2 focus:ring-primary outline-none"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as PoStatus);
            }}
            disabled={searchQuery.trim().length >= 2}
          >
            <option value="DRAFT">Draft</option>
            <option value="ORDERED">Ordered</option>
            <option value="PARTIALLY_RECEIVED">Partially Received</option>
            <option value="RECEIVED">Received</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select
            className="h-10 px-3 rounded-control border border-border bg-surface text-text text-sm focus:ring-2 focus:ring-primary outline-none"
            value={supplierKind}
            onChange={(e) => {
              setSupplierKind(e.target.value as 'ALL' | 'PRIVATE' | 'CONNECTED');
            }}
            disabled={searchQuery.trim().length >= 2}
          >
            <option value="ALL">All Kinds</option>
            <option value="PRIVATE">Private</option>
            <option value="CONNECTED">Connected</option>
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : isError ? (
          <ErrorState title="Failed to load orders" message={String(error)} />
        ) : !page?.items.length ? (
          <EmptyState
            title="No orders found"
            description={
              searchQuery.trim().length >= 2
                ? 'No matches found.'
                : 'Get started by creating your first purchase order.'
            }
            action={
              canWritePurchaseOrders && !searchQuery.trim().length ? (
                <Button
                  onClick={() => {
                    void navigate('new');
                  }}
                  variant="primary"
                >
                  Create Order
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="bg-surface rounded-panel border border-border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="p-4 font-medium text-text-muted text-sm">PO Number</th>
                  <th className="p-4 font-medium text-text-muted text-sm">Supplier</th>
                  <th className="p-4 font-medium text-text-muted text-sm">Status</th>
                  <th className="p-4 font-medium text-text-muted text-sm">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {page.items.map((order: PurchaseOrder) => (
                  <tr
                    key={order.purchaseOrderId}
                    className="hover:bg-background cursor-pointer transition-colors"
                    onClick={() => {
                      void navigate(order.purchaseOrderId);
                    }}
                  >
                    <td className="p-4 text-sm font-medium">{order.orderNumber || 'Draft'}</td>
                    <td className="p-4 text-sm text-text-muted">{order.counterpartyName}</td>
                    <td className="p-4 text-sm text-text-muted">{order.status}</td>
                    <td className="p-4 text-sm text-text-muted">
                      {order.totalMinor / 100} {order.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
