<script setup lang="ts">
import type { Food, FoodSearchResult, MealEntry, TrackerData } from "~/types/nutrition";
import { calculateMeal, summarizeDays } from "~/utils/nutrition";
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
const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"] as const;
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
const foodInput = ref<HTMLInputElement | null>(null);
const mealMenuOpen = ref(false);
const favoritesMenuOpen = ref(false);
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

const summaries = computed(() => summarizeDays(props.tracker));
const recentSummaries = computed(() => summaries.value.slice(0, 14));
const selectedMealType = computed(() => mealTypes.find((meal) => meal === mealForm.meal) ?? "Breakfast");
const favoriteFoods = computed(() => trackerApi.quickList.value.favorites);

function mealIcon(meal: string) {
  const normalized = meal.toLowerCase();
  if (normalized === "breakfast") return "coffee";
  if (normalized === "lunch") return "sandwich";
  if (normalized === "dinner") return "cloche";
  if (normalized === "snack") return "apple";
  if (normalized === "dessert") return "cake";
  return "coffee";
}

function selectMealType(meal: (typeof mealTypes)[number]) {
  mealForm.meal = meal;
  mealMenuOpen.value = false;
}

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
  mealMenuOpen.value = false;
  favoritesMenuOpen.value = false;
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
  <section class="section" :class="{ 'is-modal': isModal }">
    <form v-if="isModal" class="form-panel" @submit.prevent="submitMeal">
      <div class="meal-header-row">
        <label class="compact-field">
          Date
          <input v-model="mealForm.date" type="date" required />
        </label>
        <div class="compact-field">
          <span class="field-label">Meal</span>
          <div class="meal-picker">
            <button
              aria-haspopup="listbox"
              :aria-expanded="mealMenuOpen"
              class="meal-picker-trigger"
              type="button"
              @click="mealMenuOpen = !mealMenuOpen"
              @keydown.escape.prevent="mealMenuOpen = false"
            >
              <span class="meal-type-icon" aria-hidden="true">
                <svg
                  v-if="mealIcon(selectedMealType) === 'coffee'"
                  viewBox="0 0 24 24"
                  width="17"
                  height="17"
                >
                  <path
                    fill="currentColor"
                    d="M4 7h11v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V7Zm13 2h1a2 2 0 0 1 0 4h-1V9ZM6 9v4a3 3 0 0 0 3 3h1a3 3 0 0 0 3-3V9H6Zm11 2h1v-1h-1v1ZM7 3h2v3H7V3Zm5 0h2v3h-2V3Z"
                  />
                </svg>
                <svg
                  v-else-if="mealIcon(selectedMealType) === 'sandwich'"
                  viewBox="0 0 24 24"
                  width="17"
                  height="17"
                >
                  <path
                    fill="currentColor"
                    d="M4 10 12 5l8 5v3H4v-3Zm2 5h12v4H6v-4Zm1-4h10.9L12 7.3 6.1 11H7Z"
                  />
                </svg>
                <svg
                  v-else-if="mealIcon(selectedMealType) === 'cloche'"
                  viewBox="0 0 24 24"
                  width="17"
                  height="17"
                >
                  <path
                    fill="currentColor"
                    d="M11 4V2h2v2a8 8 0 0 1 7.75 7H3.25A8 8 0 0 1 11 4Zm-8 9h18v2H3v-2Zm2 4h14v2H5v-2Z"
                  />
                </svg>
                <svg
                  v-else-if="mealIcon(selectedMealType) === 'apple'"
                  viewBox="0 0 24 24"
                  width="17"
                  height="17"
                >
                  <path
                    fill="currentColor"
                    d="M13 4c.7-1.4 1.8-2.2 3.5-2 .1 1.7-.8 2.9-2.5 3.6A5.8 5.8 0 0 1 18 4c2.6 0 4 2.2 4 5.2 0 4.7-3 10.8-6.1 10.8-1.3 0-2-.7-3.4-.7s-2.1.7-3.4.7C6 20 3 13.9 3 9.2 3 6.2 4.4 4 7 4c1.2 0 2.1.4 3 1 .3-.9 1-1.5 2-1.8V2h2v2h-1Z"
                  />
                </svg>
                <svg
                  v-else-if="mealIcon(selectedMealType) === 'cake'"
                  viewBox="0 0 24 24"
                  width="17"
                  height="17"
                >
                  <path
                    fill="currentColor"
                    d="M11 2h2v3h-2V2Zm-5 9h12a3 3 0 0 1 3 3v7H3v-7a3 3 0 0 1 3-3Zm0 2a1 1 0 0 0-1 1v1c1.1 0 1.6-.3 2.3-.7.8-.5 1.7-1 3.2-1s2.4.5 3.2 1c.7.4 1.2.7 2.3.7s1.6-.3 2.3-.7l.7-.4A1 1 0 0 0 18 13H6Zm-1 4v2h14v-2c-1.1 0-1.9-.4-2.6-.8-.7-.4-1.2-.7-2.4-.7s-1.7.3-2.4.7c-.8.5-1.7 1-3.2 1-1.1 0-1.8-.2-2.4-.4Z"
                  />
                </svg>
              </span>
              <span>{{ selectedMealType }}</span>
              <span class="meal-picker-chevron" aria-hidden="true">⌄</span>
            </button>
            <div v-if="mealMenuOpen" class="meal-picker-menu" role="listbox">
              <button
                v-for="meal in mealTypes"
                :key="meal"
                class="meal-picker-option"
                :class="{ selected: meal === mealForm.meal }"
                role="option"
                :aria-selected="meal === mealForm.meal"
                type="button"
                @click="selectMealType(meal)"
              >
                <span class="meal-type-icon" aria-hidden="true">
                  <svg
                    v-if="mealIcon(meal) === 'coffee'"
                    viewBox="0 0 24 24"
                    width="17"
                    height="17"
                  >
                    <path
                      fill="currentColor"
                      d="M4 7h11v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V7Zm13 2h1a2 2 0 0 1 0 4h-1V9ZM6 9v4a3 3 0 0 0 3 3h1a3 3 0 0 0 3-3V9H6Zm11 2h1v-1h-1v1ZM7 3h2v3H7V3Zm5 0h2v3h-2V3Z"
                    />
                  </svg>
                  <svg
                    v-else-if="mealIcon(meal) === 'sandwich'"
                    viewBox="0 0 24 24"
                    width="17"
                    height="17"
                  >
                    <path
                      fill="currentColor"
                      d="M4 10 12 5l8 5v3H4v-3Zm2 5h12v4H6v-4Zm1-4h10.9L12 7.3 6.1 11H7Z"
                    />
                  </svg>
                  <svg
                    v-else-if="mealIcon(meal) === 'cloche'"
                    viewBox="0 0 24 24"
                    width="17"
                    height="17"
                  >
                    <path
                      fill="currentColor"
                      d="M11 4V2h2v2a8 8 0 0 1 7.75 7H3.25A8 8 0 0 1 11 4Zm-8 9h18v2H3v-2Zm2 4h14v2H5v-2Z"
                    />
                  </svg>
                  <svg
                    v-else-if="mealIcon(meal) === 'apple'"
                    viewBox="0 0 24 24"
                    width="17"
                    height="17"
                  >
                    <path
                      fill="currentColor"
                      d="M13 4c.7-1.4 1.8-2.2 3.5-2 .1 1.7-.8 2.9-2.5 3.6A5.8 5.8 0 0 1 18 4c2.6 0 4 2.2 4 5.2 0 4.7-3 10.8-6.1 10.8-1.3 0-2-.7-3.4-.7s-2.1.7-3.4.7C6 20 3 13.9 3 9.2 3 6.2 4.4 4 7 4c1.2 0 2.1.4 3 1 .3-.9 1-1.5 2-1.8V2h2v2h-1Z"
                    />
                  </svg>
                  <svg
                    v-else-if="mealIcon(meal) === 'cake'"
                    viewBox="0 0 24 24"
                    width="17"
                    height="17"
                  >
                    <path
                      fill="currentColor"
                      d="M11 2h2v3h-2V2Zm-5 9h12a3 3 0 0 1 3 3v7H3v-7a3 3 0 0 1 3-3Zm0 2a1 1 0 0 0-1 1v1c1.1 0 1.6-.3 2.3-.7.8-.5 1.7-1 3.2-1s2.4.5 3.2 1c.7.4 1.2.7 2.3.7s1.6-.3 2.3-.7l.7-.4A1 1 0 0 0 18 13H6Zm-1 4v2h14v-2c-1.1 0-1.9-.4-2.6-.8-.7-.4-1.2-.7-2.4-.7s-1.7.3-2.4.7c-.8.5-1.7 1-3.2 1-1.1 0-1.8-.2-2.4-.4Z"
                    />
                  </svg>
                </span>
                <span>{{ meal }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="form-grid">
        <div class="favorite-picker">
          <span class="field-label">Favorites</span>
          <button
            class="favorite-picker-trigger"
            type="button"
            :disabled="!favoriteFoods.length"
            aria-haspopup="listbox"
            :aria-expanded="favoritesMenuOpen"
            @click="favoritesMenuOpen = !favoritesMenuOpen"
            @keydown.escape.prevent="favoritesMenuOpen = false"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="currentColor"
                d="m12 2.5 2.9 5.87 6.48.94-4.69 4.57 1.1 6.45L12 17.28l-5.79 3.05 1.1-6.45-4.69-4.57 6.48-.94L12 2.5Z"
              />
            </svg>
            <span>{{ favoriteFoods.length ? "Choose favorite" : "No favorites yet" }}</span>
            <span class="meal-picker-chevron" aria-hidden="true">⌄</span>
          </button>
          <div v-if="favoritesMenuOpen && favoriteFoods.length" class="favorite-picker-menu" role="listbox">
            <button
              v-for="food in favoriteFoods"
              :key="food.id"
              class="favorite-picker-option"
              role="option"
              type="button"
              @click="selectFood(food)"
            >
              <span>{{ food.name }}</span>
              <small>{{ food.servingDescription }} · {{ formatNumber(food.calories) }} cal</small>
            </button>
          </div>
        </div>
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

    <div v-if="!isModal" class="table-panel meal-chart-panel">
      <h2>Calorie trend (7 days)</h2>
      <DashboardCalorieChart
        :summaries="summaries"
        :selected-date="mealForm.date"
        :calorie-target="props.tracker.settings.dailyCalorieTarget"
      />
    </div>

    <div v-if="!isModal" class="table-panel history-summary">
      <div class="panel-header">
        <h2>Daily Summary</h2>
        <input v-model="mealForm.date" aria-label="Selected date" type="date" />
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

    <dialog v-if="!isModal" ref="recentsDialog" class="recents-dialog" @close="closeRecentsPopup">
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

    <dialog v-if="!isModal" ref="favoritesDialog" class="recents-dialog" @close="closeFavoritesPopup">
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
}

.meal-chart-panel {
  min-width: 0;
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

.panel-header input {
  width: auto;
  min-width: 9.5rem;
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

.meal-picker {
  position: relative;
  min-width: 9.5rem;
}

.meal-picker-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 42px;
  padding: 0 0.55rem;
  color: var(--ink);
  background: var(--panel);
  border: 1px solid var(--line);
}

.meal-picker-chevron {
  margin-left: auto;
  color: var(--muted);
  font-size: 1rem;
  line-height: 1;
}

.meal-picker-menu {
  position: absolute;
  z-index: 20;
  top: calc(100% + 0.35rem);
  left: 0;
  display: grid;
  gap: 0.2rem;
  width: max-content;
  min-width: 100%;
  padding: 0.35rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  box-shadow: 0 14px 30px rgba(32, 36, 31, 0.16);
}

.meal-picker-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: flex-start;
  min-height: 38px;
  padding: 0.25rem 0.5rem;
  color: var(--ink);
  background: transparent;
  border: 0;
}

.meal-picker-option:hover,
.meal-picker-option.selected {
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.meal-type-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.meal-picker-option.selected .meal-type-icon,
.meal-picker-option:hover .meal-type-icon {
  background: var(--panel);
}

.favorite-picker {
  position: relative;
  display: grid;
  gap: 0.35rem;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 700;
}

.favorite-picker-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  width: min(18rem, 100%);
  min-height: 42px;
  padding: 0 0.65rem;
  color: var(--ink);
  background: var(--panel);
  border: 1px solid var(--line);
}

.favorite-picker-trigger svg {
  color: #a87600;
}

.favorite-picker-trigger:disabled {
  cursor: not-allowed;
  opacity: 0.65;
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
  color: var(--ink);
  background: transparent;
  border: 0;
  text-align: left;
}

.favorite-picker-option:hover {
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.favorite-picker-option small {
  color: var(--muted);
  font-weight: 400;
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
