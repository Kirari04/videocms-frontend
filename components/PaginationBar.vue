<template>
    <div class="flex flex-wrap items-center justify-between gap-3">
        <label class="flex items-center gap-2 text-xs text-base-content/70">
            Rows per page
            <select
                class="select select-xs w-18"
                :value="pageSize"
                @change="onSizeChange(($event.target as HTMLSelectElement).value)">
                <option v-for="s in sizes" :key="s" :value="s">{{ s }}</option>
            </select>
        </label>

        <div class="flex items-center gap-2">
            <span class="text-xs tabular-nums text-base-content/70">
                Page {{ page + 1 }} of {{ Math.max(pages, 1) }}
            </span>
            <div class="join">
                <button
                    class="btn btn-ghost join-item btn-xs"
                    :disabled="page === 0"
                    @click="$emit('update:page', page - 1)"
                    aria-label="Previous page">
                    <Icon name="lucide:chevron-left" class="h-3.5 w-3.5" />
                </button>
                <button
                    class="btn btn-ghost join-item btn-xs"
                    :disabled="page >= pages - 1"
                    @click="$emit('update:page', page + 1)"
                    aria-label="Next page">
                    <Icon name="lucide:chevron-right" class="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
withDefaults(defineProps<{
    page: number;
    pages: number;
    pageSize: number;
    sizes?: number[];
}>(), {
    sizes: () => [10, 25, 50, 100],
});

const emit = defineEmits<{
    (e: "update:page", page: number): void;
    (e: "update:pageSize", size: number): void;
}>();

function onSizeChange(value: string) {
    emit("update:pageSize", Number(value));
    emit("update:page", 0);
}
</script>
