// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    devtools: { enabled: true },
    modules: ["@nuxtjs/tailwindcss"],
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
        },
    },
    imports: {
        dirs: ["composables"],
    },
});
