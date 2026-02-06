<template>
    <div class="card bg-base-100 shadow-xl border border-base-200">
        <div class="card-body p-4">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div class="flex flex-col gap-1">
                    <h3 class="card-title text-sm flex items-center gap-2">
                        <Icon :name="iconName" :class="iconColor" class="w-4 h-4" />
                        {{ title }}
                        <span class="text-xs font-mono opacity-50 font-normal" v-if="latestValue !== null">
                            {{ formatValue(latestValue) }}
                        </span>
                    </h3>
                    <p class="text-[10px] opacity-50 uppercase font-bold tracking-wider">
                        {{ subtitle }}
                    </p>
                </div>
                
                <div class="flex items-center gap-3">
                    <div class="join">
                        <button 
                            v-for="range in timeRanges" 
                            :key="range.label" 
                            @click="selectedRange = range"
                            class="btn btn-xs join-item"
                            :class="selectedRange.label === range.label ? 'btn-primary' : 'btn-ghost bg-base-200/50'"
                        >
                            {{ range.label }}
                        </button>
                    </div>
                    <button class="btn btn-xs btn-ghost btn-square" @click="load()" :disabled="isLoading">
                        <Icon name="lucide:refresh-cw" class="w-3 h-3" :class="{'animate-spin': isLoading}" />
                    </button>
                </div>
            </div>

            <div class="h-75 w-full relative">
                <div v-if="isLoading && !trafficData" class="absolute inset-0 flex items-center justify-center bg-base-100/50 z-10 rounded-lg">
                    <span class="loading loading-spinner loading-md text-primary"></span>
                </div>
                <div v-if="err" class="absolute inset-0 flex items-center justify-center text-error text-xs p-4 text-center">
                    {{ err }}
                </div>
                <apexchart 
                    v-if="trafficData"
                    key="traffic-chart" 
                    height="100%" 
                    width="100%" 
                    :options="chartOptions" 
                    :series="chartSeries" 
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ApexOptions } from 'apexcharts';
import dayjs from 'dayjs';

const props = withDefaults(defineProps<{
    mode: 'personal' | 'global',
    type?: 'download' | 'upload' | 'encoding' | 'remote-download' | 'remote-download-duration'
}>(), {
    type: 'download'
});

const conf = useRuntimeConfig();
const token = useToken();
const { data: accountData } = useAccountData();
const { theme } = useTheme();

const isLoading = ref(false);
const err = ref("");

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

interface TrafficPoint {
    Timestamp: number;
    Bytes: number; // Represents seconds if type === 'encoding' or 'remote-download-duration'
}

interface TrafficResponse {
    Traffic: TrafficPoint[];
}

const trafficData = ref<TrafficResponse | null>(null);

const iconName = computed(() => {
    if (props.type === 'upload') return 'lucide:upload-cloud';
    if (props.type === 'encoding') return 'lucide:cpu';
    if (props.type === 'remote-download') return 'lucide:cloud-download';
    if (props.type === 'remote-download-duration') return 'lucide:clock';
    return 'lucide:arrow-up-down';
});

const iconColor = computed(() => {
    if (props.type === 'upload') return 'text-success';
    if (props.type === 'encoding') return 'text-warning';
    if (props.type === 'remote-download') return 'text-secondary';
    if (props.type === 'remote-download-duration') return 'text-accent';
    return 'text-info';
});

const title = computed(() => {
    if (props.type === 'upload') return props.mode === 'global' ? 'Global Upload Traffic' : 'My Upload Traffic';
    if (props.type === 'encoding') return props.mode === 'global' ? 'System Encoding Load' : 'My Processing Time';
    if (props.type === 'remote-download') return props.mode === 'global' ? 'Global Remote Downloads' : 'My Remote Downloads';
    if (props.type === 'remote-download-duration') return props.mode === 'global' ? 'Remote Download Time' : 'Time Spent Downloading';
    return props.mode === 'global' ? 'Global Network Traffic' : 'My Delivery Traffic';
});

const subtitle = computed(() => {
    if (props.type === 'upload') return props.mode === 'global' ? 'Total Content Ingress' : 'Your Upload Activity';
    if (props.type === 'encoding') return props.mode === 'global' ? 'Background Compute Effort' : 'Time Spent on Your Content';
    if (props.type === 'remote-download') return props.mode === 'global' ? 'Total Remote Ingress' : 'Data Pulled Remotely';
    if (props.type === 'remote-download-duration') return props.mode === 'global' ? 'Total Active Time' : 'Downloader Occupancy';
    return props.mode === 'global' ? 'All System Nodes' : 'Your Personal Usage';
});

const latestValue = computed(() => {
    const t = trafficData.value?.Traffic;
    return t && t.length ? t[t.length - 1].Bytes : null;
});

const chartSeries = computed(() => [{
    name: 'Value',
    data: trafficData.value?.Traffic.map(p => [p.Timestamp, p.Bytes]) || []
}]);

function formatValue(val: number) {
    if (props.type === 'encoding' || props.type === 'remote-download-duration') {
        return humanDuration(val);
    }
    return humanFileSize(val);
}

const chartOptions = computed<ApexOptions>(() => {
    const isDark = theme.value === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(128, 128, 128, 0.1)';
    const labelColor = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(128, 128, 128, 0.6)';

    let mainColor = '#0ea5e9'; // Blue for download
    if (props.type === 'upload') mainColor = '#22c55e'; // Green for upload
    if (props.type === 'encoding') mainColor = '#f59e0b'; // Amber for encoding
    if (props.type === 'remote-download') mainColor = '#d946ef'; // Fuchsia
    if (props.type === 'remote-download-duration') mainColor = '#8b5cf6'; // Violet
    
    if (props.mode === 'global') {
        if (props.type === 'upload') mainColor = '#10b981'; 
        if (props.type === 'download') mainColor = '#f43f5e';
        if (props.type === 'encoding') mainColor = '#fbbf24'; 
        if (props.type === 'remote-download') mainColor = '#c026d3';
        if (props.type === 'remote-download-duration') mainColor = '#7c3aed';
    }

    return {
        chart: {
            animations: { enabled: false },
            toolbar: { show: false },
            zoom: { enabled: false },
            fontFamily: 'inherit',
            background: 'transparent',
            type: props.type.includes('duration') ? 'bar' : 'area'
        },
        colors: [mainColor],
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        fill: { 
            type: 'gradient', 
            gradient: { 
                shadeIntensity: 1, 
                opacityFrom: 0.4, 
                opacityTo: 0.05, 
                stops: [0, 100] 
            } 
        },
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
                style: { colors: labelColor || 'gray', fontSize: '10px' },
                datetimeFormatter: {
                    year: 'yyyy',
                    month: "MMM 'yy",
                    day: 'dd MMM',
                    hour: 'HH:mm'
                }
            }
        },
        yaxis: {
            labels: {
                style: { colors: labelColor || 'gray', fontSize: '10px' },
                formatter: (val) => formatValue(val)
            }
        },
        legend: { show: false },
        theme: { mode: isDark ? 'dark' : 'light' },
        tooltip: { 
            theme: isDark ? 'dark' : 'light', 
            x: { format: 'dd MMM HH:mm' },
            y: { formatter: (val) => formatValue(val) }
        }
    };
});

async function load() {
    isLoading.value = true;
    err.value = "";
    try {
        const to = dayjs();
        const from = to.subtract(selectedRange.value.hours, 'hour');

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

watch([selectedRange, () => props.mode, () => props.type], () => {
    load();
});

onMounted(() => {
    load();
});

// Utils
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

function humanDuration(seconds: number) {
    if (seconds < 60) return seconds + 's';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
}
</script>