import { v4 as uuidv4 } from "uuid";
import { ref } from "vue";
import * as tus from "tus-js-client";
import { useToken } from "@/composables/states";
import { useRuntimeConfig } from "#imports";

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
    upload?: tus.Upload;
    uploadUrl?: string | null;
    retryAttempt?: number;
    lastRetryReason?: string;
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

const parallel_files = () => upload_queue.value.filter((e) => e.uploading).length;
const max_parallel_files = ref<number>(3);
export const max_parallel_chunks = ref<number>(4);
export const max_retry_chunks = ref<number>(2);

export const getUploadQueue = () => upload_queue;

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
};

export const startUploadQueue = () => {
    if (!is_uploading_state.value) {
        is_uploading_state.value = true;
        startUploadWorker();
    }
};

export const stopUploadQueue = () => {
    if (is_uploading_state.value) {
        paused_state.value = true;
        is_uploading_state.value = false;
        for (const item of upload_queue.value.filter((item) => item.uploading && item.upload)) {
            item.paused = true;
            item.upload?.abort(false).catch(() => undefined);
        }
    }
};

export const isUploadingState = () => is_uploading_state;
export const getUploadProgress = () => progress_state;

export const removeUploadQueueItem = async (uuid: string) => {
    const fileIndex = upload_queue.value.findIndex((e) => e.uuid === uuid);
    if (fileIndex < 0 || upload_queue.value[fileIndex].deleted) return;

    const item = upload_queue.value[fileIndex];
    item.deleted = true;
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
        log: [],
    };
    updateProgressState();
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
};

let uploader_intv = ref<string | number | NodeJS.Timeout | undefined>();

const startUploadWorker = () => {
    updateProgressState();
    paused_state.value = false;
    uploader_intv.value = setInterval(() => {
        if (parallel_files() > max_parallel_files.value) return;

        const item = upload_queue.value.find(
            (e) => !e.uploading && !e.fin && !e.errored && !e.deleted,
        );
        if (!item) {
            if (upload_queue.value.length === upload_queue.value.filter((e) => e.fin || e.errored).length) {
                is_uploading_state.value = false;
                if (uploader_intv.value) clearInterval(uploader_intv.value);
            }
            return;
        }
        startUploadFileWorker(item.uuid);
    }, 500);
};

const startUploadFileWorker = async (uuid: string) => {
    const fileIndex = getFileIndexByUuid(uuid);
    if (fileIndex === null) return;

    const item = upload_queue.value[fileIndex];
    if (isFileTooLarge(item.size)) {
        addLogToFile(item.uuid, fileTooLargeLog(item.size), true);
        updateProgressState();
        return;
    }

    item.uploading = true;
    item.paused = false;
    item.errored = false;
    item.retryAttempt = 0;
    item.lastRetryReason = undefined;
    updateProgressState();

    try {
        await startTusUpload(item.uuid);
    } catch (error: any) {
        if (!item.deleted && !item.paused) {
            addLogToFile(
                item.uuid,
                classifyTusUploadError(error),
                true,
            );
        }
    } finally {
        const currentIndex = getFileIndexByUuid(uuid);
        if (currentIndex !== null && !upload_queue.value[currentIndex].fin) {
            upload_queue.value[currentIndex].uploading = false;
        }
        updateProgressState();
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
    const parallelUploads = Math.max(1, Math.min(max_parallel_chunks.value, Math.ceil(item.size / chunkSize)));

    await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(item.file, {
            endpoint: uploadApiUrl("/uploads"),
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            metadata,
            metadataForPartialUploads: metadata,
            parallelUploads,
            chunkSize,
            retryDelays: retryDelays(),
            onShouldRetry(error, retryAttempt) {
                return shouldRetryTusError(uuid, error, retryAttempt);
            },
            storeFingerprintForResuming: true,
            removeFingerprintOnSuccess: true,
            onProgress(bytesUploaded, bytesTotal) {
                const currentIndex = getFileIndexByUuid(uuid);
                if (currentIndex === null) return;
                const current = upload_queue.value[currentIndex];
                current.progress = bytesTotal > 0 ? Math.min(99, Math.floor((bytesUploaded / bytesTotal) * 100)) : 0;
                current.uploadUrl = normalizeTusUploadUrl(upload.url) ?? upload.url;
                updateProgressState();
            },
            onAfterResponse(_req, res) {
                const location = res.getHeader("Location");
                if (!location) return;
                const currentIndex = getFileIndexByUuid(uuid);
                if (currentIndex !== null) {
                    upload_queue.value[currentIndex].uploadUrl = normalizeTusUploadUrl(location) ?? location;
                }
            },
            async onSuccess() {
                try {
                    const currentIndex = getFileIndexByUuid(uuid);
                    if (currentIndex === null) {
                        resolve();
                        return;
                    }
                    const current = upload_queue.value[currentIndex];
                    const normalizedUploadUrl = normalizeTusUploadUrl(upload.url) ?? upload.url;
                    upload.url = normalizedUploadUrl;
                    current.uploadUrl = normalizedUploadUrl;
                    const uploadID = extractUploadID(normalizedUploadUrl);
                    if (!uploadID) {
                        throw new Error("Missing upload id after tus upload completed");
                    }
                    const file = await finalizeUpload(uploadID);
                    const latestIndex = getFileIndexByUuid(uuid);
                    if (latestIndex !== null) {
                        upload_queue.value[latestIndex].serverFile = file;
                        upload_queue.value[latestIndex].fin = true;
                        upload_queue.value[latestIndex].uploading = false;
                        upload_queue.value[latestIndex].progress = 100;
                        upload_queue.value[latestIndex].upload = undefined;
                        upload_queue.value[latestIndex].retryAttempt = 0;
                        upload_queue.value[latestIndex].lastRetryReason = undefined;
                        updateProgressState();
                    }
                    resolve();
                } catch (error) {
                    reject(error);
                }
            },
            onError(error) {
                reject(error);
            },
        });

        item.upload = upload;
        upload.findPreviousUploads().then((previousUploads) => {
            if (previousUploads.length > 0) {
                const normalizedPreviousUploads = previousUploads.map(normalizePreviousTusUpload);
                upload.resumeFromPreviousUpload(normalizedPreviousUploads[normalizedPreviousUploads.length - 1]);
            }
            upload.start();
        }).catch(reject);
    });
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
    const message = getTusErrorMessage(error);
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

const classifyTusUploadError = (error: any): QueueItemLog => {
    const status = getTusErrorStatus(error);
    const message = getTusErrorMessage(error);

    if (message.includes("ERR_UNEXPECTED_EOF") || status === 0) {
        return {
            level: "error",
            title: "Upload interrupted",
            description: "The connection closed before the current chunk finished. The upload can be resumed from the saved server offset.",
        };
    }

    if (status === 401 || status === 403) {
        return {
            level: "error",
            title: "Upload authorization failed",
            description: "Your session or API key was rejected while uploading. Sign in again and retry the upload.",
        };
    }

    if (status === 413 && isMaxFileSizeError(message)) {
        return {
            level: "error",
            title: "Upload file is too large",
            description: fileTooLargeLogDescription(0),
        };
    }

    if (status === 413) {
        return {
            level: "error",
            title: "Upload chunk is too large",
            description: `The proxy or server rejected the chunk body. Lower MaxUploadChunkSize or raise the proxy body limit to at least ${useServerConfig().value.MaxUploadChunkSize} bytes.`,
        };
    }

    return {
        level: "error",
        title: "Failed to upload file",
        description: message,
    };
};

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

const getTusErrorMessage = (error: any) => {
    return `${error?.data || error?.message || error}`;
};

const isMaxFileSizeError = (message: string) => {
    return message.includes("ERR_MAX_SIZE_EXCEEDED") ||
        message.toLowerCase().includes("maximum upload size exceeded") ||
        message.toLowerCase().includes("maximum size exceeded");
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

const addLogToFile = (uuid: string, log: QueueItemLog, errored = false) => {
    const fileIndex = upload_queue.value.findIndex((e) => e.uuid === uuid);
    if (fileIndex >= 0) {
        upload_queue.value[fileIndex].log.push(log);
        if (errored) {
            upload_queue.value[fileIndex].errored = true;
            upload_queue.value[fileIndex].uploading = false;
        }
    }
};

const getFileIndexByUuid = (uuid: string) => {
    const index = upload_queue.value.findIndex((e) => e.uuid === uuid);
    return index < 0 ? null : index;
};
