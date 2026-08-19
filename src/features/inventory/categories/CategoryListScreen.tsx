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
  createCategory,
  updateCategory,
  executeCategoryArchiveCommand,
  executeCategoryRestoreCommand,
} from '@/services/inventory/categoryService';
import type { Category } from '@stockmok/shared';

const ALLOWED_MANAGEMENT_ROLES = ['OWNER', 'ADMIN', 'INVENTORY_MANAGER'] as const;

export function CategoryListScreen() {
  const { activeMembership, activeRole } = useWorkspace();
  const { user } = useAuth();
  const repositories = useRepositories();
  const queryClient = useQueryClient();

  const orgId = activeMembership?.organizationId;
  const uid = user?.uid;

  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [archivingCategory, setArchivingCategory] = useState<Category | null>(null);
  const [restoringCategory, setRestoringCategory] = useState<Category | null>(null);

  const [formData, setFormData] = useState({ name: '', description: '' });

  const isManager = ALLOWED_MANAGEMENT_ROLES.includes(
    activeRole as (typeof ALLOWED_MANAGEMENT_ROLES)[number],
  );

  const {
    data: categories,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['categories', orgId, statusFilter],
    queryFn: () =>
      repositories
        ? repositories.inventory.listCategories(statusFilter)
        : Promise.reject(new Error('No repo')),
    enabled: !!orgId && !!repositories,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!orgId || !uid) return;
      const categoryId = crypto.randomUUID();
      await createCategory(
        orgId,
        categoryId,
        {
          name: formData.name,
          description: formData.description,
        },
        uid,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories', orgId] });
      setCreateModalOpen(false);
      setFormData({ name: '', description: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingCategory || !orgId || !uid) return;
      await updateCategory(
        orgId,
        editingCategory.categoryId,
        {
          name: formData.name,
          description: formData.description,
        },
        uid,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories', orgId] });
      setEditingCategory(null);
      setFormData({ name: '', description: '' });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      if (!archivingCategory || !orgId) return;
      await executeCategoryArchiveCommand(orgId, archivingCategory.categoryId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories', orgId] });
      setArchivingCategory(null);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!restoringCategory || !orgId) return;
      await executeCategoryRestoreCommand(orgId, restoringCategory.categoryId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories', orgId] });
      setRestoringCategory(null);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categories"
        actions={
          isManager ? (
            <Button
              variant="primary"
              onClick={() => {
                setFormData({ name: '', description: '' });
                setCreateModalOpen(true);
              }}
            >
              New Category
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
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {isError && (
        <ErrorState
          title="Failed to load categories"
          message="There was an error loading the categories. Please try again."
          onRetry={() => {
            void refetch();
          }}
        />
      )}

      {categories && categories.items.length === 0 && (
        <EmptyState
          title="No categories found"
          description={
            statusFilter === 'ACTIVE'
              ? 'Get started by creating your first category.'
              : 'No archived categories.'
          }
          action={
            isManager && statusFilter === 'ACTIVE' ? (
              <Button
                onClick={() => {
                  setCreateModalOpen(true);
                }}
              >
                Create Category
              </Button>
            ) : undefined
          }
        />
      )}

      {categories && categories.items.length > 0 && (
        <div className="overflow-x-auto rounded-panel border border-border bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-alt border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium text-text-muted">Name</th>
                <th className="px-4 py-3 font-medium text-text-muted hidden sm:table-cell">
                  Description
                </th>
                <th className="px-4 py-3 font-medium text-text-muted">Status</th>
                {isManager && (
                  <th className="px-4 py-3 font-medium text-text-muted text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.items.map((cat: Category) => (
                <tr key={cat.categoryId} className="hover:bg-surface-alt/50">
                  <td className="px-4 py-3 font-medium text-text">{cat.name}</td>
                  <td className="px-4 py-3 text-text-muted hidden sm:table-cell">
                    {cat.description || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={cat.status} label={cat.status} />
                  </td>
                  {isManager && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {statusFilter === 'ACTIVE' ? (
                          <>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setFormData({ name: cat.name, description: cat.description || '' });
                                setEditingCategory(cat);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => {
                                setArchivingCategory(cat);
                              }}
                            >
                              Archive
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="secondary"
                            onClick={() => {
                              setRestoringCategory(cat);
                            }}
                          >
                            Restore
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={createModalOpen || !!editingCategory}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingCategory(null);
        }}
        title={editingCategory ? 'Edit Category' : 'New Category'}
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
            id="description"
            label="Description"
            value={formData.description}
            onChange={(e) => {
              setFormData({ ...formData, description: e.target.value });
            }}
            disabled={createMutation.isPending || updateMutation.isPending}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setCreateModalOpen(false);
                setEditingCategory(null);
              }}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (editingCategory) {
                  updateMutation.mutate();
                } else {
                  createMutation.mutate();
                }
              }}
              isLoading={createMutation.isPending || updateMutation.isPending}
              disabled={!formData.name.trim()}
            >
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!archivingCategory}
        onClose={() => {
          setArchivingCategory(null);
        }}
        title="Archive Category"
      >
        <div className="space-y-4 pt-4">
          <p className="text-text">
            Are you sure you want to archive <strong>{archivingCategory?.name}</strong>? This
            category will no longer be available for new products.
          </p>
          {archiveMutation.isError && (
            <div className="text-error text-sm mt-2">
              Failed to archive category. It may contain active products.
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="secondary"
              onClick={() => {
                setArchivingCategory(null);
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
        isOpen={!!restoringCategory}
        onClose={() => {
          setRestoringCategory(null);
        }}
        title="Restore Category"
      >
        <div className="space-y-4 pt-4">
          <p className="text-text">
            Are you sure you want to restore <strong>{restoringCategory?.name}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="secondary"
              onClick={() => {
                setRestoringCategory(null);
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
