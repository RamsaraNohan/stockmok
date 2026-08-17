# G0 Parallel Readiness Baseline

**Repository:** `C:\Users\ramsa\stockflow`  
**Captured:** 2026-08-17  
**Git at capture:** absent; initialization is an authorized G0 operation.

## Tooling

```text
REQUIRED_NODE = 22
VALIDATION_NODE = v22.23.2
NPM = 11.9.0
WORKSPACE_JAVA = Temurin 21.0.12+8
SYSTEM_JAVA = 17.0.12 (not used for emulator validation)
FIREBASE_CLI = 15.27.0
GIT = 2.53.0.windows.1
```

## Current architecture and readiness

```text
A3R_P = COMPLETE
CODEX_C1_FOUNDATION = PASS AFTER G0 INDEX REPAIR
A3R_P2 = COMPLETE
A3R_P2_INDEPENDENT_REVIEW = PASS

ACTIVE_QUERY_IDS = 92
ACTIVE_INDEX_IDS = 67
ACTIVE_COMMAND_IDS = 38
ACTIVE_INVARIANT_IDS = 26
ACTIVE_DERIVED_CONTRACT_IDS = 14
PRODUCT_LIST_MATRIX_INDEXES = 32
```

## Protected/shared snapshot

```text
docs/database-final/** + docs/implementation/**
FILES = 23
SHA256_TREE = 6640EFCED4FBC361CB85B1EF7F6D1A1F9F652F3E65E004D99C9BE576C2F238C7

packages/shared source/config
FILES = 16
SHA256_TREE = 212E869AE0D8153BAF0DC8DC77A40C12EC3119554053773F4F7C8FAF65324D5E
```

The G0 repairs changed no frozen authority and no `packages/shared/**` source. Authorized changes before
Git freeze are the Q-044/Q-048 evidence classification correction, its formatting-only normalization,
the C1 index generator/verifier repair, regenerated `firestore.indexes.json`, and G0 operational evidence.

## Existing local/transient artifacts

`node_modules/`, `.tools/` (including workspace Java 21), `packages/shared/dist/`, `functions/lib/`, and
`firestore-debug.log` exist locally and are ignored. The deleted A3R-P2 probe remains absent. No unknown
file was deleted.

## Intended G0 operations

Validate under Node 22 and Java 21; audit secrets/staging; establish line-ending policy; initialize `main`;
create one baseline commit and tag; create four branches and three isolated sibling worktrees. No remote,
deployment, or production feature implementation is authorized.
