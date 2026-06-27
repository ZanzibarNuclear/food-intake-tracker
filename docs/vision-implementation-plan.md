# Vision Implementation Plan

Build the chart-forward, DB-first food tracker described in [vision-plan.md](./vision-plan.md), reusing proven calculation logic and workbook seed data from the original prototype.

**Status:** Draft for review — no implementation started yet.

**Related docs:**

- [vision-plan.md](./vision-plan.md) — product goals and v1 scope
- [prototype-review.md](./prototype-review.md) — gap analysis of the spreadsheet clone
- [legacy/](./legacy/) — original prototype specs (reference only)

---

## Goals

1. Replace the tab-in-`app.vue` prototype with a routed, component-based UI centered on charts and quick logging.
2. Make Neon Postgres the single source of truth (no `localStorage` overlay).
3. Evolve schema and API for edit/delete, settings, favorites, and optional system-seeded foods.
4. Preserve workbook calculation parity via shared `utils/nutrition.ts` (tested).
5. Keep the door open for PWA install and AI-assisted food entry without blocking v1.

## Non-Goals (v1)

- Multi-user accounts or App Store distribution
- SMS reminders
- Barcode scanning or image recognition
- Micronutrient tracking beyond the subjective nutrition score

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Nuxt 4 (Vue 3)                                                 │
│  pages/          Dashboard, Log, Foods, Weight, Settings         │
│  components/     charts, forms, food picker, metric cards        │
│  composables/    useTrackerApi — fetch/mutate, no localStorage   │
│  layouts/        default.vue — mobile bottom nav                 │
├─────────────────────────────────────────────────────────────────┤
│  server/api/v1/   REST-style routes (new namespace)            │
│  server/services/ repository, summaries, import                  │
│  server/db/       schema.sql, migrations (incremental)           │
├─────────────────────────────────────────────────────────────────┤
│  utils/nutrition.ts   pure calculations (shared, unit-tested)    │
│  types/nutrition.ts   domain types (extended)                    │
├─────────────────────────────────────────────────────────────────┤
│  Neon Postgres — sole persistence layer                          │
└─────────────────────────────────────────────────────────────────┘
```

### Key design decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Persistence | DB-only | Fixes split-brain localStorage bug; matches “online service” intent |
| API shape | `/api/v1/*` namespace | Evolve without breaking legacy routes during transition |
| ORM | Raw `pg` initially | Prototype already uses it; add Drizzle only if migrations get painful |
| Charts | Chart.js + `vue-chartjs` | Lightweight, good mobile support, familiar API |
| Routing | File-based `pages/` | Cleaner than tab state; enables deep links (`/log?date=…`) |
| Auth | Deferred | Single-user personal app; protect via deploy URL + env secret or add passkey in v1.5 |
| Calculations | Client + server | Server computes summaries for API responses; client reuses `utils/nutrition.ts` for instant preview |

---

## Schema v2

Evolve `docs/postgres-schema.sql` into `server/db/schema.sql`. Migration script applies deltas on existing DBs.

### Changes from v1

```sql
-- settings: unchanged singleton row

-- foods: add provenance
alter foods add column is_system_seed boolean not null default false;
alter foods add column source text;  -- 'workbook' | 'usda' | 'user' | 'ai'

-- meal_entries: snapshot macros at log time + soft FK for history
alter meal_entries add column calories numeric(8,2);
alter meal_entries add column protein_grams numeric(8,2);
alter meal_entries add column nutrition_points numeric(8,2);
-- food_id remains required for known foods; snapshots preserve history if food edits later

-- new: quick-log favorites (ordered)
create table food_favorites (
  food_id bigint primary key references foods(id) on delete cascade,
  sort_order smallint not null default 0
);

-- new: track recent foods by usage (maintained on meal insert)
create table food_recent (
  food_id bigint primary key references foods(id) on delete cascade,
  last_used_at timestamptz not null default now(),
  use_count integer not null default 1
);
```

### Deferred tables (document only, build later)

- `reminder_settings` — for web push / SMS
- `ai_food_drafts` — staging AI suggestions before user confirms

### Seed strategy

1. **Workbook import** — existing `server/data/seed.json` (`source: 'workbook'`, `is_system_seed: false`)
2. **System catalog** — new `server/data/system-foods.json` (~200–500 items, `is_system_seed: true`, `source: 'usda'`)
3. `npm run db:setup` loads schema + both seeds; idempotent upsert by food name

---

## API v1 (new routes)

All routes under `/api/v1/`. Responses use camelCase JSON matching TypeScript types.

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/v1/tracker` | Full snapshot: settings, foods, meals, weights (bootstrap) |
| `GET` | `/api/v1/dashboard?date=YYYY-MM-DD` | Today metrics + chart series (7/30 day) |
| `GET` | `/api/v1/settings` | Current targets |
| `PUT` | `/api/v1/settings` | Update calorie/protein/nutrition/goal targets |
| `GET` | `/api/v1/foods?q=&limit=` | Search catalog (user foods ranked above system seed) |
| `POST` | `/api/v1/foods` | Create food |
| `PATCH` | `/api/v1/foods/:id` | Edit food |
| `DELETE` | `/api/v1/foods/:id` | Remove food (block if referenced, or soft-delete — TBD) |
| `GET` | `/api/v1/foods/favorites` | Favorite + recent foods for quick log |
| `POST` | `/api/v1/foods/:id/favorite` | Toggle favorite |
| `GET` | `/api/v1/meals?date=&limit=` | List meals, newest first |
| `POST` | `/api/v1/meals` | Log meal; server writes macro snapshots |
| `PATCH` | `/api/v1/meals/:id` | Edit meal |
| `DELETE` | `/api/v1/meals/:id` | Delete meal |
| `GET` | `/api/v1/weights` | Weight history |
| `POST` | `/api/v1/weights` | Upsert weight by date |
| `DELETE` | `/api/v1/weights/:id` | Remove entry |
| `GET` | `/api/v1/summaries?from=&to=` | Daily summary rows for tables/charts |

Legacy routes (`/api/tracker`, `/api/foods`, etc.) remain until Phase 2 complete, then removed.

---

## UI Structure

### Layout

- `layouts/default.vue` — app shell, header with date picker, bottom navigation (Dashboard · Log · Foods · Weight · Settings)
- Mobile-first; tablet gets two-column forms + side panels

### Pages

| Route | Page | Primary content |
|-------|------|-----------------|
| `/` | `pages/index.vue` | Dashboard: metric cards, calorie bar chart (7d), weight line chart, protein progress |
| `/log` | `pages/log.vue` | Quick log: favorites chips, food search, quantity stepper, live preview, today’s meals with delete |
| `/foods` | `pages/foods/index.vue` | Searchable catalog, filter user vs system |
| `/foods/new` | `pages/foods/new.vue` | Add food form |
| `/foods/[id]` | `pages/foods/[id].vue` | Edit food |
| `/weight` | `pages/weight.vue` | Log weight + history chart |
| `/settings` | `pages/settings.vue` | Targets, data reset, about |

### Components (initial set)

```
components/
  dashboard/
    MetricCard.vue
    CalorieChart.vue      # 7-day bars + target line
    WeightChart.vue       # trend + goal line
    ProteinProgress.vue   # bar toward daily target
    DailySummaryTable.vue
  log/
    FoodPicker.vue        # search + datalist + favorites
    MealForm.vue
    MealList.vue
  foods/
    FoodForm.vue
    FoodRow.vue
  charts/
    BaseChart.vue         # Chart.js wrapper, theme colors from CSS vars
```

### Styling

- New `assets/css/vision.css` — evolved palette, chart-friendly contrast
- Retire prototype tab styles from `main.css` or merge selectively
- CSS variables shared with Chart.js theme

### State management

- `composables/useTrackerApi.ts` — wraps `$fetch` to v1 API; no `localStorage`
- `useAsyncData` / `refreshNuxtData` for page-level loading
- Optimistic UI optional for meal log only (with rollback on error)

---

## Implementation Phases

### Phase 0 — Documentation & legacy cleanup

**Deliverables**

- [ ] This plan (approved)
- [ ] Move prototype docs to `docs/legacy/`
- [ ] Add `docs/README.md` index
- [ ] Move `app.vue` prototype UI to `legacy/prototype-app.vue` (reference)
- [ ] Update root `README.md` for vision direction

**Acceptance:** Docs clearly distinguish legacy vs active; no code behavior change yet.

---

### Phase 1 — Schema v2 & DB-first service

**Deliverables**

- [ ] `server/db/schema.sql` (v2)
- [ ] `server/db/migrate.mjs` — apply v1→v2 deltas safely
- [ ] `server/services/tracker-repository.ts` — CRUD, snapshots on meal insert
- [ ] `server/services/summaries.ts` — dashboard + chart series from SQL or `utils/nutrition.ts`
- [ ] All `/api/v1/*` routes listed above (minimal implementations)
- [ ] Update `scripts/setup-db.mjs` for v2 schema + workbook seed
- [ ] Repository integration tests (vitest + test DB or mocked `pg`)
- [ ] Extend `types/nutrition.ts` for new fields

**Acceptance**

- `npm run db:setup` succeeds on fresh Neon branch
- `GET /api/v1/dashboard` returns metrics matching workbook for seed dates (2026-06-23 – 25)
- Meal POST stores calorie/protein/nutrition snapshots
- No `localStorage` in new code paths

---

### Phase 2 — New app shell & dashboard

**Deliverables**

- [ ] `layouts/default.vue` + bottom nav
- [ ] `pages/index.vue` with metric cards and charts
- [ ] `composables/useTrackerApi.ts`
- [ ] Chart.js dependencies + `BaseChart.vue`
- [ ] New `app.vue` — `<NuxtLayout><NuxtPage /></NuxtLayout>` only
- [ ] Remove or redirect legacy `app.vue` tab UI

**Acceptance**

- Opening `/` shows today’s calories, protein, nutrition vs targets
- 7-day calorie chart renders with target line at 2000
- Weight chart shows 3 seed entries + goal line at 170
- Mobile layout usable one-handed

---

### Phase 3 — Quick log flow

**Deliverables**

- [ ] `pages/log.vue` with `FoodPicker`, `MealForm`, `MealList`
- [ ] Favorites + recent foods from API
- [ ] Live macro preview (client `calculateMeal`)
- [ ] Delete meal action
- [ ] Deep link: `/log?date=YYYY-MM-DD`

**Acceptance**

- Log a meal in ≤3 taps after picking a favorite
- Unknown food shows clear error; link to add food
- Deleting a meal updates dashboard on refresh

---

### Phase 4 — Foods & settings

**Deliverables**

- [ ] Foods list with search and user/system filter
- [ ] Add + edit food pages
- [ ] `pages/settings.vue` — edit all four targets
- [ ] Favorite toggle from food row

**Acceptance**

- Change calorie target to 1800 → dashboard target line updates
- Edit “Roasted chicken” calories → past meal snapshots unchanged, new logs use new values

---

### Phase 5 — Weight & polish

**Deliverables**

- [ ] `pages/weight.vue` with entry form + history table + mini chart
- [ ] Empty states, error toasts, loading skeletons
- [ ] Split remaining logic out of any oversized files
- [ ] Delete legacy API routes and `useTrackerStore.ts`
- [ ] Delete `legacy/prototype-app.vue` if no longer needed

**Acceptance**

- Full workbook seed data visible and correct across all pages
- `npm test`, `npm run typecheck`, `npm run build` pass
- README documents setup end-to-end

---

### Phase 6 — System food catalog (post-v1 or late v1)

**Deliverables**

- [ ] Script to fetch/normalize USDA FoodData Central subset
- [ ] `server/data/system-foods.json`
- [ ] Search ranks user foods above system seeds
- [ ] Document nutrition score policy for seeds (default 5 or blank for user to score)

**Acceptance**

- Catalog has 200+ searchable items beyond workbook 32
- User nicknames still appear first in search

---

### Phase 7 — PWA (v1.5)

**Deliverables**

- [ ] `@vite-pwa/nuxt` module
- [ ] Manifest, icons, install prompt
- [ ] Offline shell with “connection required to log” message

---

### Phase 8 — AI food assist (v1.5, optional)

**Deliverables**

- [ ] `POST /api/v1/foods/suggest` — LLM structured output
- [ ] Confirm UI on `/foods/new?suggest=…`
- [ ] `source: 'ai'` on saved foods

---

## Testing Strategy

| Layer | What |
|-------|------|
| Unit | `utils/nutrition.ts` — keep existing tests; add snapshot-on-write helpers |
| Integration | Repository CRUD against test DB |
| API | Handler tests for dashboard parity with workbook fixtures |
| Manual | Compare dashboard numbers to `Daily Intake.xlsx` for Jun 23–25 |

Fixture file: `tests/fixtures/workbook-parity.json` extracted from seed.

---

## Legacy inventory

| Item | Action |
|------|--------|
| `docs/product-spec.md` | Move → `docs/legacy/product-spec.md` |
| `docs/implementation-plan.md` | Move → `docs/legacy/implementation-plan.md` |
| `docs/spa-architecture.md` | Move → `docs/legacy/spa-architecture.md` |
| `docs/questions.md` | Move → `docs/legacy/questions.md` |
| `docs/postgres-schema.sql` | Move → `docs/legacy/postgres-schema-v1.sql`; v2 lives in `server/db/schema.sql` |
| `app.vue` (tab prototype) | Move → `legacy/prototype-app.vue` when Phase 2 starts |
| `composables/useTrackerStore.ts` | Delete after Phase 5 |
| `/api/foods`, `/api/meals`, etc. (no v1 prefix) | Delete after Phase 5 |
| `server/utils/repository.ts` | Replace with `server/services/tracker-repository.ts` |
| `utils/nutrition.ts`, `types/nutrition.ts`, `tests/nutrition.test.ts` | **Keep and extend** |
| `server/data/seed.json`, `tools/extract_seed.py` | **Keep** |
| `assets/css/main.css` | Merge useful tokens into `vision.css`; archive rest |

---

## Dependencies to add

```json
{
  "chart.js": "^4.x",
  "vue-chartjs": "^5.x"
}
```

Optional later: `@vite-pwa/nuxt`, OpenAI SDK for Phase 8.

---

## Deployment (when ready)

- **App:** Vercel or Cloudflare Pages (Nuxt SSR/hybrid)
- **DB:** Neon main branch + dev branch per feature
- **Env:** `DATABASE_URL` required; no app starts without it in production mode

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Food delete with meal references | Block delete with message, or soft-delete; decide in Phase 4 review |
| Chart performance on old phones | Limit to 30 data points; disable animations on mobile |
| USDA seed nutrition scores missing | Leave score null; prompt user on first log |
| Scope creep | Phases 6–8 explicitly post-v1 |

---

## Open questions for review

1. **Food delete policy** — Hard delete blocked when meals reference it, or soft-delete/hide?
2. **System food nutrition scores** — Default to 5, leave blank, or AI-batch estimate during seed import?
3. **Auth for v1** — None (private deploy URL), HTTP basic, or magic link?
4. **Phase 6 timing** — Include ~200 seeded foods in first release, or ship after dashboard/log polish?
5. **Weight goal** — Store only in `settings.goal_weight` and drop per-entry `goal_weight` column? (Workbook has both; settings-only is simpler.)

---

## Estimated effort

| Phase | Effort |
|-------|--------|
| 0 Docs/legacy | 0.5 day |
| 1 DB + API | 2–3 days |
| 2 Dashboard UI | 2 days |
| 3 Log | 1.5 days |
| 4 Foods + settings | 1.5 days |
| 5 Polish + cleanup | 1 day |
| **v1 total** | **~8–9 days** |
| 6 System foods | 2–3 days |
| 7 PWA | 0.5 day |
| 8 AI assist | 1–2 days |

---

## Approval checklist

Before implementation begins, please confirm:

- [ ] Phase scope and order
- [ ] Answers to open questions (or defaults: block food delete, score default 5, no auth v1, Phase 6 post-v1, settings-only goal weight)
- [ ] OK to remove legacy API routes after Phase 5
- [ ] Chart library choice (Chart.js)
