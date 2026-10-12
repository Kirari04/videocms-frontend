import * as tus from "tus-js-client";

export interface UploadController {
    start(): Promise<void>;
    abort(shouldTerminate?: boolean): Promise<void>;
    getUploadUrl(): string | null;
    clearStoredState?: () => void;
}

interface SingleTusUploadOptions {
    file: File;
    endpoint: string;
    headers: Record<string, string>;
    metadata: Record<string, string>;
    chunkSize: number;
    retryDelays: number[];
    withCredentials?: boolean;
    resumeScope?: string;
    normalizeUploadUrl?: (url?: string | null) => string | null;
    onProgress(bytes: number, total: number, upload: tus.Upload): void;
    onUploadUrl(url: string): void;
    onShouldRetry(error: any, attempt: number): boolean;
}

// Shared by account uploads and folder-share uploads; only their credentials
// and progress callbacks differ.
export const createSingleTusUpload = (options: SingleTusUploadOptions): UploadController => {
    let upload: tus.Upload | null = null;
    let uploadUrl: string | null = null;
    let rejectStart: ((error: unknown) => void) | null = null;
    let settled = false;
    const normalize = options.normalizeUploadUrl ?? ((url?: string | null) => url || null);
    const rememberUrl = (url?: string | null) => {
        uploadUrl = normalize(url) ?? uploadUrl;
        if (uploadUrl) options.onUploadUrl(uploadUrl);
    };

    return {
        start: () => new Promise<void>((resolve, reject) => {
            rejectStart = reject;
            upload = new tus.Upload(options.file, {
                endpoint: options.endpoint,
                headers: options.headers,
                metadata: options.metadata,
                chunkSize: options.chunkSize,
                retryDelays: options.retryDelays,
                parallelUploads: 1,
                withCredentials: options.withCredentials ?? false,
                ...(options.resumeScope ? { fingerprint: async () => JSON.stringify([
                    "videocms-tus", options.resumeScope, options.endpoint,
                    options.file.name, options.file.size, options.file.type, options.file.lastModified,
                ]) } : {}),
                storeFingerprintForResuming: true,
                removeFingerprintOnSuccess: true,
                onShouldRetry: options.onShouldRetry,
                onProgress(bytes, total) { if (!settled) options.onProgress(bytes, total, upload!); },
                onAfterResponse(_req, res) {
                    const location = res.getHeader("Location");
                    if (!settled && location) rememberUrl(location);
                },
                onSuccess() { settled = true; rememberUrl(upload?.url); resolve(); },
                onError(error) { settled = true; reject(error); },
            });
            upload.findPreviousUploads().then((previous) => {
                if (settled || !upload) return;
                if (previous.length) {
                    const saved = previous[previous.length - 1];
                    upload.resumeFromPreviousUpload({
                        ...saved,
                        uploadUrl: normalize(saved.uploadUrl) ?? saved.uploadUrl,
                        parallelUploadUrls: saved.parallelUploadUrls?.map(url => normalize(url) ?? url),
                    });
                }
                upload.start();
            }).catch(error => { if (!settled) { settled = true; reject(error); } });
        }),
        abort: async (terminate = false) => {
            if (!settled) {
                settled = true;
                rejectStart?.(new Error(terminate ? "Upload removed" : "Upload paused"));
            }
            await upload?.abort(terminate);
        },
        getUploadUrl: () => normalize(uploadUrl ?? upload?.url),
    };
};
