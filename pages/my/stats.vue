<template>
    <div class="flex flex-col h-full">
        <!-- Access Denied -->
        <div v-if="!accountData?.Admin" class="alert alert-error m-4">
            You don't have access to this page
        </div>

        <div v-if="accountData?.Admin" class="flex flex-col gap-8 p-4 md:p-8 max-w-7xl mx-auto w-full">
            <!-- Header -->
            <div class="flex flex-col gap-1">
                <h1 class="text-3xl font-extrabold tracking-tight">System Statistics</h1>
                <p class="text-base-content/70">Real-time performance metrics and version information.</p>
            </div>

            <!-- Version Check -->
            <div class="card bg-base-100 shadow-xl border border-base-200">
                <div class="card-body">
                    <h2 class="card-title text-lg mb-4">
                        <Icon name="lucide:info" class="w-5 h-5 text-primary" />
                        System Information
                    </h2>
                    
                    <div v-if="!serverVersion.latest" class="alert alert-warning shadow-sm">
                        <Icon name="lucide:alert-triangle" class="w-6 h-6" />
                        <div class="flex-1">
                            <h3 class="font-bold">Update Recommended</h3>
                            <div class="text-sm opacity-90">{{ serverVersion.message }}</div>
                        </div>
                        <div class="flex-none">
                            <a :href="serverConfig.Project" target="_blank" class="btn btn-sm">View Release</a>
                        </div>
                    </div>
                    
                    <div v-else-if="serverVersion.message !== 'Unknown Status' && serverVersion.message !== 'You are not an admin, cannot fetch server version.'" class="bg-base-200/50 rounded-xl p-4 flex items-center justify-between border border-base-300">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center text-success">
                                <Icon name="lucide:check-circle" class="w-6 h-6" />
                            </div>
                            <div>
                                <div class="text-xs font-bold opacity-50 uppercase tracking-wider">Current Version</div>
                                <div class="text-lg font-medium">{{ serverVersion.message }}</div>
                            </div>
                        </div>
                        <div class="badge badge-success badge-outline gap-1 p-3">
                            <Icon name="lucide:shield-check" class="w-4 h-4" />
                            Up to date
                        </div>
                    </div>

                     <div v-else class="flex justify-center p-4 opacity-50">
                        <span class="loading loading-dots loading-lg"></span>
                    </div>
                </div>
            </div>

            <!-- Detailed Stats Component -->
            <ClientOnly>
                <Stats />
            </ClientOnly>
        </div>
    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: "panel",
    middleware: "auth",
});

const { data: accountData } = useAccountData();
const { data: serverVersion, fetch: fetchServerVersion } = useServerVersion();
const serverConfig = useServerConfig();

// Auth & Data Load
onMounted(() => {
    if (accountData.value?.Admin) {
        fetchServerVersion();
    }
});

watch(accountData, (newData) => {
    if (newData?.Admin) {
        fetchServerVersion();
    } else if (newData) {
        // Redirect if confirmed not admin
        navigateTo("/my");
    }
});
</script>