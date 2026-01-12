<template>
    <h3 class="font-bold text-lg">Upload Manager</h3>
    <div class="flex flex-col gap-6 sm:flex-row sm:gap-0 w-full">
        <div class="grow mr-6">
            <form id="upload_manager_form" class="mt-2">
                <label @dragover="dragEventStart" @dragenter="dragEventStart" @dragleave="dragEventEnd"
                    @dragend="dragEventEnd" @drop="dragEventDrop" dropzone="link" :class="classes"
                    for="upload_manager_input">
                    <div class="flex items-center space-x-2">
                        <span v-if="isAdvancedUpload">
                            <Icon name="lucide:upload" class="w-6 h-6 text-current" />
                        </span>
                        <span v-if="!isAdvancedUpload">
                            <Icon name="lucide:file-up" class="w-6 h-6 fill-current" />
                        </span>
                        <span v-if="isAdvancedUpload">
                            Drop files to attach, or
                            <span class="link link-primary">browse</span>
                        </span>
                        <span v-if="!isAdvancedUpload">
                            <span class="link link-primary">Browse</span>
                            files to attach
                        </span>
                    </div>
                    <input @change="(e: any) => onAddFileToQueue(e.target.files)" id="upload_manager_input" type="file"
                        class="opacity-[0.1] w-[0.1px] h-[0.1px]" name="files[]"
                        data-multiple-caption="{count} files selected" multiple />
                </label>
            </form>
            <div class="mt-2 flex flex-col">
                <strong>Uploading into Folder:</strong>
                <div class="breadcrumbs">
                    <ul class="flex flex-wrap">
                        <li v-for="(folder, index) in folderPathHistory">
                            <div class="flex items-center">
                                <Icon name="lucide:folder" class="w-4 h-4 mr-2 stroke-current" />
                                <span class="w-28 max-w-min truncate">{{
                                    folder.name
                                    }}</span>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
            <div class="mt-2">
                <button @click="startUploadQueue" type="submit" class="btn btn-primary btn-sm"
                    :disabled="uploadList.length === 0 || isUploading">
                    Start Upload
                    <span v-if="isUploading" class="loading loading-spinner"></span>
                </button>
            </div>
            <h4 class="flex font-bold text-lg bg-base-300 px-6 mt-6 py-2 rounded">
                Upload Settings
            </h4>
            <div class="bg-base-200 overflow-x-auto">
                <table class="table">
                    <tbody>
                        <tr>
                            <td>
                                Parallel Chuncks to upload.
                            </td>
                            <td>
                                <div class="dropdown dropdown-top">
                                    <div tabindex="0" role="button" class="btn btn-sm btn-outline m-1">{{
                                        localMaxParallelChuncks
                                        }} Chuncks
                                    </div>
                                    <ul tabindex="0"
                                        class="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box w-52">
                                        <li v-for="v in [1, 2, 4, 10, 15]">
                                            <button @click="setLocalMaxParallelChuncks(v)">{{ v }} Chuncks</button>
                                        </li>
                                    </ul>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                Remove uploaded files from List.
                            </td>
                            <td>
                                <button @click="removedFinishedUploadQueueItem" class="btn btn-sm btn-outline">
                                    Remove Finished
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                Reset errored files from List.
                            </td>
                            <td>
                                <button @click="resetAllErroredUploadQueueItem" class="btn btn-sm btn-outline">
                                    Reset
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <UploadList />
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
} from '@/composables/uploadManager'

const localMaxParallelChuncks = ref(max_parallel_chuncks.value)
const setLocalMaxParallelChuncks = (nr: number) => {
    localMaxParallelChuncks.value = nr;
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
let classes = ref(
    `flex justify-center w-full h-32 px-4 transition bg-base-200 border-2 border-base-100 border-dashed rounded-md appearance-none cursor-pointer`
);

const folderPathHistory = useState<
    Array<{
        name: string;
        folderId: number;
    }>
>("folderPathHistory", () => ([]));

let isAdvancedUpload = ref(false);
if (process.client) {
    isAdvancedUpload.value = (function () {
        var div = document.createElement("div");
        return (
            ("draggable" in div || ("ondragstart" in div && "ondrop" in div)) &&
            "FormData" in window &&
            "FileReader" in window
        );
    })();
}

function dragEventStart(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    classes.value = `flex justify-center w-full h-32 px-4 transition bg-base-200 border-2 border-gray-400 outline-none border-dashed rounded-md appearance-none cursor-pointer`;
}
function dragEventEnd(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    classes.value = `flex justify-center w-full h-32 px-4 transition bg-base-200 border-2 border-base-100 border-dashed rounded-md appearance-none cursor-pointer`;
}
function dragEventDrop(e: any) {
    e.preventDefault();
    e.stopPropagation();
    classes.value = `flex justify-center w-full h-32 px-4 transition bg-base-200 border-2 border-base-100 border-dashed rounded-md appearance-none cursor-pointer`;
    onAddFileToQueue(e.dataTransfer.files);
}

function onAddFileToQueue(files: FileList) {
    if (files) addToUploadQueue(files);

    const upload_manager_form = document.getElementById(
        "upload_manager_form"
    ) as HTMLFormElement;
    upload_manager_form.reset();
}
</script>
