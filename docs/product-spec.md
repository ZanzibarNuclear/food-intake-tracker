# Product Specification

## Product

Weight Management Food Tracker is a mobile-first web app for logging food and beverage consumption, watching daily calorie and protein totals, preserving nutrition quality, and tracking weight toward a goal without turning meal entry into a heavy chore.

## Source of Truth

The initial scope is ported from `Daily Intake.xlsx` and limited to its workbook behavior:

- Dashboard targets: 2,000 calories/day, 100g protein/day, nutrition score 7+, goal weight 170.
- Food catalog: reusable food nicknames with serving description, calories, protein, nutrition score, optional satiety score, and notes.
- Meal log: date, meal, food, quantity, calculated calories/protein/nutrition points, notes, and known-food status.
- Daily summary: calories, protein, average nutrition score, item count, weight, 7-day average calories, and 7-day average weight.
- Weight log: date, weight, goal weight, and notes.

## Users

- Primary user: one person tracking everyday intake from a phone or tablet.
- Usage context: quick entry during or after meals, occasional food catalog edits, and daily/weekly review.

## Core Workflows

1. Review Today
   - See today's calories, protein, average nutrition score, and item count.
   - Compare calories, protein, nutrition score, current weight, and weight-to-goal against targets.

2. Log a Meal
   - Choose date, meal type, known food nickname, and quantity.
   - See calculated calories/protein/nutrition immediately.
   - Add optional notes.

3. Maintain Foods
   - Add or edit reusable foods with serving description and per-serving values.
   - Use food nicknames as the fast lookup label for meal entry.

4. Track Weight
   - Record weight by date.
   - See current weight and 7-day average weight in summaries.

5. Review Trends
   - Browse daily summary rows.
   - Watch 7-day calorie average and 7-day weight average.

## Non-Goals for First Prototype

- No barcode scanner, external nutrition database, image recognition, or AI meal estimation.
- No micronutrient breakdown beyond the spreadsheet's nutrition score.
- No multi-user auth.
- No recommendations beyond displaying target comparisons.
- No exports or Google Sheets sync.

## Functional Requirements

- The app must work at phone and tablet widths.
- The app must preserve spreadsheet calculations:
  - Meal calories = quantity x food calories.
  - Meal protein = quantity x food protein.
  - Meal nutrition points = quantity x food nutrition score.
  - Daily nutrition score = total nutrition points / items logged, rounded to 1 decimal.
  - 7-day calorie average = average non-zero daily calories over current day and prior six days.
  - 7-day weight average = average logged weights over current day and prior six days.
- Unknown food names must be detectable as `No - add nickname`.
- Food and meal entry must support decimal quantities.
- Targets must default to the workbook values.

## Data Fields

- Settings: daily calorie target, protein target grams, nutrition score target, goal weight.
- Food: name, serving description, calories, protein grams, nutrition score, satiety score, notes.
- Meal entry: date, meal, food name, quantity, notes.
- Weight entry: date, weight, goal weight, notes.

## Success Criteria

- A user can open the app on mobile, log a meal from a known food, and see the dashboard update.
- A user can add a food nickname and then use it in meal logging.
- A user can add a weight and see current weight and weight-to-goal update.
- Unit tests cover the spreadsheet-equivalent nutrition and summary calculations.
