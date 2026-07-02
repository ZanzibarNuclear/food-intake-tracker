# food-intake-tracker

A mobile-first food and weight tracker — log meals by nickname, watch calories and protein against daily targets, and track a subjective nutrition quality score (1–10).

## Status

**Ready to build v1** — workbook parity, dashboard charts, and a pre-loaded food catalog. See [docs/implementation-plan.md](./docs/implementation-plan.md).

A first prototype exists (`app.vue`, partial API). The plan describes what to keep, replace, and build next.

## Setup

```bash
npm install
cp .env.example .env
# Set DATABASE_URL to your Neon Postgres connection string
npm run db:setup
npm run dev
```

## Checks

```bash
npm test
npm run typecheck
npm run build
```

## Source workbook

Personal data is ported from `docs/original/Daily Intake - 2026-06-28.xlsx` (97 foods, 55 meals, 4 weights).

```bash
npm run generate:seed
```
