<template>
    <div class="flex flex-col grow gap-6">
        <!-- Page Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div class="flex flex-col gap-1">
                <h1 class="text-2xl font-bold">Global Encoding Queue</h1>
                <p class="text-sm opacity-70">Monitor system-wide encoding processes and ownership.</p>
            </div>
            <div class="flex gap-2">
                <button @click="load()" :disabled="isLoading" class="btn btn-ghost btn-sm gap-2">
                    <Icon name="lucide:refresh-cw" :class="{'animate-spin': isLoading}" />
                    Reload
                </button>
            </div>
        </div>

        <!-- Access Denied -->
        <div v-if="!accountData?.Admin" class="alert alert-error">
            You don't have access to this page.
        </div>

        <template v-else>
            <!-- Error Alert -->
            <div v-if="errors" class="alert alert-error shadow-sm">
                <Icon name="lucide:alert-circle" class="stroke-current shrink-0 h-6 w-6" />
                <div>{{ errors }}</div>
                <button @click="errors = null" class="btn btn-sm btn-circle btn-ghost ml-auto">✕</button>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="stats shadow bg-base-100 border border-base-200">
                    <div class="stat">
                        <div class="stat-figure text-primary">
                            <Icon name="lucide:activity" class="w-8 h-8" />
                        </div>
                        <div class="stat-title">Active Encodings</div>
                        <div class="stat-value text-primary">
                            {{ datas.filter(e => e.progress > 0).length }}
                        </div>
                        <div class="stat-desc">System-wide processing</div>
                    </div>
                </div>
                <div class="stats shadow bg-base-100 border border-base-200">
                    <div class="stat">
                        <div class="stat-figure text-secondary">
                            <Icon name="lucide:list" class="w-8 h-8" />
                        </div>
                        <div class="stat-title">Total Queued</div>
                        <div class="stat-value text-secondary">
                            {{ datas.length }}
                        </div>
                        <div class="stat-desc">Waiting in line</div>
                    </div>
                </div>
                <div class="stats shadow bg-base-100 border border-base-200">
                    <div class="stat">
                        <div class="stat-figure text-accent">
                            <Icon name="lucide:users" class="w-8 h-8" />
                        </div>
                        <div class="stat-title">Active Users</div>
                        <div class="stat-value text-accent">
                            {{ [...new Set(datas.map(e => e.user_id))].length }}
                        </div>
                        <div class="stat-desc">Unique owners</div>
                    </div>
                </div>
            </div>

            <!-- Encodings Table Card -->
            <div class="card bg-base-100 shadow-xl border border-base-200">
                <div class="card-body p-0">
                    <div class="overflow-x-auto">
                        <table class="table table-zebra w-full">
                            <thead class="bg-base-200/50">
                                <tr>
                                    <th>File Name</th>
                                    <th>Owner</th>
                                    <th>Quality</th>
                                    <th>Progress</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="isLoading && datas.length === 0">
                                    <td colspan="4" class="text-center py-12">
                                        <span class="loading loading-spinner loading-lg"></span>
                                    </td>
                                </tr>
                                <tr v-else-if="datas.length === 0">
                                    <td colspan="4">
                                        <div class="flex flex-col items-center justify-center py-12 opacity-50">
                                            <Icon name="lucide:coffee" class="w-12 h-12 mb-2" />
                                            <p>No active system-wide encodings.</p>
                                        </div>
                                    </td>
                                </tr>
                                <tr v-for="task in listPaginationItems" :key="`${task.id}-${task.quality}-${task.user_id}`">
                                    <td>
                                        <div class="font-medium truncate max-w-xs" :title="task.name">
                                            {{ task.name }}
                                        </div>
                                        <div class="text-[10px] opacity-50 font-mono">Link ID: {{ task.id }}</div>
                                    </td>
                                    <td>
                                        <div class="flex items-center gap-2">
                                            <div class="avatar placeholder">
                                                <div class="bg-neutral text-neutral-content rounded-full w-6">
                                                    <span class="text-[10px]">{{ task.username.substring(0, 2).toUpperCase() }}</span>
                                                </div>
                                            </div>
                                            <div class="flex flex-col">
                                                <span class="text-sm font-semibold">{{ task.username }}</span>
                                                <span class="text-[10px] opacity-50">UID: {{ task.user_id }}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span class="badge badge-ghost font-mono badge-sm">
                                            {{ task.quality }}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="flex items-center gap-3">
                                            <progress 
                                                class="progress progress-primary w-24" 
                                                :value="task.progress" 
                                                max="100"
                                                :class="{ 'progress-accent': task.progress === 0 }"
                                            ></progress>
                                            <span class="text-xs font-mono w-12 text-right">
                                                {{ task.progress > 0 ? `${Math.round(task.progress)}%` : 'Queued' }}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Pagination -->
            <div class="flex justify-between items-center px-2" v-if="datas.length > 0">
                <div class="dropdown dropdown-top">
                    <label tabindex="0" class="btn btn-ghost btn-sm text-xs font-normal border border-base-200">
                        Show {{ paginationMaxSize }}
                        <Icon name="lucide:chevron-up" class="w-3 h-3 ml-1" />
                    </label>
                    <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32 border border-base-200">
                        <li v-for="max in [10, 25, 50, 100]" :key="max">
                            <button @click="paginationMaxSize = max; paginationIndex = 0" :class="{ 'active': paginationMaxSize === max }">
                                {{ max }} rows
                            </button>
                        </li>
                    </ul>
                </div>

                <div class="join">
                    <button 
                        v-for="index in paginationMenusAmount" 
                        :key="index"
                        @click="paginationIndex = index - 1" 
                        class="join-item btn btn-sm"
                        :class="paginationIndex === index - 1 ? 'btn-active' : ''"
                    >
                        {{ index }}
                    </button>
                </div>
            </div>
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
