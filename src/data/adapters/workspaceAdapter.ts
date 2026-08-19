import type {
  Member,
  Organization,
  OrganizationDirectory,
  OrganizationSettings,
} from '@stockmok/shared';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

import { db } from '../firebase/client';

// Q-001: Public handle lookup from organizationDirectory/{handle}
export async function fetchDirectoryByHandle(
  handle: string,
): Promise<OrganizationDirectory | null> {
  const dirRef = doc(db, 'organizationDirectory', handle.toLowerCase());
  const snap = await getDoc(dirRef);
  if (!snap.exists()) return null;
  return snap.data() as OrganizationDirectory;
}

// Q-006: Organization document organizations/{orgId}
export async function fetchOrganization(orgId: string): Promise<Organization | null> {
  const orgRef = doc(db, 'organizations', orgId);
  const snap = await getDoc(orgRef);
  if (!snap.exists()) return null;
  return snap.data() as Organization;
}

// Q-007: Organization settings organizations/{orgId}/settings/main
export async function fetchOrganizationSettings(
  orgId: string,
): Promise<OrganizationSettings | null> {
  const settingsRef = doc(db, 'organizations', orgId, 'settings', 'main');
  const snap = await getDoc(settingsRef);
  if (!snap.exists()) return null;
  return snap.data() as OrganizationSettings;
}

// Q-008: Realtime member document organizations/{orgId}/members/{uid}
export function subscribeToMemberDoc(
  orgId: string,
  uid: string,
  onUpdate: (member: Member | null) => void,
  onError?: (err: Error) => void,
): () => void {
  const memberRef = doc(db, 'organizations', orgId, 'members', uid);
  return onSnapshot(
    memberRef,
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
      } else {
        onUpdate(snap.data() as Member);
      }
    },
    (err) => {
      if (onError) onError(err);
    },
  );
}

// C-01: org.create Command Adapter (authorization: AUTHENTICATED)
export function executeCreateOrgCommand(payload: {
  readonly name: string;
  readonly handle: string;
  readonly industry: string;
  readonly country: string;
  readonly currency: string;
  readonly timezone: string;
  readonly warehouseName: string;
  readonly warehouseType: string;
}): Promise<{ readonly organizationId: string }> {
  void payload;
  return Promise.reject(
    new Error(
      'C-01 org.create backend command execution pending promotion. Contract boundary verified.',
    ),
  );
}

// C-03: user.bootstrapProfile Command Adapter (authorization: SELF)
export function executeBootstrapProfileCommand(payload: {
  readonly displayName: string;
}): Promise<void> {
  void payload;
  return Promise.reject(
    new Error(
      'C-03 user.bootstrapProfile backend command execution pending promotion. Contract boundary verified.',
    ),
  );
}

// C-06: team.acceptInvitation Command Adapter (authorization: INVITEE)
export function executeAcceptInvitationCommand(payload: {
  readonly token: string;
}): Promise<{ readonly organizationId: string }> {
  void payload;
  return Promise.reject(
    new Error(
      'C-06 team.acceptInvitation backend command execution pending promotion. Contract boundary verified.',
    ),
  );
}
