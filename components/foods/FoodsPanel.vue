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
  showFoodModal.value = true;
}

function closeFoodModal() {
  showFoodModal.value = false;
  resetFoodForm();
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
  editingFoodId.value = food.id ?? null;
  Object.assign(foodForm, food);
  showFoodModal.value = true;
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
  await trackerApi.deleteFood(id);
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

function useFood(food: Food) {
  emit("logFood", food);
}

onMounted(runSearch);
</script>

<template>
  <section class="section">
    <div class="foods-actions">
      <button type="button" @click="openFoodModal">+ Food</button>
    </div>
    <div class="table-panel">
      <div class="panel-header">
        <h2>Food catalog</h2>
        <div class="filters">
          <input v-model="foodQuery" aria-label="Search foods" placeholder="Search foods" />
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
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Serving</th>
              <th class="number">Cal</th>
              <th class="number">Protein</th>
              <th class="number">Nutrition</th>
              <th class="number">Satiety</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="food in searchResults" :key="food.id">
              <td>
                {{ food.name }}
                <span v-if="food.isSystemSeed" class="pill">Catalog</span>
              </td>
              <td>{{ food.servingDescription }}</td>
              <td class="number">{{ formatNumber(food.calories) }}</td>
              <td class="number">{{ formatNumber(food.proteinGrams, 1) }}g</td>
              <td class="number">{{ formatNumber(food.nutritionScore, 1) }}</td>
              <td class="number">{{ formatNumber(food.satietyScore, 1) }}</td>
              <td class="row-actions">
                <button
                  v-if="food.id"
                  class="secondary small"
                  type="button"
                  @click="useFood(food)"
                >
                  Use
                </button>
                <button
                  v-if="food.isSystemSeed"
                  class="secondary small"
                  type="button"
                  @click="copyFood(food)"
                >
                  Copy
                </button>
                <button
                  v-if="food.id"
                  class="secondary small star-btn"
                  :class="{ active: isFavorite(food) }"
                  :aria-label="isFavorite(food) ? 'Remove from favorites' : 'Add to favorites'"
                  :aria-pressed="isFavorite(food)"
                  type="button"
                  @click="favoriteFood(food.id)"
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
                <button
                  v-if="!food.isSystemSeed"
                  class="secondary small"
                  type="button"
                  @click="editFood(food)"
                >
                  Edit
                </button>
                <button
                  v-if="!food.isSystemSeed && food.id"
                  class="secondary small danger"
                  type="button"
                  @click="removeFood(food.id)"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
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
          <h2 id="food-modal-title">{{ editingFoodId ? "Edit food" : "Add food" }}</h2>
          <button aria-label="Close" class="modal-close" type="button" @click="closeFoodModal">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
              <path
                fill="currentColor"
                d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.42L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4z"
              />
            </svg>
          </button>
        </div>

        <form class="form-panel food-form" @submit.prevent="submitFood">
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
  gap: 0.75rem;
}

.panel-header h2 {
  margin: 0;
}

.filters {
  display: grid;
  gap: 0.5rem;
}

.row-actions {
  display: flex;
  gap: 0.35rem;
  white-space: nowrap;
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
  font-size: 0.86rem;
}

.pager-actions span {
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

.star-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
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

@media (min-width: 720px) {
  .filters {
    grid-template-columns: 1fr 160px 130px;
  }
}
</style>
