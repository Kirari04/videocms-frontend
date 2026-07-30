import tailwindcss from "@tailwindcss/vite";

const devBackendUrl = (process.env.NUXT_DEV_BACKEND_URL || "http://127.0.0.1:3001").replace(/\/+$/, "");
const configuredDevMediaPath = (process.env.NUXT_DEV_MEDIA_PATH || "videos/qualitys").replace(/^\/+|\/+$/g, "");
const devMediaPath = configuredDevMediaPath ? `/${configuredDevMediaPath}` : "/videos/qualitys";
const devProxyOptions = (route: string) => ({
  // Nitro removes the matched mount path, so include it in the upstream target.
  target: `${devBackendUrl}${route}`,
  changeOrigin: true,
  xfwd: true,
  // Echo's gzip response otherwise conflicts with Nitro's development proxy body handling.
  headers: {
    "accept-encoding": "identity",
  },
});

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
          apiUrl: "/api",
          baseUrl: "",
          dockerHubTag: "",
          demo: "",
      },
  },

  imports: {
      dirs: ["composables"],
  },
  modules: ["@nuxt/icon"],
  nitro: {
    devProxy: {
      "/api": devProxyOptions("/api"),
      "/captcha": devProxyOptions("/captcha"),
      "/v": devProxyOptions("/v"),
      "/icons": devProxyOptions("/icons"),
      [devMediaPath]: devProxyOptions(devMediaPath),
    },
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  css: ['~/assets/css/main.css'],

  compatibilityDate: "2024-11-26",
});
