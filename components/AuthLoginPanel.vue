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
      <h1>Daily Nutrition Tracker</h1>
      <p class="status">Sign in with your email. No password needed.</p>
      <label>
        Email
        <input v-model="email" autocomplete="email" inputmode="email" required type="email" />
      </label>
      <button :disabled="isSending" type="submit">
        {{ isSending ? "Sending..." : "Send magic link" }}
      </button>
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

.auth-panel h1 {
  margin: 0;
  font-size: 1.6rem;
}
</style>
