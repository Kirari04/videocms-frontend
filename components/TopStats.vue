<template>
    <div class="flex flex-col rounded-box border border-base-300 bg-base-100 p-4">
        <h3 class="mb-3 text-sm font-medium">{{ title }}</h3>

        <!-- First load skeleton -->
        <div v-if="isLoading && !data.length && !loadedOnce" class="flex flex-col gap-1.5" aria-hidden="true">
            <div v-for="i in 5" :key="i" class="skeleton h-7 w-full rounded-selector"></div>
        </div>

        <!-- Error -->
        <div v-else-if="err" class="flex grow flex-col items-center justify-center gap-2 py-8 text-center">
            <p class="max-w-[36ch] text-sm text-error">{{ err }}</p>
            <button class="btn btn-ghost btn-xs" @click="load()">Retry</button>
        </div>

        <!-- Empty -->
        <div v-else-if="!data.length" class="flex grow flex-col items-center justify-center gap-1 py-8 text-center">
            <Icon name="lucide:bar-chart-horizontal" class="h-6 w-6 text-base-content/30" />
            <p class="text-sm text-base-content/60">No data yet</p>
        </div>

        <!-- Ranked rows -->
        <div v-else class="transition-opacity duration-(--motion-fast)" :class="{ 'opacity-50': isLoading }">
            <RankRows :items="rankItems" :format="formatValue" />
        </div>
    </div>
</template>

<script setup lang="ts">
import type { RankRowItem } from './RankRows.vue';

const props = withDefaults(defineProps<{
    endpoint: string,
    title: string,
    formatter?: 'bytes' | 'duration' | 'number'
}>(), {
    formatter: 'bytes'
});

const conf = useRuntimeConfig();
const token = useToken();
const isLoading = ref(false);
const loadedOnce = ref(false);
const err = ref("");
const data = ref<Array<{ Name: string, value: number }>>([]);

const rankItems = computed<RankRowItem[]>(() =>
    data.value.map((i, idx) => ({ id: idx, name: i.Name, value: i.value })));

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
        loadedOnce.value = true;
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
</script>
