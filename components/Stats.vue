<template>
    <div class="flex flex-col gap-6">
        <!-- Compact Header & Global Controls -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-base-100 p-4 rounded-2xl shadow-sm border border-base-200">
            <div class="flex items-center gap-4">
                <div class="bg-primary/10 p-2 rounded-xl">
                    <Icon name="lucide:bar-chart-3" class="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h2 class="text-lg font-bold">System Analytics</h2>
                    <p class="text-xs opacity-50 font-medium">Real-time performance and usage monitoring</p>
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
                <div class="join bg-base-200/50 p-1 rounded-xl">
                    <button 
                        v-for="range in timeRanges" 
                        :key="range.label" 
                        @click="selectedRange = range"
                        class="btn btn-sm join-item border-none"
                        :class="selectedRange.label === range.label ? 'btn-primary shadow-lg' : 'btn-ghost'"
                    >
                        {{ range.label }}
                    </button>
                </div>
                
                <div class="divider divider-horizontal mx-0 hidden md:flex"></div>

                <button class="btn btn-sm btn-circle btn-ghost" @click="load()" :disabled="isLoading">
                    <Icon name="lucide:refresh-cw" class="w-4 h-4" :class="{'animate-spin': isLoading}" />
                </button>
            </div>
        </div>

        <!-- KPI Summary Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="stats shadow-sm border border-base-200 bg-base-100 overflow-hidden">
                <div class="stat p-4">
                    <div class="stat-title text-[10px] uppercase font-bold opacity-50">Active Jobs</div>
                    <div class="stat-value text-2xl text-warning">{{ Math.round(latestValues.enc || 0) }}</div>
                    <div class="stat-desc text-[10px]">Encoding Queue</div>
                </div>
            </div>
            <div class="stats shadow-sm border border-base-200 bg-base-100 overflow-hidden">
                <div class="stat p-4">
                    <div class="stat-title text-[10px] uppercase font-bold opacity-50">CPU Load</div>
                    <div class="stat-value text-2xl text-primary">{{ Math.round(latestValues.cpu || 0) }}%</div>
                    <div class="stat-desc text-[10px]">Avg Usage</div>
                </div>
            </div>
            <div class="stats shadow-sm border border-base-200 bg-base-100 overflow-hidden">
                <div class="stat p-4">
                    <div class="stat-title text-[10px] uppercase font-bold opacity-50">Network In</div>
                    <div class="stat-value text-2xl text-success">{{ humanFileSize(latestValues.netIn || 0) }}/s</div>
                    <div class="stat-desc text-[10px]">Current Ingress</div>
                </div>
            </div>
            <div class="stats shadow-sm border border-base-200 bg-base-100 overflow-hidden">
                <div class="stat p-4">
                    <div class="stat-title text-[10px] uppercase font-bold opacity-50">Network Out</div>
                    <div class="stat-value text-2xl text-info">{{ humanFileSize(latestValues.netOut || 0) }}/s</div>
                    <div class="stat-desc text-[10px]">Current Egress</div>
                </div>
            </div>
        </div>

        <!-- Tab System -->
        <div class="tabs tabs-boxed bg-base-100 self-start p-1 border border-base-200 shadow-sm rounded-xl">
            <button 
                v-for="tab in tabs" 
                :key="tab.id"
                @click="activeTab = tab.id"
                class="tab transition-all"
                :class="{'tab-active !bg-primary !text-primary-content font-bold': activeTab === tab.id}"
            >
                <Icon :name="tab.icon" class="w-4 h-4 mr-2" />
                {{ tab.label }}
            </button>
        </div>

        <!-- Tab Content -->
        <div class="flex flex-col gap-6">
            
            <!-- Tab: Global Traffic & Processing -->
            <div v-if="activeTab === 'traffic'" class="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
                <TrafficChart mode="global" type="download" />
                <TrafficChart mode="global" type="upload" />
                <TrafficChart mode="global" type="encoding" class="lg:col-span-2" />
            </div>

            <!-- Tab: Analytics & Rankings -->
            <div v-if="activeTab === 'rankings'" class="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
                <TopTraffic mode="users" type="traffic" :is-admin-view="true" />
                <TopTraffic mode="users" type="upload" :is-admin-view="true" />
                <TopTraffic mode="users" type="encoding" :is-admin-view="true" />
                <TopTraffic mode="users" type="storage" :is-admin-view="true" />
            </div>

            <!-- Tab: Node Performance -->
            <div v-if="activeTab === 'performance'" class="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- CPU -->
                    <div class="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
                        <div class="card-body p-4">
                            <h3 class="card-title text-sm flex justify-between items-center">
                                <span class="flex items-center gap-2">
                                    <Icon name="lucide:cpu" class="w-4 h-4 text-primary" />
                                    CPU Usage
                                </span>
                                <span class="text-xs font-mono opacity-50">{{ Math.round(latestValues.cpu || 0) }}%</span>
                            </h3>
                            <div class="h-62.5 w-full">
                                <apexchart key="cpu-chart" height="100%" width="100%" :options="CPUoptions" :series="CPUserie" />
                            </div>
                        </div>
                    </div>

                    <!-- Memory -->
                    <div class="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
                        <div class="card-body p-4">
                            <h3 class="card-title text-sm flex justify-between items-center">
                                <span class="flex items-center gap-2">
                                    <Icon name="lucide:memory-stick" class="w-4 h-4 text-secondary" />
                                    Memory Usage
                                </span>
                                <span class="text-xs font-mono opacity-50">{{ Math.round(latestValues.mem || 0) }}%</span>
                            </h3>
                            <div class="h-62.5 w-full">
                                <apexchart key="mem-chart" height="100%" width="100%" :options="MEMoptions" :series="MEMserie" />
                            </div>
                        </div>
                    </div>

                    <!-- Network -->
                    <div class="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
                        <div class="card-body p-4">
                            <h3 class="card-title text-sm flex justify-between items-center">
                                <span class="flex items-center gap-2">
                                    <Icon name="lucide:network" class="w-4 h-4 text-accent" />
                                    Network I/O
                                </span>
                                <span class="text-xs font-mono opacity-50">
                                    ↓ {{ humanFileSize(latestValues.netIn || 0) }}/s • ↑ {{ humanFileSize(latestValues.netOut || 0) }}/s
                                </span>
                            </h3>
                            <div class="h-62.5 w-full">
                                <apexchart key="net-chart" height="100%" width="100%" :options="NETINoptions" :series="NETserie" />
                            </div>
                        </div>
                    </div>

                    <!-- Encoding Queue -->
                    <div class="card bg-base-100 shadow-sm border border-base-200 overflow-hidden">
                        <div class="card-body p-4">
                            <h3 class="card-title text-sm flex justify-between items-center">
                                <span class="flex items-center gap-2">
                                    <Icon name="lucide:film" class="w-4 h-4 text-warning" />
                                    Encoding Queue
                                </span>
                                <span class="text-xs font-mono opacity-50">
                                    {{ Math.round(latestValues.enc || 0) }} Jobs
                                </span>
                            </h3>
                            <div class="h-62.5 w-full">
                                <apexchart key="enc-chart" height="100%" width="100%" :options="ENCoptions" :series="ENCserie" />
                            </div>
                        </div>
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
const isLoading = ref(false);

const tabs = [
    { id: 'traffic', label: 'Network & Compute', icon: 'lucide:activity' },
    { id: 'rankings', label: 'Rankings & Analytics', icon: 'lucide:trending-up' },
    { id: 'performance', label: 'Node Performance', icon: 'lucide:gauge' },
] as const;

const activeTab = ref<typeof tabs[number]['id']>('traffic');

// Time Ranges
const timeRanges = [
    { label: "3H", hours: 3 },
    { label: "24H", hours: 24 },
    { label: "7D", hours: 24 * 7 },
    { label: "30D", hours: 24 * 30 },
] as const;

type TimeRange = (typeof timeRanges)[number];
const selectedRange = ref<TimeRange>(timeRanges[1]);
const targetPoints = 100;

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
            type: 'area'
        },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        grid: {
            borderColor: gridColor,
            strokeDashArray: 4,
            xaxis: { lines: { show: false } }
        },
        xaxis: {
            type: 'datetime',
            tooltip: { enabled: false },
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: { 
                datetimeUTC: false,
                style: { colors: labelColor, fontSize: '10px' },
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
            style: { colors: commonChartOptions.value.xaxis?.labels?.style?.colors || 'gray' }
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
            style: { colors: commonChartOptions.value.xaxis?.labels?.style?.colors || 'gray' }
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
            style: { colors: commonChartOptions.value.xaxis?.labels?.style?.colors || 'gray' }
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
            style: { colors: commonChartOptions.value.xaxis?.labels?.style?.colors || 'gray' }
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

onMounted(() => {
    load();
});
</script>