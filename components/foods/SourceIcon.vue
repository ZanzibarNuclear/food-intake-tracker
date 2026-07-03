<template>
  <span aria-label="Catalog food" class="source-icon" title="Catalog food">
    <UIcon name="i-lucide-book-open" aria-hidden="true" />
  </span>
</template>

<style scoped>
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

.source-icon :deep(svg) {
  width: 14px;
  height: 14px;
}
</style>
