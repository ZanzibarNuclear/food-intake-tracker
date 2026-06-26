import fs from "node:fs/promises";
import process from "node:process";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required. Example: DATABASE_URL='postgresql://...' npm run db:setup");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: true },
});

const schema = await fs.readFile(new URL("../docs/postgres-schema.sql", import.meta.url), "utf8");
const seed = JSON.parse(
  await fs.readFile(new URL("../server/data/seed.json", import.meta.url), "utf8"),
);

try {
  await pool.query(schema);
  await pool.query("begin");
  await pool.query(
    `insert into settings (
      id,
      daily_calorie_target,
      protein_target_grams,
      nutrition_score_target,
      goal_weight
    ) values (1, $1, $2, $3, $4)
    on conflict (id) do update set
      daily_calorie_target = excluded.daily_calorie_target,
      protein_target_grams = excluded.protein_target_grams,
      nutrition_score_target = excluded.nutrition_score_target,
      goal_weight = excluded.goal_weight`,
    [
      seed.settings.dailyCalorieTarget,
      seed.settings.proteinTargetGrams,
      seed.settings.nutritionScoreTarget,
      seed.settings.goalWeight,
    ],
  );

  for (const food of seed.foods) {
    await pool.query(
      `insert into foods (
        name,
        serving_description,
        calories,
        protein_grams,
        nutrition_score,
        satiety_score,
        notes
      ) values ($1, $2, $3, $4, $5, $6, $7)
      on conflict (name) do update set
        serving_description = excluded.serving_description,
        calories = excluded.calories,
        protein_grams = excluded.protein_grams,
        nutrition_score = excluded.nutrition_score,
        satiety_score = excluded.satiety_score,
        notes = excluded.notes,
        updated_at = now()`,
      [
        food.name,
        food.servingDescription,
        food.calories,
        food.proteinGrams,
        food.nutritionScore,
        food.satietyScore,
        food.notes,
      ],
    );
  }

  for (const meal of seed.meals) {
    await pool.query(
      `insert into meal_entries (entry_date, meal, food_id, quantity, notes)
       select $1, $2, foods.id, $3, $4 from foods where foods.name = $5
       and not exists (
         select 1 from meal_entries
         where entry_date = $1
           and meal = $2
           and food_id = foods.id
           and quantity = $3
           and coalesce(notes, '') = coalesce($4, '')
       )`,
      [meal.date, meal.meal, meal.quantity, meal.notes, meal.foodName],
    );
  }

  for (const weight of seed.weights) {
    await pool.query(
      `insert into weight_entries (entry_date, weight, goal_weight, notes)
       values ($1, $2, $3, $4)
       on conflict (entry_date) do update set
         weight = excluded.weight,
         goal_weight = excluded.goal_weight,
         notes = excluded.notes,
         updated_at = now()`,
      [weight.date, weight.weight, weight.goalWeight, weight.notes],
    );
  }

  await pool.query("commit");
  console.log(
    `Database ready: ${seed.foods.length} foods, ${seed.meals.length} meals, ${seed.weights.length} weights.`,
  );
} catch (error) {
  await pool.query("rollback").catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
