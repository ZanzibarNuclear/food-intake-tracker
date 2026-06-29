# SPA Architecture

Architecture for v1. See [product-spec.md](./product-spec.md) for scope.

## Stack

- **Nuxt 4** — web app, server routes, mobile-first rendering
- **Vue 3** Composition API
- **TypeScript**
- **Vitest** — unit tests for calculations and API validation
- **Postgres on Neon** — sole persistence (`pg`)
- **Chart.js + vue-chartjs** — dashboard charts
- **OpenAI-compatible API** — server-side food suggest only

## Application shape

Four tabs; **Log is the most polished screen**.

| Tab | Focus |
|-----|-------|
| Dashboard | Metrics, 3 charts, summary table, editable targets |
| Log | Fast logging — today default, favorites, recents, edit/delete |
| Foods | Personal + catalog search, manual/AI add |
| Weight | Weigh-in and history |

Mobile: bottom navigation. No landing page.

## Client modules

```
app.vue
pages/ or tab views
components/
  dashboard/     MetricCard, CalorieChart, WeightChart, ProteinProgress, SummaryTable
  log/           FoodChips, FoodSearch, MealForm, MealList
  foods/         FoodForm, FoodList, AiSuggestPanel
composables/useTracker.ts
types/nutrition.ts
utils/nutrition.ts
utils/dates.ts
assets/css/main.css
```

## Server modules

```
server/
  api/
    tracker.get.ts
    foods.get.ts              # search + filter
    foods.post.ts
    foods/suggest.post.ts     # AI — no DB write
    foods/[id].patch.ts
    foods/[id].delete.ts
    foods/[id]/favorite.post.ts
    foods/favorites.get.ts
    meals.post.ts
    meals/[id].patch.ts
    meals/[id].delete.ts
    weights.post.ts
    weights/[id].delete.ts
    settings.put.ts
  services/
    repository.ts
    summaries.ts              # chart series from summarizeDays
    food-suggest.ts             # LLM call + JSON validation
  db/schema.sql
  data/
    seed.json                   # workbook personal foods
    system-foods.json           # USDA catalog
scripts/setup-db.mjs
tools/extract_seed.py
```

## Data flow

1. `GET /api/tracker` bootstraps settings, foods, meals, weights.
2. Log screen loads `GET /api/foods/favorites` for chips.
3. Client computes previews and can compute summaries; server may echo same logic for tests.
4. Writes go to API → Postgres → client refresh.
5. AI suggest: client → `POST /api/foods/suggest` → LLM → client form → user confirms → `POST /api/foods`.

**No localStorage persistence.**

## Food catalog layers

| Layer | `is_system_seed` | `source` | Editable |
|-------|------------------|----------|----------|
| Workbook import | false | workbook | yes |
| User manual | false | user | yes |
| AI added | false | ai | yes |
| USDA catalog | true | usda | no (copy to personal) |

Search order: personal foods (workbook, user, ai) before system seed matches.

## Multi-user (future)

v1 has no `user_id`. When adding accounts:

- Add `user_id` to personal data tables
- Scope repository queries by user
- Keep system catalog global

Avoid singleton-only patterns in repository interfaces (e.g. pass `userId` param defaulting to `1` internally later).

## Testing

| Layer | Focus |
|-------|-------|
| Unit | `utils/nutrition.ts`, AI response validator |
| Fixtures | Workbook parity JSON |
| Integration | Repository CRUD, catalog search order |
| Manual | 3-tap log, AI add flow, charts with seed data |

## Deferred (no architecture work needed now)

PWA, auth, SMS, barcode, export — see product spec §2.
