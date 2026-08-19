// The complete Release A/B callable surface — **38 of 38** (DB-06 §1).
//
//   B2  17  organization, team and master data
//           `C-01`…`C-12`, `C-35a`, `C-35b`, `C-36`, `C-37`, `C-38`
//   B3   6  inventory, transfer and private procurement
//           `C-13`, `C-14`, `C-15`, `C-16`, `C-17`, `C-33`
//   B4  15  connected B-Lite: connections, partner catalog, mappings and the
//           connected purchase-order lifecycle
//           `C-18`…`C-31`, `C-34`
//
// Each is registered once through `commandRegistry`, which asserts its id,
// dot-case name and idempotency flag against `commandDefinitions` — the frozen
// catalog — at import, so drift is a startup error rather than a silent gap.
// Each is exported individually under its camelCase deployment name as its own
// `onCall` function, so Firebase deploys, logs and redeploys every command
// separately. `functions/src/commands/coverage.ts` records which phase owns
// which id, and `commandRegistry.missingIds()` is now empty.
import {
  categoryArchive as categoryArchiveDef,
  categoryRestore as categoryRestoreDef,
} from './commands/category.js';
import {
  cpoCancel as cpoCancelDef,
  cpoDraftSave as cpoDraftSaveDef,
  cpoReceive as cpoReceiveDef,
  cpoRespond as cpoRespondDef,
  cpoShip as cpoShipDef,
  cpoSubmit as cpoSubmitDef,
} from './commands/connected-po.js';
import {
  connectionDisable as connectionDisableDef,
  connectionRequest as connectionRequestDef,
  connectionRespond as connectionRespondDef,
} from './commands/connection.js';
import {
  mappingCreate as mappingCreateDef,
  mappingDisable as mappingDisableDef,
} from './commands/mapping.js';
import {
  orgCreate as orgCreateDef,
  orgUpdateSettings as orgUpdateSettingsDef,
} from './commands/org.js';
import {
  partnerCatalogList as partnerCatalogListDef,
  partnerCatalogLookupBySku as partnerCatalogLookupBySkuDef,
  partnerCatalogPublish as partnerCatalogPublishDef,
  partnerCatalogUnpublish as partnerCatalogUnpublishDef,
} from './commands/partner-catalog.js';
import { partnerSetStatus as partnerSetStatusDef } from './commands/partner.js';
import {
  poCancel as poCancelDef,
  poOrder as poOrderDef,
  poReceive as poReceiveDef,
} from './commands/purchase-order.js';
import {
  productCreate as productCreateDef,
  productSetStatus as productSetStatusDef,
  productUpdate as productUpdateDef,
} from './commands/product.js';
import {
  stockAdjust as stockAdjustDef,
  stockRecordOpeningBalance as stockRecordOpeningBalanceDef,
  stockTransfer as stockTransferDef,
} from './commands/stock.js';
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

// ── B3 · inventory, transfer, private procurement ──────────────────────────
export const stockRecordOpeningBalance = toCallable(
  commandRegistry.register(stockRecordOpeningBalanceDef),
);
export const stockAdjust = toCallable(commandRegistry.register(stockAdjustDef));
export const stockTransfer = toCallable(commandRegistry.register(stockTransferDef));
export const poOrder = toCallable(commandRegistry.register(poOrderDef));
export const poCancel = toCallable(commandRegistry.register(poCancelDef));
export const poReceive = toCallable(commandRegistry.register(poReceiveDef));

// ── B4 · connected B-Lite: connections, catalog, mappings, connected orders ──
export const connectionRequest = toCallable(commandRegistry.register(connectionRequestDef));
export const connectionRespond = toCallable(commandRegistry.register(connectionRespondDef));
export const connectionDisable = toCallable(commandRegistry.register(connectionDisableDef));
export const partnerCatalogPublish = toCallable(commandRegistry.register(partnerCatalogPublishDef));
export const partnerCatalogUnpublish = toCallable(
  commandRegistry.register(partnerCatalogUnpublishDef),
);
export const partnerCatalogList = toCallable(commandRegistry.register(partnerCatalogListDef));
export const partnerCatalogLookupBySku = toCallable(
  commandRegistry.register(partnerCatalogLookupBySkuDef),
);
export const mappingCreate = toCallable(commandRegistry.register(mappingCreateDef));
export const mappingDisable = toCallable(commandRegistry.register(mappingDisableDef));
export const cpoDraftSave = toCallable(commandRegistry.register(cpoDraftSaveDef));
export const cpoSubmit = toCallable(commandRegistry.register(cpoSubmitDef));
export const cpoRespond = toCallable(commandRegistry.register(cpoRespondDef));
export const cpoShip = toCallable(commandRegistry.register(cpoShipDef));
export const cpoReceive = toCallable(commandRegistry.register(cpoReceiveDef));
export const cpoCancel = toCallable(commandRegistry.register(cpoCancelDef));
