import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  canDisableConnection,
  canRespondToConnection,
  disableConnection,
  getConnectionCounterparty,
  respondToConnection,
} from '@/services/network/networkService';
import { useRepositories } from '@/services/data/useRepositories';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { Button } from '@/ui/primitives/Button';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { StatusPill } from '@/ui/primitives/StatusPill';
import { PageHeader } from '@/ui/shell/PageHeader';

export function ConnectionDetailScreen() {
  const { connectionId = '' } = useParams<{ readonly connectionId: string }>();
  const repositories = useRepositories();
  const queryClient = useQueryClient();
  const { activeMembership, activeRole } = useWorkspace();
  const [actionError, setActionError] = useState<string | null>(null);
  const operationId = useRef(crypto.randomUUID());

  const connectionQuery = useQuery({
    queryKey: ['network', 'connection', activeMembership?.organizationId, connectionId],
    queryFn: async () => repositories?.network.getConnection(connectionId),
    enabled: Boolean(repositories && activeMembership && connectionId),
  });

  useEffect(() => {
    if (!repositories || !connectionId) return undefined;
    return repositories.network.subscribeConnection(
      connectionId,
      (connection) => {
        queryClient.setQueryData(
          ['network', 'connection', activeMembership?.organizationId, connectionId],
          connection,
        );
      },
      () => {
        setActionError('Realtime connection updates stopped. Refresh to continue.');
      },
    );
  }, [activeMembership?.organizationId, connectionId, queryClient, repositories]);

  const runResponse = async (response: 'ACCEPT' | 'REJECT') => {
    if (!activeMembership || !connectionQuery.data) return;
    setActionError(null);
    try {
      await respondToConnection(
        activeMembership.organizationId,
        connectionQuery.data.connectionId,
        response,
        operationId.current,
      );
      operationId.current = crypto.randomUUID();
    } catch {
      setActionError('The connection changed or the response failed. Refresh and try again.');
    }
  };

  const runDisable = async () => {
    if (!activeMembership || !connectionQuery.data) return;
    setActionError(null);
    try {
      await disableConnection(activeMembership.organizationId, connectionQuery.data.connectionId);
    } catch {
      setActionError('The connection could not be disabled. Refresh and try again.');
    }
  };

  if (connectionQuery.isLoading) return <Skeleton className="h-72 w-full" />;
  if (connectionQuery.isError)
    return (
      <ErrorState message="The connection could not be loaded." title="Connection unavailable" />
    );
  const connection = connectionQuery.data;
  if (!connection || !activeMembership)
    return (
      <ErrorState
        message="No connection is available for this workspace."
        title="Connection not found"
      />
    );

  const counterparty = getConnectionCounterparty(connection, activeMembership.organizationId);
  const mayRespond = canRespondToConnection(
    connection,
    activeMembership.organizationId,
    activeRole,
  );
  const mayDisable = canDisableConnection(connection, activeRole);

  return (
    <div className="space-y-6">
      <PageHeader title={counterparty.name} />
      {actionError && <ErrorState message={actionError} title="Connection action failed" />}
      <section className="border-border bg-surface space-y-4 rounded-panel border p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-text-muted text-sm">Counterparty</p>
            <h1 className="text-xl font-bold">{counterparty.name}</h1>
            <p className="text-text-muted">@{counterparty.handle}</p>
          </div>
          <StatusPill status={connection.status} />
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-bold">Direction</dt>
            <dd>{counterparty.direction}</dd>
          </div>
          <div>
            <dt className="font-bold">Orders placed</dt>
            <dd>{connection.ordersPlacedCount}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          {mayRespond && (
            <>
              <Button onClick={() => void runResponse('ACCEPT')}>Accept request</Button>
              <Button onClick={() => void runResponse('REJECT')} variant="outline">
                Reject request
              </Button>
            </>
          )}
          {mayDisable && (
            <Button onClick={() => void runDisable()} variant="danger">
              Disable connection
            </Button>
          )}
          {connection.status === 'ACTIVE' && (
            <>
              <Link to="../../partner-catalog">
                <Button variant="outline">Open catalog</Button>
              </Link>
              <Link to="../../mappings">
                <Button variant="outline">Product mappings</Button>
              </Link>
            </>
          )}
        </div>
        {connection.status === 'DISABLED' && (
          <p className="text-text-muted text-sm">
            This connection is disabled. Historical connected orders remain available through
            Purchase Orders; new mappings and orders are unavailable.
          </p>
        )}
      </section>
    </div>
  );
}
