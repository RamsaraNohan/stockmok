import { convertMilli, type PurchaseOrder, type PurchaseOrderItem } from '@stockmok/shared';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { receiveConnectedOrder } from '@/services/connected-orders/connectedOrderService';
import { useRepositories } from '@/services/data/useRepositories';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { Button } from '@/ui/primitives/Button';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Input } from '@/ui/primitives/Input';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { StatusPill } from '@/ui/primitives/StatusPill';
import { PageHeader } from '@/ui/shell/PageHeader';

interface ConnectedReceiveOrderScreenProps {
  readonly initialOrder: PurchaseOrder;
  readonly poId: string;
}

interface QuantityInputProps {
  readonly item: PurchaseOrderItem;
  readonly value: number;
  readonly disabled: boolean;
  readonly onChange: (quantityMilli: number) => void;
}

function formatMilli(value: number): string {
  return (value / 1000).toFixed(3);
}

function supplierOutstanding(item: PurchaseOrderItem): number {
  return Math.max(0, (item.orderedSupplierMilli ?? 0) - (item.receivedSupplierMilli ?? 0));
}

function QuantityInput({ item, value, disabled, onChange }: QuantityInputProps) {
  const outstanding = supplierOutstanding(item);
  const inputId = `receive-${item.itemId}`;
  return (
    <div className="space-y-1">
      <label className="sr-only" htmlFor={inputId}>
        Receive {item.supplierProductNameSnapshot ?? item.buyerProductNameSnapshot} in{' '}
        {item.supplierOrderUnitSnapshot ?? 'supplier units'}
      </label>
      <Input
        disabled={disabled || outstanding <= 0}
        id={inputId}
        max={outstanding / 1000}
        min="0"
        onChange={(event) => {
          const parsed = Number.parseFloat(event.target.value);
          onChange(Number.isFinite(parsed) ? Math.round(parsed * 1000) : 0);
        }}
        step="0.001"
        type="number"
        value={value > 0 ? value / 1000 : ''}
      />
    </div>
  );
}

export function ConnectedReceiveOrderScreen({
  initialOrder,
  poId,
}: ConnectedReceiveOrderScreenProps) {
  const navigate = useNavigate();
  const repositories = useRepositories();
  const queryClient = useQueryClient();
  const { activeMembership } = useWorkspace();
  const operationId = useRef(crypto.randomUUID());
  const [warehouseId, setWarehouseId] = useState(initialOrder.receivingWarehouseId ?? '');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderQuery = useQuery({
    queryKey: ['order', poId],
    queryFn: async () => repositories?.procurement.getOrder(poId),
    initialData: initialOrder,
    enabled: Boolean(repositories),
  });
  const itemsQuery = useQuery({
    queryKey: ['order-items', poId],
    queryFn: async () => repositories?.procurement.listOrderItems(poId),
    enabled: Boolean(repositories),
  });
  const warehousesQuery = useQuery({
    queryKey: ['warehouses', 'ACTIVE'],
    queryFn: async () => repositories?.inventory.listWarehouses('ACTIVE'),
    enabled: Boolean(repositories),
  });
  const balanceQueries = useQueries({
    queries: (itemsQuery.data?.items ?? []).map((item) => ({
      queryKey: ['balances', item.buyerProductId],
      queryFn: async () => repositories?.inventory.listProductBalances(item.buyerProductId),
      enabled: Boolean(repositories),
    })),
  });

  const order = orderQuery.data;
  const loading = itemsQuery.isLoading || warehousesQuery.isLoading;

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (
    orderQuery.isError ||
    itemsQuery.isError ||
    warehousesQuery.isError ||
    !order ||
    !itemsQuery.data
  ) {
    return (
      <ErrorState
        message="The connected order, its lines, or active warehouses could not be loaded."
        title="Connected receiving unavailable"
      />
    );
  }
  const orderItems = itemsQuery.data.items;
  const effectiveWarehouseId =
    order.receivingWarehouseId || warehouseId || warehousesQuery.data?.items[0]?.warehouseId || '';
  if (
    order.viewRole !== 'BUYER' ||
    (order.status !== 'SHIPPED' && order.status !== 'PARTIALLY_RECEIVED')
  ) {
    return (
      <ErrorState
        message="Connected receiving is available to the buyer only after the supplier ships the whole order."
        title="Order is not receivable"
      />
    );
  }

  const lines = orderItems
    .map((item) => ({ itemId: item.itemId, quantityMilli: quantities[item.itemId] ?? 0 }))
    .filter((line) => line.quantityMilli > 0);
  const invalidLine = orderItems.some(
    (item) => (quantities[item.itemId] ?? 0) > supplierOutstanding(item),
  );

  const submit = async () => {
    if (!activeMembership || !effectiveWarehouseId || lines.length === 0 || invalidLine) {
      setError(
        invalidLine
          ? 'A receive quantity exceeds the outstanding supplier-unit quantity.'
          : 'Choose a warehouse and enter at least one supplier-unit quantity.',
      );
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await receiveConnectedOrder(
        activeMembership.organizationId,
        poId,
        effectiveWarehouseId,
        lines,
        operationId.current,
      );
      operationId.current = crypto.randomUUID();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['order', poId] }),
        queryClient.invalidateQueries({ queryKey: ['order-items', poId] }),
        queryClient.invalidateQueries({ queryKey: ['order-history', poId] }),
        queryClient.invalidateQueries({ queryKey: ['receivingOrders'] }),
        ...orderItems.map((item) =>
          queryClient.invalidateQueries({ queryKey: ['balances', item.buyerProductId] }),
        ),
      ]);
      void navigate(`/app/${activeMembership.handle}/procurement/purchase-orders/${poId}`);
    } catch {
      setError('The receipt was not applied. Refresh the order and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        actions={
          <div className="flex gap-2">
            <Button
              disabled={isSubmitting}
              onClick={() => {
                void navigate(-1);
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmitting || !effectiveWarehouseId || lines.length === 0 || invalidLine}
              onClick={() => {
                void submit();
              }}
            >
              Receive selected items
            </Button>
          </div>
        }
        subtitle={`Supplier: ${order.counterpartyName} · quantities are entered in supplier order units`}
        title={`Receive ${order.orderNumber ?? 'connected order'}`}
      />

      {error && <ErrorState message={error} title="Receipt not submitted" />}

      <section className="border-border bg-surface rounded-panel space-y-4 border p-6 max-md:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill label="Connected PO" status="CONNECTED" variant="info" />
          <StatusPill status={order.status} />
        </div>
        <div>
          <label className="text-sm font-bold" htmlFor="connected-receiving-warehouse">
            Receiving warehouse
          </label>
          <select
            className="border-border bg-background mt-2 block w-full max-w-md rounded border px-3 py-2 text-sm"
            disabled={Boolean(order.receivingWarehouseId) || isSubmitting}
            id="connected-receiving-warehouse"
            onChange={(event) => {
              setWarehouseId(event.target.value);
            }}
            value={effectiveWarehouseId}
          >
            <option value="">Choose an active warehouse</option>
            {warehousesQuery.data?.items.map((warehouse) => (
              <option key={warehouse.warehouseId} value={warehouse.warehouseId}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="border-border bg-surface overflow-hidden rounded-panel border">
        <h2 className="p-4 text-lg font-bold">Receipt lines</h2>
        <div className="overflow-x-auto max-md:hidden">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="bg-background border-border border-y">
              <tr>
                <th className="p-4 text-sm">Item</th>
                <th className="p-4 text-sm">Outstanding supplier quantity</th>
                <th className="p-4 text-sm">Buyer stock now</th>
                <th className="p-4 text-sm">Receive now</th>
                <th className="p-4 text-sm">Buyer quantity after</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {orderItems.map((item, index) => {
                const quantity = quantities[item.itemId] ?? 0;
                const currentStock =
                  balanceQueries[index]?.data?.items.find(
                    (balance) => balance.warehouseId === effectiveWarehouseId,
                  )?.onHandMilli ?? 0;
                const converted = item.supplierToBuyerBaseFactorMilliSnapshot
                  ? convertMilli(quantity, item.supplierToBuyerBaseFactorMilliSnapshot)
                  : 0;
                return (
                  <tr key={item.itemId}>
                    <td className="p-4 text-sm">
                      <p className="font-bold">
                        {item.supplierProductNameSnapshot ?? item.buyerProductNameSnapshot}
                      </p>
                      <p className="text-text-muted">Buyer item: {item.buyerProductNameSnapshot}</p>
                    </td>
                    <td className="p-4 text-sm">
                      {formatMilli(supplierOutstanding(item))} {item.supplierOrderUnitSnapshot}
                    </td>
                    <td className="p-4 text-sm">
                      {formatMilli(currentStock)} {item.buyerBaseUnitSnapshot}
                    </td>
                    <td className="w-40 p-4 text-sm">
                      <QuantityInput
                        disabled={isSubmitting}
                        item={item}
                        onChange={(next) => {
                          setQuantities((current) => ({ ...current, [item.itemId]: next }));
                        }}
                        value={quantity}
                      />
                      <span className="text-text-muted mt-1 block text-xs">
                        {item.supplierOrderUnitSnapshot}
                      </span>
                    </td>
                    <td className="p-4 text-sm">
                      {formatMilli(currentStock + converted)} {item.buyerBaseUnitSnapshot}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-border divide-y md:hidden">
          {orderItems.map((item, index) => {
            const quantity = quantities[item.itemId] ?? 0;
            const currentStock =
              balanceQueries[index]?.data?.items.find(
                (balance) => balance.warehouseId === effectiveWarehouseId,
              )?.onHandMilli ?? 0;
            const converted = item.supplierToBuyerBaseFactorMilliSnapshot
              ? convertMilli(quantity, item.supplierToBuyerBaseFactorMilliSnapshot)
              : 0;
            return (
              <article className="space-y-3 p-4" key={item.itemId}>
                <h3 className="font-bold">
                  {item.supplierProductNameSnapshot ?? item.buyerProductNameSnapshot}
                </h3>
                <p className="text-sm">
                  Outstanding: {formatMilli(supplierOutstanding(item))}{' '}
                  {item.supplierOrderUnitSnapshot}
                </p>
                <QuantityInput
                  disabled={isSubmitting}
                  item={item}
                  onChange={(next) => {
                    setQuantities((current) => ({ ...current, [item.itemId]: next }));
                  }}
                  value={quantity}
                />
                <p className="text-sm">
                  Buyer stock: {formatMilli(currentStock)} →{' '}
                  <strong>{formatMilli(currentStock + converted)}</strong>{' '}
                  {item.buyerBaseUnitSnapshot}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
