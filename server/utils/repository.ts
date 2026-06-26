import pg from "pg";
import seed from "~/server/data/seed.json";
import type { Food, MealEntry, TrackerData, WeightEntry } from "~/types/nutrition";

let pool: pg.Pool | null = null;

function getPool(): pg.Pool | null {
  const databaseUrl = useRuntimeConfig().databaseUrl;
  if (!databaseUrl) return null;
  pool ??= new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: true },
  });
  return pool;
}

function seededData(): TrackerData {
  return JSON.parse(JSON.stringify(seed)) as TrackerData;
}

export async function getTrackerData(): Promise<TrackerData> {
  const db = getPool();
  if (!db) return seededData();

  try {
    const [settingsResult, foodsResult, mealsResult, weightsResult] = await Promise.all([
      db.query("select * from settings where id = 1"),
      db.query("select * from foods order by name"),
      db.query(
        `select meal_entries.id, entry_date, meal, foods.name as food_name, quantity, meal_entries.notes
         from meal_entries
         join foods on foods.id = meal_entries.food_id
         order by entry_date desc, meal_entries.id desc`,
      ),
      db.query("select * from weight_entries order by entry_date desc"),
    ]);

    if (!settingsResult.rowCount) return seededData();

    const settingsRow = settingsResult.rows[0];
    return {
      settings: {
        dailyCalorieTarget: Number(settingsRow.daily_calorie_target),
        proteinTargetGrams: Number(settingsRow.protein_target_grams),
        nutritionScoreTarget: Number(settingsRow.nutrition_score_target),
        goalWeight: Number(settingsRow.goal_weight),
      },
      foods: foodsResult.rows.map(
        (row): Food => ({
          id: Number(row.id),
          name: row.name,
          servingDescription: row.serving_description,
          calories: Number(row.calories),
          proteinGrams: Number(row.protein_grams),
          nutritionScore: Number(row.nutrition_score),
          satietyScore: row.satiety_score === null ? null : Number(row.satiety_score),
          notes: row.notes,
        }),
      ),
      meals: mealsResult.rows.map(
        (row): MealEntry => ({
          id: Number(row.id),
          date: new Date(row.entry_date).toISOString().slice(0, 10),
          meal: row.meal,
          foodName: row.food_name,
          quantity: Number(row.quantity),
          notes: row.notes,
        }),
      ),
      weights: weightsResult.rows.map(
        (row): WeightEntry => ({
          id: Number(row.id),
          date: new Date(row.entry_date).toISOString().slice(0, 10),
          weight: Number(row.weight),
          goalWeight: row.goal_weight === null ? null : Number(row.goal_weight),
          notes: row.notes,
        }),
      ),
    };
  } catch (error) {
    console.warn("Falling back to seed data because database read failed.", error);
    return seededData();
  }
}

export async function createFood(food: Food): Promise<Food> {
  const db = getPool();
  if (!db) return food;
  const result = await db.query(
    `insert into foods (name, serving_description, calories, protein_grams, nutrition_score, satiety_score, notes)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (name) do update set
       serving_description = excluded.serving_description,
       calories = excluded.calories,
       protein_grams = excluded.protein_grams,
       nutrition_score = excluded.nutrition_score,
       satiety_score = excluded.satiety_score,
       notes = excluded.notes,
       updated_at = now()
     returning *`,
    [
      food.name.trim(),
      food.servingDescription,
      food.calories,
      food.proteinGrams,
      food.nutritionScore,
      food.satietyScore,
      food.notes,
    ],
  );
  const row = result.rows[0];
  return {
    id: Number(row.id),
    name: row.name,
    servingDescription: row.serving_description,
    calories: Number(row.calories),
    proteinGrams: Number(row.protein_grams),
    nutritionScore: Number(row.nutrition_score),
    satietyScore: row.satiety_score === null ? null : Number(row.satiety_score),
    notes: row.notes,
  };
}

export async function createMeal(meal: MealEntry): Promise<MealEntry> {
  const db = getPool();
  if (!db) return meal;
  const result = await db.query(
    `insert into meal_entries (entry_date, meal, food_id, quantity, notes)
     select $1, $2, foods.id, $3, $4 from foods where foods.name = $5
     returning id, entry_date, meal, quantity, notes`,
    [meal.date, meal.meal, meal.quantity, meal.notes, meal.foodName.trim()],
  );
  if (!result.rowCount) {
    throw createError({ statusCode: 422, statusMessage: "Food must be added before logging." });
  }
  const row = result.rows[0];
  return {
    id: Number(row.id),
    date: new Date(row.entry_date).toISOString().slice(0, 10),
    meal: row.meal,
    foodName: meal.foodName.trim(),
    quantity: Number(row.quantity),
    notes: row.notes,
  };
}

export async function createWeight(weight: WeightEntry): Promise<WeightEntry> {
  const db = getPool();
  if (!db) return weight;
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
  const row = result.rows[0];
  return {
    id: Number(row.id),
    date: new Date(row.entry_date).toISOString().slice(0, 10),
    weight: Number(row.weight),
    goalWeight: row.goal_weight === null ? null : Number(row.goal_weight),
    notes: row.notes,
  };
}
