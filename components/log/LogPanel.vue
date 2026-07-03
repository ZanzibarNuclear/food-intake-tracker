<script setup lang="ts">
import type { Food, FoodSearchResult, MealEntry, TrackerData } from "~/types/nutrition";
import { calculateMeal, calculateMeals, summarizeDays } from "~/utils/nutrition";
import { formatNumber } from "~/utils/format";
import { todayIso } from "~/utils/dates";

const props = defineProps<{
  tracker: TrackerData;
  mode?: "page" | "modal";
  quickAddSignal?: number;
  pendingFood?: Food | null;
}>();

const emit = defineEmits<{
  consumePendingFood: [];
  mealSaved: [];
}>();

const trackerApi = useTracker();
const { timezone } = useUserTimezone();
const isModal = computed(() => props.mode === "modal");

type DraftMealItem = Pick<MealEntry, "foodId" | "foodName" | "quantity"> & {
  tempId: number;
};

const mealForm = reactive<Pick<MealEntry, "date" | "meal">>({
  date: todayIso(timezone.value),
  meal: "Breakfast",
});

const editingMealId = ref<number | null>(null);
const foodQuery = ref("");
const favoritesMenuOpen = ref(false);
const recentsDialog = ref<HTMLDialogElement | null>(null);
const favoritesDialog = ref<HTMLDialogElement | null>(null);
const summaryDialog = ref<HTMLDialogElement | null>(null);
const selectedSummaryDate = ref<string | null>(null);
const draftMeals = ref<DraftMealItem[]>([]);
let nextDraftId = 1;

const searchResults = ref<Food[]>([]);
let searchTimer: ReturnType<typeof setTimeout> | null = null;
let skipNextSearch = false;

watch(foodQuery, (query) => {
  if (skipNextSearch) {
    skipNextSearch = false;
    return;
  }
  if (searchTimer) clearTimeout(searchTimer);
  if (!query.trim()) {
    searchResults.value = [];
    return;
  }
  searchTimer = setTimeout(async () => {
    const result = await $fetch<FoodSearchResult>("/api/foods", {
      query: { q: query, filter: "all", page: 1, pageSize: 12 },
    });
    searchResults.value = result.foods;
  }, 200);
});

const showSearchResults = computed(() => {
  const query = foodQuery.value.trim();
  if (!query || !searchResults.value.length) return false;
  // Hide suggestions when the field is an exact catalog match (e.g. Recent → "Banana").
  return !props.tracker.foods.some((food) => !food.archivedAt && food.name === query);
});

const draftPreviews = computed(() =>
  draftMeals.value.map((item) =>
    calculateMeal(
      {
        date: mealForm.date,
        meal: mealForm.meal,
        foodId: item.foodId,
        foodName: item.foodName,
        quantity: item.quantity,
        notes: null,
      },
      props.tracker.foods,
    ),
  ),
);

const draftTotals = computed(() => ({
  calories: draftPreviews.value.reduce((sum, meal) => sum + (meal.calories ?? 0), 0),
  proteinGrams: draftPreviews.value.reduce((sum, meal) => sum + (meal.proteinGrams ?? 0), 0),
}));

const summaryPage = ref(1);
const summaryPageSize = 10;
const summaries = computed(() => summarizeDays(props.tracker));
const summaryTotalPages = computed(() => Math.max(1, Math.ceil(summaries.value.length / summaryPageSize)));
const summaryFirstResult = computed(() =>
  summaries.value.length === 0 ? 0 : (summaryPage.value - 1) * summaryPageSize + 1,
);
const summaryLastResult = computed(() => Math.min(summaries.value.length, summaryPage.value * summaryPageSize));
const recentSummaries = computed(() => {
  const start = (summaryPage.value - 1) * summaryPageSize;
  return summaries.value.slice(start, start + summaryPageSize);
});
const selectedSummaryMeals = computed(() =>
  calculateMeals(
    props.tracker.meals.filter((meal) => meal.date === selectedSummaryDate.value),
    props.tracker.foods,
  ),
);
const selectedSummaryTotals = computed(() => ({
  calories: selectedSummaryMeals.value.reduce((sum, meal) => sum + (meal.calories ?? 0), 0),
  proteinGrams: selectedSummaryMeals.value.reduce((sum, meal) => sum + (meal.proteinGrams ?? 0), 0),
}));
const favoriteFoods = computed(() => trackerApi.quickList.value.favorites);

function selectFood(food: Food) {
  if (searchTimer) clearTimeout(searchTimer);
  skipNextSearch = true;
  searchResults.value = [];
  favoritesMenuOpen.value = false;
  draftMeals.value.push({
    tempId: nextDraftId,
    foodId: food.id,
    foodName: food.name,
    quantity: 1,
  });
  nextDraftId += 1;
  foodQuery.value = "";
  closeRecentsPopup();
  closeFavoritesPopup();
  focusFoodInput();
}

function focusFoodInput() {
  nextTick(() => document.getElementById("meal-food-query")?.focus());
}

function handleQuickAdd() {
  if (props.pendingFood) {
    selectFood(props.pendingFood);
    emit("consumePendingFood");
  }
  focusFoodInput();
}

function openRecentsPopup() {
  recentsDialog.value?.showModal();
}

function closeRecentsPopup() {
  if (recentsDialog.value?.open) recentsDialog.value.close();
}

function openFavoritesPopup() {
  favoritesDialog.value?.showModal();
}

function closeFavoritesPopup() {
  if (favoritesDialog.value?.open) favoritesDialog.value.close();
}

function openSummaryPopup(date: string) {
  selectedSummaryDate.value = date;
  nextTick(() => summaryDialog.value?.showModal());
}

function closeSummaryPopup() {
  if (summaryDialog.value?.open) summaryDialog.value.close();
  selectedSummaryDate.value = null;
}

function goToSummaryPage(nextPage: number) {
  summaryPage.value = Math.min(Math.max(1, nextPage), summaryTotalPages.value);
}

function resetMealForm() {
  editingMealId.value = null;
  mealForm.date = todayIso(timezone.value);
  mealForm.meal = mealForm.meal || "Breakfast";
  draftMeals.value = [];
  skipNextSearch = true;
  searchResults.value = [];
  foodQuery.value = "";
}

function editMeal(meal: MealEntry) {
  editingMealId.value = meal.id ?? null;
  mealForm.date = meal.date;
  mealForm.meal = meal.meal;
  draftMeals.value = [
    {
      tempId: nextDraftId,
      foodId: meal.foodId,
      foodName: meal.foodName,
      quantity: meal.quantity,
    },
  ];
  nextDraftId += 1;
  skipNextSearch = true;
  searchResults.value = [];
  foodQuery.value = "";
}

async function submitMeal() {
  if (!draftMeals.value.length) return;
  if (editingMealId.value) {
    const item = draftMeals.value[0];
    if (!item) return;
    const saved = await trackerApi.saveMeal({
      ...mealForm,
      id: editingMealId.value,
      foodId: item.foodId,
      foodName: item.foodName,
      quantity: Number(item.quantity),
      notes: null,
    });
    if (saved) {
      resetMealForm();
      emit("mealSaved");
    }
    return;
  }

  let allSaved = true;
  for (const item of draftMeals.value) {
    const saved = await trackerApi.saveMeal({
      ...mealForm,
      foodId: item.foodId,
      foodName: item.foodName,
      quantity: Number(item.quantity),
      notes: null,
    });
    if (!saved) {
      allSaved = false;
      break;
    }
  }
  if (allSaved) {
    resetMealForm();
    emit("mealSaved");
  }
}

function bumpQuantity(delta: number) {
  const item = draftMeals.value[0];
  if (!item) return;
  bumpDraftQuantity(item.tempId, delta);
}

function bumpDraftQuantity(tempId: number, delta: number) {
  const item = draftMeals.value.find((draft) => draft.tempId === tempId);
  if (!item) return;
  item.quantity = Math.max(0.01, roundQuantity(Number(item.quantity) + delta));
}

function removeDraftItem(tempId: number) {
  draftMeals.value = draftMeals.value.filter((item) => item.tempId !== tempId);
}

function roundQuantity(value: number) {
  return Math.round(value * 100) / 100;
}

onMounted(() => {
  trackerApi.refreshQuickList();
  resetMealForm();
  if (props.quickAddSignal) handleQuickAdd();
});

onBeforeUnmount(() => {
  favoritesMenuOpen.value = false;
});

watch(timezone, () => {
  if (!editingMealId.value) mealForm.date = todayIso(timezone.value);
});

watch(
  () => props.quickAddSignal,
  () => handleQuickAdd(),
);

watch(
  () => summaries.value.length,
  () => {
    summaryPage.value = Math.min(summaryPage.value, summaryTotalPages.value);
  },
);
</script>

<template>
  <section class="section" :class="{ 'is-modal': isModal }">
    <form v-if="isModal" class="form-panel" @submit.prevent="submitMeal">
      <div class="meal-header-row">
        <label class="compact-field">
          Date
          <UInput v-model="mealForm.date" class="compact-input" type="date" required />
        </label>
        <LogMealPicker v-model="mealForm.meal" />
      </div>

      <fieldset class="add-food-card">
        <legend>Add food</legend>
        <div class="add-food-fields">
          <div class="favorite-picker">
            <span class="favorite-helper">
              <UIcon name="i-lucide-star" aria-hidden="true" />
              Choose from your favorites
            </span>
            <UButton
              class="favorite-picker-trigger"
              color="neutral"
              type="button"
              :disabled="!favoriteFoods.length"
              aria-haspopup="listbox"
              :aria-expanded="favoritesMenuOpen"
              variant="outline"
              @click="favoritesMenuOpen = !favoritesMenuOpen"
              @keydown.escape.prevent="favoritesMenuOpen = false"
            >
              <span>{{ favoriteFoods.length ? "Pick a favorite food" : "No favorites yet" }}</span>
              <UIcon class="favorite-picker-chevron" name="i-lucide-chevron-down" aria-hidden="true" />
            </UButton>
            <div v-if="favoritesMenuOpen && favoriteFoods.length" class="favorite-picker-menu" role="listbox">
              <UButton
                v-for="food in favoriteFoods"
                :key="food.id"
                class="favorite-picker-option"
                color="neutral"
                role="option"
                type="button"
                variant="ghost"
                @click="selectFood(food)"
              >
                <span>{{ food.name }}</span>
                <small>{{ food.servingDescription }} · {{ formatNumber(food.calories) }} cal</small>
              </UButton>
            </div>
          </div>
          <label class="food-search-field">
            Search
            <UInput
              id="meal-food-query"
              v-model="foodQuery"
              autocomplete="off"
              icon="i-lucide-search"
              placeholder="Search foods to add"
              size="md"
              variant="outline"
            />
          </label>
        </div>
        <div v-if="showSearchResults" class="search-results">
          <UButton
            v-for="food in searchResults"
            :key="food.id"
            class="search-item"
            color="neutral"
            type="button"
            variant="ghost"
            @click="selectFood(food)"
          >
            <span>{{ food.name }}</span>
            <small>{{ food.servingDescription }} · {{ food.calories }} cal</small>
          </UButton>
        </div>
      </fieldset>

      <div class="draft-list">
        <div v-if="!draftMeals.length" class="empty-draft">Select one or more foods to add to this meal.</div>
        <LogDraftMealRow
          v-for="(item, index) in draftMeals"
          :key="item.tempId"
          :calories="draftPreviews[index]?.calories"
          :item="item"
          :protein-grams="draftPreviews[index]?.proteinGrams"
          @bump="bumpDraftQuantity"
          @remove="removeDraftItem"
        />
      </div>

      <div v-if="draftMeals.length" class="status">
        Total preview:
        {{ formatNumber(draftTotals.calories) }} cal ·
        {{ formatNumber(draftTotals.proteinGrams, 1) }}g protein
      </div>

      <div class="actions">
        <UButton
          :disabled="trackerApi.isSaving.value || !draftMeals.length"
          :icon="editingMealId ? 'i-lucide-save' : 'i-lucide-clipboard-pen-line'"
          :loading="trackerApi.isSaving.value"
          class="nuxt-ui-button"
          type="submit"
          variant="soft"
        >
          {{ editingMealId ? "Update meal" : "Save meal" }}
        </UButton>
        <UButton
          v-if="editingMealId"
          class="nuxt-ui-button"
          color="neutral"
          icon="i-lucide-undo-2"
          type="button"
          variant="soft"
          @click="resetMealForm()"
        >
          Cancel
        </UButton>
      </div>
    </form>

    <div v-if="!isModal" class="table-panel meal-chart-panel">
      <h2>Calorie trend (7 days)</h2>
      <LazyDashboardCalorieChart
        :summaries="summaries"
        :selected-date="mealForm.date"
        :calorie-target="props.tracker.settings.dailyCalorieTarget"
      />
    </div>

    <div v-if="!isModal" class="table-panel meal-chart-panel">
      <h2>Protein trend (7 days)</h2>
      <LazyDashboardProteinChart
        :summaries="summaries"
        :selected-date="mealForm.date"
        :protein-target="props.tracker.settings.proteinTargetGrams"
      />
    </div>

    <div v-if="!isModal" class="table-panel history-summary">
      <div class="panel-header">
        <h2>Daily Summary</h2>
      </div>
      <div class="summary-pagination">
        <span>{{ summaryFirstResult }}-{{ summaryLastResult }} of {{ summaries.length }}</span>
        <div class="summary-pager-actions">
          <UButton
            class="nuxt-ui-button"
            color="neutral"
            icon="i-lucide-chevron-left"
            size="xs"
            type="button"
            variant="soft"
            :disabled="summaryPage <= 1"
            @click="goToSummaryPage(summaryPage - 1)"
          >
            Previous
          </UButton>
          <span>Page {{ summaryPage }} of {{ summaryTotalPages }}</span>
          <UButton
            class="nuxt-ui-button"
            color="neutral"
            icon="i-lucide-chevron-right"
            size="xs"
            type="button"
            variant="soft"
            :disabled="summaryPage >= summaryTotalPages"
            @click="goToSummaryPage(summaryPage + 1)"
          >
            Next
          </UButton>
        </div>
      </div>
      <div class="table-scroll">
        <table class="summary-table">
          <thead>
            <tr>
              <th>Date</th>
              <th class="number">Calories</th>
              <th class="number">Protein</th>
              <th class="number">Nutrition</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="summary in recentSummaries"
              :key="summary.date"
              class="summary-row"
              tabindex="0"
              @click="openSummaryPopup(summary.date)"
              @keydown.enter.prevent="openSummaryPopup(summary.date)"
              @keydown.space.prevent="openSummaryPopup(summary.date)"
            >
              <td>{{ summary.date }}</td>
              <td class="number">{{ formatNumber(summary.calories) }}</td>
              <td class="number">{{ formatNumber(summary.proteinGrams, 1) }}g</td>
              <td class="number">{{ formatNumber(summary.avgNutritionScore, 1) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="summary-pagination bottom">
        <span>{{ summaryFirstResult }}-{{ summaryLastResult }} of {{ summaries.length }}</span>
        <div class="summary-pager-actions">
          <UButton
            class="nuxt-ui-button"
            color="neutral"
            icon="i-lucide-chevron-left"
            size="xs"
            type="button"
            variant="soft"
            :disabled="summaryPage <= 1"
            @click="goToSummaryPage(summaryPage - 1)"
          >
            Previous
          </UButton>
          <span>Page {{ summaryPage }} of {{ summaryTotalPages }}</span>
          <UButton
            class="nuxt-ui-button"
            color="neutral"
            icon="i-lucide-chevron-right"
            size="xs"
            type="button"
            variant="soft"
            :disabled="summaryPage >= summaryTotalPages"
            @click="goToSummaryPage(summaryPage + 1)"
          >
            Next
          </UButton>
        </div>
      </div>
    </div>

    <dialog v-if="!isModal" ref="summaryDialog" class="summary-dialog" @close="closeSummaryPopup">
      <div class="popup-header">
        <h3>Meals on {{ selectedSummaryDate }}</h3>
        <UButton
          aria-label="Close"
          class="nuxt-ui-button"
          color="neutral"
          icon="i-lucide-x"
          size="xs"
          square
          type="button"
          variant="soft"
          @click="closeSummaryPopup"
        />
      </div>
      <div class="summary-detail">
        <div v-if="!selectedSummaryMeals.length" class="empty-draft">No meals logged for this day.</div>
        <div v-for="meal in selectedSummaryMeals" :key="meal.id" class="summary-meal-row">
          <div>
            <strong>{{ meal.foodName }}</strong>
            <small>{{ meal.meal }} · Qty {{ formatNumber(meal.quantity, 2) }}</small>
          </div>
          <div class="summary-meal-macros">
            <span>{{ formatNumber(meal.calories) }} cal</span>
            <span>{{ formatNumber(meal.proteinGrams, 1) }}g</span>
          </div>
        </div>
        <div v-if="selectedSummaryMeals.length" class="summary-detail-total">
          <strong>Total</strong>
          <span>
            {{ formatNumber(selectedSummaryTotals.calories) }} cal ·
            {{ formatNumber(selectedSummaryTotals.proteinGrams, 1) }}g protein
          </span>
        </div>
      </div>
    </dialog>

    <dialog v-if="!isModal" ref="recentsDialog" class="recents-dialog" @close="closeRecentsPopup">
      <div class="popup-header">
        <h3>Recent foods</h3>
        <UButton
          aria-label="Close"
          class="nuxt-ui-button"
          color="neutral"
          icon="i-lucide-x"
          size="xs"
          square
          type="button"
          variant="soft"
          @click="closeRecentsPopup"
        />
      </div>
      <div class="popup-list">
        <UButton
          v-for="food in trackerApi.quickList.value.recents"
          :key="food.id"
          class="search-item"
          color="neutral"
          type="button"
          variant="ghost"
          @click="selectFood(food)"
        >
          <span>{{ food.name }}</span>
          <small>{{ food.servingDescription }} · {{ food.calories }} cal</small>
        </UButton>
      </div>
    </dialog>

    <dialog v-if="!isModal" ref="favoritesDialog" class="recents-dialog" @close="closeFavoritesPopup">
      <div class="popup-header">
        <h3>Favorite foods</h3>
        <UButton
          aria-label="Close"
          class="nuxt-ui-button"
          color="neutral"
          icon="i-lucide-x"
          size="xs"
          square
          type="button"
          variant="soft"
          @click="closeFavoritesPopup"
        />
      </div>
      <div class="popup-list">
        <UButton
          v-for="food in trackerApi.quickList.value.favorites"
          :key="food.id"
          class="search-item"
          color="neutral"
          type="button"
          variant="ghost"
          @click="selectFood(food)"
        >
          <span>{{ food.name }}</span>
          <small>{{ food.servingDescription }} · {{ food.calories }} cal</small>
        </UButton>
      </div>
    </dialog>
  </section>
</template>

<style scoped>
.is-modal {
  display: block;
}

.is-modal .form-panel {
  border: 0;
  border-radius: 0;
}

.meal-header-row {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.75rem;
}

.history-summary {
  grid-column: 1 / -1;
  gap: 0.65rem;
  font-size: 0.86rem;
}

.meal-chart-panel {
  min-width: 0;
  gap: 0.65rem;
}

.meal-chart-panel h2 {
  margin: 0;
  font-size: 1rem;
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

.history-summary .panel-header h2 {
  font-size: 1rem;
}

.panel-header input {
  width: auto;
  min-width: 9.5rem;
}

.history-summary .panel-header input {
  min-height: 36px;
  padding: 0.45rem 0.6rem;
  font-size: 0.82rem;
}

.summary-table {
  min-width: 0;
  font-size: 0.82rem;
}

.summary-table :deep(th),
.summary-table :deep(td) {
  padding: 0.5rem 0.45rem;
}

.summary-table tbody tr:nth-child(even) {
  background: #eef6ff;
}

.summary-row {
  cursor: pointer;
}

.summary-row:hover,
.summary-row:focus-visible {
  background: var(--accent-soft);
  outline: none;
}

.summary-pagination,
.summary-pager-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.summary-pagination {
  justify-content: space-between;
  color: var(--muted);
  font-size: 0.78rem;
}

.summary-pagination.bottom {
  padding-top: 0.25rem;
  border-top: 1px solid var(--line);
}

.summary-pager-actions span {
  white-space: nowrap;
}

.compact-field {
  display: grid;
  gap: 0.35rem;
  width: auto;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 700;
}

.compact-field input,
.compact-field select {
  width: auto;
  min-width: 9.5rem;
}

.compact-input {
  width: auto;
  min-width: 9.5rem;
}

.add-food-card {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
  margin: 0.25rem 0 0;
  padding: 0.9rem 0.85rem 0.8rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fbfdfb;
}

.add-food-card legend {
  padding: 0 0.4rem;
  color: var(--ink);
  font-size: 0.92rem;
  font-weight: 800;
}

.add-food-fields {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: 0.75rem;
  align-items: end;
}

.food-search-field {
  display: grid;
  gap: 0.35rem;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 700;
}

.favorite-picker {
  position: relative;
  display: grid;
  gap: 0.35rem;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 700;
}

.favorite-helper {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--muted);
}

.favorite-helper :deep(svg) {
  color: var(--accent-strong);
  font-size: 0.95rem;
}

.favorite-picker-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  width: min(18rem, 100%);
  min-height: 42px;
  padding: 0 0.65rem;
  border: 1px solid var(--line);
  background: #fff;
}

.favorite-picker-trigger:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.favorite-picker-chevron {
  margin-left: auto;
  color: var(--ink);
  font-size: 1rem;
  line-height: 1;
}

.favorite-picker-menu {
  position: absolute;
  z-index: 20;
  top: calc(100% + 0.35rem);
  left: 0;
  display: grid;
  gap: 0.25rem;
  width: min(100%, 24rem);
  min-width: min(18rem, 100%);
  max-height: 240px;
  padding: 0.35rem;
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  box-shadow: 0 14px 30px rgba(32, 36, 31, 0.16);
}

.favorite-picker-option {
  display: grid;
  gap: 0.15rem;
  justify-content: stretch;
  min-height: auto;
  padding: 0.55rem 0.65rem;
  text-align: left;
}

.favorite-picker-option small {
  color: var(--muted);
  font-weight: 400;
}

.recents-dialog,
.summary-dialog {
  width: min(480px, calc(100% - 2rem));
  max-height: min(70vh, 520px);
  margin: auto;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  box-shadow: 0 16px 40px rgba(32, 36, 31, 0.18);
}

.recents-dialog::backdrop,
.summary-dialog::backdrop {
  background: rgba(32, 36, 31, 0.45);
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--line);
}

.popup-header h3 {
  margin: 0;
  font-size: 1rem;
}

.popup-list {
  display: grid;
  gap: 0.35rem;
  padding: 0.75rem;
  overflow: auto;
  max-height: min(60vh, 440px);
}

.summary-detail {
  display: grid;
  gap: 0.45rem;
  padding: 0.75rem;
}

.summary-meal-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
}

.summary-meal-row small {
  display: block;
  margin-top: 0.15rem;
  color: var(--muted);
  font-weight: 400;
}

.summary-meal-macros {
  display: grid;
  gap: 0.1rem;
  color: var(--muted);
  font-size: 0.82rem;
  text-align: right;
  white-space: nowrap;
}

.summary-detail-total {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 0.6rem 0;
  border-top: 1px solid var(--line);
}

.search-results {
  display: grid;
  gap: 0.35rem;
  max-height: 220px;
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.35rem;
  background: #fff;
}

.search-item {
  display: grid;
  justify-content: stretch;
  gap: 0.15rem;
  min-height: auto;
  padding: 0.55rem 0.65rem;
  text-align: left;
  border: 1px solid var(--line);
}

.search-item small {
  color: var(--muted);
  font-weight: 400;
}

.draft-list {
  display: grid;
  gap: 0.5rem;
}

.empty-draft {
  padding: 0.75rem;
  border: 1px dashed var(--line);
  border-radius: 8px;
  color: var(--muted);
  font-size: 0.9rem;
}

.is-modal .actions {
  justify-content: center;
}

.table-scroll :deep(table) {
  min-width: 0;
}

@media (max-width: 560px) {
  .add-food-fields {
    grid-template-columns: 1fr;
  }

  .favorite-picker-trigger {
    width: 100%;
  }
}

</style>
