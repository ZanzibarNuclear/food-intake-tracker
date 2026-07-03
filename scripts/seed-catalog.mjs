import fs from "node:fs/promises";
import { createPool } from "./db-helpers.mjs";

const pool = createPool();
const systemFoods = JSON.parse(
  await fs.readFile(new URL("../server/data/system-foods.json", import.meta.url), "utf8"),
);

try {
  await pool.query("begin");
  for (const food of systemFoods) {
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
      ) values (null, $1, $2, $3, $4, $5, $6, $7, true, 'usda')
      on conflict ((lower(name))) where is_system_seed = true and archived_at is null do update set
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
        food.nutritionScore ?? 5,
        food.satietyScore,
        food.notes,
      ],
    );
  }
  await pool.query("commit");
  console.log(`Seeded ${systemFoods.length} catalog foods.`);
} catch (error) {
  await pool.query("rollback").catch(() => {});
  throw error;
} finally {
  await pool.end();
}
