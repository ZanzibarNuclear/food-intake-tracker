<script setup lang="ts">
import { authClient } from "~~/lib/auth-client";

const email = ref("");
const isSending = ref(false);
const message = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

async function sendLink() {
  isSending.value = true;
  message.value = null;
  errorMessage.value = null;
  const result = await authClient.signIn.magicLink({
    email: email.value.trim(),
    callbackURL: "/",
    errorCallbackURL: "/",
  });
  isSending.value = false;

  if (result.error) {
    errorMessage.value = result.error.message ?? "Could not send sign-in link.";
    return;
  }
  message.value = "Check your email for a sign-in link. In local dev without Resend, check the server console.";
}
</script>

<template>
  <section class="auth-shell">
    <form class="form-panel auth-panel" @submit.prevent="sendLink">
      <span class="auth-mark" aria-hidden="true">
        <UIcon name="i-lucide-sprout" />
      </span>
      <h1>Daily Nutrition Tracker</h1>
      <p class="status">Sign in with your email. No password needed.</p>
      <label>
        Email
        <UInput
          v-model="email"
          autocomplete="email"
          class="auth-input"
          icon="i-lucide-mail"
          inputmode="email"
          required
          type="email"
        />
      </label>
      <UButton
        :disabled="isSending"
        :icon="isSending ? 'i-lucide-loader-circle' : 'i-lucide-send'"
        :loading="isSending"
        block
        class="nuxt-ui-button"
        type="submit"
      >
        {{ isSending ? "Sending..." : "Send magic link" }}
      </UButton>
      <p v-if="message" class="status">{{ message }}</p>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </form>
  </section>
</template>

<style scoped>
.auth-shell {
  display: grid;
  min-height: 100svh;
  place-items: center;
  padding: 1rem;
}

.auth-panel {
  width: min(420px, 100%);
}

.auth-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: 1px solid #bdd9ce;
  border-radius: 8px;
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.auth-mark :deep(svg) {
  width: 25px;
  height: 25px;
}

.auth-panel h1 {
  margin: 0;
  font-size: 1.6rem;
}

.auth-input {
  width: 100%;
}
</style>
