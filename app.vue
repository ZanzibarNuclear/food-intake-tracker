<script setup lang="ts">
import { todayIso } from "~/utils/dates";

const tabs = ["Dashboard", "Log", "Foods", "Weight"] as const;
type Tab = (typeof tabs)[number];

const activeTab = ref<Tab>("Log");
const selectedDate = ref(todayIso());

const tracker = useTracker();

onMounted(async () => {
  await tracker.refresh();
  await tracker.refreshQuickList();
});
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div class="brand-row">
        <div>
          <h1>Weight Management Food Tracker</h1>
          <p>{{ selectedDate }}</p>
        </div>
      </div>
      <nav class="tabbar" aria-label="Tracker sections">
        <button
          v-for="tab in tabs"
          :key="tab"
          type="button"
          :class="{ active: activeTab === tab }"
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </nav>
    </header>

    <div class="content">
      <p v-if="tracker.isLoading.value" class="status">Loading…</p>
      <p v-else-if="tracker.errorMessage.value" class="error">{{ tracker.errorMessage.value }}</p>

      <template v-else-if="tracker.data.value">
        <DashboardPanel
          v-if="activeTab === 'Dashboard'"
          :tracker="tracker.data.value"
          :selected-date="selectedDate"
          @update:selected-date="selectedDate = $event"
        />
        <LogPanel v-else-if="activeTab === 'Log'" :tracker="tracker.data.value" />
        <FoodsPanel v-else-if="activeTab === 'Foods'" :tracker="tracker.data.value" />
        <WeightPanel v-else :tracker="tracker.data.value" />
      </template>
    </div>
  </main>
</template>
