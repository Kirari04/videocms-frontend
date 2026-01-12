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
                           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-github"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
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
