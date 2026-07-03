<template>
    <ol class="flex flex-col gap-1">
        <li v-for="(item, index) in items" :key="item.id ?? index" class="relative overflow-hidden rounded-selector">
            <!-- Proportion bar: single hue for all rows (nominal categories) -->
            <div
                class="absolute inset-y-0 left-0 bg-primary/10"
                :style="{ width: `${barWidth(item.value)}%` }"
                aria-hidden="true"></div>
            <div class="relative flex items-center gap-3 px-2.5 py-1.5">
                <span class="w-4 shrink-0 text-xs tabular-nums text-base-content/50">{{ index + 1 }}</span>
                <span class="min-w-0 flex-1 truncate text-sm" :title="item.name">{{ item.name }}</span>
                <span class="shrink-0 text-sm tabular-nums text-base-content/80">{{ format(item.value) }}</span>
            </div>
        </li>
    </ol>
</template>

<script lang="ts" setup>
export interface RankRowItem {
    id?: number | string;
    name: string;
    value: number;
}

const props = defineProps<{
    items: RankRowItem[];
    format: (value: number) => string;
}>();

const maxValue = computed(() => Math.max(...props.items.map((i) => i.value), 0));

function barWidth(value: number) {
    if (maxValue.value <= 0) return 0;
    return Math.max(1.5, (value / maxValue.value) * 100);
}
</script>
