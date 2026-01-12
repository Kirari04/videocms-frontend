<template>
    <div class="w-full sm:w-1/2">
        <h4 class="flex font-bold text-lg bg-base-300 px-6 py-2 rounded">
            Queue
            <div class="flex items-center gap-2 ml-auto">
                <button v-if="!isUploading" @click="startUploadQueue()" class="btn btn-sm">
                    <IconPlay class="w-6 h-6 fill-current" />
                </button>
                <button v-if="isUploading" @click="stopUploadQueue()" class="btn btn-sm">
                    <IconPause class="w-6 h-6 fill-current" />
                </button>
            </div>
        </h4>
        <ul :class="isUploading ? 'flex flex-col' : 'flex flex-col opacity-70'">
            <li class="px-6 py-2 bg-base-200" v-if="list.length === 0">
                No Videos in queue
            </li>
            <li v-if="list.length > 0" class="mt-2"></li>
            <li :class="item.deleted
                ? `flex flex-col max-w-full border-b-2 border-base-300 py-2 transition opacity-70`
                : `flex flex-col max-w-full border-b-2 border-base-300 py-2 transition`
                " v-for="item in list">
                <div class="flex items-center max-w-full overflow-hidden">
                    <div class="flex items-center max-w-full overflow-hidden">
                        <label class="truncate max-w-full" :title="`${item.name}`">
                            {{ item.name }}
                        </label>
                        <span v-if="item.uploading && isUploading" class="loading loading-spinner loading-sm ml-2"></span>
                        <span v-if="item.uploading && !isUploading" class="loading loading-infinity loading-xs"></span>
                        <span v-if="item.fin">
                            <IconDone class="w-4 h-4 fill-success" />
                        </span>
                    </div>
                    <div class="btn-group ml-auto">
                        <button @click="openLogsModal(item)" v-if="itemHasErrors(item)" :disabled="item.deleted"
                            class="btn btn-xs btn-square">
                            <IconInfo class="w-4 h-4 stroke-error" />
                        </button>
                        <button @click="resetErroredUploadQueueItem(item.uuid)" v-if="itemHasErrors(item)"
                            :disabled="item.deleted" class="btn btn-xs btn-square">
                            <IconPlay class="w-4 h-4 fill-primary" />
                        </button>
                        <a v-if="item.serverFile" target="_blank" :href="`${conf.public.baseUrl}/v/${item.serverFile?.UUID}`"
                            class="btn btn-xs btn-square">
                            <IconOpen class="w-4 h-4 fill-current" />
                        </a>
                        <button @click="copyFileUrl(item)" v-if="item.serverFile" class="btn btn-xs btn-square">
                            <IconCopy class="w-4 h-4 fill-current" />
                        </button>
                        <button @click="removeUploadQueueItem(item.uuid)" :disabled="item.deleted"
                            class="btn btn-xs btn-square relative">
                            <span v-if="!item.deleted"> ✕ </span>
                            <div v-if="item.deleted" class="loading loading-xs loading-spinner absolute"></div>
                        </button>
                    </div>
                </div>
                <progress :class="item.progress > 0
                    ? `progress progress-primary mt-1 h-1 transition-all`
                    : `progress progress-primary mt-0 opacity-0 h-1 transition-all`
                    " :value="item.progress" max="100"></progress>
            </li>
        </ul>
        <h4 class="flex font-bold text-lg bg-base-300 px-6 mt-6 py-2 rounded">
            Active Upoad Sessions
        </h4>
        <ul class="flex flex-col min-w-0">
            <li class="flex items-center px-6 py-2 bg-base-200 min-w-0" v-if="errorSessions">
                Sessions Error: {{ errorSessions }}
            </li>
            <li class="flex items-center px-6 py-2 bg-base-200 min-w-0" v-if="errorsDelete">
                Delete Error: {{ errorsDelete }}
            </li>
            <li class="flex items-center px-6 py-2 bg-base-200 min-w-0">
                <button :disabled="isLoading" @click="refreshSessions()" class="btn btn-outline btn-sm">
                    <div v-if="isLoading" class="loading loading-spinner"></div>
                    Reload
                </button>
            </li>
            <li class="flex items-center px-6 py-2 bg-base-200 min-w-0" v-for="session in dataSessions">
                <div class="flex flex-col min-w-0">
                    <p class="font-bold overflow-hidden text-ellipsis">{{ session.Name }}</p>
                    <p class="text-sm opacity-70">{{ new Date(session.CreatedAt).toLocaleString() }}</p>
                </div>
                <button :disabled="isLoadingDelete || isLoading" @click="deleteSession(session.UUID)"
                    class="btn btn-sm btn-error ml-auto">
                    <div v-if="isLoadingDelete" class="loading loading-spinner"></div>
                    Delete
                </button>
            </li>
        </ul>
    </div>
    <!-- MODELS -->
    <dialog id="queueitem_log_modal" class="modal">
        <div class="modal-box max-w-5xl">
            <button onclick="queueitem_log_modal.close()" type="button"
                class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                ✕
            </button>
            <h4 class="font-bold text-lg">Upload Log</h4>
            <div v-if="showLogOfItem" class="overflow-x-auto">
                <table class="table">
                    <thead>
                        <tr>
                            <td>Level</td>
                            <td>Title</td>
                            <td>Description</td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="log in showLogOfItem.log" :class="logLevelStyle(log)">
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
    type QueueItem,
    type QueueItemLog,
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
        .writeText(`${conf.public.baseUrl}/v/${item.serverFile?.UUID}`)
        .then(
            () => {
                // inlineAlert("Copied");
            },
            () => {
                alert("Failed to copy");
            }
        );
};
interface Session {
    ID: number
    CreatedAt: string
    Name: string
    UUID: string
    Size: number
    ChunckCount: number
}
const token = useToken()
const dataSessions = ref<Session[] | null>(null)
const errorSessions = ref<string | null>(null)
const isLoading = ref<boolean>(false)
async function refreshSessions() {
    isLoading.value = true;
    errorSessions.value = null;
    try {
        const data = await $fetch<Session[]>(`${conf.public.apiUrl}/pcu/sessions`, {
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            retry: 5,
        });
        if (data) {
            dataSessions.value = data;
        }
    } catch (error: any) {
        errorSessions.value = `${error.data ? error.data : error.message}`;
    }
    isLoading.value = false;
}

let sessionIntv: NodeJS.Timeout | null = null;
onMounted(() => {
    sessionIntv = setInterval(() => {
        const upload_modal = (document.getElementById("upload_modal") as HTMLDialogElement | undefined)
        if (upload_modal && upload_modal.open) {
            refreshSessions()
        }
    }, 5000)
})
onUnmounted(() => {
    if (sessionIntv) clearInterval(sessionIntv)
})

const errorsDelete = ref<null | string>(null)
const isLoadingDelete = ref<boolean>(false)
async function deleteSession(uuid: string) {
    isLoadingDelete.value = true;
    errorsDelete.value = null;
    try {
        await $fetch<string>(`${conf.public.apiUrl}/pcu/session`, {
            method: "delete",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: {
                UploadSessionUUID: uuid,
            }
        });
    } catch (error: any) {
        errorsDelete.value = `${error.data ? error.data : error.message}`;
    }
    isLoadingDelete.value = false;
    refreshSessions();
}
</script>
