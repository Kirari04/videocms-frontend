<template>
    <div class="flex grow flex-col">
        <PageHeader title="Encodings" description="Videos currently converting to streamable formats." />

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
            class="mb-6 grid grid-cols-2 divide-x divide-base-300 rounded-box border border-base-300 bg-base-100">
            <div class="flex flex-col gap-1 p-4">
                <span class="text-xs text-base-content/70">Processing</span>
                <span class="text-2xl font-semibold">{{ datas.filter(e => e.Progress > 0).length }}</span>
            </div>
            <div class="flex flex-col gap-1 p-4">
                <span class="text-xs text-base-content/70">In queue</span>
                <span class="text-2xl font-semibold">{{ datas.length }}</span>
            </div>
        </section>

        <!-- Encodings Table -->
        <div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
            <table class="table table-sm">
                <thead>
                    <tr class="border-base-300 text-xs text-base-content/70">
                        <th class="w-1/2 font-medium">File</th>
                        <th class="font-medium">Quality</th>
                        <th class="font-medium">Progress</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="datas.length === 0">
                        <td colspan="3">
                            <div class="flex flex-col items-center justify-center gap-1 py-14 text-center">
                                <Icon name="lucide:cpu" class="h-6 w-6 text-base-content/30" />
                                <p class="text-sm font-medium">Queue is idle</p>
                                <p class="text-sm text-base-content/60">Uploads appear here while they process.</p>
                            </div>
                        </td>
                    </tr>
                    <tr
                        v-for="task in listPaginationItems"
                        :key="`${task.ID}-${task.Name}`"
                        class="border-base-300 hover:bg-base-200/60">
                        <td>
                            <div class="max-w-xs truncate font-medium md:max-w-md" :title="task.Name">
                                {{ task.Name }}
                            </div>
                        </td>
                        <td>
                            <span class="badge badge-ghost badge-sm tabular-nums">{{ task.Quality }}</span>
                        </td>
                        <td>
                            <div class="flex items-center gap-3">
                                <progress
                                    class="progress progress-primary h-1.5 w-24 md:w-32"
                                    :value="task.Progress * 100"
                                    max="100"></progress>
                                <span class="w-12 text-right text-xs tabular-nums"
                                    :class="task.Progress > 0 ? 'text-base-content/80' : 'text-base-content/50'">
                                    {{ task.Progress > 0 ? `${Math.round(task.Progress * 100)}%` : 'Queued' }}
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
