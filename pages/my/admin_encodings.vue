<template>
    <div class="flex grow flex-col">
        <PageHeader title="Global queue" description="System-wide encoding processes and their owners.">
            <button @click="load()" :disabled="isLoading" class="btn btn-ghost btn-sm gap-2">
                <Icon name="lucide:refresh-cw" class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
                Reload
            </button>
        </PageHeader>

        <!-- Access Denied -->
        <div v-if="accountData && !accountData.Admin" role="alert" class="alert alert-error">
            <Icon name="lucide:shield-alert" class="h-5 w-5 shrink-0" />
            <span>You don't have access to this page.</span>
        </div>

        <template v-else>
            <!-- Error Alert -->
            <div v-if="errors" role="alert" class="alert alert-error mb-4">
                <Icon name="lucide:alert-circle" class="h-5 w-5 shrink-0" />
                <span>{{ errors }}</span>
                <button @click="errors = null" class="btn btn-square btn-ghost btn-sm" aria-label="Dismiss">
                    <Icon name="lucide:x" class="h-4 w-4" />
                </button>
            </div>

            <!-- At a glance -->
            <section
                class="mb-6 grid grid-cols-3 divide-x divide-base-300 rounded-box border border-base-300 bg-base-100">
                <div class="flex flex-col gap-1 p-4">
                    <span class="text-xs text-base-content/70">Processing</span>
                    <span class="text-2xl font-semibold">{{ datas.filter(e => e.progress > 0).length }}</span>
                </div>
                <div class="flex flex-col gap-1 p-4">
                    <span class="text-xs text-base-content/70">In queue</span>
                    <span class="text-2xl font-semibold">{{ datas.length }}</span>
                </div>
                <div class="flex flex-col gap-1 p-4">
                    <span class="text-xs text-base-content/70">Owners</span>
                    <span class="text-2xl font-semibold">{{ [...new Set(datas.map(e => e.user_id))].length }}</span>
                </div>
            </section>

            <!-- Encodings Table -->
            <div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
                <table class="table table-sm">
                    <thead>
                        <tr class="border-base-300 text-xs text-base-content/70">
                            <th class="font-medium">File</th>
                            <th class="font-medium">Owner</th>
                            <th class="font-medium">Quality</th>
                            <th class="font-medium">Progress</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="isLoading && datas.length === 0">
                            <td colspan="4" class="p-0">
                                <div class="flex flex-col gap-1.5 p-4" aria-hidden="true">
                                    <div v-for="i in 5" :key="i" class="skeleton h-8 w-full rounded-selector"></div>
                                </div>
                            </td>
                        </tr>
                        <tr v-else-if="datas.length === 0">
                            <td colspan="4">
                                <div class="flex flex-col items-center justify-center gap-1 py-14 text-center">
                                    <Icon name="lucide:cpu" class="h-6 w-6 text-base-content/30" />
                                    <p class="text-sm font-medium">Queue is idle</p>
                                    <p class="text-sm text-base-content/60">No encodings are running anywhere on this
                                        server.</p>
                                </div>
                            </td>
                        </tr>
                        <tr
                            v-for="task in listPaginationItems"
                            :key="`${task.id}-${task.quality}-${task.user_id}`"
                            class="border-base-300 hover:bg-base-200/60">
                            <td>
                                <div class="max-w-xs truncate font-medium" :title="task.name">{{ task.name }}</div>
                                <div class="text-xs tabular-nums text-base-content/50">Link {{ task.id }}</div>
                            </td>
                            <td>
                                <div class="flex items-center gap-2">
                                    <div
                                        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral text-[10px] font-medium text-neutral-content"
                                        aria-hidden="true">
                                        {{ task.username.substring(0, 2).toUpperCase() }}
                                    </div>
                                    <span class="text-sm">{{ task.username }}</span>
                                </div>
                            </td>
                            <td>
                                <span class="badge badge-ghost badge-sm tabular-nums">{{ task.quality }}</span>
                            </td>
                            <td>
                                <div class="flex items-center gap-3">
                                    <progress
                                        class="progress progress-primary h-1.5 w-24"
                                        :value="task.progress"
                                        max="100"></progress>
                                    <span class="w-12 text-right text-xs tabular-nums"
                                        :class="task.progress > 0 ? 'text-base-content/80' : 'text-base-content/50'">
                                        {{ task.progress > 0 ? `${Math.round(task.progress)}%` : 'Queued' }}
                                    </span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <PaginationBar
                v-if="datas.length > 0"
                class="mt-3"
                v-model:page="paginationIndex"
                v-model:pageSize="paginationMaxSize"
                :pages="paginationMenusAmount" />
        </template>
    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: "panel",
    middleware: "auth",
});

const { data: accountData } = useAccountData();
const conf = useRuntimeConfig();
const token = useToken();

interface GlobalEncoding {
    id: number;
    name: string;
    quality: string;
    progress: number;
    user_id: number;
    username: string;
}

const datas = ref<GlobalEncoding[]>([])
const errors = ref<string | null>(null)
const isLoading = ref(false)

const paginationIndex = ref(0);
const paginationMaxSize = ref(25);

const paginationMenusAmount = computed(() => {
    return Math.ceil(
        datas.value.length /
        paginationMaxSize.value
    );
});

const listPaginationItems = computed(() => {
    return datas.value.slice(
        paginationIndex.value * paginationMaxSize.value,
        (paginationIndex.value + 1) * paginationMaxSize.value
    );
});

async function load() {
    if (!accountData.value?.Admin) return;
    isLoading.value = true;
    try {
        const data = await $fetch<GlobalEncoding[] | null>(`${conf.public.apiUrl}/admin/encodings`, {
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
        });
        datas.value = data || [];
        errors.value = null;
    } catch (error: any) {
        errors.value = `Failed to load global queue: ${error.data || error.message}`;
        if (error.status === 403) {
            navigateTo("/my");
        }
    } finally {
        isLoading.value = false;
    }
}

let intv: NodeJS.Timeout | null = null;

onMounted(() => {
    if (accountData.value?.Admin) {
        load();
        intv = setInterval(() => {
            load();
        }, 5000);
    }
});

watch(accountData, (newData) => {
    if (newData?.Admin) {
        if (datas.value.length === 0) load();
        if (!intv) {
            intv = setInterval(() => {
                load();
            }, 5000);
        }
    } else if (newData) {
        navigateTo("/my");
    }
});

onUnmounted(() => {
    if (intv) {
        clearInterval(intv);
    }
});
</script>
