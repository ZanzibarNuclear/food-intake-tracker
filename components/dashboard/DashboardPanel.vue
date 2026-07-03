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

const metricCards = computed(() => [
  {
    icon: "i-lucide-flame",
    label: "Calories",
    value: formatNumber(metrics.value.today.calories),
    detail: `Target ${formatNumber(props.tracker.settings.dailyCalorieTarget)}`,
  },
  {
    icon: "i-lucide-dumbbell",
    label: "Protein",
    value: `${formatNumber(metrics.value.today.proteinGrams, 1)}g`,
    detail: `Target ${formatNumber(props.tracker.settings.proteinTargetGrams)}g`,
  },
  {
    icon: "i-lucide-leaf",
    label: "Nutrition",
    value: formatNumber(metrics.value.today.avgNutritionScore, 1),
    detail: `Target ${formatNumber(props.tracker.settings.nutritionScoreTarget, 1)}+`,
  },
  {
    icon: "i-lucide-list-checks",
    label: "Meals",
    value: metrics.value.today.itemsLogged,
    detail: `Logged on ${props.selectedDate}`,
  },
  {
    icon: "i-lucide-scale",
    label: "Current Weight",
    value: formatNumber(metrics.value.currentWeight, 1),
    detail: `Goal ${formatNumber(props.tracker.settings.goalWeight, 1)}`,
  },
  {
    icon: "i-lucide-goal",
    label: "Weight to Goal",
    value: formatNumber(metrics.value.weightToGoal, 1),
    detail: "Goal minus current",
  },
]);
</script>

<template>
  <section class="section">
    <div class="dashboard-actions">
      <UButton
        class="nuxt-ui-button"
        icon="i-lucide-clipboard-pen-line"
        type="button"
        variant="soft"
        @click="emit('quickLog')"
      >
        Meal
      </UButton>
      <UButton
        class="nuxt-ui-button"
        color="secondary"
        icon="i-lucide-clipboard-pen-line"
        type="button"
        variant="soft"
        @click="emit('quickWeight')"
      >
        Weight
      </UButton>
    </div>

    <div class="grid metric-grid">
      <DashboardMetricCard
        v-for="card in metricCards"
        :key="card.label"
        :detail="card.detail"
        :icon="card.icon"
        :label="card.label"
        :value="card.value"
      />
    </div>

    <div class="table-panel dashboard-meals-panel">
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
                <DashboardMealIcon :meal="meal.meal" />
              </td>
              <td>{{ meal.foodName }}</td>
              <td class="number">{{ formatNumber(meal.quantity, 2) }}</td>
              <td class="number">{{ formatNumber(meal.calories) }}</td>
              <td class="number">{{ formatNumber(meal.proteinGrams, 1) }}g</td>
              <td class="row-actions">
                <UButton
                  v-if="meal.id"
                  aria-label="Delete meal"
                  class="nuxt-ui-button"
                  color="error"
                  icon="i-lucide-trash-2"
                  size="xs"
                  square
                  type="button"
                  variant="soft"
                  @click="removeMeal(meal.id)"
                />
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

.dashboard-meals-panel {
  gap: 0.65rem;
  font-size: 0.86rem;
}

.dashboard-meals-panel h2 {
  margin: 0;
  font-size: 1rem;
}

.dashboard-meals-panel table {
  font-size: 0.82rem;
}

.dashboard-meals-panel :deep(th),
.dashboard-meals-panel :deep(td) {
  padding: 0.5rem 0.45rem;
}

.meal-col {
  width: 3.25rem;
}

.meal-cell {
  text-align: center;
}

.row-actions {
  display: flex;
  gap: 0.2rem;
  justify-content: flex-end;
}

.actions-col {
  width: 4.5rem;
}

.table-scroll :deep(table) {
  min-width: 0;
}
</style>
