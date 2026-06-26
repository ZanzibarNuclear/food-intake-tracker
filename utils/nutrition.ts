import type {
  CalculatedMealEntry,
  DailySummary,
  DashboardMetrics,
  Food,
  MealEntry,
  TrackerData,
  WeightEntry,
} from "~/types/nutrition";
import { addDaysIso, compareIsoDates, daysBetween, todayIso } from "~/utils/dates";

export function round(value: number, precision = 1): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function foodLookup(foods: Food[]): Map<string, Food> {
  return new Map(foods.map((food) => [food.name.trim(), food]));
}

export function calculateMeal(entry: MealEntry, foods: Food[]): CalculatedMealEntry {
  const food = foodLookup(foods).get(entry.foodName.trim()) ?? null;
  if (!food) {
    return {
      ...entry,
      food: null,
      knownFood: false,
      calories: null,
      proteinGrams: null,
      nutritionPoints: null,
    };
  }

  return {
    ...entry,
    food,
    knownFood: true,
    calories: round(entry.quantity * food.calories, 1),
    proteinGrams: round(entry.quantity * food.proteinGrams, 1),
    nutritionPoints: round(entry.quantity * food.nutritionScore, 1),
  };
}

export function calculateMeals(meals: MealEntry[], foods: Food[]): CalculatedMealEntry[] {
  return meals
    .map((meal) => calculateMeal(meal, foods))
    .sort((a, b) => compareIsoDates(b.date, a.date));
}

export function latestWeight(weights: WeightEntry[]): WeightEntry | null {
  return [...weights].sort((a, b) => compareIsoDates(b.date, a.date))[0] ?? null;
}

export function summarizeDays(data: TrackerData): DailySummary[] {
  const calculatedMeals = data.meals.map((meal) => calculateMeal(meal, data.foods));
  const dates = new Set<string>();
  for (const meal of data.meals) dates.add(meal.date);
  for (const weight of data.weights) dates.add(weight.date);

  const sortedDates = [...dates].sort(compareIsoDates);
  const weightByDate = new Map(data.weights.map((weight) => [weight.date, weight.weight]));
  const summaries: DailySummary[] = [];

  for (const date of sortedDates) {
    const dayMeals = calculatedMeals.filter((meal) => meal.date === date && meal.knownFood);
    const calories = round(dayMeals.reduce((sum, meal) => sum + (meal.calories ?? 0), 0), 0);
    const proteinGrams = round(dayMeals.reduce((sum, meal) => sum + (meal.proteinGrams ?? 0), 0), 1);
    const nutritionPoints = dayMeals.reduce((sum, meal) => sum + (meal.nutritionPoints ?? 0), 0);
    const itemsLogged = data.meals.filter((meal) => meal.date === date).length;
    const avgNutritionScore = itemsLogged > 0 ? round(nutritionPoints / itemsLogged, 1) : null;
    const windowStart = addDaysIso(date, -6);
    const calorieWindow = summaries
      .filter((summary) => summary.date >= windowStart && summary.date <= date && summary.calories > 0)
      .map((summary) => summary.calories);
    calorieWindow.push(...(calories > 0 ? [calories] : []));

    const weightWindow = data.weights
      .filter((weight) => weight.date >= windowStart && weight.date <= date && weight.weight > 0)
      .map((weight) => weight.weight);

    summaries.push({
      date,
      calories,
      proteinGrams,
      avgNutritionScore,
      itemsLogged,
      weight: weightByDate.get(date) ?? null,
      sevenDayAvgCalories: calorieWindow.length
        ? round(calorieWindow.reduce((sum, value) => sum + value, 0) / calorieWindow.length, 0)
        : null,
      sevenDayAvgWeight: weightWindow.length
        ? round(weightWindow.reduce((sum, value) => sum + value, 0) / weightWindow.length, 1)
        : null,
    });
  }

  return summaries.sort((a, b) => compareIsoDates(b.date, a.date));
}

export function dashboardMetrics(data: TrackerData, date = todayIso()): DashboardMetrics {
  const summaries = summarizeDays(data);
  const today =
    summaries.find((summary) => summary.date === date) ??
    ({
      date,
      calories: 0,
      proteinGrams: 0,
      avgNutritionScore: null,
      itemsLogged: 0,
      weight: null,
      sevenDayAvgCalories: null,
      sevenDayAvgWeight: null,
    } satisfies DailySummary);
  const currentWeight = latestWeight(data.weights)?.weight ?? null;
  const weightToGoal =
    currentWeight === null ? null : round(currentWeight - data.settings.goalWeight, 1);

  return {
    today,
    currentWeight,
    weightToGoal,
    lastSevenDayAvgCalories: summaries.find((summary) => summary.sevenDayAvgCalories !== null)
      ?.sevenDayAvgCalories ?? null,
  };
}

export function dateRangeFromFirstMeal(data: TrackerData, days = 180): string[] {
  const firstMealDate = [...data.meals].sort((a, b) => compareIsoDates(a.date, b.date))[0]?.date;
  if (!firstMealDate) return [];
  return Array.from({ length: days }, (_, index) => addDaysIso(firstMealDate, index)).filter(
    (date) => daysBetween(firstMealDate, date) >= 0,
  );
}
