import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { ConnectedReceiveOrderScreen } from '@/features/connected-orders/ConnectedReceiveOrderScreen';
import { ReceiveOrderScreen } from '@/features/procurement/receiving/ReceiveOrderScreen';
import { isConnectedOrder } from '@/services/connected-orders/connectedOrderService';
import { useRepositories } from '@/services/data/useRepositories';
import { ErrorState } from '@/ui/primitives/ErrorState';
import { Skeleton } from '@/ui/primitives/Skeleton';

export function ReceiveOrderRouteScreen() {
  const { poId = '' } = useParams<{ readonly poId: string }>();
  const repositories = useRepositories();
  const orderQuery = useQuery({
    queryKey: ['order', poId],
    queryFn: async () => repositories?.procurement.getOrder(poId),
    enabled: Boolean(repositories && poId),
  });

  if (orderQuery.isLoading) return <Skeleton className="h-96 w-full" />;
  if (orderQuery.isError || !orderQuery.data) {
    return <ErrorState message="The order could not be loaded." title="Receiving unavailable" />;
  }
  if (isConnectedOrder(orderQuery.data)) {
    return <ConnectedReceiveOrderScreen initialOrder={orderQuery.data} poId={poId} />;
  }
  return <ReceiveOrderScreen />;
}
