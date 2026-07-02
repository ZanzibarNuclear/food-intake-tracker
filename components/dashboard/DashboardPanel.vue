<script setup lang="ts">
import type { TrackerData } from "~/types/nutrition";
import { dashboardMetrics, summarizeDays } from "~/utils/nutrition";
import { formatNumber } from "~/utils/format";

const props = defineProps<{
  tracker: TrackerData;
  selectedDate: string;
}>();

const emit = defineEmits<{
  "update:selectedDate": [value: string];
  saveSettings: [];
}>();

const tracker = useTracker();
const metrics = computed(() => dashboardMetrics(props.tracker, props.selectedDate));
const summaries = computed(() => summarizeDays(props.tracker));
const recentSummaries = computed(() => summaries.value.slice(0, 14));

const settingsForm = reactive({ ...props.tracker.settings });
const editingTargets = ref(false);

watch(
  () => props.tracker.settings,
  (settings) => Object.assign(settingsForm, settings),
  { deep: true },
);

async function submitSettings() {
  await tracker.saveSettings({ ...settingsForm });
  editingTargets.value = false;
  emit("saveSettings");
}
</script>

<template>
  <section class="section">
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
        <small>Current minus goal</small>
      </article>
      <article class="metric">
        <span>7-Day Calories</span>
        <strong>{{ formatNumber(metrics.lastSevenDayAvgCalories) }}</strong>
        <small>Latest rolling average</small>
      </article>
      <article class="metric">
        <span>7-Day Weight</span>
        <strong>{{ formatNumber(metrics.today.sevenDayAvgWeight, 1) }}</strong>
        <small>Selected date window</small>
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
      <div class="table-panel">
        <h2>Weight trend</h2>
        <DashboardWeightChart
          :weights="props.tracker.weights"
          :goal-weight="props.tracker.settings.goalWeight"
        />
      </div>
      <div class="table-panel">
        <h2>Protein today</h2>
        <DashboardProteinProgress
          :protein-grams="metrics.today.proteinGrams"
          :protein-target="props.tracker.settings.proteinTargetGrams"
        />
      </div>
    </div>

    <div class="table-panel">
      <div class="panel-header">
        <h2>Targets</h2>
        <button class="secondary" type="button" @click="editingTargets = !editingTargets">
          {{ editingTargets ? "Cancel" : "Edit" }}
        </button>
      </div>
      <form v-if="editingTargets" class="form-grid four" @submit.prevent="submitSettings">
        <label>
          Calorie target
          <input v-model.number="settingsForm.dailyCalorieTarget" min="1" step="1" type="number" />
        </label>
        <label>
          Protein target (g)
          <input v-model.number="settingsForm.proteinTargetGrams" min="1" step="1" type="number" />
        </label>
        <label>
          Nutrition target
          <input v-model.number="settingsForm.nutritionScoreTarget" max="10" min="1" step="0.1" type="number" />
        </label>
        <label>
          Goal weight
          <input v-model.number="settingsForm.goalWeight" min="1" step="0.1" type="number" />
        </label>
        <div class="actions">
          <button :disabled="tracker.isSaving.value" type="submit">Save targets</button>
        </div>
      </form>
    </div>

    <div class="table-panel">
      <div class="panel-header">
        <h2>Daily Summary</h2>
        <input
          :value="selectedDate"
          aria-label="Selected date"
          type="date"
          @input="emit('update:selectedDate', ($event.target as HTMLInputElement).value)"
        />
      </div>
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
              <th class="number">7d Cal</th>
              <th class="number">7d Wt</th>
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
</template>

<style scoped>
.chart-grid {
  display: grid;
  gap: 1rem;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.panel-header h2 {
  margin: 0;
}

.form-grid.four {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (min-width: 980px) {
  .chart-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .form-grid.four {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
