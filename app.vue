<script setup lang="ts">
import { formatClockInTimeZone, todayIso } from "~/utils/dates";
import type { Food, WeightEntry } from "~/types/nutrition";
import { authClient } from "~~/lib/auth-client";

const tabs = ["Dashboard", "Meals", "Weight", "Foods"] as const;
type Tab = (typeof tabs)[number];

const activeTab = ref<Tab>("Dashboard");
const showSettings = ref(false);
const showQuickLog = ref(false);
const showQuickWeight = ref(false);
const selectedDate = ref(todayIso());
const quickAddSignal = ref(0);
const pendingLogFood = ref<Food | null>(null);
const pendingWeight = ref<WeightEntry | null>(null);

const tracker = useTracker();
const { timezone } = useUserTimezone();
const { data: session, isPending: isSessionPending } = await authClient.useSession(useFetch);
const isSignedIn = computed(() => Boolean(session.value?.user));

const hasMounted = ref(false);
const headerClock = ref("");

let clockTimer: ReturnType<typeof setInterval> | null = null;

function updateClock() {
  headerClock.value = formatClockInTimeZone(timezone.value);
  if (!showSettings.value && (activeTab.value === "Dashboard" || activeTab.value === "Meals")) {
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
  hasMounted.value = true;
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

function openQuickLog(food: Food | null = null) {
  showSettings.value = false;
  pendingLogFood.value = food;
  showQuickLog.value = true;
  quickAddSignal.value += 1;
}

function closeQuickLog() {
  showQuickLog.value = false;
  pendingLogFood.value = null;
}

function openQuickWeight(weight: WeightEntry | null = null) {
  showSettings.value = false;
  pendingWeight.value = weight;
  showQuickWeight.value = true;
}

function closeQuickWeight() {
  showQuickWeight.value = false;
  pendingWeight.value = null;
}

async function signOut() {
  await authClient.signOut();
  tracker.reset();
  showSettings.value = false;
  closeQuickLog();
  closeQuickWeight();
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
  <main v-if="!hasMounted" class="app-shell">
    <div class="auth-shell">
      <p class="status">Loading...</p>
    </div>
  </main>

  <AuthLoginPanel v-else-if="!isSessionPending && !isSignedIn" />
  <main v-else class="app-shell">
    <header class="topbar">
      <div class="brand-row">
        <div>
          <h1>Weight Management Food Tracker</h1>
          <p>{{ hasMounted ? headerClock : "Loading..." }}</p>
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
          @quick-log="openQuickLog"
          @quick-weight="openQuickWeight"
        />
        <LogPanel v-else-if="activeTab === 'Meals'" :tracker="tracker.data.value" />
        <FoodsPanel
          v-else-if="activeTab === 'Foods'"
          :tracker="tracker.data.value"
          @log-food="openQuickLog"
        />
        <WeightPanel
          v-else-if="activeTab === 'Weight'"
          :tracker="tracker.data.value"
          @edit-weight="openQuickWeight"
        />
      </template>
    </div>

    <div
      v-if="showQuickLog && tracker.data.value"
      aria-labelledby="quick-log-title"
      aria-modal="true"
      class="modal-backdrop"
      role="dialog"
      @click.self="closeQuickLog"
    >
      <div class="quick-log-modal">
        <div class="modal-header">
          <h2 id="quick-log-title">Log meal</h2>
          <button aria-label="Close" class="modal-close" type="button" @click="closeQuickLog">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
              <path
                fill="currentColor"
                d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.42L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4z"
              />
            </svg>
          </button>
        </div>
        <LogPanel
          mode="modal"
          :tracker="tracker.data.value"
          :quick-add-signal="quickAddSignal"
          :pending-food="pendingLogFood"
          @consume-pending-food="pendingLogFood = null"
          @meal-saved="closeQuickLog"
        />
      </div>
    </div>

    <div
      v-if="showQuickWeight && tracker.data.value"
      aria-labelledby="quick-weight-title"
      aria-modal="true"
      class="modal-backdrop"
      role="dialog"
      @click.self="closeQuickWeight"
    >
      <div class="quick-log-modal">
        <div class="modal-header">
          <h2 id="quick-weight-title">Log weight</h2>
          <button aria-label="Close" class="modal-close" type="button" @click="closeQuickWeight">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
              <path
                fill="currentColor"
                d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.42L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4z"
              />
            </svg>
          </button>
        </div>
        <WeightPanel
          mode="modal"
          :tracker="tracker.data.value"
          :pending-weight="pendingWeight"
          @weight-saved="closeQuickWeight"
        />
      </div>
    </div>
  </main>
</template>

<style scoped>
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

.quick-log-modal {
  display: grid;
  gap: 0;
  width: min(560px, 100%);
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
</style>
