# Parallel Integration Policy

1. All feature branches originate from the same verified baseline.
2. No lane independently changes frozen authority or `packages/shared/**`.
3. Each lane commits coherent, reviewable units.
4. Integration occurs only on `integration/parallel-implementation`.
5. Never integrate by overwriting another lane's work.
6. A conflict involving frozen or controlled shared contracts is an integration stop condition.
7. Full validation is rerun after integration.
8. `main` remains frozen and advances only after integrated verification passes.

Default future merge order: `data-c2`, `backend-security`, then `frontend`, unless concrete dependency
evidence requires another order. G0 performs no merge.
