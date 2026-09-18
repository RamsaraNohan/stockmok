import type {
  Member,
  Organization,
  OrganizationSettings,
  Role,
  UserMembership,
} from '@stockmok/shared';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { fetchUserMembershipsFromServer } from '@/data/adapters/authAdapter';
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
  /**
   * True when the most recent membership read failed outright (e.g. the
   * network is genuinely unreachable) rather than authoritatively resolving
   * to zero memberships. Consumers that decide onboarding-vs-workspace from
   * `memberships` (GuestGuard) must check this first — a failed read is not
   * evidence the account has no workspace.
   */
  readonly membershipsError: boolean;
  readonly isWorkspaceDataLoading: boolean;
  readonly setActiveHandle: (handle: string) => Promise<boolean>;
  readonly refreshMemberships: () => Promise<readonly UserMembership[]>;
  readonly refreshWorkspaceData: () => Promise<void>;
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
  const [membershipsError, setMembershipsError] = useState(false);
  const [isWorkspaceDataLoading, setIsWorkspaceDataLoading] = useState(false);
  // Guards against overlapping loadMemberships calls applying their result
  // out of order — e.g. StrictMode's dev-mode double effect invocation
  // starts two concurrent requests for the same uid, each opening its own
  // Firestore channel; only the most recently *started* call's result may
  // ever reach state, regardless of which happens to resolve first.
  const membershipRequestId = useRef(0);

  const loadMemberships = useCallback(async (uid: string) => {
    const requestId = ++membershipRequestId.current;
    try {
      // Forced-server read: GuestGuard treats an authoritative empty result
      // as "route to onboarding," so a possibly-premature empty read from
      // cache (before the Firestore connection finishes establishing) must
      // not be allowed to masquerade as that fact.
      const list = await fetchUserMembershipsFromServer(uid);
      if (requestId === membershipRequestId.current) {
        setMemberships(list);
        setMembershipsError(false);
      }
      return list;
    } catch {
      if (requestId === membershipRequestId.current) {
        setMemberships([]);
        setMembershipsError(true);
      }
      return [];
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      queueMicrotask(() => {
        if (isMounted) {
          setMemberships([]);
          setMembershipsError(false);
          setActiveMembership(null);
          setActiveOrg(null);
          setActiveSettings(null);
          setActiveMemberDoc(null);
          setIsWorkspaceDataLoading(false);
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
  }, [loadMemberships, user]);

  useEffect(() => {
    let isMounted = true;

    if (!activeMembership || !user) {
      queueMicrotask(() => {
        if (isMounted) {
          setActiveOrg(null);
          setActiveSettings(null);
          setActiveMemberDoc(null);
          setIsWorkspaceDataLoading(false);
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
      } finally {
        if (isMounted) {
          setIsWorkspaceDataLoading(false);
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

  const setActiveHandle = useCallback(
    async (targetHandle: string): Promise<boolean> => {
      if (!user) return false;

      // Purge private cached queries before exposing new organization surface.
      queryClient.clear();
      setActiveOrg(null);
      setActiveSettings(null);
      setActiveMemberDoc(null);

      const freshMemberships = await loadMemberships(user.uid);
      const target = freshMemberships.find(
        (membership) =>
          membership.handle.toLowerCase() === targetHandle.toLowerCase() &&
          membership.status === 'ACTIVE',
      );

      if (target) {
        setIsWorkspaceDataLoading(true);
        setActiveMembership(target);
        return true;
      }

      setActiveMembership(null);
      setIsWorkspaceDataLoading(false);
      return false;
    },
    [loadMemberships, queryClient, user],
  );

  const refreshMemberships = useCallback(async (): Promise<readonly UserMembership[]> => {
    if (!user) return [];
    return loadMemberships(user.uid);
  }, [loadMemberships, user]);

  const refreshWorkspaceData = useCallback(async (): Promise<void> => {
    if (!activeMembership) return;
    setIsWorkspaceDataLoading(true);
    try {
      const [org, settings] = await Promise.all([
        fetchOrganization(activeMembership.organizationId),
        fetchOrganizationSettings(activeMembership.organizationId),
      ]);
      setActiveOrg(org);
      setActiveSettings(settings);
    } finally {
      setIsWorkspaceDataLoading(false);
    }
  }, [activeMembership]);

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
        membershipsError,
        isWorkspaceDataLoading,
        setActiveHandle,
        refreshMemberships,
        refreshWorkspaceData,
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
