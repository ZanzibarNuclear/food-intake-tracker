import { describe, expect, it } from "vitest";
import type { TrackerData } from "~/types/nutrition";
import {
  calculateMeal,
  dashboardMetrics,
  latestWeight,
  summarizeDays,
} from "~/utils/nutrition";

const data: TrackerData = {
  settings: {
    dailyCalorieTarget: 2000,
    proteinTargetGrams: 100,
    nutritionScoreTarget: 7,
    goalWeight: 170,
    timezone: "UTC",
  },
  foods: [
    {
      name: "Shake",
      servingDescription: "1 shake",
      calories: 450,
      proteinGrams: 35,
      nutritionScore: 9,
      satietyScore: null,
      notes: null,
    },
    {
      name: "Pie",
      servingDescription: "1 slice",
      calories: 450,
      proteinGrams: 3,
      nutritionScore: 2,
      satietyScore: null,
      notes: null,
    },
  ],
  meals: [
    { date: "2026-06-23", meal: "Breakfast", foodName: "Shake", quantity: 1, notes: null },
    { date: "2026-06-23", meal: "Dessert", foodName: "Pie", quantity: 0.5, notes: null },
    { date: "2026-06-24", meal: "Snack", foodName: "Shake", quantity: 2, notes: null },
  ],
  weights: [
    { date: "2026-06-23", weight: 186, goalWeight: 170, notes: null },
    { date: "2026-06-24", weight: 185, goalWeight: null, notes: null },
  ],
};

describe("nutrition calculations", () => {
  it("multiplies meal nutrition by quantity", () => {
    const sourceMeal = data.meals[1];
    if (!sourceMeal) throw new Error("Missing fixture meal");
    const meal = calculateMeal(sourceMeal, data.foods);

    expect(meal.knownFood).toBe(true);
    expect(meal.calories).toBe(225);
    expect(meal.proteinGrams).toBe(1.5);
    expect(meal.nutritionPoints).toBe(1);
  });

  it("marks missing foods like the workbook known-food column", () => {
    const meal = calculateMeal(
      { date: "2026-06-25", meal: "Lunch", foodName: "Mystery", quantity: 1, notes: null },
      data.foods,
    );

    expect(meal.knownFood).toBe(false);
    expect(meal.calories).toBeNull();
  });

  it("summarizes days with workbook-equivalent average nutrition", () => {
    const [latest, first] = summarizeDays(data);
    if (!latest || !first) throw new Error("Missing fixture summaries");

    expect(latest.date).toBe("2026-06-24");
    expect(latest.calories).toBe(900);
    expect(latest.proteinGrams).toBe(70);
    expect(latest.avgNutritionScore).toBe(18);
    expect(latest.itemsLogged).toBe(1);
    expect(latest.sevenDayAvgCalories).toBe(788);
    expect(latest.sevenDayAvgWeight).toBe(185.5);

    expect(first.date).toBe("2026-06-23");
    expect(first.calories).toBe(675);
    expect(first.avgNutritionScore).toBe(5);
  });

  it("finds current weight and weight to goal", () => {
    expect(latestWeight(data.weights)?.weight).toBe(185);
    expect(dashboardMetrics(data, "2026-06-24").weightToGoal).toBe(-15);
  });
});
