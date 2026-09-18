import { createStockmokRepositories } from '@stockmok/data';
import { useMemo } from 'react';

import { db } from '@/data/firebase/client';
import { useAuth } from '@/services/auth/useAuth';
import { useWorkspace } from '@/services/workspace/useWorkspace';

export function useRepositories() {
  const { user } = useAuth();
  const { activeMembership } = useWorkspace();

  return useMemo(() => {
    if (!user || !activeMembership) return null;
    return createStockmokRepositories(db, {
      orgId: activeMembership.organizationId,
      uid: user.uid,
    });
  }, [user, activeMembership]);
}
