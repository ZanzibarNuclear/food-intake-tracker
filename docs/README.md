# Documentation

| Doc | Purpose |
|-----|---------|
| [**features.md**](./features.md) | **Feature specs** — what to build (one section per feature) |
| [**implementation-plan.md**](./implementation-plan.md) | Architecture, phases, acceptance criteria |
| [`../db/schema.sql`](../db/schema.sql) | Operational app database schema |
| [original/Daily Intake - 2026-06-28.xlsx](./original/Daily%20Intake%20-%202026-06-28.xlsx) | Personal workbook import source |

**Regenerate personal seed from workbook:**

```bash
npm run generate:seed
```

**Prepare a local or preview database:**

```bash
npm run auth:migrate
npm run db:migrate
npm run db:seed:catalog
```

**Seed workbook data for one signed-in user:**

```bash
USER_EMAIL="you@example.com" npm run db:seed:user
```

**Regenerate starter catalog:**

```bash
npm run generate:catalog
```
