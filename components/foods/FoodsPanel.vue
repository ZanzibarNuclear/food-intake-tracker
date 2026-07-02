<script setup lang="ts">
import type { Food, FoodSearchResult, TrackerData } from "~/types/nutrition";
import { formatNumber } from "~/utils/format";

const props = defineProps<{
  tracker: TrackerData;
}>();

const emit = defineEmits<{
  logFood: [food: Food];
}>();

const trackerApi = useTracker();
const foodQuery = ref("");
const foodFilter = ref<"all" | "my" | "catalog">("all");
const page = ref(1);
const pageSize = ref(25);
const totalFoods = ref(0);
const editingFoodId = ref<number | null>(null);
const showFoodModal = ref(false);
const selectedFood = ref<Food | null>(null);
const foodModalMode = ref<"add" | "view" | "edit" | "merge">("add");
const mergeQuery = ref("");
const mergeResults = ref<Food[]>([]);
const mergeTarget = ref<Food | null>(null);

const foodForm = reactive<Food>({
  name: "",
  servingDescription: "",
  calories: 0,
  proteinGrams: 0,
  nutritionScore: 5,
  satietyScore: null,
  notes: null,
});

const searchResults = ref<Food[]>([]);
let searchTimer: ReturnType<typeof setTimeout> | null = null;
let mergeSearchTimer: ReturnType<typeof setTimeout> | null = null;
let skipNextMergeSearch = false;

async function runSearch() {
  const result = await $fetch<FoodSearchResult>("/api/foods", {
    query: {
      q: foodQuery.value,
      filter: foodFilter.value,
      page: page.value,
      pageSize: pageSize.value,
    },
  });
  searchResults.value = result.foods;
  totalFoods.value = result.total;
  page.value = result.page;
  pageSize.value = result.pageSize;
}

watch([foodQuery, foodFilter], () => {
  if (searchTimer) clearTimeout(searchTimer);
  page.value = 1;
  searchTimer = setTimeout(runSearch, 200);
});

watch(pageSize, () => {
  page.value = 1;
  runSearch();
});

watch(mergeQuery, (query) => {
  if (skipNextMergeSearch) {
    skipNextMergeSearch = false;
    return;
  }
  if (mergeSearchTimer) clearTimeout(mergeSearchTimer);
  mergeTarget.value = null;
  const sourceId = selectedFood.value?.id;
  if (!query.trim() || !sourceId) {
    mergeResults.value = [];
    return;
  }
  mergeSearchTimer = setTimeout(async () => {
    const result = await $fetch<FoodSearchResult>("/api/foods", {
      query: { q: query, filter: "all", page: 1, pageSize: 8 },
    });
    mergeResults.value = result.foods.filter((food) => food.id !== sourceId);
  }, 200);
});

const totalPages = computed(() => Math.max(1, Math.ceil(totalFoods.value / pageSize.value)));
const firstResult = computed(() => (totalFoods.value === 0 ? 0 : (page.value - 1) * pageSize.value + 1));
const lastResult = computed(() => Math.min(totalFoods.value, page.value * pageSize.value));
const favoriteIds = computed(
  () => new Set(trackerApi.quickList.value.favorites.map((food) => food.id).filter((id): id is number => Boolean(id))),
);

async function goToPage(nextPage: number) {
  page.value = Math.min(Math.max(1, nextPage), totalPages.value);
  await runSearch();
}

function openFoodModal() {
  resetFoodForm();
  selectedFood.value = null;
  foodModalMode.value = "add";
  showFoodModal.value = true;
}

function closeFoodModal() {
  showFoodModal.value = false;
  selectedFood.value = null;
  foodModalMode.value = "add";
  resetFoodForm();
  resetMergeForm();
}

function resetFoodForm() {
  editingFoodId.value = null;
  foodForm.name = "";
  foodForm.servingDescription = "";
  foodForm.calories = 0;
  foodForm.proteinGrams = 0;
  foodForm.nutritionScore = 5;
  foodForm.satietyScore = null;
  foodForm.notes = null;
}

function editFood(food: Food) {
  if (food.isSystemSeed) return;
  selectedFood.value = food;
  foodModalMode.value = "edit";
  editingFoodId.value = food.id ?? null;
  Object.assign(foodForm, food);
  showFoodModal.value = true;
}

function viewFood(food: Food) {
  selectedFood.value = food;
  foodModalMode.value = "view";
  editingFoodId.value = null;
  showFoodModal.value = true;
}

function editSelectedFood() {
  if (!selectedFood.value) return;
  editFood(selectedFood.value);
}

function resetMergeForm() {
  mergeQuery.value = "";
  mergeResults.value = [];
  mergeTarget.value = null;
}

function startMergeFood() {
  if (!selectedFood.value || selectedFood.value.isSystemSeed) return;
  resetMergeForm();
  foodModalMode.value = "merge";
  mergeQuery.value = selectedFood.value.name;
  mergeTarget.value = null;
}

async function submitFood() {
  const satietyScore =
    foodForm.satietyScore === null || String(foodForm.satietyScore).trim() === ""
      ? null
      : Math.round(Number(foodForm.satietyScore));
  const payload = {
    ...foodForm,
    id: editingFoodId.value ?? undefined,
    name: foodForm.name.trim(),
    servingDescription: foodForm.servingDescription.trim(),
    calories: Math.round(Number(foodForm.calories)),
    proteinGrams: Math.round(Number(foodForm.proteinGrams)),
    nutritionScore: Math.round(Number(foodForm.nutritionScore)),
    satietyScore,
    notes: foodForm.notes || null,
  };
  const saved = await trackerApi.saveFood(payload);
  if (saved) {
    closeFoodModal();
    await runSearch();
  }
}

async function removeFood(id: number) {
  const confirmed = window.confirm(
    "Delete this food? If it is used in meal history, it will be archived and hidden instead.",
  );
  if (!confirmed) return;
  await trackerApi.deleteFood(id);
  closeFoodModal();
  await runSearch();
}

async function favoriteFood(id: number) {
  await trackerApi.toggleFavorite(id);
}

function isFavorite(food: Food) {
  return Boolean(food.id && favoriteIds.value.has(food.id));
}

async function copyFood(food: Food) {
  if (!food.id) return;
  const copied = await trackerApi.copyFood(food.id);
  if (copied) {
    editFood(copied);
    await runSearch();
  }
}

function selectMergeTarget(food: Food) {
  skipNextMergeSearch = true;
  mergeTarget.value = food;
  mergeQuery.value = food.name;
  mergeResults.value = [];
}

async function submitMergeFood() {
  if (!selectedFood.value?.id || !mergeTarget.value?.id) return;
  const confirmed = window.confirm(
    `Merge "${selectedFood.value.name}" into "${mergeTarget.value.name}"? All meal entries will use the target food, then the source food will be deleted.`,
  );
  if (!confirmed) return;

  const merged = await trackerApi.mergeFood(selectedFood.value.id, mergeTarget.value.id);
  if (merged) {
    closeFoodModal();
    await runSearch();
  }
}

function useFood(food: Food) {
  closeFoodModal();
  emit("logFood", food);
}

onMounted(runSearch);
</script>

<template>
  <section class="section">
    <div class="foods-actions">
      <button type="button" @click="openFoodModal">+ Food</button>
    </div>
    <div class="table-panel food-catalog-panel">
      <div class="panel-header">
        <h2>Food catalog</h2>
        <div class="filters">
          <input v-model="foodQuery" aria-label="Search foods" placeholder="Search foods" />
          <div class="filter-selects">
            <select v-model="foodFilter">
              <option value="all">All</option>
              <option value="my">My foods</option>
              <option value="catalog">Catalog</option>
            </select>
            <select v-model.number="pageSize" aria-label="Rows per page">
              <option :value="10">10 / page</option>
              <option :value="25">25 / page</option>
              <option :value="50">50 / page</option>
              <option :value="100">100 / page</option>
            </select>
          </div>
        </div>
      </div>
      <div class="pagination-bar">
        <span>{{ firstResult }}-{{ lastResult }} of {{ totalFoods }}</span>
        <div class="pager-actions">
          <button class="secondary small" type="button" :disabled="page <= 1" @click="goToPage(page - 1)">
            Previous
          </button>
          <span>Page {{ page }} of {{ totalPages }}</span>
          <button class="secondary small" type="button" :disabled="page >= totalPages" @click="goToPage(page + 1)">
            Next
          </button>
        </div>
      </div>
      <div class="table-scroll">
        <table class="foods-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Serving</th>
              <th class="favorite-col" aria-label="Favorite" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="food in searchResults"
              :key="food.id"
              class="food-row"
              :class="{ personal: !food.isSystemSeed }"
              tabindex="0"
              @click="viewFood(food)"
              @keydown.enter.prevent="viewFood(food)"
              @keydown.space.prevent="viewFood(food)"
            >
              <td>
                {{ food.name }}
                <span v-if="food.isSystemSeed" aria-label="Catalog food" class="source-icon" title="Catalog food">
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14">
                    <path
                      fill="currentColor"
                      d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5v-17Zm2.5-.5a.5.5 0 0 0-.5.5v13.05c.17-.03.33-.05.5-.05H18V4H7.5ZM4 4h1v17.5H4V4Z"
                    />
                  </svg>
                </span>
              </td>
              <td>{{ food.servingDescription }}</td>
              <td class="favorite-col">
                <button
                  v-if="food.id"
                  class="secondary small star-btn"
                  :class="{ active: isFavorite(food) }"
                  :aria-label="isFavorite(food) ? 'Remove from favorites' : 'Add to favorites'"
                  :aria-pressed="isFavorite(food)"
                  type="button"
                  @click.stop="favoriteFood(food.id)"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16">
                    <path
                      v-if="isFavorite(food)"
                      fill="currentColor"
                      d="m12 2.5 2.9 5.87 6.48.94-4.69 4.57 1.1 6.45L12 17.28l-5.79 3.05 1.1-6.45-4.69-4.57 6.48-.94L12 2.5Z"
                    />
                    <path
                      v-else
                      fill="currentColor"
                      d="m12 6.94 1.68 3.4.46.94 1.04.15 3.75.54-2.71 2.65-.75.73.18 1.03.64 3.73-3.35-1.76-.94-.5-.94.5-3.35 1.76.64-3.73.18-1.03-.75-.73-2.71-2.65 3.75-.54 1.04-.15.46-.94L12 6.94Zm0-4.44L9.1 8.37l-6.48.94 4.69 4.57-1.1 6.45L12 17.28l5.79 3.05-1.1-6.45 4.69-4.57-6.48-.94L12 2.5Z"
                    />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination-bar bottom">
        <span>{{ firstResult }}-{{ lastResult }} of {{ totalFoods }}</span>
        <div class="pager-actions">
          <button class="secondary small" type="button" :disabled="page <= 1" @click="goToPage(page - 1)">
            Previous
          </button>
          <span>Page {{ page }} of {{ totalPages }}</span>
          <button class="secondary small" type="button" :disabled="page >= totalPages" @click="goToPage(page + 1)">
            Next
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showFoodModal"
      aria-labelledby="food-modal-title"
      aria-modal="true"
      class="modal-backdrop"
      role="dialog"
      @click.self="closeFoodModal"
    >
      <div class="food-modal">
        <div class="modal-header">
          <h2 id="food-modal-title">
            {{
              foodModalMode === "view"
                ? "Food details"
                : foodModalMode === "merge"
                  ? "Merge food"
                  : editingFoodId
                    ? "Edit food"
                    : "Add food"
            }}
          </h2>
          <button aria-label="Close" class="modal-close" type="button" @click="closeFoodModal">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
              <path
                fill="currentColor"
                d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.42L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4z"
              />
            </svg>
          </button>
        </div>

        <div v-if="foodModalMode === 'view' && selectedFood" class="food-detail">
          <div>
            <h3>{{ selectedFood.name }}</h3>
            <p>{{ selectedFood.servingDescription }}</p>
            <span
              v-if="selectedFood.isSystemSeed"
              aria-label="Catalog food"
              class="source-icon"
              title="Catalog food"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14">
                <path
                  fill="currentColor"
                  d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5v-17Zm2.5-.5a.5.5 0 0 0-.5.5v13.05c.17-.03.33-.05.5-.05H18V4H7.5ZM4 4h1v17.5H4V4Z"
                />
              </svg>
            </span>
          </div>

          <dl class="detail-grid">
            <div>
              <dt>Calories</dt>
              <dd>{{ formatNumber(selectedFood.calories) }}</dd>
            </div>
            <div>
              <dt>Protein</dt>
              <dd>{{ formatNumber(selectedFood.proteinGrams, 1) }}g</dd>
            </div>
            <div>
              <dt>Nutrition</dt>
              <dd>{{ formatNumber(selectedFood.nutritionScore, 1) }}</dd>
            </div>
            <div>
              <dt>Satiety</dt>
              <dd>{{ formatNumber(selectedFood.satietyScore, 1) }}</dd>
            </div>
          </dl>

          <div v-if="selectedFood.notes" class="detail-notes">
            <strong>Notes</strong>
            <p>{{ selectedFood.notes }}</p>
          </div>

          <div class="actions">
            <button type="button" @click="useFood(selectedFood)">Use</button>
            <button
              v-if="selectedFood.isSystemSeed"
              class="secondary"
              type="button"
              @click="copyFood(selectedFood)"
            >
              Copy
            </button>
            <button
              v-if="!selectedFood.isSystemSeed"
              class="secondary"
              type="button"
              @click="editSelectedFood"
            >
              Edit
            </button>
            <button
              v-if="!selectedFood.isSystemSeed"
              class="secondary"
              type="button"
              @click="startMergeFood"
            >
              Merge
            </button>
            <button
              v-if="!selectedFood.isSystemSeed && selectedFood.id"
              class="secondary danger"
              type="button"
              @click="removeFood(selectedFood.id)"
            >
              Delete
            </button>
          </div>
        </div>

        <div v-else-if="foodModalMode === 'merge' && selectedFood" class="merge-panel">
          <div>
            <h3>{{ selectedFood.name }}</h3>
            <p class="status muted">Choose the food that should replace this one in meal history.</p>
          </div>

          <label>
            Merge into
            <input v-model="mergeQuery" autocomplete="off" />
          </label>

          <div v-if="mergeResults.length" class="merge-results">
            <button
              v-for="food in mergeResults"
              :key="food.id"
              class="merge-result"
              type="button"
              @click="selectMergeTarget(food)"
            >
              <span>
                {{ food.name }}
                <span v-if="food.isSystemSeed" aria-label="Catalog food" class="source-icon" title="Catalog food">
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14">
                    <path
                      fill="currentColor"
                      d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5v-17Zm2.5-.5a.5.5 0 0 0-.5.5v13.05c.17-.03.33-.05.5-.05H18V4H7.5ZM4 4h1v17.5H4V4Z"
                    />
                  </svg>
                </span>
              </span>
              <small>
                {{ food.servingDescription }} ·
                {{ formatNumber(food.calories) }} cal ·
                {{ formatNumber(food.proteinGrams, 1) }}g protein
              </small>
            </button>
          </div>

          <div v-if="mergeTarget" class="merge-target">
            <strong>Target</strong>
            <span>{{ mergeTarget.name }}</span>
            <small>{{ mergeTarget.servingDescription }}</small>
          </div>

          <div class="actions">
            <button
              type="button"
              :disabled="trackerApi.isSaving.value || !mergeTarget"
              @click="submitMergeFood"
            >
              Merge
            </button>
            <button class="secondary" type="button" @click="foodModalMode = 'view'">Cancel</button>
          </div>
        </div>

        <form v-else class="form-panel food-form" @submit.prevent="submitFood">
          <div class="form-grid">
            <label>
              Food name / nickname
              <input v-model="foodForm.name" required />
            </label>
            <label>
              Serving description
              <input v-model="foodForm.servingDescription" required />
            </label>
            <div class="score-grid">
              <label>
                Calories
                <input v-model.number="foodForm.calories" min="0" step="1" type="number" required />
              </label>
              <label>
                Protein (g)
                <input v-model.number="foodForm.proteinGrams" min="0" step="1" type="number" required />
              </label>
              <label>
                Nutrition
                <input v-model.number="foodForm.nutritionScore" max="10" min="1" step="1" type="number" required />
              </label>
              <label>
                Satiety
                <input v-model.number="foodForm.satietyScore" max="10" min="0" step="1" type="number" />
              </label>
            </div>
            <label>
              Notes
              <textarea v-model="foodForm.notes" />
            </label>
          </div>
          <div class="actions">
            <button :disabled="trackerApi.isSaving.value" type="submit">
              {{ editingFoodId ? "Update food" : "Save food" }}
            </button>
            <button class="secondary" type="button" @click="closeFoodModal">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.foods-actions {
  display: flex;
  justify-content: flex-start;
}

.foods-actions button {
  padding: 0 1rem;
}

.panel-header {
  display: grid;
  gap: 0.55rem;
}

.panel-header h2 {
  margin: 0;
  font-size: 1rem;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.filters input {
  flex: 1 1 12rem;
  min-width: 0;
}

.filters select {
  flex: 0 0 auto;
  width: auto;
  min-width: 7.25rem;
}

.filter-selects {
  display: flex;
  flex: 0 0 auto;
  gap: 0.4rem;
  white-space: nowrap;
}

.food-catalog-panel {
  gap: 0.65rem;
  font-size: 0.86rem;
}

.food-catalog-panel :deep(input),
.food-catalog-panel :deep(select),
.food-catalog-panel button {
  font-size: 0.82rem;
}

.foods-table {
  min-width: 0;
  table-layout: fixed;
  font-size: 0.82rem;
}

.foods-table :deep(th),
.foods-table :deep(td) {
  padding: 0.5rem 0.45rem;
}

.foods-table th:first-child,
.foods-table td:first-child {
  width: 42%;
}

.food-row {
  cursor: pointer;
}

.food-row.personal {
  background: #f7f1ff;
}

.food-row:hover,
.food-row:focus-visible {
  background: var(--accent-soft);
  outline: none;
}

.source-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-left: 0.3rem;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  vertical-align: middle;
}

.favorite-col {
  width: 3rem;
  text-align: center;
}

.pagination-bar,
.pager-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.pagination-bar {
  justify-content: space-between;
  color: var(--muted);
  font-size: 0.78rem;
}

.pagination-bar.bottom {
  padding-top: 0.25rem;
  border-top: 1px solid var(--line);
}

.pager-actions span {
  white-space: nowrap;
}

button.small {
  min-height: 30px;
  padding: 0 0.45rem;
  font-size: 0.76rem;
}

button.danger {
  color: var(--warn);
}

.star-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  padding: 0;
}

.star-btn.active {
  color: #a87600;
  background: #fff4c2;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: start center;
  padding: 1rem;
  overflow-y: auto;
  background: rgba(32, 36, 31, 0.5);
}

.food-modal {
  display: grid;
  gap: 0;
  width: min(620px, 100%);
  margin: min(8vh, 4rem) auto 1rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  box-shadow: 0 20px 56px rgba(32, 36, 31, 0.22);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--line);
}

.modal-header h2 {
  margin: 0;
  font-size: 1rem;
}

.modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  min-height: 36px;
  padding: 0;
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.food-form {
  border: 0;
  border-radius: 0;
}

.food-detail {
  display: grid;
  gap: 1rem;
  padding: 1rem;
}

.food-detail h3 {
  margin: 0;
  font-size: 1.15rem;
}

.food-detail p {
  margin: 0.25rem 0 0;
  color: var(--muted);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
  margin: 0;
}

.detail-grid div {
  padding: 0.7rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
}

.detail-grid dt {
  color: var(--muted);
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
}

.detail-grid dd {
  margin: 0.25rem 0 0;
  font-size: 1.1rem;
  font-weight: 800;
}

.detail-notes {
  display: grid;
  gap: 0.25rem;
  padding: 0.75rem;
  border: 1px dashed var(--line);
  border-radius: 8px;
}

.detail-notes p {
  margin: 0;
}

.merge-panel {
  display: grid;
  gap: 0.85rem;
  padding: 1rem;
}

.merge-panel h3 {
  margin: 0;
  font-size: 1.1rem;
}

.merge-results {
  display: grid;
  gap: 0.35rem;
  max-height: 240px;
  overflow: auto;
  padding: 0.35rem;
  border: 1px solid var(--line);
  border-radius: 8px;
}

.merge-result {
  display: grid;
  gap: 0.18rem;
  justify-content: stretch;
  min-height: auto;
  padding: 0.55rem 0.65rem;
  background: #fff;
  color: var(--ink);
  text-align: left;
  border: 1px solid var(--line);
}

.merge-result small,
.merge-target small {
  color: var(--muted);
  font-weight: 400;
}

.merge-target {
  display: grid;
  gap: 0.2rem;
  padding: 0.7rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
}

.score-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.score-grid label {
  flex: 0 0 7.25rem;
}

.score-grid input {
  width: 100%;
}

</style>
