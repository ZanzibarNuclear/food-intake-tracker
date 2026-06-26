import type { Food, MealEntry, TrackerData, WeightEntry } from "~/types/nutrition";
import { todayIso } from "~/utils/dates";

const storageKey = "food-intake-tracker:v1";

function cloneData(data: TrackerData): TrackerData {
  return JSON.parse(JSON.stringify(data)) as TrackerData;
}

export function useTrackerStore(initialData: TrackerData) {
  const data = useState<TrackerData>("tracker-data", () => cloneData(initialData));
  const isSaving = ref(false);
  const errorMessage = ref<string | null>(null);

  onMounted(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      data.value = JSON.parse(saved) as TrackerData;
    }
  });

  watch(
    data,
    (value) => {
      if (import.meta.client) {
        localStorage.setItem(storageKey, JSON.stringify(value));
      }
    },
    { deep: true },
  );

  async function saveFood(food: Food) {
    isSaving.value = true;
    errorMessage.value = null;
    try {
      const saved = await $fetch<Food>("/api/foods", { method: "POST", body: food });
      const existingIndex = data.value.foods.findIndex((item) => item.name === saved.name);
      if (existingIndex >= 0) data.value.foods.splice(existingIndex, 1, saved);
      else data.value.foods.push(saved);
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "Could not save food.";
      const existingIndex = data.value.foods.findIndex((item) => item.name === food.name);
      if (existingIndex >= 0) data.value.foods.splice(existingIndex, 1, food);
      else data.value.foods.push(food);
    } finally {
      isSaving.value = false;
    }
  }

  async function saveMeal(meal: MealEntry) {
    isSaving.value = true;
    errorMessage.value = null;
    try {
      const saved = await $fetch<MealEntry>("/api/meals", { method: "POST", body: meal });
      data.value.meals.unshift(saved);
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "Could not save meal.";
      data.value.meals.unshift({ ...meal, id: Date.now() });
    } finally {
      isSaving.value = false;
    }
  }

  async function saveWeight(weight: WeightEntry) {
    isSaving.value = true;
    errorMessage.value = null;
    try {
      const saved = await $fetch<WeightEntry>("/api/weights", { method: "POST", body: weight });
      const existingIndex = data.value.weights.findIndex((item) => item.date === saved.date);
      if (existingIndex >= 0) data.value.weights.splice(existingIndex, 1, saved);
      else data.value.weights.unshift(saved);
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : "Could not save weight.";
      const existingIndex = data.value.weights.findIndex((item) => item.date === weight.date);
      if (existingIndex >= 0) data.value.weights.splice(existingIndex, 1, weight);
      else data.value.weights.unshift({ ...weight, id: Date.now() });
    } finally {
      isSaving.value = false;
    }
  }

  function resetLocalChanges() {
    data.value = cloneData(initialData);
    localStorage.removeItem(storageKey);
  }

  return {
    data,
    isSaving,
    errorMessage,
    saveFood,
    saveMeal,
    saveWeight,
    resetLocalChanges,
    today: todayIso(),
  };
}
