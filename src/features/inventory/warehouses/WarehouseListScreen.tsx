import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { useAuth } from '@/services/auth/useAuth';
import { useRepositories } from '@/services/data/useRepositories';
import { Button } from '@/ui/primitives/Button';
import { EmptyState } from '@/ui/primitives/EmptyState';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Skeleton } from '@/ui/primitives/Skeleton';
import { Modal } from '@/ui/primitives/Modal';
import { Input } from '@/ui/primitives/Input';
import { StatusPill } from '@/ui/primitives/StatusPill';
import { PageHeader } from '@/ui/shell/PageHeader';
import {
  createWarehouse,
  updateWarehouse,
  executeWarehouseArchiveCommand,
  executeWarehouseSetDefaultCommand,
  executeWarehouseRestoreCommand,
} from '@/services/inventory/warehouseService';
import type { Warehouse } from '@stockmok/shared';

const ALLOWED_MANAGEMENT_ROLES = ['OWNER', 'ADMIN', 'INVENTORY_MANAGER'] as const;
const WAREHOUSE_TYPES = ['STORE_ROOM', 'REFRIGERATED', 'FREEZER', 'KITCHEN', 'OTHER'] as const;
type WarehouseType = (typeof WAREHOUSE_TYPES)[number];

export function WarehouseListScreen() {
  const { activeMembership, activeRole } = useWorkspace();
  const { user } = useAuth();
  const repositories = useRepositories();
  const queryClient = useQueryClient();

  const orgId = activeMembership?.organizationId;
  const uid = user?.uid;

  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [archivingWarehouse, setArchivingWarehouse] = useState<Warehouse | null>(null);
  const [restoringWarehouse, setRestoringWarehouse] = useState<Warehouse | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'STORE_ROOM' as WarehouseType,
    address: '',
  });

  const isManager = ALLOWED_MANAGEMENT_ROLES.includes(
    activeRole as (typeof ALLOWED_MANAGEMENT_ROLES)[number],
  );

  const { data: orgSettings } = useQuery({
    queryKey: ['settings', orgId],
    queryFn: () =>
      repositories ? repositories.settings.getMain() : Promise.reject(new Error('No repo')),
    enabled: !!orgId && !!repositories,
  });

  const {
    data: warehouses,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['warehouses', orgId, statusFilter],
    queryFn: () =>
      repositories
        ? repositories.inventory.listWarehouses(statusFilter)
        : Promise.reject(new Error('No repo')),
    enabled: !!orgId && !!repositories,
  });

  const { data: archiveTotals, isLoading: isLoadingArchiveTotals } = useQuery({
    queryKey: ['warehouseTotals', orgId, archivingWarehouse?.warehouseId],
    queryFn: () => {
      if (!repositories || !archivingWarehouse) return Promise.reject(new Error('No repo'));
      return repositories.inventory.getWarehouseTotals(archivingWarehouse.warehouseId);
    },
    enabled: !!archivingWarehouse && !!repositories,
  });

  const resetForm = () => {
    setFormData({ name: '', code: '', type: 'STORE_ROOM', address: '' });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !uid) return;
      const warehouseId = crypto.randomUUID();
      await createWarehouse(
        orgId,
        warehouseId,
        {
          name: formData.name,
          code: formData.code || undefined,
          type: formData.type,
          address: formData.address || undefined,
        },
        uid,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['warehouses', orgId] });
      setCreateModalOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingWarehouse || !orgId || !uid) return;
      await updateWarehouse(
        orgId,
        editingWarehouse.warehouseId,
        {
          name: formData.name,
          code: formData.code || undefined,
          type: formData.type,
          address: formData.address || undefined,
        },
        uid,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['warehouses', orgId] });
      setEditingWarehouse(null);
      resetForm();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      if (!archivingWarehouse || !orgId) return;
      await executeWarehouseArchiveCommand(orgId, archivingWarehouse.warehouseId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['warehouses', orgId] });
      setArchivingWarehouse(null);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (warehouseId: string) => {
      if (!orgId) return;
      await executeWarehouseSetDefaultCommand(orgId, warehouseId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings', orgId] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!restoringWarehouse || !orgId) return;
      await executeWarehouseRestoreCommand(orgId, restoringWarehouse.warehouseId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['warehouses', orgId] });
      setRestoringWarehouse(null);
    },
  });

  const defaultWarehouseId = orgSettings?.defaultWarehouseId;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Warehouses & Store Rooms"
        actions={
          isManager ? (
            <Button
              variant="primary"
              onClick={() => {
                resetForm();
                setCreateModalOpen(true);
              }}
            >
              New Warehouse
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-4 border-b border-border">
        <button
          className={`pb-2 ${statusFilter === 'ACTIVE' ? 'border-b-2 border-primary font-medium text-text' : 'text-text-muted'}`}
          onClick={() => {
            setStatusFilter('ACTIVE');
          }}
        >
          Active
        </button>
        <button
          className={`pb-2 ${statusFilter === 'ARCHIVED' ? 'border-b-2 border-primary font-medium text-text' : 'text-text-muted'}`}
          onClick={() => {
            setStatusFilter('ARCHIVED');
          }}
        >
          Archived
        </button>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {isError && (
        <ErrorState
          title="Failed to load warehouses"
          message="There was an error loading the warehouse directory. Please try again."
          onRetry={() => {
            void refetch();
          }}
        />
      )}

      {warehouses && warehouses.items.length === 0 && (
        <EmptyState
          title="No warehouses found"
          description={
            statusFilter === 'ACTIVE'
              ? 'Get started by creating your first warehouse.'
              : 'No archived warehouses.'
          }
          action={
            isManager && statusFilter === 'ACTIVE' ? (
              <Button
                onClick={() => {
                  setCreateModalOpen(true);
                }}
              >
                Create Warehouse
              </Button>
            ) : undefined
          }
        />
      )}

      {warehouses && warehouses.items.length > 0 && (
        <div className="overflow-x-auto rounded-panel border border-border bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-alt border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium text-text-muted">Name</th>
                <th className="px-4 py-3 font-medium text-text-muted hidden sm:table-cell">Code</th>
                <th className="px-4 py-3 font-medium text-text-muted hidden md:table-cell">Type</th>
                <th className="px-4 py-3 font-medium text-text-muted">Status</th>
                {isManager && (
                  <th className="px-4 py-3 font-medium text-text-muted text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {warehouses.items.map((wh: Warehouse) => {
                const isDefault = wh.warehouseId === defaultWarehouseId;
                return (
                  <tr key={wh.warehouseId} className="hover:bg-surface-alt/50">
                    <td className="px-4 py-3 font-medium text-text">
                      <div className="flex items-center gap-2">
                        {wh.name}
                        {isDefault && (
                          <span className="inline-flex items-center justify-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Default
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-muted hidden sm:table-cell">
                      {wh.code || '-'}
                    </td>
                    <td className="px-4 py-3 text-text-muted hidden md:table-cell">
                      {wh.type.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={wh.status} label={wh.status} />
                    </td>
                    {isManager && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {statusFilter === 'ACTIVE' ? (
                            <>
                              {!isDefault && (
                                <Button
                                  variant="secondary"
                                  onClick={() => {
                                    setDefaultMutation.mutate(wh.warehouseId);
                                  }}
                                  disabled={setDefaultMutation.isPending}
                                >
                                  Set Default
                                </Button>
                              )}
                              <Button
                                variant="secondary"
                                onClick={() => {
                                  setFormData({
                                    name: wh.name,
                                    code: wh.code || '',
                                    type: wh.type,
                                    address: wh.address || '',
                                  });
                                  setEditingWarehouse(wh);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="danger"
                                onClick={() => {
                                  setArchivingWarehouse(wh);
                                }}
                                disabled={isDefault}
                              >
                                Archive
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setRestoringWarehouse(wh);
                              }}
                            >
                              Restore
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={createModalOpen || !!editingWarehouse}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingWarehouse(null);
        }}
        title={editingWarehouse ? 'Edit Warehouse' : 'New Warehouse'}
      >
        <div className="space-y-4 pt-4">
          <Input
            id="name"
            label="Name"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
            }}
            required
            disabled={createMutation.isPending || updateMutation.isPending}
          />
          <Input
            id="code"
            label="Code (Optional)"
            value={formData.code}
            onChange={(e) => {
              setFormData({ ...formData, code: e.target.value });
            }}
            disabled={createMutation.isPending || updateMutation.isPending}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text" htmlFor="type-select">
              Type
            </label>
            <select
              id="type-select"
              className="h-10 rounded border border-border bg-surface px-3 text-sm text-text outline-none focus:border-primary"
              value={formData.type}
              onChange={(e) => {
                setFormData({ ...formData, type: e.target.value as WarehouseType });
              }}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {WAREHOUSE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <Input
            id="address"
            label="Address (Optional)"
            value={formData.address}
            onChange={(e) => {
              setFormData({ ...formData, address: e.target.value });
            }}
            disabled={createMutation.isPending || updateMutation.isPending}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setCreateModalOpen(false);
                setEditingWarehouse(null);
              }}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (editingWarehouse) {
                  updateMutation.mutate();
                } else {
                  createMutation.mutate();
                }
              }}
              isLoading={createMutation.isPending || updateMutation.isPending}
              disabled={!formData.name.trim() || !formData.type}
            >
              {editingWarehouse ? 'Save Changes' : 'Create Warehouse'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!archivingWarehouse}
        onClose={() => {
          setArchivingWarehouse(null);
        }}
        title="Archive Warehouse"
      >
        <div className="space-y-4 pt-4">
          <p className="text-text">
            Are you sure you want to archive <strong>{archivingWarehouse?.name}</strong>?
          </p>
          {isLoadingArchiveTotals ? (
            <Skeleton className="h-12 w-full" />
          ) : archiveTotals && (archiveTotals.count ?? 0) > 0 ? (
            <div className="bg-surface-alt p-3 rounded text-sm text-text-muted">
              <strong>Warning:</strong> This warehouse currently holds stock value. The server will
              reject archiving if there is active stock or open receipts.
            </div>
          ) : null}
          {archiveMutation.isError && (
            <div className="text-error text-sm mt-2">
              Failed to archive warehouse. It may contain active stock or open receipts.
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="secondary"
              onClick={() => {
                setArchivingWarehouse(null);
              }}
              disabled={archiveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                archiveMutation.mutate();
              }}
              isLoading={archiveMutation.isPending}
            >
              Archive
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!restoringWarehouse}
        onClose={() => {
          setRestoringWarehouse(null);
        }}
        title="Restore Warehouse"
      >
        <div className="space-y-4 pt-4">
          <p className="text-text">
            Are you sure you want to restore <strong>{restoringWarehouse?.name}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="secondary"
              onClick={() => {
                setRestoringWarehouse(null);
              }}
              disabled={restoreMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                restoreMutation.mutate();
              }}
              isLoading={restoreMutation.isPending}
            >
              Restore
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
