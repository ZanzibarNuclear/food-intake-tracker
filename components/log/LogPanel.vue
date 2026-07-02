<script setup lang="ts">
import type { Food, FoodSearchResult, MealEntry, TrackerData } from "~/types/nutrition";
import { calculateMeal, calculateMeals } from "~/utils/nutrition";
import { formatNumber } from "~/utils/format";
import { todayIso } from "~/utils/dates";

const props = defineProps<{
  tracker: TrackerData;
  quickAddSignal?: number;
  pendingFood?: Food | null;
}>();

const emit = defineEmits<{
  consumePendingFood: [];
}>();

const trackerApi = useTracker();
const { timezone } = useUserTimezone();
const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"] as const;

type DraftMealItem = Pick<MealEntry, "foodId" | "foodName" | "quantity"> & {
  tempId: number;
};

const mealForm = reactive<Pick<MealEntry, "date" | "meal">>({
  date: todayIso(timezone.value),
  meal: "Breakfast",
});

const editingMealId = ref<number | null>(null);
const foodQuery = ref("");
const foodInput = ref<HTMLInputElement | null>(null);
const recentsDialog = ref<HTMLDialogElement | null>(null);
const favoritesDialog = ref<HTMLDialogElement | null>(null);
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
  return !props.tracker.foods.some((food) => food.name === query);
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

const dayMeals = computed(() =>
  calculateMeals(
    props.tracker.meals.filter((meal) => meal.date === mealForm.date),
    props.tracker.foods,
  ),
);

function selectFood(food: Food) {
  if (searchTimer) clearTimeout(searchTimer);
  skipNextSearch = true;
  searchResults.value = [];
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
  nextTick(() => foodInput.value?.focus());
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
    if (saved) resetMealForm();
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
  if (allSaved) resetMealForm();
}

async function removeMeal(id: number) {
  await trackerApi.deleteMeal(id);
  if (editingMealId.value === id) resetMealForm();
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

watch(timezone, () => {
  if (!editingMealId.value) mealForm.date = todayIso(timezone.value);
});

watch(
  () => props.quickAddSignal,
  () => handleQuickAdd(),
);
</script>

<template>
  <section class="section with-sidecar">
    <form class="form-panel" @submit.prevent="submitMeal">
      <h2>{{ editingMealId ? "Edit meal" : "Log meal" }}</h2>

      <div class="quick-row">
        <button
          v-if="trackerApi.quickList.value.favorites.length"
          aria-label="Favorite foods"
          class="secondary quick-icon-btn"
          title="Favorite foods"
          type="button"
          @click="openFavoritesPopup"
        >
          ★
          <span class="recent-count">{{ trackerApi.quickList.value.favorites.length }}</span>
        </button>
        <button
          v-if="trackerApi.quickList.value.recents.length"
          class="secondary recent-btn"
          type="button"
          @click="openRecentsPopup"
        >
          Recent
          <span class="recent-count">{{ trackerApi.quickList.value.recents.length }}</span>
        </button>
      </div>

      <div class="meal-header-row">
        <label class="compact-field">
          Date
          <input v-model="mealForm.date" type="date" required />
        </label>
        <label class="compact-field">
          Meal
          <select v-model="mealForm.meal">
            <option v-for="meal in mealTypes" :key="meal">{{ meal }}</option>
          </select>
        </label>
      </div>

      <div class="form-grid">
        <label>
          Add food
          <input
            ref="foodInput"
            v-model="foodQuery"
            autocomplete="off"
          />
        </label>
        <div v-if="showSearchResults" class="search-results">
          <button
            v-for="food in searchResults"
            :key="food.id"
            class="search-item"
            type="button"
            @click="selectFood(food)"
          >
            <span>{{ food.name }}</span>
            <small>{{ food.servingDescription }} · {{ food.calories }} cal</small>
          </button>
        </div>
      </div>

      <div class="draft-list">
        <div v-if="!draftMeals.length" class="empty-draft">Select one or more foods to add to this meal.</div>
        <div v-for="(item, index) in draftMeals" :key="item.tempId" class="draft-item">
          <div class="draft-main">
            <strong>{{ item.foodName }}</strong>
            <small>
              {{ formatNumber(draftPreviews[index]?.calories) }} cal ·
              {{ formatNumber(draftPreviews[index]?.proteinGrams, 1) }}g protein
            </small>
          </div>
          <div class="quantity-row draft-quantity">
            <button class="secondary qty-btn" type="button" @click="bumpDraftQuantity(item.tempId, -0.25)">−</button>
            <input v-model.number="item.quantity" min="0.01" step="0.01" type="number" required />
            <button class="secondary qty-btn" type="button" @click="bumpDraftQuantity(item.tempId, 0.25)">+</button>
          </div>
          <button
            aria-label="Remove food"
            class="icon-btn danger"
            type="button"
            @click="removeDraftItem(item.tempId)"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="currentColor"
                d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.42L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4z"
              />
            </svg>
          </button>
        </div>
      </div>

      <div v-if="draftMeals.length" class="status">
        Total preview:
        {{ formatNumber(draftTotals.calories) }} cal ·
        {{ formatNumber(draftTotals.proteinGrams, 1) }}g protein
      </div>

      <div class="actions">
        <button :disabled="trackerApi.isSaving.value || !draftMeals.length" type="submit">
          {{ editingMealId ? "Update meal" : "Save meal" }}
        </button>
        <button v-if="editingMealId" class="secondary" type="button" @click="resetMealForm()">Cancel</button>
      </div>
    </form>

    <div class="table-panel">
      <h2>Meals on {{ mealForm.date }}</h2>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Meal</th>
              <th>Food</th>
              <th class="number">Qty</th>
              <th class="number">Cal</th>
              <th class="number">Protein</th>
              <th class="actions-col" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="meal in dayMeals" :key="meal.id">
              <td>{{ meal.meal }}</td>
              <td>{{ meal.foodName }}</td>
              <td class="number">{{ formatNumber(meal.quantity, 2) }}</td>
              <td class="number">{{ formatNumber(meal.calories) }}</td>
              <td class="number">{{ formatNumber(meal.proteinGrams, 1) }}g</td>
              <td class="row-actions">
                <button
                  aria-label="Edit meal"
                  class="icon-btn"
                  type="button"
                  @click="editMeal(meal)"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
                    <path
                      fill="currentColor"
                      d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92-9.06 9.06zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                    />
                  </svg>
                </button>
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

    <dialog ref="recentsDialog" class="recents-dialog" @close="closeRecentsPopup">
      <div class="popup-header">
        <h3>Recent foods</h3>
        <button aria-label="Close" class="icon-btn" type="button" @click="closeRecentsPopup">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
            <path
              fill="currentColor"
              d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.42L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4z"
            />
          </svg>
        </button>
      </div>
      <div class="popup-list">
        <button
          v-for="food in trackerApi.quickList.value.recents"
          :key="food.id"
          class="search-item"
          type="button"
          @click="selectFood(food)"
        >
          <span>{{ food.name }}</span>
          <small>{{ food.servingDescription }} · {{ food.calories }} cal</small>
        </button>
      </div>
    </dialog>

    <dialog ref="favoritesDialog" class="recents-dialog" @close="closeFavoritesPopup">
      <div class="popup-header">
        <h3>Favorite foods</h3>
        <button aria-label="Close" class="icon-btn" type="button" @click="closeFavoritesPopup">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
            <path
              fill="currentColor"
              d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.42L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4z"
            />
          </svg>
        </button>
      </div>
      <div class="popup-list">
        <button
          v-for="food in trackerApi.quickList.value.favorites"
          :key="food.id"
          class="search-item"
          type="button"
          @click="selectFood(food)"
        >
          <span>{{ food.name }}</span>
          <small>{{ food.servingDescription }} · {{ food.calories }} cal</small>
        </button>
      </div>
    </dialog>
  </section>
</template>

<style scoped>
.quick-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.meal-header-row {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.75rem;
}

.compact-field {
  width: auto;
}

.compact-field input,
.compact-field select {
  width: auto;
  min-width: 9.5rem;
}

.recent-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 36px;
  padding: 0 0.75rem;
}

.quick-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-width: 44px;
  min-height: 36px;
  padding: 0 0.55rem;
  color: var(--accent-strong);
}

.recent-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
}

.recents-dialog {
  width: min(480px, calc(100% - 2rem));
  max-height: min(70vh, 520px);
  margin: auto;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  box-shadow: 0 16px 40px rgba(32, 36, 31, 0.18);
}

.recents-dialog::backdrop {
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

.search-results {
  display: grid;
  gap: 0.35rem;
  max-height: 220px;
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.35rem;
}

.search-item {
  display: grid;
  gap: 0.15rem;
  min-height: auto;
  padding: 0.55rem 0.65rem;
  background: #fff;
  color: var(--ink);
  text-align: left;
  border: 1px solid var(--line);
}

.search-item small {
  color: var(--muted);
  font-weight: 400;
}

.quantity-row {
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  gap: 0.35rem;
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

.draft-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px 34px;
  align-items: center;
  gap: 0.6rem;
  padding: 0.65rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
}

.draft-main {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
}

.draft-main strong {
  overflow-wrap: anywhere;
}

.draft-main small {
  color: var(--muted);
}

.draft-quantity {
  grid-template-columns: 34px minmax(52px, 1fr) 34px;
}

.draft-quantity .qty-btn {
  min-height: 34px;
}

.draft-quantity input {
  min-height: 34px;
  padding: 0.35rem;
  text-align: center;
}

.qty-btn {
  min-height: 44px;
  padding: 0;
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

@media (max-width: 520px) {
  .draft-item {
    grid-template-columns: minmax(0, 1fr) 34px;
  }

  .draft-quantity {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}
</style>
