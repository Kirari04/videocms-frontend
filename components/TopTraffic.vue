<template>
    <div class="flex flex-col rounded-box border border-base-300 bg-base-100 p-4">
        <h3 class="mb-3 text-sm font-medium">{{ title }}</h3>

        <!-- First load skeleton -->
        <div v-if="isLoading && !items.length && !loadedOnce" class="flex flex-col gap-1.5" aria-hidden="true">
            <div v-for="i in 5" :key="i" class="skeleton h-7 w-full rounded-selector"></div>
        </div>

        <!-- Error -->
        <div v-else-if="err" class="flex grow flex-col items-center justify-center gap-2 py-8 text-center">
            <p class="max-w-[36ch] text-sm text-error">{{ err }}</p>
            <button class="btn btn-ghost btn-xs" @click="load()">Retry</button>
        </div>

        <!-- Empty -->
        <div v-else-if="!items.length" class="flex grow flex-col items-center justify-center gap-1 py-8 text-center">
            <Icon name="lucide:bar-chart-horizontal" class="h-6 w-6 text-base-content/30" />
            <p class="text-sm text-base-content/60">Nothing here for this period</p>
        </div>

        <!-- Ranked rows: hold previous render at reduced opacity while refetching -->
        <div v-else class="transition-opacity duration-(--motion-fast)" :class="{ 'opacity-50': isLoading }">
            <RankRows :items="rankItems" :format="formatValue" />
        </div>
    </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs';
import type { RankRowItem } from './RankRows.vue';

const props = withDefaults(defineProps<{
    mode: 'users' | 'files',
    type?: 'traffic' | 'upload' | 'encoding' | 'storage',
    isAdminView?: boolean,
    hours?: number,
}>(), {
    type: 'traffic',
    hours: 24,
});

const conf = useRuntimeConfig();
const token = useToken();
const { data: accountData } = useAccountData();

const isLoading = ref(false);
const loadedOnce = ref(false);
const err = ref("");

interface TopItem {
    id?: number;
    ID?: number;
    Name: string;
    value: number;
}

const items = ref<TopItem[]>([]);

const rankItems = computed<RankRowItem[]>(() =>
    items.value.map(i => ({ id: i.ID ?? i.id, name: i.Name, value: i.value })));

const title = computed(() => {
    const m = props.mode === 'users' ? 'users' : 'videos';
    if (props.type === 'upload') return `Top ${m} by upload`;
    if (props.type === 'encoding') return `Top ${m} by processing`;
    if (props.type === 'storage') return `Top ${m} by storage`;
    return `Top ${m} by traffic`;
});

function formatValue(val: number) {
    if (props.type === 'encoding') {
        return humanDuration(val);
    }
    return humanFileSize(val);
}

async function load() {
    isLoading.value = true;
    err.value = "";
    try {
        const to = dayjs();
        const from = to.subtract(props.hours, 'hour');

        let path = '';
        if (props.isAdminView && accountData.value?.Admin) {
            path = `/stats/${props.type === 'traffic' ? 'traffic/top' : props.type + '/top'}`;
        } else {
            path = `/account/${props.type === 'traffic' ? 'traffic/top' : props.type + '/top'}`;
        }

        const query: any = { mode: props.mode };
        if (props.type !== 'storage') {
            query.from = from.toISOString();
            query.to = to.toISOString();
        }

        const data = await $fetch<TopItem[]>(`${conf.public.apiUrl}${path}`, {
            headers: { Authorization: `Bearer ${token.value}` },
            query
        });

        items.value = data || [];
    } catch (e: any) {
        err.value = e.data?.message || e.message || "Failed to load rankings";
        items.value = [];
    } finally {
        isLoading.value = false;
        loadedOnce.value = true;
    }
}

watch([() => props.hours, () => props.mode, () => props.isAdminView, () => props.type], () => {
    load();
});

onMounted(() => {
    load();
});
</script>
