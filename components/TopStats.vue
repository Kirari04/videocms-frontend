<template>
    <div class="card bg-base-100 shadow-xl border border-base-200 h-full">
        <div class="card-body p-4">
            <div class="flex items-center justify-between mb-4">
                <h3 class="card-title text-sm flex items-center gap-2">
                    <Icon :name="icon" class="w-4 h-4 text-primary" />
                    {{ title }}
                </h3>
                <div class="flex items-center gap-2">
                    <button class="btn btn-xs btn-ghost btn-square" @click="load()" :disabled="isLoading">
                        <Icon name="lucide:refresh-cw" class="w-3 h-3" :class="{'animate-spin': isLoading}" />
                    </button>
                </div>
            </div>

            <div class="grow relative min-h-[200px]">
                 <div v-if="isLoading && !data.length" class="absolute inset-0 flex items-center justify-center bg-base-100/50 z-10 rounded-lg">
                    <span class="loading loading-spinner loading-md text-primary"></span>
                </div>
                <div v-if="err" class="absolute inset-0 flex items-center justify-center text-error text-xs p-4 text-center">
                    {{ err }}
                </div>
                
                <div v-if="data.length > 0" class="overflow-x-auto">
                    <table class="table table-xs">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Name</th>
                                <th class="text-right">{{ label }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(item, index) in data" :key="index" class="hover">
                                <td class="font-mono opacity-50">{{ index + 1 }}</td>
                                <td class="font-medium truncate max-w-[150px]" :title="item.Name">{{ item.Name }}</td>
                                <td class="text-right font-mono">{{ formatValue(item.value) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div v-else-if="!isLoading" class="flex flex-col items-center justify-center h-full opacity-50">
                    <Icon name="lucide:bar-chart-2" class="w-8 h-8 mb-2" />
                    <p class="text-xs">No data available</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
    endpoint: string,
    title: string,
    label?: string,
    icon?: string,
    formatter?: 'bytes' | 'duration' | 'number'
}>(), {
    label: 'Value',
    icon: 'lucide:list',
    formatter: 'bytes'
});

const conf = useRuntimeConfig();
const token = useToken();
const isLoading = ref(false);
const err = ref("");
const data = ref<Array<{ Name: string, value: number }>>([]);

async function load() {
    isLoading.value = true;
    err.value = "";
    try {
        const res = await $fetch<Array<{ Name: string, value: number }>>(`${conf.public.apiUrl}${props.endpoint}`, {
            headers: { Authorization: `Bearer ${token.value}` },
        });
        if (res) {
            data.value = res;
        }
    } catch (e: any) {
        err.value = e.data?.message || e.message || "Failed to load stats";
    } finally {
        isLoading.value = false;
    }
}

function formatValue(val: number) {
    if (props.formatter === 'duration') return humanDuration(val);
    if (props.formatter === 'number') return val.toLocaleString();
    return humanFileSize(val);
}

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