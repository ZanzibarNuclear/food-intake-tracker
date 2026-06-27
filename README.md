# food-intake-tracker

A mobile-first food and weight tracker — log meals by nickname, watch calories and protein against daily targets, and track a subjective nutrition quality score (1–10).

## Status

**Building the vision app** — see [docs/vision-implementation-plan.md](./docs/vision-implementation-plan.md) for the active plan.

The original spreadsheet-clone prototype (tab UI, localStorage) remains in the codebase temporarily for reference. Specs for that prototype live in [docs/legacy/](./docs/legacy/).

## Docs

- [Documentation index](./docs/README.md)
- [Vision product plan](./docs/vision-plan.md)
- [Implementation plan (review)](./docs/vision-implementation-plan.md)
- [Prototype review](./docs/prototype-review.md)

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

Ported from `Daily Intake.xlsx` — 32 foods, meal logging, daily summaries, and weight tracking toward a goal.

Regenerate seed data:

```bash
npm run generate:seed
```
