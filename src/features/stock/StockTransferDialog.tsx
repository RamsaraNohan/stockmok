import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/services/data/useRepositories';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { executeStockTransferCommand } from '@/services/stock/stockService';
import { Button } from '@/ui/primitives/Button';
import { Input } from '@/ui/primitives/Input';
import { Modal } from '@/ui/primitives/Modal';

const schema = z
  .object({
    sourceWarehouseId: z.string().min(1, 'Source is required'),
    destinationWarehouseId: z.string().min(1, 'Destination is required'),
    quantity: z.number().positive('Quantity must be greater than 0'),
  })
  .refine((data) => data.sourceWarehouseId !== data.destinationWarehouseId, {
    message: 'Source and destination must be different',
    path: ['destinationWarehouseId'],
  });

type FormData = z.infer<typeof schema>;

export interface StockTransferDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly productId: string;
}

export function StockTransferDialog({ isOpen, onClose, productId }: StockTransferDialogProps) {
  const { activeOrg } = useWorkspace();
  const repositories = useRepositories();
  const queryClient = useQueryClient();

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => repositories?.settings.listWarehouses() ?? { items: [], nextCursor: null },
    enabled: !!repositories && isOpen,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const activeWarehouses = warehouses?.items.filter((w) => w.status === 'ACTIVE') || [];

  const onSubmit = async (data: FormData) => {
    if (!activeOrg?.organizationId) return;

    try {
      await executeStockTransferCommand(activeOrg.organizationId, {
        productId,
        sourceWarehouseId: data.sourceWarehouseId,
        destinationWarehouseId: data.destinationWarehouseId,
        quantityMilli: Math.round(data.quantity * 1000),
      });
      await queryClient.invalidateQueries({ queryKey: ['productBalances', productId] });
      await queryClient.invalidateQueries({ queryKey: ['movements', productId] });
      handleClose();
    } catch (err) {
      alert('Failed to transfer stock');
      console.error(err);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      description="Transfer stock between store rooms."
      isOpen={isOpen}
      onClose={handleClose}
      title="Transfer Stock"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sourceWarehouseId" className="text-text font-medium text-sm">
            Source
          </label>
          <select
            id="sourceWarehouseId"
            className="border-border bg-surface text-text rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('sourceWarehouseId')}
          >
            <option value="">Select source</option>
            {activeWarehouses.map((w) => (
              <option key={w.warehouseId} value={w.warehouseId}>
                {w.name}
              </option>
            ))}
          </select>
          {errors.sourceWarehouseId && (
            <p className="text-red-500 text-xs mt-1">{errors.sourceWarehouseId.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="destinationWarehouseId" className="text-text font-medium text-sm">
            Destination
          </label>
          <select
            id="destinationWarehouseId"
            className="border-border bg-surface text-text rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('destinationWarehouseId')}
          >
            <option value="">Select destination</option>
            {activeWarehouses.map((w) => (
              <option key={w.warehouseId} value={w.warehouseId}>
                {w.name}
              </option>
            ))}
          </select>
          {errors.destinationWarehouseId && (
            <p className="text-red-500 text-xs mt-1">{errors.destinationWarehouseId.message}</p>
          )}
        </div>

        <Input
          error={errors.quantity?.message}
          label="Quantity to transfer"
          type="number"
          step="0.001"
          {...register('quantity', { valueAsNumber: true })}
        />

        <div className="flex items-center justify-end gap-3 mt-2">
          <Button variant="ghost" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button isLoading={isSubmitting} type="submit">
            Transfer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
