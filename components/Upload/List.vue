<template>
    <div class="w-full sm:w-1/2">
        <h4 class="font-bold text-lg bg-base-300 px-6 py-2 rounded">Queue</h4>
        <ul class="flex flex-col">
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
                    <div class="flex flex-col max-w-full overflow-hidden">
                        <label
                            class="truncate max-w-full"
                            :title="`${item.name}`"
                        >
                            {{ item.name }}
                        </label>
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
                        <button
                            @click="removeUploadQueueItem(item.uuid)"
                            :disabled="item.deleted"
                            class="btn btn-xs btn-square relative"
                        >
                            <IconDelete
                                v-if="!item.deleted"
                                class="w-4 h-4stroke-current fill-current"
                            />
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
import { QueueItem, QueueItemLog } from "composables/uploadManager";

const list = getUploadQueue();
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
</script>
