<script setup lang="ts">
const props = defineProps<{
  meal: string;
}>();

const icon = computed(() => {
  const normalized = props.meal.toLowerCase();
  if (normalized === "breakfast") return "i-lucide-coffee";
  if (normalized === "lunch") return "i-lucide-sandwich";
  if (normalized === "dinner") return "i-lucide-utensils";
  if (normalized === "snack") return "i-lucide-apple";
  if (normalized === "dessert") return "i-lucide-cake-slice";
  return "i-lucide-utensils";
});
</script>

<template>
  <span class="meal-type-icon" :aria-label="meal" :title="meal">
    <UIcon :name="icon" aria-hidden="true" />
  </span>
</template>

<style scoped>
.meal-type-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 0.82rem;
  font-weight: 800;
}

.meal-type-icon :deep(svg) {
  width: 17px;
  height: 17px;
}
</style>
