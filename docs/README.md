# Documentation Index

## Active (v1)

| Doc | Purpose |
|-----|---------|
| [product-spec.md](./product-spec.md) | **Active product spec** — scope, UX, charts, catalog, AI, acceptance |
| [spa-architecture.md](./spa-architecture.md) | Stack, modules, data flow |
| [postgres-schema.sql](./postgres-schema.sql) | Database DDL (v2 — catalog, favorites, recents) |
| [original/Daily Intake - 2026-06-28.xlsx](./original/Daily%20Intake%20-%202026-06-28.xlsx) | Personal workbook import |

## Reference

| Doc | Purpose |
|-----|---------|
| [prototype-review.md](./prototype-review.md) | Analysis of the first prototype attempt |
| [workbook-summary.json](./workbook-summary.json) | Machine-readable extract (may be stale) |

## Superseded / deferred indefinitely

| Doc | Purpose |
|-----|---------|
| [vision-plan.md](./vision-plan.md) | Earlier expansive plan — merged into product-spec where relevant |
| [vision-implementation-plan.md](./vision-implementation-plan.md) | Old phased plan for separate vision app |

## Legacy (first prototype code + docs)

[legacy/](./legacy/) — first spreadsheet-clone attempt. Reference only.

Reuse: `utils/nutrition.ts`, `types/nutrition.ts`, tests, extract tooling.  
Replace: `app.vue`, `useTrackerStore.ts` (localStorage).
