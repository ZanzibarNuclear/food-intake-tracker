<script setup lang="ts">
import type { Food, MealEntry, TrackerData } from "~/types/nutrition";
import { calculateMeal, calculateMeals } from "~/utils/nutrition";
import { formatNumber } from "~/utils/format";
import { todayIso } from "~/utils/dates";

const props = defineProps<{
  tracker: TrackerData;
}>();

const trackerApi = useTracker();
const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"] as const;

const mealForm = reactive<MealEntry>({
  date: todayIso(),
  meal: "Breakfast",
  foodName: "",
  quantity: 1,
  notes: null,
});

const editingMealId = ref<number | null>(null);
const foodQuery = ref("");

const searchResults = ref<Food[]>([]);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

watch(foodQuery, (query) => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    searchResults.value = await $fetch<Food[]>("/api/foods", {
      query: { q: query, filter: "all", limit: 12 },
    });
  }, 200);
});

const selectedFood = computed(
  () => props.tracker.foods.find((food) => food.name === mealForm.foodName) ?? null,
);
const previewMeal = computed(() =>
  mealForm.foodName ? calculateMeal(mealForm, props.tracker.foods) : null,
);

const dayMeals = computed(() =>
  calculateMeals(
    props.tracker.meals.filter((meal) => meal.date === mealForm.date),
    props.tracker.foods,
  ),
);

function selectFood(food: Food) {
  mealForm.foodName = food.name;
  foodQuery.value = food.name;
}

function resetMealForm(keepFood = false) {
  const foodName = keepFood ? mealForm.foodName : "";
  editingMealId.value = null;
  mealForm.date = todayIso();
  mealForm.meal = mealForm.meal || "Breakfast";
  mealForm.foodName = foodName;
  mealForm.quantity = 1;
  mealForm.notes = null;
  if (!keepFood) foodQuery.value = "";
}

function editMeal(meal: MealEntry) {
  editingMealId.value = meal.id ?? null;
  mealForm.date = meal.date;
  mealForm.meal = meal.meal;
  mealForm.foodName = meal.foodName;
  mealForm.quantity = meal.quantity;
  mealForm.notes = meal.notes;
  foodQuery.value = meal.foodName;
}

async function submitMeal() {
  const payload = {
    ...mealForm,
    id: editingMealId.value ?? undefined,
    quantity: Number(mealForm.quantity),
    notes: mealForm.notes || null,
  };
  const saved = await trackerApi.saveMeal(payload);
  if (saved) resetMealForm(true);
}

async function removeMeal(id: number) {
  await trackerApi.deleteMeal(id);
  if (editingMealId.value === id) resetMealForm();
}

function bumpQuantity(delta: number) {
  mealForm.quantity = Math.max(0.01, roundQuantity(Number(mealForm.quantity) + delta));
}

function roundQuantity(value: number) {
  return Math.round(value * 100) / 100;
}

onMounted(() => {
  trackerApi.refreshQuickList();
  resetMealForm();
});
</script>

<template>
  <section class="section with-sidecar">
    <form class="form-panel" @submit.prevent="submitMeal">
      <h2>{{ editingMealId ? "Edit meal" : "Log meal" }}</h2>

      <div v-if="trackerApi.quickList.value.favorites.length" class="chip-row">
        <span class="chip-label">Favorites</span>
        <div class="chips">
          <button
            v-for="food in trackerApi.quickList.value.favorites"
            :key="food.id"
            class="chip"
            type="button"
            @click="selectFood(food)"
          >
            {{ food.name }}
          </button>
        </div>
      </div>

      <div v-if="trackerApi.quickList.value.recents.length" class="chip-row">
        <span class="chip-label">Recent</span>
        <div class="chips">
          <button
            v-for="food in trackerApi.quickList.value.recents"
            :key="food.id"
            class="chip"
            type="button"
            @click="selectFood(food)"
          >
            {{ food.name }}
          </button>
        </div>
      </div>

      <div class="form-grid">
        <label>
          Date
          <input v-model="mealForm.date" type="date" required />
        </label>
        <label>
          Meal
          <select v-model="mealForm.meal">
            <option v-for="meal in mealTypes" :key="meal">{{ meal }}</option>
          </select>
        </label>
        <label>
          Food
          <input v-model="foodQuery" autocomplete="off" required @input="mealForm.foodName = foodQuery" />
        </label>
        <div v-if="searchResults.length && foodQuery" class="search-results">
          <button
            v-for="food in searchResults"
            :key="food.id"
            class="search-item"
            type="button"
            @click="selectFood(food)"
          >
            <span>{{ food.name }}</span>
            <small>{{ food.servingDescription }} · {{ food.calories }} cal</small>
          </button>
        </div>
        <label>
          Quantity
          <div class="quantity-row">
            <button class="secondary qty-btn" type="button" @click="bumpQuantity(-0.25)">−</button>
            <input v-model.number="mealForm.quantity" min="0.01" step="0.01" type="number" required />
            <button class="secondary qty-btn" type="button" @click="bumpQuantity(0.25)">+</button>
          </div>
        </label>
        <label>
          Notes
          <textarea v-model="mealForm.notes" />
        </label>
      </div>

      <div v-if="previewMeal" class="status">
        <span v-if="previewMeal.knownFood">
          {{ formatNumber(previewMeal.calories) }} cal ·
          {{ formatNumber(previewMeal.proteinGrams, 1) }}g protein ·
          {{ formatNumber(previewMeal.nutritionPoints, 1) }} nutrition points
        </span>
        <span v-else class="error">No - add nickname</span>
      </div>
      <div v-if="selectedFood" class="status">{{ selectedFood.servingDescription }}</div>

      <div class="actions">
        <button :disabled="trackerApi.isSaving.value" type="submit">
          {{ editingMealId ? "Update meal" : "Save meal" }}
        </button>
        <button v-if="editingMealId" class="secondary" type="button" @click="resetMealForm()">Cancel</button>
      </div>
    </form>

    <div class="table-panel">
      <h2>Meals on {{ mealForm.date }}</h2>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Meal</th>
              <th>Food</th>
              <th class="number">Qty</th>
              <th class="number">Calories</th>
              <th class="number">Protein</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="meal in dayMeals" :key="meal.id">
              <td>{{ meal.meal }}</td>
              <td>{{ meal.foodName }}</td>
              <td class="number">{{ formatNumber(meal.quantity, 2) }}</td>
              <td class="number">{{ formatNumber(meal.calories) }}</td>
              <td class="number">{{ formatNumber(meal.proteinGrams, 1) }}g</td>
              <td class="row-actions">
                <button class="secondary small" type="button" @click="editMeal(meal)">Edit</button>
                <button
                  v-if="meal.id"
                  class="secondary small danger"
                  type="button"
                  @click="removeMeal(meal.id)"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<style scoped>
.chip-row {
  display: grid;
  gap: 0.35rem;
}

.chip-label {
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.chip {
  min-height: 34px;
  padding: 0.35rem 0.65rem;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 0.82rem;
  font-weight: 600;
}

.search-results {
  display: grid;
  gap: 0.35rem;
  max-height: 220px;
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.35rem;
}

.search-item {
  display: grid;
  gap: 0.15rem;
  min-height: auto;
  padding: 0.55rem 0.65rem;
  background: #fff;
  color: var(--ink);
  text-align: left;
  border: 1px solid var(--line);
}

.search-item small {
  color: var(--muted);
  font-weight: 400;
}

.quantity-row {
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  gap: 0.35rem;
}

.qty-btn {
  min-height: 44px;
  padding: 0;
}

.row-actions {
  display: flex;
  gap: 0.35rem;
  white-space: nowrap;
}

button.small {
  min-height: 34px;
  padding: 0 0.55rem;
  font-size: 0.78rem;
}

button.danger {
  color: var(--warn);
}
</style>
