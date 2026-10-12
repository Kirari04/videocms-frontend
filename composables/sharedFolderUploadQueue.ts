import { ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { createSharedFolderUpload } from '@/composables/sharedFolderUpload';
import type { UploadController } from '@/composables/singleTusUpload';
import { videoUploadError } from '@/utils/uploadFiles';

export interface SharedUploadQueueItem {
    uuid: string;
    name: string;
    size: number;
    file: File;
    folderID: number;
    progress: number;
    bytesUploaded: number;
    speed: number;
    uploading: boolean;
    receiving: boolean;
    paused: boolean;
    fin: boolean;
    deleted: boolean;
    error: string;
    uploadURL?: string | null;
    publicURL?: string;
    linkPending?: boolean;
    linkError?: string;
}

export interface SharedUploadStatus { Status: 'processing' | 'ready' | 'failed'; PublicURL?: string; Message?: string }

interface Attempt {
    canceled?: boolean;
    controller?: UploadController;
    abortFinalize: AbortController;
    abortTask?: Promise<void>;
}

export function createSharedFolderUploadQueue(options: {
    apiUrl: string;
    shareToken: string;
    chunkSize: () => number;
    maxFileSize: () => number;
    onReceived?: (folderID: number) => void | Promise<unknown>;
    onReady?: (folderID: number) => void | Promise<unknown>;
    finalize?: (uploadID: string, signal: AbortSignal) => Promise<unknown>;
    returnUploadLink?: () => boolean;
    getStatus?: (uploadID: string, signal: AbortSignal) => Promise<SharedUploadStatus>;
    pollIntervalMs?: number;
}) {
    const items = ref<SharedUploadQueueItem[]>([]);
    const running = ref(false);
    const attempts = new Map<string, Attempt>();
    const controllers = new Map<string, UploadController>();
    const linkPolls = new Map<string, AbortController>();
    let worker: Promise<void> | null = null;
    let disposed = false;
    const finalize = options.finalize ?? ((uploadID: string, signal: AbortSignal) => $fetch(
        `${options.apiUrl.replace(/\/+$/, '')}/shares/${encodeURIComponent(options.shareToken)}/uploads/${encodeURIComponent(uploadID)}/finalize`,
        { method: 'POST', credentials: 'include', retry: 2, retryDelay: 250, signal },
    ));
    const getStatus = options.getStatus ?? ((uploadID: string, signal: AbortSignal) => $fetch<SharedUploadStatus>(
        `${options.apiUrl.replace(/\/+$/, '')}/shares/${encodeURIComponent(options.shareToken)}/uploads/${encodeURIComponent(uploadID)}`,
        { credentials: 'include', retry: 0, signal },
    ));
    const errorStatus = (error: any) => Number(error?.originalResponse?.getStatus?.() ?? error?.statusCode ?? error?.status ?? 0);
    const message = (error: any) => {
        if (errorStatus(error) === 507) return 'Folder size limit reached. Remove videos or ask the owner to increase the limit.';
        if (errorStatus(error) === 413) return 'This video exceeds the maximum file size for this share.';
        return typeof error?.data === 'string' ? error.data : error?.data?.message || error?.data?.error || error?.message || 'Upload failed. Try again.';
    };
    const eligible = () => items.value.find(item => !item.fin && !item.error && !item.paused && !item.deleted);

    async function pollPublicLink(item: SharedUploadQueueItem, uploadID: string) {
        const abort = new AbortController();
        linkPolls.set(item.uuid, abort);
        item.linkPending = true;
        const current = () => !disposed && !item.deleted && !abort.signal.aborted && linkPolls.get(item.uuid) === abort;
        try {
            while (current()) {
                try {
                    const status = await getStatus(uploadID, abort.signal);
                    if (!current()) return;
                    if (status.Status === 'ready' && status.PublicURL) {
                        item.publicURL = status.PublicURL;
                        void Promise.resolve(options.onReady?.(item.folderID)).catch(() => undefined);
                        return;
                    }
                    if (status.Status === 'failed') { item.linkError = status.Message || 'The video could not be processed. Contact the folder owner.'; return; }
                } catch (error) {
                    if (!current()) return;
                    if ([400, 401, 403, 404, 410].includes(errorStatus(error))) {
                        item.linkError = 'The public link is no longer available through this share. Contact the folder owner.';
                        return;
                    }
                }
                await new Promise<void>(resolve => {
                    const done = () => { clearTimeout(timer); abort.signal.removeEventListener('abort', done); resolve(); };
                    const timer = setTimeout(done, options.pollIntervalMs ?? 2000);
                    abort.signal.addEventListener('abort', done, { once: true });
                });
            }
        } finally {
            if (linkPolls.get(item.uuid) === abort) { linkPolls.delete(item.uuid); item.linkPending = false; }
        }
    }

    async function transfer(item: SharedUploadQueueItem) {
        const validationError = videoUploadError(item.file, options.maxFileSize());
        if (validationError) { item.error = validationError; return; }
        const attempt: Attempt = { abortFinalize: new AbortController() };
        attempts.set(item.uuid, attempt);
        const current = () => !disposed && !attempt.canceled && !item.paused && !item.deleted && attempts.get(item.uuid) === attempt;
        item.uploading = true;
        item.speed = 0;
        let lastAt = Date.now(), lastBytes = item.bytesUploaded;
        try {
            if (!item.uploadURL) {
                const controller = createSharedFolderUpload({
                    file: item.file, folderID: item.folderID, apiUrl: options.apiUrl, shareToken: options.shareToken,
                    chunkSize: options.chunkSize(),
                    onProgress(bytes, total) {
                        if (!current()) return;
                        item.bytesUploaded = bytes;
                        item.progress = total > 0 ? Math.min(99, bytes / total * 100) : 0;
                        const now = Date.now();
                        if (now - lastAt >= 300) {
                            item.speed = Math.max(0, (bytes - lastBytes) * 1000 / (now - lastAt));
                            lastAt = now; lastBytes = bytes;
                        }
                    },
                });
                attempt.controller = controller;
                controllers.set(item.uuid, controller);
                await controller.start();
                item.uploadURL = controller.getUploadUrl();
            }
            if (!current()) return;
            if (!item.uploadURL) throw new Error('Upload could not be completed. Try again.');
            const uploadID = new URL(item.uploadURL, window.location.origin).pathname.split('/').pop();
            if (!uploadID) throw new Error('Upload could not be completed. Try again.');
            item.receiving = true;
            await finalize(uploadID, attempt.abortFinalize.signal);
            if (!current()) return;
            item.fin = true; item.progress = 100; item.bytesUploaded = item.size;
            controllers.get(item.uuid)?.clearStoredState?.();
            if (options.returnUploadLink?.()) void pollPublicLink(item, uploadID);
            void Promise.resolve(options.onReceived?.(item.folderID)).catch(() => undefined);
        } catch (error) {
            if (current()) item.error = message(error);
        } finally {
            await attempt.abortTask;
            if (attempts.get(item.uuid) === attempt) attempts.delete(item.uuid);
            item.uploading = false; item.receiving = false; item.speed = 0;
        }
    }

    function pump() {
        if (worker || disposed || !running.value) return;
        worker = (async () => {
            while (!disposed && running.value) {
                const item = eligible();
                if (!item) break;
                await transfer(item);
            }
        })().finally(() => {
            worker = null;
            if (running.value && !disposed && eligible()) pump();
            else running.value = false;
        });
    }

    function add(files: File[] | FileList, folderID: number) {
        if (disposed) return;
        for (const file of files) items.value.push({
            uuid: uuidv4(), name: file.name, size: file.size, file, folderID,
            progress: 0, bytesUploaded: 0, speed: 0, uploading: false, receiving: false,
            paused: false, fin: false, deleted: false, error: videoUploadError(file, options.maxFileSize()),
        });
        pump();
    }
    function start() {
        if (disposed) return;
        for (const item of items.value) if (!item.fin && !item.deleted) item.paused = false;
        running.value = true; pump();
    }
    function pause(id?: string) {
        if (!id) running.value = false;
        for (const item of items.value) {
            if ((id && item.uuid !== id) || item.fin || item.deleted || item.error) continue;
            item.paused = true; item.speed = 0;
            const attempt = attempts.get(item.uuid);
            if (attempt && !attempt.canceled) {
                attempt.canceled = true;
                attempt.abortFinalize.abort();
                attempt.abortTask = attempt.controller?.abort(false).catch(() => undefined);
            }
        }
    }
    function resume(id: string) {
        const item = items.value.find(item => item.uuid === id);
        if (!item || item.deleted || disposed) return;
        item.paused = false; running.value = true; pump();
    }
    function retry(id?: string) {
        for (const item of items.value) if (item.error && !item.deleted && (!id || item.uuid === id)) {
            item.error = videoUploadError(item.file, options.maxFileSize()); item.paused = false;
        }
        running.value = true; pump();
    }
    async function remove(id: string) {
        const item = items.value.find(item => item.uuid === id);
        if (!item || item.deleted) return;
        item.deleted = true;
        linkPolls.get(id)?.abort();
        const attempt = attempts.get(id);
        if (attempt) attempt.canceled = true;
        attempt?.abortFinalize.abort();
        const cleanup = item.fin ? Promise.resolve() : controllers.get(id)?.abort(true).catch(() => undefined) ?? Promise.resolve();
        if (attempt) attempt.abortTask = cleanup;
        await cleanup;
        controllers.delete(id);
        items.value = items.value.filter(item => item.uuid !== id);
    }
    function clearFinished() {
        for (const item of items.value) if (item.fin && !item.linkPending) controllers.delete(item.uuid);
        items.value = items.value.filter(item => !item.fin || item.linkPending);
    }
    function dispose() { pause(); disposed = true; for (const abort of linkPolls.values()) abort.abort(); }
    return { items, running, add, start, pause, resume, retry, remove, clearFinished, dispose };
}
