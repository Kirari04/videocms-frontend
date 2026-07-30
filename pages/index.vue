<template>
    <div class="flex min-h-screen w-full flex-col">

        <!-- HERO -->
        <section class="border-b border-base-300 bg-base-100">
            <div class="mx-auto w-full max-w-5xl px-6 pt-16 pb-16 text-center sm:pt-24">
                <h1 class="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                    Your videos, on <span class="text-primary">your</span> hardware.
                </h1>
                <p class="mx-auto mt-5 max-w-2xl text-lg text-base-content/70">
                    Self-hosted video management with adaptive HLS streaming, multiple audio tracks,
                    styled subtitles, and resumable uploads.
                </p>
                <div class="mt-8 flex flex-wrap justify-center gap-3">
                    <nuxt-link to="/login" class="btn btn-primary">
                        Get started
                    </nuxt-link>
                    <a href="https://videocms-docs.vercel.app/guide/getting-started.html" target="_blank"
                        class="btn btn-ghost border-base-300">
                        Documentation
                    </a>
                </div>

                <!-- Live demo: the product is the hero visual -->
                <div v-if="pending || (hasDemo && !error)" class="mx-auto mt-14 w-full max-w-4xl">
                    <div
                        class="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-box border border-base-300 bg-black">
                        <div v-if="pending" class="skeleton h-full w-full rounded-none"></div>
                        <iframe v-else class="h-full w-full" :src="`${conf.public.baseUrl}/v/${exampleFile}`"
                            frameborder="0" title="Live demo of the video player" allowfullscreen></iframe>
                    </div>
                    <p class="mt-3 text-sm text-base-content/60">
                        A real video served by this instance — not a mockup.
                    </p>
                </div>
            </div>
        </section>

        <!-- FEATURES -->
        <section class="mx-auto w-full max-w-5xl px-6 py-20">
            <h2 class="text-2xl font-semibold tracking-tight">Built for self-hosters</h2>
            <p class="mt-2 max-w-[65ch] text-base-content/70">
                Everything runs on your server: no external dependencies, no hidden fees.
            </p>

            <dl class="mt-10 grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
                <div v-for="feature in features" :key="feature.title" class="flex gap-3.5">
                    <Icon :name="feature.icon" class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                        <dt class="font-medium">{{ feature.title }}</dt>
                        <dd class="mt-1 max-w-[55ch] text-sm text-base-content/70">{{ feature.text }}</dd>
                    </div>
                </div>
            </dl>
        </section>

        <!-- CLOSING -->
        <section class="border-t border-base-300 bg-base-100">
            <div class="mx-auto flex w-full max-w-5xl flex-col items-start gap-6 px-6 py-14 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 class="text-xl font-semibold tracking-tight">Run it on your own server</h2>
                    <p class="mt-1 max-w-[55ch] text-sm text-base-content/70">
                        One Docker image ships the backend, frontend, and encoder.
                    </p>
                </div>
                <div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <code
                        class="rounded-field border border-base-300 bg-base-200 px-4 py-2.5 font-mono text-sm">docker pull kirari04/videocms</code>
                    <a href="https://github.com/Kirari04/videocms" target="_blank" class="btn btn-ghost btn-sm gap-2 border-base-300">
                        <Icon name="lucide:github" class="h-4 w-4" />
                        GitHub
                    </a>
                </div>
            </div>
        </section>

    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: "default",
});

const conf = useRuntimeConfig();

const features = [
    {
        icon: "lucide:upload",
        title: "Resumable chunked uploads",
        text: "Large files upload in chunks that survive flaky connections and restrictive proxies.",
    },
    {
        icon: "lucide:play",
        title: "Adaptive HLS streaming",
        text: "Every video is encoded into multiple qualities for smooth playback on any connection.",
    },
    {
        icon: "lucide:captions",
        title: "Styled subtitles",
        text: "Softsubs in ASS format keep their styling without being burned into the video.",
    },
    {
        icon: "lucide:audio-lines",
        title: "Multiple audio tracks",
        text: "Ship multilingual content without duplicating video files or re-encoding.",
    },
    {
        icon: "lucide:folder",
        title: "Organized library",
        text: "Folders, search, tagging, and bulk actions keep large collections manageable.",
    },
    {
        icon: "lucide:download",
        title: "Dynamic MKV export",
        text: "Downloads assemble video, audio, and subtitles on the fly — no re-encoding.",
    },
];

const {
    data: exampleFile,
    pending,
    error,
} = useFetch<string>(`${conf.public.apiUrl}/file/example`);

// The backend answers with the literal "notfound" when no example video is configured.
const hasDemo = computed(() =>
    !!exampleFile.value && exampleFile.value !== "notfound");
</script>
