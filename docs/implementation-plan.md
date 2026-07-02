# Implementation Plan

**Status:** Active — single source of truth for building v1.

**Source workbook:** [`original/Daily Intake - 2026-06-28.xlsx`](./original/Daily%20Intake%20-%202026-06-28.xlsx)

**Schema:** [`postgres-schema.sql`](./postgres-schema.sql)

---

## North star

Replace the Excel workbook for daily food and weight tracking. v1 must:

1. **Reproduce the workbook** — same fields, meal types, calculation rules, and your personal food history.
2. **Add three dashboard charts** the spreadsheet cannot show well.
3. **Ship a searchable food catalog** pre-loaded with common foods and nutritional values so logging does not depend on manual nutrition lookup.

Success means you open **Log** after a meal, pick a food, save, and see today’s totals and trends without opening Excel.

---

## Current state (codebase)

A **v1 candidate** exists. The app is no longer just a prototype: workbook import, DB-first persistence, CRUD, charts, timezone handling, favorites/recents, and catalog use/copy flows are in place. Remaining work is mostly catalog depth, logging polish, and confidence checks.

| Asset | Status | Action |
|-------|--------|--------|
| `utils/nutrition.ts` + tests | Done, workbook-accurate | **Keep** |
| `types/nutrition.ts`, `utils/dates.ts` | Done | **Keep**, extend as needed |
| `tools/extract_seed.py` | Done | **Keep** — regenerate personal seed from xlsx |
| `server/data/seed.json` | Done (97 foods / 55 meals / 4 weights) | **Keep** |
| `server/data/system-foods.json` | Starter catalog (228 foods) | **Expand soon** via FDA/USDA bulk import |
| `docs/postgres-schema.sql` | Done | **Keep** — apply via `npm run db:setup` |
| `app.vue` + `components/*` | Tab shell with component screens | **Polish**; routes optional later |
| `composables/useTracker.ts` | API-only state | **Keep** |
| `server/services/repository.ts` | CRUD + quick lists + catalog copy | **Keep**, add integration coverage later |
| `server/api/*.ts` | Tracker, food, meal, weight, settings routes | **Keep**, validate more strictly later |
| Charts, favorites, recents, timezone | Built | **Polish** |
| AI | Not built | Defer to v1.5 |

---

## Workbook baseline (2026-06-28 snapshot)

| Entity | Count | Notes |
|--------|------:|-------|
| Personal foods | 97 | Nicknames with calories, protein, nutrition score |
| Meal entries | 55 | Dates 2026-06-23 – 2026-06-28 |
| Weight entries | 4 | |
| Settings | 1 | 2000 cal, 100g protein, nutrition 7+, goal weight 170 |

**Meal types:** Breakfast, Lunch, Dinner, Snack, Dessert.

### Workbook → app mapping

| Workbook sheet | App screen | Purpose |
|----------------|------------|---------|
| Dashboard | **Dashboard** | Targets, today, charts, daily summary table |
| Meal Log | **Log** | Meal entry; edit/delete |
| Foods | **Foods** | Personal foods + system catalog |
| Weight Log | **Weight** | Body weight |
| Daily Summary | **Dashboard** (table + chart data) | Per-day aggregates |
| Instructions | **Help** (static) | Usage text |

---

## Scope

### v1 — must ship

**Workbook parity**

- All sheets modeled; calculation rules preserved exactly (`utils/nutrition.ts`, unit-tested).
- Import personal foods and history from the workbook file.
- Neon Postgres as the **only** persistence layer.
- Edit and delete meals, personal foods, and weights.
- Editable targets (calories, protein, nutrition score, goal weight).

**Charts (3)**

| Chart | Where | Data |
|-------|-------|------|
| Calorie trend | Dashboard | Daily calories, last 7 days, horizontal line at calorie target |
| Weight trend | Dashboard | Weight over time, horizontal line at goal weight |
| Protein progress | Dashboard | Today’s protein vs daily target (bar or ring) |

Charts use `summarizeDays()` output — no new metrics.

**Food catalog**

Two layers, one search:

| Layer | `is_system_seed` | `source` | Editable |
|-------|------------------|----------|----------|
| Personal (workbook + user-added) | false | `workbook` / `user` | yes |
| System catalog (USDA-based) | true | `usda` | no — copy to personal to customize |

- Starter catalog has **228 common foods** with calories, protein, nutrition score, and satiety score.
- Near-term target: import **a few thousand FDA/USDA foods** with stable source ids, calories, protein, nutrition score, and satiety score.
- Search ranks **personal foods first**, then catalog.
- Filter: All / My foods / Catalog.
- Nutrition and satiety scores on starter catalog items are heuristic defaults; user adjusts after copying to personal foods.

**Fast logging (minimum viable UX)**

- Date defaults to **today** on Log.
- Food search with autocomplete across personal + catalog.
- Quantity stepper; live macro preview before save.
- **Recent foods** (~8 last logged) and **favorites** (user-pinned) as one-tap chips.
- Target: log a known favorite in **≤3 taps**.

### v1.5 — after daily use is solid

| Feature | Notes |
|---------|-------|
| AI food suggest | Natural language → suggested fields → user confirms before save |
| PWA (Add to Home Screen) | Optional iPhone install |

### Out of scope (until asked)

Auth/login, multi-user accounts, SMS/push reminders, barcode scanning, photo recognition, micronutrients beyond nutrition score, Google Sheets export, `localStorage` persistence.

### Acceptable improvements over the workbook

- Selectable date on Dashboard (workbook uses `TODAY()` only).
- Component-based UI, search on Foods, clearer validation than `#N/A`.
- Charts and catalog search.

---

## Calculation rules

Implemented in `utils/nutrition.ts`. Do not change without updating tests and workbook fixtures.

### Meal row

```
calories         = quantity × food.calories          (1 decimal)
proteinGrams     = quantity × food.proteinGrams      (1 decimal)
nutritionPoints  = quantity × food.nutritionScore    (1 decimal)
knownFood        = food id exists, with food name fallback for legacy/import rows
```

Unknown food: null macros; show `No - add nickname`; excluded from calorie/protein sums.

### Daily summary (per date D)

- Sum macros from known foods only.
- `itemsLogged` = count of all meal rows (including unknown).
- Average nutrition = sum(nutrition points) / items (1 decimal).
- Weight from weight log for date D.
- 7-day rolling calorie average: average of non-zero calorie days in rolling 7-day window (workbook `FILTER` logic).
- 7-day rolling weight average: average of logged weights in rolling window.

### Dashboard display

- Show summary rows only for dates with meals or weights (sparse, not a 180-day grid).

---

## Data model

See [`postgres-schema.sql`](./postgres-schema.sql). Summary:

- **settings** — singleton row (targets).
- **foods** — personal + system catalog; `is_system_seed`, `source`.
- **meal_entries** — `food_id`, quantity, date, meal type. Client/API should pass `foodId`; `foodName` is display and legacy fallback.
- **weight_entries** — one per date.
- **food_favorites**, **food_recent** — quick-log support.

**Delete policy:** block deleting a personal food referenced by meals (`Used in N meals`).

**Future multi-user:** add `user_id` to personal tables; keep system catalog global. v1 has no `user_id`.

---

## Architecture

### Stack

| Layer | Choice |
|-------|--------|
| App | Nuxt 4, Vue 3, TypeScript, mobile-first |
| Database | Neon Postgres (`pg`) |
| Charts | Chart.js + `vue-chartjs` |
| Tests | Vitest — nutrition unit tests + workbook parity fixtures |
| AI (v1.5) | Server route → OpenAI-compatible API (`OPENAI_API_KEY`) |

### App shape

Four primary screens with bottom navigation on mobile:

| Screen | Focus |
|--------|-------|
| Dashboard | Metrics, 3 charts, summary table, editable targets |
| Log | Fast logging — today default, favorites, recents, edit/delete |
| Foods | Personal + catalog search, add/edit |
| Weight | Weigh-in and history |

### Client modules (target)

```
app.vue                    # <NuxtLayout><NuxtPage /></NuxtLayout> or tab shell during transition
pages/                     # index, log, foods, weight, settings (optional)
components/
  dashboard/             MetricCard, CalorieChart, WeightChart, ProteinProgress, SummaryTable
  log/                     FoodChips, FoodSearch, MealForm, MealList
  foods/                   FoodForm, FoodList
composables/useTracker.ts  # $fetch API; no localStorage
utils/nutrition.ts         # keep
types/nutrition.ts         # extend
assets/css/main.css
```

### Server modules (target)

```
server/
  api/
    tracker.get.ts
    foods.get.ts              # ?q= &filter=all|my|catalog
    foods.post.ts
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
    foods/suggest.post.ts     # v1.5 only
  services/
    repository.ts
    summaries.ts              # chart series from summarizeDays
  data/
    seed.json                 # workbook personal data
    system-foods.json         # USDA catalog
scripts/setup-db.mjs
tools/
  extract_seed.py
  fetch_system_foods.py       # new — build system-foods.json
```

### Data flow

1. `GET /api/tracker` bootstraps settings, foods, meals, weights.
2. Log loads `GET /api/foods/favorites` for favorite + recent chips.
3. Client previews macros via `calculateMeal()`; server persists and returns updated state.
4. All writes → Postgres → client refresh. **No localStorage.**

---

## Seed data

### Personal (workbook)

```bash
npm run generate:seed
# reads docs/original/Daily Intake - 2026-06-28.xlsx → server/data/seed.json
```

Import flags: `source: 'workbook'`, `is_system_seed: false`.

### System catalog (USDA)

Current starter catalog is generated by:

```bash
npm run generate:catalog
```

Next catalog import:

1. Add `tools/fetch_system_foods.py` or a Node importer to pull a large FDA/USDA source file.
2. Keep stable source ids in the generated data before loading to Postgres.
3. Normalize to app food shape: name, serving description, calories, protein, nutrition score, satiety score.
4. Output `server/data/system-foods.json` with `is_system_seed: true`, `source: 'usda'`.
5. Update schema/setup if needed so catalog upsert keys are stable source ids rather than display names.

**Catalog content priorities:** eggs, chicken, beef, fish, common vegetables/fruits, bread/rice/pasta, dairy, nuts, common snacks, beverages, chain-restaurant-style staples where data exists.

---

## Build phases

### Phase 0 — Align docs and data *(done)*

- [x] Single implementation plan (this document).
- [x] Regenerate `server/data/seed.json` from 2026-06-28 workbook.
- [x] Remove obsolete docs.
- [x] Fix `scripts/setup-db.mjs` to use `docs/postgres-schema.sql`.

**Acceptance:** One plan doc; seed matches workbook counts (97 / 55 / 4).

---

### Phase 1 — Foundation (DB-first) *(mostly done)*

- Regenerate and load workbook seed into Neon.
- Implement `server/services/repository.ts` — full CRUD, favorites/recents on meal insert.
- API routes: tracker, foods (search), meals, weights, settings (PUT).
- `composables/useTracker.ts` — API only; delete `useTrackerStore.ts`.
- Require `DATABASE_URL` for dev (document in README).

**Acceptance**

- `npm run db:setup` succeeds on fresh Neon branch.
- POST meal persists to DB and survives page reload (no localStorage).
- Workbook parity numbers match for 2026-06-23 – 25 (fixture test).

---

### Phase 2 — Workbook UI parity *(mostly done)*

- Refactor `app.vue` into components (tabs OK initially; pages optional).
- **Dashboard:** metric cards + daily summary table + date selector + editable targets.
- **Log:** meal form, food search, preview, today’s meal list.
- **Foods:** list, search, add/edit personal foods.
- **Weight:** log + history table.
- Edit and delete for meals, personal foods, weights.

**Acceptance**

- All four workbook sheets represented in the UI.
- Imported history visible and numerically correct.
- Can log a new meal today and see it on Dashboard.

---

### Phase 3 — Dashboard charts *(done)*

- Add Chart.js + `vue-chartjs`.
- Calorie bar chart (7 days + target line).
- Weight line chart (all entries + goal line).
- Protein progress bar for selected day.

**Acceptance**

- Three charts render with seed data.
- Changing calorie target updates target line.
- Charts match summary table data.

---

### Phase 4 — System food catalog *(in progress)*

- Build `tools/fetch_system_foods.py` or equivalent and expand `server/data/system-foods.json` from 228 starter items to a few thousand FDA/USDA-backed items.
- Extend `db:setup` to load catalog.
- Foods screen: filter All / My / Catalog; catalog rows read-only with “Use” / “Copy to my foods”. Initial flow is built.
- Search ranks personal above catalog.

**Acceptance**

- Log a catalog food without manual nutrition entry.
- Personal food appears above catalog for overlapping names.
- Catalog has broad coverage of everyday foods.

---

### Phase 5 — Fast logging polish *(in progress)*

- Favorites toggle on food rows.
- Recent + favorite chips on Log.
- Quantity stepper; date defaults today; meal type remembers last used.
- Quick-add button in nav opens/focuses Log.
- Loading states, error toasts, empty states.
- Remove legacy prototype code paths.

**Acceptance**

- Log favorite in ≤3 taps.
- `npm test`, `npm run typecheck`, `npm run build` pass.
- README documents end-to-end setup.

---

### Phase 6 — AI food suggest (v1.5)

- `POST /api/foods/suggest` — server-side LLM, JSON validation.
- Confirm UI on Foods + Log unknown-food path.
- `source: 'ai'` on saved foods; user always confirms.

**Acceptance**

- Describe food → review fields → save → log meal.
- API key never exposed to client.

---

## Testing

| Layer | What |
|-------|------|
| Unit | `utils/nutrition.ts` — keep existing tests |
| Fixtures | `tests/fixtures/workbook-parity.json` from 2026-06-28 seed |
| Integration | Repository CRUD, catalog search order |
| Manual | Compare dashboard to workbook for Jun 23–28; 3-tap log; chart sanity |

---

## Environment

```bash
DATABASE_URL=postgresql://...   # Neon — required for dev
OPENAI_API_KEY=...              # Phase 6 only
```

```bash
npm install
cp .env.example .env
npm run db:setup
npm run dev
```

---

## Open decisions (defaults)

| Question | Default |
|----------|---------|
| Catalog size for v1 | Starter 228 now; import a few thousand FDA/USDA foods soon |
| Nutrition score on catalog | Heuristic seed value until user edits |
| Satiety score on catalog | Heuristic seed value until user edits |
| Delete food with meals | Block with message |
| Meal type default on Log | Last used |
| Tab UI vs `pages/` routing | Components first; file routes when refactor is natural |
| AI provider | OpenAI-compatible; abstract in `food-suggest.ts` |

---

## Estimated effort

| Phase | Effort |
|-------|--------|
| 0 Docs + seed | 0.5 day |
| 1 Foundation | 2 days |
| 2 Workbook UI | 2 days |
| 3 Charts | 1 day |
| 4 Catalog | 2–3 days |
| 5 Fast log polish | 1.5 days |
| **v1 total** | **~9–10 days** |
| 6 AI suggest | 1–2 days |

---

## Decisions log

| Date | Decision |
|------|----------|
| 2026-07-02 | Meals use `foodId` for durable logging/editing. Foods catalog rows support direct Use and Copy-to-personal. Starter catalog now includes heuristic nutrition and satiety scores. |
| 2026-07-01 | Consolidated all specs into this plan. v1 = workbook + charts + catalog + usable logging. AI deferred to v1.5. |
| 2026-06-28 | Workbook snapshot is personal data baseline (97 foods, 55 meals). |
| Prior | Nutrition math lives in `utils/nutrition.ts`; subjective nutrition score stays user-curated (1–10). |
| Prior | Single-user v1; schema allows multi-user later. |
