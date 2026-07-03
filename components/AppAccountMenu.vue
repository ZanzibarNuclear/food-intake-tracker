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
    <UButton
      :aria-expanded="open"
      aria-haspopup="menu"
      aria-label="Account menu"
      class="nuxt-ui-button account-button"
      color="primary"
      icon="i-lucide-user"
      square
      type="button"
      variant="soft"
      @click.stop="toggle"
    />
    <div v-if="open" class="dropdown" role="menu">
      <p v-if="userAlias" class="menu-alias">{{ userAlias }}</p>
      <p v-if="userEmail" class="menu-email">{{ userEmail }}</p>
      <button role="menuitem" type="button" @click="openSettings">
        <UIcon aria-hidden="true" name="i-lucide-settings" />
        Settings
      </button>
      <button role="menuitem" type="button" @click="signOut">
        <UIcon aria-hidden="true" name="i-lucide-log-out" />
        Sign out
      </button>
    </div>
  </div>
</template>

<style scoped>
.account-menu {
  position: relative;
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
