import fs from "node:fs/promises";
import { createPool } from "./db-helpers.mjs";

const email = process.env.USER_EMAIL;
if (!email) {
  console.error("USER_EMAIL is required. Example: USER_EMAIL='you@example.com' npm run db:seed:user");
  process.exit(1);
}

const pool = createPool();
const seed = JSON.parse(await fs.readFile(new URL("../server/data/seed.json", import.meta.url), "utf8"));

async function findUserId() {
  const result = await pool.query(`select id from "user" where lower(email) = lower($1)`, [email]);
  if (!result.rowCount) {
    throw new Error(`No Better Auth user found for ${email}. Sign in once before seeding personal data.`);
  }
  return result.rows[0].id;
}

try {
  const userId = await findUserId();
  await pool.query("begin");
  await pool.query(
    `insert into settings (
      user_id,
      daily_calorie_target,
      protein_target_grams,
      nutrition_score_target,
      goal_weight
    ) values ($1, $2, $3, $4, $5)
    on conflict (user_id) where user_id is not null do update set
      daily_calorie_target = excluded.daily_calorie_target,
      protein_target_grams = excluded.protein_target_grams,
      nutrition_score_target = excluded.nutrition_score_target,
      goal_weight = excluded.goal_weight,
      updated_at = now()`,
    [
      userId,
      seed.settings.dailyCalorieTarget,
      seed.settings.proteinTargetGrams,
      seed.settings.nutritionScoreTarget,
      seed.settings.goalWeight,
    ],
  );

  for (const food of seed.foods) {
    await pool.query(
      `insert into foods (
        user_id,
        name,
        serving_description,
        calories,
        protein_grams,
        nutrition_score,
        satiety_score,
        notes,
        is_system_seed,
        source
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, false, 'workbook')
      on conflict (user_id, (lower(name))) where is_system_seed = false do update set
        serving_description = excluded.serving_description,
        calories = excluded.calories,
        protein_grams = excluded.protein_grams,
        nutrition_score = excluded.nutrition_score,
        satiety_score = excluded.satiety_score,
        notes = excluded.notes,
        source = excluded.source,
        updated_at = now()`,
      [
        userId,
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
      `insert into meal_entries (user_id, entry_date, meal, food_id, quantity, notes)
       select $1, $2, $3, foods.id, $4, $5
       from foods
       where foods.user_id = $1
         and foods.name = $6
       and not exists (
         select 1 from meal_entries
         where user_id = $1
           and entry_date = $2
           and meal = $3
           and food_id = foods.id
           and quantity = $4
           and coalesce(notes, '') = coalesce($5, '')
       )`,
      [userId, meal.date, meal.meal, meal.quantity, meal.notes, meal.foodName],
    );
  }

  for (const weight of seed.weights) {
    await pool.query(
      `insert into weight_entries (user_id, entry_date, weight, goal_weight, notes)
       values ($1, $2, $3, $4, $5)
       on conflict (user_id, entry_date) where user_id is not null do update set
         weight = excluded.weight,
         goal_weight = excluded.goal_weight,
         notes = excluded.notes,
         updated_at = now()`,
      [userId, weight.date, weight.weight, weight.goalWeight, weight.notes],
    );
  }

  await pool.query(
    `insert into food_recent (user_id, food_id, last_used_at, use_count)
     select user_id, food_id, max(created_at), count(*)::int
     from meal_entries
     where user_id = $1
     group by user_id, food_id
     on conflict (user_id, food_id) do update set
       last_used_at = excluded.last_used_at,
       use_count = excluded.use_count`,
    [userId],
  );

  const counts = await pool.query(
    `select
      (select count(*)::int from foods where user_id = $1 and is_system_seed = false) as personal_foods,
      (select count(*)::int from meal_entries where user_id = $1) as meals,
      (select count(*)::int from weight_entries where user_id = $1) as weights,
      exists(select 1 from foods where user_id = $1 and name = 'Blueberry Protein Shake') as has_blueberry_shake`,
    [userId],
  );

  await pool.query("commit");
  const row = counts.rows[0];
  console.log(
    `Seeded ${seed.foods.length} personal foods, ${seed.meals.length} meals, and ${seed.weights.length} weights for ${email}.`,
  );
  console.log(
    `Database now has ${row.personal_foods} personal foods, ${row.meals} meals, ${row.weights} weights for this user. Blueberry Protein Shake: ${row.has_blueberry_shake ? "yes" : "no"}.`,
  );
} catch (error) {
  await pool.query("rollback").catch(() => {});
  throw error;
} finally {
  await pool.end();
}
