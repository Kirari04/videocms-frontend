<template>
    <div class="flex flex-col gap-8">
        <!-- One time range scopes every history chart on this page -->
        <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-base font-semibold tracking-tight">Node health</h2>
            <div class="flex items-center gap-2">
                <TimeRangeSelect v-model="rangeHours" />
                <button
                    class="btn btn-square btn-ghost btn-xs"
                    @click="load()"
                    :disabled="isLoading"
                    aria-label="Refresh">
                    <Icon name="lucide:refresh-cw" class="h-3.5 w-3.5" :class="{ 'animate-spin': isLoading }" />
                </button>
            </div>
        </div>

        <!-- Health strip: latest real values on one surface -->
        <section
            class="-mt-4 grid grid-cols-2 divide-y divide-base-300 rounded-box border border-base-300 bg-base-100 lg:grid-cols-4 lg:divide-y-0 lg:divide-x">
            <div class="flex flex-col gap-1 p-4 max-lg:border-b max-lg:border-base-300 lg:border-0">
                <span class="text-xs text-base-content/70">CPU</span>
                <span v-if="hasData" class="text-2xl font-semibold">{{ Math.round(latestValues.cpu || 0) }}%</span>
                <div v-else class="skeleton h-8 w-16" aria-hidden="true"></div>
            </div>
            <div class="flex flex-col gap-1 p-4 max-lg:border-b max-lg:border-base-300 lg:border-0">
                <span class="text-xs text-base-content/70">Memory</span>
                <span v-if="hasData" class="text-2xl font-semibold">{{ Math.round(latestValues.mem || 0) }}%</span>
                <div v-else class="skeleton h-8 w-16" aria-hidden="true"></div>
            </div>
            <div class="flex flex-col gap-1 p-4">
                <span class="text-xs text-base-content/70">Network ↓ / ↑</span>
                <span v-if="hasData" class="text-2xl font-semibold">
                    {{ humanFileSize(latestValues.netIn || 0) }}/s
                    <span class="text-sm font-normal text-base-content/60">· {{ humanFileSize(latestValues.netOut || 0) }}/s</span>
                </span>
                <div v-else class="skeleton h-8 w-28" aria-hidden="true"></div>
            </div>
            <div class="flex flex-col gap-1 p-4">
                <span class="text-xs text-base-content/70">Encoding queue</span>
                <span v-if="hasData" class="text-2xl font-semibold">
                    {{ Math.round(latestValues.enc || 0) }}
                    <span class="text-sm font-normal text-base-content/60">jobs</span>
                </span>
                <div v-else class="skeleton h-8 w-16" aria-hidden="true"></div>
            </div>
        </section>

        <!-- Node performance charts -->
        <section class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <StatsChart title="CPU usage" :loading="isLoading" :has-data="hasData" :err="err">
                <apexchart height="100%" width="100%" :options="CPUoptions" :series="CPUserie" />
            </StatsChart>
            <StatsChart title="Memory usage" :loading="isLoading" :has-data="hasData" :err="err">
                <apexchart height="100%" width="100%" :options="MEMoptions" :series="MEMserie" />
            </StatsChart>
            <StatsChart title="Network I/O" :loading="isLoading" :has-data="hasData" :err="err">
                <apexchart height="100%" width="100%" :options="NEToptions" :series="NETserie" />
            </StatsChart>
            <StatsChart title="Encoding queue" :loading="isLoading" :has-data="hasData" :err="err">
                <apexchart height="100%" width="100%" :options="ENCoptions" :series="ENCserie" />
            </StatsChart>
        </section>

        <!-- Global traffic -->
        <section class="flex flex-col gap-4">
            <h2 class="text-base font-semibold tracking-tight">Traffic</h2>
            <TrafficChart mode="global" type="download" :hours="rangeHours" :height="280" />
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TrafficChart mode="global" type="upload" :hours="rangeHours" />
                <TrafficChart mode="global" type="encoding" :hours="rangeHours" />
            </div>
        </section>

        <!-- Top consumers -->
        <section class="flex flex-col gap-4">
            <h2 class="text-base font-semibold tracking-tight">Top consumers</h2>
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <TopTraffic mode="users" type="traffic" :is-admin-view="true" :hours="rangeHours" />
                <TopTraffic mode="users" type="storage" :is-admin-view="true" />
                <TopTraffic mode="users" type="encoding" :is-admin-view="true" :hours="rangeHours" />
            </div>
        </section>

        <!-- Remote downloader -->
        <section v-if="serverConfig.RemoteDownloadEnabled" class="flex flex-col gap-4">
            <h2 class="text-base font-semibold tracking-tight">Remote downloader</h2>
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TrafficChart mode="global" type="remote-download" :hours="rangeHours" />
                <TrafficChart mode="global" type="remote-download-duration" :hours="rangeHours" />
                <TopStats
                    endpoint="/stats/remote-download/top?mode=users"
                    title="Top users by remote bandwidth"
                    formatter="bytes" />
                <TopStats
                    endpoint="/stats/remote-download/top?mode=duration"
                    title="Top users by remote download time"
                    formatter="duration" />
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import type { ApexOptions } from 'apexcharts';
import dayjs from 'dayjs';

const conf = useRuntimeConfig();
const token = useToken();
const serverConfig = useServerConfig();
const err = ref("");
const isLoading = ref(false);

const rangeHours = ref(24);
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

const hasData = computed(() => !!chartData.value && chartData.value.Cpu.length > 0);

// --- Chart Series ---
const toSeriesData = (points: DataPoint[]) => points ? points.map(p => [p.Timestamp, p.Value]) : [];

const CPUserie = computed(() => [{
    name: 'CPU load',
    data: toSeriesData(chartData.value?.Cpu || [])
}]);

const MEMserie = computed(() => [{
    name: 'Memory usage',
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
const palette = useChartPalette();
const baseOptions = useChartBaseOptions();

const percentAxis = computed(() => ({
    max: 100,
    labels: {
        formatter: (val: number) => `${Math.round(val)}%`,
        style: { colors: palette.value.label, fontSize: '11px' },
    },
}));

const CPUoptions = computed<ApexOptions>(() => ({
    ...baseOptions.value,
    chart: { ...baseOptions.value.chart, id: 'cpu-chart', type: 'area' },
    colors: [palette.value.series[0]],
    fill: areaFill,
    yaxis: percentAxis.value,
}));

const MEMoptions = computed<ApexOptions>(() => ({
    ...baseOptions.value,
    chart: { ...baseOptions.value.chart, id: 'mem-chart', type: 'area' },
    colors: [palette.value.series[0]],
    fill: areaFill,
    yaxis: percentAxis.value,
}));

const NEToptions = computed<ApexOptions>(() => ({
    ...baseOptions.value,
    chart: { ...baseOptions.value.chart, id: 'net-chart', type: 'line' },
    colors: [palette.value.series[0], palette.value.series[1]],
    legend: { ...baseOptions.value.legend, show: true },
    yaxis: {
        labels: {
            formatter: (val: number) => humanFileSize(val),
            style: { colors: palette.value.label, fontSize: '11px' },
        },
    },
    tooltip: {
        ...baseOptions.value.tooltip,
        y: { formatter: (val: number) => `${humanFileSize(val)}/s` },
    },
}));

const ENCoptions = computed<ApexOptions>(() => ({
    ...baseOptions.value,
    chart: { ...baseOptions.value.chart, id: 'enc-chart', type: 'bar', stacked: true },
    colors: [palette.value.series[0], palette.value.series[1], palette.value.series[2]],
    legend: { ...baseOptions.value.legend, show: true },
    plotOptions: {
        bar: { columnWidth: '55%' },
    },
    yaxis: {
        labels: {
            formatter: (val: number) => `${Math.round(val)}`,
            style: { colors: palette.value.label, fontSize: '11px' },
        },
    },
}));

// --- Data Fetching ---
async function load() {
    isLoading.value = true;
    try {
        const to = dayjs();
        const from = to.subtract(rangeHours.value, 'hour');

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
            err.value = "";
        } else {
            err.value = "No data found";
        }
    } catch (error: any) {
        err.value = `${error?.data || error.message}`;
    } finally {
        isLoading.value = false;
    }
}

watch(rangeHours, () => {
    load();
});

onMounted(() => {
    load();
});
</script>
