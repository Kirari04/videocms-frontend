<template>
    <div class="w-full sm:w-1/2">
        <h4 class="flex font-bold text-lg bg-base-300 px-6 py-2 rounded">
            Queue
            <button
                v-if="!isUploading"
                @click="startUploadQueue()"
                class="btn btn-sm ml-auto"
            >
                <IconPlay class="w-6 h-6 fill-current" />
            </button>
            <button
                v-if="isUploading"
                @click="stopUploadQueue()"
                class="btn btn-sm ml-auto"
            >
                <IconPause class="w-6 h-6 fill-current" />
            </button>
        </h4>
        <ul :class="isUploading ? 'flex flex-col' : 'flex flex-col opacity-70'">
            <li class="px-6 py-2 bg-base-200" v-if="list.length === 0">
                No Videos in queue
            </li>
            <li v-if="list.length > 0" class="mt-2"></li>
            <li
                :class="
                    item.deleted
                        ? `flex flex-col max-w-full border-b-2 border-base-300 py-2 transition opacity-70`
                        : `flex flex-col max-w-full border-b-2 border-base-300 py-2 transition`
                "
                v-for="item in list"
            >
                <div class="flex items-center max-w-full overflow-hidden">
                    <div class="flex items-center max-w-full overflow-hidden">
                        <label
                            class="truncate max-w-full"
                            :title="`${item.name}`"
                        >
                            {{ item.name }}
                        </label>
                        <span
                            v-if="item.uploading && isUploading"
                            class="loading loading-spinner loading-sm ml-2"
                        ></span>
                        <span
                            v-if="item.uploading && !isUploading"
                            class="loading loading-infinity loading-xs"
                        ></span>
                    </div>
                    <div class="btn-group ml-auto">
                        <button
                            @click="openLogsModal(item)"
                            v-if="itemHasErrors(item)"
                            :disabled="item.deleted"
                            class="btn btn-xs btn-square"
                        >
                            <IconInfo class="w-4 h-4 stroke-error" />
                        </button>
                        <a
                            v-if="item.serverFile"
                            target="_blank"
                            :href="`${conf.public.baseUrl}/${item.serverFile?.UUID}`"
                            class="btn btn-xs btn-square"
                        >
                            <IconOpen class="w-4 h-4 fill-current" />
                        </a>
                        <button
                            @click="copyFileUrl(item)"
                            v-if="item.serverFile"
                            class="btn btn-xs btn-square"
                        >
                            <IconCopy class="w-4 h-4 fill-current" />
                        </button>
                        <button
                            @click="removeUploadQueueItem(item.uuid)"
                            :disabled="item.deleted"
                            class="btn btn-xs btn-square relative"
                        >
                            <span v-if="!item.deleted && !item.fin"> ✕ </span>
                            <span v-if="!item.deleted && item.fin">
                                <IconDone class="w-4 h-4 fill-success" />
                            </span>
                            <div
                                v-if="item.deleted"
                                class="loading loading-xs loading-spinner absolute"
                            ></div>
                        </button>
                    </div>
                </div>
                <progress
                    :class="
                        item.progress > 0
                            ? `progress progress-primary mt-1 h-1 transition-all`
                            : `progress progress-primary mt-0 opacity-0 h-1 transition-all`
                    "
                    :value="item.progress"
                    max="100"
                ></progress>
            </li>
        </ul>
    </div>
    <dialog id="queueitem_log_modal" class="modal">
        <div class="modal-box max-w-5xl">
            <button
                onclick="queueitem_log_modal.close()"
                type="button"
                class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            >
                ✕
            </button>
            <h4 class="font-bold text-lg">Upload Log</h4>
            <div v-if="showLogOfItem">
                <table class="table">
                    <thead>
                        <tr>
                            <td>Level</td>
                            <td>Title</td>
                            <td>Description</td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="log in showLogOfItem.log"
                            :class="logLevelStyle(log)"
                        >
                            <td>{{ log.level }}</td>
                            <td>{{ log.title }}</td>
                            <td>{{ log.description }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="flex justify-end mt-6">
                <button onclick="queueitem_log_modal.close()" class="btn">
                    Close
                </button>
            </div>
        </div>

        <form method="dialog" class="modal-backdrop">
            <button>Close</button>
        </form>
    </dialog>
</template>

<script lang="ts" setup>
import {
    QueueItem,
    QueueItemLog,
    getUploadQueue,
} from "@/composables/uploadManager";

const conf = useRuntimeConfig();
const list = getUploadQueue();
const isUploading = isUploadingState();
const showLogOfItem = ref<QueueItem | null>(null);

const itemHasErrors = (item: QueueItem) =>
    item.log.filter((e) => e.level === "error").length > 0;
const logLevelStyle = (log: QueueItemLog) => {
    switch (log.level) {
        case `error`:
            return `text-error`;
        case `warn`:
            return `text-warning`;
        default:
            return ``;
    }
};
const openLogsModal = (item: QueueItem) => {
    showLogOfItem.value = item;
    (
        document.getElementById("queueitem_log_modal") as HTMLDialogElement
    ).showModal();
};

const copyFileUrl = (item: QueueItem) => {
    navigator.clipboard
        .writeText(`${conf.public.baseUrl}/${item.serverFile?.UUID}`)
        .then(
            () => {
                // inlineAlert("Copied");
            },
            () => {
                alert("Failed to copy");
            }
        );
};
</script>
