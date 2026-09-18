import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/services/data/useRepositories';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { PageHeader } from '@/ui/shell/PageHeader';
import { Button } from '@/ui/primitives/Button';
import { Input } from '@/ui/primitives/Input';
import {
  executeProductUpdateCommand,
  type ProductUpdatePayload,
} from '@/services/inventory/productService';
import { Skeleton } from '@/ui/primitives/Skeleton';

interface ProductData {
  productId: string;
  internalSku: string;
  name: string;
  categoryId: string;
  purchaseCostMinor: number;
  minimumStockMilli: number;
  reorderTargetMilli: number;
  description?: string;
  sellingPriceMinor?: number;
}

interface CategoriesData {
  items: { categoryId: string; name: string }[];
}

function ProductEditForm({
  product,
  categories,
}: {
  product: ProductData;
  categories: CategoriesData;
}) {
  const { handle, productId } = useParams<{ handle: string; productId: string }>();
  const navigate = useNavigate();
  const { activeOrg } = useWorkspace();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<Partial<ProductUpdatePayload>>(() => ({
    productId: product.productId,
    internalSku: product.internalSku,
    name: product.name,
    categoryId: product.categoryId,
    purchaseCostMinor: product.purchaseCostMinor,
    minimumStockMilli: product.minimumStockMilli,
    reorderTargetMilli: product.reorderTargetMilli,
    ...(product.description !== undefined ? { description: product.description } : {}),
    ...(product.sellingPriceMinor !== undefined
      ? { sellingPriceMinor: product.sellingPriceMinor }
      : {}),
  }));

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!productId || !activeOrg?.organizationId) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Merge productId into form data and strip undefined fields without dynamic delete
      const merged = Object.fromEntries(
        Object.entries({ ...formData, productId }).filter(([, v]) => (v as unknown) !== undefined),
      );
      await executeProductUpdateCommand(
        activeOrg.organizationId,
        merged as unknown as ProductUpdatePayload,
      );
      void navigate(`/app/${handle ?? ''}/inventory/products/${productId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      <PageHeader title="Edit Product" />

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
                value={formData.name || ''}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1" htmlFor="internal-sku">
                Internal SKU
              </label>
              <Input
                id="internal-sku"
                required
                value={formData.internalSku || ''}
                onChange={(e) => {
                  setFormData({ ...formData, internalSku: e.target.value });
                }}
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
                value={formData.categoryId || ''}
                onChange={(e) => {
                  setFormData({ ...formData, categoryId: e.target.value });
                }}
              >
                <option value="" disabled>
                  Select category...
                </option>
                {categories.items.map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>
                    {c.name}
                  </option>
                ))}
              </select>
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
                value={formData.purchaseCostMinor || 0}
                onChange={(e) => {
                  setFormData({ ...formData, purchaseCostMinor: parseInt(e.target.value) || 0 });
                }}
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
                value={
                  formData.minimumStockMilli !== undefined ? formData.minimumStockMilli / 1000 : 0
                }
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
                value={
                  formData.reorderTargetMilli !== undefined ? formData.reorderTargetMilli / 1000 : 0
                }
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProductEditScreen() {
  const { productId } = useParams<{ handle: string; productId: string }>();
  const repositories = useRepositories();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!repositories || !productId) return null;
      return repositories.inventory.getProduct(productId);
    },
    enabled: !!repositories && !!productId,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () =>
      repositories?.inventory.listCategories() ?? { items: [], nextCursor: null },
    enabled: !!repositories,
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-64 w-full max-w-3xl mx-auto" />
      </div>
    );
  }

  if (!product || !categories) {
    return null;
  }

  return (
    <ProductEditForm
      key={product.productId}
      product={product as ProductData}
      categories={categories as CategoriesData}
    />
  );
}
