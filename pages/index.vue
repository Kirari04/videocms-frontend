<template>
    <div class="flex flex-col w-full min-h-screen">
        
        <!-- HERO SECTION -->
        <div class="hero min-h-[80vh] bg-base-100">
            <div class="hero-content flex-col lg:flex-row-reverse gap-12 max-w-7xl mx-auto px-6">
                <div class="flex-1 flex justify-center lg:justify-end">
                    <!-- Placeholder graphic - replaced svg with a styled div/img wrapper -->
                    <div class="relative w-full max-w-md aspect-square bg-gradient-to-tr from-primary to-accent rounded-box shadow-2xl flex items-center justify-center p-1 skew-y-3 hover:skew-y-0 transition-transform duration-500">
                         <div class="bg-base-100 w-full h-full rounded-box flex items-center justify-center overflow-hidden relative">
                             <img src="@/assets/hero1.svg" class="w-4/5 h-4/5 object-contain z-10" alt="Dashboard Preview" />
                             <!-- Decorative background circle -->
                             <div class="absolute -top-10 -right-10 w-40 h-40 bg-secondary/20 rounded-full blur-3xl"></div>
                         </div>
                    </div>
                </div>
                <div class="flex-1 text-center lg:text-left">
                    <h1 class="text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight">
                        Self-Hosted <br />
                        <span class="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">Video Management</span>
                    </h1>
                    <p class="py-8 text-xl text-base-content/70 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                         Take back control of your content. Stream with high-performance HLS, manage subtitles, and host on your own hardware with ease.
                    </p>
                    <div class="flex flex-wrap justify-center lg:justify-start gap-4">
                        <nuxt-link to="/login" class="btn btn-primary btn-lg shadow-lg shadow-primary/30">
                            Get Started
                        </nuxt-link>
                        <a href="https://videocms-docs.vercel.app/guide/get-started.html" target="_blank" class="btn btn-outline btn-lg">
                            Documentation
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <!-- FEATURES GRID -->
        <div class="py-24 bg-base-200">
            <div class="max-w-7xl mx-auto px-6">
                <div class="text-center mb-16">
                     <div class="badge badge-secondary mb-4">Features</div>
                    <h2 class="text-4xl font-bold">Everything you need</h2>
                    <p class="mt-4 text-lg opacity-70">Built for performance, privacy, and ease of use.</p>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <!-- Feature Card 1 -->
                    <div class="card bg-base-100 shadow-xl border border-base-content/5 hover:-translate-y-2 transition-transform duration-300">
                        <div class="card-body">
                            <div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                                <IconUpload class="w-6 h-6" />
                            </div>
                            <h3 class="card-title text-xl">Chunked Uploads</h3>
                            <p class="opacity-70">Resumable, fast, and reliable uploads for massive video files.</p>
                        </div>
                    </div>

                    <!-- Feature Card 2 -->
                    <div class="card bg-base-100 shadow-xl border border-base-content/5 hover:-translate-y-2 transition-transform duration-300">
                        <div class="card-body">
                             <div class="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary mb-4">
                                <IconVideo class="w-6 h-6" />
                            </div>
                            <h3 class="card-title text-xl">HLS Streaming</h3>
                            <p class="opacity-70">Adaptive bitrate streaming ensures smooth playback on any network.</p>
                        </div>
                    </div>

                    <!-- Feature Card 3 -->
                    <div class="card bg-base-100 shadow-xl border border-base-content/5 hover:-translate-y-2 transition-transform duration-300">
                         <div class="card-body">
                             <div class="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4">
                                <IconFolder class="w-6 h-6" />
                            </div>
                            <h3 class="card-title text-xl">Organized Media</h3>
                            <p class="opacity-70">Manage your library with folders, searching, and advanced filtering.</p>
                        </div>
                    </div>

                    <!-- Feature Card 4 -->
                    <div class="card bg-base-100 shadow-xl border border-base-content/5 hover:-translate-y-2 transition-transform duration-300">
                         <div class="card-body">
                             <div class="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center text-success mb-4">
                                <IconInfo class="w-6 h-6" />
                            </div>
                            <h3 class="card-title text-xl">Pretty Subtitles</h3>
                            <p class="opacity-70">ASS format soft-subs for stylized and professional captioning.</p>
                        </div>
                    </div>
                    
                     <!-- Feature Card 5 -->
                    <div class="card bg-base-100 shadow-xl border border-base-content/5 hover:-translate-y-2 transition-transform duration-300">
                         <div class="card-body">
                             <div class="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center text-warning mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                            </div>
                            <h3 class="card-title text-xl">Multi-Audio</h3>
                            <p class="opacity-70">Support for multiple audio tracks for multilingual content.</p>
                        </div>
                    </div>
                    
                    <!-- Feature Card 6 -->
                    <div class="card bg-base-100 shadow-xl border border-base-content/5 hover:-translate-y-2 transition-transform duration-300">
                         <div class="card-body">
                             <div class="w-12 h-12 rounded-lg bg-info/10 flex items-center justify-center text-info mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                            </div>
                            <h3 class="card-title text-xl">Self-Hosted</h3>
                            <p class="opacity-70">Keep your data on your own servers. No hidden fees or external dependencies.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- EXAMPLE EMBED -->
        <div class="py-24 bg-base-100">
            <div class="max-w-5xl mx-auto px-6 text-center">
                 <div class="badge badge-accent mb-4">Live Demo</div>
                <h2 class="text-4xl font-bold mb-12">See it in action</h2>
                
                <div class="mockup-browser border border-base-300 bg-base-200 shadow-2xl">
                    <div class="mockup-browser-toolbar">
                        <div class="input border border-base-300">{{ conf.public.baseUrl }}</div>
                    </div>
                    <div class="bg-base-200 flex justify-center p-4 lg:p-12">
                         <div class="w-full aspect-video rounded-lg overflow-hidden shadow-lg bg-black relative flex items-center justify-center">
                             
                            <iframe v-if="!error && !pending" class="w-full h-full"
                                :src="`${conf.public.baseUrl}/v/${exampleFile}`" frameborder="0" allowfullscreen></iframe>
                            
                            <div v-if="pending" class="loading loading-spinner loading-lg text-primary"></div>
                            
                            <div v-if="error" class="alert alert-error max-w-md shadow-lg">
                                <IconError class="stroke-current shrink-0 h-6 w-6" />
                                <div class="text-left">
                                    <h3 class="font-bold">Error loading demo</h3>
                                    <div class="text-xs">{{ error.data ? error.data : error.message }}</div>
                                </div>
                                <button @click="refresh()" class="btn btn-sm btn-circle btn-ghost">↻</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: "default",
});

const conf = useRuntimeConfig();
const serverConf = useServerConfig();

const {
    data: exampleFile,
    pending,
    error,
    refresh,
} = useFetch<string>(`${conf.public.apiUrl}/file/example`);

onBeforeRouteLeave(async (to, from) => {
    // Cleanup logic if needed
});
</script>