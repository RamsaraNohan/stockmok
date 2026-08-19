import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from '@/services/workspace/useWorkspace';
import { executeStockRecordOpeningBalanceCommand } from '@/services/stock/stockService';
import { Button } from '@/ui/primitives/Button';
import { Input } from '@/ui/primitives/Input';
import { Modal } from '@/ui/primitives/Modal';

const schema = z.object({
  quantity: z.number().positive('Quantity must be greater than 0'),
});

type FormData = z.infer<typeof schema>;

export interface OpeningBalanceDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly productId: string;
  readonly warehouseId: string;
  readonly warehouseName: string;
}

export function OpeningBalanceDialog({
  isOpen,
  onClose,
  productId,
  warehouseId,
  warehouseName,
}: OpeningBalanceDialogProps) {
  const { activeOrg } = useWorkspace();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!activeOrg?.organizationId) return;

    try {
      await executeStockRecordOpeningBalanceCommand(activeOrg.organizationId, {
        productId,
        warehouseId,
        quantityMilli: Math.round(data.quantity * 1000),
        effectiveAtMillis: new Date().getTime(),
      });
      await queryClient.invalidateQueries({ queryKey: ['productBalances', productId] });
      await queryClient.invalidateQueries({ queryKey: ['movements', productId] });
      handleClose();
    } catch (err) {
      alert('Failed to record opening balance');
      console.error(err);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      description={`Record the initial stock balance for this product in ${warehouseName}.`}
      isOpen={isOpen}
      onClose={handleClose}
      title="Record Opening Balance"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
      >
        <Input
          error={errors.quantity?.message}
          label="Quantity"
          type="number"
          step="0.001"
          {...register('quantity', { valueAsNumber: true })}
        />

        <div className="flex items-center justify-end gap-3 mt-2">
          <Button variant="ghost" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button isLoading={isSubmitting} type="submit">
            Save Balance
          </Button>
        </div>
      </form>
    </Modal>
  );
}
