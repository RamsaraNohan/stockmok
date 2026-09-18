import {
  executePartnerCreate as adapterCreate,
  executePartnerUpdate as adapterUpdate,
  executePartnerSetStatusCommand as adapterSetStatus,
} from '@/data/adapters/partnerAdapter';
import type { PartnerCreatePayload, PartnerUpdatePayload } from '@/data/adapters/partnerAdapter';
import type { PartnerStatus } from '@stockmok/shared';

export type { PartnerCreatePayload, PartnerUpdatePayload };

export async function executePartnerCreate(
  orgId: string,
  partnerId: string,
  payload: PartnerCreatePayload,
  uid: string,
): Promise<void> {
  return adapterCreate(orgId, partnerId, payload, uid);
}

export async function executePartnerUpdate(
  orgId: string,
  partnerId: string,
  payload: PartnerUpdatePayload,
  uid: string,
): Promise<void> {
  return adapterUpdate(orgId, partnerId, payload, uid);
}

export async function executePartnerSetStatusCommand(
  orgId: string,
  partnerId: string,
  status: PartnerStatus,
): Promise<void> {
  return adapterSetStatus(orgId, partnerId, status);
}
