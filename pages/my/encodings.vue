<template>
    <div class="flex flex-col grow gap-6">
        <!-- Page Header -->
        <div class="flex flex-col gap-1">
            <h1 class="text-2xl font-bold">Encoding Queue</h1>
            <p class="text-sm opacity-70">Monitor the progress of your video encodings.</p>
        </div>

        <!-- Error Alert -->
        <div v-if="errors" class="alert alert-error shadow-sm">
            <Icon name="lucide:alert-circle" class="stroke-current shrink-0 h-6 w-6" />
            <div>{{ errors }}</div>
            <button @click="errors = null" class="btn btn-sm btn-circle btn-ghost ml-auto">✕</button>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="stats shadow bg-base-100 border border-base-200">
                <div class="stat">
                    <div class="stat-figure text-primary">
                        <Icon name="lucide:activity" class="w-8 h-8" />
                    </div>
                    <div class="stat-title">Active Encodings</div>
                    <div class="stat-value text-primary">
                        {{ datas.filter(e => e.Progress > 0).length }}
                    </div>
                    <div class="stat-desc">Currently processing</div>
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
        </div>

        <!-- Encodings Table Card -->
        <div class="card bg-base-100 shadow-xl border border-base-200">
            <div class="card-body p-0">
                <div class="overflow-x-auto">
                    <table class="table table-zebra w-full">
                        <thead class="bg-base-200/50">
                            <tr>
                                <th class="w-1/2">File Name</th>
                                <th>Quality Profile</th>
                                <th>Progress</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="datas.length === 0">
                                <td colspan="3">
                                    <div class="flex flex-col items-center justify-center py-12 opacity-50">
                                        <Icon name="lucide:coffee" class="w-12 h-12 mb-2" />
                                        <p>No active encodings queued.</p>
                                    </div>
                                </td>
                            </tr>
                            <tr v-for="task in listPaginationItems" :key="`${task.ID}-${task.Name}`">
                                <td>
                                    <div class="font-medium truncate max-w-xs md:max-w-md" :title="task.Name">
                                        {{ task.Name }}
                                    </div>
                                </td>
                                <td>
                                    <span class="badge badge-ghost font-mono">
                                        {{ task.Quality }}
                                    </span>
                                </td>
                                <td>
                                    <div class="flex items-center gap-3">
                                        <progress 
                                            class="progress progress-primary w-24 md:w-32" 
                                            :value="task.Progress * 100" 
                                            max="100"
                                            :class="{ 'progress-accent': task.Progress === 0 }"
                                        ></progress>
                                        <span class="text-xs font-mono w-12 text-right">
                                            {{ task.Progress > 0 ? `${Math.round(task.Progress * 100)}%` : 'Queued' }}
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
        <div class="flex justify-between items-center px-2">
            <div class="dropdown dropdown-top">
                <label tabindex="0" class="btn btn-ghost btn-sm text-xs font-normal">
                    Show {{ paginationMaxSize }}
                    <Icon name="lucide:chevron-up" class="w-3 h-3 ml-1" />
                </label>
                <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32 border border-base-200">
                    <li v-for="max in [10, 25, 50, 100]" :key="max">
                        <button @click="paginationMaxSize = max" :class="{ 'active': paginationMaxSize === max }">
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
    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: "panel",
    middleware: "auth",
});

const conf = useRuntimeConfig();
const token = useToken();
interface Encoding {
    ID: number;
    Name: string;
    Quality: string;
    Progress: number;
}
const datas = ref<Encoding[]>([])
const errors = ref<string | null>(null)

const paginationIndex = ref(0);
const paginationMaxSize = ref(10);

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
    try {
        const data = await $fetch<Encoding[] | null>(`${conf.public.apiUrl}/encodings`, {
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
        });
        if (data) {
            datas.value = data;
        } else {
            datas.value = [];
        }
        errors.value = null;
    } catch (error: any) {
        errors.value = `${error.data ? error.data : error.message}`;
    }
}

let intv: NodeJS.Timeout | null = null;
onMounted(() => {
    load()
    intv = setInterval(() => {
        load()
    }, 5000)
})
onUnmounted(() => {
    if (intv) {
        clearInterval(intv)
    }
})
</script>
