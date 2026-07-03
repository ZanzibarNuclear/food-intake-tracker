<script setup lang="ts">
type DraftMealItem = {
  tempId: number;
  foodId?: number;
  foodName: string;
  quantity: number;
};

defineProps<{
  item: DraftMealItem;
  calories?: number | null;
  proteinGrams?: number | null;
}>();

const emit = defineEmits<{
  bump: [tempId: number, delta: number];
  remove: [tempId: number];
}>();

function formatNumber(value: number | null | undefined, decimals = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}
</script>

<template>
  <div class="draft-item">
    <div class="draft-main">
      <strong>{{ item.foodName }}</strong>
      <small>
        {{ formatNumber(calories) }} cal ·
        {{ formatNumber(proteinGrams, 1) }}g protein
      </small>
    </div>
    <div class="quantity-row draft-quantity">
      <UButton
        aria-label="Decrease quantity"
        class="nuxt-ui-button"
        color="neutral"
        icon="i-lucide-minus"
        size="xs"
        square
        type="button"
        variant="soft"
        @click="emit('bump', item.tempId, -0.25)"
      />
      <UInput v-model.number="item.quantity" class="quantity-input" min="0.01" step="0.01" type="number" required />
      <UButton
        aria-label="Increase quantity"
        class="nuxt-ui-button"
        color="neutral"
        icon="i-lucide-plus"
        size="xs"
        square
        type="button"
        variant="soft"
        @click="emit('bump', item.tempId, 0.25)"
      />
    </div>
    <UButton
      aria-label="Remove food"
      class="nuxt-ui-button"
      color="error"
      icon="i-lucide-trash-2"
      size="xs"
      square
      type="button"
      variant="soft"
      @click="emit('remove', item.tempId)"
    />
  </div>
</template>

<style scoped>
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

.quantity-row {
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  gap: 0.35rem;
}

.draft-quantity {
  grid-template-columns: 34px minmax(52px, 1fr) 34px;
}

.quantity-input {
  min-height: 34px;
}

.quantity-input :deep(input) {
  text-align: center;
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
