<script setup lang="ts">
const model = defineModel<string>({ required: true });

const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"] as const;
const open = ref(false);
const selectedMealType = computed(() => mealTypes.find((meal) => meal === model.value) ?? "Breakfast");

function selectMealType(meal: (typeof mealTypes)[number]) {
  model.value = meal;
  open.value = false;
}
</script>

<template>
  <div class="compact-field">
    <span class="field-label">Meal</span>
    <div class="meal-picker">
      <UButton
        aria-haspopup="listbox"
        :aria-expanded="open"
        class="meal-picker-trigger"
        color="neutral"
        type="button"
        variant="soft"
        @click="open = !open"
        @keydown.escape.prevent="open = false"
      >
        <DashboardMealIcon :meal="selectedMealType" aria-hidden="true" />
        <span>{{ selectedMealType }}</span>
        <UIcon class="meal-picker-chevron" name="i-lucide-chevron-down" aria-hidden="true" />
      </UButton>
      <div v-if="open" class="meal-picker-menu" role="listbox">
        <UButton
          v-for="meal in mealTypes"
          :key="meal"
          class="meal-picker-option"
          :class="{ selected: meal === model }"
          color="neutral"
          role="option"
          :aria-selected="meal === model"
          type="button"
          variant="ghost"
          @click="selectMealType(meal)"
        >
          <DashboardMealIcon :meal="meal" aria-hidden="true" />
          <span>{{ meal }}</span>
        </UButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.compact-field {
  display: grid;
  gap: 0.35rem;
  width: auto;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 700;
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
}

.meal-picker-option:hover,
.meal-picker-option.selected {
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.meal-picker-option.selected :deep(.meal-type-icon),
.meal-picker-option:hover :deep(.meal-type-icon) {
  background: var(--panel);
}
</style>
