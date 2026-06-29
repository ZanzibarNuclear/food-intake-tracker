# food-intake-tracker

A mobile-first food and weight tracker — log meals by nickname, watch calories and protein against daily targets, and track a subjective nutrition quality score (1–10).

## Status

**Rebuilding v1** — workbook parity plus charts, food catalog, fast logging, and AI food suggest. See [docs/product-spec.md](./docs/product-spec.md).

## Docs

- [Documentation index](./docs/README.md)
- [Product spec (active)](./docs/product-spec.md)
- [Architecture](./docs/spa-architecture.md)
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

Regenerate seed data from the source workbook:

```bash
python3 tools/extract_seed.py "docs/original/Daily Intake - 2026-06-28.xlsx" server/data/seed.json
```
