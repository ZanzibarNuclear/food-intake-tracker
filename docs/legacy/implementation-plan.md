# Implementation Plan

## Phase 1: Discovery and Specification

- Extract workbook sheets, formulas, and sample data.
- Write product specification.
- Write SPA architecture.
- Write questions and assumptions log.
- Commit as the first save point.

## Phase 2: Working Prototype

- Scaffold NuxtJS, TypeScript, and Vitest.
- Convert workbook data into seed JSON.
- Implement domain types and spreadsheet-equivalent calculations.
- Build mobile-first dashboard, meal log, food catalog, and weight views.
- Persist prototype edits in local storage.
- Add unit tests while implementing calculations.
- Run tests and start the dev server.
- Commit as the second save point.

## Phase 3: Neon/Postgres Integration

- Add migration files for Postgres schema.
- Add server repository using `DATABASE_URL`.
- Add seed/import command from workbook JSON.
- Add API tests for repository behavior.
- Commit as the database save point.

## Phase 4: Polish

- Improve tablet layout and empty/error states.
- Add edit/delete affordances where the spreadsheet equivalents need correction.
- Add lightweight charts only if they directly represent existing workbook summaries.
- Commit as the polish save point.
