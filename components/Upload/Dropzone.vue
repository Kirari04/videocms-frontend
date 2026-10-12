<template>
    <div class="relative flex min-h-64 grow flex-col">
        <button
            type="button"
            class="flex w-full grow cursor-pointer flex-col items-center justify-center gap-2 rounded-box border-2 border-dashed px-5 py-10 text-center transition-colors duration-(--motion-fast) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
            :class="dragDepth > 0 ? 'border-primary bg-primary/5' : 'border-base-content/20 bg-base-100/40 hover:border-primary/50 hover:bg-primary/5'"
            :disabled="disabled"
            aria-label="Choose videos to add to the upload queue"
            @click="input?.click()"
            @dragover.prevent.stop
            @dragenter.prevent.stop="dragDepth++"
            @dragleave.prevent.stop="dragDepth = Math.max(0, dragDepth - 1)"
            @dragend.prevent.stop="dragDepth = 0"
            @drop.prevent.stop="drop"
        >
            <Icon name="lucide:cloud-upload" class="h-8 w-8" :class="dragDepth > 0 ? 'text-primary' : 'text-base-content/50'" />
            <span class="text-sm font-medium"><span class="text-primary">Click to upload</span> or drag and drop</span>
            <span class="text-xs text-base-content/70">Video files (MP4, MKV, AVI, …)</span>
            <span v-if="hint" class="text-xs text-base-content/70">{{ hint }}</span>
        </button>
        <input ref="input" type="file" multiple :accept="videoFileAccept" class="hidden" :disabled="disabled" @change="choose" />
    </div>
</template>

<script setup lang="ts">
import { videoFileAccept } from '@/utils/uploadFiles';
const props = defineProps<{ disabled?: boolean; hint?: string }>();
const emit = defineEmits<{ files: [files: File[]] }>();
const input = ref<HTMLInputElement | null>(null);
const dragDepth = ref(0);
function choose(event: Event) {
    const element = event.target as HTMLInputElement;
    if (!props.disabled) emit('files', Array.from(element.files || []));
    element.value = '';
}
function drop(event: DragEvent) {
    dragDepth.value = 0;
    if (!props.disabled) emit('files', Array.from(event.dataTransfer?.files || []));
}
</script>
