<script setup lang="ts">
import type { TrackerData } from "~/types/nutrition";
import { dashboardMetrics, summarizeDays } from "~/utils/nutrition";
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
const summaries = computed(() => summarizeDays(props.tracker));
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

    <div class="chart-grid">
      <div class="table-panel">
        <h2>Calorie trend (7 days)</h2>
        <DashboardCalorieChart
          :summaries="summaries"
          :selected-date="selectedDate"
          :calorie-target="props.tracker.settings.dailyCalorieTarget"
        />
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

.chart-grid {
  display: grid;
  gap: 1rem;
}

.chart-grid > .table-panel {
  min-width: 0;
}
</style>
