# food-intake-tracker

A mobile-first food and weight tracker — log meals by nickname, watch calories and protein against daily targets, and track a subjective nutrition quality score (1–10).

## Status

**v1 candidate in progress** — workbook data is imported, DB-first CRUD is wired, dashboard charts render, fast logging exists, and a starter catalog is loaded. See [docs/implementation-plan.md](./docs/implementation-plan.md).

Current focus: finish catalog depth and polish the daily logging loop.

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
