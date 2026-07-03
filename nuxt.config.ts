import fs from "node:fs";
import dotenv from "dotenv";

for (const envFile of [".env.local", ".env"]) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, quiet: true, override: false });
  }
}

export default defineNuxtConfig({
  compatibilityDate: "2026-06-26",
  css: ["~/assets/css/main.css"],
  devtools: { enabled: false },
  modules: ["@nuxt/ui"],
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    betterAuthSecret: process.env.BETTER_AUTH_SECRET,
    betterAuthUrl: process.env.BETTER_AUTH_URL,
    betterAuthTrustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS,
    resendApiKey: process.env.RESEND_API_KEY,
    authEmailFrom: process.env.AUTH_EMAIL_FROM,
    public: {
      appName: "Daily Nutrition Tracker",
    },
  },
  ui: {
    colorMode: false,
    theme: {
      colors: ["primary", "secondary", "success", "info", "warning", "error"],
      defaultVariants: {
        color: "primary",
        size: "md",
      },
    },
  },
  typescript: {
    strict: true,
  },
});
