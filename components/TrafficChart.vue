<template>
    <div class="flex flex-col rounded-box border border-base-300 bg-base-100 p-4">
        <div class="mb-3 flex items-baseline justify-between gap-3">
            <h3 class="text-sm font-medium">{{ title }}</h3>
            <span v-if="latestValue !== null" class="text-sm tabular-nums text-base-content/70">
                {{ formatValue(latestValue) }}
            </span>
        </div>

        <div class="relative" :style="{ height: `${height}px` }">
            <!-- First load: skeleton shaped like the chart -->
            <div v-if="isLoading && !trafficData" class="skeleton h-full w-full rounded-selector"></div>

            <!-- Error -->
            <div v-else-if="err" class="flex h-full flex-col items-center justify-center gap-2 text-center">
                <p class="max-w-[36ch] text-sm text-error">{{ err }}</p>
                <button class="btn btn-ghost btn-xs" @click="load()">Retry</button>
            </div>

            <!-- Empty -->
            <div v-else-if="isEmpty" class="flex h-full flex-col items-center justify-center gap-1 text-center">
                <Icon name="lucide:line-chart" class="h-6 w-6 text-base-content/30" />
                <p class="text-sm text-base-content/60">No data for this period</p>
            </div>

            <!-- Chart: on refetch, hold previous render at reduced opacity -->
            <div
                v-else-if="trafficData"
                class="h-full w-full transition-opacity duration-(--motion-fast)"
                :class="{ 'opacity-50': isLoading }">
                <apexchart height="100%" width="100%" :options="chartOptions" :series="chartSeries" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ApexOptions } from 'apexcharts';
import dayjs from 'dayjs';

const props = withDefaults(defineProps<{
    mode: 'personal' | 'global',
    type?: 'download' | 'upload' | 'encoding' | 'remote-download' | 'remote-download-duration',
    hours?: number,
    height?: number,
}>(), {
    type: 'download',
    hours: 24,
    height: 224,
});

const conf = useRuntimeConfig();
const token = useToken();
const { data: accountData } = useAccountData();

const palette = useChartPalette();
const baseOptions = useChartBaseOptions();

const isLoading = ref(false);
const err = ref("");
const targetPoints = 100;

interface TrafficPoint {
    Timestamp: number;
    Bytes: number; // Represents seconds if type === 'encoding' or 'remote-download-duration'
}

interface TrafficResponse {
    Traffic: TrafficPoint[];
}

const trafficData = ref<TrafficResponse | null>(null);

const title = computed(() => {
    if (props.type === 'upload') return 'Upload traffic';
    if (props.type === 'encoding') return 'Processing time';
    if (props.type === 'remote-download') return 'Remote download traffic';
    if (props.type === 'remote-download-duration') return 'Remote download time';
    return 'Delivery traffic';
});

const isDuration = computed(() =>
    props.type === 'encoding' || props.type === 'remote-download-duration');

const latestValue = computed(() => {
    const t = trafficData.value?.Traffic;
    return t && t.length ? t[t.length - 1].Bytes : null;
});

const isEmpty = computed(() => {
    const t = trafficData.value?.Traffic;
    return !!t && t.every(p => p.Bytes === 0);
});

const chartSeries = computed(() => [{
    name: title.value,
    data: trafficData.value?.Traffic.map(p => [p.Timestamp, p.Bytes]) || []
}]);

function formatValue(val: number) {
    return isDuration.value ? humanDuration(val) : humanFileSize(val);
}

const chartOptions = computed<ApexOptions>(() => {
    const base = baseOptions.value;
    const useBars = isDuration.value;

    return {
        ...base,
        chart: {
            ...base.chart,
            type: useBars ? 'bar' : 'area',
        },
        colors: [palette.value.series[0]],
        ...(useBars
            ? {
                plotOptions: {
                    bar: { columnWidth: '55%', borderRadius: 2, borderRadiusApplication: 'end' as const },
                },
            }
            : { fill: areaFill }),
        yaxis: {
            labels: {
                style: { colors: palette.value.label, fontSize: '11px' },
                formatter: (val: number) => formatValue(val),
            },
        },
        tooltip: {
            ...base.tooltip,
            y: { formatter: (val: number) => formatValue(val) },
        },
    };
});

async function load() {
    isLoading.value = true;
    err.value = "";
    try {
        const to = dayjs();
        const from = to.subtract(props.hours, 'hour');

        let endpoint = '';
        const isGlobal = props.mode === 'global' && accountData.value?.Admin;
        const prefix = isGlobal ? '/stats' : '/account';

        switch (props.type) {
            case 'upload': endpoint = `${prefix}/upload`; break;
            case 'encoding': endpoint = `${prefix}/encoding`; break;
            case 'remote-download': endpoint = `${prefix}/remote-download`; break;
            case 'remote-download-duration': endpoint = `${prefix}/remote-download/duration`; break;
            default: endpoint = `${prefix}/traffic`;
        }

        const data = await $fetch<TrafficResponse>(`${conf.public.apiUrl}${endpoint}`, {
            headers: { Authorization: `Bearer ${token.value}` },
            query: {
                from: from.toISOString(),
                to: to.toISOString(),
                points: targetPoints
            }
        });

        if (data && data.Traffic) {
            trafficData.value = data;
        } else {
            err.value = `No ${props.type} data available`;
        }
    } catch (e: any) {
        err.value = e.data?.message || e.message || `Failed to load ${props.type} data`;
    } finally {
        isLoading.value = false;
    }
}

watch([() => props.hours, () => props.mode, () => props.type], () => {
    load();
});

onMounted(() => {
    load();
});
</script>
