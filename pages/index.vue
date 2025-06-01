<template>
    <div class="flex flex-col w-full max-w-[1700px]">
        <div class="hero w-full py-6 bg-base-200">
            <div class="hero-content flex-col lg:flex-row py-6">
                <div class="max-w-xs md:max-w-md rounded-lg shadow-2xl bg-base-300 p-6">
                    <img src="@/assets/hero1.svg" />
                </div>
                <div class="max-w-md">
                    <h1 class="text-5xl font-bold text-center">{{ conf.public.name }}</h1>
                    <p class="py-6 text-center">
                        Start distributing videos on
                        <span class="text-blue-400"> your own hardware</span>
                        with just a few commands.
                    </p>
                    <div class="flex justify-center mt-6">
                        <nuxt-link class="btn btn-primary" to="https://videocms-docs.vercel.app/guide/get-started.html"
                            target="_blank">
                            Checkout the docs
                        </nuxt-link>
                    </div>
                </div>
            </div>
        </div>
        <div class="flex flex-col w-full max-w-[1700px]">
            <div class="w-full py-6 bg-base-300 p-16">
                <h2 class="text-3xl font-bold text-center mb-8">Key Features</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div class="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
                        <div class="card-body">
                            <h3 class="card-title">🚀 Selfhost</h3>
                            <p>Full control over your video content. Host it on your own infrastructure.</p>
                        </div>
                    </div>
                    <div class="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
                        <div class="card-body">
                            <h3 class="card-title">✨ Pretty Subtitles</h3>
                            <p>Enhanced subtitle rendering for a better viewing experience.</p>
                            <p>Subtitles stored as softsub in the ASS format to keep the style and save storage</p>
                        </div>
                    </div>
                    <div class="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
                        <div class="card-body">
                            <h3 class="card-title">📈 HLS Multi-Quality</h3>
                            <p>Adaptive streaming with multiple quality levels for optimal playback.</p>
                        </div>
                    </div>
                    <div class="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
                        <div class="card-body">
                            <h3 class="card-title">🎧 Multi-Audio</h3>
                            <p>Support for multiple audio tracks for different languages or commentary.</p>
                        </div>
                    </div>
                    <div class="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
                        <div class="card-body">
                            <h3 class="card-title">⚡ Fast Chunked Upload</h3>
                            <p>Efficient and resumable large file uploads.</p>
                        </div>
                    </div>
                    <div class="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
                        <div class="card-body">
                            <h3 class="card-title">🎬 Dynamic MKV Download</h3>
                            <p>Download videos in MKV format without re-encoding the stored hls streams.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="hero w-full py-12 bg-base-300" v-if="exampleFile && exampleFile !== '' && exampleFile !== 'notfound'">
        <div class="flex flex-col items-center w-full">
            <h1 class="text-5xl font-bold text-center mb-6">
                Example Embed
            </h1>
            <div class="flex items-center justify-center w-full max-w-xl aspect-video rounded">
                <iframe v-if="!error && !pending" class="w-full aspect-video"
                    :src="`${conf.public.baseUrl}/v/${exampleFile}`" frameborder="0" allowfullscreen></iframe>
                <div v-if="pending" class="loading loading-spinner loading-lg"></div>
            </div>
            <div v-if="error" class="alert alert-error w-full max-w-xl aspect-video">
                <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none"
                    viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{{ error }}</span>
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
} = useFetch<string>(`${conf.public.apiUrl}/file/example`);

onBeforeRouteLeave(async (to, from) => {
    let select_hosting = document.getElementById("select_hosting");
    if (select_hosting) {
        (select_hosting as HTMLDialogElement).close();
        await new Promise((res) => setTimeout(res, 100));
    }
});
</script>
