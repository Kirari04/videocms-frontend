<template>
    <div class="flex h-[calc(100vh-8rem)] w-full flex-col">
        <!-- Header -->
        <div class="mb-5 flex shrink-0 items-center justify-between gap-3">
            <div>
                <h3 class="text-base font-semibold">Upload</h3>
                <p class="text-sm text-base-content/70">Add files to your upload queue.</p>
            </div>
            <button
                @click="startUploadQueue"
                class="btn btn-primary btn-sm gap-2"
                :disabled="uploadList.length === 0 || isUploading"
            >
                <Icon v-if="!isUploading" name="lucide:play" class="h-4 w-4" />
                <span v-else class="loading loading-spinner loading-xs"></span>
                {{ isUploading ? 'Uploading…' : 'Start upload' }}
            </button>
        </div>

        <div class="grid min-h-0 grow grid-cols-1 gap-6 overflow-hidden lg:grid-cols-3">
            <!-- Left Side: Dropzone & Settings -->
            <div class="flex flex-col gap-4 overflow-y-auto pr-1 lg:col-span-2">

                <!-- Tab Navigation -->
                <div role="tablist" class="tabs tabs-box w-fit">
                    <a role="tab" class="tab" :class="{ 'tab-active': activeTab === 'local' }"
                        @click="activeTab = 'local'">Local files</a>
                    <a
                        role="tab"
                        class="tab"
                        :class="{ 'tab-active': activeTab === 'remote', 'tab-disabled pointer-events-none opacity-50': !remoteDownloadsAllowed }"
                        @click="selectRemoteTab"
                    >Remote URL</a>
                </div>

                <!-- Target folder -->
                <div class="flex items-center gap-2 rounded-field border border-base-300 bg-base-200/60 px-3 py-2 text-sm">
                    <Icon name="lucide:folder-open" class="h-4 w-4 shrink-0 text-base-content/60" />
                    <span class="text-base-content/60">Target:</span>
                    <div class="breadcrumbs p-0 text-sm">
                        <ul>
                            <li v-for="(folder, index) in folderPathHistory" :key="index" class="font-medium">
                                {{ folder.name }}
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- Dropzone (Local) -->
                <form v-if="activeTab === 'local'" id="upload_manager_form" class="relative">
                    <label
                        @dragover="dragEventStart"
                        @dragenter="dragEventStart"
                        @dragleave="dragEventEnd"
                        @dragend="dragEventEnd"
                        @drop="dragEventDrop"
                        for="upload_manager_input"
                        class="flex h-56 w-full cursor-pointer flex-col items-center justify-center rounded-box border-2 border-dashed transition-colors duration-(--motion-fast)"
                        :class="isDragging ? 'border-primary bg-primary/5' : 'border-base-300 hover:border-primary/50 hover:bg-base-200/40'"
                    >
                        <div class="flex flex-col items-center justify-center gap-2 text-center">
                            <Icon name="lucide:cloud-upload" class="h-8 w-8"
                                :class="isDragging ? 'text-primary' : 'text-base-content/40'" />
                            <p class="text-sm font-medium">
                                <span class="text-primary">Click to upload</span> or drag and drop
                            </p>
                            <p class="text-xs text-base-content/60">Video files (MP4, MKV, AVI, …)</p>
                        </div>
                        <input @change="(e: any) => onAddFileToQueue(e.target.files)" id="upload_manager_input"
                            type="file" class="hidden" name="files[]" multiple />
                    </label>
                </form>

                <!-- Remote URL Input -->
                <div v-if="activeTab === 'remote'" class="flex flex-col gap-3">
                    <div v-if="remoteSubmitError" role="alert" class="alert alert-error text-sm">
                        <Icon name="lucide:alert-circle" class="h-4 w-4 shrink-0" />
                        <span>{{ remoteSubmitError }}</span>
                    </div>
                    <label class="flex flex-col gap-1.5">
                        <span class="text-sm font-medium">Video URLs (one per line)</span>
                        <textarea
                            v-model="remoteUrls"
                            class="textarea h-40 w-full font-mono text-sm"
                            placeholder="https://example.com/video1.mp4&#10;https://example.com/video2.mkv"
                        ></textarea>
                        <span class="text-xs text-base-content/60">Direct video links over http(s).</span>
                    </label>
                    <div class="flex justify-end">
                        <button
                            @click="handleRemoteSubmit"
                            class="btn btn-primary btn-sm gap-2"
                            :disabled="!remoteUrls.trim() || isSubmittingRemote || !remoteDownloadsAllowed"
                        >
                            <span v-if="isSubmittingRemote" class="loading loading-spinner loading-xs"></span>
                            <Icon v-else name="lucide:download-cloud" class="h-4 w-4" />
                            Add to queue
                        </button>
                    </div>
                </div>

                <!-- Status & queue actions -->
                <div class="rounded-box border border-base-300 bg-base-100 p-4">
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div class="flex flex-col gap-1.5">
                            <span class="text-sm font-medium">Transfer</span>
                            <div class="rounded-field border border-base-300 bg-base-200/60 px-3 py-2.5">
                                <div class="flex items-center justify-between gap-3">
                                    <div class="flex min-w-0 items-center gap-2">
                                        <Icon name="lucide:gauge" class="h-4 w-4 shrink-0 text-base-content/60" />
                                        <span class="truncate text-sm font-medium tabular-nums">{{ adaptiveUploadLabel }}</span>
                                    </div>
                                    <span class="badge badge-sm border-none bg-primary/10 text-primary">Auto</span>
                                </div>
                                <div v-if="activeUploadCount > 0"
                                    class="mt-1 flex flex-wrap gap-x-3 gap-y-1 pl-6 text-xs tabular-nums text-base-content/60">
                                    <span>{{ adaptiveUploadCountLabel }}</span>
                                    <span>Chunks: {{ adaptiveChunkSummary.activeChunks }} active</span>
                                    <span>Target {{ adaptiveChunkSummary.targetChunks }}</span>
                                    <span>Max {{ adaptiveChunkSummary.maxChunks }}</span>
                                </div>
                            </div>
                        </div>

                        <div class="flex flex-col gap-1.5">
                            <span class="text-sm font-medium">Queue</span>
                            <div class="grid grid-cols-2 gap-2">
                                <button @click="removedFinishedUploadQueueItem" class="btn btn-ghost btn-sm border-base-300 gap-2">
                                    <Icon name="lucide:eraser" class="h-4 w-4" /> Clear done
                                </button>
                                <button @click="resetAllErroredUploadQueueItem" class="btn btn-ghost btn-sm border-base-300 gap-2">
                                    <Icon name="lucide:rotate-cw" class="h-4 w-4" /> Retry errors
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Side: List -->
            <div class="h-full min-h-[400px] lg:col-span-1">
                <UploadList />
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {
    getUploadQueue,
    getUploadSpeed,
    getActiveUploadCount,
    isUploadingState,
    startUploadQueue,
    removedFinishedUploadQueueItem,
    resetAllErroredUploadQueueItem,
    addToUploadQueue
} from '@/composables/uploadManager'
import { createRemoteDownload } from '@/composables/remoteDownloadManager'

const isDragging = ref(false)

// Remote Upload Logic
const activeTab = ref<'local' | 'remote'>('local')
const remoteUrls = ref('')
const isSubmittingRemote = ref(false)
const remoteSubmitError = ref('')
const serverConfig = useServerConfig()
const { data: accountData } = useAccountData()
const remoteDownloadsAllowed = computed(() => {
    return serverConfig.value.RemoteDownloadEnabled !== false && accountData.value?.RemoteDownloadEnabled !== false
})

function selectRemoteTab() {
    if (remoteDownloadsAllowed.value) {
        activeTab.value = 'remote';
    }
}
watch(remoteDownloadsAllowed, (allowed) => {
    if (!allowed && activeTab.value === 'remote') {
        activeTab.value = 'local';
    }
});

async function handleRemoteSubmit() {
    const urls = remoteUrls.value.split('\n').map(u => u.trim()).filter(u => u.length > 0);
    if (urls.length === 0) return;
    remoteSubmitError.value = '';
    if (!remoteDownloadsAllowed.value) {
        remoteSubmitError.value = 'Remote downloads are disabled.';
        return;
    }
    const invalidUrl = urls.find((rawUrl) => {
        try {
            const parsed = new URL(rawUrl);
            return parsed.protocol !== 'http:' && parsed.protocol !== 'https:';
        } catch {
            return true;
        }
    });
    if (invalidUrl) {
        remoteSubmitError.value = `Invalid remote URL: ${invalidUrl}`;
        return;
    }

    isSubmittingRemote.value = true;
    try {
        const lastHistory = folderPathHistory.value.length > 0 ? folderPathHistory.value[folderPathHistory.value.length - 1] : null;
        const folderId = lastHistory?.folderId;

        await createRemoteDownload(urls, folderId);
        remoteUrls.value = '';
    } catch (e) {
        remoteSubmitError.value = `${(e as any)?.data || (e as any)?.message || 'Failed to submit remote downloads'}`;
    } finally {
        isSubmittingRemote.value = false;
    }
}

const isUploading = isUploadingState();
const uploadList = getUploadQueue();
const uploadSpeed = getUploadSpeed();
const activeUploadCount = getActiveUploadCount();
const adaptiveUploadLabel = computed(() => {
    if (activeUploadCount.value <= 0) return "Ready";
    return `${humanFileSize(uploadSpeed.value)}/s total`;
});
const adaptiveChunkSummary = computed(() => {
    return uploadList.value.reduce(
        (summary, item) => {
            if (!item.uploading || item.paused || item.fin || item.errored || item.deleted) return summary;

            const activeChunks = Number(item.adaptive?.activeChunks || 0);
            const targetChunks = Number(item.adaptive?.targetChunks || 0);
            const maxChunks = Number(item.adaptive?.maxChunks || 0);
            summary.activeChunks += activeChunks;
            summary.targetChunks += targetChunks > 0 ? targetChunks : activeChunks;
            summary.maxChunks += maxChunks > 0 ? maxChunks : Math.max(activeChunks, targetChunks);
            return summary;
        },
        { activeChunks: 0, targetChunks: 0, maxChunks: 0 }
    );
});
const adaptiveUploadCountLabel = computed(() => {
    const uploads = activeUploadCount.value;
    return `${uploads} upload${uploads === 1 ? "" : "s"}`;
});

const folderPathHistory = useState<
    Array<{
        name: string;
        folderId: number;
    }>
>("folderPathHistory", () => ([]));

function dragEventStart(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    isDragging.value = true;
}
function dragEventEnd(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    isDragging.value = false;
}
function dragEventDrop(e: any) {
    e.preventDefault();
    e.stopPropagation();
    isDragging.value = false;
    onAddFileToQueue(e.dataTransfer.files);
}

function onAddFileToQueue(files: FileList) {
    if (files) addToUploadQueue(files);

    const upload_manager_form = document.getElementById(
        "upload_manager_form"
    ) as HTMLFormElement;
    if(upload_manager_form) upload_manager_form.reset();
}
</script>
