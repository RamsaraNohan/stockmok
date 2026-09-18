import type { ConnectionProjection, ConnectionStatus } from '@stockmok/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { BusinessDiscoveryPanel } from '@/features/network/BusinessDiscoveryPanel';
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
import { EmptyState } from '@/ui/primitives/EmptyState';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { StatusPill } from '@/ui/primitives/StatusPill';
import { PageHeader } from '@/ui/shell/PageHeader';

const CONNECTION_STATUSES: readonly ConnectionStatus[] = [
  'PENDING',
  'ACTIVE',
  'REJECTED',
  'DISABLED',
];

export function ConnectedBusinessesScreen() {
  const repositories = useRepositories();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { activeMembership, activeRole } = useWorkspace();
  const [isDiscoveryOpen, setDiscoveryOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const connectionsQuery = useQuery({
    queryKey: ['network', 'connections', activeMembership?.organizationId],
    queryFn: async () => repositories?.network.listConnections(CONNECTION_STATUSES),
    enabled: Boolean(repositories && activeMembership),
  });

  const connections = connectionsQuery.data?.items ?? [];

  const runResponse = async (connection: ConnectionProjection, response: 'ACCEPT' | 'REJECT') => {
    if (!activeMembership) return;
    setActionError(null);
    setActiveAction(`${connection.connectionId}:${response}`);
    const operationId = crypto.randomUUID();
    try {
      await respondToConnection(
        activeMembership.organizationId,
        connection.connectionId,
        response,
        operationId,
      );
      await queryClient.invalidateQueries({ queryKey: ['network', 'connections'] });
    } catch {
      setActionError('The connection changed or the response failed. Refresh and try again.');
    } finally {
      setActiveAction(null);
    }
  };

  const runDisable = async (connection: ConnectionProjection) => {
    if (!activeMembership) return;
    setActionError(null);
    setActiveAction(`${connection.connectionId}:DISABLE`);
    try {
      await disableConnection(activeMembership.organizationId, connection.connectionId);
      await queryClient.invalidateQueries({ queryKey: ['network', 'connections'] });
    } catch {
      setActionError('The connection could not be disabled. Refresh and try again.');
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button
            onClick={() => {
              setDiscoveryOpen(true);
            }}
          >
            Find business
          </Button>
        }
        title="Connected Businesses"
      />

      {actionError && <ErrorState message={actionError} title="Connection action failed" />}

      {connectionsQuery.isLoading ? (
        <div className="space-y-3" aria-label="Loading connections">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : connectionsQuery.isError ? (
        <ErrorState
          message="Connections could not be loaded. No Network action has been performed."
          title="Failed to load connections"
        />
      ) : connections.length === 0 ? (
        <EmptyState
          action={
            <Button
              onClick={() => {
                setDiscoveryOpen(true);
              }}
            >
              Find business
            </Button>
          }
          description="Connect a Stockmok supplier to validate product codes and exchange purchase orders."
          title="No connected businesses"
        />
      ) : (
        <div className="border-border bg-surface overflow-hidden rounded-panel border">
          <table className="w-full border-collapse text-left max-md:hidden">
            <thead className="bg-background border-border border-b">
              <tr>
                <th className="p-4 text-sm">Business</th>
                <th className="p-4 text-sm">Direction</th>
                <th className="p-4 text-sm">Status</th>
                <th className="p-4 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {connections.map((connection) => {
                const counterparty = getConnectionCounterparty(
                  connection,
                  activeMembership?.organizationId ?? '',
                );
                return (
                  <tr key={connection.connectionId}>
                    <td className="p-4">
                      <p className="font-bold">{counterparty.name}</p>
                      <p className="text-text-muted text-sm">@{counterparty.handle}</p>
                    </td>
                    <td className="p-4 text-sm">{counterparty.direction}</td>
                    <td className="p-4">
                      <StatusPill status={connection.status} />
                    </td>
                    <td className="p-4">
                      <ConnectionActions
                        activeAction={activeAction}
                        connection={connection}
                        onDisable={(selected) => {
                          void runDisable(selected);
                        }}
                        onResponse={(selected, response) => {
                          void runResponse(selected, response);
                        }}
                        onView={() => {
                          void navigate(connection.connectionId);
                        }}
                        organizationId={activeMembership?.organizationId ?? ''}
                        role={activeRole}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="divide-border divide-y md:hidden">
            {connections.map((connection) => {
              const counterparty = getConnectionCounterparty(
                connection,
                activeMembership?.organizationId ?? '',
              );
              return (
                <article className="space-y-3 p-4" key={connection.connectionId}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold">{counterparty.name}</h2>
                      <p className="text-text-muted text-sm">@{counterparty.handle}</p>
                    </div>
                    <StatusPill status={connection.status} />
                  </div>
                  <p className="text-sm">
                    <span className="font-bold">Direction:</span> {counterparty.direction}
                  </p>
                  <ConnectionActions
                    activeAction={activeAction}
                    connection={connection}
                    onDisable={(selected) => {
                      void runDisable(selected);
                    }}
                    onResponse={(selected, response) => {
                      void runResponse(selected, response);
                    }}
                    onView={() => {
                      void navigate(connection.connectionId);
                    }}
                    organizationId={activeMembership?.organizationId ?? ''}
                    role={activeRole}
                  />
                </article>
              );
            })}
          </div>
        </div>
      )}

      <BusinessDiscoveryPanel
        connections={connections}
        isOpen={isDiscoveryOpen}
        onClose={() => {
          setDiscoveryOpen(false);
        }}
      />
    </div>
  );
}

interface ConnectionActionsProps {
  readonly connection: ConnectionProjection;
  readonly organizationId: string;
  readonly role: ReturnType<typeof useWorkspace>['activeRole'];
  readonly activeAction: string | null;
  readonly onView: () => void;
  readonly onResponse: (connection: ConnectionProjection, response: 'ACCEPT' | 'REJECT') => void;
  readonly onDisable: (connection: ConnectionProjection) => void;
}

function ConnectionActions({
  connection,
  organizationId,
  role,
  activeAction,
  onView,
  onResponse,
  onDisable,
}: ConnectionActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={onView} size="sm" variant="outline">
        View
      </Button>
      {canRespondToConnection(connection, organizationId, role) && (
        <>
          <Button
            disabled={activeAction !== null}
            onClick={() => {
              onResponse(connection, 'ACCEPT');
            }}
            size="sm"
          >
            Accept
          </Button>
          <Button
            disabled={activeAction !== null}
            onClick={() => {
              onResponse(connection, 'REJECT');
            }}
            size="sm"
            variant="outline"
          >
            Reject
          </Button>
        </>
      )}
      {canDisableConnection(connection, role) && (
        <Button
          disabled={activeAction !== null}
          onClick={() => {
            onDisable(connection);
          }}
          size="sm"
          variant="danger"
        >
          Disable
        </Button>
      )}
    </div>
  );
}
