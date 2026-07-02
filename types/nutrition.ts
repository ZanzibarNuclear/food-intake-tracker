export type MealName = "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert" | string;

export type FoodSource = "workbook" | "usda" | "user" | "ai";

export interface TrackerSettings {
  dailyCalorieTarget: number;
  proteinTargetGrams: number;
  nutritionScoreTarget: number;
  goalWeight: number;
}

export interface Food {
  id?: number;
  name: string;
  servingDescription: string;
  calories: number;
  proteinGrams: number;
  nutritionScore: number;
  satietyScore: number | null;
  notes: string | null;
  isSystemSeed?: boolean;
  source?: FoodSource | null;
}

export interface FoodQuickList {
  favorites: Food[];
  recents: Food[];
}

export interface MealEntry {
  id?: number;
  date: string;
  meal: MealName;
  foodName: string;
  quantity: number;
  notes: string | null;
}

export interface WeightEntry {
  id?: number;
  date: string;
  weight: number;
  goalWeight: number | null;
  notes: string | null;
}

export interface TrackerData {
  settings: TrackerSettings;
  foods: Food[];
  meals: MealEntry[];
  weights: WeightEntry[];
}

export interface CalculatedMealEntry extends MealEntry {
  food: Food | null;
  knownFood: boolean;
  calories: number | null;
  proteinGrams: number | null;
  nutritionPoints: number | null;
}

export interface DailySummary {
  date: string;
  calories: number;
  proteinGrams: number;
  avgNutritionScore: number | null;
  itemsLogged: number;
  weight: number | null;
  sevenDayAvgCalories: number | null;
  sevenDayAvgWeight: number | null;
}

export interface DashboardMetrics {
  today: DailySummary;
  currentWeight: number | null;
  weightToGoal: number | null;
  lastSevenDayAvgCalories: number | null;
}
