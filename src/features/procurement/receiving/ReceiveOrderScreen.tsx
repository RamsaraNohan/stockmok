import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { useRepositories } from '@/services/data/useRepositories';
import { useQuery, useQueryClient, useQueries } from '@tanstack/react-query';
import { PageHeader } from '@/ui/shell/PageHeader';
import { Button } from '@/ui/primitives/Button';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Input } from '@/ui/primitives/Input';
import { executePoReceiveCommand } from '@/services/procurement/poService';

export function ReceiveOrderScreen() {
  const navigate = useNavigate();
  const { poId } = useParams<{ handle: string; poId: string }>();
  const repositories = useRepositories();
  const queryClient = useQueryClient();
  const { activeOrg } = useWorkspace();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');

  const { data: warehouses, isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses', 'ACTIVE'],
    queryFn: async () => {
      if (!repositories) return null;
      return repositories.inventory.listWarehouses('ACTIVE');
    },
    enabled: !!repositories,
  });

  const {
    data: order,
    isLoading: orderLoading,
    isError: orderError,
    error: orderErr,
  } = useQuery({
    queryKey: ['order', poId],
    queryFn: async () => {
      if (!repositories || !poId) return null;
      return repositories.procurement.getOrder(poId);
    },
    enabled: !!repositories && !!poId,
  });

  const {
    data: items,
    isLoading: itemsLoading,
    isError: itemsError,
  } = useQuery({
    queryKey: ['order-items', poId],
    queryFn: async () => {
      if (!repositories || !poId) return null;
      return repositories.procurement.listOrderItems(poId);
    },
    enabled: !!repositories && !!poId,
  });

  const productIds = useMemo(() => {
    return items?.items.map((i) => i.buyerProductId) ?? [];
  }, [items]);

  const balanceQueries = useQueries({
    queries: productIds.map((productId) => ({
      queryKey: ['balances', productId],
      queryFn: async () => {
        if (!repositories || !productId) return null;
        return repositories.inventory.listProductBalances(productId);
      },
      enabled: !!repositories && !!productId,
    })),
  });

  const effectiveWarehouseId =
    selectedWarehouseId || order?.receivingWarehouseId || warehouses?.items[0]?.warehouseId || '';

  const handleReceive = async () => {
    if (!activeOrg?.organizationId || !poId || !items || !effectiveWarehouseId) return;

    const receiveItems = items.items
      .map((item) => {
        const q = receiveQuantities[item.itemId] || 0;
        return { itemId: item.itemId, quantityMilli: q };
      })
      .filter((i) => i.quantityMilli > 0);

    if (receiveItems.length === 0) {
      setError('Please enter at least one quantity to receive.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await executePoReceiveCommand(
        activeOrg.organizationId,
        poId,
        effectiveWarehouseId,
        receiveItems,
      );
      await queryClient.invalidateQueries({ queryKey: ['order', poId] });
      await queryClient.invalidateQueries({ queryKey: ['order-items', poId] });
      await queryClient.invalidateQueries({ queryKey: ['receivingOrders'] });
      for (const pId of productIds) {
        await queryClient.invalidateQueries({ queryKey: ['balances', pId] });
      }
      void navigate(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to receive PO');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = orderLoading || itemsLoading || warehousesLoading;
  const isErr = orderError || itemsError;

  if (isLoading)
    return (
      <div className="p-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (isErr || !order)
    return <ErrorState title="Failed to load order for receiving" message={String(orderErr)} />;

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full">
      <PageHeader
        title={`Receive: ${order.orderNumber || 'Draft PO'}`}
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => {
                void navigate(-1);
              }}
              variant="secondary"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleReceive();
              }}
              variant="primary"
              disabled={isSubmitting || !effectiveWarehouseId}
            >
              Receive
            </Button>
          </div>
        }
      />

      <div className="p-4 md:p-8 space-y-6">
        {error && <div className="text-error text-sm font-medium">{error}</div>}

        <div className="bg-surface p-6 rounded-panel border border-border shadow-sm space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <label
              htmlFor="warehouse-select"
              className="text-sm font-medium text-text whitespace-nowrap"
            >
              Receiving Destination
            </label>
            <select
              id="warehouse-select"
              value={effectiveWarehouseId}
              onChange={(e) => {
                setSelectedWarehouseId(e.target.value);
              }}
              className="border border-border rounded px-3 py-2 text-sm bg-background max-w-sm w-full"
              disabled={!!order.receivingWarehouseId || warehouses?.items.length === 0}
            >
              {warehouses?.items.map((wh) => (
                <option key={wh.warehouseId} value={wh.warehouseId}>
                  {wh.name}
                </option>
              ))}
              {!warehouses?.items.length && <option value="">No active warehouses</option>}
            </select>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="p-4 font-medium text-text-muted text-sm">Product Name</th>
                <th className="p-4 font-medium text-text-muted text-sm">Current Stock</th>
                <th className="p-4 font-medium text-text-muted text-sm">Ordered</th>
                <th className="p-4 font-medium text-text-muted text-sm">Received</th>
                <th className="p-4 font-medium text-text-muted text-sm">To Receive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items?.items.map((item, index) => {
                const ordered = item.orderedBuyerBaseMilli / 1000;
                const received = item.receivedBuyerBaseMilli / 1000;
                const remaining = ordered - received;

                const balancesData = balanceQueries[index]?.data;
                const whBalance = balancesData?.items.find(
                  (b) => b.warehouseId === effectiveWarehouseId,
                );
                const currentStock = whBalance ? whBalance.onHandMilli / 1000 : 0;

                return (
                  <tr key={item.itemId} className="hover:bg-background transition-colors">
                    <td className="p-4 text-sm font-medium">
                      {item.buyerProductNameSnapshot || item.itemId}
                    </td>
                    <td className="p-4 text-sm text-text-muted">{currentStock}</td>
                    <td className="p-4 text-sm text-text-muted">{ordered}</td>
                    <td className="p-4 text-sm text-text-muted">{received}</td>
                    <td className="p-4 text-sm">
                      <Input
                        type="number"
                        min="0"
                        max={remaining > 0 ? remaining : undefined}
                        step="0.001"
                        placeholder="0"
                        value={
                          receiveQuantities[item.itemId] !== undefined
                            ? (receiveQuantities[item.itemId] as number) / 1000
                            : ''
                        }
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setReceiveQuantities({
                            ...receiveQuantities,
                            [item.itemId]: isNaN(val) ? 0 : val * 1000,
                          });
                        }}
                        className="max-w-[120px]"
                        disabled={remaining <= 0}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
