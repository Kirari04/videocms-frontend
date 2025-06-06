<template>
    <div class="flex flex-col grow gap-2">
        <div class="stats shadow mt-6 flex flex-wrap lg:inline-grid">
            <div class="stat">
                <div class="stat-title">Active Encodings</div>
                <div class="stat-value">
                    {{
                        datas.filter(e => e.Progress > 0).length
                    }}
                </div>
                <div class="stat-desc">The amount of items that are curently getting encoded</div>
            </div>
            <div class="stat">
                <div class="stat-title">Total Encodes</div>
                <div class="stat-value">
                    {{
                        datas.length
                    }}
                </div>
                <div class="stat-desc">The amount of items that are waiting to be encoded</div>
            </div>
        </div>
        <table class="table table-cell table-zebra border-base-100 min-h-[300px]">
            <thead>
                <tr>
                    <th class="w-full">
                        Name
                    </th>
                    <th>
                        Quality
                    </th>
                    <th>
                        Progress
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-if="datas.length === 0">
                    <td colspan="3">
                        No active encodings queued atm.
                    </td>
                </tr>
                <tr v-for="task in listPaginationItems" :key="`${task.ID}-${task.Name}`">
                    <td>
                        {{ task.Name }}
                    </td>
                    <td>
                        <span class="badge badge-neutral whitespace-nowrap">
                            {{ task.Quality }}
                        </span>
                    </td>
                    <td>
                        <div class="flex items-center">
                            <span :class="task.Progress === 0
                                ? 'loading loading-spinner text-primary loading-lg'
                                : 'radial-progress text-primary'
                                " :style="`
                                --value: ${task.Progress * 100};
                                --size: 2.5rem;
                                --thickness: 3px;
                            `">
                                <span class="text-xs whitespace-nowrap">
                                    {{ `${task.Progress * 100}`.substring(0, 3) }} %
                                </span>
                            </span>
                        </div>

                    </td>
                </tr>
            </tbody>
        </table>
        <!-- Pagination -->
        <div class="mt-2 flex justify-center items-center shrink">
            <div class="join">
                <button v-for="index in paginationMenusAmount" @click="paginationIndex = index - 1" :class="paginationIndex === index - 1
                    ? 'join-item btn btn-sm btn-primary'
                    : 'join-item btn btn-sm'
                    ">
                    {{ index }}
                </button>
            </div>
            <div class="dropdown dropdown-top dropdown-end">
                <label tabindex="0" class="btn btn-neutral btn-sm ml-2">
                    Max {{ paginationMaxSize }}</label>
                <ul tabindex="0"
                    class="dropdown-content z-[1] menu btn-group btn-group-vertical p-0 mb-2 shadow rounded-box">
                    <li v-for="max in [10, 25, 50, 100, 200, 500, 1000]" @click="paginationMaxSize = max" :class="paginationMaxSize === max
                        ? 'btn btn-sm btn-primary whitespace-nowrap'
                        : 'btn btn-sm btn-neutral whitespace-nowrap'
                        ">
                        Max {{ max }}
                    </li>
                </ul>
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
    const {
        data,
        error,
    } = await useFetch<Encoding[] | null>(`${conf.public.apiUrl}/encodings`, {
        headers: {
            Authorization: `Bearer ${token.value}`,
        },
    });
    if (error.value) {
        errors.value = `${error.value.data}`
        return
    }
    if (data.value) {
        datas.value = data.value
    } else {
        data.value = []
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
