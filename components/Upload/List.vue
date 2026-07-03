<template>
    <div class="flex h-full flex-col rounded-box border border-base-300 bg-base-100">
        <div class="flex h-full flex-col overflow-hidden">
            <!-- Tabs / Header -->
            <div class="flex shrink-0 flex-col gap-3 border-b border-base-300 p-3">
                <div class="flex min-w-0 items-center justify-between gap-2">
                    <div role="tablist" class="tabs tabs-box tabs-sm shrink-0">
                        <a role="tab" class="tab gap-1.5" :class="{ 'tab-active': activeListTab === 'local' }"
                            @click="activeListTab = 'local'">
                            <Icon name="lucide:list" class="h-3.5 w-3.5" /> Local
                        </a>
                        <a role="tab" class="tab gap-1.5" :class="{ 'tab-active': activeListTab === 'remote' }"
                            @click="activeListTab = 'remote'">
                            <Icon name="lucide:cloud-download" class="h-3.5 w-3.5" /> Remote
                        </a>
                    </div>

                    <div class="flex shrink-0 items-center gap-1" v-if="activeListTab === 'local'">
                        <button @click="removedFinishedUploadQueueItem()" class="btn btn-square btn-ghost btn-sm"
                            title="Clear finished" aria-label="Clear finished uploads">
                            <Icon name="lucide:eraser" class="h-4 w-4" />
                        </button>
                        <button @click="resetAllErroredUploadQueueItem()" class="btn btn-square btn-ghost btn-sm"
                            title="Retry errors" aria-label="Retry errored uploads">
                            <Icon name="lucide:rotate-cw" class="h-4 w-4" />
                        </button>
                        <button v-if="!isUploading" @click="startUploadQueue()" class="btn btn-square btn-ghost btn-sm"
                            title="Start all" aria-label="Start all uploads">
                            <Icon name="lucide:play" class="h-4 w-4 text-success" />
                        </button>
                        <button v-if="isUploading" @click="stopUploadQueue()" class="btn btn-square btn-ghost btn-sm"
                            title="Pause all" aria-label="Pause all uploads">
                            <Icon name="lucide:pause" class="h-4 w-4 text-warning" />
                        </button>
                    </div>
                    <div class="flex shrink-0 gap-1" v-else>
                        <button @click="clearRemote(['completed'])" :disabled="remoteBulkBusy"
                            class="btn btn-square btn-ghost btn-sm" title="Clear completed" aria-label="Clear completed">
                            <Icon name="lucide:check-check" class="h-4 w-4" />
                        </button>
                        <button @click="clearRemote(['failed', 'canceled'])" :disabled="remoteBulkBusy"
                            class="btn btn-square btn-ghost btn-sm" title="Clear failed and canceled"
                            aria-label="Clear failed and canceled">
                            <Icon name="lucide:eraser" class="h-4 w-4" />
                        </button>
                        <button @click="fetchRemoteDownloads()" :disabled="isFetchingRemote"
                            class="btn btn-square btn-ghost btn-sm" title="Refresh" aria-label="Refresh remote downloads">
                            <Icon name="lucide:rotate-cw" class="h-4 w-4" :class="{ 'animate-spin': isFetchingRemote }" />
                        </button>
                    </div>
                </div>
                <div v-if="activeListTab === 'local' && activeUploadCount > 0"
                    class="flex min-w-0 items-center gap-1.5 rounded-selector bg-base-200 px-2 py-1 text-xs tabular-nums text-base-content/70">
                    <Icon name="lucide:gauge" class="h-3 w-3 shrink-0" />
                    <span class="min-w-0 flex-1 truncate">{{ activeUploadCount }} active · {{ formatUploadSpeed(uploadSpeed) }} total</span>
                </div>
            </div>

            <!-- Queue List (Scrollable) -->
            <div class="flex-1 overflow-y-auto p-2">
                <!-- Local Queue -->
                <div v-if="activeListTab === 'local'" class="h-full">
                    <div v-if="list.length === 0"
                        class="flex h-full flex-col items-center justify-center gap-1 py-8 text-center">
                        <Icon name="lucide:file-video" class="h-6 w-6 text-base-content/30" />
                        <p class="text-sm text-base-content/60">No files in the queue yet</p>
                    </div>

                    <div v-else class="flex flex-col gap-2">
                        <div
                            v-for="item in list"
                            :key="item.uuid"
                            class="rounded-field border border-base-300 p-3 transition-colors hover:bg-base-200/60"
                            :class="{ 'opacity-50 grayscale': item.deleted }"
                        >
                            <div class="mb-2 flex items-center gap-3">
                                <!-- Status Icon -->
                                <div v-if="item.uploading && isUploading" class="loading loading-spinner loading-xs text-primary"></div>
                                <div v-else-if="item.fin" class="text-success"><Icon name="lucide:check-circle-2" class="h-4 w-4" /></div>
                                <div v-else-if="itemHasErrors(item)" class="text-error"><Icon name="lucide:alert-circle" class="h-4 w-4" /></div>
                                <div v-else class="text-base-content/30"><Icon name="lucide:file-video" class="h-4 w-4" /></div>

                                <!-- Name -->
                                <div class="min-w-0 flex-1">
                                    <p class="truncate text-sm font-medium" :title="item.name">{{ item.name }}</p>
                                    <p class="truncate text-xs tabular-nums text-base-content/60">{{ localUploadStatus(item) }}</p>
                                </div>

                                <!-- Actions -->
                                <div class="flex shrink-0 gap-1">
                                    <button @click="openLogsModal(item)" v-if="itemHasErrors(item)" :disabled="item.deleted"
                                        class="btn btn-ghost btn-xs text-error" title="Logs" aria-label="Show logs">
                                        <Icon name="lucide:info" class="h-3 w-3" />
                                    </button>
                                    <button @click="resetErroredUploadQueueItem(item.uuid)" v-if="itemHasErrors(item)"
                                        :disabled="item.deleted" class="btn btn-ghost btn-xs text-primary" title="Retry"
                                        aria-label="Retry upload">
                                        <Icon name="lucide:rotate-cw" class="h-3 w-3" />
                                    </button>
                                    <a v-if="item.serverFile" target="_blank"
                                        :href="`${conf.public.baseUrl}/v/${item.serverFile?.UUID}`" class="btn btn-ghost btn-xs"
                                        title="Open" aria-label="Open video">
                                        <Icon name="lucide:external-link" class="h-3 w-3" />
                                    </a>
                                    <button @click="copyFileUrl(item)" v-if="item.serverFile" class="btn btn-ghost btn-xs"
                                        title="Copy URL" aria-label="Copy video URL">
                                        <Icon name="lucide:copy" class="h-3 w-3" />
                                    </button>
                                    <button @click="removeUploadQueueItem(item.uuid)" :disabled="item.deleted"
                                        class="btn btn-ghost btn-xs text-base-content/50 hover:text-error" title="Remove"
                                        aria-label="Remove from queue">
                                        <Icon name="lucide:x" class="h-3 w-3" />
                                    </button>
                                </div>
                            </div>

                            <!-- Progress Bar -->
                            <div class="h-1 w-full overflow-hidden rounded-full bg-base-300">
                                <div
                                    class="h-full bg-primary transition-all duration-(--motion-base)"
                                    :style="`width: ${item.progress}%`"
                                    :class="{ 'bg-success': item.fin, 'bg-error': itemHasErrors(item) }"
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Remote Queue -->
                <div v-if="activeListTab === 'remote'" class="h-full">
                    <div v-if="remoteError" role="alert" class="alert alert-error mb-2 p-2 text-xs">
                        <Icon name="lucide:alert-circle" class="h-4 w-4 shrink-0" /> {{ remoteError }}
                    </div>
                    <div v-if="remoteDownloads.length === 0"
                        class="flex h-full flex-col items-center justify-center gap-1 py-8 text-center">
                        <span v-if="isFetchingRemote" class="loading loading-spinner loading-md text-base-content/40"></span>
                        <template v-else>
                            <Icon name="lucide:cloud-off" class="h-6 w-6 text-base-content/30" />
                            <p class="text-sm text-base-content/60">No remote downloads yet</p>
                        </template>
                    </div>

                    <div v-else class="flex flex-col gap-2">
                        <div
                            v-for="item in remoteDownloads"
                            :key="item.ID"
                            class="rounded-field border border-base-300 p-3 transition-colors hover:bg-base-200/60"
                        >
                            <div class="mb-2 flex items-center gap-3">
                                <!-- Status Icon -->
                                <div v-if="isRemoteActive(item)" class="loading loading-spinner loading-xs text-primary"></div>
                                <div v-else-if="item.Status === 'completed'" class="text-success"><Icon name="lucide:check-circle-2" class="h-4 w-4" /></div>
                                <div v-else-if="item.Status === 'failed'" class="text-error"><Icon name="lucide:alert-circle" class="h-4 w-4" /></div>
                                <div v-else-if="item.Status === 'canceled'" class="text-warning"><Icon name="lucide:circle-off" class="h-4 w-4" /></div>
                                <div v-else class="text-base-content/30"><Icon name="lucide:help-circle" class="h-4 w-4" /></div>

                                <!-- Name/URL -->
                                <div class="min-w-0 flex-1">
                                    <p class="truncate text-sm font-medium" :title="item.Url">{{ item.Name || item.Url }}</p>
                                    <p class="truncate text-xs tabular-nums text-base-content/60">{{ remoteStatusLabel(item) }} · {{ formatRemoteBytes(item) }}</p>
                                    <p v-if="item.Error" class="truncate text-xs text-error">{{ item.Error }}</p>
                                </div>

                                <!-- Actions -->
                                <div class="flex shrink-0 gap-1">
                                    <a v-if="item.LinkUUID" target="_blank" :href="`${conf.public.baseUrl}/v/${item.LinkUUID}`"
                                        class="btn btn-ghost btn-xs" title="Open" aria-label="Open video">
                                        <Icon name="lucide:external-link" class="h-3 w-3" />
                                    </a>
                                    <button @click="copyRemoteFileUrl(item)" v-if="item.LinkUUID" class="btn btn-ghost btn-xs"
                                        title="Copy URL" aria-label="Copy video URL">
                                        <Icon name="lucide:copy" class="h-3 w-3" />
                                    </button>
                                    <button @click="cancelRemote(item)" v-if="canCancelRemote(item)"
                                        :disabled="remoteActionBusy[item.ID] === 'cancel'"
                                        class="btn btn-ghost btn-xs text-warning" title="Cancel" aria-label="Cancel download">
                                        <span v-if="remoteActionBusy[item.ID] === 'cancel'" class="loading loading-spinner loading-xs"></span>
                                        <Icon v-else name="lucide:ban" class="h-3 w-3" />
                                    </button>
                                    <button @click="retryRemote(item)" v-if="canRetryRemote(item)"
                                        :disabled="remoteActionBusy[item.ID] === 'retry'"
                                        class="btn btn-ghost btn-xs text-primary" title="Retry" aria-label="Retry download">
                                        <span v-if="remoteActionBusy[item.ID] === 'retry'" class="loading loading-spinner loading-xs"></span>
                                        <Icon v-else name="lucide:rotate-cw" class="h-3 w-3" />
                                    </button>
                                    <button @click="deleteRemote(item)" v-if="isRemoteTerminal(item)"
                                        :disabled="remoteActionBusy[item.ID] === 'delete'"
                                        class="btn btn-ghost btn-xs text-base-content/50 hover:text-error" title="Remove"
                                        aria-label="Remove download">
                                        <span v-if="remoteActionBusy[item.ID] === 'delete'" class="loading loading-spinner loading-xs"></span>
                                        <Icon v-else name="lucide:x" class="h-3 w-3" />
                                    </button>
                                </div>
                            </div>

                            <!-- Progress Bar -->
                            <div v-if="isRemoteActive(item)" class="h-1 w-full overflow-hidden rounded-full bg-base-300">
                                <div
                                    class="h-full bg-primary transition-all duration-(--motion-base)"
                                    :style="`width: ${remoteProgressWidth(item)}%`"
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Active Sessions Footer -->
            <div class="shrink-0 border-t border-base-300 bg-base-200/40 p-3">
                <div class="mb-2 flex items-center justify-between">
                    <span class="flex items-center gap-1.5 text-xs font-medium text-base-content/60">
                        <Icon name="lucide:activity" class="h-3 w-3" /> Active sessions
                    </span>
                    <button :disabled="isLoading" @click="refreshSessions()" class="btn btn-ghost btn-xs"
                        title="Refresh sessions" aria-label="Refresh sessions">
                        <Icon name="lucide:rotate-cw" class="h-3 w-3" :class="{ 'animate-spin': isLoading }" />
                    </button>
                </div>

                <div v-if="errorSessions" role="alert" class="alert alert-error mb-2 p-2 text-xs">
                    <Icon name="lucide:alert-circle" class="h-4 w-4 shrink-0" /> {{ errorSessions }}
                </div>
                <div v-if="errorsDelete" role="alert" class="alert alert-error mb-2 p-2 text-xs">
                    <Icon name="lucide:trash-2" class="h-4 w-4 shrink-0" /> {{ errorsDelete }}
                </div>

                <div class="max-h-32 space-y-1 overflow-y-auto">
                    <div v-for="session in dataSessions" :key="session.TusID"
                        class="flex items-center justify-between rounded-selector border border-base-300 bg-base-100 p-2 text-xs">
                        <div class="mr-2 min-w-0">
                            <div class="truncate font-medium" :title="session.Name">{{ session.Name }}</div>
                            <div class="tabular-nums text-base-content/60">{{ session.Status }} · {{ Math.round((session.Offset / Math.max(1, session.Size)) * 100) }}%</div>
                        </div>
                        <button :disabled="isLoadingDelete || isLoading" @click="deleteSession(session.TusID)"
                            class="btn btn-square btn-ghost btn-xs text-error" title="Delete session"
                            aria-label="Delete session">
                            <Icon name="lucide:trash-2" class="h-3 w-3" />
                        </button>
                    </div>
                    <div v-if="!dataSessions || dataSessions.length === 0"
                        class="py-2 text-center text-xs text-base-content/50">
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
                    <button class="btn btn-square btn-ghost btn-sm absolute top-3 right-3" aria-label="Close">
                        <Icon name="lucide:x" class="h-4 w-4" />
                    </button>
                </form>
                <h3 class="mb-4 text-base font-semibold">Upload log</h3>

                <div v-if="showLogOfItem" class="max-h-[60vh] overflow-x-auto rounded-field border border-base-300 bg-base-200 p-2">
                    <table class="table table-xs">
                        <thead>
                            <tr class="text-xs text-base-content/70">
                                <th class="font-medium">Level</th>
                                <th class="font-medium">Message</th>
                                <th class="font-medium">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(log, i) in showLogOfItem.log" :key="i" :class="logLevelStyle(log)">
                                <td class="font-medium">{{ log.level }}</td>
                                <td>{{ log.title }}</td>
                                <td class="font-mono text-base-content/70">{{ log.description }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="modal-action">
                    <form method="dialog">
                        <button class="btn btn-ghost btn-sm">Close</button>
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
    removedFinishedUploadQueueItem,
    resetErroredUploadQueueItem,
    resetAllErroredUploadQueueItem,
    getUploadSpeed,
    getActiveUploadCount,
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
const uploadSpeed = getUploadSpeed();
const activeUploadCount = getActiveUploadCount();
const showLogOfItem = ref<QueueItem | null>(null);

// Remote Download Logic
const activeListTab = ref<'local' | 'remote'>('local');
const { remoteDownloads, isFetching: isFetchingRemote } = useRemoteDownloads();
const remoteError = ref<string | null>(null);
const remoteBulkBusy = ref(false);
const remoteActionBusy = ref<Record<number, string>>({});

const itemHasErrors = (item: QueueItem) =>
    item.log.filter((e) => e.level === "error").length > 0;
const localUploadStatus = (item: QueueItem) => {
    if (item.deleted) return `Removing · ${formatLocalUploadBytes(item)}`;
    if (itemHasErrors(item)) return `Failed · ${formatLocalUploadBytes(item)}`;
    if (item.fin) return `Complete · ${humanFileSize(localUploadTotalBytes(item))}`;
    if (item.paused) return `Paused · ${formatLocalUploadBytes(item)}`;
    if (item.uploading) {
        const speed = Number(item.speedBytesPerSecond || 0);
        const speedText = speed > 0 ? ` · ${formatUploadSpeed(speed)}` : "";
        return `Uploading · ${Math.round(item.progress)}%${speedText} · ${formatLocalUploadBytes(item)}`;
    }
    if (item.preflighting) return `Preparing · ${humanFileSize(localUploadTotalBytes(item))}`;

    return `Queued · ${humanFileSize(localUploadTotalBytes(item))}`;
};
const formatLocalUploadBytes = (item: QueueItem) => {
    const total = localUploadTotalBytes(item);
    const uploaded = Math.min(localUploadUploadedBytes(item), total || localUploadUploadedBytes(item));
    if (total > 0) {
        return `${humanFileSize(uploaded)} / ${humanFileSize(total)}`;
    }
    return humanFileSize(uploaded);
};
const localUploadUploadedBytes = (item: QueueItem) => {
    const uploaded = Number(item.bytesUploaded || 0);
    if (Number.isFinite(uploaded) && uploaded > 0) return uploaded;
    if (item.fin) return localUploadTotalBytes(item);
    return 0;
};
const localUploadTotalBytes = (item: QueueItem) => {
    const total = Number(item.bytesTotal || item.size || 0);
    return Number.isFinite(total) && total > 0 ? total : 0;
};
const formatUploadSpeed = (bytesPerSecond: number) => {
    const speed = Number(bytesPerSecond || 0);
    return `${humanFileSize(Number.isFinite(speed) && speed > 0 ? speed : 0)}/s`;
};
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
    ClientUploadUUID: string
    TusID: string
    Size: number
    Offset: number
    PartCount: number
    Status: string
    ExpiresAt: string
}
const token = useToken()
const dataSessions = ref<Session[] | null>(null)
const errorSessions = ref<string | null>(null)
const isLoading = ref<boolean>(false)
async function refreshSessions() {
    isLoading.value = true;
    errorSessions.value = null;
    try {
        const data = await $fetch<Session[]>(`${conf.public.apiUrl}/uploads/sessions`, {
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
        refreshSessions()
    }, 5000)
})
onUnmounted(() => {
    if (sessionIntv) clearInterval(sessionIntv)
    stopRemoteDownloadPolling();
})

const errorsDelete = ref<null | string>(null)
const isLoadingDelete = ref<boolean>(false)
async function deleteSession(tusID: string) {
    isLoadingDelete.value = true;
    errorsDelete.value = null;
    try {
        await $fetch<string>(`${conf.public.apiUrl}/uploads/${encodeURIComponent(tusID)}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token.value}`,
                "Tus-Resumable": "1.0.0",
            },
        });
    } catch (error: any) {
        errorsDelete.value = `${error.data ? error.data : error.message}`;
    }
    isLoadingDelete.value = false;
    refreshSessions();
}
</script>
