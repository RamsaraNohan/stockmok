# Stockmok Agent Guidance

Before coding, read `docs/implementation/IMPLEMENTATION_CHECKPOINT.md`, `INTEGRATION_STATUS.md`,
`OWNERSHIP_MAP.md`, and the relevant frozen contracts.

- `docs/database-final/**` and `docs/implementation/**` outrank implementation guesses.
- Use the exact active ID registries; never infer contiguous numeric ranges.
- Never invent Firestore paths, enums, commands, or state transitions.
- Preserve tenant isolation and lane ownership.
- Quantities are integer milli-units; money is integer minor units.
- Use Firestore `Timestamp` and the frozen `roundHalfUp` contract.
- Do not modify `packages/shared/**` independently; raise a narrow shared-foundation patch.
- Run the required validation and stop on a genuine authority contradiction.
- Never deploy production Firebase without explicit owner authorization.
