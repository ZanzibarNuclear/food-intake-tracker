<script setup lang="ts">
import type { Food, MealEntry, TrackerData, WeightEntry } from "~/types/nutrition";
import { calculateMeals, dashboardMetrics, summarizeDays } from "~/utils/nutrition";
import { todayIso } from "~/utils/dates";

const tabs = ["Dashboard", "Log", "Foods", "Weight"] as const;
type Tab = (typeof tabs)[number];

const activeTab = ref<Tab>("Dashboard");
const { data: initialData } = await useFetch<TrackerData>("/api/tracker", {
  default: () => ({
    settings: {
      dailyCalorieTarget: 2000,
      proteinTargetGrams: 100,
      nutritionScoreTarget: 7,
      goalWeight: 170,
    },
    foods: [],
    meals: [],
    weights: [],
  }),
});

const store = useTrackerStore(initialData.value);
const tracker = store.data;

const selectedDate = ref(todayIso());
const foodQuery = ref("");
const mealForm = reactive<MealEntry>({
  date: selectedDate.value,
  meal: "Breakfast",
  foodName: "",
  quantity: 1,
  notes: null,
});
const foodForm = reactive<Food>({
  name: "",
  servingDescription: "",
  calories: 0,
  proteinGrams: 0,
  nutritionScore: 7,
  satietyScore: null,
  notes: null,
});
const weightForm = reactive<WeightEntry>({
  date: selectedDate.value,
  weight: 0,
  goalWeight: null,
  notes: null,
});

watch(selectedDate, (date) => {
  mealForm.date = date;
  weightForm.date = date;
});

const metrics = computed(() => dashboardMetrics(tracker.value, selectedDate.value));
const summaries = computed(() => summarizeDays(tracker.value));
const calculatedMeals = computed(() => calculateMeals(tracker.value.meals, tracker.value.foods));
const recentMeals = computed(() => calculatedMeals.value.slice(0, 12));
const recentSummaries = computed(() => summaries.value.slice(0, 14));
const knownFoods = computed(() => [...tracker.value.foods].sort((a, b) => a.name.localeCompare(b.name)));
const filteredFoods = computed(() => {
  const query = foodQuery.value.trim().toLowerCase();
  if (!query) return knownFoods.value;
  return knownFoods.value.filter((food) =>
    [food.name, food.servingDescription, food.notes ?? ""].join(" ").toLowerCase().includes(query),
  );
});
const selectedFood = computed(
  () => tracker.value.foods.find((food) => food.name === mealForm.foodName) ?? null,
);
const previewMeal = computed(() =>
  mealForm.foodName ? calculateMeals([mealForm], tracker.value.foods)[0] : null,
);

function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function resetMealForm() {
  mealForm.date = selectedDate.value;
  mealForm.meal = "Breakfast";
  mealForm.foodName = "";
  mealForm.quantity = 1;
  mealForm.notes = null;
}

function resetFoodForm() {
  foodForm.name = "";
  foodForm.servingDescription = "";
  foodForm.calories = 0;
  foodForm.proteinGrams = 0;
  foodForm.nutritionScore = 7;
  foodForm.satietyScore = null;
  foodForm.notes = null;
}

function resetWeightForm() {
  weightForm.date = selectedDate.value;
  weightForm.weight = 0;
  weightForm.goalWeight = null;
  weightForm.notes = null;
}

async function submitMeal() {
  await store.saveMeal({ ...mealForm, quantity: Number(mealForm.quantity), notes: mealForm.notes || null });
  resetMealForm();
}

async function submitFood() {
  await store.saveFood({
    ...foodForm,
    name: foodForm.name.trim(),
    servingDescription: foodForm.servingDescription.trim(),
    calories: Number(foodForm.calories),
    proteinGrams: Number(foodForm.proteinGrams),
    nutritionScore: Number(foodForm.nutritionScore),
    satietyScore: foodForm.satietyScore === null ? null : Number(foodForm.satietyScore),
    notes: foodForm.notes || null,
  });
  resetFoodForm();
}

async function submitWeight() {
  await store.saveWeight({
    ...weightForm,
    weight: Number(weightForm.weight),
    goalWeight: weightForm.goalWeight === null ? null : Number(weightForm.goalWeight),
    notes: weightForm.notes || null,
  });
  resetWeightForm();
}
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div class="brand-row">
        <div>
          <h1>Weight Management Food Tracker</h1>
          <p>{{ selectedDate }}</p>
        </div>
        <input v-model="selectedDate" aria-label="Selected date" type="date" />
      </div>
      <nav class="tabbar" aria-label="Tracker sections">
        <button
          v-for="tab in tabs"
          :key="tab"
          type="button"
          :class="{ active: activeTab === tab }"
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </nav>
    </header>

    <div class="content">
      <p v-if="store.errorMessage.value" class="error">{{ store.errorMessage.value }}</p>

      <section v-if="activeTab === 'Dashboard'" class="section">
        <div class="grid metric-grid">
          <article class="metric">
            <span>Calories</span>
            <strong>{{ formatNumber(metrics.today.calories) }}</strong>
            <small>Target {{ formatNumber(tracker.settings.dailyCalorieTarget) }}</small>
          </article>
          <article class="metric">
            <span>Protein</span>
            <strong>{{ formatNumber(metrics.today.proteinGrams, 1) }}g</strong>
            <small>Target {{ formatNumber(tracker.settings.proteinTargetGrams) }}g</small>
          </article>
          <article class="metric">
            <span>Nutrition</span>
            <strong>{{ formatNumber(metrics.today.avgNutritionScore, 1) }}</strong>
            <small>Target {{ formatNumber(tracker.settings.nutritionScoreTarget, 1) }}+</small>
          </article>
          <article class="metric">
            <span>Meals</span>
            <strong>{{ metrics.today.itemsLogged }}</strong>
            <small>Logged today</small>
          </article>
          <article class="metric">
            <span>Current Weight</span>
            <strong>{{ formatNumber(metrics.currentWeight, 1) }}</strong>
            <small>Goal {{ formatNumber(tracker.settings.goalWeight, 1) }}</small>
          </article>
          <article class="metric">
            <span>Weight to Goal</span>
            <strong>{{ formatNumber(metrics.weightToGoal, 1) }}</strong>
            <small>Current minus goal</small>
          </article>
          <article class="metric">
            <span>7-Day Calories</span>
            <strong>{{ formatNumber(metrics.lastSevenDayAvgCalories) }}</strong>
            <small>Latest non-empty average</small>
          </article>
          <article class="metric">
            <span>7-Day Weight</span>
            <strong>{{ formatNumber(metrics.today.sevenDayAvgWeight, 1) }}</strong>
            <small>Selected date window</small>
          </article>
        </div>

        <div class="table-panel">
          <h2>Daily Summary</h2>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th class="number">Calories</th>
                  <th class="number">Protein</th>
                  <th class="number">Nutrition</th>
                  <th class="number">Items</th>
                  <th class="number">Weight</th>
                  <th class="number">7-Day Calories</th>
                  <th class="number">7-Day Weight</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="summary in recentSummaries" :key="summary.date">
                  <td>{{ summary.date }}</td>
                  <td class="number">{{ formatNumber(summary.calories) }}</td>
                  <td class="number">{{ formatNumber(summary.proteinGrams, 1) }}g</td>
                  <td class="number">{{ formatNumber(summary.avgNutritionScore, 1) }}</td>
                  <td class="number">{{ summary.itemsLogged }}</td>
                  <td class="number">{{ formatNumber(summary.weight, 1) }}</td>
                  <td class="number">{{ formatNumber(summary.sevenDayAvgCalories) }}</td>
                  <td class="number">{{ formatNumber(summary.sevenDayAvgWeight, 1) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section v-else-if="activeTab === 'Log'" class="section with-sidecar">
        <form class="form-panel" @submit.prevent="submitMeal">
          <h2>Log Meal</h2>
          <div class="form-grid">
            <label>
              Date
              <input v-model="mealForm.date" type="date" required />
            </label>
            <label>
              Meal
              <select v-model="mealForm.meal">
                <option>Breakfast</option>
                <option>Lunch</option>
                <option>Dinner</option>
                <option>Snack</option>
                <option>Dessert</option>
              </select>
            </label>
            <label>
              Food
              <input v-model="mealForm.foodName" list="food-options" required />
              <datalist id="food-options">
                <option v-for="food in knownFoods" :key="food.name" :value="food.name" />
              </datalist>
            </label>
            <label>
              Quantity
              <input v-model.number="mealForm.quantity" min="0.01" step="0.01" type="number" required />
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
            <button :disabled="store.isSaving.value" type="submit">Save meal</button>
          </div>
        </form>

        <div class="table-panel">
          <h2>Recent Meals</h2>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Meal</th>
                  <th>Food</th>
                  <th class="number">Qty</th>
                  <th class="number">Calories</th>
                  <th class="number">Protein</th>
                  <th>Known</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="meal in recentMeals" :key="`${meal.date}-${meal.foodName}-${meal.quantity}`">
                  <td>{{ meal.date }}</td>
                  <td>{{ meal.meal }}</td>
                  <td>{{ meal.foodName }}</td>
                  <td class="number">{{ formatNumber(meal.quantity, 2) }}</td>
                  <td class="number">{{ formatNumber(meal.calories) }}</td>
                  <td class="number">{{ formatNumber(meal.proteinGrams, 1) }}g</td>
                  <td>
                    <span class="pill" :class="{ warn: !meal.knownFood }">
                      {{ meal.knownFood ? "Yes" : "No - add nickname" }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section v-else-if="activeTab === 'Foods'" class="section with-sidecar">
        <form class="form-panel" @submit.prevent="submitFood">
          <h2>Add Food</h2>
          <div class="form-grid">
            <label>
              Food Name / Nickname
              <input v-model="foodForm.name" required />
            </label>
            <label>
              Serving Description
              <input v-model="foodForm.servingDescription" required />
            </label>
            <div class="form-grid three">
              <label>
                Calories
                <input v-model.number="foodForm.calories" min="0" step="1" type="number" required />
              </label>
              <label>
                Protein (g)
                <input v-model.number="foodForm.proteinGrams" min="0" step="0.1" type="number" required />
              </label>
              <label>
                Nutrition Score
                <input v-model.number="foodForm.nutritionScore" max="10" min="1" step="0.1" type="number" required />
              </label>
            </div>
            <label>
              Satiety Score
              <input v-model.number="foodForm.satietyScore" max="10" min="0" step="0.1" type="number" />
            </label>
            <label>
              Notes
              <textarea v-model="foodForm.notes" />
            </label>
          </div>
          <div class="actions">
            <button :disabled="store.isSaving.value" type="submit">Save food</button>
          </div>
        </form>

        <div class="table-panel">
          <h2>Foods</h2>
          <input v-model="foodQuery" aria-label="Search foods" placeholder="Search foods" />
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Serving</th>
                  <th class="number">Calories</th>
                  <th class="number">Protein</th>
                  <th class="number">Nutrition</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="food in filteredFoods" :key="food.name">
                  <td>{{ food.name }}</td>
                  <td>{{ food.servingDescription }}</td>
                  <td class="number">{{ formatNumber(food.calories) }}</td>
                  <td class="number">{{ formatNumber(food.proteinGrams, 1) }}g</td>
                  <td class="number">{{ formatNumber(food.nutritionScore, 1) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section v-else class="section with-sidecar">
        <form class="form-panel" @submit.prevent="submitWeight">
          <h2>Log Weight</h2>
          <div class="form-grid">
            <label>
              Date
              <input v-model="weightForm.date" type="date" required />
            </label>
            <label>
              Weight
              <input v-model.number="weightForm.weight" min="1" step="0.1" type="number" required />
            </label>
            <label>
              Goal Weight
              <input v-model.number="weightForm.goalWeight" min="1" step="0.1" type="number" />
            </label>
            <label>
              Notes
              <textarea v-model="weightForm.notes" />
            </label>
          </div>
          <div class="actions">
            <button :disabled="store.isSaving.value" type="submit">Save weight</button>
          </div>
        </form>

        <div class="table-panel">
          <h2>Weight Log</h2>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th class="number">Weight</th>
                  <th class="number">Goal Weight</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="weight in tracker.weights" :key="weight.date">
                  <td>{{ weight.date }}</td>
                  <td class="number">{{ formatNumber(weight.weight, 1) }}</td>
                  <td class="number">{{ formatNumber(weight.goalWeight, 1) }}</td>
                  <td>{{ weight.notes }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
