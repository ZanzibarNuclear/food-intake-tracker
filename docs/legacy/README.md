# Legacy — Prototype Reference

These documents describe the **first workbook-faithful prototype** (tab-based UI in `app.vue`, localStorage overlay, Phase 1–3 implementation).

The active app direction is documented in the parent [docs/README.md](../README.md) and [vision-implementation-plan.md](../vision-implementation-plan.md).

**Do not implement new features from these files.** Use them only to verify calculation parity or understand earlier decisions.

| File | Notes |
|------|-------|
| `product-spec.md` | Strict workbook port; explicit non-goals (no AI, no charts v1) |
| `implementation-plan.md` | Four-phase prototype plan (discovery → prototype → Neon → polish) |
| `spa-architecture.md` | Tab UI + localStorage persistence design |
| `questions.md` | Assumptions log |
| `postgres-schema-v1.sql` | Original schema before v2 evolution |

Code legacy (until vision build removes it):

- `app.vue` — monolithic four-tab prototype UI
- `composables/useTrackerStore.ts` — localStorage + API hybrid store
- `server/utils/repository.ts` — v1 repository
- `server/api/*.ts` — unprefixed API routes
