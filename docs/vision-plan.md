# Vision Plan (Alternate Direction)

This document preserves the product and technical plan discussed before reviewing the existing prototype. It describes a more expansive v1 than the workbook-faithful prototype in `docs/product-spec.md` and `docs/implementation-plan.md`.

Use this as the reference for a possible second prototype or for deciding which features to merge into the main app.

## Goals

- Raise awareness of calories and food quality (nutrition score).
- Support weight management through daily logging and trend visibility.
- Start as a responsive web app; path to personal iPhone use without App Store requirements.

## Stack

- **Frontend:** Nuxt 3/4 (Vue), mobile-first
- **Backend:** Nuxt server routes / middleware for business logic
- **Database:** Neon Postgres
- **ORM:** Drizzle (recommended; not required)
- **Charts:** Chart.js or Apache ECharts
- **Deploy:** Vercel or Cloudflare + Neon

## v1 Scope (Expansive)

| Area | What |
|------|------|
| Dashboard | Today vs targets, progress indicators, 7/30-day calorie chart, weight trend, goal distance |
| Quick log | Date, meal type, food search/autocomplete, quantity stepper |
| Food catalog | CRUD for nicknames; seed 200–500 common foods from USDA / Open Food Facts |
| Weight log | One-tap weigh-in on dashboard |
| Settings | Calorie, protein, nutrition, and goal-weight targets |
| Auth | Simple single-user auth (magic link or passkey) |
| Import | One-time import from `Daily Intake.xlsx` |

## v1.5 (High Value)

| Feature | Why |
|---------|-----|
| AI-assisted food add | Natural language → suggested calories/protein/nutrition score → user confirms |
| PWA install | Add to Home Screen on iPhone |
| Recent / favorites | One-tap logging for top foods |

## Defer to v2+

- SMS reminders (prefer web push or iOS Shortcuts first)
- Native iPhone app (PWA first, then Capacitor if needed)
- Multi-user / social features

## Data Model

```sql
user_settings (
  calorie_target, protein_target, nutrition_target,
  goal_weight, timezone
)

foods (
  id, name, serving_description,
  calories_per_serving, protein_per_serving,
  nutrition_score, satiety_score, notes,
  is_system_seed, created_at
)

meal_entries (
  id, logged_at, meal_type,
  food_id, quantity,
  calories, protein, nutrition_points,  -- snapshot at log time
  notes
)

weight_entries (
  id, logged_at, weight, notes
)
```

Store computed macros on meal entries so edits to food definitions do not rewrite history.

## Pre-loaded Foods Strategy

Two layers:

1. **System seed** — generic items from USDA FoodData Central or Open Food Facts
2. **User nicknames** — composites like "Blueberry Protein Shake" with custom notes and scores

Search: user foods first, then seeded catalog, then add new (optionally AI-assisted).

## AI Food Entry Flow (v1.5)

1. User describes food in natural language
2. LLM returns structured estimate: name, serving, calories, protein, nutrition_score, confidence
3. User confirms or edits
4. Save to catalog and optionally log immediately

Nutrition score remains user-curated by default; AI suggests a starting value.

## SMS vs Push

Skip SMS for v1. Use web push (PWA) or iOS Shortcuts opening a pre-filled log URL. Add Twilio SMS only if push fails to drive habit.

## Native iPhone Path

| Option | Effort | Fit |
|--------|--------|-----|
| PWA + Add to Home Screen | Low | Best starting point |
| Capacitor wrapper | Medium | Same Nuxt app, sideload/TestFlight |
| SwiftUI native | High | HealthKit, widgets, Watch |

## Build Phases

### Phase 0 — Foundation
- Nuxt + Neon + schema
- Basic auth (single user)
- Excel import

### Phase 1 — Core Loop
- Food catalog CRUD + search
- Meal log (mobile-first)
- Dashboard with today vs targets
- Weight log

### Phase 2 — Dashboard Charts
- 7-day calorie bar + target line
- Weight trend with goal line
- Nutrition score and protein progress

### Phase 3 — Polish
- Seed food database
- Recent/favorites
- PWA manifest
- Settings page

### Phase 4 — AI Assist (optional)
- Add-food-with-AI endpoint + confirm UI

## Success Criteria

Log a meal in under 15 seconds on phone, see today vs 2000 cal / 100g protein / 7+ nutrition at a glance, and spot weekly weight trend toward goal — with charts the spreadsheet does not provide.

## Open Decisions

- Hosting: Vercel vs Cloudflare
- Nutrition score on seeded foods: AI-estimate at import vs leave blank
- Meal types: keep five (including Dessert) or simplify to four
