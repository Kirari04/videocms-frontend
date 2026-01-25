<template>
    <div class="card bg-base-100 shadow-xl border border-base-200 h-full">
        <div class="card-body p-4">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div class="flex flex-col gap-1">
                    <h3 class="card-title text-sm flex items-center gap-2">
                        <Icon :name="mode === 'users' ? 'lucide:users' : 'lucide:file-video'" class="w-4 h-4 text-secondary" />
                        {{ mode === 'users' ? 'Top Consumers' : 'Most Popular Content' }}
                    </h3>
                    <p class="text-[10px] opacity-50 uppercase font-bold tracking-wider">
                        {{ isAdminView ? 'System-wide Analysis' : 'Your Personal Content' }}
                    </p>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                    <!-- Time Range -->
                    <select v-model="selectedRange" class="select select-xs select-bordered bg-base-200/50">
                        <option v-for="range in timeRanges" :key="range.label" :value="range">
                            {{ range.label }}
                        </option>
                    </select>

                    <button class="btn btn-xs btn-ghost btn-square" @click="load()" :disabled="isLoading">
                        <Icon name="lucide:refresh-cw" class="w-3 h-3" :class="{'animate-spin': isLoading}" />
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center grow">
                <!-- Ranked List -->
                <div class="flex flex-col gap-2 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                    <div v-if="isLoading && !items.length" class="flex justify-center p-8">
                        <span class="loading loading-spinner loading-md text-secondary"></span>
                    </div>
                    
                    <div v-else-if="!items.length" class="flex flex-col items-center justify-center p-8 opacity-30">
                        <Icon name="lucide:database-zap" class="w-12 h-12 mb-2" />
                        <span class="text-sm">No traffic data for this period</span>
                    </div>

                    <div 
                        v-for="(item, index) in items" 
                        :key="item.ID" 
                        class="flex items-center justify-between p-2 rounded-lg bg-base-200/30 border border-base-200/50 hover:bg-base-200/60 transition-colors"
                    >
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="text-xs font-mono font-bold opacity-30 w-4">#{{ index + 1 }}</span>
                            <div class="flex flex-col min-w-0">
                                <span class="text-xs font-bold truncate">{{ item.Name }}</span>
                                <span class="text-[10px] opacity-50 font-mono">ID: {{ item.ID }}</span>
                            </div>
                        </div>
                        <div class="text-xs font-bold text-secondary whitespace-nowrap ml-4">
                            {{ humanFileSize(item.Bytes) }}
                        </div>
                    </div>
                </div>

                <!-- Donut Chart -->
                <div class="h-[250px] w-full" v-if="items.length">
                    <apexchart 
                        key="top-traffic-donut"
                        height="100%" 
                        width="100%" 
                        :options="chartOptions" 
                        :series="chartSeries" 
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ApexOptions } from 'apexcharts';
import dayjs from 'dayjs';

const props = defineProps<{
    mode: 'users' | 'files',
    isAdminView?: boolean
}>();

const conf = useRuntimeConfig();
const token = useToken();
const { data: accountData } = useAccountData();
const { theme } = useTheme();

const isLoading = ref(false);
const err = ref("");

interface TopItem {
    ID: number;
    Name: string;
    Bytes: number;
}

const items = ref<TopItem[]>([]);

const timeRanges = [
    { label: "Last 3 Hours", hours: 3 },
    { label: "Last 24 Hours", hours: 24 },
    { label: "Last 7 Days", hours: 24 * 7 },
    { label: "Last 30 Days", hours: 24 * 30 },
] as const;

const selectedRange = ref(timeRanges[1]);

const chartSeries = computed(() => items.value.map(i => i.Bytes));
const chartOptions = computed<ApexOptions>(() => {
    const isDark = theme.value === 'dark';
    const labelColor = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(128, 128, 128, 0.6)';

    return {
        chart: {
            type: 'donut',
            fontFamily: 'inherit',
        },
        labels: items.value.map(i => i.Name),
        legend: {
            show: false
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            show: false
        },
        theme: {
            mode: isDark ? 'dark' : 'light',
            palette: 'palette4'
        },
        tooltip: {
            y: {
                formatter: (val) => humanFileSize(val)
            }
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '70%',
                    labels: {
                        show: true,
                        name: { show: true, fontSize: '12px', color: labelColor },
                        value: { 
                            show: true, 
                            fontSize: '16px', 
                            fontWeight: 'bold',
                            color: isDark ? '#fff' : '#000',
                            formatter: (val) => humanFileSize(Number(val)) 
                        },
                        total: {
                            show: true,
                            label: 'Top 10 Total',
                            fontSize: '10px',
                            color: labelColor,
                            formatter: (w) => {
                                const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                                return humanFileSize(total);
                            }
                        }
                    }
                }
            }
        }
    };
});

async function load() {
    isLoading.value = true;
    err.value = "";
    try {
        const to = dayjs();
        const from = to.subtract(selectedRange.value.hours, 'hour');

        const endpoint = (props.isAdminView && accountData.value?.Admin) ? '/stats/traffic/top' : '/account/traffic/top';
        
        const data = await $fetch<TopItem[]>(`${conf.public.apiUrl}${endpoint}`, {
            headers: { Authorization: `Bearer ${token.value}` },
            query: { 
                from: from.toISOString(),
                to: to.toISOString(),
                mode: props.mode
            }
        });
        
        items.value = data || [];
    } catch (e: any) {
        err.value = e.data?.message || e.message || "Failed to load top consumers";
        items.value = [];
    } finally {
        isLoading.value = false;
    }
}

watch([selectedRange, () => props.mode, () => props.isAdminView], () => {
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
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(128, 128, 128, 0.2);
    border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(128, 128, 128, 0.4);
}
</style>