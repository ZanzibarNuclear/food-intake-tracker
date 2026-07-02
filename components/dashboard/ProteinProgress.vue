<script setup lang="ts">
const props = defineProps<{
  proteinGrams: number;
  proteinTarget: number;
}>();

const percent = computed(() =>
  props.proteinTarget > 0 ? Math.min(100, (props.proteinGrams / props.proteinTarget) * 100) : 0,
);
</script>

<template>
  <div class="protein-progress">
    <div class="bar-track">
      <div class="bar-fill" :style="{ width: `${percent}%` }" />
    </div>
    <p>
      <strong>{{ proteinGrams.toFixed(1) }}g</strong>
      <span class="muted"> / {{ proteinTarget }}g target</span>
    </p>
  </div>
</template>

<style scoped>
.protein-progress {
  display: grid;
  gap: 0.5rem;
}

.bar-track {
  height: 14px;
  border-radius: 999px;
  background: #e8ede4;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #2f6f5e, #5a9a86);
  transition: width 0.2s ease;
}

p {
  margin: 0;
}

.muted {
  color: var(--muted);
}
</style>
