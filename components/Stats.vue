<template>
    <div class="flex flex-col gap-6">
        <!-- Controls & Summary -->
        <div class="flex flex-col md:flex-row items-center justify-between gap-4 bg-base-100 p-4 rounded-xl shadow-sm border border-base-200">
            <div class="flex items-center gap-2">
                <Icon name="lucide:clock" class="w-5 h-5 text-base-content/70" />
                <span class="font-semibold text-sm">Time Range:</span>
                <div class="join">
                    <button 
                        v-for="range in timeRanges" 
                        :key="range.label" 
                        @click="selectedRange = range"
                        class="btn btn-sm join-item"
                        :class="selectedRange.label === range.label ? 'btn-primary' : 'btn-ghost bg-base-200/50'"
                    >
                        {{ range.label }}
                    </button>
                </div>
            </div>
            
            <div class="flex items-center gap-2 text-xs opacity-70">
                <span v-if="hasData">
                    Resolution: {{ targetPoints }} points
                </span>
                <span class="hidden md:inline">•</span>
                <button class="btn btn-sm btn-ghost btn-square ml-2" @click="load()" :disabled="isLoading">
                    <Icon name="lucide:refresh-cw" class="w-4 h-4" :class="{'animate-spin': isLoading}" />
                </button>
            </div>
        </div>

        <!-- Global Traffic (Admin View) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2">
                <TrafficChart mode="global" />
            </div>
            <div class="lg:col-span-1">
                 <!-- Top Consumers Summary -->
                 <TopTraffic mode="users" :is-admin-view="true" />
            </div>
        </div>

        <!-- System Resources Header -->
        <div class="divider uppercase text-[10px] font-bold opacity-30 tracking-[0.2em] my-0">Node Performance</div>

        <!-- Charts Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <!-- CPU -->
            <div class="card bg-base-100 shadow-xl border border-base-200">
                <div class="card-body p-4">
                    <h3 class="card-title text-sm flex justify-between items-center mb-0">
                        <span class="flex items-center gap-2">
                            <Icon name="lucide:cpu" class="w-4 h-4 text-primary" />
                            CPU Usage
                        </span>
                        <span class="text-xs font-mono opacity-50" v-if="latestValues.cpu !== null">{{ Math.round(latestValues.cpu) }}%</span>
                    </h3>
                    <div class="h-[250px] w-full">
                        <apexchart key="cpu-chart" height="100%" width="100%" :options="CPUoptions" :series="CPUserie" />
                    </div>
                </div>
            </div>

            <!-- Memory -->
            <div class="card bg-base-100 shadow-xl border border-base-200">
                <div class="card-body p-4">
                    <h3 class="card-title text-sm flex justify-between items-center mb-0">
                        <span class="flex items-center gap-2">
                            <Icon name="lucide:memory-stick" class="w-4 h-4 text-secondary" />
                            Memory Usage
                        </span>
                        <span class="text-xs font-mono opacity-50" v-if="latestValues.mem !== null">{{ Math.round(latestValues.mem) }}%</span>
                    </h3>
                    <div class="h-[250px] w-full">
                        <apexchart key="mem-chart" height="100%" width="100%" :options="MEMoptions" :series="MEMserie" />
                    </div>
                </div>
            </div>

            <!-- Network -->
            <div class="card bg-base-100 shadow-xl border border-base-200">
                <div class="card-body p-4">
                    <h3 class="card-title text-sm flex justify-between items-center mb-0">
                        <span class="flex items-center gap-2">
                            <Icon name="lucide:network" class="w-4 h-4 text-accent" />
                            Network I/O
                        </span>
                        <span class="text-xs font-mono opacity-50" v-if="latestValues.netIn !== null">
                            ↓ {{ humanFileSize(latestValues.netIn) }}/s • ↑ {{ humanFileSize(latestValues.netOut) }}/s
                        </span>
                    </h3>
                    <div class="h-[250px] w-full">
                        <apexchart key="net-chart" height="100%" width="100%" :options="NETINoptions" :series="NETserie" />
                    </div>
                </div>
            </div>

            <!-- Encoding -->
            <div class="card bg-base-100 shadow-xl border border-base-200">
                <div class="card-body p-4">
                    <h3 class="card-title text-sm flex justify-between items-center mb-0">
                        <span class="flex items-center gap-2">
                            <Icon name="lucide:film" class="w-4 h-4 text-warning" />
                            Encoding Queue
                        </span>
                        <span class="text-xs font-mono opacity-50" v-if="latestValues.enc !== null">
                            {{ Math.round(latestValues.enc) }} Jobs
                        </span>
                    </h3>
                    <div class="h-[250px] w-full">
                        <apexchart key="enc-chart" height="100%" width="100%" :options="ENCoptions" :series="ENCserie" />
                    </div>
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

// Time Ranges
const timeRanges = [
    { label: "3 Hours", hours: 3 },
    { label: "24 Hours", hours: 24 },
    { label: "7 Days", hours: 24 * 7 },
    { label: "30 Days", hours: 24 * 30 },
] as const;

const selectedRange = ref(timeRanges[0]);
const targetPoints = 100; // Resolution requested from API

// API Types
interface DataPoint {
    Timestamp: number;
    Value: number;
}

interface StatsResponse {
    Cpu: DataPoint[];
    Mem: DataPoint[];
    NetOut: DataPoint[];
    NetIn: DataPoint[];
    DiskW: DataPoint[];
    DiskR: DataPoint[];
    ENCQualityQueue: DataPoint[];
    ENCAudioQueue: DataPoint[];
    ENCSubtitleQueue: DataPoint[];
}

const chartData = ref<StatsResponse | null>(null);

// Latest Values for Summary
const latestValues = computed(() => {
    const d = chartData.value;
    if (!d) return { cpu: null, mem: null, netIn: null, netOut: null, enc: null };
    
    const getLast = (arr: DataPoint[]) => arr.length ? arr[arr.length - 1].Value : 0;
    
    return {
        cpu: getLast(d.Cpu),
        mem: getLast(d.Mem),
        netIn: getLast(d.NetIn),
        netOut: getLast(d.NetOut),
        enc: getLast(d.ENCQualityQueue) + getLast(d.ENCAudioQueue) + getLast(d.ENCSubtitleQueue)
    };
});

const hasData = computed(() => chartData.value && chartData.value.Cpu.length > 0);

// --- Chart Series ---
// Helpers to format for Apex: [[timestamp, value], ...]
const toSeriesData = (points: DataPoint[]) => points ? points.map(p => [p.Timestamp, p.Value]) : [];

const CPUserie = computed(() => [{
    name: 'CPU Load',
    data: toSeriesData(chartData.value?.Cpu || [])
}]);

const MEMserie = computed(() => [{
    name: 'Memory Usage',
    data: toSeriesData(chartData.value?.Mem || [])
}]);

const NETserie = computed(() => [
    { name: 'Inbound', data: toSeriesData(chartData.value?.NetIn || []) },
    { name: 'Outbound', data: toSeriesData(chartData.value?.NetOut || []) }
]);

const ENCserie = computed(() => [
    { name: 'Video', data: toSeriesData(chartData.value?.ENCQualityQueue || []) },
    { name: 'Audio', data: toSeriesData(chartData.value?.ENCAudioQueue || []) },
    { name: 'Subtitles', data: toSeriesData(chartData.value?.ENCSubtitleQueue || []) }
]);

// --- Chart Options ---
const { theme } = useTheme();

const commonChartOptions = computed<ApexOptions>(() => {
    const isDark = theme.value === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(128, 128, 128, 0.1)';
    const labelColor = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(128, 128, 128, 0.6)';

    return {
        chart: {
            animations: { enabled: false },
            toolbar: { show: false },
            zoom: { enabled: false },
            fontFamily: 'inherit',
            background: 'transparent',
            type: 'area' // Default type
        },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        grid: {
            borderColor: gridColor,
            strokeDashArray: 4,
            xaxis: { lines: { show: false } }
        },
        xaxis: {
            type: 'datetime', // Key change for new API
            tooltip: { enabled: false },
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: { 
                datetimeUTC: false,
                style: { colors: labelColor, fontSize: '11px' },
                datetimeFormatter: {
                    year: 'yyyy',
                    month: "MMM 'yy",
                    day: 'dd MMM',
                    hour: 'HH:mm'
                }
            }
        },
        legend: { 
            show: true, 
            position: 'top', 
            horizontalAlign: 'right',
            labels: { colors: labelColor }
        },
        theme: { mode: isDark ? 'dark' : 'light' },
        tooltip: { theme: isDark ? 'dark' : 'light', x: { format: 'dd MMM HH:mm' } }
    };
});

const CPUoptions = computed<ApexOptions>(() => ({
    ...commonChartOptions.value,
    chart: { ...commonChartOptions.value.chart, id: 'cpu-chart', type: 'area' },
    colors: ['#ef4444'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
    yaxis: { 
        max: 100, 
        labels: { 
            formatter: (val) => `${Math.round(val)}%`,
            style: { colors: commonChartOptions.value.xaxis?.labels?.style?.colors }
        } 
    },
}));

const MEMoptions = computed<ApexOptions>(() => ({
    ...commonChartOptions.value,
    chart: { ...commonChartOptions.value.chart, id: 'mem-chart', type: 'area' },
    colors: ['#a855f7'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
    yaxis: { 
        max: 100, 
        labels: { 
            formatter: (val) => `${Math.round(val)}%`,
            style: { colors: commonChartOptions.value.xaxis?.labels?.style?.colors }
        } 
    },
}));

const NETINoptions = computed<ApexOptions>(() => ({
    ...commonChartOptions.value,
    chart: { ...commonChartOptions.value.chart, id: 'net-chart', type: 'line' },
    colors: ['#22c55e', '#3b82f6'],
    yaxis: { 
        labels: { 
            formatter: (val) => humanFileSize(val),
            style: { colors: commonChartOptions.value.xaxis?.labels?.style?.colors }
        } 
    },
}));

const ENCoptions = computed<ApexOptions>(() => ({
    ...commonChartOptions.value,
    chart: { ...commonChartOptions.value.chart, id: 'enc-chart', type: 'bar', stacked: true },
    colors: ['#f59e0b', '#10b981', '#6366f1'],
    yaxis: { 
        labels: { 
            formatter: (val) => `${Math.round(val)}`,
            style: { colors: commonChartOptions.value.xaxis?.labels?.style?.colors }
        } 
    },
}));

// --- Data Fetching ---
async function load() {
    isLoading.value = true;
    try {
        const to = dayjs();
        const from = to.subtract(selectedRange.value.hours, 'hour');

        const data = await $fetch<StatsResponse>(`${conf.public.apiUrl}/stats`, {
            headers: { Authorization: `Bearer ${token.value}` },
            query: { 
                from: from.toISOString(),
                to: to.toISOString(),
                points: targetPoints
            }
        });
        
        if (data) {
            chartData.value = data;
        } else {
            err.value = "No data found";
        }
    } catch (error: any) {
        err.value = `${error?.data || error.message}`;
    } finally {
        isLoading.value = false;
    }
}

watch(selectedRange, () => {
    load();
});

// --- Utils ---
function humanFileSize(bytes: number, si = false, dp = 1) {
    const thresh = si ? 1000 : 1024;
    if (Math.abs(bytes) < thresh) return bytes + ' B';
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

// Initial Load
onMounted(() => {
    load();
});
</script>