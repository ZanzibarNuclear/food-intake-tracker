# food-intake-tracker
A simple way to keep an eye on what goes into my stomach

## Prototype

This is a NuxtJS port of `Daily Intake.xlsx`. It keeps the spreadsheet's scope:

- Dashboard targets and daily totals
- Food nickname catalog
- Meal logging with quantity-based calories, protein, and nutrition points
- Daily summaries with 7-day averages
- Weight logging

## Setup

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Set `DATABASE_URL` to the Neon Postgres connection string.

Load the schema and workbook seed data:

```bash
npm run db:setup
```

Run the app:

```bash
npm run dev
```

Run checks:

```bash
npm test
npm run typecheck
npm run build
```
