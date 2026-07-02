<script setup lang="ts">
import { formatClockInTimeZone, todayIso } from "~/utils/dates";
import type { Food } from "~/types/nutrition";
import { authClient } from "~~/lib/auth-client";

const tabs = ["Dashboard", "Log", "Foods", "Weight"] as const;
type Tab = (typeof tabs)[number];

const activeTab = ref<Tab>("Log");
const showSettings = ref(false);
const selectedDate = ref(todayIso());
const quickAddSignal = ref(0);
const pendingLogFood = ref<Food | null>(null);

const tracker = useTracker();
const { timezone } = useUserTimezone();
const { data: session, isPending: isSessionPending } = await authClient.useSession(useFetch);
const isSignedIn = computed(() => Boolean(session.value?.user));

const headerClock = ref(formatClockInTimeZone(timezone.value));

let clockTimer: ReturnType<typeof setInterval> | null = null;

function updateClock() {
  headerClock.value = formatClockInTimeZone(timezone.value);
  if (!showSettings.value && activeTab.value === "Log") {
    selectedDate.value = todayIso(timezone.value);
  }
}

watch(timezone, () => {
  selectedDate.value = todayIso(timezone.value);
  updateClock();
});

async function refreshTracker() {
  if (!isSignedIn.value) return;
  await tracker.refresh();
  await tracker.refreshQuickList();
}

onMounted(async () => {
  await refreshTracker();
  selectedDate.value = todayIso(timezone.value);
  updateClock();
  clockTimer = setInterval(updateClock, 30_000);
});

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer);
});

function openSettings() {
  showSettings.value = true;
}

function closeSettings() {
  showSettings.value = false;
  updateClock();
}

function quickAdd(food: Food | null = null) {
  showSettings.value = false;
  activeTab.value = "Log";
  pendingLogFood.value = food;
  quickAddSignal.value += 1;
}

async function signOut() {
  await authClient.signOut();
  tracker.reset();
  showSettings.value = false;
}

watch(isSignedIn, async (signedIn) => {
  if (signedIn) {
    await refreshTracker();
    return;
  }
  tracker.reset();
});
</script>

<template>
  <AuthLoginPanel v-if="!isSessionPending && !isSignedIn" />
  <main v-else class="app-shell">
    <header class="topbar">
      <div class="brand-row">
        <div>
          <h1>Weight Management Food Tracker</h1>
          <p>{{ headerClock }}</p>
        </div>
        <AppAccountMenu
          :user-email="session?.user.email"
          @settings="openSettings"
          @sign-out="signOut"
        />
      </div>
      <nav v-if="!showSettings" class="tabbar" aria-label="Tracker sections">
        <button
          v-for="tab in tabs"
          :key="tab"
          type="button"
          :class="{ active: activeTab === tab }"
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
        <button class="quick-add" type="button" @click="quickAdd()">+ Log</button>
      </nav>
    </header>

    <div class="content">
      <p v-if="tracker.isLoading.value" class="status">Loading…</p>
      <p v-else-if="tracker.errorMessage.value" class="error">{{ tracker.errorMessage.value }}</p>

      <template v-else-if="tracker.data.value">
        <SettingsPanel
          v-if="showSettings"
          :settings="tracker.data.value.settings"
          @close="closeSettings"
        />
        <DashboardPanel
          v-else-if="activeTab === 'Dashboard'"
          :tracker="tracker.data.value"
          :selected-date="selectedDate"
          @update:selected-date="selectedDate = $event"
        />
        <LogPanel
          v-else-if="activeTab === 'Log'"
          :tracker="tracker.data.value"
          :quick-add-signal="quickAddSignal"
          :pending-food="pendingLogFood"
          @consume-pending-food="pendingLogFood = null"
        />
        <FoodsPanel
          v-else-if="activeTab === 'Foods'"
          :tracker="tracker.data.value"
          @log-food="quickAdd"
        />
        <WeightPanel v-else :tracker="tracker.data.value" />
      </template>
    </div>
  </main>
</template>
