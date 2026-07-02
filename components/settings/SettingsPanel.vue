<script setup lang="ts">
import type { TrackerSettings } from "~/types/nutrition";
import { browserTimeZone, formatClockInTimeZone, timeZoneOptions } from "~/utils/dates";

const props = defineProps<{
  settings: TrackerSettings;
}>();

const emit = defineEmits<{
  close: [];
}>();

const tracker = useTracker();
const { timezone } = useUserTimezone();

const form = reactive({
  alias: props.settings.alias ?? "",
  timezone: props.settings.timezone ?? browserTimeZone(),
  dailyCalorieTarget: props.settings.dailyCalorieTarget,
  proteinTargetGrams: props.settings.proteinTargetGrams,
  nutritionScoreTarget: props.settings.nutritionScoreTarget,
  goalWeight: props.settings.goalWeight,
});

const zones = timeZoneOptions();
const currentClock = ref(formatClockInTimeZone(timezone.value));

let clockTimer: ReturnType<typeof setInterval> | null = null;

watch(
  timezone,
  (zone) => {
    currentClock.value = formatClockInTimeZone(zone);
  },
);

watch(
  () => props.settings,
  (settings) => {
    form.alias = settings.alias ?? "";
    form.timezone = settings.timezone ?? browserTimeZone();
    form.dailyCalorieTarget = settings.dailyCalorieTarget;
    form.proteinTargetGrams = settings.proteinTargetGrams;
    form.nutritionScoreTarget = settings.nutritionScoreTarget;
    form.goalWeight = settings.goalWeight;
  },
  { deep: true },
);

async function saveSettingsChange() {
  await tracker.saveSettings({
    ...props.settings,
    alias: form.alias,
    timezone: form.timezone,
    dailyCalorieTarget: Number(form.dailyCalorieTarget),
    proteinTargetGrams: Number(form.proteinTargetGrams),
    nutritionScoreTarget: Number(form.nutritionScoreTarget),
    goalWeight: Number(form.goalWeight),
  });
}

onMounted(() => {
  clockTimer = setInterval(() => {
    currentClock.value = formatClockInTimeZone(timezone.value);
  }, 30_000);
});

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer);
});
</script>

<template>
  <section class="section">
    <div class="table-panel">
      <div class="panel-header">
        <h2>Settings</h2>
        <button class="secondary" type="button" @click="emit('close')">Close</button>
      </div>

      <div class="form-grid">
        <label>
          Alias
          <input
            v-model="form.alias"
            :disabled="tracker.isSaving.value"
            type="text"
            @change="saveSettingsChange"
          />
          <small class="field-hint">"alias" is whatever name you want to give yourself.</small>
        </label>

        <label>
          Time zone
          <select
            v-model="form.timezone"
            :disabled="tracker.isSaving.value"
            required
            @change="saveSettingsChange"
          >
            <option v-for="zone in zones" :key="zone.value" :value="zone.value">
              {{ zone.label }}
            </option>
          </select>
        </label>

        <section class="target-card" aria-labelledby="targets-title">
          <h3 id="targets-title">Targets</h3>
          <div class="target-grid">
            <label>
              Calories
              <input
                v-model.number="form.dailyCalorieTarget"
                :disabled="tracker.isSaving.value"
                min="1"
                step="1"
                type="number"
                @change="saveSettingsChange"
              />
            </label>
            <label>
              Protein (g)
              <input
                v-model.number="form.proteinTargetGrams"
                :disabled="tracker.isSaving.value"
                min="0"
                step="1"
                type="number"
                @change="saveSettingsChange"
              />
            </label>
            <label>
              Nutrition
              <input
                v-model.number="form.nutritionScoreTarget"
                :disabled="tracker.isSaving.value"
                max="10"
                min="1"
                step="0.1"
                type="number"
                @change="saveSettingsChange"
              />
            </label>
            <label>
              Goal weight
              <input
                v-model.number="form.goalWeight"
                :disabled="tracker.isSaving.value"
                min="1"
                step="0.1"
                type="number"
                @change="saveSettingsChange"
              />
            </label>
          </div>
        </section>

        <p class="status muted">
          Current app time: {{ currentClock }}
        </p>
        <p v-if="tracker.isSaving.value" class="status muted">Saving…</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.panel-header h2 {
  margin: 0;
}

.muted {
  color: var(--muted);
}

.field-hint {
  color: var(--muted);
  font-weight: 400;
}

.target-card {
  display: grid;
  gap: 0.75rem;
  padding: 0.85rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
}

.target-card h3 {
  margin: 0;
  font-size: 1rem;
}

.target-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.target-grid label {
  flex: 0 0 8rem;
}

.target-grid input {
  width: 100%;
}
</style>
