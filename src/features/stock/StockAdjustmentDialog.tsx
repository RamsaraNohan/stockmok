import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { executeStockAdjustCommand } from '@/services/stock/stockService';
import { Button } from '@/ui/primitives/Button';
import { Input } from '@/ui/primitives/Input';
import { Modal } from '@/ui/primitives/Modal';

const schema = z.object({
  quantity: z.number().refine((val) => val !== 0, 'Quantity cannot be zero'),
  adjustmentReason: z.enum([
    'RECOUNT_CORRECTION',
    'DAMAGED_IN_STORAGE',
    'EXPIRED',
    'WASTAGE',
    'THEFT_OR_LOSS',
    'OTHER',
  ]),
  note: z.string().max(280).optional(),
});

type FormData = z.infer<typeof schema>;

export interface StockAdjustmentDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly productId: string;
  readonly warehouseId: string;
  readonly warehouseName: string;
}

export function StockAdjustmentDialog({
  isOpen,
  onClose,
  productId,
  warehouseId,
  warehouseName,
}: StockAdjustmentDialogProps) {
  const { activeOrg } = useWorkspace();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      adjustmentReason: 'RECOUNT_CORRECTION',
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!activeOrg?.organizationId) return;

    try {
      await executeStockAdjustCommand(activeOrg.organizationId, {
        productId,
        warehouseId,
        signedQuantityMilli: Math.round(data.quantity * 1000),
        adjustmentReason: data.adjustmentReason,
        ...(data.note ? { note: data.note } : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ['productBalances', productId] });
      await queryClient.invalidateQueries({ queryKey: ['movements', productId] });
      handleClose();
    } catch (err) {
      alert('Failed to adjust stock');
      console.error(err);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      description={`Adjust the stock balance for this product in ${warehouseName}.`}
      isOpen={isOpen}
      onClose={handleClose}
      title="Adjust Stock"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
      >
        <Input
          error={errors.quantity?.message}
          label="Adjustment Quantity (use negative to decrease)"
          type="number"
          step="0.001"
          {...register('quantity', { valueAsNumber: true })}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="adjustmentReason" className="text-text font-medium text-sm">
            Reason
          </label>
          <select
            id="adjustmentReason"
            className="border-border bg-surface text-text rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            {...register('adjustmentReason')}
          >
            <option value="RECOUNT_CORRECTION">Recount Correction</option>
            <option value="DAMAGED_IN_STORAGE">Damaged in Storage</option>
            <option value="EXPIRED">Expired</option>
            <option value="WASTAGE">Wastage</option>
            <option value="THEFT_OR_LOSS">Theft or Loss</option>
            <option value="OTHER">Other</option>
          </select>
          {errors.adjustmentReason && (
            <p className="text-red-500 text-xs mt-1">{errors.adjustmentReason.message}</p>
          )}
        </div>

        <Input
          error={errors.note?.message}
          label="Note (Optional)"
          type="text"
          {...register('note')}
        />

        <div className="flex items-center justify-end gap-3 mt-2">
          <Button variant="ghost" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button isLoading={isSubmitting} type="submit">
            Adjust Balance
          </Button>
        </div>
      </form>
    </Modal>
  );
}
