<script setup lang="ts">
defineProps<{
  icon: string;
  label: string;
  value: string | number;
  detail: string;
}>();
</script>

<template>
  <article class="metric">
    <span class="metric-icon" aria-hidden="true">
      <UIcon :name="icon" />
    </span>
    <span>{{ label }}</span>
    <strong>{{ value }}</strong>
    <small>{{ detail }}</small>
  </article>
</template>

<style scoped>
.metric {
  position: relative;
}

.metric-icon {
  position: absolute;
  top: 0.8rem;
  right: 0.8rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.metric-icon :deep(svg) {
  width: 16px;
  height: 16px;
}
</style>
