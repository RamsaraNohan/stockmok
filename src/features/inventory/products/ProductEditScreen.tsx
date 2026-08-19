import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/services/data/useRepositories';
import { PageHeader } from '@/ui/shell/PageHeader';
import { Button } from '@/ui/primitives/Button';
import { Input } from '@/ui/primitives/Input';
import { executeProductUpdateCommand, type ProductUpdatePayload } from '@/data/adapters/productAdapter';
import { Skeleton } from '@/ui/primitives/Skeleton';

export function ProductEditScreen() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const repositories = useRepositories();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!repositories || !productId) return null;
      return repositories.inventory.getProduct(productId);
    },
    enabled: !!repositories && !!productId,
  });

  const [formData, setFormData] = useState<Partial<ProductUpdatePayload>>({});

  useEffect(() => {
    if (product) {
      const init: any = {
        productId: product.productId,
        internalSku: product.internalSku,
        name: product.name,
        categoryId: product.categoryId,
        purchaseCostMinor: product.purchaseCostMinor,
        minimumStockMilli: product.minimumStockMilli,
        reorderTargetMilli: product.reorderTargetMilli,
      };
      if (product.description !== undefined) init.description = product.description;
      if (product.sellingPriceMinor !== undefined) init.sellingPriceMinor = product.sellingPriceMinor;
      setFormData(init);
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      const payload: any = { ...formData, productId };
      // Remove any undefined properties explicitly just in case
      for (const key of Object.keys(payload)) {
        if (payload[key] === undefined) delete payload[key];
      }
      await executeProductUpdateCommand(payload as ProductUpdatePayload);
      navigate(`/app/inventory/products/${productId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-64 w-full max-w-3xl mx-auto" /></div>;
  }

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      <PageHeader title="Edit Product" />
      
      <div className="p-4 md:p-8">
        <form onSubmit={handleSubmit} className="bg-surface p-6 rounded-panel border border-border shadow-sm space-y-6">
          {error && <div className="text-error text-sm font-medium">{error}</div>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text mb-1">Product Name</label>
              <Input
                required
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text mb-1">Internal SKU</label>
              <Input
                required
                value={formData.internalSku || ''}
                onChange={e => setFormData({ ...formData, internalSku: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Purchase Cost (minor units)</label>
              <Input
                type="number"
                required
                min="0"
                value={formData.purchaseCostMinor || 0}
                onChange={e => setFormData({ ...formData, purchaseCostMinor: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Minimum Stock (milli)</label>
              <Input
                type="number"
                required
                min="0"
                value={formData.minimumStockMilli || 0}
                onChange={e => setFormData({ ...formData, minimumStockMilli: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Reorder Target (milli)</label>
              <Input
                type="number"
                required
                min="0"
                value={formData.reorderTargetMilli || 0}
                onChange={e => setFormData({ ...formData, reorderTargetMilli: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)} disabled={isSubmitting}>
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
