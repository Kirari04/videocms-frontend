<template>
    <div class="flex min-h-[520px] w-full grow flex-col xl:h-[calc(100dvh-12rem)]">
        <div
            class="grid min-h-0 grow grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)] xl:gap-6 xl:overflow-hidden">
            <!-- Left Side: Dropzone & Settings -->
            <div class="flex min-h-0 flex-col gap-4 xl:overflow-y-auto xl:pr-1">

                <!-- Tab Navigation -->
                <div role="tablist" class="tabs tabs-box w-fit">
                    <a role="tab" class="tab" :class="{ 'tab-active': activeSource === 'local' }"
                        @click="activeSource = 'local'">Local files</a>
                    <a
                        role="tab"
                        class="tab"
                        :class="{ 'tab-active': activeSource === 'remote', 'tab-disabled pointer-events-none opacity-50': !remoteDownloadsAllowed }"
                        @click="selectRemoteTab"
                    >Remote URL</a>
                </div>

                <!-- Target folder -->
                <div class="min-w-0">
                    <button
                        ref="targetFolderButton"
                        type="button"
                        class="group flex min-h-11 w-full min-w-0 items-center gap-2 rounded-field border border-base-content/20 bg-base-100/40 px-3 py-2 text-left text-sm transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                        :aria-expanded="isTargetFolderPickerOpen"
                        aria-controls="upload-target-folder-picker"
                        :disabled="isUploading"
                        @click="toggleTargetFolderPicker"
                    >
                        <Icon name="lucide:folder-open" class="h-4 w-4 shrink-0 text-base-content/60 transition-colors group-hover:text-primary" />
                        <span class="shrink-0 text-base-content/60">Target:</span>
                        <span aria-live="polite" class="min-w-0 flex-1 truncate font-medium" :title="targetFolderLabel">
                            {{ targetFolderLabel }}
                        </span>
                        <span class="hidden shrink-0 font-medium text-primary sm:inline">
                            {{ isTargetFolderPickerOpen ? 'Close' : 'Choose folder' }}
                        </span>
                        <Icon
                            name="lucide:chevron-down"
                            class="h-4 w-4 shrink-0 text-base-content/50 transition-transform duration-(--motion-fast)"
                            :class="{ 'rotate-180': isTargetFolderPickerOpen }"
                        />
                    </button>

                    <div
                        v-if="isTargetFolderPickerOpen"
                        id="upload-target-folder-picker"
                        class="mt-2 rounded-box border border-base-300 bg-base-100 p-3 sm:p-4"
                        @keydown.esc.stop="closeTargetFolderPicker"
                    >
                        <div class="mb-3 flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <h3 class="text-sm font-semibold">Choose target folder</h3>
                                <p class="mt-0.5 text-xs text-base-content/60">
                                    Browse to a folder, then confirm the destination.
                                </p>
                            </div>
                            <button
                                type="button"
                                class="btn btn-square btn-ghost btn-sm shrink-0"
                                aria-label="Close folder picker"
                                @click="closeTargetFolderPicker"
                            >
                                <Icon name="lucide:x" class="h-4 w-4" />
                            </button>
                        </div>

                        <div class="max-h-48 overflow-y-auto rounded-field bg-base-200/60 p-2">
                            <SelectFolder
                                :initial-path="pendingTargetFolderPath"
                                @update="pendingTargetFolderId = $event"
                                @path-change="pendingTargetFolderPath = $event"
                            />
                        </div>

                        <div class="mt-3 flex flex-col gap-3 border-t border-base-300 pt-3 sm:flex-row sm:items-center sm:justify-between">
                            <p class="min-w-0 truncate text-xs text-base-content/60" :title="pendingTargetFolderLabel">
                                Selected: <span class="font-medium text-base-content">{{ pendingTargetFolderLabel }}</span>
                            </p>
                            <div class="grid w-full shrink-0 grid-cols-1 gap-2 sm:flex sm:w-auto sm:justify-end">
                                <button
                                    type="button"
                                    class="btn btn-ghost btn-sm w-full sm:w-auto"
                                    @click="closeTargetFolderPicker"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    class="btn btn-primary btn-sm w-full gap-2 sm:w-auto"
                                    @click="applyTargetFolder"
                                >
                                    <Icon name="lucide:folder-check" class="h-4 w-4" />
                                    Use this folder
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Dropzone (Local) -->
                <form v-if="activeSource === 'local'" id="upload_manager_form"
                    class="relative flex min-h-64 grow flex-col">
                    <label
                        @dragover="dragEventStart"
                        @dragenter="dragEventStart"
                        @dragleave="dragEventEnd"
                        @dragend="dragEventEnd"
                        @drop="dragEventDrop"
                        for="upload_manager_input"
                        class="flex w-full grow cursor-pointer flex-col items-center justify-center rounded-box border-2 border-dashed transition-colors duration-(--motion-fast)"
                        :class="isDragging ? 'border-primary bg-primary/5' : 'border-base-content/20 bg-base-100/40 hover:border-primary/50 hover:bg-primary/5'"
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
                <div v-if="activeSource === 'remote'" class="flex min-h-64 grow flex-col gap-3">
                    <div v-if="remoteSubmitError" role="alert" class="alert alert-error text-sm">
                        <Icon name="lucide:alert-circle" class="h-4 w-4 shrink-0" />
                        <span>{{ remoteSubmitError }}</span>
                    </div>
                    <label class="flex grow flex-col gap-1.5">
                        <span class="text-sm font-medium">Video URLs (one per line)</span>
                        <textarea
                            v-model="remoteUrls"
                            class="textarea min-h-40 w-full grow resize-none font-mono text-sm"
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

            </div>

            <!-- Right Side: List -->
            <div class="h-[min(28rem,60dvh)] min-h-80 xl:h-full xl:min-h-0">
                <UploadList :source="activeSource" />
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {
    addToUploadQueue,
    isUploadingState,
    updatePendingUploadFolderTarget,
} from '@/composables/uploadManager'
import { createRemoteDownload } from '@/composables/remoteDownloadManager'

const isDragging = ref(false)
const isUploading = isUploadingState()

// Remote Upload Logic
const activeSource = defineModel<'local' | 'remote'>('source', { default: 'local' })
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
        activeSource.value = 'remote';
    }
}
watch(remoteDownloadsAllowed, (allowed) => {
    if (!allowed && activeSource.value === 'remote') {
        activeSource.value = 'local';
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
        await createRemoteDownload(
            urls,
            selectedTargetFolderId.value > 0 ? selectedTargetFolderId.value : undefined,
        );
        remoteUrls.value = '';
    } catch (e) {
        remoteSubmitError.value = `${(e as any)?.data || (e as any)?.message || 'Failed to submit remote downloads'}`;
    } finally {
        isSubmittingRemote.value = false;
    }
}

const folderPathHistory = useState<
    Array<{
        name: string;
        folderId: number;
    }>
>("folderPathHistory", () => ([]));

type FolderPathItem = {
    name: string;
    folderId: number;
};

const homeFolderPath = (): FolderPathItem[] => [{ name: 'Home', folderId: 0 }];
const normalizedFolderPath = (path: FolderPathItem[]) => path.length > 0
    ? path.map(folder => ({ ...folder }))
    : homeFolderPath();
const folderPathLabel = (path: FolderPathItem[]) => normalizedFolderPath(path)
    .map(folder => folder.name)
    .join(' / ');

const targetFolderButton = ref<HTMLButtonElement | null>(null);
const isTargetFolderPickerOpen = ref(false);
const pendingTargetFolderId = ref(0);
const pendingTargetFolderPath = ref<FolderPathItem[]>(homeFolderPath());
const selectedTargetFolderId = computed(() => {
    const path = normalizedFolderPath(folderPathHistory.value);
    return path[path.length - 1]?.folderId ?? 0;
});
const targetFolderLabel = computed(() => folderPathLabel(folderPathHistory.value));
const pendingTargetFolderLabel = computed(() => folderPathLabel(pendingTargetFolderPath.value));

function openTargetFolderPicker() {
    pendingTargetFolderPath.value = normalizedFolderPath(folderPathHistory.value);
    pendingTargetFolderId.value = selectedTargetFolderId.value;
    isTargetFolderPickerOpen.value = true;
}

function closeTargetFolderPicker() {
    isTargetFolderPickerOpen.value = false;
    nextTick(() => targetFolderButton.value?.focus());
}

function toggleTargetFolderPicker() {
    if (isTargetFolderPickerOpen.value) {
        closeTargetFolderPicker();
        return;
    }
    openTargetFolderPicker();
}

function applyTargetFolder() {
    folderPathHistory.value = normalizedFolderPath(pendingTargetFolderPath.value);
    updatePendingUploadFolderTarget(pendingTargetFolderId.value);
    closeTargetFolderPicker();
}

watch(isUploading, uploading => {
    if (uploading && isTargetFolderPickerOpen.value) {
        closeTargetFolderPicker();
    }
});

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
    if (files) addToUploadQueue(files, selectedTargetFolderId.value);

    const upload_manager_form = document.getElementById(
        "upload_manager_form"
    ) as HTMLFormElement;
    if(upload_manager_form) upload_manager_form.reset();
}
</script>
