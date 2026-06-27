# Prototype Review

Review of the existing Nuxt prototype (built by a prior agent) against:

- the workbook (`Daily Intake.xlsx`)
- `docs/product-spec.md` and `docs/implementation-plan.md`
- the alternate direction in `docs/vision-plan.md`

Date: 2026-06-25

## Executive Summary

The prototype is a **faithful, well-tested port of the spreadsheet** into a mobile-first Nuxt SPA. Core domain logic, data model, and UI tabs match the workbook spec. Phases 1–2 of the implementation plan are largely complete; Phase 3 (Neon) is **scaffolded but not fully wired** as the client source of truth; Phase 4 (polish) is **not started**.

The alternate vision plan diverges mainly on **charts, expanded food seeding, settings UI, auth, PWA, and AI assist** — none of which the current prototype targets for v1.

## What Was Built

| Area | Status | Notes |
|------|--------|-------|
| Nuxt 4 + TypeScript + Vitest | Done | Tests and typecheck pass |
| Product spec + architecture docs | Done | Clear workbook-as-source-of-truth |
| Workbook seed (32 foods, 23 meals, 3 weights) | Done | `server/data/seed.json` |
| Calculation engine | Done | `utils/nutrition.ts`, 4 unit tests |
| Mobile-first 4-tab UI | Done | Dashboard, Log, Foods, Weight in `app.vue` |
| Postgres schema | Done | `docs/postgres-schema.sql` |
| DB setup script | Done | `npm run db:setup` |
| Server repository + API | Partial | GET tracker, POST foods/meals/weights |
| localStorage persistence | Done | Overrides server data on mount |
| Charts | Not done | Tables and metric cards only |
| Settings UI | Not done | Targets in seed only |
| Edit/delete | Not done | Upsert by name/date only |
| Auth | Not done | Intentionally excluded |
| API/repository tests | Not done | Planned in Phase 3 |
| PWA | Not done | — |
| AI food assist | Not done | Explicit non-goal in product spec |
| Expanded food database | Not done | Workbook 32 foods only |

## Workbook Parity

### Matches

- Targets: 2000 cal, 100g protein, nutrition 7+, goal weight 170
- Food fields: name, serving, calories, protein, nutrition score, satiety, notes
- Meal types: Breakfast, Lunch, Dinner, Snack, Dessert
- Meal math: quantity × food values
- Daily nutrition average: sum(nutrition points) / item count
- 7-day calorie average: non-zero days in rolling 7-day window
- 7-day weight average: logged weights in rolling window
- Unknown food detection: "No - add nickname"
- Decimal quantities supported
- Weight log with goal weight per entry

### Minor Differences

| Topic | Workbook | Prototype |
|-------|----------|-----------|
| Dashboard date | Always TODAY() | User-selectable date (improvement) |
| Daily summary rows | Pre-filled 180-day grid | Only dates with meals or weights |
| Meal delete / correction | Manual row delete in sheet | No delete UI |
| Food edit | Edit row in Foods sheet | Add form upserts by name; no edit affordance |
| Settings edit | Edit cells on Dashboard | No UI; values from seed/DB only |

## Architecture Assessment

### Strengths

1. **Calculation logic is isolated and tested** — `utils/nutrition.ts` mirrors spreadsheet formulas; good foundation for either direction.
2. **Types are clean** — `types/nutrition.ts` maps 1:1 to workbook concepts.
3. **Schema is sensible** — `food_id` FK on meals; unique food names; numeric types for macros.
4. **Spec discipline** — product spec explicitly defers scope creep (no AI, no barcode, no multi-user).
5. **Mobile UX basics** — 44px touch targets, tab nav, datalist food picker, live meal preview.

### Gaps and Risks

#### 1. Hybrid persistence (highest priority)

`useTrackerStore` loads from `/api/tracker` (Neon or seed), then **on mount replaces everything with `localStorage`** if present. All subsequent edits sync to localStorage via deep watch.

**Impact:** Neon can be configured and seeded, but the browser may show stale local data. POST handlers write to DB, yet the client never re-fetches — it appends to in-memory state and localStorage.

**Fix direction:** Pick one source of truth per environment: localStorage-only for offline prototype, or DB-only when `DATABASE_URL` is set. Remove the mount override or gate it behind a dev flag.

#### 2. No settings screen

Targets exist in `settings` table/seed but cannot be changed in the app. Workbook allows editing target cells on Dashboard.

#### 3. No edit/delete

Implementation plan Phase 4 calls for these. Meal logging mistakes cannot be undone without devtools/localStorage surgery.

#### 4. Monolithic `app.vue`

~450 lines, all four tabs. Fine for prototype; will need component split before polish or a second prototype.

#### 5. No charts

Both the workbook and the prototype lack real charts. The vision plan treats charts as core v1 value; the implementation plan defers them to Phase 4.

#### 6. Repository tests missing

Phase 3 checklist includes API/repository tests; only calculation unit tests exist.

#### 7. Meal list React keys

`recentMeals` key is `date-foodName-quantity` — duplicate same-day same-food entries collide.

## Comparison: Prototype vs Vision Plan

| Feature | Prototype (workbook-faithful) | Vision plan (expansive v1) |
|---------|------------------------------|----------------------------|
| Core logging | Yes | Yes |
| Dashboard metrics | Yes (cards + table) | Yes + charts |
| Food catalog | 32 workbook foods | + 200–500 seeded foods |
| Settings UI | No | Yes |
| Neon as source of truth | Partial | Yes |
| Auth | No (explicit) | Simple single-user |
| AI food add | No (explicit non-goal) | v1.5 |
| PWA | No | v1.5 |
| SMS reminders | No | v2+ |
| Drizzle ORM | No (raw `pg`) | Recommended |
| Import from xlsx | Via seed script | Same |

## Implementation Plan Progress

| Phase | Planned | Actual |
|-------|---------|--------|
| 1 Discovery & spec | ✓ | ✓ Complete |
| 2 Working prototype | ✓ | ✓ Complete (localStorage + seed API) |
| 3 Neon integration | ✓ | ~60% — schema, repo, routes, setup script; client not DB-first |
| 4 Polish | ✓ | Not started — charts, edit/delete, tablet polish |

## Recommendations

### If continuing with this prototype

1. Fix persistence model (DB-first when configured).
2. Add settings tab or inline target editing on Dashboard.
3. Add meal delete and food edit.
4. Add charts (biggest user-visible gap vs vision).
5. Split `app.vue` into page components.
6. Add repository integration tests.

### If building a second prototype (vision direction)

Keep shared assets from this repo:

- `utils/nutrition.ts` + tests (proven workbook parity)
- `types/nutrition.ts`
- `docs/legacy/postgres-schema-v1.sql` (v1; v2 will live in `server/db/schema.sql`) (extend with `is_system_seed`, snapshot columns on meals)
- `server/data/seed.json` and import tooling

Rebuild or restructure:

- Page-based routing (`pages/` instead of tab state in `app.vue`)
- Chart-forward dashboard
- Settings page
- Food seeding pipeline (USDA/OFF)
- Optional: Drizzle, auth middleware, PWA module

Run as a git branch or sibling directory (e.g. `prototypes/vision/`) for side-by-side comparison.

## Verdict

The existing prototype is a **solid spreadsheet clone** with good engineering hygiene (types, tests, docs, schema). It is **not yet a production-ready personal app** because persistence is split-brain, settings cannot be edited, and there are no charts or correction flows.

The vision plan is not contradictory — it is the **next layer** on top of this foundation. The two approaches can converge: use this prototype's calculation and data model, then add vision-plan features incrementally rather than throwing away the work.
