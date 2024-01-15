<template>
    <div class="flex flex-col min-w-0 max-w-full">
        <div class="stats shadow mt-6 flex flex-wrap lg:inline-grid min-w-0 max-w-full">
            <div class="stat">
                <div class="stat-title">CPU Ussage</div>
                <div class="stat-value">
                    <apexchart key="cpu-chart" height="200" width="100%" :options="CPUoptions" :series="[CPUserie]">
                    </apexchart>
                </div>
                <div class="stat-desc">The CPU ussage in %</div>
            </div>
        </div>
        <div class="stats shadow mt-6 flex flex-wrap lg:inline-grid min-w-0 max-w-full">
            <div class="stat">
                <div class="stat-title">Memory Ussage</div>
                <div class="stat-value">
                    <apexchart key="mem-chart" height="200" width="100%" :options="MEMoptions" :series="[MEMserie]">
                    </apexchart>
                </div>
                <div class="stat-desc">The Ram ussage in %</div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs';

const conf = useRuntimeConfig();
const token = useToken();
const err = ref("");
const isLoading = ref(false)

const CPUoptions = ref(createChartOpt('cpu-chart', ["...", "..."]))
const CPUserie = ref<{
    name: string
    data: number[]
}>({
    name: 'CPU',
    data: [100, 100]
})

const MEMoptions = ref(createChartOpt('mem-chart', ["...", "..."]))
const MEMserie = ref<{
    name: string
    data: number[]
}>({
    name: 'MEM',
    data: [100, 100]
})

onMounted(() => {
    load()
})

async function load() {
    isLoading.value = true;
    const {
        data,
        error,
    } = await useFetch<{
        CreatedAt: string
        Server: any
        Cpu: number
        Mem: number
        NetOut: number
        NetIn: number
        DiskW: number
        DiskR: number
    }[]>(`${conf.public.apiUrl}/stats`, {
        headers: {
            Authorization: `Bearer ${token.value}`,
        },
    });

    if (error.value) {
        err.value = `${error.value?.data}`;
        return;
    }
    if (data.value) {
        CPUserie.value.data = data.value.map(e => Math.floor(e.Cpu))
        CPUoptions.value = createChartOpt("cpu-chart", data.value.map(e => dayjs(e.CreatedAt).format("HH:00")))
        MEMserie.value.data = data.value.map(e => Math.floor(e.Mem))
        MEMoptions.value = createChartOpt("mem-chart", data.value.map(e => dayjs(e.CreatedAt).format("HH:00")))
    }
    isLoading.value = false;
}

function createChartOpt(id: string, categories: string[]) {
    return {
        chart: {
            id: id,
        },
        xaxis: {
            categories: categories,
        },
        yaxis: {
            labels: {
                formatter: function (value: number) {
                    return `${value} %`
                },
            },
            max: 100,
        },
        tooltip: {
            y: {
                formatter: function (value: number) {
                    return `${value} %`
                },
            },
        }

    }
}

</script>