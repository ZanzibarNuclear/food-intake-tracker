export default defineNuxtConfig({
  compatibilityDate: "2026-06-26",
  css: ["~/assets/css/main.css"],
  devtools: { enabled: false },
  modules: [],
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    public: {
      appName: "Weight Management Food Tracker",
    },
  },
  typescript: {
    strict: true,
  },
});
