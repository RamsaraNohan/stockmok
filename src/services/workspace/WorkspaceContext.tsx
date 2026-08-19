import type {
  Member,
  Organization,
  OrganizationSettings,
  Role,
  UserMembership,
} from '@stockmok/shared';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

import { fetchUserMemberships } from '@/data/adapters/authAdapter';
import {
  fetchOrganization,
  fetchOrganizationSettings,
  subscribeToMemberDoc,
} from '@/data/adapters/workspaceAdapter';
import { useAuth } from '@/services/auth/useAuth';

export interface WorkspaceContextValue {
  readonly memberships: readonly UserMembership[];
  readonly activeMembership: UserMembership | null;
  readonly activeOrg: Organization | null;
  readonly activeSettings: OrganizationSettings | null;
  readonly activeMemberDoc: Member | null;
  readonly activeRole: Role | null;
  readonly isLoading: boolean;
  readonly setActiveHandle: (handle: string) => Promise<boolean>;
  readonly refreshMemberships: () => Promise<readonly UserMembership[]>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { readonly children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [memberships, setMemberships] = useState<readonly UserMembership[]>([]);
  const [activeMembership, setActiveMembership] = useState<UserMembership | null>(null);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [activeSettings, setActiveSettings] = useState<OrganizationSettings | null>(null);
  const [activeMemberDoc, setActiveMemberDoc] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMemberships = async (uid: string) => {
    try {
      const list = await fetchUserMemberships(uid);
      setMemberships(list);
      return list;
    } catch {
      setMemberships([]);
      return [];
    }
  };

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      queueMicrotask(() => {
        if (isMounted) {
          setMemberships([]);
          setActiveMembership(null);
          setActiveOrg(null);
          setActiveSettings(null);
          setActiveMemberDoc(null);
          setIsLoading(false);
        }
      });
      return () => {
        isMounted = false;
      };
    }

    const initMemberships = async () => {
      await loadMemberships(user.uid);
      if (isMounted) {
        setIsLoading(false);
      }
    };

    void initMemberships();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    if (!activeMembership || !user) {
      queueMicrotask(() => {
        if (isMounted) {
          setActiveOrg(null);
          setActiveSettings(null);
          setActiveMemberDoc(null);
        }
      });
      return () => {
        isMounted = false;
      };
    }

    const loadOrgData = async () => {
      try {
        const [org, settings] = await Promise.all([
          fetchOrganization(activeMembership.organizationId),
          fetchOrganizationSettings(activeMembership.organizationId),
        ]);
        if (isMounted) {
          setActiveOrg(org);
          setActiveSettings(settings);
        }
      } catch {
        if (isMounted) {
          setActiveOrg(null);
          setActiveSettings(null);
        }
      }
    };

    void loadOrgData();

    const unsubMember = subscribeToMemberDoc(
      activeMembership.organizationId,
      user.uid,
      (memberDoc) => {
        if (isMounted) {
          setActiveMemberDoc(memberDoc);
        }
      },
    );

    return () => {
      isMounted = false;
      unsubMember();
    };
  }, [activeMembership, user]);

  const setActiveHandle = async (targetHandle: string): Promise<boolean> => {
    if (!user) return false;

    // Purge private cached queries before exposing new organization surface
    queryClient.clear();

    const freshMemberships = await loadMemberships(user.uid);
    const target = freshMemberships.find(
      (m) => m.handle.toLowerCase() === targetHandle.toLowerCase() && m.status === 'ACTIVE',
    );

    if (target) {
      setActiveMembership(target);
      return true;
    } else {
      setActiveMembership(null);
      return false;
    }
  };

  const refreshMemberships = async (): Promise<readonly UserMembership[]> => {
    if (!user) return [];
    return loadMemberships(user.uid);
  };

  const activeRole = activeMemberDoc?.role ?? activeMembership?.role ?? null;

  return (
    <WorkspaceContext.Provider
      value={{
        memberships,
        activeMembership,
        activeOrg,
        activeSettings,
        activeMemberDoc,
        activeRole,
        isLoading,
        setActiveHandle,
        refreshMemberships,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
