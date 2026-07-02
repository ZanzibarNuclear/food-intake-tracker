<script setup lang="ts">
import type { TrackerData, WeightEntry } from "~/types/nutrition";
import { formatNumber } from "~/utils/format";
import { todayIso } from "~/utils/dates";

const props = defineProps<{
  tracker: TrackerData;
  mode?: "page" | "modal";
  pendingWeight?: WeightEntry | null;
}>();

const emit = defineEmits<{
  editWeight: [weight: WeightEntry];
  weightSaved: [];
}>();

const trackerApi = useTracker();
const { timezone } = useUserTimezone();
const editingWeightId = ref<number | null>(null);
const isModal = computed(() => props.mode === "modal");

const weightForm = reactive<WeightEntry>({
  date: todayIso(timezone.value),
  weight: 0,
  goalWeight: null,
  notes: null,
});

function weightForDate(date: string) {
  return props.tracker.weights.find((weight) => weight.date === date) ?? null;
}

function latestWeightBefore(date: string) {
  return [...props.tracker.weights]
    .filter((weight) => weight.date < date)
    .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

function setWeightFormForDate(date: string) {
  const exact = weightForDate(date);
  if (exact) {
    editingWeightId.value = exact.id ?? null;
    Object.assign(weightForm, exact);
    return;
  }

  const previous = latestWeightBefore(date);
  editingWeightId.value = null;
  weightForm.id = undefined;
  weightForm.date = date;
  weightForm.weight = previous?.weight ?? 0;
  weightForm.goalWeight = null;
  weightForm.notes = null;
}

function resetWeightForm() {
  editingWeightId.value = null;
  weightForm.id = undefined;
  weightForm.date = todayIso(timezone.value);
  weightForm.weight = 0;
  weightForm.goalWeight = null;
  weightForm.notes = null;
}

function editWeight(weight: WeightEntry) {
  editingWeightId.value = weight.id ?? null;
  Object.assign(weightForm, weight);
}

async function submitWeight() {
  const payload = {
    ...weightForm,
    id: editingWeightId.value ?? undefined,
    weight: Math.round(Number(weightForm.weight) * 10) / 10,
    goalWeight: isModal.value ? null : weightForm.goalWeight === null ? null : Number(weightForm.goalWeight),
    notes: isModal.value ? null : weightForm.notes || null,
  };
  const saved = await trackerApi.saveWeight(payload);
  if (saved) {
    resetWeightForm();
    emit("weightSaved");
  }
}

async function removeWeight(id: number) {
  await trackerApi.deleteWeight(id);
  if (editingWeightId.value === id) resetWeightForm();
}

onMounted(() => {
  if (isModal.value && props.pendingWeight) {
    editWeight(props.pendingWeight);
    return;
  }
  if (isModal.value) setWeightFormForDate(todayIso(timezone.value));
});

watch(
  () => props.pendingWeight,
  (weight) => {
    if (!isModal.value || !weight) return;
    editWeight(weight);
  },
);

watch(
  () => weightForm.date,
  (date, previousDate) => {
    if (!isModal.value || date === previousDate) return;
    setWeightFormForDate(date);
  },
);
</script>

<template>
  <section class="section" :class="{ 'is-modal': isModal }">
    <form v-if="isModal" class="form-panel" @submit.prevent="submitWeight">
      <div class="weight-form-grid">
        <label class="compact-field">
          Date
          <input v-model="weightForm.date" type="date" required />
        </label>
        <label class="compact-field">
          Weight
          <input
            v-model.number="weightForm.weight"
            inputmode="decimal"
            min="1"
            step="0.1"
            type="number"
            required
          />
        </label>
      </div>
      <div class="actions">
        <button :disabled="trackerApi.isSaving.value" type="submit">
          {{ editingWeightId ? "Update weight" : "Save weight" }}
        </button>
      </div>
    </form>

    <div v-if="!isModal" class="table-panel weight-chart-panel">
      <h2>Weight trend</h2>
      <DashboardWeightChart
        :weights="props.tracker.weights"
        :goal-weight="props.tracker.settings.goalWeight"
      />
    </div>

    <div v-if="!isModal" class="table-panel">
      <h2>Weight log</h2>
      <div class="table-scroll">
        <table class="weight-table">
          <thead>
            <tr>
              <th class="date-col">Date</th>
              <th class="number weight-col">Weight</th>
              <th class="spacer-col" aria-hidden="true" />
              <th class="actions-col" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="weight in props.tracker.weights" :key="weight.id ?? weight.date">
              <td>{{ weight.date }}</td>
              <td class="number">{{ formatNumber(weight.weight, 1) }}</td>
              <td class="spacer-col" aria-hidden="true" />
              <td class="row-actions">
                <button
                  v-if="weight.id"
                  aria-label="Update weight"
                  class="icon-btn"
                  type="button"
                  @click="emit('editWeight', weight)"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
                    <path
                      fill="currentColor"
                      d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92-9.06 9.06zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                    />
                  </svg>
                </button>
                <button
                  v-if="weight.id"
                  aria-label="Delete weight"
                  class="icon-btn danger"
                  type="button"
                  @click="removeWeight(weight.id)"
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
.row-actions {
  display: flex;
  gap: 0.35rem;
  justify-content: flex-end;
  white-space: nowrap;
}

.weight-chart-panel {
  min-width: 0;
}

.weight-table th,
.weight-table td {
  padding-block: 0.4rem;
  vertical-align: middle;
}

.weight-table {
  width: 100%;
  min-width: 0;
  table-layout: auto;
}

.date-col {
  width: 8.5rem;
  white-space: nowrap;
}

.weight-col {
  width: 5rem;
  white-space: nowrap;
}

.spacer-col {
  width: auto;
  padding: 0;
  border-bottom: 1px solid var(--line);
}

.actions-col {
  width: 5rem;
}

.weight-form-grid {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.75rem;
}

.weight-form-grid > label:not(.compact-field) {
  flex: 1 1 100%;
}

.compact-field {
  width: auto;
}

.compact-field input {
  width: auto;
  min-width: 9.5rem;
}

.is-modal {
  display: block;
}

.is-modal .form-panel {
  border: 0;
  border-radius: 0;
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
</style>
