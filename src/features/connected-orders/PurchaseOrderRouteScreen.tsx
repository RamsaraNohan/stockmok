import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { ConnectedOrderScreen } from '@/features/connected-orders/ConnectedOrderScreen';
import { PurchaseOrderDetailScreen } from '@/features/procurement/purchase-orders/PurchaseOrderDetailScreen';
import { isConnectedOrder } from '@/services/connected-orders/connectedOrderService';
import { useRepositories } from '@/services/data/useRepositories';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Skeleton } from '@/ui/primitives/Skeleton';

export function PurchaseOrderRouteScreen() {
  const { poId = '' } = useParams<{ readonly poId: string }>();
  const repositories = useRepositories();
  const orderQuery = useQuery({
    queryKey: ['order', poId],
    queryFn: async () => repositories?.procurement.getOrder(poId),
    enabled: Boolean(repositories && poId),
  });

  if (orderQuery.isLoading) return <Skeleton className="h-96 w-full" />;
  if (orderQuery.isError || !orderQuery.data) {
    return (
      <ErrorState message="The purchase order could not be loaded." title="Order unavailable" />
    );
  }
  if (isConnectedOrder(orderQuery.data)) {
    return <ConnectedOrderScreen initialOrder={orderQuery.data} poId={poId} />;
  }
  return <PurchaseOrderDetailScreen />;
}
