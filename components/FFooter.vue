<template>
    <footer class="border-t border-base-300 bg-base-100 text-base-content">
        <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div class="grid grid-cols-1 gap-10 md:grid-cols-4">
                <!-- Brand Section -->
                <div class="md:col-span-2">
                    <span class="flex items-center gap-2.5 text-base font-semibold tracking-tight">
                        <img src="/logo.png" alt="" class="h-7 w-7 object-contain" />
                        {{ serverConfig.AppName || 'VideoCMS' }}
                    </span>
                    <p class="mt-3 max-w-[45ch] text-sm text-base-content/70">
                        Self-hosted video management. Retain control, ensure privacy, and stream with performance.
                    </p>
                    <div class="mt-4">
                        <a href="https://github.com/Kirari04/videocms" target="_blank"
                            class="btn btn-square btn-ghost btn-sm" aria-label="GitHub repository">
                            <Icon name="lucide:github" class="h-4 w-4" />
                        </a>
                    </div>
                </div>

                <!-- Product Links -->
                <div>
                    <h3 class="mb-3 text-sm font-semibold">Product</h3>
                    <ul class="flex flex-col gap-2 text-sm">
                        <li><nuxtLink to="/" class="link-hover link text-base-content/70">Home</nuxtLink></li>
                        <li><a href="https://videocms-docs.vercel.app/" target="_blank"
                                class="link-hover link text-base-content/70">Documentation</a></li>
                    </ul>
                </div>

                <!-- Legal/Pages -->
                <div v-if="webPages && webPages.length > 0">
                    <h3 class="mb-3 text-sm font-semibold">Pages</h3>
                    <ul class="flex flex-col gap-2 text-sm">
                        <li v-for="webPage in webPages" :key="webPage.Path">
                            <nuxt-link :to="`/p${webPage.Path}`" class="link-hover link text-base-content/70">
                                {{ webPage.Title }}
                            </nuxt-link>
                        </li>
                    </ul>
                </div>
            </div>

            <div class="mt-10 flex flex-col items-start justify-between gap-2 border-t border-base-300 pt-6 text-sm text-base-content/60 md:flex-row md:items-center">
                <p>&copy; {{ new Date().getFullYear() }} {{ serverConfig.AppName || 'VideoCMS' }}</p>
                <p>Free and open source, AGPL-3.0</p>
            </div>
        </div>
    </footer>
</template>

<script lang="ts" setup>
const { data: webPages } = useWebPage()
const serverConfig = useServerConfig();
</script>
