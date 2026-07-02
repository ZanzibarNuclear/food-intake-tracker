import type { Food, MealEntry, TrackerData, TrackerSettings, WeightEntry } from "~/types/nutrition";
import { getPool, toIsoDate } from "~/server/utils/db";

type FoodRow = {
  id: string | number;
  name: string;
  serving_description: string;
  calories: string | number;
  protein_grams: string | number;
  nutrition_score: string | number;
  satiety_score: string | number | null;
  notes: string | null;
  is_system_seed: boolean;
  source: string | null;
};

function mapFood(row: FoodRow): Food {
  return {
    id: Number(row.id),
    name: row.name,
    servingDescription: row.serving_description,
    calories: Number(row.calories),
    proteinGrams: Number(row.protein_grams),
    nutritionScore: Number(row.nutrition_score),
    satietyScore: row.satiety_score === null ? null : Number(row.satiety_score),
    notes: row.notes,
    isSystemSeed: row.is_system_seed,
    source: (row.source as Food["source"]) ?? null,
  };
}

function mapMeal(row: {
  id: string | number;
  entry_date: Date | string;
  meal: string;
  food_name: string;
  quantity: string | number;
  notes: string | null;
}): MealEntry {
  return {
    id: Number(row.id),
    date: toIsoDate(row.entry_date),
    meal: row.meal,
    foodName: row.food_name,
    quantity: Number(row.quantity),
    notes: row.notes,
  };
}

function mapWeight(row: {
  id: string | number;
  entry_date: Date | string;
  weight: string | number;
  goal_weight: string | number | null;
  notes: string | null;
}): WeightEntry {
  return {
    id: Number(row.id),
    date: toIsoDate(row.entry_date),
    weight: Number(row.weight),
    goalWeight: row.goal_weight === null ? null : Number(row.goal_weight),
    notes: row.notes,
  };
}

async function touchRecentFood(foodId: number): Promise<void> {
  const db = getPool();
  await db.query(
    `insert into food_recent (food_id, last_used_at, use_count)
     values ($1, now(), 1)
     on conflict (food_id) do update set
       last_used_at = now(),
       use_count = food_recent.use_count + 1`,
    [foodId],
  );
}

export async function getTrackerData(): Promise<TrackerData> {
  const db = getPool();
  const [settingsResult, foodsResult, mealsResult, weightsResult] = await Promise.all([
    db.query("select * from settings where id = 1"),
    db.query("select * from foods order by is_system_seed asc, name asc"),
    db.query(
      `select meal_entries.id, entry_date, meal, foods.name as food_name, quantity, meal_entries.notes
       from meal_entries
       join foods on foods.id = meal_entries.food_id
       order by entry_date desc, meal_entries.id desc`,
    ),
    db.query("select * from weight_entries order by entry_date desc"),
  ]);

  if (!settingsResult.rowCount) {
    throw createError({ statusCode: 500, statusMessage: "Settings row is missing." });
  }

  const settingsRow = settingsResult.rows[0];
  return {
    settings: {
      dailyCalorieTarget: Number(settingsRow.daily_calorie_target),
      proteinTargetGrams: Number(settingsRow.protein_target_grams),
      nutritionScoreTarget: Number(settingsRow.nutrition_score_target),
      goalWeight: Number(settingsRow.goal_weight),
    },
    foods: foodsResult.rows.map((row) => mapFood(row as FoodRow)),
    meals: mealsResult.rows.map((row) => mapMeal(row)),
    weights: weightsResult.rows.map((row) => mapWeight(row)),
  };
}

export async function updateSettings(settings: TrackerSettings): Promise<TrackerSettings> {
  const db = getPool();
  const result = await db.query(
    `update settings set
      daily_calorie_target = $1,
      protein_target_grams = $2,
      nutrition_score_target = $3,
      goal_weight = $4
     where id = 1
     returning *`,
    [
      settings.dailyCalorieTarget,
      settings.proteinTargetGrams,
      settings.nutritionScoreTarget,
      settings.goalWeight,
    ],
  );
  const row = result.rows[0];
  return {
    dailyCalorieTarget: Number(row.daily_calorie_target),
    proteinTargetGrams: Number(row.protein_target_grams),
    nutritionScoreTarget: Number(row.nutrition_score_target),
    goalWeight: Number(row.goal_weight),
  };
}

export async function searchFoods(
  query = "",
  filter: "all" | "my" | "catalog" = "all",
  limit = 50,
): Promise<Food[]> {
  const db = getPool();
  const trimmed = query.trim();
  const result = await db.query(
    `select * from foods
     where ($1 = '' or name ilike '%' || $1 || '%' or serving_description ilike '%' || $1 || '%')
       and (
         $2 = 'all'
         or ($2 = 'my' and is_system_seed = false)
         or ($2 = 'catalog' and is_system_seed = true)
       )
     order by is_system_seed asc, name asc
     limit $3`,
    [trimmed, filter, limit],
  );
  return result.rows.map((row) => mapFood(row as FoodRow));
}

export async function getFoodQuickList(): Promise<{ favorites: Food[]; recents: Food[] }> {
  const db = getPool();
  const [favoritesResult, recentsResult] = await Promise.all([
    db.query(
      `select foods.* from food_favorites
       join foods on foods.id = food_favorites.food_id
       order by food_favorites.sort_order asc, foods.name asc`,
    ),
    db.query(
      `select foods.* from food_recent
       join foods on foods.id = food_recent.food_id
       order by food_recent.last_used_at desc
       limit 8`,
    ),
  ]);
  return {
    favorites: favoritesResult.rows.map((row) => mapFood(row as FoodRow)),
    recents: recentsResult.rows.map((row) => mapFood(row as FoodRow)),
  };
}

export async function createFood(food: Food): Promise<Food> {
  const db = getPool();
  const isSystemSeed = food.isSystemSeed ?? false;
  const source = food.source ?? (isSystemSeed ? "usda" : "user");
  const result = await db.query(
    `insert into foods (
      name, serving_description, calories, protein_grams, nutrition_score,
      satiety_score, notes, is_system_seed, source
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    returning *`,
    [
      food.name.trim(),
      food.servingDescription.trim(),
      food.calories,
      food.proteinGrams,
      food.nutritionScore,
      food.satietyScore,
      food.notes,
      isSystemSeed,
      source,
    ],
  );
  return mapFood(result.rows[0] as FoodRow);
}

export async function updateFood(id: number, food: Food): Promise<Food> {
  const db = getPool();
  const existing = await db.query("select is_system_seed from foods where id = $1", [id]);
  if (!existing.rowCount) {
    throw createError({ statusCode: 404, statusMessage: "Food not found." });
  }
  if (existing.rows[0].is_system_seed) {
    throw createError({ statusCode: 403, statusMessage: "System catalog foods cannot be edited." });
  }

  const result = await db.query(
    `update foods set
      name = $2,
      serving_description = $3,
      calories = $4,
      protein_grams = $5,
      nutrition_score = $6,
      satiety_score = $7,
      notes = $8,
      updated_at = now()
     where id = $1
     returning *`,
    [
      id,
      food.name.trim(),
      food.servingDescription.trim(),
      food.calories,
      food.proteinGrams,
      food.nutritionScore,
      food.satietyScore,
      food.notes,
    ],
  );
  return mapFood(result.rows[0] as FoodRow);
}

export async function deleteFood(id: number): Promise<void> {
  const db = getPool();
  const existing = await db.query("select is_system_seed from foods where id = $1", [id]);
  if (!existing.rowCount) {
    throw createError({ statusCode: 404, statusMessage: "Food not found." });
  }
  if (existing.rows[0].is_system_seed) {
    throw createError({ statusCode: 403, statusMessage: "System catalog foods cannot be deleted." });
  }

  const mealCount = await db.query("select count(*)::int as count from meal_entries where food_id = $1", [
    id,
  ]);
  const count = mealCount.rows[0].count as number;
  if (count > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: `Used in ${count} meal${count === 1 ? "" : "s"}.`,
    });
  }

  await db.query("delete from foods where id = $1", [id]);
}

export async function toggleFavorite(foodId: number): Promise<{ favorited: boolean }> {
  const db = getPool();
  const existing = await db.query("select 1 from food_favorites where food_id = $1", [foodId]);
  if (existing.rowCount) {
    await db.query("delete from food_favorites where food_id = $1", [foodId]);
    return { favorited: false };
  }

  const maxOrder = await db.query("select coalesce(max(sort_order), 0) + 1 as next from food_favorites");
  await db.query("insert into food_favorites (food_id, sort_order) values ($1, $2)", [
    foodId,
    maxOrder.rows[0].next,
  ]);
  return { favorited: true };
}

export async function createMeal(meal: MealEntry): Promise<MealEntry> {
  const db = getPool();
  const foodResult = await db.query("select id from foods where name = $1", [meal.foodName.trim()]);
  if (!foodResult.rowCount) {
    throw createError({ statusCode: 422, statusMessage: "Food must be added before logging." });
  }

  const foodId = Number(foodResult.rows[0].id);
  const result = await db.query(
    `insert into meal_entries (entry_date, meal, food_id, quantity, notes)
     values ($1, $2, $3, $4, $5)
     returning id, entry_date, meal, quantity, notes`,
    [meal.date, meal.meal, foodId, meal.quantity, meal.notes],
  );
  await touchRecentFood(foodId);

  const row = result.rows[0];
  return {
    id: Number(row.id),
    date: toIsoDate(row.entry_date),
    meal: row.meal,
    foodName: meal.foodName.trim(),
    quantity: Number(row.quantity),
    notes: row.notes,
  };
}

export async function updateMeal(id: number, meal: MealEntry): Promise<MealEntry> {
  const db = getPool();
  const foodResult = await db.query("select id from foods where name = $1", [meal.foodName.trim()]);
  if (!foodResult.rowCount) {
    throw createError({ statusCode: 422, statusMessage: "Food must exist in catalog." });
  }

  const foodId = Number(foodResult.rows[0].id);
  const result = await db.query(
    `update meal_entries set
      entry_date = $2,
      meal = $3,
      food_id = $4,
      quantity = $5,
      notes = $6,
      updated_at = now()
     where id = $1
     returning id, entry_date, meal, quantity, notes`,
    [id, meal.date, meal.meal, foodId, meal.quantity, meal.notes],
  );
  if (!result.rowCount) {
    throw createError({ statusCode: 404, statusMessage: "Meal not found." });
  }

  await touchRecentFood(foodId);
  const row = result.rows[0];
  return {
    id: Number(row.id),
    date: toIsoDate(row.entry_date),
    meal: row.meal,
    foodName: meal.foodName.trim(),
    quantity: Number(row.quantity),
    notes: row.notes,
  };
}

export async function deleteMeal(id: number): Promise<void> {
  const db = getPool();
  const result = await db.query("delete from meal_entries where id = $1 returning id", [id]);
  if (!result.rowCount) {
    throw createError({ statusCode: 404, statusMessage: "Meal not found." });
  }
}

export async function upsertWeight(weight: WeightEntry): Promise<WeightEntry> {
  const db = getPool();
  const result = await db.query(
    `insert into weight_entries (entry_date, weight, goal_weight, notes)
     values ($1, $2, $3, $4)
     on conflict (entry_date) do update set
       weight = excluded.weight,
       goal_weight = excluded.goal_weight,
       notes = excluded.notes,
       updated_at = now()
     returning *`,
    [weight.date, weight.weight, weight.goalWeight, weight.notes],
  );
  return mapWeight(result.rows[0]);
}

export async function deleteWeight(id: number): Promise<void> {
  const db = getPool();
  const result = await db.query("delete from weight_entries where id = $1 returning id", [id]);
  if (!result.rowCount) {
    throw createError({ statusCode: 404, statusMessage: "Weight entry not found." });
  }
}
