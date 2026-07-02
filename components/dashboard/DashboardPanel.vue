<script setup lang="ts">
import type { TrackerData } from "~/types/nutrition";
import { calculateMeals, dashboardMetrics } from "~/utils/nutrition";
import { formatNumber } from "~/utils/format";

const props = defineProps<{
  tracker: TrackerData;
  selectedDate: string;
}>();

const emit = defineEmits<{
  quickLog: [];
  quickWeight: [];
}>();

const metrics = computed(() => dashboardMetrics(props.tracker, props.selectedDate));
const trackerApi = useTracker();
const dayMeals = computed(() =>
  calculateMeals(
    props.tracker.meals.filter((meal) => meal.date === props.selectedDate),
    props.tracker.foods,
  ),
);

async function removeMeal(id: number) {
  await trackerApi.deleteMeal(id);
}

function mealIcon(meal: string) {
  const normalized = meal.toLowerCase();
  if (normalized === "breakfast") return "coffee";
  if (normalized === "lunch") return "sandwich";
  if (normalized === "dinner") return "cloche";
  if (normalized === "snack") return "apple";
  if (normalized === "dessert") return "cake";
  return "coffee";
}
</script>

<template>
  <section class="section">
    <div class="dashboard-actions">
      <button type="button" @click="emit('quickLog')">+ Meal</button>
      <button class="secondary" type="button" @click="emit('quickWeight')">+ Weight</button>
    </div>

    <div class="grid metric-grid">
      <article class="metric">
        <span>Calories</span>
        <strong>{{ formatNumber(metrics.today.calories) }}</strong>
        <small>Target {{ formatNumber(props.tracker.settings.dailyCalorieTarget) }}</small>
      </article>
      <article class="metric">
        <span>Protein</span>
        <strong>{{ formatNumber(metrics.today.proteinGrams, 1) }}g</strong>
        <small>Target {{ formatNumber(props.tracker.settings.proteinTargetGrams) }}g</small>
      </article>
      <article class="metric">
        <span>Nutrition</span>
        <strong>{{ formatNumber(metrics.today.avgNutritionScore, 1) }}</strong>
        <small>Target {{ formatNumber(props.tracker.settings.nutritionScoreTarget, 1) }}+</small>
      </article>
      <article class="metric">
        <span>Meals</span>
        <strong>{{ metrics.today.itemsLogged }}</strong>
        <small>Logged on {{ selectedDate }}</small>
      </article>
      <article class="metric">
        <span>Current Weight</span>
        <strong>{{ formatNumber(metrics.currentWeight, 1) }}</strong>
        <small>Goal {{ formatNumber(props.tracker.settings.goalWeight, 1) }}</small>
      </article>
      <article class="metric">
        <span>Weight to Goal</span>
        <strong>{{ formatNumber(metrics.weightToGoal, 1) }}</strong>
        <small>Goal minus current</small>
      </article>
    </div>

    <div class="table-panel">
      <h2>Meals on {{ selectedDate }}</h2>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th class="meal-col">Meal</th>
              <th>Food</th>
              <th class="number">Qty</th>
              <th class="number">Cal</th>
              <th class="number">Protein</th>
              <th class="actions-col" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="meal in dayMeals" :key="meal.id">
              <td class="meal-cell">
                <span class="meal-type-icon" :aria-label="meal.meal" :title="meal.meal">
                  <svg
                    v-if="mealIcon(meal.meal) === 'coffee'"
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="17"
                    height="17"
                  >
                    <path
                      fill="currentColor"
                      d="M4 7h11v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V7Zm13 2h1a2 2 0 0 1 0 4h-1V9ZM6 9v4a3 3 0 0 0 3 3h1a3 3 0 0 0 3-3V9H6Zm11 2h1v-1h-1v1ZM7 3h2v3H7V3Zm5 0h2v3h-2V3Z"
                    />
                  </svg>
                  <svg
                    v-else-if="mealIcon(meal.meal) === 'sandwich'"
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="17"
                    height="17"
                  >
                    <path
                      fill="currentColor"
                      d="M4 10 12 5l8 5v3H4v-3Zm2 5h12v4H6v-4Zm1-4h10.9L12 7.3 6.1 11H7Z"
                    />
                  </svg>
                  <svg
                    v-else-if="mealIcon(meal.meal) === 'cloche'"
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="17"
                    height="17"
                  >
                    <path
                      fill="currentColor"
                      d="M11 4V2h2v2a8 8 0 0 1 7.75 7H3.25A8 8 0 0 1 11 4Zm-8 9h18v2H3v-2Zm2 4h14v2H5v-2Z"
                    />
                  </svg>
                  <svg
                    v-else-if="mealIcon(meal.meal) === 'apple'"
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="17"
                    height="17"
                  >
                    <path
                      fill="currentColor"
                      d="M13 4c.7-1.4 1.8-2.2 3.5-2 .1 1.7-.8 2.9-2.5 3.6A5.8 5.8 0 0 1 18 4c2.6 0 4 2.2 4 5.2 0 4.7-3 10.8-6.1 10.8-1.3 0-2-.7-3.4-.7s-2.1.7-3.4.7C6 20 3 13.9 3 9.2 3 6.2 4.4 4 7 4c1.2 0 2.1.4 3 1 .3-.9 1-1.5 2-1.8V2h2v2h-1Z"
                    />
                  </svg>
                  <svg
                    v-else-if="mealIcon(meal.meal) === 'cake'"
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="17"
                    height="17"
                  >
                    <path
                      fill="currentColor"
                      d="M11 2h2v3h-2V2Zm-5 9h12a3 3 0 0 1 3 3v7H3v-7a3 3 0 0 1 3-3Zm0 2a1 1 0 0 0-1 1v1c1.1 0 1.6-.3 2.3-.7.8-.5 1.7-1 3.2-1s2.4.5 3.2 1c.7.4 1.2.7 2.3.7s1.6-.3 2.3-.7l.7-.4A1 1 0 0 0 18 13H6Zm-1 4v2h14v-2c-1.1 0-1.9-.4-2.6-.8-.7-.4-1.2-.7-2.4-.7s-1.7.3-2.4.7c-.8.5-1.7 1-3.2 1-1.1 0-1.8-.2-2.4-.4Z"
                    />
                  </svg>
                </span>
              </td>
              <td>{{ meal.foodName }}</td>
              <td class="number">{{ formatNumber(meal.quantity, 2) }}</td>
              <td class="number">{{ formatNumber(meal.calories) }}</td>
              <td class="number">{{ formatNumber(meal.proteinGrams, 1) }}g</td>
              <td class="row-actions">
                <button
                  v-if="meal.id"
                  aria-label="Delete meal"
                  class="icon-btn danger"
                  type="button"
                  @click="removeMeal(meal.id)"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
                    <path
                      fill="currentColor"
                      d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.42L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4z"
                    />
                  </svg>
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
.dashboard-actions {
  display: flex;
  justify-content: space-evenly;
  gap: 1rem;
}

.dashboard-actions button {
  padding: 0 1rem;
}

.meal-col {
  width: 3.25rem;
}

.meal-cell {
  text-align: center;
}

.meal-type-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 0.82rem;
  font-weight: 800;
}

.row-actions {
  display: flex;
  gap: 0.2rem;
  justify-content: flex-end;
}

.actions-col {
  width: 4.5rem;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  min-height: 34px;
  padding: 0;
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.icon-btn.danger {
  color: var(--warn);
}

.table-scroll :deep(table) {
  min-width: 0;
}
</style>
