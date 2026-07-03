<template>
    <div class="flex grow flex-col">
        <PageHeader title="Dashboard" description="Your library and delivery at a glance.">
            <button v-if="serverConfig.UploadEnabled" onclick="upload_modal.showModal()"
                class="btn btn-primary btn-sm gap-2">
                <Icon name="lucide:upload" class="h-4 w-4" />
                Upload video
            </button>
        </PageHeader>

        <!-- At a glance: one surface, real numbers only -->
        <section
            class="grid grid-cols-1 divide-y divide-base-300 rounded-box border border-base-300 bg-base-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div class="flex flex-col gap-2 p-4">
                <span class="text-xs text-base-content/70">Storage</span>
                <template v-if="accountData">
                    <span class="text-2xl font-semibold">
                        {{ humanFileSize(accountData.Used ?? 0) }}
                        <span class="text-sm font-normal text-base-content/60">
                            of {{ accountData.Storage === 0 ? 'unlimited' : humanFileSize(accountData.Storage) }}
                        </span>
                    </span>
                    <progress
                        v-if="accountData.Storage !== 0"
                        class="progress h-1 w-full"
                        :class="storagePercentage > 90 ? 'progress-warning' : 'progress-primary'"
                        :value="storagePercentage"
                        max="100"></progress>
                </template>
                <div v-else class="skeleton h-8 w-32" aria-hidden="true"></div>
            </div>

            <div class="flex flex-col gap-2 p-4">
                <span class="text-xs text-base-content/70">Videos</span>
                <template v-if="accountData">
                    <span class="text-2xl font-semibold">{{ accountData.Files }}</span>
                    <nuxtLink to="/my/videos" class="link-hover link text-xs text-base-content/60">
                        Open library
                    </nuxtLink>
                </template>
                <div v-else class="skeleton h-8 w-16" aria-hidden="true"></div>
            </div>

            <div class="flex flex-col gap-2 p-4">
                <span class="text-xs text-base-content/70">Encoding queue</span>
                <template v-if="encodingCount !== null">
                    <span class="text-2xl font-semibold">{{ encodingCount }}</span>
                    <nuxtLink to="/my/encodings" class="link-hover link text-xs text-base-content/60">
                        {{ encodingCount === 0 ? 'Queue is idle' : 'View queue' }}
                    </nuxtLink>
                </template>
                <div v-else class="skeleton h-8 w-16" aria-hidden="true"></div>
            </div>
        </section>

        <!-- First run: teach the flow instead of showing five empty charts -->
        <section v-if="isFirstRun" class="mt-8 rounded-box border border-base-300 bg-base-100 p-6 md:p-8">
            <h2 class="text-base font-semibold tracking-tight">Get your first video online</h2>
            <p class="mt-1 max-w-[60ch] text-sm text-base-content/70">
                Traffic charts and rankings appear here once your library has content.
            </p>

            <ol class="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
                <li class="flex gap-3">
                    <span
                        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium tabular-nums text-primary">1</span>
                    <span class="flex flex-col gap-1">
                        <span class="text-sm font-medium">Upload a video</span>
                        <span class="text-sm text-base-content/70">Drop in a file or queue a remote URL — uploads
                            resume if the connection breaks.</span>
                    </span>
                </li>
                <li class="flex gap-3">
                    <span
                        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium tabular-nums text-primary">2</span>
                    <span class="flex flex-col gap-1">
                        <span class="text-sm font-medium">Let it encode</span>
                        <span class="text-sm text-base-content/70">The server converts it into streamable qualities —
                            watch progress under
                            <nuxtLink to="/my/encodings" class="link-hover link">Encodings</nuxtLink>.</span>
                    </span>
                </li>
                <li class="flex gap-3">
                    <span
                        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium tabular-nums text-primary">3</span>
                    <span class="flex flex-col gap-1">
                        <span class="text-sm font-medium">Share it</span>
                        <span class="text-sm text-base-content/70">Export a direct link, embed code, or JSON from the
                            <nuxtLink to="/my/videos" class="link-hover link">library</nuxtLink>.</span>
                    </span>
                </li>
            </ol>

            <div class="mt-7">
                <button v-if="serverConfig.UploadEnabled" onclick="upload_modal.showModal()"
                    class="btn btn-primary btn-sm gap-2">
                    <Icon name="lucide:upload" class="h-4 w-4" />
                    Upload your first video
                </button>
                <p v-else class="text-sm text-base-content/70">Uploads are currently disabled on this server.</p>
            </div>
        </section>

        <!-- Activity: one time range scopes every history chart below -->
        <section v-if="showActivity" class="mt-8 flex flex-col gap-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <h2 class="text-base font-semibold tracking-tight">Activity</h2>
                <TimeRangeSelect v-model="rangeHours" />
            </div>

            <LazyClientOnly>
                <TrafficChart mode="personal" type="download" :hours="rangeHours" :height="280" />
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <TrafficChart mode="personal" type="upload" :hours="rangeHours" />
                    <TrafficChart mode="personal" type="encoding" :hours="rangeHours" />
                </div>
            </LazyClientOnly>
        </section>

        <!-- Top content -->
        <section v-if="showActivity" class="mt-8 flex flex-col gap-4">
            <h2 class="text-base font-semibold tracking-tight">Top content</h2>
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <LazyClientOnly>
                    <TopTraffic mode="files" type="traffic" :is-admin-view="false" :hours="rangeHours" />
                    <TopTraffic mode="files" type="storage" :is-admin-view="false" />
                </LazyClientOnly>
            </div>
        </section>

        <!-- Remote downloads -->
        <section v-if="showActivity && serverConfig.RemoteDownloadEnabled" class="mt-8 flex flex-col gap-4">
            <h2 class="text-base font-semibold tracking-tight">Remote downloads</h2>
            <LazyClientOnly>
                <TrafficChart mode="personal" type="remote-download" :hours="rangeHours" />
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <TrafficChart mode="personal" type="remote-download-duration" :hours="rangeHours" />
                    <TopStats
                        endpoint="/account/remote-download/top?mode=domains"
                        title="Top domains by traffic"
                        formatter="bytes" />
                </div>
            </LazyClientOnly>
        </section>
    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: "panel",
    middleware: "auth",
});

const conf = useRuntimeConfig();
const token = useToken();
const serverConfig = useServerConfig();
const { data: accountData, fetch: fetchAccountData } = useAccountData();

const rangeHours = ref(24);
const encodingCount = ref<number | null>(null);

async function loadEncodingCount() {
    try {
        const data = await $fetch<Array<unknown> | null>(`${conf.public.apiUrl}/encodings`, {
            headers: { Authorization: `Bearer ${token.value}` },
        });
        encodingCount.value = data ? data.length : 0;
    } catch {
        encodingCount.value = 0;
    }
}

onMounted(() => {
    fetchAccountData();
    loadEncodingCount();
});

const isFirstRun = computed(() =>
    !!accountData.value && accountData.value.Files === 0);

// Hold the charts back until we know the library isn't empty,
// so first-run users never see a flash of empty chart cards.
const showActivity = computed(() =>
    !!accountData.value && accountData.value.Files > 0);

const storagePercentage = computed(() => {
    if (!accountData.value || !accountData.value.Storage || accountData.value.Storage === 0) {
        return 0;
    }
    return Math.min(100, (accountData.value.Used / accountData.value.Storage) * 100);
});
</script>
