import type {
  Food,
  FoodSearchResult,
  MealEntry,
  TrackerData,
  TrackerSettings,
  WeightEntry,
} from "~/types/nutrition";
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
  archived_at?: string | Date | null;
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
    archivedAt: row.archived_at ? new Date(row.archived_at).toISOString() : null,
  };
}

function mapMeal(row: {
  id: string | number;
  entry_date: Date | string;
  meal: string;
  food_id: string | number;
  food_name: string;
  quantity: string | number;
  notes: string | null;
  created_at?: Date | string;
}): MealEntry {
  return {
    id: Number(row.id),
    foodId: Number(row.food_id),
    date: toIsoDate(row.entry_date),
    meal: row.meal,
    foodName: row.food_name,
    quantity: Number(row.quantity),
    notes: row.notes,
    loggedAt: row.created_at ? new Date(row.created_at).toISOString() : null,
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

function mapSettings(row: {
  alias?: string | null;
  daily_calorie_target: string | number;
  protein_target_grams: string | number;
  nutrition_score_target: string | number;
  goal_weight: string | number;
  timezone: string | null;
}): TrackerSettings {
  return {
    alias: row.alias ?? null,
    dailyCalorieTarget: Number(row.daily_calorie_target),
    proteinTargetGrams: Number(row.protein_target_grams),
    nutritionScoreTarget: Number(row.nutrition_score_target),
    goalWeight: Number(row.goal_weight),
    timezone: row.timezone ?? null,
  };
}

async function ensureSettings(userId: string): Promise<TrackerSettings> {
  const db = getPool();
  const [settingsResult, userResult] = await Promise.all([
    db.query(
      `insert into settings (user_id)
       values ($1)
       on conflict (user_id) where user_id is not null do update set user_id = excluded.user_id
       returning *`,
      [userId],
    ),
    db.query(`select name from "user" where id = $1`, [userId]),
  ]);
  return mapSettings({ ...settingsResult.rows[0], alias: userResult.rows[0]?.name ?? null });
}

async function touchRecentFood(userId: string, foodId: number): Promise<void> {
  const db = getPool();
  await db.query(
    `insert into food_recent (user_id, food_id, last_used_at, use_count)
     values ($1, $2, now(), 1)
     on conflict (user_id, food_id) do update set
       last_used_at = now(),
       use_count = food_recent.use_count + 1`,
    [userId, foodId],
  );
}

async function findVisibleFood(userId: string, food: Pick<MealEntry, "foodId" | "foodName">) {
  const db = getPool();
  if (food.foodId !== undefined) {
    return db.query(
      `select id, name from foods
       where id = $1
         and archived_at is null
         and (is_system_seed = true or user_id = $2)`,
      [food.foodId, userId],
    );
  }

  return db.query(
    `select id, name from foods
     where name = $1
       and archived_at is null
       and (is_system_seed = true or user_id = $2)
     order by is_system_seed asc
     limit 1`,
    [food.foodName.trim(), userId],
  );
}

export async function getTrackerData(userId: string): Promise<TrackerData> {
  const db = getPool();
  const [settings, foodsResult, mealsResult, weightsResult] = await Promise.all([
    ensureSettings(userId),
    db.query(
      `select * from foods
       where (is_system_seed = true and archived_at is null) or user_id = $1
       order by lower(name) asc, name asc, is_system_seed asc, id asc`,
      [userId],
    ),
    db.query(
      `select meal_entries.id, entry_date, meal, meal_entries.food_id, foods.name as food_name, quantity, meal_entries.notes, meal_entries.created_at
       from meal_entries
       join foods on foods.id = meal_entries.food_id
       where meal_entries.user_id = $1
       order by entry_date desc, meal_entries.id desc`,
      [userId],
    ),
    db.query("select * from weight_entries where user_id = $1 order by entry_date desc", [userId]),
  ]);

  return {
    settings,
    foods: foodsResult.rows.map((row) => mapFood(row as FoodRow)),
    meals: mealsResult.rows.map((row) => mapMeal(row)),
    weights: weightsResult.rows.map((row) => mapWeight(row)),
  };
}

export async function updateSettings(userId: string, settings: TrackerSettings): Promise<TrackerSettings> {
  const db = getPool();
  const [settingsResult, userResult] = await Promise.all([
    db.query(
      `insert into settings (
        user_id,
        daily_calorie_target,
        protein_target_grams,
        nutrition_score_target,
        goal_weight,
        timezone
      ) values ($1, $2, $3, $4, $5, $6)
      on conflict (user_id) where user_id is not null do update set
        daily_calorie_target = excluded.daily_calorie_target,
        protein_target_grams = excluded.protein_target_grams,
        nutrition_score_target = excluded.nutrition_score_target,
        goal_weight = excluded.goal_weight,
        timezone = excluded.timezone,
        updated_at = now()
      returning *`,
      [
        userId,
        settings.dailyCalorieTarget,
        settings.proteinTargetGrams,
        settings.nutritionScoreTarget,
        settings.goalWeight,
        settings.timezone ?? null,
      ],
    ),
    db.query(`update "user" set name = $2 where id = $1 returning name`, [
      userId,
      settings.alias?.trim() ?? "",
    ]),
  ]);
  return mapSettings({ ...settingsResult.rows[0], alias: userResult.rows[0]?.name ?? null });
}

export async function searchFoods(
  userId: string,
  query = "",
  filter: "all" | "my" | "catalog" = "all",
  page = 1,
  pageSize = 25,
): Promise<FoodSearchResult> {
  const db = getPool();
  const trimmed = query.trim();
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(Math.max(1, pageSize), 100);
  const offset = (safePage - 1) * safePageSize;
  const [result, countResult] = await Promise.all([
    db.query(
    `select * from foods
     where ($1 = '' or name ilike '%' || $1 || '%' or serving_description ilike '%' || $1 || '%')
       and archived_at is null
       and (
         ($2 = 'all' and (is_system_seed = true or user_id = $3))
         or ($2 = 'my' and is_system_seed = false and user_id = $3)
         or ($2 = 'catalog' and is_system_seed = true)
       )
     order by lower(name) asc, name asc, is_system_seed asc, id asc
     limit $4 offset $5`,
      [trimmed, filter, userId, safePageSize, offset],
    ),
    db.query(
      `select count(*)::int as count from foods
       where ($1 = '' or name ilike '%' || $1 || '%' or serving_description ilike '%' || $1 || '%')
         and archived_at is null
         and (
           ($2 = 'all' and (is_system_seed = true or user_id = $3))
           or ($2 = 'my' and is_system_seed = false and user_id = $3)
           or ($2 = 'catalog' and is_system_seed = true)
         )`,
      [trimmed, filter, userId],
    ),
  ]);
  return {
    foods: result.rows.map((row) => mapFood(row as FoodRow)),
    total: countResult.rows[0].count as number,
    page: safePage,
    pageSize: safePageSize,
  };
}

export async function getFoodQuickList(userId: string): Promise<{ favorites: Food[]; recents: Food[] }> {
  const db = getPool();
  const [favoritesResult, recentsResult] = await Promise.all([
    db.query(
      `select foods.* from food_favorites
       join foods on foods.id = food_favorites.food_id
       where food_favorites.user_id = $1
         and foods.archived_at is null
       order by food_favorites.sort_order asc, foods.name asc`,
      [userId],
    ),
    db.query(
      `select foods.* from food_recent
       join foods on foods.id = food_recent.food_id
       where food_recent.user_id = $1
         and foods.archived_at is null
       order by food_recent.last_used_at desc
       limit 8`,
      [userId],
    ),
  ]);
  return {
    favorites: favoritesResult.rows.map((row) => mapFood(row as FoodRow)),
    recents: recentsResult.rows.map((row) => mapFood(row as FoodRow)),
  };
}

export async function createFood(userId: string, food: Food): Promise<Food> {
  const db = getPool();
  const result = await db.query(
    `insert into foods (
      user_id, name, serving_description, calories, protein_grams, nutrition_score,
      satiety_score, notes, is_system_seed, source
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, false, $9)
    returning *`,
    [
      userId,
      food.name.trim(),
      food.servingDescription.trim(),
      food.calories,
      food.proteinGrams,
      food.nutritionScore,
      food.satietyScore,
      food.notes,
      food.source ?? "user",
    ],
  );
  return mapFood(result.rows[0] as FoodRow);
}

function personalCopyName(sourceName: string): string {
  return `${sourceName} (My)`;
}

async function nextAvailableFoodName(userId: string, baseName: string): Promise<string> {
  const db = getPool();
  const result = await db.query(
    `select name from foods
     where user_id = $1 and (name = $2 or name like $3)`,
    [userId, baseName, `${baseName} %`],
  );
  const used = new Set(result.rows.map((row: { name: string }) => row.name));
  if (!used.has(baseName)) return baseName;

  let index = 2;
  let candidate = `${baseName} ${index}`;
  while (used.has(candidate)) {
    index += 1;
    candidate = `${baseName} ${index}`;
  }
  return candidate;
}

export async function copySystemFood(userId: string, id: number): Promise<Food> {
  const db = getPool();
  const existing = await db.query(
    "select * from foods where id = $1 and is_system_seed = true and archived_at is null",
    [id],
  );
  if (!existing.rowCount) {
    throw createError({ statusCode: 404, statusMessage: "Catalog food not found." });
  }

  const source = mapFood(existing.rows[0] as FoodRow);
  const copyName = await nextAvailableFoodName(userId, personalCopyName(source.name));
  return createFood(userId, {
    ...source,
    id: undefined,
    name: copyName,
    isSystemSeed: false,
    source: "user",
  });
}

export async function updateFood(userId: string, id: number, food: Food): Promise<Food> {
  const db = getPool();
  const existing = await db.query(
    "select 1 from foods where id = $1 and user_id = $2 and is_system_seed = false and archived_at is null",
    [id, userId],
  );
  if (!existing.rowCount) {
    throw createError({ statusCode: 404, statusMessage: "Food not found." });
  }

  const result = await db.query(
    `update foods set
      name = $3,
      serving_description = $4,
      calories = $5,
      protein_grams = $6,
      nutrition_score = $7,
      satiety_score = $8,
      notes = $9,
      updated_at = now()
     where id = $1 and user_id = $2
     returning *`,
    [
      id,
      userId,
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

export async function deleteFood(userId: string, id: number): Promise<void> {
  const db = getPool();
  const existing = await db.query(
    "select 1 from foods where id = $1 and user_id = $2 and is_system_seed = false and archived_at is null",
    [id, userId],
  );
  if (!existing.rowCount) {
    throw createError({ statusCode: 404, statusMessage: "Food not found." });
  }

  const mealCount = await db.query(
    "select count(*)::int as count from meal_entries where food_id = $1 and user_id = $2",
    [id, userId],
  );
  const count = mealCount.rows[0].count as number;
  if (count > 0) {
    await db.query(
      `update foods
       set archived_at = now(), updated_at = now()
       where id = $1 and user_id = $2`,
      [id, userId],
    );
    await Promise.all([
      db.query("delete from food_favorites where user_id = $1 and food_id = $2", [userId, id]),
      db.query("delete from food_recent where user_id = $1 and food_id = $2", [userId, id]),
    ]);
    return;
  }

  await db.query("delete from foods where id = $1 and user_id = $2", [id, userId]);
}

export async function toggleFavorite(userId: string, foodId: number): Promise<{ favorited: boolean }> {
  const db = getPool();
  const food = await db.query(
    "select 1 from foods where id = $1 and archived_at is null and (is_system_seed = true or user_id = $2)",
    [foodId, userId],
  );
  if (!food.rowCount) {
    throw createError({ statusCode: 404, statusMessage: "Food not found." });
  }

  const existing = await db.query("select 1 from food_favorites where user_id = $1 and food_id = $2", [
    userId,
    foodId,
  ]);
  if (existing.rowCount) {
    await db.query("delete from food_favorites where user_id = $1 and food_id = $2", [userId, foodId]);
    return { favorited: false };
  }

  const maxOrder = await db.query(
    "select coalesce(max(sort_order), 0) + 1 as next from food_favorites where user_id = $1",
    [userId],
  );
  await db.query("insert into food_favorites (user_id, food_id, sort_order) values ($1, $2, $3)", [
    userId,
    foodId,
    maxOrder.rows[0].next,
  ]);
  return { favorited: true };
}

export async function createMeal(userId: string, meal: MealEntry): Promise<MealEntry> {
  const db = getPool();
  const foodResult = await findVisibleFood(userId, meal);
  if (!foodResult.rowCount) {
    throw createError({ statusCode: 422, statusMessage: "Food must be added before logging." });
  }

  const foodId = Number(foodResult.rows[0].id);
  const foodName = foodResult.rows[0].name as string;
  const result = await db.query(
    `insert into meal_entries (user_id, entry_date, meal, food_id, quantity, notes)
     values ($1, $2, $3, $4, $5, $6)
     returning id, entry_date, meal, quantity, notes, created_at`,
    [userId, meal.date, meal.meal, foodId, meal.quantity, meal.notes],
  );
  await touchRecentFood(userId, foodId);

  const row = result.rows[0];
  return {
    id: Number(row.id),
    foodId,
    date: toIsoDate(row.entry_date),
    meal: row.meal,
    foodName,
    quantity: Number(row.quantity),
    notes: row.notes,
    loggedAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}

export async function updateMeal(userId: string, id: number, meal: MealEntry): Promise<MealEntry> {
  const db = getPool();
  const foodResult = await findVisibleFood(userId, meal);
  if (!foodResult.rowCount) {
    throw createError({ statusCode: 422, statusMessage: "Food must exist in catalog." });
  }

  const foodId = Number(foodResult.rows[0].id);
  const foodName = foodResult.rows[0].name as string;
  const result = await db.query(
    `update meal_entries set
      entry_date = $3,
      meal = $4,
      food_id = $5,
      quantity = $6,
      notes = $7,
      updated_at = now()
     where id = $1 and user_id = $2
     returning id, entry_date, meal, quantity, notes, created_at`,
    [id, userId, meal.date, meal.meal, foodId, meal.quantity, meal.notes],
  );
  if (!result.rowCount) {
    throw createError({ statusCode: 404, statusMessage: "Meal not found." });
  }

  await touchRecentFood(userId, foodId);
  const row = result.rows[0];
  return {
    id: Number(row.id),
    foodId,
    date: toIsoDate(row.entry_date),
    meal: row.meal,
    foodName,
    quantity: Number(row.quantity),
    notes: row.notes,
    loggedAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}

export async function deleteMeal(userId: string, id: number): Promise<void> {
  const db = getPool();
  const result = await db.query("delete from meal_entries where id = $1 and user_id = $2 returning id", [
    id,
    userId,
  ]);
  if (!result.rowCount) {
    throw createError({ statusCode: 404, statusMessage: "Meal not found." });
  }
}

export async function upsertWeight(userId: string, weight: WeightEntry): Promise<WeightEntry> {
  const db = getPool();
  if (weight.id !== undefined) {
    const result = await db.query(
      `update weight_entries set
        entry_date = $3,
        weight = $4,
        goal_weight = $5,
        notes = $6,
        updated_at = now()
       where id = $1 and user_id = $2
       returning *`,
      [weight.id, userId, weight.date, weight.weight, weight.goalWeight, weight.notes],
    );
    if (!result.rowCount) {
      throw createError({ statusCode: 404, statusMessage: "Weight entry not found." });
    }
    return mapWeight(result.rows[0]);
  }

  const result = await db.query(
    `insert into weight_entries (user_id, entry_date, weight, goal_weight, notes)
     values ($1, $2, $3, $4, $5)
     on conflict (user_id, entry_date) where user_id is not null do update set
       weight = excluded.weight,
       goal_weight = excluded.goal_weight,
       notes = excluded.notes,
       updated_at = now()
     returning *`,
    [userId, weight.date, weight.weight, weight.goalWeight, weight.notes],
  );
  return mapWeight(result.rows[0]);
}

export async function deleteWeight(userId: string, id: number): Promise<void> {
  const db = getPool();
  const result = await db.query("delete from weight_entries where id = $1 and user_id = $2 returning id", [
    id,
    userId,
  ]);
  if (!result.rowCount) {
    throw createError({ statusCode: 404, statusMessage: "Weight entry not found." });
  }
}
