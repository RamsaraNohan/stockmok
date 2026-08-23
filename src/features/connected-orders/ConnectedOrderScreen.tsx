import type { PurchaseOrder } from '@stockmok/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  connectedActionAvailability,
  cancelConnectedOrder,
  connectedLineQuantities,
  connectedOrderSide,
  respondToConnectedOrder,
  saveConnectedDraftHeader,
  shipConnectedOrder,
  submitConnectedOrder,
} from '@/services/connected-orders/connectedOrderService';
import { useConnectedOrderReadModel } from '@/services/connected-orders/useConnectedOrderReadModel';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { Button } from '@/ui/primitives/Button';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { StatusPill } from '@/ui/primitives/StatusPill';
import { PageHeader } from '@/ui/shell/PageHeader';

interface ConnectedOrderScreenProps {
  readonly poId: string;
  readonly initialOrder: PurchaseOrder;
}

function milli(value: number): string {
  return (value / 1000).toFixed(3);
}

export function ConnectedOrderScreen({ poId, initialOrder }: ConnectedOrderScreenProps) {
  const { activeMembership, activeRole } = useWorkspace();
  const queryClient = useQueryClient();
  const { orderQuery, itemsQuery, historyQuery } = useConnectedOrderReadModel(poId, initialOrder);
  const submitOperationId = useRef(crypto.randomUUID());
  const responseOperationId = useRef(crypto.randomUUID());
  const shipOperationId = useRef(crypto.randomUUID());
  const [activeAction, setActiveAction] = useState<
    'SAVE' | 'SUBMIT' | 'CANCEL' | 'ACCEPT' | 'REJECT' | 'SHIP' | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (orderQuery.isLoading || itemsQuery.isLoading || historyQuery.isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }
  if (orderQuery.isError || itemsQuery.isError || historyQuery.isError || !orderQuery.data) {
    return (
      <ErrorState
        message="Connected order data could not be loaded. No transition has been attempted."
        title="Connected order unavailable"
      />
    );
  }

  const order = orderQuery.data;
  const side = connectedOrderSide(order);
  const actions = connectedActionAvailability(side, order.status, activeRole);
  const hasPersistedLines = Boolean(itemsQuery.data?.items.length);

  const refreshOrder = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['order', poId] }),
      queryClient.invalidateQueries({ queryKey: ['order-items', poId] }),
      queryClient.invalidateQueries({ queryKey: ['order-history', poId] }),
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] }),
    ]);
  };

  const runBuyerAction = async (action: 'SAVE' | 'SUBMIT' | 'CANCEL') => {
    if (!activeMembership || !order.connectionId) return;
    setActiveAction(action);
    setActionError(null);
    setActionSuccess(null);
    try {
      if (action === 'SAVE') {
        await saveConnectedDraftHeader(
          activeMembership.organizationId,
          order.purchaseOrderId,
          order.connectionId,
        );
        setActionSuccess('Connected draft header saved.');
      } else if (action === 'SUBMIT') {
        await submitConnectedOrder(
          activeMembership.organizationId,
          order.purchaseOrderId,
          submitOperationId.current,
        );
        submitOperationId.current = crypto.randomUUID();
        setActionSuccess('Connected purchase order submitted.');
      } else {
        await cancelConnectedOrder(activeMembership.organizationId, order.purchaseOrderId);
        setActionSuccess('Connected purchase order cancelled.');
      }
      await refreshOrder();
    } catch {
      setActionError('The connected order changed or the action failed. Refresh and try again.');
    } finally {
      setActiveAction(null);
    }
  };

  const runSupplierAction = async (action: 'ACCEPT' | 'REJECT' | 'SHIP') => {
    if (!activeMembership) return;
    const confirmed = window.confirm(
      action === 'ACCEPT'
        ? `Accept purchase order ${order.orderNumber ?? order.purchaseOrderId}?`
        : action === 'REJECT'
          ? `Reject purchase order ${order.orderNumber ?? order.purchaseOrderId}?`
          : `Mark purchase order ${order.orderNumber ?? order.purchaseOrderId} as shipped? The whole order will ship once.`,
    );
    if (!confirmed) return;

    setActiveAction(action);
    setActionError(null);
    setActionSuccess(null);
    try {
      if (action === 'SHIP') {
        await shipConnectedOrder(
          activeMembership.organizationId,
          order.purchaseOrderId,
          shipOperationId.current,
        );
        shipOperationId.current = crypto.randomUUID();
        setActionSuccess('Connected purchase order marked as shipped.');
      } else {
        await respondToConnectedOrder(
          activeMembership.organizationId,
          order.purchaseOrderId,
          action,
          responseOperationId.current,
        );
        responseOperationId.current = crypto.randomUUID();
        setActionSuccess(
          action === 'ACCEPT'
            ? 'Connected purchase order accepted.'
            : 'Connected purchase order rejected.',
        );
      }
      await refreshOrder();
    } catch {
      setActionError('The connected order changed or the action failed. Refresh and try again.');
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        actions={
          actions.buyerSubmit || actions.buyerCancel ? (
            <div className="flex flex-wrap gap-2">
              {actions.buyerSubmit && (
                <>
                  <Button
                    disabled={activeAction !== null}
                    onClick={() => {
                      void runBuyerAction('SAVE');
                    }}
                    variant="outline"
                  >
                    Save draft
                  </Button>
                  <Button
                    disabled={activeAction !== null || !hasPersistedLines}
                    onClick={() => {
                      void runBuyerAction('SUBMIT');
                    }}
                  >
                    Submit order
                  </Button>
                </>
              )}
              {actions.buyerCancel && (
                <Button
                  disabled={activeAction !== null}
                  onClick={() => {
                    void runBuyerAction('CANCEL');
                  }}
                  variant="danger"
                >
                  Cancel order
                </Button>
              )}
            </div>
          ) : actions.supplierRespond ? (
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={activeAction !== null}
                onClick={() => {
                  void runSupplierAction('ACCEPT');
                }}
              >
                Accept order
              </Button>
              <Button
                disabled={activeAction !== null}
                onClick={() => {
                  void runSupplierAction('REJECT');
                }}
                variant="danger"
              >
                Reject order
              </Button>
            </div>
          ) : actions.supplierShip ? (
            <Button
              disabled={activeAction !== null}
              onClick={() => {
                void runSupplierAction('SHIP');
              }}
            >
              Mark as shipped
            </Button>
          ) : actions.receive ? (
            <Link to={`../../receiving/${poId}`}>
              <Button>Receive shipment</Button>
            </Link>
          ) : undefined
        }
        subtitle={`${side === 'BUYER' ? 'Buyer' : 'Supplier'} projection · @${order.counterpartyHandle ?? 'connected-business'}`}
        title={order.orderNumber ?? 'Connected purchase order'}
      />

      {actionError && <ErrorState message={actionError} title="Connected order action failed" />}
      {actionSuccess && (
        <p
          aria-live="polite"
          className="rounded-lg bg-green-50 p-3 text-sm font-bold text-green-800"
        >
          {actionSuccess}
        </p>
      )}

      {side === 'BUYER' && order.status === 'DRAFT' && import.meta.env.DEV && (
        <aside
          className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
          role="status"
        >
          Connected draft line editing is unavailable until its owner-approved intent contract
          exists. Existing authoritative lines remain read-only; no success is simulated.
        </aside>
      )}

      <section className="border-border bg-surface space-y-4 rounded-panel border p-6 max-md:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill label="Connected" status="CONNECTED" variant="info" />
          <StatusPill status={order.status} />
        </div>
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-text-muted">Counterparty</dt>
            <dd className="font-bold">{order.counterpartyName}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Projection</dt>
            <dd className="font-bold">{side}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Total</dt>
            <dd className="font-bold">
              {(order.totalMinor / 100).toFixed(2)} {order.currency}
            </dd>
          </div>
        </dl>
      </section>

      <section className="border-border bg-surface overflow-hidden rounded-panel border">
        <h2 className="p-4 text-lg font-bold">Connected line quantities</h2>
        <table className="w-full border-collapse text-left max-md:hidden">
          <thead className="bg-background border-border border-y">
            <tr>
              <th className="p-4 text-sm">Item</th>
              <th className="p-4 text-sm">Supplier quantity</th>
              <th className="p-4 text-sm">Buyer quantity</th>
              <th className="p-4 text-sm">Outstanding</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {itemsQuery.data?.items.map((item) => {
              const quantities = connectedLineQuantities(item);
              return (
                <tr key={item.itemId}>
                  <td className="p-4">
                    <p className="font-bold">
                      {item.supplierProductNameSnapshot ?? item.buyerProductNameSnapshot}
                    </p>
                    <p className="text-text-muted text-sm">
                      {item.supplierSkuSnapshot ?? item.buyerSkuSnapshot}
                    </p>
                  </td>
                  <td className="p-4 text-sm">
                    {quantities
                      ? `${milli(quantities.orderedSupplierMilli)} ${quantities.supplierUnit}`
                      : 'Unavailable'}
                  </td>
                  <td className="p-4 text-sm">
                    {milli(item.orderedBuyerBaseMilli)} {item.buyerBaseUnitSnapshot}
                  </td>
                  <td className="p-4 text-sm">
                    {quantities
                      ? `${milli(quantities.outstandingSupplierMilli)} ${quantities.supplierUnit} / ${milli(quantities.outstandingBuyerBaseMilli)} ${quantities.buyerUnit}`
                      : 'Unavailable'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="divide-border divide-y md:hidden">
          {itemsQuery.data?.items.map((item) => {
            const quantities = connectedLineQuantities(item);
            return (
              <article className="space-y-2 p-4" key={item.itemId}>
                <h3 className="font-bold">
                  {item.supplierProductNameSnapshot ?? item.buyerProductNameSnapshot}
                </h3>
                <p className="text-sm">
                  <span className="font-bold">Supplier ordered:</span>{' '}
                  {quantities
                    ? `${milli(quantities.orderedSupplierMilli)} ${quantities.supplierUnit}`
                    : 'Unavailable'}
                </p>
                <p className="text-sm">
                  <span className="font-bold">Buyer equivalent:</span>{' '}
                  {milli(item.orderedBuyerBaseMilli)} {item.buyerBaseUnitSnapshot}
                </p>
                <p className="text-sm">
                  <span className="font-bold">Outstanding:</span>{' '}
                  {quantities
                    ? `${milli(quantities.outstandingSupplierMilli)} ${quantities.supplierUnit}`
                    : 'Unavailable'}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-border bg-surface rounded-panel border p-6 max-md:p-4">
        <h2 className="text-lg font-bold">Timeline</h2>
        {historyQuery.data?.items.length ? (
          <ol className="border-border mt-4 space-y-4 border-l pl-5">
            {historyQuery.data.items.map((event) => (
              <li key={event.historyId}>
                <p className="font-bold">
                  {event.fromStatus ?? 'Created'} → {event.toStatus}
                </p>
                <p className="text-text-muted text-sm">
                  {event.actorName} · {event.actorOrgName} ·{' '}
                  {event.createdAt.toDate().toLocaleString()}
                </p>
                {event.note && <p className="mt-1 text-sm">{event.note}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-text-muted mt-3 text-sm">
            No connected transition history is available.
          </p>
        )}
      </section>
    </div>
  );
}
