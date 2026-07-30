<template>
    <div class="flex grow flex-col">
        <PageHeader title="Upload" description="Add videos from your device or a remote URL.">
            <button
                v-if="activeSource === 'local'"
                @click="startUploadQueue"
                class="btn btn-primary btn-sm gap-2"
                :disabled="uploadList.length === 0 || isUploading">
                <Icon v-if="!isUploading" name="lucide:play" class="h-4 w-4" />
                <span v-else class="loading loading-spinner loading-xs"></span>
                {{ isUploading ? 'Uploading…' : 'Start upload' }}
            </button>
        </PageHeader>

        <UploadManager v-model:source="activeSource" />
    </div>
</template>

<script lang="ts" setup>
import {
    getUploadQueue,
    isUploadingState,
    startUploadQueue,
} from '@/composables/uploadManager';

definePageMeta({
    layout: "panel",
    middleware: "auth",
});

const uploadList = getUploadQueue();
const isUploading = isUploadingState();
const activeSource = ref<'local' | 'remote'>('local');
</script>
