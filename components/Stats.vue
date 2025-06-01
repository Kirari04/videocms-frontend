<template>
    <div class="flex flex-col min-w-0 max-w-full">
        <div class="stats shadow mt-6 flex flex-wrap lg:inline-grid min-w-0 max-w-full">
            <div class="stat bg-base-300">
                <div class="stat-title">CPU Ussage over the past {{ fullDuration }}</div>
                <div :class="{
                    'stat-value': true,
                    'transition-all': true,
                    'overflow-hidden': true,
                    'h-[220px]': showStat.showCPU,
                    'h-[0px]': !showStat.showCPU,
                }">
                    <apexchart  key="cpu-chart" height="200" width="100%" :options="CPUoptions"
                        :series="[CPUserie]">
                    </apexchart>
                </div>
                <div v-if="showStat.showCPU" class="flex items-center gap-2">
                    <span>Interval</span>
                    <select v-model="interval" class="select select-bordered select-sm w-30">
                        <option v-for="intv in intervals" :value="intv.value">{{ intv.label }}</option>
                    </select>
                </div>
                <div class="stat-desc flex items-center gap-2">
                    <span>The CPU ussage in %</span>

                    <input type="checkbox" v-model="showStat.showCPU" class="toggle toggle-primary ml-auto">
                    <button class="btn btn-sm" @click="load()" :disabled="isLoading">
                        <div v-if="isLoading" class="loading loading-spinner loading-sm"></div>
                        <span v-else>Reload</span>
                    </button>
                </div>
            </div>
        </div>
        <div class="stats shadow mt-6 flex flex-wrap lg:inline-grid min-w-0 max-w-full">
            <div class="stat bg-base-300">
                <div class="stat-title">Memory Ussage over the past {{ fullDuration }}</div>
                <div :class="{
                    'stat-value': true,
                    'transition-all': true,
                    'overflow-hidden': true,
                    'h-[220px]': showStat.showMEM,
                    'h-[0px]': !showStat.showMEM,
                }">
                    <apexchart key="mem-chart" height="200" width="100%" :options="MEMoptions"
                        :series="[MEMserie]">
                    </apexchart>
                </div>
                <div v-if="showStat.showMEM" class="flex items-center gap-2">
                    <span>Interval</span>
                    <select v-model="interval" class="select select-bordered select-sm w-30">
                        <option v-for="intv in intervals" :value="intv.value">{{ intv.label }}</option>
                    </select>
                </div>
                <div class="stat-desc flex items-center gap-2">
                    <span>The Ram ussage in %</span>
                    <input type="checkbox" v-model="showStat.showMEM" class="toggle toggle-primary ml-auto">
                    <button class="btn btn-sm" @click="load()" :disabled="isLoading">
                        <div v-if="isLoading" class="loading loading-spinner loading-sm"></div>
                        <span v-else>Reload</span>
                    </button>
                </div>
            </div>
        </div>
        <div class="stats shadow mt-6 flex flex-wrap lg:inline-grid min-w-0 max-w-full">
            <div class="stat bg-base-300">
                <div class="stat-title">Bandwith Ussage over the past {{ fullDuration }}</div>
                <div :class="{
                    'stat-value': true,
                    'transition-all': true,
                    'overflow-hidden': true,
                    'h-[220px]': showStat.showNET,
                    'h-[0px]': !showStat.showNET,
                }">
                    <apexchart key="net-chart" height="200" width="100%"
                        :options="NETINoptions" :series="[NETOUTserie, NETINserie]">
                    </apexchart>
                </div>
                <div v-if="showStat.showNET" class="flex items-center gap-2">
                    <span>Interval</span>
                    <select v-model="interval" class="select select-bordered select-sm w-30">
                        <option v-for="intv in intervals" :value="intv.value">{{ intv.label }}</option>
                    </select>
                </div>
                <div class="stat-desc flex items-center gap-2">
                    <span>The Bandwith ussage in bits</span>
                    <input type="checkbox" v-model="showStat.showNET" class="toggle toggle-primary ml-auto">
                    <button class="btn btn-sm" @click="load()" :disabled="isLoading">
                        <div v-if="isLoading" class="loading loading-spinner loading-sm"></div>
                        <span v-else>Reload</span>
                    </button>
                </div>
            </div>
        </div>
        <div class="stats shadow mt-6 flex flex-wrap lg:inline-grid min-w-0 max-w-full">
            <div class="stat bg-base-300">
                <div class="stat-title">Encoding Queue over the past {{ fullDuration }}</div>
                <div :class="{
                    'stat-value': true,
                    'transition-all': true,
                    'overflow-hidden': true,
                    'h-[220px]': showStat.showENC,
                    'h-[0px]': !showStat.showENC,
                }">
                    <apexchart key="net-chart" height="200" width="100%" theme="dark"
                        :options="ENCoptions" :series="[ENCQUALITYerie, ENCAUDIOserie, ENCSUBTITLEserie]">
                    </apexchart>
                </div>
                <div v-if="showStat.showENC" class="flex items-center gap-2">
                    <span>Interval</span>
                    <select v-model="interval" class="select select-bordered select-sm w-30">
                        <option v-for="intv in intervals" :value="intv.value">{{ intv.label }}</option>
                    </select>
                </div>
                <div class="stat-desc flex items-center gap-2">
                    <span>The amount of items waiting to be encoded.</span>
                    <input type="checkbox" v-model="showStat.showENC" class="toggle toggle-primary ml-auto">
                    <button class="btn btn-sm" @click="load()" :disabled="isLoading">
                        <div v-if="isLoading" class="loading loading-spinner loading-sm"></div>
                        <span v-else>Reload</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ApexOptions } from 'apexcharts';
import dayjs from 'dayjs';

const conf = useRuntimeConfig();
const token = useToken();
const err = ref("");
const isLoading = ref(false)

const showStat = ref({
    showCPU: false,
    showMEM: false,
    showNET: false,
    showENC: false,
})

const CPUoptions = computed(() => createChartOpt('cpu-chart', times.value))
const CPUserie = computed(() => ({
    name: 'CPU',
    data: showStat.value.showCPU ? chartData.value.map(e => Math.floor(e.Cpu)) : []
}))

const MEMoptions = computed(() => createChartOpt('mem-chart', times.value))
const MEMserie = computed(() => ({
    name: 'MEM',
    data: showStat.value.showMEM ? chartData.value.map(e => Math.floor(e.Mem)) : []
}))

const NETINoptions = computed(() => createChartOptBytes('NET-chart', times.value))
const NETINserie = computed(() => ({
    name: 'NETIN',
    data: showStat.value.showNET ? chartData.value.map(e => Math.floor(e.NetIn)) : []
}))
const NETOUTserie = computed(() => ({
    name: 'NETOUT',
    data: showStat.value.showNET ? chartData.value.map(e => Math.floor(e.NetOut)) : []
}))

const ENCoptions = computed(() => createChartOptCount('enc-chart', times.value))
const ENCQUALITYerie = computed(() => ({
    name: 'Qualities',
    data: showStat.value.showENC ? chartData.value.map(e => Math.round(e.ENCQualityQueue)) : []
}))
const ENCAUDIOserie = computed(() => ({
    name: 'Audios',
    data: showStat.value.showENC ? chartData.value.map(e => Math.round(e.ENCAudioQueue)) : []
}))
const ENCSUBTITLEserie = computed(() => ({
    name: 'Subtitles',
    data: showStat.value.showENC ? chartData.value.map(e => Math.round(e.ENCSubtitleQueue)) : []
}))


const interval = ref<"5min" | "1h" | "7h">("5min");
const intervals = ref<{
    value: "5min" | "1h" | "7h",
    label: string
}[]>([{
    value: "5min",
    label: "3 hours",
}, {
    value: "1h",
    label: "23 hours",
}, {
    value: "7h",
    label: "6 days",
}]);
const fullDuration = computed(() => {
    if (chartData.value.length <= 1) {
        return null
    }
    const first = chartData.value[0]
    const last = chartData.value[chartData.value.length - 1]
    return `${dayjs(last.CreatedAt).diff(dayjs(first.CreatedAt), interval.value == '7h' ? 'day' : 'hour')} ${interval.value == '7h' ? 'days' : 'hours'}`
})

watch(interval, () => {
    load()
})
interface Stat {
    CreatedAt: string
    Server: any
    Cpu: number
    Mem: number
    NetOut: number
    NetIn: number
    DiskW: number
    DiskR: number
    ENCQualityQueue: number
    ENCAudioQueue: number
    ENCSubtitleQueue: number
}

const chartData = useState<Stat[]>("chartData", () => [])
const times = computed(() => chartData.value.map(e => {
    if (interval.value == '7h') {
        return dayjs(e.CreatedAt).format("MMM DD HH:mm")
    }
    return dayjs(e.CreatedAt).format("HH:mm")
}))

async function load() {
    try {
        isLoading.value = true;
        const data = await $fetch<Stat[]>(`${conf.public.apiUrl}/stats`, {
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            query: {
                interval: interval.value,
            }
        });
        if (data) {
            chartData.value = data
        } else {
            err.value = "No data found"
        }
    } catch (error: any) {
        err.value = `${error?.data}`;
    } finally {
        setTimeout(() => {
            isLoading.value = false;
        }, 1000)
    }
}

function createChartOpt(id: string, categories: string[]): ApexOptions {
    return {
        chart: {
            id: id,
            animations: {
                enabled: false
            }
        },
        xaxis: {
            categories: categories,
        },
        yaxis: {
            labels: {
                formatter: function (value: number) {
                    return `${Math.round(value)} %`
                },
            },
            max: 100,
        },
        tooltip: {
            theme: 'dark',
            y: {
                formatter: function (value: number) {
                    return `${Math.round(value)} %`
                },
            },
        }

    }
}

function createChartOptBytes(id: string, categories: string[]): ApexOptions {
    return {
        chart: {
            id: id,
            animations: {
                enabled: false
            }
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
            theme: 'dark',
            y: {
                formatter: function (value: number) {
                    return `${humanFileSize(value)}/s`
                },
            },
        }

    }
}

function createChartOptCount(id: string, categories: string[]): ApexOptions {
    return {
        chart: {
            id: id,
            animations: {
                enabled: false
            }
        },
        xaxis: {
            categories: categories,
        },
        yaxis: {
            labels: {
                formatter: function (value: number) {
                    return `${Math.round(value)}`
                },
            },
        },
        tooltip: {
            theme: 'dark',
            y: {
                formatter: function (value: number) {
                    return `${Math.round(value)}`
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

await useAsyncData('serverStats', async () => {
    return await load()
})

</script>