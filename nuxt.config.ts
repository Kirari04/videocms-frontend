import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  ssr: false,

  app: {
      pageTransition: { name: "page", mode: "out-in" },
      head: {
          script: [],
      },
  },

  runtimeConfig: {
      public: {
          name: "",
          apiUrl: "",
          baseUrl: "",
          dockerHubTag: "",
          apiDocs: "",
          tutorial: "",
          demo: "",
      },
  },

  imports: {
      dirs: ["composables"],
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  css: ['~/assets/css/main.css'],

  compatibilityDate: "2024-11-26",
});