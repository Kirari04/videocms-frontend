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
                    <div class="flex items-center space-x-2">
                        <span v-if="isAdvancedUpload">
                            <IconUpload class="w-6 h-6 text-current" />
                        </span>
                        <span v-if="!isAdvancedUpload">
                            <IconUploadFile class="w-6 h-6 fill-current" />
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
