// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    devtools: { enabled: true },
    modules: ["@nuxtjs/tailwindcss"],
    app: {
        pageTransition: { name: "page", mode: "out-in" },
        head: {
            script: [],
        },
    },
    runtimeConfig: {
        public: {
            apiUrl: process.env.NUXT_PUBLIC_API_URL
                ? process.env.NUXT_PUBLIC_API_URL
                : "",
            baseUrl: process.env.NUXT_PUBLIC_BASE_URL
                ? process.env.NUXT_PUBLIC_BASE_URL
                : "",
            dockerHubTag: process.env.NUXT_PUBLIC_DOCKER_HUB_TAG
                ? process.env.NUXT_PUBLIC_DOCKER_HUB_TAG
                : "",
            apiDocs: process.env.NUXT_PUBLIC_API_DOCS
                ? process.env.NUXT_PUBLIC_API_DOCS
                : "",
            tutorial: process.env.NUXT_PUBLIC_TUTORIAL
                ? process.env.NUXT_PUBLIC_TUTORIAL
                : "",
        },
    },
    imports: {
        dirs: ["composables"],
    },
});
