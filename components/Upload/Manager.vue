<template>
    <h3 class="font-bold text-lg">Upload Manager</h3>
    <div class="flex flex-col gap-6 sm:flex-row sm:gap-0 w-full">
        <div class="grow mr-6">
            <form id="upload_manager_form" class="mt-2">
                <label
                    @dragover="dragEventStart"
                    @dragenter="dragEventStart"
                    @dragleave="dragEventEnd"
                    @dragend="dragEventEnd"
                    @drop="dragEventDrop"
                    dropzone="link"
                    :class="classes"
                    for="upload_manager_input"
                >
                    <span class="flex items-center space-x-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="w-6 h-6 text-gray-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                        </svg>
                        <span class="font-medium text-gray-600">
                            Drop files to attach, or {{ isAdvancedUpload }}
                            <span class="text-blue-600 underline">browse</span>
                        </span>
                    </span>
                    <input
                        @change="(e: any) => onAddFileToQueue(e.target.files)"
                        id="upload_manager_input"
                        type="file"
                        class="opacity-[0.1] w-[0.1px] h-[0.1px]"
                        name="files[]"
                        data-multiple-caption="{count} files selected"
                        multiple
                    />
                </label>
            </form>
            <div class="mt-2">
                <button
                    @click="startUploadQueue"
                    type="submit"
                    class="btn btn-primary btn-sm"
                    :disabled="uploadList.length === 0 || isUploading"
                >
                    Start Upload
                    <span
                        v-if="isUploading"
                        class="loading loading-spinner"
                    ></span>
                </button>
            </div>
        </div>
        <UploadList />
    </div>
</template>

<script lang="ts" setup>
const isUploading = isUploadingState();
const uploadList = getUploadQueue();
let classes = ref(
    `flex justify-center w-full h-32 px-4 transition bg-base-200 border-2 border-base-100 border-dashed rounded-md appearance-none cursor-pointer`
);

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
