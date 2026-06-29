# Product Specification

**Status:** Active — v1 scope defined.

**Source workbook:** [`docs/original/Daily Intake - 2026-06-28.xlsx`](./original/Daily%20Intake%20-%202026-06-28.xlsx)

**Related docs:**

- [spa-architecture.md](./spa-architecture.md) — stack, app shape, data flow
- [postgres-schema.sql](./postgres-schema.sql) — database schema
- [legacy/](./legacy/) — first prototype attempt (reference only)

---

## 1. Product summary

**Weight Management Food Tracker** is a mobile-first web app for logging food and beverage consumption, watching daily calorie and protein totals, tracking a subjective nutrition quality score (1–10), and monitoring weight toward a goal.

v1 replaces daily use of the Excel workbook. It preserves workbook calculation rules and data fields, then adds what the spreadsheet cannot do well: **charts**, a **searchable food catalog**, **fast meal logging**, and **AI-assisted food entry** so you are not copy-pasting nutrition values by hand.

v1 is **single-user** (no login). The data model should not block **multi-user** support later.

---

## 2. Scope control

### In scope (v1)

**Workbook parity**

- All workbook sheets modeled: Dashboard targets, Foods, Meal Log, Daily Summary, Weight Log
- Workbook calculation rules (§6) preserved exactly
- Same fields, meal types, and core workflows
- Neon Postgres as the single source of truth
- Import personal foods and history from the workbook file
- Unit tests proving calculation parity

**Charts (3 — the highest-value views the workbook lacks)**

| Chart | Where | What it shows |
|-------|-------|---------------|
| **Calorie trend** | Dashboard | Daily calories, last 7 days, horizontal line at calorie target |
| **Weight trend** | Dashboard | Weight over time, horizontal line at goal weight |
| **Protein progress** | Dashboard | Today's protein vs daily target (bar or ring) |

Charts use the same summary data as the Daily Summary table — no new metrics.

**Extended food catalog**

- **Personal foods** — your nicknames from the workbook (e.g. `Blueberry Protein Shake`)
- **System catalog** — ~200–500 common foods seeded from USDA FoodData Central (or similar open dataset)
- Search ranks **personal foods first**, then system catalog
- Filter: All / My foods / Catalog
- User can add any catalog item to their rotation; edits to personal foods do not change system seed rows

**Fast meal logging (primary UX priority)**

- **Date defaults to today** every time you open Log (local date at time of use)
- **Recent foods** — last ~8 foods logged, one tap to select
- **Favorites** — user-pinned foods, one tap to select
- Food search with autocomplete across personal + catalog
- Quantity stepper (+/−) and decimal support; default quantity `1`
- Live macro preview before save
- **Edit and delete** any meal entry — swipe, long-press, or explicit buttons; no hunting in devtools
- Target: log a known favorite in **≤3 taps** after opening Log

**AI-assisted food add**

- Describe a food in plain language (e.g. "grilled salmon fillet about 6 oz with butter")
- Server calls an LLM API and returns structured fields: name, serving description, calories, protein, suggested nutrition score (1–10), optional notes
- **User always confirms or edits** before saving — nothing auto-writes to the catalog
- Available from **Foods** (add new) and from **Log** when food is unknown ("Add with AI" path)
- Saved foods marked `source: ai`; user can adjust nutrition score (remains user-curated)

**Settings & corrections**

- Edit all four targets (calories, protein, nutrition score, goal weight)
- Full CRUD on foods, meals, and weights

### Explicitly out of scope (indefinitely deferred)

These are not v1 and need no timeline unless you ask for them:

| Feature | Notes |
|---------|-------|
| **PWA** ("Add to Home Screen") | Optional install wrapper for iPhone; normal browser use is fine for v1 |
| Auth / login | v1 is single-user; private deploy URL or local use |
| Multi-user accounts | Planned later; v1 schema leaves room (§7) |
| SMS / push reminders | — |
| Barcode scanning, photos | — |
| Google Sheets sync / export | — |
| Micronutrients beyond nutrition score | — |
| `localStorage` persistence | Never — caused split-brain bugs in first prototype |

### Acceptable improvements over the workbook

- Selectable date on Dashboard (workbook uses `TODAY()` only)
- Component-based UI, search on Foods, clearer validation than `#N/A`
- Charts and AI (above) — deliberate v1 additions

---

## 3. Workbook structure

| Workbook sheet | App screen | Purpose |
|----------------|------------|---------|
| `Dashboard` | **Dashboard** | Targets, today, charts, weight status, daily summary table |
| `Meal Log` | **Log** | Fast meal entry; edit/delete |
| `Foods` | **Foods** | Personal + catalog foods; manual and AI add |
| `Weight Log` | **Weight** | Body weight entries |
| `Daily Summary` | **Dashboard** (table + chart data) | Per-day aggregates |
| `Instructions` | **Help** | Static usage text |

### Workbook import baseline (2026-06-28)

| Entity | Count | Notes |
|--------|------:|-------|
| Personal foods | 97 | Import as `source: workbook`, not system seed |
| Meal entries | 55 | Dates 2026-06-23 – 2026-06-28 |
| Weight entries | 4 | |
| Settings | 1 | 2000 cal, 100g protein, nutrition 7+, goal 170 |

Meal types: `Breakfast`, `Lunch`, `Dinner`, `Snack`, `Dessert`.

---

## 4. Users and context

- **v1 user:** one person (you), no account UI.
- **Future:** multiple users, each with own foods, meals, weights, settings.
- **Device:** phone primary; tablet supported.
- **Session pattern:** open Log after a meal → tap favorite → adjust quantity → save; review Dashboard charts weekly; add new foods via AI when something is not in the catalog.

---

## 5. Core workflows

### 5.1 Log a meal (happy path — must be effortless)

1. Open **Log** — date is **today**; meal type defaults to last used or time-of-day guess (optional enhancement).
2. Tap a **favorite** or **recent** food chip — or type to search catalog.
3. Adjust quantity with stepper if needed.
4. Tap **Save** — form clears, food stays selected for quick repeat logging; date stays today.
5. Today’s list below shows the entry with **edit** and **delete**.

**Unknown food:** show `No - add nickname`; offer **Add manually** or **Add with AI** without leaving Log.

### 5.2 Add a food (manual)

1. Open **Foods** → Add.
2. Fill nickname, serving, calories, protein, nutrition score, optional satiety/notes.
3. Save → immediately available in Log search and recents.

### 5.3 Add a food (AI)

1. Open **Foods** → Add → **Describe food** (or from Log unknown-food prompt).
2. Enter natural-language description; tap **Suggest**.
3. Review pre-filled fields; **edit nutrition score** if needed.
4. Confirm save → food available for logging.

AI does not log a meal unless the user chooses "Save and log" from the Log flow.

### 5.4 Maintain catalog

- Search and filter personal vs system foods
- Edit personal foods and AI-added foods
- Pin/unpin favorites for Log chips
- Delete personal food only if not referenced by meals (block with message otherwise)
- System catalog rows are read-only templates — "Copy to my foods" if user wants a variant

### 5.5 Log weight

Date defaults to today. One entry per date. Edit/delete supported.

### 5.6 Review progress

Dashboard: targets, today vs goals, **three charts**, daily summary table, weight-to-goal.

### 5.7 Edit targets

All four settings editable on Dashboard or Settings section; persisted immediately.

---

## 6. Calculation rules

Unchanged from workbook — implemented in `utils/nutrition.ts`, unit-tested.

### 6.1 Meal row

```
calories         = quantity × food.calories          (1 decimal)
proteinGrams     = quantity × food.proteinGrams      (1 decimal)
nutritionPoints  = quantity × food.nutritionScore    (1 decimal)
knownFood        = food name exists in catalog (personal or usable catalog entry)
```

Unknown food: null macros; `No - add nickname`; excluded from calorie/protein sums.

### 6.2 Daily Summary

Per date `D`: sum macros (known foods only), count all meal rows for items, average nutrition = sum points / items (1 decimal), weight from Weight Log, 7-day rolling averages per workbook `FILTER` logic (§6 in prior spec — unchanged).

### 6.3 Dashboard metrics

Same as workbook semantics; charts read from `summarizeDays()` output.

### 6.4 Daily Summary display

**Sparse dates** — show rows only for dates with meals or weights (not full 180-day grid).

---

## 7. Data fields

### Settings (singleton in v1; per-user later)

| Field | Default |
|-------|---------|
| dailyCalorieTarget | 2000 |
| proteinTargetGrams | 100 |
| nutritionScoreTarget | 7 |
| goalWeight | 170 |

### Food

| Field | Required | Notes |
|-------|----------|-------|
| name | yes | unique in v1; per-user unique later |
| servingDescription | yes | |
| calories | yes | per serving |
| proteinGrams | yes | |
| nutritionScore | yes | 1–10; user-curated even when AI suggests |
| satietyScore | no | |
| notes | no | |
| isSystemSeed | no | `true` for USDA catalog rows |
| source | no | `workbook` \| `usda` \| `user` \| `ai` |

### Meal entry

| Field | Required | Notes |
|-------|----------|-------|
| date | yes | defaults to today in UI |
| meal | yes | five meal types |
| foodName / foodId | yes | |
| quantity | yes | default 1; decimals OK |
| notes | no | |

### Weight entry

Unchanged — date (unique), weight, optional goalWeight, notes.

### Favorites & recents (v1)

| Entity | Rule |
|--------|------|
| `food_favorites` | user-pinned; ordered |
| `food_recent` | updated on each meal log; by `last_used_at` |

### Future multi-user (not v1 — design now)

When adding accounts later:

- Add `user_id` to `settings`, `foods` (personal rows), `meal_entries`, `weight_entries`, `food_favorites`
- Keep `is_system_seed` foods global (no `user_id`)
- Unique constraint becomes `(user_id, name)` for personal foods

v1 omits `user_id` columns; do not hard-code singleton assumptions in UI copy.

---

## 8. Application architecture

See [spa-architecture.md](./spa-architecture.md).

### Stack additions for v1

| Layer | Choice |
|-------|--------|
| Charts | Chart.js + `vue-chartjs` |
| AI | Server route → OpenAI-compatible API (env `OPENAI_API_KEY`) |
| Catalog seed | `server/data/system-foods.json` + import script |

### API (v1)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/tracker` | Bootstrap snapshot |
| GET | `/api/foods?q=&filter=` | Search; `filter=my\|catalog\|all` |
| POST | `/api/foods` | Create personal food |
| POST | `/api/foods/suggest` | AI structured suggestion (no save) |
| PATCH | `/api/foods/:id` | Edit personal food |
| DELETE | `/api/foods/:id` | Delete if no meals reference |
| GET | `/api/foods/favorites` | Favorites + recents for Log |
| POST | `/api/foods/:id/favorite` | Toggle favorite |
| POST | `/api/meals` | Log meal; updates recents |
| PATCH | `/api/meals/:id` | Edit meal |
| DELETE | `/api/meals/:id` | Delete meal |
| POST | `/api/weights` | Upsert by date |
| DELETE | `/api/weights/:id` | Delete weight |
| PUT | `/api/settings` | Update targets |

Persistence: Postgres only; no localStorage.

---

## 9. UI requirements

### Global

- 44px+ touch targets; phone-first
- Loading and error states; toast on save/delete failure

### Dashboard

- Editable targets
- Today metrics vs targets
- **Charts:** 7-day calories (bar + target line), weight trend (line + goal line), protein progress (bar)
- Daily summary table (~14 recent rows)
- Date selector for reviewing past days

### Log (most important screen)

- **Date:** default today; visible but secondary (collapse or small control — changing date is infrequent)
- **Meal type:** segmented control or select
- **Favorites row:** horizontal scroll chips
- **Recents row:** below favorites
- **Search:** combobox over personal + catalog
- **Quantity:** stepper + numeric input
- **Live preview:** calories, protein, nutrition points
- **Primary action:** large Save button; clears quantity to 1, keeps food selected for repeat entries
- **Today's meals:** list with obvious edit/delete on each row
- **Unknown food:** inline prompt → manual add or AI suggest

### Foods

- Search, filter (My / Catalog / All)
- Add manual / Add with AI
- Edit/delete personal foods; favorite toggle
- Catalog items: view + "Use" or "Copy to my foods"

### Weight

- Default today; history with edit/delete

### Help

- Workbook instruction steps + short note on AI and favorites

---

## 10. Seed data

1. **Personal:** `docs/original/Daily Intake - 2026-06-28.xlsx` → `server/data/seed.json` (`source: workbook`)
2. **Catalog:** `server/data/system-foods.json` (~200–500 items, `isSystemSeed: true`, `source: usda`)
3. `npm run db:setup` loads schema + both; idempotent upsert by name for personal, by stable id/slug for catalog

Regenerate personal seed:

```bash
npm run generate:seed
```

Nutrition score for USDA items: default **5** if no better signal; user adjusts on first log or when copying to personal foods.

---

## 11. AI food suggest (v1)

### Request

`POST /api/foods/suggest`

```json
{ "description": "two eggs scrambled with cheese" }
```

### Response (example)

```json
{
  "name": "Scrambled eggs with cheese",
  "servingDescription": "2 large eggs with 1 oz cheddar",
  "calories": 320,
  "proteinGrams": 22,
  "nutritionScore": 7,
  "notes": "Estimate; adjust for portion.",
  "confidence": "medium"
}
```

### Rules

- Server-side only — API key never exposed to client
- LLM returns JSON matching food fields; validate ranges (calories ≥ 0, nutrition 1–10)
- No automatic save; user confirms on form
- On failure: clear error, fall back to manual entry
- Rate-limit suggest endpoint in production (implementation detail)

### Environment

```
DATABASE_URL=...
OPENAI_API_KEY=...   # or compatible API base URL
```

---

## 12. Testing and acceptance

### Automated

- Existing nutrition unit tests
- Workbook parity fixtures (2026-06-28 dates)
- AI suggest: mock LLM in tests; assert response shape validation

### Manual acceptance

- [ ] Log favorite meal in ≤3 taps; date is today
- [ ] Edit and delete meal; dashboard and charts update
- [ ] Search catalog food and log it
- [ ] AI suggest → edit score → save → log meal
- [ ] Three charts render on Dashboard with seed data
- [ ] Personal food ranks above catalog in search for same query
- [ ] `npm test`, `npm run typecheck`, `npm run build` pass

---

## 13. Implementation phases

| Phase | Deliverable |
|-------|-------------|
| **0 — Spec & seed** | This doc; regenerate personal seed; system-foods pipeline started |
| **1 — Foundation** | Schema v2, repository, API routes, DB-first composable, tab shell |
| **2 — Calculations & parity** | `utils/nutrition.ts` verified; workbook fixture tests |
| **3 — Log (priority)** | Favorites, recents, today default, edit/delete, search |
| **4 — Foods & catalog** | Personal CRUD, system seed load, search ranking |
| **5 — Dashboard & charts** | Metrics, three charts, summary table, editable targets |
| **6 — AI suggest** | `/api/foods/suggest`, confirm UI on Foods + Log |
| **7 — Weight & polish** | Weight CRUD, help text, remove legacy prototype code |

---

## 14. Open questions

| # | Question | Default |
|---|----------|---------|
| 1 | AI provider | OpenAI API; abstract behind server service |
| 2 | Catalog size | ~300 USDA items for v1 |
| 3 | Nutrition score on catalog/AI foods | Suggest/default 5; user edits freely |
| 4 | Delete food with meals | Block: "Used in N meals" |
| 5 | Meal type default on Log | Last used meal type |

---

## 15. Success criteria

v1 succeeds when you stop opening the spreadsheet for daily tracking:

1. Meals log in seconds with today’s date, favorites, and edit/delete.
2. Dashboard charts show calorie and weight trends the workbook cannot.
3. Catalog + AI replace cut-and-paste nutrition lookup for new foods.
4. Workbook math still holds for imported history.
5. Architecture can grow to multi-user without a rewrite.
