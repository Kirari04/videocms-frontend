<template>
    <div class="flex grow flex-col">
        <!-- Access Denied -->
        <div v-if="accountData && !accountData.Admin" role="alert" class="alert alert-error">
            <Icon name="lucide:shield-alert" class="h-5 w-5 shrink-0" />
            <span>You don't have access to this page.</span>
        </div>

        <template v-if="accountData?.Admin">
            <PageHeader title="System stats" description="Server health, traffic, and resource consumers." />

            <!-- Version -->
            <div
                class="mb-6 flex flex-wrap items-center gap-3 rounded-box border border-base-300 bg-base-100 px-4 py-3">
                <template v-if="versionKnown">
                    <Icon
                        :name="serverVersion.latest ? 'lucide:check-circle-2' : 'lucide:alert-triangle'"
                        class="h-4 w-4 shrink-0"
                        :class="serverVersion.latest ? 'text-success' : 'text-warning'" />
                    <span class="text-sm">{{ serverVersion.message }}</span>
                    <span
                        v-if="serverVersion.latest"
                        class="badge badge-sm border-none bg-success/10 text-success">up to date</span>
                    <a
                        v-else
                        href="https://github.com/Kirari04/videocms"
                        target="_blank"
                        class="btn btn-outline btn-xs ml-auto">
                        View release
                    </a>
                </template>
                <template v-else>
                    <div class="skeleton h-4 w-4 rounded-full" aria-hidden="true"></div>
                    <div class="skeleton h-4 w-56" aria-hidden="true"></div>
                </template>
            </div>

            <!-- Detailed Stats Component -->
            <ClientOnly>
                <Stats />
            </ClientOnly>
        </template>
    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: "panel",
    middleware: "auth",
});

const { data: accountData } = useAccountData();
const { data: serverVersion, fetch: fetchServerVersion } = useServerVersion();

const versionKnown = computed(() =>
    serverVersion.value.message !== 'Unknown Status'
    && serverVersion.value.message !== 'You are not an admin, cannot fetch server version.');

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
