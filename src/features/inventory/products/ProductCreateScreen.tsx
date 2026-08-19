import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/ui/shell/PageHeader';
import { Button } from '@/ui/primitives/Button';
import { Input } from '@/ui/primitives/Input';
import { executeProductCreateCommand, type ProductCreatePayload } from '@/data/adapters/productAdapter';

export function ProductCreateScreen() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<ProductCreatePayload>({
    internalSku: '',
    name: '',
    description: '',
    categoryId: 'unassigned', // should be selected from categories
    baseUnit: 'pcs',
    purchaseCostMinor: 0,
    currency: 'USD',
    minimumStockMilli: 0,
    reorderTargetMilli: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const result = await executeProductCreateCommand(formData);
      navigate(`/app/inventory/products/${result.productId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full">
      <PageHeader title="Create Product" />
      
      <div className="p-4 md:p-8">
        <form onSubmit={handleSubmit} className="bg-surface p-6 rounded-panel border border-border shadow-sm space-y-6">
          {error && <div className="text-error text-sm font-medium">{error}</div>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text mb-1">Product Name</label>
              <Input
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Steel Pipe 20mm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text mb-1">Internal SKU</label>
              <Input
                required
                value={formData.internalSku}
                onChange={e => setFormData({ ...formData, internalSku: e.target.value })}
                placeholder="e.g. SP-20MM"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Base Unit</label>
              <Input
                required
                value={formData.baseUnit}
                onChange={e => setFormData({ ...formData, baseUnit: e.target.value })}
                placeholder="e.g. pcs"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Purchase Cost (minor units)</label>
              <Input
                type="number"
                required
                min="0"
                value={formData.purchaseCostMinor}
                onChange={e => setFormData({ ...formData, purchaseCostMinor: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Currency</label>
              <Input
                required
                value={formData.currency}
                onChange={e => setFormData({ ...formData, currency: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Minimum Stock (milli)</label>
              <Input
                type="number"
                required
                min="0"
                value={formData.minimumStockMilli}
                onChange={e => setFormData({ ...formData, minimumStockMilli: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Reorder Target (milli)</label>
              <Input
                type="number"
                required
                min="0"
                value={formData.reorderTargetMilli}
                onChange={e => setFormData({ ...formData, reorderTargetMilli: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)} disabled={isSubmitting}>
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
