<script setup lang="ts">
const emit = defineEmits<{
  settings: [];
  signOut: [];
}>();

defineProps<{
  userAlias?: string | null;
  userEmail?: string | null;
}>();

const open = ref(false);
const menuRef = ref<HTMLElement | null>(null);

function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
}

function openSettings() {
  close();
  emit("settings");
}

function signOut() {
  close();
  emit("signOut");
}

function onDocumentClick(event: MouseEvent) {
  if (!open.value || !menuRef.value) return;
  if (!menuRef.value.contains(event.target as Node)) close();
}

onMounted(() => document.addEventListener("click", onDocumentClick));
onBeforeUnmount(() => document.removeEventListener("click", onDocumentClick));
</script>

<template>
  <div ref="menuRef" class="account-menu">
    <button
      :aria-expanded="open"
      aria-haspopup="menu"
      aria-label="Account menu"
      class="account-button"
      type="button"
      @click.stop="toggle"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22">
        <path
          fill="currentColor"
          d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.87 0-7 2.13-7 4.75V20h14v-1.25C19 16.13 15.87 14 12 14z"
        />
      </svg>
    </button>
    <div v-if="open" class="dropdown" role="menu">
      <p v-if="userAlias" class="menu-alias">{{ userAlias }}</p>
      <p v-if="userEmail" class="menu-email">{{ userEmail }}</p>
      <button role="menuitem" type="button" @click="openSettings">Settings</button>
      <button role="menuitem" type="button" @click="signOut">Sign out</button>
    </div>
  </div>
</template>

<style scoped>
.account-menu {
  position: relative;
}

.account-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  min-height: 44px;
  padding: 0;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.dropdown {
  position: absolute;
  top: calc(100% + 0.35rem);
  right: 0;
  z-index: 10;
  min-width: 180px;
  padding: 0.35rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
  box-shadow: 0 10px 30px rgba(32, 36, 31, 0.12);
}

.dropdown button {
  width: 100%;
  min-height: 40px;
  padding: 0.55rem 0.75rem;
  background: transparent;
  color: var(--ink);
  font-weight: 600;
  text-align: left;
}

.dropdown button:hover {
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.menu-alias,
.menu-email {
  margin: 0;
  padding: 0.55rem 0.75rem 0;
  overflow-wrap: anywhere;
}

.menu-alias {
  color: var(--ink);
  font-size: 0.9rem;
  font-weight: 800;
}

.menu-email {
  padding-top: 0.15rem;
  padding-bottom: 0.55rem;
  color: var(--muted);
  font-size: 0.78rem;
}
</style>
