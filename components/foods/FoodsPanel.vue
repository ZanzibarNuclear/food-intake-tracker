<script setup lang="ts">
import type { Food, TrackerData } from "~/types/nutrition";
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
const editingFoodId = ref<number | null>(null);

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
  searchResults.value = await $fetch<Food[]>("/api/foods", {
    query: { q: foodQuery.value, filter: foodFilter.value, limit: 100 },
  });
}

watch([foodQuery, foodFilter], () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(runSearch, 200);
});

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
}

async function submitFood() {
  const payload = {
    ...foodForm,
    id: editingFoodId.value ?? undefined,
    name: foodForm.name.trim(),
    servingDescription: foodForm.servingDescription.trim(),
    calories: Number(foodForm.calories),
    proteinGrams: Number(foodForm.proteinGrams),
    nutritionScore: Number(foodForm.nutritionScore),
    satietyScore: foodForm.satietyScore === null ? null : Number(foodForm.satietyScore),
    notes: foodForm.notes || null,
  };
  const saved = await trackerApi.saveFood(payload);
  if (saved) {
    resetFoodForm();
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
  <section class="section with-sidecar">
    <form class="form-panel" @submit.prevent="submitFood">
      <h2>{{ editingFoodId ? "Edit food" : "Add food" }}</h2>
      <div class="form-grid">
        <label>
          Food name / nickname
          <input v-model="foodForm.name" required />
        </label>
        <label>
          Serving description
          <input v-model="foodForm.servingDescription" required />
        </label>
        <div class="form-grid three">
          <label>
            Calories
            <input v-model.number="foodForm.calories" min="0" step="1" type="number" required />
          </label>
          <label>
            Protein (g)
            <input v-model.number="foodForm.proteinGrams" min="0" step="0.1" type="number" required />
          </label>
          <label>
            Nutrition score
            <input v-model.number="foodForm.nutritionScore" max="10" min="1" step="0.1" type="number" required />
          </label>
        </div>
        <label>
          Satiety score
          <input v-model.number="foodForm.satietyScore" max="10" min="0" step="0.1" type="number" />
        </label>
        <label>
          Notes
          <textarea v-model="foodForm.notes" />
        </label>
      </div>
      <div class="actions">
        <button :disabled="trackerApi.isSaving.value" type="submit">
          {{ editingFoodId ? "Update food" : "Save food" }}
        </button>
        <button v-if="editingFoodId" class="secondary" type="button" @click="resetFoodForm()">Cancel</button>
      </div>
    </form>

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
                  class="secondary small"
                  type="button"
                  @click="favoriteFood(food.id)"
                >
                  ★
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
  </section>
</template>

<style scoped>
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

button.small {
  min-height: 34px;
  padding: 0 0.55rem;
  font-size: 0.78rem;
}

button.danger {
  color: var(--warn);
}

@media (min-width: 720px) {
  .filters {
    grid-template-columns: 1fr 160px;
  }
}
</style>
