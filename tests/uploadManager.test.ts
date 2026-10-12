import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { ref } from "vue";
import type { SharedUploadStatus } from '../composables/sharedFolderUploadQueue';

const deferred = <T>() => {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
};

const account = ref<{ Storage: number; Used: number } | null>(null);
const quotaRequests: ReturnType<typeof deferred<void>>[] = [];
const uploads: FakeUpload[] = [];
const uploadLookups: ReturnType<typeof deferred<{ uploadUrl: string }[]>>[] = [];
const resumedUploads: FakeUpload[] = [];
const abortedUploads: FakeUpload[] = [];
const uploadAborts: ReturnType<typeof deferred<void>>[] = [];
const manifestStorage = new Map<string, string>();
let delayUploadLookups = false;
let delayUploadAborts = false;
const intervals = new Map<number, () => void>();
const serverConfig = ref({ MaxUploadFilesize: 0, MaxUploadChunkSize: 1024 });
let nextInterval = 1;

class FakeUpload {
    url = "https://example.test/api/uploads/test-upload";
    constructor(_file: File, public options: {
        onSuccess(): void;
        onError(error: unknown): void;
        onUploadUrlAvailable?(): void;
        onProgress?(bytes: number, total: number): void;
        onChunkComplete?(chunkSize: number, bytes: number): void;
        onShouldRetry?(error: unknown, attempt: number): boolean;
        metadata?: Record<string, string>;
        headers?: Record<string, string>;
        chunkSize?: number;
        withCredentials?: boolean;
        fingerprint?: () => Promise<string>;
    }) {}
    async findPreviousUploads() {
        if (!delayUploadLookups) return [];
        const lookup = deferred<{ uploadUrl: string }[]>();
        uploadLookups.push(lookup);
        return lookup.promise;
    }
    resumeFromPreviousUpload() { resumedUploads.push(this); }
    start() {
        uploads.push(this);
        this.options.onUploadUrlAvailable?.();
    }
    async abort() {
        abortedUploads.push(this);
        if (delayUploadAborts) {
            const completion = deferred<void>();
            uploadAborts.push(completion);
            await completion.promise;
        }
    }
}

mock.module("@/composables/states", () => ({
    useToken: () => ref("test-token"),
    useAccountData: () => ({
        data: account,
        fetch: () => {
            const request = deferred<void>();
            quotaRequests.push(request);
            return request.promise;
        },
    }),
}));
mock.module("#imports", () => ({ useRuntimeConfig: () => ({ public: { apiUrl: "/api" } }) }));
mock.module("tus-js-client", () => ({ Upload: FakeUpload }));
const adaptiveUploads = await import("../composables/adaptiveTusUpload");
mock.module("@/composables/adaptiveTusUpload", () => adaptiveUploads);
mock.module("@/composables/backgroundJobs", () => ({
    backgroundJobAction: async () => {},
    isBackgroundJobActive: () => false,
    waitForBackgroundJobResult: async () => ({ resultId: "imported-file", status: "completed" }),
}));

Object.assign(globalThis, {
    useServerConfig: () => serverConfig,
    window: { location: { origin: "https://example.test", protocol: "https:", host: "example.test" } },
    localStorage: {
        getItem: (key: string) => manifestStorage.get(key) ?? null,
        setItem: (key: string, value: string) => manifestStorage.set(key, value),
        removeItem: (key: string) => manifestStorage.delete(key),
    },
    $fetch: async () => ({ job: { id: "import-job" } }),
});

const manager = await import("../composables/uploadManager");
const sharedUploads = await import("../composables/sharedFolderUpload");
const sharedQueues = await import("../composables/sharedFolderUploadQueue");
const queue = manager.getUploadQueue();
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const tick = (count = 1) => {
    for (let i = 0; i < count; i++) {
        for (const callback of intervals.values()) callback();
    }
};
const addFiles = (count = 6) => {
    const files = Array.from({ length: count }, (_, i) => new File(["test"], `video-${i}.mp4`));
    manager.addToUploadQueue(files as unknown as FileList);
    manager.startUploadQueue();
};
const allowQuota = () => { account.value = { Storage: 100_000, Used: 0 }; };
const createAdaptiveController = (file: File, overrides: Partial<Parameters<typeof adaptiveUploads.createAdaptiveTusUpload>[0]> = {}) => adaptiveUploads.createAdaptiveTusUpload({
    file,
    endpoint: "/api/uploads",
    headers: {},
    metadata: { filename: file.name, client_upload_uuid: "previous-attempt" },
    chunkSize: serverConfig.value.MaxUploadChunkSize,
    retryDelays: [],
    minConcurrency: 1,
    startConcurrency: 1,
    maxConcurrency: 1,
    globalConcurrencyBudget: () => 1,
    onProgress() {},
    onAcceptedBytes() {},
    onTelemetry() {},
    onUploadUrl() {},
    onError() {},
    ...overrides,
});
let multipartFile: File | undefined;
const getMultipartFile = () => {
    if (!multipartFile) {
        multipartFile = new File(["test"], "multipart.mp4");
        // FakeUpload never reads the contents; the reported size plans four parts.
        Object.defineProperty(multipartFile, "size", { value: 200 * 1024 * 1024 });
    }
    return multipartFile;
};
const deferFinalPosts = () => {
    const posts: ReturnType<typeof deferred<Response>>[] = [];
    const requests: { method?: string; url: string }[] = [];
    spyOn(globalThis, "fetch").mockImplementation((async (input, init) => {
        requests.push({ method: init?.method, url: `${input}` });
        if (init?.method === "POST") {
            const post = deferred<Response>();
            posts.push(post);
            return post.promise;
        }
        if (init?.method === "HEAD") return new Response(null, { headers: { "Upload-Offset": "4096" } });
        expect(init?.method).toBe("DELETE");
        return new Response(null, { status: 204 });
    }) as typeof fetch);
    return { posts, requests };
};
const seedAdaptiveManifest = async (file: File) => {
    const manifestsBefore = manifestStorage.size;
    const controller = createAdaptiveController(file);
    const completion = controller.start().catch(() => {});
    await flush();
    await controller.abort(false);
    await completion;
    uploads.length = 0;
    expect(manifestStorage.size).toBe(manifestsBefore + 1);
};
const deferAdaptiveHeads = () => {
    const heads: ReturnType<typeof deferred<Response>>[] = [];
    spyOn(globalThis, "fetch").mockImplementation((async (_input, init) => {
        if (init?.method === "DELETE") return new Response(null, { status: 204 });
        expect(init?.method).toBe("HEAD");
        const head = deferred<Response>();
        heads.push(head);
        return head.promise;
    }) as typeof fetch);
    return heads;
};

beforeEach(() => {
    spyOn(globalThis, "fetch").mockImplementation((async (_input, init) => {
        expect(init?.method).toBe("DELETE");
        return new Response(null, { status: 204 });
    }) as typeof fetch);
    queue.value = [];
    account.value = null;
    quotaRequests.length = 0;
    uploads.length = 0;
    uploadLookups.length = 0;
    resumedUploads.length = 0;
    abortedUploads.length = 0;
    uploadAborts.length = 0;
    delayUploadLookups = false;
    delayUploadAborts = false;
    manifestStorage.clear();
    intervals.clear();
    serverConfig.value.MaxUploadFilesize = 0;
    spyOn(globalThis, "setInterval").mockImplementation(((callback: () => void) => {
        const id = nextInterval++;
        intervals.set(id, callback);
        return id;
    }) as typeof setInterval);
    spyOn(globalThis, "clearInterval").mockImplementation(((id: number) => {
        intervals.delete(id);
    }) as typeof clearInterval);
});

afterEach(async () => {
    delayUploadAborts = false;
    for (const completion of uploadAborts) completion.resolve();
    manager.stopUploadQueue();
    await Promise.all(queue.value.map((item) => manager.removeUploadQueueItem(item.uuid)));
    for (const request of quotaRequests) request.resolve();
    for (const lookup of uploadLookups) lookup.resolve([]);
    await flush();
    mock.restore();
});

describe("upload queue capacity", () => {
    test("reserves three slots while quota checks wait, then transfers them to uploads", async () => {
        addFiles();
        tick(6);
        expect(quotaRequests).toHaveLength(3);
        expect(queue.value.filter((item) => item.preflighting)).toHaveLength(3);
        expect(queue.value.filter((item) => item.uploading)).toHaveLength(0);
        expect(manager.getActiveUploadCount().value).toBe(0);

        allowQuota();
        for (const request of quotaRequests) request.resolve();
        await flush();
        tick(6);
        expect(uploads).toHaveLength(3);
        expect(queue.value.filter((item) => item.preflighting)).toHaveLength(0);
        expect(queue.value.filter((item) => item.uploading)).toHaveLength(3);
        expect(manager.getActiveUploadCount().value).toBe(3);

        uploads[0].options.onSuccess();
        await flush();
        expect(queue.value[0].fin).toBe(true);
        tick();
        await flush();
        expect(uploads).toHaveLength(4);
        expect(manager.getActiveUploadCount().value).toBe(3);
    });

    test("a rejected quota check releases its slot without starting an upload", async () => {
        addFiles();
        tick(6);
        account.value = { Storage: 1, Used: 0 };
        quotaRequests[0].resolve();
        await flush();
        expect(queue.value[0].errored).toBe(true);
        expect(queue.value[0].preflighting).toBe(false);
        expect(uploads).toHaveLength(0);

        account.value = null;
        tick(6);
        expect(quotaRequests).toHaveLength(4);
        expect(queue.value.filter((item) => item.preflighting)).toHaveLength(3);
    });

    test("a failed quota fetch keeps its reservation as the backend checks the upload", async () => {
        addFiles();
        tick(6);
        quotaRequests[0].reject(new Error("account service unavailable"));
        await flush();
        tick(6);
        expect(quotaRequests).toHaveLength(3);
        expect(uploads).toHaveLength(1);
        expect(queue.value.filter((item) => item.preflighting || item.uploading)).toHaveLength(3);

        uploads[0].options.onError(new Error("upload failed"));
        await flush();
        tick(6);
        expect(queue.value[0].errored).toBe(true);
        expect(quotaRequests).toHaveLength(4);
    });

    test("removal frees a preflight slot and ignores a late quota rejection", async () => {
        addFiles();
        tick(6);
        const removed = queue.value[0];
        await manager.removeUploadQueueItem(removed.uuid);
        tick(6);
        expect(quotaRequests).toHaveLength(4);

        account.value = { Storage: 1, Used: 0 };
        quotaRequests[0].resolve();
        await flush();
        expect(removed.log).toHaveLength(0);
        expect(uploads).toHaveLength(0);
        expect(queue.value.filter((item) => item.preflighting)).toHaveLength(3);
    });

    test("pause releases checks and late responses cannot clear newer resume reservations", async () => {
        addFiles();
        tick(6);
        manager.stopUploadQueue();
        expect(queue.value.filter((item) => item.preflighting)).toHaveLength(0);
        expect(queue.value.slice(0, 3).every((item) => item.paused)).toBe(true);

        manager.startUploadQueue();
        tick(6);
        expect(quotaRequests).toHaveLength(6);
        expect(queue.value.filter((item) => item.preflighting)).toHaveLength(3);

        account.value = { Storage: 1, Used: 0 };
        for (const request of quotaRequests.slice(0, 3)) request.resolve();
        await flush();
        tick(6);
        expect(quotaRequests).toHaveLength(6);
        expect(queue.value.filter((item) => item.preflighting)).toHaveLength(3);
        expect(queue.value.every((item) => !item.errored && item.log.length === 0)).toBe(true);
        expect(uploads).toHaveLength(0);

        allowQuota();
        for (const request of quotaRequests.slice(3)) request.resolve();
        await flush();
        tick(6);
        expect(uploads).toHaveLength(3);
        expect(manager.getActiveUploadCount().value).toBe(3);
    });

    test("pause aborts uploads and resume starts only three files", async () => {
        allowQuota();
        addFiles();
        tick(6);
        await flush();
        expect(uploads).toHaveLength(3);
        manager.stopUploadQueue();
        await flush();
        expect(manager.getActiveUploadCount().value).toBe(0);
        expect(queue.value.every((item) => !item.uploading && !item.preflighting && !item.errored)).toBe(true);

        manager.startUploadQueue();
        tick(6);
        await flush();
        expect(uploads).toHaveLength(6);
        expect(manager.getActiveUploadCount().value).toBe(3);
    });

    test("late upload lookups cannot restart paused controllers after resume", async () => {
        delayUploadLookups = true;
        allowQuota();
        addFiles();
        tick(6);
        await flush();
        expect(uploadLookups).toHaveLength(3);
        expect(uploads).toHaveLength(0);

        manager.stopUploadQueue();
        await flush();
        expect(manager.getActiveUploadCount().value).toBe(0);
        manager.startUploadQueue();
        tick(6);
        await flush();
        expect(uploadLookups).toHaveLength(6);

        const previous = [{ uploadUrl: "https://example.test/api/uploads/previous" }];
        for (const lookup of uploadLookups.slice(0, 3)) lookup.resolve(previous);
        await flush();
        expect(uploads).toHaveLength(0);
        expect(resumedUploads).toHaveLength(0);

        for (const lookup of uploadLookups.slice(3)) lookup.resolve(previous);
        await flush();
        tick(6);
        expect(uploads).toHaveLength(3);
        expect(resumedUploads).toHaveLength(3);
        expect(manager.getActiveUploadCount().value).toBe(3);
    });

    test("removing a file cancels its pending upload lookup before freeing the slot", async () => {
        delayUploadLookups = true;
        allowQuota();
        addFiles(4);
        tick(6);
        await flush();
        expect(uploadLookups).toHaveLength(3);

        await manager.removeUploadQueueItem(queue.value[0].uuid);
        await flush();
        tick(6);
        await flush();
        expect(uploadLookups).toHaveLength(4);
        for (const lookup of uploadLookups) {
            lookup.resolve([{ uploadUrl: "https://example.test/api/uploads/previous" }]);
        }
        await flush();
        expect(uploads).toHaveLength(3);
        expect(resumedUploads).toHaveLength(3);
        expect(manager.getActiveUploadCount().value).toBe(3);
    });

    test("adaptive checks release slots on pause and resume before old HEAD requests finish", async () => {
        const files = Array.from({ length: 3 }, (_, i) => new File([new Uint8Array(4096)], `adaptive-${i}.mp4`));
        for (const file of files) await seedAdaptiveManifest(file);
        const heads = deferAdaptiveHeads();
        allowQuota();
        manager.addToUploadQueue(files as unknown as FileList);
        manager.startUploadQueue();
        tick(6);
        await flush();
        expect(heads).toHaveLength(3);

        manager.stopUploadQueue();
        await flush();
        expect(queue.value.every((item) => !item.uploading && !item.errored)).toBe(true);
        expect(manager.getActiveUploadCount().value).toBe(0);
        expect(intervals.size).toBe(0);

        manager.startUploadQueue();
        tick(6);
        await flush();
        expect(heads).toHaveLength(6);
        const resumedManifests = [...manifestStorage.entries()];
        for (const head of heads.slice(0, 3)) head.resolve(new Response(null, { status: 404 }));
        await flush();
        expect(uploads).toHaveLength(0);
        expect(manifestStorage.size).toBe(3);
        expect([...manifestStorage.entries()]).toEqual(resumedManifests);
        expect(queue.value.every((item) => item.uploading && !item.errored)).toBe(true);

        for (const head of heads.slice(3)) {
            head.resolve(new Response(null, { headers: { "Upload-Offset": "0" } }));
        }
        await flush();
        tick(6);
        await flush();
        expect(uploads).toHaveLength(3);
        expect(heads).toHaveLength(6);
        expect(manager.getActiveUploadCount().value).toBe(3);
    });

    test("a removed adaptive upload cannot recreate its manifest after a late HEAD", async () => {
        const file = new File([new Uint8Array(4096)], "adaptive.mp4");
        await seedAdaptiveManifest(file);
        const heads = deferAdaptiveHeads();
        allowQuota();
        manager.addToUploadQueue([file] as unknown as FileList);
        manager.startUploadQueue();
        tick();
        await flush();
        expect(heads).toHaveLength(1);
        await manager.removeUploadQueueItem(queue.value[0].uuid);
        expect(manifestStorage.size).toBe(0);

        heads[0].resolve(new Response(null, { status: 404 }));
        await flush();
        expect(manifestStorage.size).toBe(0);
        expect(uploads).toHaveLength(0);
        expect(queue.value).toHaveLength(0);
    });

    test("adaptive start still resolves after partial upload and final concatenation", async () => {
        spyOn(globalThis, "fetch").mockImplementation((async (_input, init) => {
            expect(init?.method).toBe("POST");
            return new Response(null, { status: 201, headers: { Location: "/api/uploads/final-upload" } });
        }) as typeof fetch);
        const controller = createAdaptiveController(new File([new Uint8Array(4096)], "adaptive.mp4"));
        const completion = controller.start();
        await flush();
        expect(uploads).toHaveLength(1);
        uploads[0].options.onSuccess();
        await completion;
        expect(controller.getUploadUrl()).toBe("https://example.test/api/uploads/final-upload");
        expect(intervals.size).toBe(0);
    });

    test("adaptive start still rejects when a partial upload fails", async () => {
        const controller = createAdaptiveController(new File([new Uint8Array(4096)], "adaptive.mp4"));
        const failure = controller.start().then(() => null, (error) => error);
        await flush();
        expect(uploads).toHaveLength(1);
        const error = new Error("forced partial failure");
        uploads[0].options.onError(error);
        expect(await failure).toBe(error);
        expect(intervals.size).toBe(0);
    });

    for (const status of [201, 500, "network failure"] as const) {
        test(`removal ignores late concatenation responses (${status}) and cleans up created resources`, async () => {
            const { posts, requests } = deferFinalPosts();
            const published: string[] = [];
            const errors: unknown[] = [];
            const controller = createAdaptiveController(new File([new Uint8Array(4096)], "adaptive.mp4"), {
                onUploadUrl: (url) => published.push(url),
                onError: (error) => errors.push(error),
            });
            const completion = controller.start().catch(() => {});
            await flush();
            uploads[0].options.onSuccess();
            await flush();
            expect(posts).toHaveLength(1);
            await controller.abort(true);
            await completion;
            expect(manifestStorage.size).toBe(0);
            const before = [...published];

            if (typeof status === "number") {
                posts[0].resolve(new Response(null, { status, headers: { Location: "/api/uploads/late-final" } }));
            } else {
                posts[0].reject(new Error(status));
            }
            await flush();
            expect(manifestStorage.size).toBe(0);
            expect(controller.getUploadUrl()).toBeNull();
            expect(published).toEqual(before);
            expect(errors).toHaveLength(0);
            expect(requests.filter((request) => request.method === "DELETE")).toEqual([
                { method: "DELETE", url: "https://example.test/api/uploads/test-upload" },
                ...(status === 201 ? [{ method: "DELETE", url: "https://example.test/api/uploads/late-final" }] : []),
            ]);
        });
    }

    for (const status of [201, 500, "network failure"] as const) {
        test(`a paused final response (${status}) cannot alter a resumed attempt`, async () => {
            const { posts, requests } = deferFinalPosts();
            const file = new File([new Uint8Array(4096)], "adaptive.mp4");
            const published: string[] = [];
            const errors: unknown[] = [];
            const paused = createAdaptiveController(file, {
                onUploadUrl: (url) => published.push(url),
                onError: (error) => errors.push(error),
            });
            const pausedCompletion = paused.start().catch(() => {});
            await flush();
            uploads[0].options.onSuccess();
            await flush();
            expect(posts).toHaveLength(1);
            await paused.abort(false);
            await pausedCompletion;

            const resumed = createAdaptiveController(file);
            const completion = resumed.start();
            await flush();
            expect(posts).toHaveLength(2);
            expect(uploads).toHaveLength(1);
            posts[1].resolve(new Response(null, { status: 201, headers: { Location: "/api/uploads/resumed-final" } }));
            await completion;
            const saved = [...manifestStorage.entries()];
            const before = [...published];

            if (typeof status === "number") {
                posts[0].resolve(new Response(null, { status, headers: { Location: "/api/uploads/late-final" } }));
            } else {
                posts[0].reject(new Error(status));
            }
            await flush();
            expect([...manifestStorage.entries()]).toEqual(saved);
            expect(published).toEqual(before);
            expect(errors).toHaveLength(0);
            expect(paused.getUploadUrl()).toBeNull();
            expect(resumed.getUploadUrl()).toBe("https://example.test/api/uploads/resumed-final");
            paused.clearStoredState?.();
            expect([...manifestStorage.entries()]).toEqual(saved);
            expect(requests.filter((request) => request.method === "DELETE")).toEqual(status === 201
                ? [{ method: "DELETE", url: "https://example.test/api/uploads/late-final" }]
                : []);
        });
    }

    test("terminal adaptive failure aborts siblings before rejecting and ignores their late callbacks", async () => {
        const published: string[] = [];
        const errors: unknown[] = [];
        const progress: number[] = [];
        const accepted: number[] = [];
        const controller = createAdaptiveController(getMultipartFile(), {
            startConcurrency: 2,
            maxConcurrency: 2,
            globalConcurrencyBudget: () => 2,
            onUploadUrl: (url) => published.push(url),
            onError: (error) => errors.push(error),
            onProgress: (bytes) => progress.push(bytes),
            onAcceptedBytes: (bytes) => accepted.push(bytes),
        });
        let rejected = false;
        const completion = controller.start().catch((error) => { rejected = true; return error; });
        await flush();
        expect(uploads).toHaveLength(2);
        delayUploadAborts = true;
        const failure = new Error("terminal multipart failure");
        uploads[0].options.onError(failure);
        await flush();
        expect(abortedUploads).toEqual([uploads[1]]);
        expect(rejected).toBe(false);
        const saved = [...manifestStorage.entries()];
        const before = [...published];
        const progressBefore = [...progress];
        const acceptedBefore = [...accepted];
        uploads[1].url = "https://example.test/api/uploads/late-part";
        uploads[1].options.onUploadUrlAvailable?.();
        uploads[1].options.onProgress?.(64 * 1024 * 1024, 64 * 1024 * 1024);
        uploads[1].options.onChunkComplete?.(1024, 64 * 1024 * 1024);
        uploads[1].options.onSuccess();
        uploads[1].options.onError(new Error("late sibling error"));
        expect(uploads[1].options.onShouldRetry?.(new Error("late retry"), 1)).toBe(false);
        await flush();
        expect(uploads).toHaveLength(2);
        expect([...manifestStorage.entries()]).toEqual(saved);
        expect(published).toEqual(before);
        expect(progress).toEqual(progressBefore);
        expect(accepted).toEqual(acceptedBefore);
        expect(errors).toEqual([failure]);
        uploadAborts[0].resolve();
        expect(await completion).toBe(failure);
        expect(intervals.size).toBe(0);
    });

    test("a failed multipart file holds its queue slot until sibling network requests stop", async () => {
        account.value = { Storage: 1_000_000_000, Used: 0 };
        manager.addToUploadQueue([
            getMultipartFile(),
            ...Array.from({ length: 3 }, (_, i) => new File(["test"], `small-${i}.mp4`)),
        ] as unknown as FileList);
        manager.startUploadQueue();
        tick(6);
        await flush();
        const parts = uploads.filter((upload) => upload.options.onUploadUrlAvailable);
        expect(parts).toHaveLength(2);
        expect(uploads).toHaveLength(4);
        delayUploadAborts = true;
        parts[0].options.onError(new Error("terminal multipart failure"));
        await flush();
        tick(6);
        await flush();
        expect(queue.value[0].uploading).toBe(true);
        expect(queue.value[3].uploading).toBe(false);
        expect(uploads).toHaveLength(4);
        uploadAborts[0].resolve();
        await flush();
        expect(queue.value[0].errored).toBe(true);
        tick(6);
        await flush();
        expect(uploads).toHaveLength(5);
        parts[1].options.onSuccess();
        await flush();
        expect(uploads).toHaveLength(5);
        expect(manager.getActiveUploadCount().value).toBe(3);
    });

    test("a delayed pause cannot overwrite a newer controller's saved manifest", async () => {
        const { posts } = deferFinalPosts();
        const file = new File([new Uint8Array(4096)], "adaptive.mp4");
        const old = createAdaptiveController(file);
        const oldCompletion = old.start().catch(() => {});
        await flush();
        delayUploadAborts = true;
        const paused = old.abort(false);
        const resumed = createAdaptiveController(file);
        const completion = resumed.start();
        await flush();
        expect(posts).toHaveLength(1);
        posts[0].resolve(new Response(null, { status: 201, headers: { Location: "/api/uploads/resumed-final" } }));
        await completion;
        const saved = [...manifestStorage.entries()];

        uploadAborts[0].resolve();
        await paused;
        await oldCompletion;
        expect([...manifestStorage.entries()]).toEqual(saved);
        expect(resumed.getUploadUrl()).toBe("https://example.test/api/uploads/resumed-final");
    });

    test("a delayed overflow abort cannot save or schedule after controller removal", async () => {
        deferFinalPosts();
        const file = getMultipartFile();
        const old = createAdaptiveController(file, {
            startConcurrency: 4,
            maxConcurrency: 4,
            globalConcurrencyBudget: () => 4,
        });
        const oldCompletion = old.start().catch(() => {});
        await flush();
        expect(uploads).toHaveLength(4);
        delayUploadAborts = true;
        expect(uploads[0].options.onShouldRetry?.(new Error("network retry"), 1)).toBe(true);
        expect(uploadAborts).toHaveLength(1);
        const removed = old.abort(true);
        for (const abort of uploadAborts.slice(1)) abort.resolve();
        await removed;
        await oldCompletion;
        expect(manifestStorage.size).toBe(0);

        const resumed = createAdaptiveController(file);
        const completion = resumed.start().catch(() => {});
        await flush();
        const saved = [...manifestStorage.entries()];
        uploadAborts[0].resolve();
        await flush();
        expect([...manifestStorage.entries()]).toEqual(saved);
        expect(uploads).toHaveLength(5);
        delayUploadAborts = false;
        await resumed.abort(true);
        await completion;
    });

    test("removing a paused adaptive controller clears its saved resume state", async () => {
        deferFinalPosts();
        const controller = createAdaptiveController(new File([new Uint8Array(4096)], "adaptive.mp4"));
        const completion = controller.start().catch(() => {});
        await flush();
        await controller.abort(false);
        await completion;
        expect(manifestStorage.size).toBe(1);
        await controller.abort(true);
        expect(manifestStorage.size).toBe(0);
    });

    for (const action of ["remove", "reset"]) {
        test(`${action} clears resume state after a terminal adaptive failure`, async () => {
            deferFinalPosts();
            account.value = { Storage: 1_000_000_000, Used: 0 };
            manager.addToUploadQueue([getMultipartFile()] as unknown as FileList);
            manager.startUploadQueue();
            tick(6);
            await flush();
            uploads[0].options.onError(new Error("terminal multipart failure"));
            await flush();
            expect(queue.value[0].errored).toBe(true);
            expect(manifestStorage.size).toBe(1);
            const uuid = queue.value[0].uuid;
            if (action === "remove") await manager.removeUploadQueueItem(uuid);
            else await manager.resetErroredUploadQueueItem(uuid);
            expect(manifestStorage.size).toBe(0);
        });
    }

    test("removal invalidates resume state before delayed network cleanup finishes", async () => {
        deferFinalPosts();
        const file = new File([new Uint8Array(4096)], "adaptive.mp4");
        const old = createAdaptiveController(file);
        const oldCompletion = old.start().catch(() => {});
        await flush();
        delayUploadAborts = true;
        const removed = old.abort(true);
        expect(manifestStorage.size).toBe(0);

        const replacement = createAdaptiveController(file, {
            metadata: { filename: file.name, client_upload_uuid: "replacement-attempt" },
        });
        const completion = replacement.start().catch(() => {});
        await flush();
        expect(uploads).toHaveLength(2);
        expect(uploads[1].options.metadata?.client_upload_uuid).toBe("replacement-attempt");
        const saved = [...manifestStorage.entries()];
        uploadAborts[0].resolve();
        await removed;
        await oldCompletion;
        expect([...manifestStorage.entries()]).toEqual(saved);
        delayUploadAborts = false;
        await replacement.abort(true);
        await completion;
    });
});

describe("shared folder tus transfers", () => {
    const create = (file: File, shareToken = "share-a", folderID = 10, onProgress = (_bytes: number, _total: number) => {}) => sharedUploads.createSharedFolderUpload({
        file, apiUrl: "/api", shareToken, folderID, chunkSize: 4, onProgress,
    });

    test("small files use the standard chunk controller with guest credentials and isolated resume keys", async () => {
        const file = new File(["12345678"], "guest.mp4");
        const controllers = [create(file), create(file, "share-b"), create(file, "share-a", 11)];
        const completions = controllers.map(controller => controller.start().catch(() => {}));
        await flush();
        expect(uploads).toHaveLength(3);
        const fingerprints = await Promise.all(uploads.map(upload => upload.options.fingerprint!()));
        expect(new Set(fingerprints).size).toBe(3);
        expect(uploads[0].options.chunkSize).toBe(4);
        expect(uploads[0].options.withCredentials).toBe(true);
        expect(uploads[0].options.headers).toEqual({ "X-Folder-Share": "share-a" });
        expect(uploads[0].options.metadata?.parent_folder_id).toBe("10");
        expect(uploads[0].options.metadata?.file_size).toBe("8");
        for (const controller of controllers) await controller.abort(true);
        await Promise.all(completions);
    });

    test("large files reuse adaptive concatenation and include the visitor cookie on final and cancellation requests", async () => {
        const requests: RequestInit[] = [];
        spyOn(globalThis, "fetch").mockImplementation((async (_input, init) => {
            requests.push(init!);
            return init?.method === "POST"
                ? new Response(null, { status: 201, headers: { Location: "/api/uploads/guest-final" } })
                : new Response(null, { status: 204 });
        }) as typeof fetch);
        const controller = create(new File(["123456789"], "guest.mp4"));
        const completion = controller.start();
        await flush();
        expect(uploads[0].options.headers?.["Upload-Concat"]).toBe("partial");
        expect(uploads[0].options.metadata?.file_size).toBe("9");
        expect(uploads[0].options.withCredentials).toBe(true);
        uploads[0].options.onSuccess();
        await completion;
        expect(controller.getUploadUrl()).toBe("https://example.test/api/uploads/guest-final");
        await controller.abort(true);
        expect(requests.some(request => request.method === "POST")).toBe(true);
        expect(requests.some(request => request.method === "DELETE")).toBe(true);
        for (const request of requests) {
            expect(request.credentials).toBe("include");
            expect(new Headers(request.headers).get("X-Folder-Share")).toBe("share-a");
        }
    });

    test("adaptive resume state stays separate between shares", async () => {
        const file = new File(["123456789"], "guest.mp4");
        const controllers = [create(file), create(file, "share-b")];
        const completions = controllers.map(controller => controller.start().catch(() => {}));
        await flush();
        for (const controller of controllers) await controller.abort(false);
        await Promise.all(completions);
        expect(manifestStorage.size).toBe(2);
        let resumedHeads = 0;
        spyOn(globalThis, "fetch").mockImplementation((async (_input, init) => {
            if (init?.method === "HEAD") {
                resumedHeads++;
                expect(new Headers(init.headers).get("X-Folder-Share")).toBe("share-a");
                expect(init.credentials).toBe("include");
                return new Response(null, { status: 200, headers: { "Upload-Offset": "0" } });
            }
            return new Response(null, { status: 204 });
        }) as typeof fetch);
        const resumed = create(file);
        const completion = resumed.start().catch(() => {});
        await flush();
        expect(resumedHeads).toBe(1);
        expect(manifestStorage.size).toBe(2);
        await resumed.abort(true);
        await completion;
        expect(manifestStorage.size).toBe(1);
        controllers[1].clearStoredState?.();
    });

    test("cancelling a pending resume lookup cannot start a guest request or update later progress", async () => {
        delayUploadLookups = true;
        let progress = 0;
        const controller = create(new File(["1234"], "guest.mp4"), "share-a", 10, bytes => { progress = bytes; });
        const completion = controller.start().catch(() => {});
        await flush();
        await controller.abort(true);
        uploadLookups[0].resolve([]);
        await flush();
        await completion;
        expect(uploads).toHaveLength(0);
        expect(progress).toBe(0);
    });

    test("guest retries stop when access is denied", async () => {
        const controller = create(new File(["1234"], "guest.mp4"));
        const completion = controller.start().catch(() => {});
        await flush();
        const retry = uploads[0].options.onShouldRetry!;
        expect(retry({ status: 401 }, 0)).toBe(false);
        expect(retry({ status: 403 }, 0)).toBe(false);
        expect(retry({ status: 410 }, 0)).toBe(false);
        expect(retry({ status: 413 }, 0)).toBe(false);
        expect(retry({ status: 507 }, 0)).toBe(false);
        expect(retry({ status: 503 }, 0)).toBe(true);
        expect(retry({ status: 0 }, 0)).toBe(true);
        await controller.abort(true);
        await completion;
    });
});

describe("shared folder upload queue", () => {
    const createQueue = (overrides: Partial<Parameters<typeof sharedQueues.createSharedFolderUploadQueue>[0]> = {}) => sharedQueues.createSharedFolderUploadQueue({
        apiUrl: "/api", shareToken: "share-a", chunkSize: () => 1024, maxFileSize: () => 1024,
        finalize: async () => {}, ...overrides,
    });

    test("public links arrive independently while the next video uploads", async () => {
        const status = deferred<SharedUploadStatus>();
        const ids: string[] = [];
        const readyFolders: number[] = [];
        const guest = createQueue({ returnUploadLink: () => true, getStatus: async id => { ids.push(id); return status.promise; }, onReady: folderID => { readyFolders.push(folderID); } });
        guest.add([new File(["1234"], "first.mp4"), new File(["5678"], "second.mp4")], 20);
        guest.start(); await flush();
        uploads[0].options.onSuccess(); await flush();
        expect(guest.items.value[0].fin).toBe(true);
        expect(guest.items.value[0].linkPending).toBe(true);
        expect(uploads).toHaveLength(2);
        expect(ids).toEqual(["test-upload"]);
        guest.clearFinished(); expect(guest.items.value).toHaveLength(2);
        status.resolve({ Status: "ready", PublicURL: "/v/public-video" }); await flush();
        expect(guest.items.value[0].publicURL).toBe("/v/public-video");
        expect(guest.items.value[0].linkPending).toBe(false);
        expect(readyFolders).toEqual([20]);
        guest.clearFinished(); expect(guest.items.value).toHaveLength(1);
        guest.dispose();
    });

    test("disabled public links never request upload status", async () => {
        let requests = 0;
        const guest = createQueue({ returnUploadLink: () => false, getStatus: async () => { requests++; return { Status: "processing" }; } });
        guest.add([new File(["1234"], "guest.mp4")], 10); guest.start(); await flush();
        uploads[0].options.onSuccess(); await flush();
        expect(requests).toBe(0); expect(guest.items.value[0].fin).toBe(true);
        guest.dispose();
    });

    test("status polling tolerates network failures then reports processing failure without retrying the upload", async () => {
        let requests = 0;
        const guest = createQueue({ returnUploadLink: () => true, pollIntervalMs: 0, getStatus: async () => {
            if (++requests === 1) throw new Error("Connection lost");
            if (requests === 2) return { Status: "processing" };
            return { Status: "failed", Message: "Contact the folder owner." };
        } });
        guest.add([new File(["1234"], "guest.mp4")], 10); guest.start(); await flush();
        uploads[0].options.onSuccess(); await flush(); await flush(); await flush();
        expect(requests).toBe(3);
        expect(guest.items.value[0].fin).toBe(true);
        expect(guest.items.value[0].error).toBe("");
        expect(guest.items.value[0].linkError).toBe("Contact the folder owner.");
        expect(guest.items.value[0].linkPending).toBe(false);
        expect(uploads).toHaveLength(1); guest.dispose();
    });

    for (const action of ["remove", "dispose"] as const) test(`${action} aborts status polling and ignores a late public link`, async () => {
        const status = deferred<SharedUploadStatus>();
        let signal: AbortSignal | undefined;
        const guest = createQueue({ returnUploadLink: () => true, getStatus: async (_id, abortSignal) => { signal = abortSignal; return status.promise; } });
        guest.add([new File(["1234"], "guest.mp4")], 10); guest.start(); await flush();
        uploads[0].options.onSuccess(); await flush();
        const item = guest.items.value[0];
        if (action === "remove") await guest.remove(item.uuid); else guest.dispose();
        expect(signal?.aborted).toBe(true);
        status.resolve({ Status: "ready", PublicURL: "/v/late-video" }); await flush();
        expect(item.publicURL).toBeUndefined(); expect(item.linkPending).toBe(false);
        guest.dispose();
    });

    test("folder-capacity rejection gives a useful queue error", async () => {
        const guest = createQueue();
        guest.add([new File(["1234"], "guest.mp4")], 10); guest.start(); await flush();
        uploads[0].options.onError({ originalResponse: { getStatus: () => 507 } }); await flush();
        expect(guest.items.value[0].error).toContain("Folder size limit reached");
        expect(guest.items.value[0].fin).toBe(false); guest.dispose();
    });

    test("a browsed subfolder remains the destination through pause, resume, and retry", async () => {
        const received: number[] = [];
        const guest = createQueue({ onReceived: folderID => { received.push(folderID); } });
        guest.add([new File(["1234"], "nested.mp4")], 20);
        guest.start(); await flush();
        expect(uploads[0].options.metadata?.parent_folder_id).toBe("20");
        const id = guest.items.value[0].uuid;
        guest.pause(id); await flush();
        guest.resume(id); await flush();
        expect(uploads[1].options.metadata?.parent_folder_id).toBe("20");
        uploads[1].options.onError(new Error("Connection interrupted")); await flush();
        guest.retry(id); await flush();
        expect(uploads[2].options.metadata?.parent_folder_id).toBe("20");
        uploads[2].options.onSuccess(); await flush();
        expect(received).toEqual([20]);
        expect(guest.items.value[0].folderID).toBe(20);
        guest.dispose();
    });

    test("files wait for start and finish in order after the server accepts each receipt", async () => {
        const receipts: ReturnType<typeof deferred<void>>[] = [];
        const received: number[] = [];
        const guest = createQueue({
            finalize: async () => { const receipt = deferred<void>(); receipts.push(receipt); await receipt.promise; },
            onReceived: folderID => { received.push(folderID); },
        });
        guest.add([new File(["1234"], "first.mp4"), new File(["5678"], "second.mkv")], 10);
        await flush();
        expect(uploads).toHaveLength(0);
        guest.start(); await flush();
        expect(uploads).toHaveLength(1);
        uploads[0].options.onProgress?.(2, 4);
        expect(guest.items.value[0].progress).toBe(50);
        uploads[0].options.onSuccess(); await flush();
        expect(guest.items.value[0].receiving).toBe(true);
        expect(guest.items.value[0].fin).toBe(false);
        expect(uploads).toHaveLength(1);
        receipts[0].resolve(); await flush();
        expect(guest.items.value[0].fin).toBe(true);
        expect(uploads).toHaveLength(2);
        uploads[1].options.onSuccess(); await flush();
        receipts[1].resolve(); await flush();
        expect(received).toEqual([10, 10]);
        expect(guest.running.value).toBe(false);
        expect(quotaRequests).toHaveLength(0);
        guest.clearFinished(); expect(guest.items.value).toHaveLength(0);
        guest.dispose();
    });

    test("an immediate resume waits for the paused controller to release its requests", async () => {
        delayUploadAborts = true;
        const guest = createQueue();
        guest.add([new File(["1234"], "guest.mp4")], 10);
        guest.start(); await flush();
        const id = guest.items.value[0].uuid;
        guest.pause(id); guest.resume(id); await flush();
        expect(uploads).toHaveLength(1);
        uploads[0].options.onProgress?.(4, 4);
        expect(guest.items.value[0].bytesUploaded).toBe(0);
        uploadAborts[0].resolve(); await flush();
        expect(uploads).toHaveLength(2);
        expect(guest.items.value[0].error).toBe("");
        uploads[1].options.onSuccess(); await flush();
        expect(guest.items.value[0].fin).toBe(true);
        guest.dispose();
    });

    test("removing a file during resume lookup prevents any later upload", async () => {
        delayUploadLookups = true;
        const guest = createQueue();
        guest.add([new File(["1234"], "guest.mp4")], 10);
        guest.start(); await flush();
        await guest.remove(guest.items.value[0].uuid);
        uploadLookups[0].resolve([]); await flush();
        expect(uploads).toHaveLength(0);
        expect(guest.items.value).toHaveLength(0);
        expect(guest.running.value).toBe(false);
        guest.dispose();
    });

    test("a failed receipt retries the completed upload without transferring it again", async () => {
        let attempts = 0;
        const guest = createQueue({ finalize: async () => { if (++attempts === 1) throw new Error("Server unavailable"); } });
        guest.add([new File(["1234"], "guest.mp4")], 10);
        guest.start(); await flush();
        uploads[0].options.onSuccess(); await flush();
        expect(guest.items.value[0].error).toBe("Server unavailable");
        expect(guest.items.value[0].fin).toBe(false);
        guest.retry(guest.items.value[0].uuid); await flush();
        expect(attempts).toBe(2);
        expect(uploads).toHaveLength(1);
        expect(guest.items.value[0].fin).toBe(true);
        guest.dispose();
    });

    test("removing a file awaiting its receipt ignores a late server response", async () => {
        const receipt = deferred<void>();
        let received = 0;
        let signal: AbortSignal | undefined;
        const guest = createQueue({
            finalize: async (_id, abortSignal) => { signal = abortSignal; await receipt.promise; },
            onReceived: () => { received++; },
        });
        guest.add([new File(["1234"], "guest.mp4")], 10);
        guest.start(); await flush();
        uploads[0].options.onSuccess(); await flush();
        await guest.remove(guest.items.value[0].uuid);
        expect(signal?.aborted).toBe(true);
        receipt.resolve(); await flush();
        expect(received).toBe(0);
        expect(guest.items.value).toHaveLength(0);
        guest.dispose();
    });

    test("invalid files stay in the queue with errors and never reach the server", async () => {
        const guest = createQueue({ maxFileSize: () => 4 });
        guest.add([new File(["text"], "notes.txt"), new File([], "empty.mp4"), new File(["12345"], "large.mp4")], 10);
        guest.start(); await flush();
        guest.retry(); await flush();
        expect(guest.items.value.every(item => !!item.error)).toBe(true);
        expect(uploads).toHaveLength(0);
        expect(guest.running.value).toBe(false);
        guest.dispose();
    });
});
