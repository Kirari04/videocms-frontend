import { v4 as uuidv4 } from "uuid";
import { ref } from "vue";
import * as tus from "tus-js-client";
import { useAccountData, useToken } from "@/composables/states";
import { useRuntimeConfig } from "#imports";
import {
    calculateAdaptiveConcurrencyBounds,
    createAdaptiveTusUpload,
    splitFileIntoAdaptiveParts,
    type AdaptiveUploadTelemetry,
} from "@/composables/adaptiveTusUpload";

export interface UploadController {
    start(): Promise<void>;
    abort(shouldTerminate?: boolean): Promise<void>;
    getUploadUrl(): string | null;
    clearStoredState?: () => void;
}

export interface QueueItem {
    uuid: string;
    name: string;
    size: number;
    file: File;
    folderId: number;
    progress: number;
    uploading: boolean;
    log: QueueItemLog[];
    serverFile?: ApiUploadFile;
    errored?: boolean;
    fin: boolean;
    paused: boolean;
    deleted?: boolean;
    upload?: UploadController;
    uploadUrl?: string | null;
    retryAttempt?: number;
    lastRetryReason?: string;
    preflighting?: boolean;
    adaptive?: {
        mode: "auto";
        activeChunks: number;
        targetChunks: number;
        maxChunks: number;
        uploadSpeedBps: number;
        lastDecision?: "increase" | "decrease" | "hold";
        lastDecisionReason?: string;
    };
    bytesUploaded?: number;
    bytesTotal?: number;
    speedBytesPerSecond?: number;
    lastProgressBytes?: number;
    lastProgressAt?: number;
    lastSpeedUpdateAt?: number;
    uploadSpeedSamples?: UploadSpeedSample[];
}

export interface QueueItemLog {
    level: "warn" | "error" | "info";
    title: string;
    description?: string;
}

interface ApiUploadFile {
    ID: number;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: null;
    UUID: string;
    Name: string;
    ParentFolderID: number;
}

interface UploadSpeedSample {
    bytes: number;
    at: number;
}

const allowed_extensions = [
    "mp4",
    "mkv",
    "webm",
    "avi",
    "mov",
    "ts",
    "m4v",
    "3gp",
    "3g2",
    "wmv",
    "mpg",
    "mpeg",
    "asf",
    "flv",
    "f4v",
    "m2ts",
    "mts",
    "vob",
    "mxf",
    "divx",
    "ogv",
    "rm",
    "rmvb",
    "dv",
];

const paused_state = ref<boolean>(false);
const upload_queue = ref<QueueItem[]>([]);
const is_uploading_state = ref<boolean>(false);
const progress_state = ref<number>(0);
const upload_speed_state = ref<number>(0);
const active_upload_count_state = ref<number>(0);

const upload_speed_sample_window_ms = 8000;
const upload_speed_min_window_ms = 1200;
const upload_speed_sample_interval_ms = 300;
const upload_speed_display_interval_ms = 1000;
const upload_speed_smoothing_alpha = 0.18;
const upload_speed_stale_after_ms = 2500;
const upload_speed_stale_decay = 0.82;

const parallel_files = () => upload_queue.value.filter((e) => e.uploading).length;
const max_parallel_files = ref<number>(3);
export const max_retry_chunks = ref<number>(2);

export const getUploadQueue = () => upload_queue;
export const getUploadSpeed = () => upload_speed_state;
export const getActiveUploadCount = () => active_upload_count_state;

export const addToUploadQueue = (files: FileList) => {
    const folderPathHistory = useState<
        Array<{
            name: string;
            folderId: number;
        }>
    >("folderPathHistory", () => []);

    for (const file of files) {
        const ext = file.name.split(".").pop() ?? "";
        const uuid = uuidv4();
        const lastHistory =
            folderPathHistory.value.length > 0
                ? folderPathHistory.value[folderPathHistory.value.length - 1]
                : null;

        upload_queue.value.push({
            uuid,
            size: file.size,
            file,
            name: file.name,
            folderId: lastHistory?.folderId ?? 0,
            progress: 0,
            uploading: false,
            paused: false,
            fin: false,
            bytesUploaded: 0,
            bytesTotal: file.size,
            speedBytesPerSecond: 0,
            uploadSpeedSamples: [],
            log: [],
        });

        if (!allowed_extensions.includes(ext.toLowerCase())) {
            addLogToFile(
                uuid,
                {
                    level: "error",
                    title: "Not allowed file extension",
                    description: `The file extension "${ext}" is not allowed/supported`,
                },
                true,
            );
        }
        if (isFileTooLarge(file.size)) {
            addLogToFile(uuid, fileTooLargeLog(file.size), true);
        }
    }
    updateProgressState();
    updateUploadSpeedState();
};

export const startUploadQueue = () => {
    if (is_uploading_state.value) return;

    stopUploadWorker();
    paused_state.value = false;
    is_uploading_state.value = true;
    startUploadWorker();
};

export const stopUploadQueue = () => {
    if (!is_uploading_state.value) return;

    paused_state.value = true;
    is_uploading_state.value = false;
    stopUploadWorker();
    for (const item of upload_queue.value.filter((item) => item.uploading && item.upload)) {
        item.paused = true;
        resetUploadSpeedSample(item);
        item.upload?.abort(false).catch(() => undefined);
    }
    updateUploadSpeedState();
};

export const isUploadingState = () => is_uploading_state;
export const getUploadProgress = () => progress_state;

export const removeUploadQueueItem = async (uuid: string) => {
    const fileIndex = upload_queue.value.findIndex((e) => e.uuid === uuid);
    if (fileIndex < 0 || upload_queue.value[fileIndex].deleted) return;

    const item = upload_queue.value[fileIndex];
    item.deleted = true;
    resetUploadSpeedSample(item);
    updateUploadSpeedState();
    try {
        if (item.upload) {
            await item.upload.abort(true);
        } else if (item.uploadUrl) {
            await terminateUploadUrl(item.uploadUrl);
        }
    } catch (error: any) {
        addLogToFile(
            uuid,
            {
                level: "error",
                title: "Failed to delete upload session",
                description: `${error?.data || error?.message || error}`,
            },
            true,
        );
    }

    const currentIndex = upload_queue.value.findIndex((e) => e.uuid === uuid);
    if (currentIndex >= 0) {
        upload_queue.value.splice(currentIndex, 1);
    }
    updateProgressState();
    updateUploadSpeedState();
};

export const resetErroredUploadQueueItem = async (uuid: string) => {
    const fileIndex = upload_queue.value.findIndex((e) => e.uuid === uuid);
    if (fileIndex < 0 || !upload_queue.value[fileIndex].errored) return;

    const currentFile = upload_queue.value[fileIndex];
    try {
        await currentFile.upload?.abort(true);
    } catch {
        // The server may already have removed an errored upload; reset should still work.
    }

    upload_queue.value[fileIndex] = {
        uuid: uuidv4(),
        size: currentFile.size,
        file: currentFile.file,
        name: currentFile.name,
        folderId: currentFile.folderId,
        progress: 0,
        uploading: false,
        paused: false,
        fin: false,
        bytesUploaded: 0,
        bytesTotal: currentFile.size,
        speedBytesPerSecond: 0,
        uploadSpeedSamples: [],
        log: [],
    };
    updateProgressState();
    updateUploadSpeedState();
};

export const resetAllErroredUploadQueueItem = () => {
    const errored = upload_queue.value.filter((e) => e.errored).map((e) => e.uuid);
    for (const uuid of errored) {
        resetErroredUploadQueueItem(uuid);
    }
};

export const removedFinishedUploadQueueItem = () => {
    const finishedFiles = upload_queue.value.filter((e) => e.fin);
    for (const file of finishedFiles) {
        const currentIndex = upload_queue.value.findIndex((e) => e.uuid === file.uuid);
        if (currentIndex >= 0) {
            upload_queue.value.splice(currentIndex, 1);
        }
    }
    updateProgressState();
    updateUploadSpeedState();
};

let uploader_intv = ref<string | number | NodeJS.Timeout | undefined>();

const stopUploadWorker = () => {
    if (uploader_intv.value) {
        clearInterval(uploader_intv.value);
        uploader_intv.value = undefined;
    }
};

const startUploadWorker = () => {
    updateProgressState();
    updateUploadSpeedState();
    uploader_intv.value = setInterval(() => {
        updateUploadSpeedState();
        if (parallel_files() >= max_parallel_files.value) return;

        const item = upload_queue.value.find(
            (e) => !e.uploading && !e.preflighting && !e.fin && !e.errored && !e.deleted,
        );
        if (!item) {
            if (upload_queue.value.length === upload_queue.value.filter((e) => e.fin || e.errored).length) {
                is_uploading_state.value = false;
                stopUploadWorker();
            }
            return;
        }
        startUploadFileWorker(item.uuid);
    }, 500);
};

const startUploadFileWorker = async (uuid: string) => {
    if (paused_state.value) return;

    const fileIndex = getFileIndexByUuid(uuid);
    if (fileIndex === null) return;

    const item = upload_queue.value[fileIndex];
    if (isFileTooLarge(item.size)) {
        addLogToFile(item.uuid, fileTooLargeLog(item.size), true);
        updateProgressState();
        return;
    }

    item.preflighting = true;
    try {
        const quotaLog = await clientQuotaPreflightLog(item.size);
        if (quotaLog) {
            addLogToFile(item.uuid, quotaLog, true);
            updateProgressState();
            return;
        }
    } catch {
        // Quota preflight is a convenience. The backend remains authoritative.
    } finally {
        const currentIndex = getFileIndexByUuid(uuid);
        if (currentIndex !== null) {
            upload_queue.value[currentIndex].preflighting = false;
        }
    }

    const currentIndex = getFileIndexByUuid(uuid);
    if (currentIndex === null) return;
    const currentItem = upload_queue.value[currentIndex];
    if (currentItem.deleted || currentItem.errored || paused_state.value) return;

    currentItem.uploading = true;
    currentItem.paused = false;
    currentItem.errored = false;
    currentItem.retryAttempt = 0;
    currentItem.lastRetryReason = undefined;
    resetUploadSpeedSample(currentItem);
    updateProgressState();
    updateUploadSpeedState();

    try {
        await startTusUpload(currentItem.uuid);
    } catch (error: any) {
        if (!currentItem.deleted && !currentItem.paused) {
            addLogToFile(
                currentItem.uuid,
                classifyTusUploadError(error, currentItem.size),
                true,
            );
        }
    } finally {
        const currentIndex = getFileIndexByUuid(uuid);
        if (currentIndex !== null && !upload_queue.value[currentIndex].fin) {
            upload_queue.value[currentIndex].uploading = false;
            resetUploadSpeedSample(upload_queue.value[currentIndex]);
        }
        updateProgressState();
        updateUploadSpeedState();
    }
};

const startTusUpload = async (uuid: string) => {
    const token = useToken();
    const fileIndex = getFileIndexByUuid(uuid);
    if (fileIndex === null) return;
    const item = upload_queue.value[fileIndex];

    const metadata: Record<string, string> = {
        filename: item.name,
        client_upload_uuid: item.uuid,
    };
    if (item.folderId > 0) {
        metadata.parent_folder_id = `${item.folderId}`;
    }

    const chunkSize = Math.max(1, Number(useServerConfig().value.MaxUploadChunkSize || 20 * 1024 * 1024));
    const endpoint = uploadApiUrl("/uploads");
    const headers = {
        Authorization: `Bearer ${token.value}`,
    };
    const useAdaptiveUpload = item.size > chunkSize * 2;
    let controller = useAdaptiveUpload
        ? createAdaptiveUploadController(uuid, item, endpoint, headers, metadata, chunkSize)
        : createSingleTusUploadController(uuid, item, endpoint, headers, metadata, chunkSize);

    item.upload = controller;
    try {
        await controller.start();
    } catch (error) {
        const fallbackIndex = getFileIndexByUuid(uuid);
        const fallbackItem = fallbackIndex === null ? null : upload_queue.value[fallbackIndex];
        const canFallbackToSingleUpload =
            useAdaptiveUpload &&
            fallbackItem &&
            !fallbackItem.paused &&
            !fallbackItem.deleted &&
            !fallbackItem.uploadUrl &&
            Number(fallbackItem.bytesUploaded || 0) === 0;
        if (!canFallbackToSingleUpload || !fallbackItem) {
            throw error;
        }

        fallbackItem.log.push({
            level: "warn",
            title: "Adaptive upload fallback",
            description: "Auto mode could not start partial uploads, so this file is continuing as a single resumable upload.",
        });
        controller = createSingleTusUploadController(uuid, fallbackItem, endpoint, headers, metadata, chunkSize);
        fallbackItem.upload = controller;
        await controller.start();
    }

    const currentIndex = getFileIndexByUuid(uuid);
    if (currentIndex === null) return;

    const current = upload_queue.value[currentIndex];
    completeUploadMetrics(current);
    updateUploadSpeedState();

    const normalizedUploadUrl = normalizeTusUploadUrl(controller.getUploadUrl() ?? current.uploadUrl) ?? controller.getUploadUrl() ?? current.uploadUrl;
    current.uploadUrl = normalizedUploadUrl;
    const uploadID = extractUploadID(normalizedUploadUrl);
    if (!uploadID) {
        throw new Error("Missing upload id after tus upload completed");
    }

    const file = await finalizeUpload(uploadID);
    const latestIndex = getFileIndexByUuid(uuid);
    if (latestIndex !== null) {
        const latest = upload_queue.value[latestIndex];
        latest.serverFile = file;
        latest.fin = true;
        latest.uploading = false;
        latest.progress = 100;
        latest.upload?.clearStoredState?.();
        latest.upload = undefined;
        latest.retryAttempt = 0;
        latest.lastRetryReason = undefined;
        completeUploadMetrics(latest);
        updateProgressState();
        updateUploadSpeedState();
    }
};

const createSingleTusUploadController = (
    uuid: string,
    item: QueueItem,
    endpoint: string,
    headers: Record<string, string>,
    metadata: Record<string, string>,
    chunkSize: number,
): UploadController => {
    let upload: tus.Upload | null = null;
    let uploadUrl: string | null = null;
    let rejectStart: ((error: unknown) => void) | null = null;
    let settled = false;

    return {
        start: () => new Promise<void>((resolve, reject) => {
            rejectStart = reject;
            item.adaptive = {
                mode: "auto",
                activeChunks: 1,
                targetChunks: 1,
                maxChunks: 1,
                uploadSpeedBps: 0,
            };
            upload = new tus.Upload(item.file, {
                endpoint,
                headers,
                metadata,
                chunkSize,
                retryDelays: retryDelays(),
                parallelUploads: 1,
                onShouldRetry(error, retryAttempt) {
                    return shouldRetryTusError(uuid, error, retryAttempt);
                },
                storeFingerprintForResuming: true,
                removeFingerprintOnSuccess: true,
                onProgress(bytesUploaded, bytesTotal) {
                    updateSingleUploadProgress(uuid, upload, bytesUploaded, bytesTotal);
                },
                onAfterResponse(_req, res) {
                    const location = res.getHeader("Location");
                    if (!location) return;
                    uploadUrl = normalizeTusUploadUrl(location) ?? location;
                    const currentIndex = getFileIndexByUuid(uuid);
                    if (currentIndex !== null) {
                        upload_queue.value[currentIndex].uploadUrl = uploadUrl;
                    }
                },
                onSuccess() {
                    settled = true;
                    uploadUrl = normalizeTusUploadUrl(upload?.url) ?? upload?.url ?? uploadUrl;
                    resolve();
                },
                onError(error) {
                    settled = true;
                    reject(error);
                },
            });

            upload.findPreviousUploads().then((previousUploads) => {
                if (previousUploads.length > 0 && upload) {
                    const normalizedPreviousUploads = previousUploads.map(normalizePreviousTusUpload);
                    upload.resumeFromPreviousUpload(normalizedPreviousUploads[normalizedPreviousUploads.length - 1]);
                }
                upload?.start();
            }).catch((error) => {
                settled = true;
                reject(error);
            });
        }),
        abort: async (shouldTerminate = false) => {
            if (!settled) {
                settled = true;
                rejectStart?.(new Error(shouldTerminate ? "Upload removed" : "Upload paused"));
            }
            await upload?.abort(shouldTerminate);
        },
        getUploadUrl: () => normalizeTusUploadUrl(uploadUrl ?? upload?.url) ?? uploadUrl ?? upload?.url ?? null,
    };
};

const createAdaptiveUploadController = (
    uuid: string,
    item: QueueItem,
    endpoint: string,
    headers: Record<string, string>,
    metadata: Record<string, string>,
    chunkSize: number,
) => {
    const split = splitFileIntoAdaptiveParts(item.size, chunkSize);
    const activeFiles = () => Math.max(1, upload_queue.value.filter(isActiveUploadItem).length || parallel_files() || 1);
    const bounds = calculateAdaptiveConcurrencyBounds(activeFiles(), split.partCount);
    item.adaptive = {
        mode: "auto",
        activeChunks: 0,
        targetChunks: bounds.startConcurrency,
        maxChunks: bounds.maxConcurrency,
        uploadSpeedBps: 0,
    };

    return createAdaptiveTusUpload({
        file: item.file,
        endpoint,
        headers,
        metadata,
        chunkSize,
        retryDelays: retryDelays(),
        minConcurrency: bounds.minConcurrency,
        startConcurrency: bounds.startConcurrency,
        maxConcurrency: bounds.maxConcurrency,
        globalConcurrencyBudget: () => calculateAdaptiveConcurrencyBounds(activeFiles(), split.partCount).maxConcurrency,
        onProgress(bytesUploaded, bytesTotal) {
            const currentIndex = getFileIndexByUuid(uuid);
            if (currentIndex === null) return;
            const current = upload_queue.value[currentIndex];
            current.progress = bytesTotal > 0 ? Math.min(99, Math.floor((bytesUploaded / bytesTotal) * 100)) : 0;
            current.bytesUploaded = Math.max(Number(current.bytesUploaded || 0), bytesUploaded);
            current.bytesTotal = bytesTotal;
            updateProgressState();
        },
        onAcceptedBytes(_bytesAcceptedDelta, bytesAcceptedTotal) {
            const currentIndex = getFileIndexByUuid(uuid);
            if (currentIndex === null) return;
            const current = upload_queue.value[currentIndex];
            updateUploadProgressSample(current, bytesAcceptedTotal, item.size);
            updateUploadSpeedState();
        },
        onTelemetry(telemetry) {
            applyAdaptiveTelemetry(uuid, telemetry);
        },
        onUploadUrl(uploadUrl) {
            const currentIndex = getFileIndexByUuid(uuid);
            if (currentIndex !== null) {
                upload_queue.value[currentIndex].uploadUrl = normalizeTusUploadUrl(uploadUrl) ?? uploadUrl;
            }
        },
        onError() {
            updateUploadSpeedState();
        },
        onShouldRetry(error, retryAttempt) {
            return shouldRetryTusError(uuid, error, retryAttempt);
        },
    });
};

const updateSingleUploadProgress = (
    uuid: string,
    upload: tus.Upload | null,
    bytesUploaded: number,
    bytesTotal: number,
) => {
    const currentIndex = getFileIndexByUuid(uuid);
    if (currentIndex === null) return;
    const current = upload_queue.value[currentIndex];
    current.progress = bytesTotal > 0 ? Math.min(99, Math.floor((bytesUploaded / bytesTotal) * 100)) : 0;
    updateUploadProgressSample(current, bytesUploaded, bytesTotal);
    current.uploadUrl = normalizeTusUploadUrl(upload?.url) ?? upload?.url ?? current.uploadUrl;
    if (current.adaptive) {
        current.adaptive.activeChunks = current.uploading ? 1 : 0;
        current.adaptive.targetChunks = 1;
        current.adaptive.maxChunks = 1;
        current.adaptive.uploadSpeedBps = Number(current.speedBytesPerSecond || 0);
    }
    updateProgressState();
    updateUploadSpeedState();
};

const applyAdaptiveTelemetry = (uuid: string, telemetry: AdaptiveUploadTelemetry) => {
    const currentIndex = getFileIndexByUuid(uuid);
    if (currentIndex === null) return;

    const current = upload_queue.value[currentIndex];
    const previous = current.adaptive;
    const previousDecisionKey = `${previous?.lastDecision || ""}:${previous?.lastDecisionReason || ""}:${previous?.targetChunks || 0}`;
    const nextDecisionKey = `${telemetry.lastDecision || ""}:${telemetry.lastDecisionReason || ""}:${telemetry.targetChunks}`;

    current.adaptive = {
        mode: "auto",
        activeChunks: telemetry.activeChunks,
        targetChunks: telemetry.targetChunks,
        maxChunks: telemetry.maxChunks,
        uploadSpeedBps: telemetry.uploadSpeedBps,
        lastDecision: telemetry.lastDecision,
        lastDecisionReason: telemetry.lastDecisionReason,
    };

    if (
        telemetry.lastDecision &&
        telemetry.lastDecision !== "hold" &&
        telemetry.lastDecisionReason &&
        previousDecisionKey !== nextDecisionKey
    ) {
        current.log.push({
            level: telemetry.lastDecision === "decrease" ? "warn" : "info",
            title: telemetry.lastDecision === "decrease"
                ? "Reduced upload concurrency"
                : "Increased upload concurrency",
            description: `Auto mode set this upload to ${telemetry.targetChunks} chunk${telemetry.targetChunks === 1 ? "" : "s"}: ${telemetry.lastDecisionReason}.`,
        });
    }

    updateUploadSpeedState();
};

const retryDelays = () => {
    const delays = [0, 1000, 3000, 5000, 10000, 20000];
    return delays.slice(0, Math.max(1, max_retry_chunks.value + 1));
};

const shouldRetryTusError = (uuid: string, error: any, retryAttempt: number) => {
    const currentIndex = getFileIndexByUuid(uuid);
    if (currentIndex === null) return false;

    const current = upload_queue.value[currentIndex];
    if (current.paused || current.deleted) return false;

    const status = getTusErrorStatus(error);
    const message = getTusErrorBody(error);
    const lowerMessage = message.toLowerCase();
    const retryable =
        status === 0 ||
        status === 409 ||
        status === 423 ||
        status >= 500 ||
        message.includes("ERR_UNEXPECTED_EOF") ||
        lowerMessage.includes("network");

    if (retryable) {
        recordTusRetry(uuid, retryAttempt + 1, status, message);
    }

    return retryable;
};

const recordTusRetry = (uuid: string, attempt: number, _status: number, message: string) => {
    const fileIndex = getFileIndexByUuid(uuid);
    if (fileIndex === null) return;

    const item = upload_queue.value[fileIndex];
    if ((item.retryAttempt ?? 0) >= attempt) return;

    item.retryAttempt = attempt;
    item.lastRetryReason = message;
    item.log.push({
        level: "warn",
        title: "Upload interrupted, retrying",
        description: `Retry ${attempt} after a resumable chunk upload interruption.`,
    });
};

const classifyTusUploadError = (error: any, attemptedSize = 0): QueueItemLog => {
    const status = getTusErrorStatus(error);
    const message = getTusErrorBody(error);
    const code = getTusErrorCode(message);

    if (message.includes("ERR_UNEXPECTED_EOF") || status === 0) {
        return uploadInterruptedLog();
    }

    switch (code) {
        case "ERR_QUOTA_EXCEEDED":
            return quotaExceededLog(message, attemptedSize);
        case "ERR_UPLOAD_DISABLED":
            return uploadsDisabledLog();
        case "ERR_UPLOAD_SESSION_LIMIT":
            return uploadSessionLimitLog(message);
        case "ERR_MAX_SIZE_EXCEEDED":
            return fileTooLargeLog(0);
        case "ERR_INVALID_UPLOAD_LENGTH":
        case "ERR_INVALID_METADATA":
        case "ERR_INVALID_PARENT":
        case "ERR_UPLOAD_REJECTED":
            return invalidUploadRequestLog(message);
        case "ERR_AUTH_REQUIRED":
            return uploadAuthorizationFailedLog();
    }

    if (status === 401 || status === 403) {
        return uploadAuthorizationFailedLog();
    }

    if (status === 413) {
        return uploadChunkTooLargeLog();
    }

    if (status >= 500) {
        return {
            level: "error",
            title: "Upload server error",
            description: "The server failed while preparing the upload. Retry later or check the backend logs.",
        };
    }

    return {
        level: "error",
        title: "Failed to upload file",
        description: message,
    };
};

const uploadInterruptedLog = (): QueueItemLog => ({
    level: "error",
    title: "Upload interrupted",
    description: "The connection closed before the current chunk finished. The upload can be resumed from the saved server offset.",
});

const uploadAuthorizationFailedLog = (): QueueItemLog => ({
    level: "error",
    title: "Upload authorization failed",
    description: "Your session or API key was rejected while uploading. Sign in again and retry the upload.",
});

const uploadChunkTooLargeLog = (): QueueItemLog => ({
    level: "error",
    title: "Upload chunk is too large",
    description: `The proxy or server rejected the chunk body. Lower MaxUploadChunkSize or raise the proxy body limit to at least ${useServerConfig().value.MaxUploadChunkSize} bytes.`,
});

const getTusErrorStatus = (error: any) => {
    const status = Number(
        error?.originalResponse?.getStatus?.() ??
        error?.response?.status ??
        error?.statusCode ??
        error?.status ??
        0,
    );
    return Number.isFinite(status) ? status : 0;
};

const getTusErrorBody = (error: any) => {
    const body = error?.originalResponse?.getBody?.();
    if (typeof body === "string" && body.trim()) return body.trim();

    const data = error?.data;
    if (typeof data === "string" && data.trim()) return data.trim();

    const message = error?.message;
    if (typeof message === "string" && message.trim()) return message.trim();

    return `${error}`;
};

const getTusErrorCode = (message: string) => {
    const match = message.match(/\b(ERR_[A-Z0-9_]+)\b/);
    return match?.[1] ?? "";
};

const parseQuotaError = (message: string) => {
    const match = message.match(/storage quota exceeded:\s*(\d+)\/(\d+) bytes used/i);
    if (!match) return null;

    const used = Number(match[1]);
    const limit = Number(match[2]);
    if (!Number.isFinite(used) || !Number.isFinite(limit)) return null;

    return {
        used,
        limit,
        remaining: Math.max(0, limit - used),
    };
};

const cleanTusErrorMessage = (message: string) => {
    return message
        .replace(/\bERR_[A-Z0-9_]+:\s*/, "")
        .replace(/,\s*originated from request .*/i, "")
        .trim();
};

const isFileTooLarge = (fileSize: number) => {
    const maxFileSize = Number(useServerConfig().value.MaxUploadFilesize || 0);
    return maxFileSize > 0 && fileSize > maxFileSize;
};

const fileTooLargeLog = (fileSize: number): QueueItemLog => ({
    level: "error",
    title: "Upload file is too large",
    description: fileTooLargeLogDescription(fileSize),
});

const clientQuotaPreflightLog = async (fileSize: number): Promise<QueueItemLog | null> => {
    const { data: accountData, fetch: fetchAccountData } = useAccountData();
    if (!accountData.value) {
        await fetchAccountData();
    }

    const account = accountData.value;
    if (!account) return null;
    if (account.Storage === null || account.Storage === undefined) return null;
    if (account.Used === null || account.Used === undefined) return null;

    const storage = Number(account.Storage);
    const used = Number(account.Used);
    if (!Number.isFinite(storage) || !Number.isFinite(used)) return null;
    if (storage <= 0) return null;

    const remaining = Math.max(0, storage - used);
    if (fileSize <= remaining) return null;

    return {
        level: "error",
        title: "Storage quota exceeded",
        description: `Your account is using ${formatBytes(used)} of ${formatBytes(storage)}. ${formatBytes(remaining)} remains. This file is ${formatBytes(fileSize)}. Delete files, raise the user's storage quota, or choose a smaller file.`,
    };
};

const quotaExceededLog = (message: string, attemptedSize = 0): QueueItemLog => {
    const quota = parseQuotaError(message);
    const attempted = attemptedSize > 0 ? ` This file is ${formatBytes(attemptedSize)}.` : "";
    return {
        level: "error",
        title: "Storage quota exceeded",
        description: quota
            ? `Your account is using ${formatBytes(quota.used)} of ${formatBytes(quota.limit)}. ${formatBytes(quota.remaining)} remains.${attempted} Delete files, raise the user's storage quota, or choose a smaller file.`
            : `Your account does not have enough remaining storage for this upload.${attempted}`,
    };
};

const uploadsDisabledLog = (): QueueItemLog => ({
    level: "error",
    title: "Uploads are disabled",
    description: "Uploads are currently disabled by the server configuration.",
});

const uploadSessionLimitLog = (message: string): QueueItemLog => ({
    level: "error",
    title: "Too many active uploads",
    description: cleanTusErrorMessage(message) || "Wait for active uploads to finish or raise MaxUploadSessions.",
});

const invalidUploadRequestLog = (message: string): QueueItemLog => ({
    level: "error",
    title: "Invalid upload request",
    description: cleanTusErrorMessage(message) || "The server rejected the upload request metadata.",
});

const fileTooLargeLogDescription = (fileSize: number) => {
    const maxFileSize = Number(useServerConfig().value.MaxUploadFilesize || 0);
    const actual = fileSize > 0 ? ` This file is ${formatBytes(fileSize)}.` : "";
    return `The file is larger than MaxUploadFilesize (${formatBytes(maxFileSize)}).${actual} Raise MaxUploadFilesize or choose a smaller file.`;
};

const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }
    const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
    return `${value.toFixed(precision)} ${units[unitIndex]}`;
};

const finalizeUpload = async (uploadID: string): Promise<ApiUploadFile> => {
    const token = useToken();
    return await $fetch<ApiUploadFile>(uploadApiUrl(`/uploads/${encodeURIComponent(uploadID)}/finalize`), {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token.value}`,
        },
        retry: 2,
    });
};

const terminateUploadUrl = async (uploadUrl: string) => {
    const token = useToken();
    await $fetch(normalizeTusUploadUrl(uploadUrl) ?? uploadUrl, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token.value}`,
            "Tus-Resumable": "1.0.0",
        },
    });
};

const uploadApiUrl = (path: string) => {
    const base = normalizedApiBase();
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${cleanPath}`;
};

const normalizedApiBase = () => {
    const conf = useRuntimeConfig();
    const raw = `${conf.public.apiUrl || ""}`.trim() || "/api";
    const base = raw.replace(/\/+$/, "") || "/api";
    if (typeof window === "undefined") return base;

    try {
        const parsed = new URL(base, window.location.origin);
        if (window.location.protocol === "https:" && parsed.protocol === "http:" && parsed.host === window.location.host) {
            parsed.protocol = "https:";
            return parsed.toString().replace(/\/+$/, "");
        }
    } catch {
        return base;
    }

    return base;
};

const normalizeTusUploadUrl = (uploadUrl?: string | null) => {
    if (!uploadUrl) return null;

    const raw = `${uploadUrl}`.trim();
    if (!raw) return null;
    if (typeof window === "undefined") return raw;

    try {
        const normalizedRaw = raw.startsWith("api/uploads/") ? `/${raw}` : raw;
        const parsed = new URL(normalizedRaw, window.location.origin);
        if (parsed.pathname.startsWith("/api/uploads/")) {
            const apiBase = new URL(normalizedApiBase(), window.location.origin);
            const normalized = new URL(`${parsed.pathname}${parsed.search}${parsed.hash}`, apiBase.origin);
            return upgradeSameHostHTTP(normalized).toString();
        }
        return upgradeSameHostHTTP(parsed).toString();
    } catch {
        return raw;
    }
};

const normalizePreviousTusUpload = (previousUpload: any) => ({
    ...previousUpload,
    uploadUrl: normalizeTusUploadUrl(previousUpload.uploadUrl),
    parallelUploadUrls: Array.isArray(previousUpload.parallelUploadUrls)
        ? previousUpload.parallelUploadUrls.map((url: string) => normalizeTusUploadUrl(url) ?? url)
        : previousUpload.parallelUploadUrls,
});

const upgradeSameHostHTTP = (url: URL) => {
    if (window.location.protocol === "https:" && url.protocol === "http:" && url.host === window.location.host) {
        url.protocol = "https:";
    }
    return url;
};

const extractUploadID = (uploadUrl?: string | null) => {
    if (!uploadUrl) return null;
    try {
        const parsed = new URL(uploadUrl, window.location.origin);
        const parts = parsed.pathname.split("/").filter(Boolean);
        return parts[parts.length - 1] || null;
    } catch {
        const parts = uploadUrl.split("/").filter(Boolean);
        return parts[parts.length - 1] || null;
    }
};

const updateProgressState = () => {
    let progress = 0;
    let count = 0;
    for (const item of upload_queue.value) {
        if (!item.errored) {
            count++;
            progress += item.progress;
        }
    }
    progress_state.value = count === 0 ? 0 : Math.ceil(progress / count);
};

const updateUploadSpeedState = () => {
    let speed = 0;
    let activeUploads = 0;
    const now = Date.now();

    for (const item of upload_queue.value) {
        if (!isActiveUploadItem(item)) continue;

        activeUploads++;
        decayStaleUploadSpeed(item, now);
        const itemSpeed = Number(item.speedBytesPerSecond || 0);
        if (Number.isFinite(itemSpeed) && itemSpeed > 0) {
            speed += itemSpeed;
        }
    }

    active_upload_count_state.value = activeUploads;
    upload_speed_state.value = activeUploads === 0 ? 0 : speed;
};

const isActiveUploadItem = (item: QueueItem) =>
    item.uploading && !item.paused && !item.errored && !item.fin && !item.deleted;

const resetUploadSpeedSample = (item: QueueItem) => {
    item.speedBytesPerSecond = 0;
    item.lastProgressBytes = undefined;
    item.lastProgressAt = undefined;
    item.lastSpeedUpdateAt = undefined;
    item.uploadSpeedSamples = [];
};

const completeUploadMetrics = (item: QueueItem) => {
    const total = Math.max(0, item.bytesTotal || item.size || 0);
    item.bytesTotal = total;
    item.bytesUploaded = total;
    resetUploadSpeedSample(item);
};

const updateUploadProgressSample = (item: QueueItem, bytesUploaded: number, bytesTotal: number) => {
    const uploaded = clampUploadByteValue(bytesUploaded);
    const total = clampUploadByteValue(bytesTotal);
    const now = Date.now();

    item.bytesUploaded = uploaded;
    item.bytesTotal = total;
    item.lastProgressBytes = uploaded;
    item.lastProgressAt = now;

    const samples = nextUploadSpeedSamples(item, uploaded, now);
    item.uploadSpeedSamples = samples;
    if (samples.length < 2) return;

    const lastSpeedUpdateAt = item.lastSpeedUpdateAt || 0;
    if (lastSpeedUpdateAt > 0 && now - lastSpeedUpdateAt < upload_speed_display_interval_ms) return;

    const oldest = samples[0];
    const elapsedMs = now - oldest.at;
    const deltaBytes = uploaded - oldest.bytes;
    if (elapsedMs < upload_speed_min_window_ms || deltaBytes < 0) return;

    const windowSpeed = deltaBytes / (elapsedMs / 1000);
    if (!Number.isFinite(windowSpeed) || windowSpeed < 0) return;

    const previousSpeed = Number(item.speedBytesPerSecond || 0);
    item.speedBytesPerSecond = previousSpeed > 0
        ? previousSpeed * (1 - upload_speed_smoothing_alpha) + windowSpeed * upload_speed_smoothing_alpha
        : windowSpeed;
    item.lastSpeedUpdateAt = now;
};

const nextUploadSpeedSamples = (item: QueueItem, uploaded: number, now: number) => {
    const existingSamples = item.uploadSpeedSamples || [];
    const lastSample = existingSamples[existingSamples.length - 1];

    if (lastSample && uploaded < lastSample.bytes) {
        return [{ bytes: uploaded, at: now }];
    }

    const shouldAddSample =
        !lastSample ||
        now - lastSample.at >= upload_speed_sample_interval_ms;

    const samples = shouldAddSample
        ? [...existingSamples, { bytes: uploaded, at: now }]
        : existingSamples;
    const cutoff = now - upload_speed_sample_window_ms;
    const windowed = samples.filter((sample) => sample.at >= cutoff);

    return windowed.length > 0 ? windowed : [{ bytes: uploaded, at: now }];
};

const decayStaleUploadSpeed = (item: QueueItem, now: number) => {
    const speed = Number(item.speedBytesPerSecond || 0);
    if (!Number.isFinite(speed) || speed <= 0) return;
    if (!item.lastProgressAt || now - item.lastProgressAt <= upload_speed_stale_after_ms) return;

    const decayedSpeed = speed * upload_speed_stale_decay;
    item.speedBytesPerSecond = decayedSpeed < 1 ? 0 : decayedSpeed;
};

const clampUploadByteValue = (value: number) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return 0;
    return numeric;
};

const addLogToFile = (uuid: string, log: QueueItemLog, errored = false) => {
    const fileIndex = upload_queue.value.findIndex((e) => e.uuid === uuid);
    if (fileIndex >= 0) {
        upload_queue.value[fileIndex].log.push(log);
        if (errored) {
            upload_queue.value[fileIndex].errored = true;
            upload_queue.value[fileIndex].uploading = false;
            resetUploadSpeedSample(upload_queue.value[fileIndex]);
            updateUploadSpeedState();
        }
    }
};

const getFileIndexByUuid = (uuid: string) => {
    const index = upload_queue.value.findIndex((e) => e.uuid === uuid);
    return index < 0 ? null : index;
};
