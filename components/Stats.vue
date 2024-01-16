<template>
    <div class="flex flex-col min-w-0 max-w-full">
        <div class="stats shadow mt-6 flex flex-wrap lg:inline-grid min-w-0 max-w-full">
            <div class="stat">
                <div class="stat-title">CPU Ussage</div>
                <div :class="{
                    'stat-value': true,
                    'transition-all': true,
                    'overflow-hidden': true,
                    'h-[220px]': showStat.showCPU,
                    'h-[0px]': !showStat.showCPU,
                }">
                    <apexchart v-if="!isLoading && showStat.showCPU" key="cpu-chart" height="200" width="100%"
                        :options="CPUoptions" :series="[CPUserie]">
                    </apexchart>
                </div>
                <div class="stat-desc flex items-center gap-2">
                    <span>The CPU ussage in %</span>
                    <select v-model="interval" class="select select-bordered select-sm ml-auto">
                        <option v-for="intv in intervals" :value="intv">{{ intv }}</option>
                    </select>
                    <input type="checkbox" v-model="showStat.showCPU" class="toggle toggle-primary">
                    <button class="btn btn-sm" @click="load()" :disabled="isLoading">Reload</button>
                </div>
            </div>
        </div>
        <div class="stats shadow mt-6 flex flex-wrap lg:inline-grid min-w-0 max-w-full">
            <div class="stat">
                <div class="stat-title">Memory Ussage</div>
                <div :class="{
                    'stat-value': true,
                    'transition-all': true,
                    'overflow-hidden': true,
                    'h-[220px]': showStat.showMEM,
                    'h-[0px]': !showStat.showMEM,
                }">
                    <apexchart v-if="!isLoading && showStat.showMEM" key="mem-chart" height="200" width="100%"
                        :options="MEMoptions" :series="[MEMserie]">
                    </apexchart>
                </div>
                <div class="stat-desc flex items-center gap-2">
                    <span>The Ram ussage in %</span>
                    <select v-model="interval" class="select select-bordered select-sm ml-auto">
                        <option v-for="intv in intervals" :value="intv">{{ intv }}</option>
                    </select>
                    <input type="checkbox" v-model="showStat.showMEM" class="toggle toggle-primary">
                    <button class="btn btn-sm" @click="load()" :disabled="isLoading">Reload</button>
                </div>
            </div>
        </div>
        <div class="stats shadow mt-6 flex flex-wrap lg:inline-grid min-w-0 max-w-full">
            <div class="stat">
                <div class="stat-title">Bandwith Ussage</div>
                <div :class="{
                    'stat-value': true,
                    'transition-all': true,
                    'overflow-hidden': true,
                    'h-[220px]': showStat.showNET,
                    'h-[0px]': !showStat.showNET,
                }">
                    <apexchart v-if="!isLoading && showStat.showNET" key="net-chart" height="200" width="100%"
                        :options="NETINoptions" :series="[NETOUTserie, NETINserie]">
                    </apexchart>
                </div>
                <div class="stat-desc flex items-center gap-2">
                    <span>The Bandwith ussage in bits</span>
                    <select v-model="interval" class="select select-bordered select-sm ml-auto">
                        <option v-for="intv in intervals" :value="intv">{{ intv }}</option>
                    </select>
                    <input type="checkbox" v-model="showStat.showNET" class="toggle toggle-primary">
                    <button class="btn btn-sm" @click="load()" :disabled="isLoading">Reload</button>
                </div>
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

const showStat = ref({
    showCPU: false,
    showMEM: false,
    showNET: false,
})

const defaultArrays = Array.from(Array(10).keys()).map(e => "...")
const defaultData = Array.from(Array(10).keys()).map(e => 100)

const CPUoptions = ref(createChartOpt('cpu-chart', defaultArrays))
const CPUserie = ref<{
    name: string
    data: number[]
}>({
    name: 'CPU',
    data: defaultData
})

const MEMoptions = ref(createChartOpt('mem-chart', defaultArrays))
const MEMserie = ref<{
    name: string
    data: number[]
}>({
    name: 'MEM',
    data: defaultData
})

const NETINoptions = ref(createChartOptBytes('NET-chart', defaultArrays))
const NETINserie = ref<{
    name: string
    data: number[]
}>({
    name: 'NETIN',
    data: defaultData
})
const NETOUTserie = ref<{
    name: string
    data: number[]
}>({
    name: 'NETOUT',
    data: defaultData
})

onMounted(() => {
    load()
})

const interval = ref<"5min" | "1h" | "7h">("5min");
const intervals = ref<string[]>(["5min", "1h", "7h"]);
watch(interval, () => {
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
        query: {
            interval: interval.value,
        }
    });

    if (error.value) {
        err.value = `${error.value?.data}`;
        return;
    }
    if (data.value) {
        const times = data.value.map(e => dayjs(e.CreatedAt).format("HH:mm"))
        CPUserie.value.data = data.value.map(e => Math.floor(e.Cpu))
        CPUoptions.value = createChartOpt("cpu-chart", times)
        MEMserie.value.data = data.value.map(e => Math.floor(e.Mem))
        MEMoptions.value = createChartOpt("mem-chart", times)
        NETINserie.value.data = data.value.map(e => Math.floor(e.NetIn))
        NETOUTserie.value.data = data.value.map(e => Math.floor(e.NetOut))
        NETINoptions.value = createChartOptBytes("net-chart", times)
    }
    setTimeout(() => {
        isLoading.value = false;
    }, 1000)
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

function createChartOptBytes(id: string, categories: string[]) {
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
                    return `${humanFileSize(value)}/s`
                },
            },
        },
        tooltip: {
            y: {
                formatter: function (value: number) {
                    return `${humanFileSize(value)}/s`
                },
            },
        }

    }
}

function humanFileSize(bytes: number, si = false, dp = 1) {
    const thresh = si ? 1000 : 1024;

    if (Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }

    const units = si
        ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
        : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    let u = -1;
    const r = 10 ** dp;

    do {
        bytes /= thresh;
        ++u;
    } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


    return bytes.toFixed(dp) + ' ' + units[u];
}

</script>