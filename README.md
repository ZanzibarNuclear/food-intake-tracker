# Daily Nutrition Tracker

A mobile-first food and weight tracker — log meals by nickname, watch calories and protein against daily targets, and track a subjective nutrition quality score (1–10).

## Status

**v1 candidate in progress** — workbook data import, DB-first CRUD, dashboard charts, magic-link auth, multi-user data scoping, fast logging, and a starter catalog are wired. See [docs/implementation-plan.md](./docs/implementation-plan.md).

Current focus: finish catalog depth and polish the daily logging loop.

## Setup

```bash
npm install
cp .env.example .env.local
# Set DATABASE_URL, BETTER_AUTH_SECRET, and BETTER_AUTH_URL
npm run auth:migrate
npm run db:setup
npm run dev
```

`.env.local` is the local source of truth for secrets and connection strings. Nuxt reads it for the app server and exposes server-only values through `runtimeConfig`; standalone database/auth scripts load the same file before falling back to `.env`.

For local development without Resend, magic links are printed in the dev server console. To send email, set `RESEND_API_KEY` and `AUTH_EMAIL_FROM`.

To seed the workbook data for a user, sign in once so Better Auth creates the user, then run:

```bash
USER_EMAIL="you@example.com" npm run db:seed:user
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
