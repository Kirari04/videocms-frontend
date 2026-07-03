<template>
    <div class="flex min-h-[520px] w-full grow flex-col lg:h-[calc(100dvh-12rem)]">
        <div class="grid min-h-0 grow grid-cols-1 gap-6 lg:grid-cols-3 lg:overflow-hidden">
            <!-- Left Side: Dropzone & Settings -->
            <div class="flex min-h-0 flex-col gap-4 lg:col-span-2">

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
                            <li v-if="folderPathHistory.length === 0" class="font-medium">Home</li>
                            <li v-for="(folder, index) in folderPathHistory" :key="index" class="font-medium">
                                {{ folder.name }}
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- Dropzone (Local) -->
                <form v-if="activeTab === 'local'" id="upload_manager_form" class="relative flex min-h-56 grow flex-col">
                    <label
                        @dragover="dragEventStart"
                        @dragenter="dragEventStart"
                        @dragleave="dragEventEnd"
                        @dragend="dragEventEnd"
                        @drop="dragEventDrop"
                        for="upload_manager_input"
                        class="flex w-full grow cursor-pointer flex-col items-center justify-center rounded-box border-2 border-dashed transition-colors duration-(--motion-fast)"
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
                <div v-if="activeTab === 'remote'" class="flex grow flex-col gap-3">
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
            <div class="h-full min-h-[400px] lg:col-span-1">
                <UploadList />
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { addToUploadQueue } from '@/composables/uploadManager'
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
