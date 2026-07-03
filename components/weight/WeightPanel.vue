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
const weightPage = ref(1);
const weightPageSize = 10;
const weightTotalPages = computed(() => Math.max(1, Math.ceil(props.tracker.weights.length / weightPageSize)));
const weightFirstResult = computed(() =>
  props.tracker.weights.length === 0 ? 0 : (weightPage.value - 1) * weightPageSize + 1,
);
const weightLastResult = computed(() => Math.min(props.tracker.weights.length, weightPage.value * weightPageSize));
const pagedWeights = computed(() => {
  const start = (weightPage.value - 1) * weightPageSize;
  return props.tracker.weights.slice(start, start + weightPageSize);
});

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

function goToWeightPage(nextPage: number) {
  weightPage.value = Math.min(Math.max(1, nextPage), weightTotalPages.value);
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

watch(weightTotalPages, (totalPages) => {
  weightPage.value = Math.min(weightPage.value, totalPages);
});
</script>

<template>
  <section class="section" :class="{ 'is-modal': isModal }">
    <form v-if="isModal" class="form-panel" @submit.prevent="submitWeight">
      <div class="weight-form-grid">
        <label class="compact-field">
          Date
          <UInput v-model="weightForm.date" class="compact-input" type="date" required />
        </label>
        <label class="compact-field">
          Weight
          <UInput
            v-model.number="weightForm.weight"
            class="compact-input"
            inputmode="decimal"
            min="1"
            step="0.1"
            type="number"
            required
          />
        </label>
      </div>
      <div class="actions">
        <UButton
          :disabled="trackerApi.isSaving.value"
          :icon="editingWeightId ? 'i-lucide-save' : 'i-lucide-clipboard-pen-line'"
          :loading="trackerApi.isSaving.value"
          class="nuxt-ui-button"
          type="submit"
        >
          {{ editingWeightId ? "Update weight" : "Save weight" }}
        </UButton>
      </div>
    </form>

    <div v-if="!isModal" class="table-panel weight-chart-panel">
      <h2>Weight trend</h2>
      <LazyDashboardWeightChart
        :weights="props.tracker.weights"
        :goal-weight="props.tracker.settings.goalWeight"
        :selected-date="todayIso(timezone)"
      />
    </div>

    <div v-if="!isModal" class="table-panel weight-log-panel">
      <h2>Weight log</h2>
      <div class="weight-pagination">
        <span>{{ weightFirstResult }}-{{ weightLastResult }} of {{ props.tracker.weights.length }}</span>
        <div class="weight-pager-actions">
          <UButton
            class="nuxt-ui-button"
            color="neutral"
            icon="i-lucide-chevron-left"
            size="xs"
            type="button"
            variant="soft"
            :disabled="weightPage <= 1"
            @click="goToWeightPage(weightPage - 1)"
          >
            Previous
          </UButton>
          <span>Page {{ weightPage }} of {{ weightTotalPages }}</span>
          <UButton
            class="nuxt-ui-button"
            color="neutral"
            icon="i-lucide-chevron-right"
            size="xs"
            type="button"
            variant="soft"
            :disabled="weightPage >= weightTotalPages"
            @click="goToWeightPage(weightPage + 1)"
          >
            Next
          </UButton>
        </div>
      </div>
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
            <tr v-for="weight in pagedWeights" :key="weight.id ?? weight.date">
              <td>{{ weight.date }}</td>
              <td class="number">{{ formatNumber(weight.weight, 1) }}</td>
              <td class="spacer-col" aria-hidden="true" />
              <td class="row-actions">
                <UButton
                  v-if="weight.id"
                  aria-label="Update weight"
                  class="nuxt-ui-button"
                  color="neutral"
                  icon="i-lucide-pencil"
                  size="xs"
                  square
                  type="button"
                  variant="soft"
                  @click="emit('editWeight', weight)"
                />
                <UButton
                  v-if="weight.id"
                  aria-label="Delete weight"
                  class="nuxt-ui-button"
                  color="error"
                  icon="i-lucide-trash-2"
                  size="xs"
                  square
                  type="button"
                  variant="soft"
                  @click="removeWeight(weight.id)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="weight-pagination bottom">
        <span>{{ weightFirstResult }}-{{ weightLastResult }} of {{ props.tracker.weights.length }}</span>
        <div class="weight-pager-actions">
          <UButton
            class="nuxt-ui-button"
            color="neutral"
            icon="i-lucide-chevron-left"
            size="xs"
            type="button"
            variant="soft"
            :disabled="weightPage <= 1"
            @click="goToWeightPage(weightPage - 1)"
          >
            Previous
          </UButton>
          <span>Page {{ weightPage }} of {{ weightTotalPages }}</span>
          <UButton
            class="nuxt-ui-button"
            color="neutral"
            icon="i-lucide-chevron-right"
            size="xs"
            type="button"
            variant="soft"
            :disabled="weightPage >= weightTotalPages"
            @click="goToWeightPage(weightPage + 1)"
          >
            Next
          </UButton>
        </div>
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

.weight-chart-panel,
.weight-log-panel {
  gap: 0.65rem;
  min-width: 0;
  font-size: 0.86rem;
}

.weight-chart-panel h2,
.weight-log-panel h2 {
  margin: 0;
  font-size: 1rem;
}

.weight-table th,
.weight-table td {
  padding: 0.5rem 0.45rem;
  vertical-align: middle;
}

.weight-table {
  width: 100%;
  min-width: 0;
  table-layout: auto;
  font-size: 0.82rem;
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

.weight-pagination,
.weight-pager-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.weight-pagination {
  justify-content: space-between;
  color: var(--muted);
  font-size: 0.78rem;
}

.weight-pagination.bottom {
  padding-top: 0.25rem;
  border-top: 1px solid var(--line);
}

.weight-pager-actions span {
  white-space: nowrap;
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

.compact-input {
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

</style>
