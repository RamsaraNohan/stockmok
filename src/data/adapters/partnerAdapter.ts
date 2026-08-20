import { httpsCallable } from 'firebase/functions';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, functions } from '../firebase/client';
import type { PrivatePartner, PartnerStatus } from '@stockmok/shared';
import type { CommandResult } from '@stockmok/shared';

export type PartnerCreatePayload = Omit<
  PrivatePartner,
  'partnerId' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'status' | 'ordersPlacedCount'
>;
export type PartnerUpdatePayload = Partial<
  Omit<PrivatePartner, 'partnerId' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'status' | 'ordersPlacedCount'>
>;

export async function executePartnerCreate(
  orgId: string,
  partnerId: string,
  payload: PartnerCreatePayload,
  uid: string,
): Promise<void> {
  const partnerRef = doc(db, 'organizations', orgId, 'privatePartners', partnerId);
  const data = {
    ...payload,
    partnerId,
    status: 'ACTIVE',
    ordersPlacedCount: 0,
    createdAt: serverTimestamp(),
    createdBy: uid,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };
  await setDoc(partnerRef, data);
}

export async function executePartnerUpdate(
  orgId: string,
  partnerId: string,
  payload: PartnerUpdatePayload,
  uid: string,
): Promise<void> {
  const partnerRef = doc(db, 'organizations', orgId, 'privatePartners', partnerId);
  const data = {
    ...payload,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };
  await updateDoc(partnerRef, data);
}

// C-38 partner.setStatus
export async function executePartnerSetStatusCommand(
  orgId: string,
  partnerId: string,
  status: PartnerStatus,
): Promise<void> {
  const callable = httpsCallable<unknown, Extract<CommandResult, { ok: true }>>(
    functions,
    'partnerSetStatus',
  );
  // NON-IDEMPOTENT envelope: no operationId
  const payloadEnvelope = {
    orgId,
    payload: { partnerId, status },
  };
  await callable(payloadEnvelope);
}

