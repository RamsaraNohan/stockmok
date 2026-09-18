import type { ConnectionProjection, OrganizationDirectory } from '@stockmok/shared';
import { useRef, useState } from 'react';

import {
  findBusinessByHandle,
  isValidBusinessHandle,
  normalizeBusinessHandle,
  requestSupplierConnection,
} from '@/services/network/networkService';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { Button } from '@/ui/primitives/Button';
import { Input } from '@/ui/primitives/Input';
import { Modal } from '@/ui/primitives/Modal';
import { Monogram } from '@/ui/primitives/Monogram';

type DiscoveryState =
  | 'IDLE'
  | 'SEARCHING'
  | 'FOUND'
  | 'NOT_FOUND'
  | 'ALREADY_CONNECTED'
  | 'REQUEST_PENDING'
  | 'SELF_BLOCKED'
  | 'REQUESTED'
  | 'ERROR';

interface BusinessDiscoveryPanelProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly connections: readonly ConnectionProjection[];
}

function connectionState(
  directory: OrganizationDirectory,
  connections: readonly ConnectionProjection[],
): DiscoveryState | null {
  const connection = connections.find(
    (candidate) =>
      candidate.buyerOrgId === directory.organizationId ||
      candidate.supplierOrgId === directory.organizationId,
  );
  if (connection?.status === 'ACTIVE') return 'ALREADY_CONNECTED';
  if (connection?.status === 'PENDING') return 'REQUEST_PENDING';
  return null;
}

export function BusinessDiscoveryPanel({
  isOpen,
  onClose,
  connections,
}: BusinessDiscoveryPanelProps) {
  const { activeMembership } = useWorkspace();
  const [handle, setHandle] = useState('');
  const [state, setState] = useState<DiscoveryState>('IDLE');
  const [result, setResult] = useState<OrganizationDirectory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const operationId = useRef(crypto.randomUUID());

  const reset = () => {
    setHandle('');
    setState('IDLE');
    setResult(null);
    setError(null);
    operationId.current = crypto.randomUUID();
  };

  const close = () => {
    reset();
    onClose();
  };

  const search = async () => {
    const normalized = normalizeBusinessHandle(handle);
    setError(null);
    setResult(null);

    if (!isValidBusinessHandle(normalized)) {
      setState('NOT_FOUND');
      setError('Enter an exact handle using 3–30 lowercase letters, numbers, or hyphens.');
      return;
    }

    if (normalized === activeMembership?.handle.toLowerCase()) {
      setState('SELF_BLOCKED');
      return;
    }

    setState('SEARCHING');
    try {
      const directory = await findBusinessByHandle(normalized);
      if (!directory) {
        setState('NOT_FOUND');
        return;
      }
      if (directory.organizationId === activeMembership?.organizationId) {
        setState('SELF_BLOCKED');
        return;
      }

      setResult(directory);
      setState(connectionState(directory, connections) ?? 'FOUND');
    } catch {
      setState('ERROR');
      setError('Business lookup failed. Check your connection and try again.');
    }
  };

  const connect = async () => {
    if (!activeMembership || !result || state !== 'FOUND') return;
    setError(null);
    try {
      await requestSupplierConnection(
        activeMembership.organizationId,
        result.handle,
        operationId.current,
      );
      setState('REQUESTED');
    } catch {
      setState('ERROR');
      setError('The connection request could not be sent. Refresh the connection state and retry.');
    }
  };

  return (
    <Modal
      description="Enter the exact business handle. Stockmok does not provide directory browsing or fuzzy search."
      isOpen={isOpen}
      onClose={close}
      title="Find a Stockmok business"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <div className="flex items-end gap-3 max-sm:flex-col">
          <div className="w-full">
            <Input
              autoComplete="off"
              error={state === 'NOT_FOUND' && error ? error : undefined}
              helperText="Exact handle only; names and partial matches are not searched."
              label="Business handle"
              onChange={(event) => {
                setHandle(event.target.value);
                if (state !== 'IDLE') {
                  setState('IDLE');
                  setResult(null);
                  setError(null);
                }
              }}
              placeholder="@freshfoods"
              value={handle}
            />
          </div>
          <Button isLoading={state === 'SEARCHING'} type="submit">
            Find business
          </Button>
        </div>

        <div aria-live="polite" className="min-h-6 text-sm">
          {state === 'NOT_FOUND' && !error && (
            <p className="text-text-muted">
              No active Stockmok business was found for that exact handle.
            </p>
          )}
          {state === 'SELF_BLOCKED' && (
            <p className="font-semibold text-red-700">
              You cannot connect this workspace to itself.
            </p>
          )}
          {state === 'ALREADY_CONNECTED' && (
            <p className="font-semibold text-emerald-700">This business is already connected.</p>
          )}
          {state === 'REQUEST_PENDING' && (
            <p className="font-semibold text-amber-700">A connection request is already pending.</p>
          )}
          {state === 'REQUESTED' && (
            <p className="font-semibold text-emerald-700">Connection request sent.</p>
          )}
          {state === 'ERROR' && <p className="font-semibold text-red-700">{error}</p>}
        </div>

        {result && (
          <section
            aria-label="Exact business result"
            className="border-border bg-background rounded-panel border p-4"
          >
            <div className="flex items-center gap-3">
              <Monogram color={result.monogramColor} size="md" text={result.monogram} />
              <div className="min-w-0 flex-1">
                <h3 className="text-text truncate font-bold">{result.name}</h3>
                <p className="text-text-muted text-sm">@{result.handle}</p>
                <p className="text-text-muted text-xs">
                  {result.industry} · {result.country}
                </p>
              </div>
              {state === 'FOUND' && (
                <Button
                  onClick={() => {
                    void connect();
                  }}
                  type="button"
                >
                  Connect as Supplier
                </Button>
              )}
            </div>
          </section>
        )}
      </form>
    </Modal>
  );
}
