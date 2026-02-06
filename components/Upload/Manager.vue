<template>
    <div class="flex flex-col h-[calc(100vh-8rem)] w-full">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6 shrink-0">
            <div>
                <h3 class="font-bold text-2xl">Upload Manager</h3>
                <p class="text-sm opacity-70">Add files to your upload queue.</p>
            </div>
            <button 
                @click="startUploadQueue" 
                class="btn btn-primary shadow-lg"
                :disabled="uploadList.length === 0 || isUploading"
            >
                <Icon v-if="!isUploading" name="lucide:play" class="w-4 h-4" />
                <span v-else class="loading loading-spinner loading-xs"></span>
                {{ isUploading ? 'Uploading...' : 'Start Upload' }}
            </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 grow overflow-hidden min-h-0">
            <!-- Left Side: Dropzone & Settings -->
            <div class="lg:col-span-2 flex flex-col gap-6 overflow-y-auto pr-1">
                
                <!-- Tab Navigation -->
                <div role="tablist" class="tabs tabs-boxed">
                    <a role="tab" class="tab" :class="{'tab-active': activeTab === 'local'}" @click="activeTab = 'local'">Local Upload</a>
                    <a role="tab" class="tab" :class="{'tab-active': activeTab === 'remote'}" @click="activeTab = 'remote'">Remote URL</a>
                </div>

                <!-- Dropzone (Local) -->
                <div v-if="activeTab === 'local'" class="card bg-base-100 shadow-xl border border-base-200">
                    <div class="card-body p-6">
                        <!-- Breadcrumbs -->
                        <div class="flex items-center gap-2 text-sm mb-4 p-3 bg-base-200/50 rounded-lg">
                            <Icon name="lucide:folder-open" class="w-4 h-4 opacity-70" />
                            <span class="opacity-70">Target:</span>
                            <div class="breadcrumbs text-sm p-0">
                                <ul>
                                    <li v-for="(folder, index) in folderPathHistory" :key="index" class="font-medium">
                                        {{ folder.name }}
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <form id="upload_manager_form" class="relative">
                            <label 
                                @dragover="dragEventStart" 
                                @dragenter="dragEventStart" 
                                @dragleave="dragEventEnd"
                                @dragend="dragEventEnd" 
                                @drop="dragEventDrop" 
                                for="upload_manager_input"
                                class="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 group"
                                :class="isDragging ? 'border-primary bg-primary/5 scale-[0.99]' : 'border-base-300 hover:border-primary/50 hover:bg-base-200/30'"
                            >
                                <div class="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                                    <div 
                                        class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors duration-200"
                                        :class="isDragging ? 'bg-primary text-primary-content shadow-lg shadow-primary/30' : 'bg-base-200 text-base-content/50 group-hover:bg-primary/10 group-hover:text-primary'"
                                    >
                                        <Icon name="lucide:cloud-upload" class="w-8 h-8" />
                                    </div>
                                    <p class="mb-2 text-lg font-bold">
                                        <span class="text-primary">Click to upload</span> or drag and drop
                                    </p>
                                    <p class="text-xs opacity-50">Video files (MP4, MKV, AVI, etc.)</p>
                                </div>
                                <input @change="(e: any) => onAddFileToQueue(e.target.files)" id="upload_manager_input" type="file" class="hidden" name="files[]" multiple />
                            </label>
                        </form>
                    </div>
                </div>

                <!-- Remote URL Input -->
                <div v-if="activeTab === 'remote'" class="card bg-base-100 shadow-xl border border-base-200">
                    <div class="card-body p-6">
                        <!-- Breadcrumbs -->
                        <div class="flex items-center gap-2 text-sm mb-4 p-3 bg-base-200/50 rounded-lg">
                            <Icon name="lucide:folder-open" class="w-4 h-4 opacity-70" />
                            <span class="opacity-70">Target:</span>
                            <div class="breadcrumbs text-sm p-0">
                                <ul>
                                    <li v-for="(folder, index) in folderPathHistory" :key="index" class="font-medium">
                                        {{ folder.name }}
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div class="form-control flex flex-col">
                            <label class="label">
                                <span class="label-text">Video URLs (one per line)</span>
                            </label>
                            <textarea 
                                v-model="remoteUrls"
                                class="textarea textarea-bordered h-48 font-mono text-sm w-full" 
                                placeholder="https://example.com/video1.mp4&#10;https://example.com/video2.mkv"
                            ></textarea>
                            <label class="label">
                                <span class="label-text-alt opacity-50">Supported: Direct video links.</span>
                            </label>
                        </div>
                        <div class="card-actions justify-end mt-4">
                            <button 
                                @click="handleRemoteSubmit" 
                                class="btn btn-primary"
                                :disabled="!remoteUrls.trim() || isSubmittingRemote"
                            >
                                <span v-if="isSubmittingRemote" class="loading loading-spinner loading-xs"></span>
                                <Icon v-else name="lucide:download-cloud" class="w-4 h-4" />
                                Add to Queue
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Settings -->
                <div class="card bg-base-100 shadow-xl border border-base-200">
                    <div class="card-body p-6">
                        <div class="flex items-center gap-2 mb-4">
                            <Icon name="lucide:settings-2" class="w-5 h-5 text-secondary" />
                            <h4 class="card-title text-base">Upload Configuration</h4>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="form-control">
                                <label class="label"><span class="label-text">Concurrent Chunks</span></label>
                                <select class="select select-bordered w-full" v-model="localMaxParallelChuncks">
                                    <option :value="1">1 Chunk (Stable)</option>
                                    <option :value="2">2 Chunks</option>
                                    <option :value="4">4 Chunks (Recommended)</option>
                                    <option :value="10">10 Chunks (Fast)</option>
                                    <option :value="15">15 Chunks (Ultra)</option>
                                </select>
                                <label class="label"><span class="label-text-alt opacity-50">Higher values use more bandwidth/CPU.</span></label>
                            </div>
                            
                            <div class="form-control">
                                <label class="label"><span class="label-text">Queue Actions</span></label>
                                <div class="grid grid-cols-2 gap-2">
                                    <button @click="removedFinishedUploadQueueItem" class="btn btn-outline">
                                        <Icon name="lucide:eraser" class="w-4 h-4" /> Clear Done
                                    </button>
                                    <button @click="resetAllErroredUploadQueueItem" class="btn btn-outline">
                                        <Icon name="lucide:rotate-cw" class="w-4 h-4" /> Retry Errors
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Side: List -->
            <div class="lg:col-span-1 h-full min-h-[400px]">
                <UploadList />
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {
    getUploadQueue,
    isUploadingState,
    max_parallel_chuncks,
    startUploadQueue,
    removedFinishedUploadQueueItem,
    resetAllErroredUploadQueueItem,
    addToUploadQueue
} from '@/composables/uploadManager'
import { createRemoteDownload } from '@/composables/remoteDownloadManager'

const localMaxParallelChuncks = ref(max_parallel_chuncks.value)
const isDragging = ref(false)

// Remote Upload Logic
const activeTab = ref<'local' | 'remote'>('local')
const remoteUrls = ref('')
const isSubmittingRemote = ref(false)

async function handleRemoteSubmit() {
    const urls = remoteUrls.value.split('\n').map(u => u.trim()).filter(u => u.length > 0);
    if (urls.length === 0) return;

    isSubmittingRemote.value = true;
    try {
        const lastHistory = folderPathHistory.value.length > 0 ? folderPathHistory.value[folderPathHistory.value.length - 1] : null;
        const folderId = lastHistory?.folderId;
        
        await createRemoteDownload(urls, folderId);
        remoteUrls.value = '';
        // You might want to switch to the list view or show a success message here
    } catch (e) {
        alert("Failed to submit remote downloads");
    } finally {
        isSubmittingRemote.value = false;
    }
}

watch(max_parallel_chuncks, () => {
    if (max_parallel_chuncks.value !== localMaxParallelChuncks.value) {
        localMaxParallelChuncks.value = max_parallel_chuncks.value;
    }
})
watch(localMaxParallelChuncks, () => {
    max_parallel_chuncks.value = localMaxParallelChuncks.value;
})

const isUploading = isUploadingState();
const uploadList = getUploadQueue();

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