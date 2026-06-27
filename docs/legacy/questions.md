# Questions and Assumptions

This log captures open questions while keeping implementation moving from the workbook as source of truth.

## Open Questions

- Should the production app have one user only, or should it support multiple accounts later?
- Should serving units stay free-form text from the Foods sheet, or should later waves normalize cups, ounces, grams, and item counts?
- Should Nutrition Score remain a manually curated 1-10 score, or eventually be derived from micronutrients, fiber, sodium, etc.?
- Should missing foods be added inline from the meal logger, or must users always add them in Foods first?
- Should weight trend include daily scale noise smoothing beyond the current 7-day average?

## Current Assumptions

- The first prototype is single-user because the workbook is single-user.
- The prototype should not add macro or micronutrients beyond calories, protein, nutrition score, and optional satiety score.
- Food names act as nicknames and primary lookup labels, matching the spreadsheet.
- Meal nutrition is calculated as quantity multiplied by the selected food's calories, protein, and nutrition score.
- Daily average nutrition score is the simple average of logged item nutrition points divided by item count, matching the workbook formulas.
- Neon is not required to run the prototype locally. The app is structured so a Postgres-backed repository can replace the prototype repository when `DATABASE_URL` is available.
