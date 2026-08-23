import type { PurchaseOrder } from '@stockmok/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { useRepositories } from '@/services/data/useRepositories';
import { useWorkspace } from '@/services/workspace/useWorkspace';

export function useConnectedOrderReadModel(poId: string, initialOrder?: PurchaseOrder) {
  const repositories = useRepositories();
  const queryClient = useQueryClient();
  const { activeMembership } = useWorkspace();
  const orderKey = useMemo(() => ['order', poId] as const, [poId]);

  const orderQuery = useQuery({
    queryKey: orderKey,
    queryFn: async () => repositories?.procurement.getOrder(poId),
    enabled: Boolean(repositories && poId),
    initialData: initialOrder,
  });
  const itemsQuery = useQuery({
    queryKey: ['order-items', poId],
    queryFn: async () => repositories?.procurement.listOrderItems(poId),
    enabled: Boolean(repositories && poId),
  });
  const historyQuery = useQuery({
    queryKey: ['order-history', poId],
    queryFn: async () => repositories?.procurement.listOrderHistory(poId),
    enabled: Boolean(repositories && poId),
  });

  useEffect(() => {
    if (!repositories || !poId) return undefined;
    return repositories.procurement.subscribeOrder(
      poId,
      (order) => {
        queryClient.setQueryData(orderKey, order);
      },
      () => {
        void queryClient.invalidateQueries({ queryKey: orderKey });
      },
    );
  }, [activeMembership?.organizationId, orderKey, poId, queryClient, repositories]);

  return { orderQuery, itemsQuery, historyQuery };
}
