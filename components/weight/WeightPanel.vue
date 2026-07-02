<script setup lang="ts">
import type { TrackerData, WeightEntry } from "~/types/nutrition";
import { formatNumber } from "~/utils/format";
import { todayIso } from "~/utils/dates";

const props = defineProps<{
  tracker: TrackerData;
}>();

const trackerApi = useTracker();
const { timezone } = useUserTimezone();
const editingWeightId = ref<number | null>(null);

const weightForm = reactive<WeightEntry>({
  date: todayIso(timezone.value),
  weight: 0,
  goalWeight: null,
  notes: null,
});

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
    weight: Number(weightForm.weight),
    goalWeight: weightForm.goalWeight === null ? null : Number(weightForm.goalWeight),
    notes: weightForm.notes || null,
  };
  const saved = await trackerApi.saveWeight(payload);
  if (saved) resetWeightForm();
}

async function removeWeight(id: number) {
  await trackerApi.deleteWeight(id);
  if (editingWeightId.value === id) resetWeightForm();
}
</script>

<template>
  <section class="section with-sidecar">
    <form class="form-panel" @submit.prevent="submitWeight">
      <h2>{{ editingWeightId ? "Edit weight" : "Log weight" }}</h2>
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
          Goal weight
          <input v-model.number="weightForm.goalWeight" min="1" step="0.1" type="number" />
        </label>
        <label>
          Notes
          <textarea v-model="weightForm.notes" />
        </label>
      </div>
      <div class="actions">
        <button :disabled="trackerApi.isSaving.value" type="submit">
          {{ editingWeightId ? "Update weight" : "Save weight" }}
        </button>
        <button v-if="editingWeightId" class="secondary" type="button" @click="resetWeightForm()">Cancel</button>
      </div>
    </form>

    <div class="table-panel">
      <h2>Weight log</h2>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th class="number">Weight</th>
              <th class="number">Goal</th>
              <th>Notes</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="weight in props.tracker.weights" :key="weight.id ?? weight.date">
              <td>{{ weight.date }}</td>
              <td class="number">{{ formatNumber(weight.weight, 1) }}</td>
              <td class="number">{{ formatNumber(weight.goalWeight, 1) }}</td>
              <td>{{ weight.notes }}</td>
              <td class="row-actions">
                <button class="secondary small" type="button" @click="editWeight(weight)">Edit</button>
                <button
                  v-if="weight.id"
                  class="secondary small danger"
                  type="button"
                  @click="removeWeight(weight.id)"
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
