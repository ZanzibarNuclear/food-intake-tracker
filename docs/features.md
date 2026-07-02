# Features

Living product spec. [implementation-plan.md](./implementation-plan.md) covers architecture and build phases; **this doc defines what each feature should do** before and during implementation.

## Status key

| Status | Meaning |
|--------|---------|
| **Spec** | Defined, not started |
| **In progress** | Being built |
| **Done** | Shipped |

---

## F001 — User timezone

**Status:** Done

### Problem

The app treats “today” and displayed times as UTC (Greenwich). Meal logging dates, the header clock, and any logged timestamps can be wrong for users outside UTC — e.g. dinner logged after 7 PM Eastern may show as the next calendar day.

### Requirements

1. **Setting** — Store a single IANA timezone on the user settings row (e.g. `America/New_York`). Persist in Postgres with other targets.
2. **Default** — On first use, default to the browser’s reported timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`). Save explicitly when the user opens Settings and saves.
3. **“Today”** — All “default to today” behavior (Log, Weight, Dashboard) uses the user’s timezone, not UTC.
4. **Display** — Header shows current local date and time in the user’s timezone. Meal list shows logged time (from `created_at`) in the user’s timezone.
5. **Settings UI** — Account menu (header, right) → **Settings** → timezone picker with readable labels.
6. **Scope** — Timezone affects display and calendar-day boundaries only. Workbook `entry_date` values remain as stored dates; no retroactive date migration.

### Out of scope

- Per-user accounts (still single-user v1).
- Automatic DST notifications.
- Changing server/Neon storage from UTC (timestamps stay `timestamptz`; conversion is client + “today” helpers).

### Acceptance criteria

- [x] User can open Settings from account menu and pick a timezone.
- [x] Setting persists across reloads.
- [x] Header shows local date/time, not UTC.
- [x] Log screen defaults meal date to today in chosen timezone.
- [x] Meal rows show logged time in chosen timezone.
- [x] Changing timezone updates header and meal times immediately after save.

### Technical notes

- DB: `settings.timezone text not null default 'UTC'`
- API: include `timezone` in `GET /api/tracker` and `PUT /api/settings`
- Helpers: `todayIso(timeZone)`, `formatInTimeZone(date, timeZone, …)` in `utils/dates.ts` or `utils/timezone.ts`
- Meals API: expose `loggedAt` (ISO) from `meal_entries.created_at`

---

## F002 — Durable food logging

**Status:** Done

### Problem

Meal rows were selected by food name even though Postgres stores `meal_entries.food_id`. Name-based logging is fragile once catalog foods, copied foods, and renamed personal foods exist.

### Requirements

1. Meal create/edit payloads may include `foodId`; server resolves by id first.
2. Meal responses include both `foodId` and `foodName`.
3. Nutrition calculations use `foodId` first and keep food-name fallback for workbook/import compatibility.
4. Editing a weight entry preserves the row id so changing date updates that entry instead of silently creating another one.

### Acceptance criteria

- [x] Logging from search/favorites/recents sends a durable food id.
- [x] Catalog foods can be logged directly.
- [x] Existing workbook-imported rows still summarize correctly.
- [x] Weight edit sends the entry id.

---

## F003 — Catalog use, copy, and satiety

**Status:** In progress

### Problem

The catalog should help logging immediately but also allow personal customization of nutrition and satiety ratings.

### Requirements

1. Foods screen supports filters: All / My foods / Catalog.
2. Catalog rows are read-only.
3. `Use` sends the food to Log for immediate entry.
4. `Copy` creates an editable personal food based on a catalog food.
5. Catalog data includes calories, protein, nutrition score, and satiety score.
6. Near-term import should pull a few thousand FDA/USDA foods with stable source ids.

### Acceptance criteria

- [x] Catalog food can be used for logging without manual nutrition entry.
- [x] Catalog food can be copied to a personal food and edited.
- [x] Starter catalog has no missing satiety scores.
- [ ] Bulk FDA/USDA import exists and uses stable source ids.

---

## F004 — Magic-link auth and multi-user data

**Status:** In progress

### Problem

The app cannot be safely deployed while all data is single-user and unauthenticated.

### Requirements

1. Use Better Auth for authentication.
2. Support passwordless magic-link login.
3. Send magic links through Resend when configured; log links locally when Resend is absent.
4. Scope personal settings, foods, meals, weights, favorites, and recents by authenticated user.
5. Keep system catalog foods global and visible to all users.
6. Block all tracker API routes without a session.
7. Split database migration, catalog seed, and per-user workbook seed scripts.

### Acceptance criteria

- [x] Anonymous users see a login screen.
- [x] Tracker APIs require a Better Auth session.
- [x] App tables include `user_id` for personal data.
- [x] Catalog foods remain global.
- [x] `db:migrate`, `db:seed:catalog`, and `db:seed:user` are separate scripts.
- [ ] Run Better Auth migration against the target database.
- [ ] Full local magic-link smoke test with a real database.

---

## Template (copy for new features)

### F00X — Title

**Status:** Spec

### Problem

…

### Requirements

…

### Out of scope

…

### Acceptance criteria

- [ ] …

### Technical notes

…
