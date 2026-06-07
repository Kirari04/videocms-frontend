<template>
    <div class="card bg-base-100 shadow-xl border border-base-200 h-full flex flex-col">
        <div class="card-body p-0 flex flex-col h-full overflow-hidden">
            <!-- Tabs / Header -->
            <div class="p-4 border-b border-base-200 flex items-center justify-between shrink-0">
                <div class="flex items-center gap-2">
                    <button
                        @click="activeListTab = 'local'"
                        class="btn btn-sm"
                        :class="activeListTab === 'local' ? 'btn-primary' : 'btn-ghost'"
                    >
                        <Icon name="lucide:list" class="w-4 h-4" /> Local
                    </button>
                    <button
                        @click="activeListTab = 'remote'"
                        class="btn btn-sm"
                        :class="activeListTab === 'remote' ? 'btn-primary' : 'btn-ghost'"
                    >
                        <Icon name="lucide:cloud-download" class="w-4 h-4" /> Remote
                    </button>
                </div>

	                <div class="flex gap-2" v-if="activeListTab === 'local'">
	                    <button v-if="!isUploading" @click="startUploadQueue()" class="btn btn-sm btn-ghost btn-square" title="Start All">
	                        <Icon name="lucide:play" class="w-5 h-5 text-success" />
	                    </button>
	                    <button v-if="isUploading" @click="stopUploadQueue()" class="btn btn-sm btn-ghost btn-square" title="Pause All">
	                        <Icon name="lucide:pause" class="w-5 h-5 text-warning" />
	                    </button>
	                </div>
	                <div class="flex gap-1" v-else>
	                    <button @click="clearRemote(['completed'])" :disabled="remoteBulkBusy" class="btn btn-sm btn-ghost btn-square" title="Clear Completed">
	                        <Icon name="lucide:check-check" class="w-4 h-4 text-success" />
	                    </button>
	                    <button @click="clearRemote(['failed', 'canceled'])" :disabled="remoteBulkBusy" class="btn btn-sm btn-ghost btn-square" title="Clear Failed/Canceled">
	                        <Icon name="lucide:eraser" class="w-4 h-4 text-warning" />
	                    </button>
	                    <button @click="fetchRemoteDownloads()" :disabled="isFetchingRemote" class="btn btn-sm btn-ghost btn-square" title="Refresh Remote Downloads">
	                        <Icon name="lucide:rotate-cw" class="w-4 h-4" :class="{'animate-spin': isFetchingRemote}" />
	                    </button>
	                </div>
	            </div>

            <!-- Queue List (Scrollable) -->
            <div class="overflow-y-auto flex-1 p-2">
                <!-- Local Queue -->
                <div v-if="activeListTab === 'local'" class="h-full">
                    <div v-if="list.length === 0" class="flex flex-col items-center justify-center h-full opacity-50 gap-2 py-8">
                        <Icon name="lucide:coffee" class="w-12 h-12" />
                        <p>No files in queue</p>
                    </div>

                    <div v-else class="flex flex-col gap-2">
                        <div
                            v-for="item in list"
                            :key="item.uuid"
                            class="p-3 rounded-lg border border-base-200 bg-base-200/30 transition-all hover:bg-base-200"
                            :class="{'opacity-50 grayscale': item.deleted}"
                        >
                            <div class="flex items-center gap-3 mb-2">
                                <!-- Status Icon -->
                                <div v-if="item.uploading && isUploading" class="loading loading-spinner loading-xs text-primary"></div>
                                <div v-else-if="item.fin" class="text-success"><Icon name="lucide:check-circle" class="w-4 h-4" /></div>
                                <div v-else-if="itemHasErrors(item)" class="text-error"><Icon name="lucide:alert-circle" class="w-4 h-4" /></div>
                                <div v-else class="text-base-content/30"><Icon name="lucide:file-video" class="w-4 h-4" /></div>

                                <!-- Name -->
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium truncate" :title="item.name">{{ item.name }}</p>
                                </div>

                                <!-- Actions -->
                                <div class="flex gap-1 shrink-0">
                                    <button @click="openLogsModal(item)" v-if="itemHasErrors(item)" :disabled="item.deleted" class="btn btn-xs btn-ghost text-error" title="Logs">
                                        <Icon name="lucide:info" class="w-3 h-3" />
                                    </button>
                                    <button @click="resetErroredUploadQueueItem(item.uuid)" v-if="itemHasErrors(item)" :disabled="item.deleted" class="btn btn-xs btn-ghost text-primary" title="Retry">
                                        <Icon name="lucide:rotate-cw" class="w-3 h-3" />
                                    </button>
                                    <a v-if="item.serverFile" target="_blank" :href="`${conf.public.baseUrl}/v/${item.serverFile?.UUID}`" class="btn btn-xs btn-ghost" title="Open">
                                        <Icon name="lucide:external-link" class="w-3 h-3" />
                                    </a>
                                    <button @click="copyFileUrl(item)" v-if="item.serverFile" class="btn btn-xs btn-ghost" title="Copy URL">
                                        <Icon name="lucide:copy" class="w-3 h-3" />
                                    </button>
                                    <button @click="removeUploadQueueItem(item.uuid)" :disabled="item.deleted" class="btn btn-xs btn-ghost text-base-content/50 hover:text-error" title="Remove">
                                        <Icon name="lucide:x" class="w-3 h-3" />
                                    </button>
                                </div>
                            </div>

                            <!-- Progress Bar -->
                            <div class="w-full bg-base-300 rounded-full h-1.5 overflow-hidden">
                                <div
                                    class="bg-primary h-full transition-all duration-300"
                                    :style="`width: ${item.progress}%`"
                                    :class="{'bg-success': item.fin, 'bg-error': itemHasErrors(item)}"
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

	                <!-- Remote Queue -->
	                <div v-if="activeListTab === 'remote'" class="h-full">
	                    <div v-if="remoteError" class="alert alert-error text-xs p-2 mb-2">
	                        <Icon name="lucide:alert-circle" class="w-4 h-4" /> {{ remoteError }}
	                    </div>
	                    <div v-if="remoteDownloads.length === 0" class="flex flex-col items-center justify-center h-full opacity-50 gap-2 py-8">
                        <span v-if="isFetchingRemote" class="loading loading-spinner loading-lg"></span>
                        <div v-else class="flex flex-col items-center gap-2">
                            <Icon name="lucide:cloud-off" class="w-12 h-12" />
                            <p>No remote downloads found</p>
                        </div>
                    </div>

                    <div v-else class="flex flex-col gap-2">
                        <div
                            v-for="item in remoteDownloads"
                            :key="item.ID"
                            class="p-3 rounded-lg border border-base-200 bg-base-200/30 transition-all hover:bg-base-200"
                        >
                            <div class="flex items-center gap-3 mb-2">
	                                <!-- Status Icon -->
	                                <div v-if="isRemoteActive(item)" class="loading loading-spinner loading-xs text-info"></div>
	                                <div v-else-if="item.Status === 'completed'" class="text-success"><Icon name="lucide:check-circle" class="w-4 h-4" /></div>
	                                <div v-else-if="item.Status === 'failed'" class="text-error"><Icon name="lucide:alert-circle" class="w-4 h-4" /></div>
	                                <div v-else-if="item.Status === 'canceled'" class="text-warning"><Icon name="lucide:circle-off" class="w-4 h-4" /></div>
	                                <div v-else class="text-base-content/30"><Icon name="lucide:help-circle" class="w-4 h-4" /></div>

	                                <!-- Name/URL -->
	                                <div class="flex-1 min-w-0">
	                                    <p class="text-sm font-medium truncate" :title="item.Url">{{ item.Name || item.Url }}</p>
	                                    <p class="text-xs opacity-60 truncate">{{ remoteStatusLabel(item) }} · {{ formatRemoteBytes(item) }}</p>
	                                    <p v-if="item.Error" class="text-xs text-error truncate">{{ item.Error }}</p>
	                                </div>

	                                <!-- Actions -->
	                                <div class="flex gap-1 shrink-0">
	                                    <a v-if="item.LinkUUID" target="_blank" :href="`${conf.public.baseUrl}/v/${item.LinkUUID}`" class="btn btn-xs btn-ghost" title="Open">
	                                        <Icon name="lucide:external-link" class="w-3 h-3" />
	                                    </a>
	                                    <button @click="copyRemoteFileUrl(item)" v-if="item.LinkUUID" class="btn btn-xs btn-ghost" title="Copy URL">
	                                        <Icon name="lucide:copy" class="w-3 h-3" />
	                                    </button>
	                                    <button @click="cancelRemote(item)" v-if="canCancelRemote(item)" :disabled="remoteActionBusy[item.ID] === 'cancel'" class="btn btn-xs btn-ghost text-warning" title="Cancel">
	                                        <span v-if="remoteActionBusy[item.ID] === 'cancel'" class="loading loading-spinner loading-xs"></span>
	                                        <Icon v-else name="lucide:ban" class="w-3 h-3" />
	                                    </button>
	                                    <button @click="retryRemote(item)" v-if="canRetryRemote(item)" :disabled="remoteActionBusy[item.ID] === 'retry'" class="btn btn-xs btn-ghost text-primary" title="Retry">
	                                        <span v-if="remoteActionBusy[item.ID] === 'retry'" class="loading loading-spinner loading-xs"></span>
	                                        <Icon v-else name="lucide:rotate-cw" class="w-3 h-3" />
	                                    </button>
	                                    <button @click="deleteRemote(item)" v-if="isRemoteTerminal(item)" :disabled="remoteActionBusy[item.ID] === 'delete'" class="btn btn-xs btn-ghost text-base-content/50 hover:text-error" title="Remove">
	                                        <span v-if="remoteActionBusy[item.ID] === 'delete'" class="loading loading-spinner loading-xs"></span>
	                                        <Icon v-else name="lucide:x" class="w-3 h-3" />
	                                    </button>
	                                </div>
	                            </div>

	                            <!-- Progress Bar -->
	                            <div v-if="isRemoteActive(item)" class="w-full bg-base-300 rounded-full h-1.5 overflow-hidden">
	                                <div
	                                    class="bg-info h-full transition-all duration-300"
	                                    :style="`width: ${remoteProgressWidth(item)}%`"
	                                ></div>
	                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Active Sessions Footer -->
            <div class="border-t border-base-200 bg-base-200/30 p-4 shrink-0">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-bold uppercase opacity-50 flex items-center gap-1">
                        <Icon name="lucide:activity" class="w-3 h-3" /> Active Sessions
                    </span>
                    <button :disabled="isLoading" @click="refreshSessions()" class="btn btn-xs btn-ghost" title="Refresh Sessions">
                        <Icon name="lucide:rotate-cw" class="w-3 h-3" :class="{'animate-spin': isLoading}" />
                    </button>
                </div>

                <div v-if="errorSessions" class="alert alert-error text-xs p-2 mb-2">
                    <Icon name="lucide:alert-circle" class="w-4 h-4" /> {{ errorSessions }}
                </div>
                <div v-if="errorsDelete" class="alert alert-error text-xs p-2 mb-2">
                    <Icon name="lucide:trash-2" class="w-4 h-4" /> {{ errorsDelete }}
                </div>

                <div class="max-h-32 overflow-y-auto space-y-1">
                    <div v-for="session in dataSessions" :key="session.UUID" class="flex items-center justify-between p-2 bg-base-100 rounded text-xs border border-base-200">
                        <div class="truncate mr-2">
                            <div class="font-bold truncate" :title="session.Name">{{ session.Name }}</div>
                            <div class="opacity-50">{{ new Date(session.CreatedAt).toLocaleString() }}</div>
                        </div>
                        <button :disabled="isLoadingDelete || isLoading" @click="deleteSession(session.UUID)" class="btn btn-xs btn-error btn-outline btn-square">
                            <Icon name="lucide:trash-2" class="w-3 h-3" />
                        </button>
                    </div>
                    <div v-if="!dataSessions || dataSessions.length === 0" class="text-center text-xs opacity-50 py-2">
                        No active background sessions.
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Log Modal -->
    <Teleport to="body">
        <dialog id="queueitem_log_modal" class="modal">
            <div class="modal-box w-11/12 max-w-3xl">
                <form method="dialog">
                    <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                </form>
                <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
                    <Icon name="lucide:scroll-text" class="w-5 h-5" /> Upload Log
                </h3>

                <div v-if="showLogOfItem" class="overflow-x-auto bg-base-200 rounded-lg p-2 max-h-[60vh]">
                    <table class="table table-xs table-zebra">
                        <thead>
                            <tr>
                                <th>Level</th>
                                <th>Message</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(log, i) in showLogOfItem.log" :key="i" :class="logLevelStyle(log)">
                                <td class="uppercase font-bold">{{ log.level }}</td>
                                <td>{{ log.title }}</td>
                                <td class="font-mono opacity-70">{{ log.description }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="modal-action">
                    <form method="dialog">
                        <button class="btn">Close</button>
                    </form>
                </div>
            </div>
            <form method="dialog" class="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    </Teleport>
</template>

<script lang="ts" setup>
import {
    type QueueItem,
    type QueueItemLog,
    getUploadQueue,
    isUploadingState,
    stopUploadQueue,
    startUploadQueue,
    removeUploadQueueItem,
    resetErroredUploadQueueItem,
} from "@/composables/uploadManager";
import {
    useRemoteDownloads,
    startRemoteDownloadPolling,
    stopRemoteDownloadPolling,
    fetchRemoteDownloads,
    cancelRemoteDownload,
    retryRemoteDownload,
    deleteRemoteDownload,
    clearRemoteDownloads,
    remoteDownloadApiError,
    type RemoteDownload,
    type RemoteDownloadStatus
} from "@/composables/remoteDownloadManager";

const conf = useRuntimeConfig();
const list = getUploadQueue();
const isUploading = isUploadingState();
const showLogOfItem = ref<QueueItem | null>(null);

// Remote Download Logic
const activeListTab = ref<'local' | 'remote'>('local');
const { remoteDownloads, isFetching: isFetchingRemote } = useRemoteDownloads();
const remoteError = ref<string | null>(null);
const remoteBulkBusy = ref(false);
const remoteActionBusy = ref<Record<number, string>>({});

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
    if (item.serverFile?.UUID) {
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
    }
};

const isRemoteActive = (item: RemoteDownload) =>
    item.Status === "pending" || item.Status === "downloading" || item.Status === "importing" || item.Status === "canceling";
const isRemoteTerminal = (item: RemoteDownload) =>
    item.Status === "completed" || item.Status === "failed" || item.Status === "canceled";
const canCancelRemote = (item: RemoteDownload) =>
    item.Status === "pending" || item.Status === "downloading" || item.Status === "importing";
const canRetryRemote = (item: RemoteDownload) =>
    item.Status === "failed" || item.Status === "canceled";
const remoteProgressWidth = (item: RemoteDownload) => {
    const progress = Number.isFinite(item.Progress) ? item.Progress : 0;
    return Math.max(0, Math.min(100, Math.round(progress * 100)));
};
const remoteStatusLabel = (item: RemoteDownload) => {
    switch (item.Status) {
        case "pending": return "Pending";
        case "downloading": return "Downloading";
        case "importing": return "Importing";
        case "completed": return "Completed";
        case "failed": return "Failed";
        case "canceling": return "Canceling";
        case "canceled": return "Canceled";
        default: return item.Status;
    }
};
const formatRemoteBytes = (item: RemoteDownload) => {
    const downloaded = item.BytesDownloaded || 0;
    const total = item.TotalSize || 0;
    if (total > 0) {
        return `${humanFileSize(downloaded)} / ${humanFileSize(total)}`;
    }
    return downloaded > 0 ? humanFileSize(downloaded) : "0 B";
};
const copyRemoteFileUrl = (item: RemoteDownload) => {
    if (!item.LinkUUID) return;
    navigator.clipboard
        .writeText(`${conf.public.baseUrl}/v/${item.LinkUUID}`)
        .catch(() => {
            remoteError.value = "Failed to copy remote download URL";
        });
};
const runRemoteAction = async (item: RemoteDownload, action: string, handler: () => Promise<void>) => {
    remoteError.value = null;
    remoteActionBusy.value = { ...remoteActionBusy.value, [item.ID]: action };
    try {
        await handler();
    } catch (error: any) {
        remoteError.value = remoteDownloadApiError(error);
    } finally {
        const nextBusy = { ...remoteActionBusy.value };
        delete nextBusy[item.ID];
        remoteActionBusy.value = nextBusy;
    }
};
const cancelRemote = (item: RemoteDownload) =>
    runRemoteAction(item, "cancel", () => cancelRemoteDownload(item.ID));
const retryRemote = (item: RemoteDownload) =>
    runRemoteAction(item, "retry", () => retryRemoteDownload(item.ID));
const deleteRemote = (item: RemoteDownload) =>
    runRemoteAction(item, "delete", () => deleteRemoteDownload(item.ID));
const clearRemote = async (statuses: RemoteDownloadStatus[]) => {
    remoteError.value = null;
    remoteBulkBusy.value = true;
    try {
        await clearRemoteDownloads(statuses);
    } catch (error: any) {
        remoteError.value = remoteDownloadApiError(error);
    } finally {
        remoteBulkBusy.value = false;
    }
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
    refreshSessions() // Initial load
    startRemoteDownloadPolling(2000);
    sessionIntv = setInterval(() => {
        const upload_modal = (document.getElementById("upload_modal") as HTMLDialogElement | undefined)
        if (upload_modal && upload_modal.open) {
            refreshSessions()
        }
    }, 5000)
})
onUnmounted(() => {
    if (sessionIntv) clearInterval(sessionIntv)
    stopRemoteDownloadPolling();
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
