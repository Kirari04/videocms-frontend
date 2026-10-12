<template>
    <div v-if="!items.length" class="flex h-full min-h-48 flex-col items-center justify-center gap-1 py-8 text-center">
        <Icon name="lucide:file-video" class="h-6 w-6 text-base-content/50" />
        <p class="text-sm text-base-content/70">No files in the queue yet</p>
    </div>
    <div v-else class="flex flex-col gap-2">
        <div v-for="item in items" :key="item.uuid" class="rounded-field border border-base-300 p-3 transition-colors hover:bg-base-200/60" :class="{ 'opacity-50 grayscale': item.deleted }">
            <div class="mb-2 flex items-center gap-3">
                <span v-if="item.uploading && !item.paused" class="loading loading-spinner loading-xs shrink-0 text-primary"></span>
                <Icon v-else-if="item.fin" name="lucide:check-circle-2" class="h-4 w-4 shrink-0 text-success" />
                <Icon v-else-if="hasError(item)" name="lucide:alert-circle" class="h-4 w-4 shrink-0 text-error" />
                <Icon v-else-if="item.paused" name="lucide:pause" class="h-4 w-4 shrink-0 text-base-content/50" />
                <Icon v-else name="lucide:file-video" class="h-4 w-4 shrink-0 text-base-content/50" />
                <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium" :title="item.name">{{ item.name }}</p>
                    <p class="truncate text-xs tabular-nums text-base-content/70" :title="status(item)">{{ status(item) }}</p>
                </div>
                <div class="flex shrink-0 gap-1">
                    <slot name="actions" :item="item" />
                    <button v-if="hasError(item)" type="button" class="btn btn-ghost btn-xs text-primary" :disabled="item.deleted" title="Retry" :aria-label="`Retry upload: ${item.name}`" @click="emit('retry', item.uuid)"><Icon name="lucide:rotate-cw" class="h-3 w-3" /></button>
                    <button v-if="pausable && item.uploading && !item.paused" type="button" class="btn btn-ghost btn-xs" :disabled="item.deleted" title="Pause" :aria-label="`Pause upload: ${item.name}`" @click="emit('pause', item.uuid)"><Icon name="lucide:pause" class="h-3 w-3" /></button>
                    <button v-if="pausable && item.paused && !hasError(item)" type="button" class="btn btn-ghost btn-xs" :disabled="item.deleted" title="Resume" :aria-label="`Resume upload: ${item.name}`" @click="emit('resume', item.uuid)"><Icon name="lucide:play" class="h-3 w-3" /></button>
                    <button type="button" class="btn btn-ghost btn-xs text-base-content/70 hover:text-error" :disabled="item.deleted" title="Remove" :aria-label="`Remove from queue: ${item.name}`" @click="emit('remove', item.uuid)"><Icon name="lucide:x" class="h-3 w-3" /></button>
                </div>
            </div>
            <p v-if="errorMessage?.(item)" role="alert" class="mb-2 break-words text-xs text-error">{{ errorMessage(item) }}</p>
            <div role="progressbar" :aria-label="item.name" :aria-valuenow="Math.round(item.progress)" aria-valuemin="0" aria-valuemax="100" class="h-1 w-full overflow-hidden rounded-full bg-base-300">
                <div class="h-full bg-primary transition-all duration-(--motion-base)" :style="{ width: `${Math.min(100, Math.max(0, item.progress))}%` }" :class="{ 'bg-success': item.fin, 'bg-error': hasError(item) }"></div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts" generic="T extends { uuid: string; name: string; progress: number; uploading: boolean; fin: boolean; paused?: boolean; deleted?: boolean }">
defineProps<{
    items: T[];
    status: (item: T) => string;
    hasError: (item: T) => boolean;
    errorMessage?: (item: T) => string;
    pausable?: boolean;
}>();
const emit = defineEmits<{ retry: [id: string]; remove: [id: string]; pause: [id: string]; resume: [id: string] }>();
</script>
