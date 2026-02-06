<template>
    <div class="flex flex-col grow gap-8">
        <!-- Welcome Hero -->
        <div class="card bg-gradient-to-br from-primary to-accent text-primary-content shadow-xl overflow-hidden relative">
            <!-- Decorative circles -->
            <div class="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 rounded-full bg-white/10 blur-2xl"></div>
            <div class="absolute bottom-0 left-0 -ml-10 -mb-10 w-32 h-32 rounded-full bg-black/10 blur-2xl"></div>

            <div class="card-body relative z-10 py-10">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div class="flex flex-col gap-2">
                        <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight">
                            Welcome back, <span class="text-secondary-content/90">{{ accountData?.Username }}</span>!
                        </h1>
                        <p class="text-lg opacity-80 max-w-xl">
                            Everything looks good today. You have uploaded <span class="font-bold underline">{{ accountData?.Files }} videos</span> so far.
                        </p>
                    </div>
                    <div class="flex gap-3">
                        <button onclick="upload_modal.showModal()" class="btn btn-secondary shadow-lg">
                            <Icon name="lucide:upload" class="w-5 h-5" />
                            Upload Video
                        </button>
                        <nuxtLink to="/my/videos" class="btn btn-ghost bg-white/10 hover:bg-white/20">
                            View Library
                        </nuxtLink>
                    </div>
                </div>
            </div>
        </div>

        <!-- Dashboard Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Storage Overview Card -->
            <div class="card bg-base-100 shadow-xl border border-base-200 lg:col-span-2">
                <div class="card-body">
                    <h2 class="card-title flex items-center gap-2 mb-4">
                        <Icon name="lucide:hard-drive" class="text-primary w-5 h-5" />
                        Storage Overview
                    </h2>
                    
                    <div class="flex flex-col gap-6">
                        <div class="flex flex-col gap-2">
                            <div class="flex justify-between items-end">
                                <span class="text-sm font-medium opacity-70">Capacity Used</span>
                                <span class="font-bold">
                                    {{ accountData?.Used ? humanFileSize(accountData.Used) : '0 B' }}
                                    <span class="text-xs opacity-50 font-normal">of</span>
                                    {{ accountData?.Storage === 0 ? 'Unlimited' : (accountData?.Storage ? humanFileSize(accountData.Storage) : '...') }}
                                </span>
                            </div>
                            <progress 
                                class="progress progress-primary h-3" 
                                :value="storagePercentage" 
                                max="100"
                            ></progress>
                        </div>

                        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div class="bg-base-200/50 p-4 rounded-xl border border-base-200">
                                <div class="text-xs opacity-50 uppercase font-bold tracking-wider mb-1">Total Files</div>
                                <div class="text-2xl font-bold">{{ accountData?.Files }}</div>
                            </div>
                            <div class="bg-base-200/50 p-4 rounded-xl border border-base-200">
                                <div class="text-xs opacity-50 uppercase font-bold tracking-wider mb-1">Used Space</div>
                                <div class="text-2xl font-bold">{{ accountData?.Used ? humanFileSize(accountData.Used) : '0 B' }}</div>
                            </div>
                            <div class="bg-base-200/50 p-4 rounded-xl border border-base-200 col-span-2 md:col-span-1">
                                <div class="text-xs opacity-50 uppercase font-bold tracking-wider mb-1">Status</div>
                                <div class="flex items-center gap-2">
                                    <div class="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                                    <div class="text-xl font-bold">Healthy</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stats/Activity Quick View -->
            <div class="card bg-base-100 shadow-xl border border-base-200">
                <div class="card-body">
                    <h2 class="card-title flex items-center gap-2 mb-4">
                        <Icon name="lucide:activity" class="text-secondary w-5 h-5" />
                        Quick Stats
                    </h2>
                    
                    <div class="flex flex-col gap-4">
                        <div class="flex items-center justify-between p-3 rounded-lg bg-base-200/30">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                                    <Icon name="lucide:video" class="w-5 h-5" />
                                </div>
                                <span class="text-sm font-medium">Total Videos</span>
                            </div>
                            <span class="font-bold">{{ accountData?.Files }}</span>
                        </div>
                        
                        <div class="flex items-center justify-between p-3 rounded-lg bg-base-200/30">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded bg-secondary/10 flex items-center justify-center text-secondary">
                                    <Icon name="lucide:calendar" class="w-5 h-5" />
                                </div>
                                <span class="text-sm font-medium">Joined On</span>
                            </div>
                            <span class="text-xs font-bold opacity-70">{{ accountData?.CreatedAt ? new Date(accountData.CreatedAt).toLocaleDateString() : '...' }}</span>
                        </div>

                        <nuxtLink to="/my/videos" class="btn btn-outline btn-block mt-4 border-base-300">
                            Manage All Media
                        </nuxtLink>
                    </div>
                </div>
            </div>
        </div>

        <!-- Dashboard Tabs -->
        <div class="tabs tabs-boxed bg-base-100 self-start p-1 border border-base-200 shadow-sm rounded-xl">
            <button 
                class="tab transition-all"
                :class="{'tab-active !bg-primary !text-primary-content font-bold': activeDashboardTab === 'general'}"
                @click="activeDashboardTab = 'general'"
            >
                <Icon name="lucide:activity" class="w-4 h-4 mr-2" />
                General Stats
            </button>
            <button 
                class="tab transition-all"
                :class="{'tab-active !bg-primary !text-primary-content font-bold': activeDashboardTab === 'remote'}"
                @click="activeDashboardTab = 'remote'"
            >
                <Icon name="lucide:cloud-download" class="w-4 h-4 mr-2" />
                Remote Downloads
            </button>
        </div>

        <!-- Tab Content -->
        <div class="flex flex-col gap-8">
            <!-- General Stats Tab -->
            <div v-if="activeDashboardTab === 'general'" class="flex flex-col gap-6">
                <!-- Traffic & Activity Stats (Personal) -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <LazyClientOnly>
                        <TrafficChart mode="personal" type="download" />
                        <TrafficChart mode="personal" type="upload" />
                        <TrafficChart mode="personal" type="encoding" />
                    </LazyClientOnly>
                </div>

                <!-- Rankings (Personal) -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <LazyClientOnly>
                        <TopTraffic mode="files" type="traffic" :is-admin-view="false" />
                        <TopTraffic mode="files" type="storage" :is-admin-view="false" />
                        <TopTraffic mode="files" type="upload" :is-admin-view="false" />
                        <TopTraffic mode="files" type="encoding" :is-admin-view="false" />
                    </LazyClientOnly>
                </div>
            </div>

            <!-- Remote Stats Tab -->
            <div v-if="activeDashboardTab === 'remote'" class="flex flex-col gap-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <LazyClientOnly>
                        <TrafficChart mode="personal" type="remote-download" class="lg:col-span-2" />
                        <TrafficChart mode="personal" type="remote-download-duration" />
                        <TopStats 
                            endpoint="/account/remote-download/top?mode=domains" 
                            title="Top Domains" 
                            label="Traffic" 
                            icon="lucide:globe"
                            formatter="bytes"
                        />
                    </LazyClientOnly>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: "panel",
    middleware: "auth",
});

const { data: accountData, fetch: fetchAccountData } = useAccountData()
const { data: serverVersion, fetch: fetchServerVersion } = useServerVersion()
const serverConfig = useServerConfig()

const activeDashboardTab = ref<'general' | 'remote'>('general');

onMounted(() => {
    fetchAccountData()
    if (accountData.value?.Admin) {
        fetchServerVersion()
    }
})

// Watch for account data changes to trigger version check if admin status is detected later
watch(() => accountData.value?.Admin, (isAdmin) => {
    if (isAdmin) {
        fetchServerVersion()
    }
})

const storagePercentage = computed(() => {
    if (!accountData.value || !accountData.value.Storage || accountData.value.Storage === 0) {
        return 0;
    }
    return Math.min(100, (accountData.value.Used / accountData.value.Storage) * 100);
});
</script>