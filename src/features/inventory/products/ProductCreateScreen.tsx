import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/services/data/useRepositories';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { PageHeader } from '@/ui/shell/PageHeader';
import { Button } from '@/ui/primitives/Button';
import { Input } from '@/ui/primitives/Input';
import { executeProductCreateCommand } from '@/services/inventory/productService';
import type { ProductCreatePayload } from '@/services/inventory/productService';

// Fields the user can edit (currency is sourced from activeSettings at submit time)
type EditableProductFields = Omit<ProductCreatePayload, 'currency'>;

export function ProductCreateScreen() {
  const navigate = useNavigate();
  const { handle } = useParams<{ handle: string }>();
  const repositories = useRepositories();
  const { activeOrg, activeSettings } = useWorkspace();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () =>
      repositories?.inventory.listCategories() ?? { items: [], nextCursor: null },
    enabled: !!repositories,
  });

  const [formData, setFormData] = useState<EditableProductFields>({
    internalSku: '',
    name: '',
    description: '',
    categoryId: '',
    baseUnit: '',
    purchaseCostMinor: 0,
    minimumStockMilli: 0,
    reorderTargetMilli: 0,
  });

  const displayCurrency = activeSettings?.currency ?? 'USD';

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!activeOrg?.organizationId) return;

    setIsSubmitting(true);
    setError('');

    try {
      const payload: ProductCreatePayload = { ...formData, currency: displayCurrency };
      const result = await executeProductCreateCommand(activeOrg.organizationId, payload);
      void navigate(`/app/${handle ?? ''}/inventory/products/${result.productId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      <PageHeader title="Create Product" />

      <div className="p-4 md:p-8">
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="bg-surface p-6 rounded-panel border border-border shadow-sm space-y-6"
        >
          {error && <div className="text-error text-sm font-medium">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text mb-1" htmlFor="product-name">
                Product Name
              </label>
              <Input
                id="product-name"
                required
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                }}
                placeholder="e.g. Steel Pipe 20mm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1" htmlFor="internal-sku">
                Internal SKU
              </label>
              <Input
                id="internal-sku"
                required
                value={formData.internalSku}
                onChange={(e) => {
                  setFormData({ ...formData, internalSku: e.target.value });
                }}
                placeholder="e.g. SP-20MM"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1" htmlFor="category">
                Category
              </label>
              <select
                id="category"
                required
                className="w-full h-10 px-3 rounded-control border border-border bg-surface text-text text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                value={formData.categoryId}
                onChange={(e) => {
                  setFormData({ ...formData, categoryId: e.target.value });
                }}
              >
                <option value="" disabled>
                  Select category...
                </option>
                {categories?.items.map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1" htmlFor="base-unit">
                Base Unit
              </label>
              <Input
                id="base-unit"
                required
                value={formData.baseUnit}
                onChange={(e) => {
                  setFormData({ ...formData, baseUnit: e.target.value });
                }}
                placeholder="e.g. pcs"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1" htmlFor="purchase-cost">
                Purchase Cost (minor units)
              </label>
              <Input
                id="purchase-cost"
                type="number"
                required
                min="0"
                value={formData.purchaseCostMinor}
                onChange={(e) => {
                  setFormData({ ...formData, purchaseCostMinor: parseInt(e.target.value) || 0 });
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1" htmlFor="currency">
                Currency
              </label>
              <Input
                id="currency"
                required
                readOnly
                className="bg-background cursor-not-allowed"
                value={displayCurrency}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1" htmlFor="min-stock">
                Minimum Stock
              </label>
              <Input
                id="min-stock"
                type="number"
                required
                min="0"
                step="any"
                value={formData.minimumStockMilli / 1000}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    minimumStockMilli: Math.round(parseFloat(e.target.value) * 1000) || 0,
                  });
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1" htmlFor="reorder-target">
                Reorder Target
              </label>
              <Input
                id="reorder-target"
                type="number"
                required
                min="0"
                step="any"
                value={formData.reorderTargetMilli / 1000}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    reorderTargetMilli: Math.round(parseFloat(e.target.value) * 1000) || 0,
                  });
                }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void navigate(-1);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
