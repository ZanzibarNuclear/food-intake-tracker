import type {
  Food,
  FoodQuickList,
  MealEntry,
  TrackerData,
  TrackerSettings,
  WeightEntry,
} from "~/types/nutrition";

function errorText(error: unknown): string {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: { statusMessage?: string; message?: string } }).data;
    if (data?.statusMessage) return data.statusMessage;
    if (data?.message) return data.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

export function useTracker() {
  const data = useState<TrackerData | null>("tracker-data", () => null);
  const quickList = useState<FoodQuickList>("food-quick-list", () => ({
    favorites: [],
    recents: [],
  }));
  const isLoading = ref(false);
  const isSaving = ref(false);
  const errorMessage = ref<string | null>(null);

  async function refresh() {
    isLoading.value = true;
    errorMessage.value = null;
    try {
      data.value = await $fetch<TrackerData>("/api/tracker");
    } catch (error) {
      errorMessage.value = errorText(error);
    } finally {
      isLoading.value = false;
    }
  }

  async function refreshQuickList() {
    try {
      quickList.value = await $fetch<FoodQuickList>("/api/foods/favorites");
    } catch {
      quickList.value = { favorites: [], recents: [] };
    }
  }

  async function runSave<T>(action: () => Promise<T>): Promise<T | null> {
    isSaving.value = true;
    errorMessage.value = null;
    try {
      const result = await action();
      await Promise.all([refresh(), refreshQuickList()]);
      return result;
    } catch (error) {
      errorMessage.value = errorText(error);
      return null;
    } finally {
      isSaving.value = false;
    }
  }

  async function saveSettings(settings: TrackerSettings) {
    return runSave(() => $fetch<TrackerSettings>("/api/settings", { method: "PUT", body: settings }));
  }

  async function saveFood(food: Food) {
    if (food.id) {
      return runSave(() => $fetch<Food>(`/api/foods/${food.id}`, { method: "PATCH", body: food }));
    }
    return runSave(() => $fetch<Food>("/api/foods", { method: "POST", body: food }));
  }

  async function deleteFood(id: number) {
    return runSave(() => $fetch(`/api/foods/${id}`, { method: "DELETE" }));
  }

  async function toggleFavorite(id: number) {
    return runSave(() => $fetch(`/api/foods/${id}/favorite`, { method: "POST" }));
  }

  async function copyFood(id: number) {
    return runSave(() => $fetch<Food>(`/api/foods/${id}/copy`, { method: "POST" }));
  }

  async function saveMeal(meal: MealEntry) {
    if (meal.id) {
      return runSave(() => $fetch<MealEntry>(`/api/meals/${meal.id}`, { method: "PATCH", body: meal }));
    }
    return runSave(() => $fetch<MealEntry>("/api/meals", { method: "POST", body: meal }));
  }

  async function deleteMeal(id: number) {
    return runSave(() => $fetch(`/api/meals/${id}`, { method: "DELETE" }));
  }

  async function saveWeight(weight: WeightEntry) {
    return runSave(() => $fetch<WeightEntry>("/api/weights", { method: "POST", body: weight }));
  }

  async function deleteWeight(id: number) {
    return runSave(() => $fetch(`/api/weights/${id}`, { method: "DELETE" }));
  }

  return {
    data,
    quickList,
    isLoading,
    isSaving,
    errorMessage,
    refresh,
    refreshQuickList,
    saveSettings,
    saveFood,
    deleteFood,
    toggleFavorite,
    copyFood,
    saveMeal,
    deleteMeal,
    saveWeight,
    deleteWeight,
  };
}
