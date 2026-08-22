<template>
    <div class="overflow-hidden rounded-box border border-base-300 bg-base-100">
        <div v-if="recorderNeedsAttention" role="alert"
            class="flex items-start gap-3 border-b border-warning/35 bg-warning/10 p-4 text-sm">
            <Icon name="lucide:triangle-alert" class="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div class="min-w-0">
                <p class="font-medium">Delivery statistics need attention</p>
                <p class="mt-1 text-base-content/75">
                    Playback is unaffected. VideoCMS will keep retrying buffered traffic updates.
                    <template v-if="deliveryData?.TrafficRecorder.DroppedEvents">
                        {{ formatNumber(deliveryData.TrafficRecorder.DroppedEvents) }} events could not be retained,
                        so totals for this period may be incomplete.
                    </template>
                </p>
                <p v-if="deliveryData?.TrafficRecorder.LastError"
                    class="mt-2 break-all font-mono text-xs text-base-content/70">
                    Last write error: {{ deliveryData.TrafficRecorder.LastError }}
                </p>
            </div>
        </div>

        <div class="border-b border-base-300 p-4">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                    <h3 class="text-sm font-medium">Cache effectiveness</h3>
                    <p class="mt-0.5 text-xs text-base-content/70">Primary storage and read-cache delivery over time.</p>
                </div>
                <span v-if="deliveryData?.Summary.Requests" class="text-xs tabular-nums text-base-content/70">
                    {{ formatNumber(deliveryData.Summary.Requests) }} requests
                </span>
            </div>

            <div v-if="deliveryData" class="mt-4 grid grid-cols-2 border-y border-base-300 lg:grid-cols-4">
                <div class="border-r border-b border-base-300 py-3 pr-3 lg:border-b-0 lg:pr-4">
                    <p class="text-xs text-base-content/70">Delivered</p>
                    <p class="mt-1 text-lg font-semibold tabular-nums">{{ formatBytes(deliveryData.Summary.Bytes) }}</p>
                </div>
                <div class="border-b border-base-300 py-3 pl-3 lg:border-r lg:border-b-0 lg:px-4">
                    <p class="text-xs text-base-content/70">Cache share</p>
                    <p class="mt-1 text-lg font-semibold tabular-nums">{{ formatPercent(cacheShare(deliveryData.Summary)) }}</p>
                    <p class="text-xs text-base-content/70">{{ formatBytes(deliveryData.Summary.CacheBytes) }} served from cache</p>
                </div>
                <div class="border-r border-base-300 py-3 pr-3 lg:px-4">
                    <p class="text-xs text-base-content/70">Primary storage</p>
                    <p class="mt-1 text-lg font-semibold tabular-nums">{{ formatBytes(deliveryData.Summary.OriginBytes) }}</p>
                </div>
                <div class="py-3 pl-3 lg:pl-4">
                    <p class="text-xs text-base-content/70">Cached requests</p>
                    <p class="mt-1 text-lg font-semibold tabular-nums">{{ formatPercent(cacheRequestShare(deliveryData.Summary)) }}</p>
                    <p class="text-xs text-base-content/70">{{ formatNumber(deliveryData.Summary.CacheRequests) }} cache responses</p>
                </div>
            </div>

            <div class="relative mt-4 h-72">
                <div v-if="isLoading && !deliveryData" class="skeleton h-full w-full rounded-selector" aria-hidden="true"></div>
                <div v-else-if="err && !deliveryData" class="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <Icon name="lucide:triangle-alert" class="h-6 w-6 text-error" />
                    <p class="max-w-[42ch] text-sm text-error">{{ err }}</p>
                    <button class="btn btn-ghost btn-xs" @click="load">Retry</button>
                </div>
                <div v-else-if="isEmpty" class="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <Icon name="lucide:database-zap" class="h-7 w-7 text-base-content/30" />
                    <p class="text-sm font-medium">No attributed storage traffic in this period</p>
                    <p class="max-w-[48ch] text-xs text-base-content/70">
                        {{ deliveryData?.CacheConfigured
                            ? 'Play a stored video to see primary and cached delivery here.'
                            : 'Configure a read cache on the Storage page to reduce repeated reads from primary storage.' }}
                    </p>
                    <NuxtLink v-if="!deliveryData?.CacheConfigured" to="/my/storage" class="btn btn-ghost btn-xs mt-1">
                        Open storage
                    </NuxtLink>
                </div>
                <div v-else-if="deliveryData" class="h-full w-full transition-opacity duration-(--motion-fast)"
                    :class="{ 'opacity-50': isLoading }">
                    <apexchart height="100%" width="100%" :options="chartOptions" :series="chartSeries" />
                </div>
            </div>
        </div>

        <div v-if="deliveryData && !isEmpty" class="p-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 class="text-sm font-medium">Storage attribution</h3>
                    <p class="mt-0.5 text-xs text-base-content/70">Where delivered bytes were routed during this period.</p>
                </div>
                <div role="tablist" aria-label="Storage attribution grouping" class="join">
                    <button role="tab" class="btn btn-xs join-item"
                        :class="breakdownMode === 'pools' ? 'btn-active' : 'btn-ghost'"
                        :aria-selected="breakdownMode === 'pools'" @click="breakdownMode = 'pools'">
                        Pools
                    </button>
                    <button role="tab" class="btn btn-xs join-item"
                        :class="breakdownMode === 'mounts' ? 'btn-active' : 'btn-ghost'"
                        :aria-selected="breakdownMode === 'mounts'" @click="breakdownMode = 'mounts'">
                        Mounts
                    </button>
                </div>
            </div>

            <div v-if="!breakdownRows.length" class="mt-3 flex items-center gap-2 border-y border-base-300 py-4 text-sm text-base-content/70">
                <Icon name="lucide:info" class="h-4 w-4 shrink-0" />
                No {{ breakdownMode === 'pools' ? 'pool' : 'mount' }} attribution is available for this period.
            </div>

            <div v-else class="mt-3 divide-y divide-base-300 border-y border-base-300 sm:hidden">
                <div v-for="row in breakdownRows" :key="`mobile-${row.key}`" class="py-3">
                    <div class="flex items-start justify-between gap-3">
                        <div class="flex min-w-0 items-center gap-2">
                            <Icon :name="row.icon" class="h-4 w-4 shrink-0 text-base-content/70" />
                            <div class="min-w-0">
                                <p class="truncate text-sm font-medium">{{ row.name }}</p>
                                <p v-if="row.detail" class="truncate text-[11px] text-base-content/70">{{ row.detail }}</p>
                            </div>
                        </div>
                        <div class="shrink-0 text-right">
                            <p class="text-sm font-medium tabular-nums">{{ formatBytes(row.traffic.Bytes) }}</p>
                            <p class="text-[11px] tabular-nums text-base-content/70">{{ formatPercent(cacheShare(row.traffic)) }} cached</p>
                        </div>
                    </div>
                    <div class="mt-2 h-1 overflow-hidden rounded-full bg-base-300" aria-hidden="true">
                        <div class="h-full rounded-full bg-primary/70" :style="{ width: `${row.totalShare}%` }"></div>
                    </div>
                    <div class="mt-2 flex items-center justify-between gap-3 text-[11px] text-base-content/70">
                        <span>{{ formatBytes(row.traffic.CacheBytes) }} cache · {{ formatBytes(row.traffic.OriginBytes) }} primary</span>
                        <span class="shrink-0 tabular-nums">{{ formatNumber(row.traffic.Requests) }} requests</span>
                    </div>
                </div>
            </div>

            <div v-if="breakdownRows.length" class="mt-3 hidden overflow-x-auto sm:block">
                <table class="table table-sm">
                    <thead>
                        <tr class="border-base-300 text-xs text-base-content/70">
                            <th class="font-medium">{{ breakdownMode === 'pools' ? 'Pool' : 'Mount' }}</th>
                            <th class="font-medium">Delivered</th>
                            <th class="font-medium">Requests</th>
                            <th class="text-right font-medium">Cache share</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in breakdownRows" :key="row.key" class="border-base-300">
                            <td class="min-w-48">
                                <div class="flex items-center gap-2">
                                    <Icon :name="row.icon" class="h-4 w-4 shrink-0 text-base-content/70" />
                                    <div class="min-w-0">
                                        <p class="truncate text-sm font-medium">{{ row.name }}</p>
                                        <p v-if="row.detail" class="truncate text-[11px] text-base-content/70">{{ row.detail }}</p>
                                    </div>
                                </div>
                                <div class="mt-2 h-1 overflow-hidden rounded-full bg-base-300" aria-hidden="true">
                                    <div class="h-full rounded-full bg-primary/70" :style="{ width: `${row.totalShare}%` }"></div>
                                </div>
                            </td>
                            <td class="tabular-nums">
                                <p class="text-sm font-medium">{{ formatBytes(row.traffic.Bytes) }}</p>
                                <p class="text-[11px] text-base-content/70">
                                    {{ formatBytes(row.traffic.CacheBytes) }} cache · {{ formatBytes(row.traffic.OriginBytes) }} primary
                                </p>
                            </td>
                            <td class="text-sm tabular-nums">{{ formatNumber(row.traffic.Requests) }}</td>
                            <td class="text-right text-sm font-medium tabular-nums">{{ formatPercent(cacheShare(row.traffic)) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ApexOptions } from 'apexcharts';
import dayjs from 'dayjs';

const props = withDefaults(defineProps<{
    hours?: number;
}>(), {
    hours: 24,
});

interface StorageTraffic {
    Bytes: number;
    Requests: number;
    OriginBytes: number;
    OriginRequests: number;
    CacheBytes: number;
    CacheRequests: number;
}

interface StorageDeliveryPoint {
    Timestamp: number;
    OriginBytes: number;
    OriginRequests: number;
    CacheBytes: number;
    CacheRequests: number;
}

interface PoolBreakdown {
    ID: number;
    Name: string;
    Traffic: StorageTraffic;
}

interface MountBreakdown {
    UUID: string;
    Name: string;
    Provider: string;
    Traffic: StorageTraffic;
}

interface TrafficRecorderStatus {
    PendingBuckets: number;
    DroppedEvents: number;
    FlushFailures: number;
    FlushedRequests: number;
    LastFlushAt?: string | null;
    LastError: string;
}

interface StorageDeliveryResponse {
    Traffic: StorageDeliveryPoint[];
    Summary: StorageTraffic;
    Pools: PoolBreakdown[];
    Mounts: MountBreakdown[];
    CacheConfigured: boolean;
    TrafficRecorder: TrafficRecorderStatus;
}

interface BreakdownRow {
    key: string;
    name: string;
    detail: string;
    icon: string;
    traffic: StorageTraffic;
    totalShare: number;
}

const conf = useRuntimeConfig();
const token = useToken();
const palette = useChartPalette();
const baseOptions = useChartBaseOptions();
const deliveryData = ref<StorageDeliveryResponse | null>(null);
const isLoading = ref(false);
const err = ref('');
const breakdownMode = ref<'pools' | 'mounts'>('pools');

const recorderNeedsAttention = computed(() =>
    !!deliveryData.value?.TrafficRecorder.LastError || !!deliveryData.value?.TrafficRecorder.DroppedEvents);

const isEmpty = computed(() =>
    !!deliveryData.value && deliveryData.value.Summary.Requests === 0);

const chartSeries = computed(() => [
    {
        name: 'Primary storage',
        data: deliveryData.value?.Traffic.map(point => [point.Timestamp, point.OriginBytes]) || [],
    },
    {
        name: 'Read cache',
        data: deliveryData.value?.Traffic.map(point => [point.Timestamp, point.CacheBytes]) || [],
    },
]);

const chartOptions = computed<ApexOptions>(() => ({
    ...baseOptions.value,
    chart: {
        ...baseOptions.value.chart,
        id: 'storage-delivery-chart',
        type: 'area',
        stacked: true,
    },
    colors: [palette.value.series[0], palette.value.series[1]],
    fill: areaFill,
    legend: { ...baseOptions.value.legend, show: true },
    yaxis: {
        labels: {
            formatter: (value: number) => formatBytes(value),
            style: { colors: palette.value.label, fontSize: '11px' },
        },
    },
    tooltip: {
        ...baseOptions.value.tooltip,
        shared: true,
        intersect: false,
        custom: ({ series, dataPointIndex }) => {
            const origin = series[0]?.[dataPointIndex] || 0;
            const cache = series[1]?.[dataPointIndex] || 0;
            const point = deliveryData.value?.Traffic[dataPointIndex];
            const date = point ? dayjs(point.Timestamp).format('MMM D, HH:mm') : '';
            const requests = (point?.OriginRequests || 0) + (point?.CacheRequests || 0);
            return `
                <div style="min-width: 190px; padding: 10px 12px; color: var(--color-base-content); background: var(--color-base-100); font-size: 12px">
                    <div style="margin-bottom: 7px; color: color-mix(in oklab, var(--color-base-content) 70%, transparent)">${date}</div>
                    <div style="display: flex; justify-content: space-between; gap: 20px"><span>Primary storage</span><strong>${formatBytes(origin)}</strong></div>
                    <div style="display: flex; justify-content: space-between; gap: 20px; margin-top: 4px"><span>Read cache</span><strong>${formatBytes(cache)}</strong></div>
                    <div style="display: flex; justify-content: space-between; gap: 20px; margin-top: 7px; padding-top: 7px; border-top: 1px solid color-mix(in oklab, var(--color-base-content) 18%, transparent)"><span>${formatNumber(requests)} requests</span><strong>${formatPercent(cache + origin ? cache / (cache + origin) * 100 : 0)} cached</strong></div>
                </div>
            `;
        },
    },
}));

const breakdownRows = computed<BreakdownRow[]>(() => {
    const source = breakdownMode.value === 'pools'
        ? (deliveryData.value?.Pools || []).map(pool => ({
            key: `pool-${pool.ID}`,
            name: pool.Name,
            detail: '',
            icon: 'lucide:layers-3',
            traffic: pool.Traffic,
        }))
        : (deliveryData.value?.Mounts || []).map(mount => ({
            key: `mount-${mount.UUID}`,
            name: mount.Name,
            detail: providerLabel(mount.Provider),
            icon: providerIcon(mount.Provider),
            traffic: mount.Traffic,
        }));
    const maxBytes = Math.max(...source.map(row => row.traffic.Bytes), 1);
    return source.map(row => ({
        ...row,
        totalShare: Math.max(2, row.traffic.Bytes / maxBytes * 100),
    }));
});

async function load() {
    isLoading.value = true;
    err.value = '';
    try {
        const to = dayjs();
        const from = to.subtract(props.hours, 'hour');
        deliveryData.value = await $fetch<StorageDeliveryResponse>(`${conf.public.apiUrl}/stats/storage/delivery`, {
            headers: { Authorization: `Bearer ${token.value}` },
            query: { from: from.toISOString(), to: to.toISOString(), points: 100 },
        });
    } catch (error: any) {
        err.value = error?.data?.message || error?.data || error?.message || 'Failed to load storage delivery statistics';
    } finally {
        isLoading.value = false;
    }
}

function cacheShare(traffic: StorageTraffic) {
    return traffic.Bytes ? traffic.CacheBytes / traffic.Bytes * 100 : 0;
}

function cacheRequestShare(traffic: StorageTraffic) {
    return traffic.Requests ? traffic.CacheRequests / traffic.Requests * 100 : 0;
}

function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatNumber(value: number) {
    return new Intl.NumberFormat().format(value);
}

function formatPercent(value: number) {
    return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)}%`;
}

function providerLabel(provider: string) {
    if (provider === 's3') return 'S3';
    if (provider === 'sftp') return 'SFTP';
    if (provider === 'local') return 'Local storage';
    return provider || 'Removed mount';
}

function providerIcon(provider: string) {
    if (provider === 's3') return 'lucide:cloud';
    if (provider === 'sftp') return 'lucide:server';
    return 'lucide:hard-drive';
}

watch(() => props.hours, load);
onMounted(load);
</script>
