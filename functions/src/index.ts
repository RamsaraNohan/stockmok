// B1 establishes the security and command foundation and exports no callable.
//
// Command bodies belong to B2 (organization, team, master data), B3 (inventory,
// transfer, private procurement) and B4 (connected B-Lite). Each will export its
// commands here individually — `export const stockTransfer = toCallable(...)` —
// so Firebase deploys each as a separate function with its own logs, metrics and
// redeploy (DB-06 §1). `functions/src/commands/coverage.ts` records which phase
// owns which id.
export {};
