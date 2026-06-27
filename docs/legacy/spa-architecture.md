# SPA Architecture

## Stack

- NuxtJS for the web app, server routes, and mobile-first rendering.
- Vue 3 Composition API for local interaction.
- TypeScript for app and calculation logic.
- Vitest for unit tests.
- Postgres on Neon for production persistence.

## Application Shape

The first viewport is the usable tracker, not a landing page. The SPA uses four primary tabs:

- Dashboard: target cards, today's totals, weight status, recent daily summaries.
- Log: meal entry form and recent meal list.
- Foods: searchable food catalog and add/edit form.
- Weight: weight entry form and weight history.

## Client Modules

- `app.vue`: shell, navigation tabs, and screen layout.
- `types/nutrition.ts`: shared domain types.
- `utils/nutrition.ts`: spreadsheet-equivalent calculations.
- `utils/dates.ts`: ISO date helpers.
- `composables/useTrackerStore.ts`: prototype state and API boundary.

## Server/API Boundary

First prototype:

- Uses seeded workbook data served by Nuxt/Nitro.
- Keeps edits in browser local storage for a local, self-contained prototype.
- Keeps calculation rules shared in TypeScript.

Production wave:

- Replace prototype persistence with server routes backed by Postgres.
- Use Neon `DATABASE_URL`.
- Keep calculations either in app services or database views, with tests proving parity.

## Postgres Data Model

Tables:

- `settings`: singleton target values.
- `foods`: food nickname catalog.
- `meal_entries`: logged meals by date and food.
- `weight_entries`: logged weights by date.

Important constraints:

- `foods.name` unique.
- Numeric values use `numeric` to avoid floating point surprises in persisted nutrition facts.
- Meal entries reference foods by ID in production, while the prototype preserves workbook food-name lookup behavior.

## Data Flow

1. App loads seeded tracker data.
2. Client calculates dashboard and summaries from foods, meals, weights, and settings.
3. User edits update local state immediately.
4. Prototype persists local edits to `localStorage`.
5. Future Postgres routes will persist the same domain objects and return the same shape.

## Testing Strategy

- Unit test pure calculation utilities first.
- Add component tests only after interactions become complex enough to justify them.
- Add repository/API tests when the Postgres-backed persistence wave begins.
