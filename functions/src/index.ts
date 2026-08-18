// B2 fills in the organization, team and master-data command bodies — the
// first 17 of the 38 active callables (`C-01…C-12`, `C-35a`, `C-35b`, `C-36`,
// `C-37`, `C-38`; DB-06 §1). Each is registered once through `commandRegistry`
// (which asserts its id, dot-case name and idempotency flag against
// `commandDefinitions` — the frozen catalog) and exported individually, under
// its camelCase deployment name, as its own `onCall` function — so Firebase
// deploys, logs and redeploys each command separately. B3 and B4 add the
// remaining 21 the same way. `functions/src/commands/coverage.ts` records
// which phase owns which id.
import {
  categoryArchive as categoryArchiveDef,
  categoryRestore as categoryRestoreDef,
} from './commands/category.js';
import {
  orgCreate as orgCreateDef,
  orgUpdateSettings as orgUpdateSettingsDef,
} from './commands/org.js';
import { partnerSetStatus as partnerSetStatusDef } from './commands/partner.js';
import {
  productCreate as productCreateDef,
  productSetStatus as productSetStatusDef,
  productUpdate as productUpdateDef,
} from './commands/product.js';
import {
  teamAcceptInvitation as teamAcceptInvitationDef,
  teamChangeMemberRole as teamChangeMemberRoleDef,
  teamCreateInvitation as teamCreateInvitationDef,
  teamRevokeInvitation as teamRevokeInvitationDef,
  teamSetMemberStatus as teamSetMemberStatusDef,
} from './commands/team.js';
import { userBootstrapProfile as userBootstrapProfileDef } from './commands/user.js';
import {
  warehouseArchive as warehouseArchiveDef,
  warehouseRestore as warehouseRestoreDef,
  warehouseSetDefault as warehouseSetDefaultDef,
} from './commands/warehouse.js';
import { commandRegistry, toCallable } from './core/index.js';

export const orgCreate = toCallable(commandRegistry.register(orgCreateDef));
export const orgUpdateSettings = toCallable(commandRegistry.register(orgUpdateSettingsDef));
export const userBootstrapProfile = toCallable(commandRegistry.register(userBootstrapProfileDef));
export const teamCreateInvitation = toCallable(commandRegistry.register(teamCreateInvitationDef));
export const teamRevokeInvitation = toCallable(commandRegistry.register(teamRevokeInvitationDef));
export const teamAcceptInvitation = toCallable(commandRegistry.register(teamAcceptInvitationDef));
export const teamChangeMemberRole = toCallable(commandRegistry.register(teamChangeMemberRoleDef));
export const teamSetMemberStatus = toCallable(commandRegistry.register(teamSetMemberStatusDef));
export const productCreate = toCallable(commandRegistry.register(productCreateDef));
export const productUpdate = toCallable(commandRegistry.register(productUpdateDef));
export const productSetStatus = toCallable(commandRegistry.register(productSetStatusDef));
export const warehouseArchive = toCallable(commandRegistry.register(warehouseArchiveDef));
export const categoryArchive = toCallable(commandRegistry.register(categoryArchiveDef));
export const categoryRestore = toCallable(commandRegistry.register(categoryRestoreDef));
export const warehouseSetDefault = toCallable(commandRegistry.register(warehouseSetDefaultDef));
export const warehouseRestore = toCallable(commandRegistry.register(warehouseRestoreDef));
export const partnerSetStatus = toCallable(commandRegistry.register(partnerSetStatusDef));
