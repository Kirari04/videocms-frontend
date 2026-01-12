<template>
    <footer class="bg-base-300 text-base-content border-t border-base-content/10">
        <div class="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                <!-- Brand Section -->
                <div class="col-span-1 md:col-span-1">
                    <span class="text-xl font-bold text-primary flex items-center gap-2">
                        <img src="/assets/logo.png" alt="Logo" class="w-8 h-8 object-contain" v-if="false" /> 
                        <!-- Placeholder for logo if available, utilizing text for now -->
                        {{ serverConfig.AppName || 'VideoCMS' }}
                    </span>
                    <p class="mt-4 text-sm opacity-80 leading-relaxed">
                        Self-hosted video management made easy. Retain control, ensure privacy, and stream with performance.
                    </p>
                </div>

                <!-- Product Links -->
                <div>
                    <h3 class="font-bold text-lg mb-4">Product</h3>
                    <ul class="space-y-2 text-sm">
                        <li><nuxtLink to="/" class="link link-hover">Home</nuxtLink></li>
                        <li><a href="https://videocms-docs.vercel.app/" target="_blank" class="link link-hover">Documentation</a></li>
                    </ul>
                </div>

                <!-- Legal/Pages -->
                <div>
                    <h3 class="font-bold text-lg mb-4">Legal & Pages</h3>
                    <ul class="space-y-2 text-sm">
                         <li v-for="webPage in webPages" :key="webPage.Path">
                            <nuxt-link :to="`/p${webPage.Path}`" class="link link-hover">
                                {{ webPage.Title }}
                            </nuxt-link>
                        </li>
                    </ul>
                </div>

                <!-- Socials/Connect -->
                <div>
                    <h3 class="font-bold text-lg mb-4">Connect</h3>
                     <div class="flex gap-4">
                        <a href="https://github.com/Kirari04/videocms" target="_blank" class="btn btn-ghost btn-circle btn-sm" aria-label="GitHub">
                           <Icon name="lucide:github" size="20" />
                        </a>
                    </div>
                </div>
            </div>

            <div class="divider"></div> 
            
            <div class="flex flex-col md:flex-row justify-between items-center text-sm opacity-60">
                <p>&copy; {{ new Date().getFullYear() }} {{ serverConfig.AppName || 'VideoCMS' }}. All rights reserved.</p>
                <div class="flex gap-4 mt-4 md:mt-0">
                    <span>Powered by Open Source</span>
                </div>
            </div>
        </div>
    </footer>
</template>

<script lang="ts" setup>
const { data: webPages } = useWebPage()
const serverConfig = useServerConfig();
</script>
