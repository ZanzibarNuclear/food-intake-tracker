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
  timezone: props.settings.timezone ?? browserTimeZone(),
});

const zones = timeZoneOptions();
const previewClock = ref(formatClockInTimeZone(form.timezone));

let clockTimer: ReturnType<typeof setInterval> | null = null;

watch(
  () => form.timezone,
  (zone) => {
    previewClock.value = formatClockInTimeZone(zone);
  },
);

async function submit() {
  const saved = await tracker.saveSettings({
    ...props.settings,
    timezone: form.timezone,
  });
  if (saved) emit("close");
}

onMounted(() => {
  clockTimer = setInterval(() => {
    previewClock.value = formatClockInTimeZone(form.timezone);
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

      <form class="form-grid" @submit.prevent="submit">
        <label>
          Time zone
          <select v-model="form.timezone" required>
            <option v-for="zone in zones" :key="zone.value" :value="zone.value">
              {{ zone.label }}
            </option>
          </select>
        </label>

        <p class="status">
          Preview: <strong>{{ previewClock }}</strong>
          <span v-if="!props.settings.timezone" class="muted"> (not saved yet — using browser default)</span>
        </p>
        <p class="status muted">
          Current app time: {{ formatClockInTimeZone(timezone) }}
        </p>

        <div class="actions">
          <button :disabled="tracker.isSaving.value" type="submit">Save settings</button>
        </div>
      </form>
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
</style>
