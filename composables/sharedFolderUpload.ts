import { v4 as uuidv4 } from "uuid";
import { createSingleTusUpload } from "@/composables/singleTusUpload";
import { calculateAdaptiveConcurrencyBounds, createAdaptiveTusUpload, splitFileIntoAdaptiveParts } from "@/composables/adaptiveTusUpload";

export const createSharedFolderUpload = (options: {
    file: File;
    apiUrl: string;
    shareToken: string;
    folderID: number;
    chunkSize: number;
    onProgress(bytes: number, total: number): void;
}) => {
    const chunkSize = Math.max(1, Number(options.chunkSize || 20 * 1024 * 1024));
    const common = {
        file: options.file,
        endpoint: `${options.apiUrl.replace(/\/+$/, "")}/uploads`,
        headers: { "X-Folder-Share": options.shareToken },
        metadata: { filename: options.file.name, parent_folder_id: String(options.folderID), client_upload_uuid: uuidv4(), file_size: String(options.file.size) },
        chunkSize,
        retryDelays: [0, 1000, 3000],
        withCredentials: true,
        resumeScope: JSON.stringify([options.shareToken, options.folderID]),
        onProgress: options.onProgress,
        onUploadUrl() {},
        onShouldRetry(error: any) {
            const status = Number(error.originalResponse?.getStatus?.() ?? error.status ?? 0);
            return status === 0 || status === 409 || status === 423 || (status >= 500 && status !== 507);
        },
    };
    if (options.file.size <= chunkSize * 2) return createSingleTusUpload(common);
    const split = splitFileIntoAdaptiveParts(options.file.size, chunkSize);
    const bounds = calculateAdaptiveConcurrencyBounds(1, split.partCount);
    return createAdaptiveTusUpload({
        ...common, ...bounds,
        globalConcurrencyBudget: () => bounds.maxConcurrency,
        onAcceptedBytes() {}, onTelemetry() {}, onError() {},
    });
};
