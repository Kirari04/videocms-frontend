import * as tus from "tus-js-client";
import type { UploadController } from "@/composables/uploadManager";

export const AUTO_MIN_CONCURRENCY = 1;
export const AUTO_START_CONCURRENCY = 2;
export const AUTO_PER_FILE_MAX_CONCURRENCY = 6;
export const AUTO_GLOBAL_MAX_ACTIVE_PATCHES = 12;
export const AUTO_MAX_PARTS = 128;
export const AUTO_MIN_PART_SIZE = 64 * 1024 * 1024;
export const AUTO_TARGET_PART_CHUNKS = 4;

const AUTO_EVAL_INTERVAL_MS = 8000;
const AUTO_MIN_CHANGE_INTERVAL_MS = 15000;
const AUTO_STALL_AFTER_MS = 20000;
const AUTO_RECENT_INCREASE_WINDOW_MS = 30000;
const AUTO_THROUGHPUT_IMPROVEMENT_RATIO = 1.1;
const AUTO_THROUGHPUT_DROP_RATIO = 0.75;
const MANIFEST_VERSION = 1;
const MANIFEST_PREFIX = "videocms:adaptive-upload:";
const sessionBestSpeedBpsByConcurrency = new Map<number, number>();

export interface AdaptiveTusUploadOptions {
    file: File;
    endpoint: string;
    headers: Record<string, string>;
    metadata: Record<string, string>;
    chunkSize: number;
    retryDelays: number[];
    minConcurrency: number;
    startConcurrency: number;
    maxConcurrency: number;
    globalConcurrencyBudget: () => number;
    onProgress(bytesUploaded: number, bytesTotal: number): void;
    onAcceptedBytes(bytesAcceptedDelta: number, bytesAcceptedTotal: number): void;
    onTelemetry(telemetry: AdaptiveUploadTelemetry): void;
    onUploadUrl(uploadUrl: string): void;
    onError(error: unknown): void;
    onShouldRetry?: (error: any, retryAttempt: number) => boolean;
}

export interface AdaptiveUploadTelemetry {
    activeChunks: number;
    targetChunks: number;
    maxChunks: number;
    uploadSpeedBps: number;
    acceptedBytes: number;
    retryCount: number;
    stalled: boolean;
    lastDecision?: "increase" | "decrease" | "hold";
    lastDecisionReason?: string;
}

interface AdaptiveUploadPart {
    index: number;
    start: number;
    end: number;
    size: number;
    uploadUrl?: string;
    acceptedBytes: number;
    progressBytes: number;
    status: "pending" | "uploading" | "paused" | "complete" | "error";
    upload?: tus.Upload;
    pauseRequested?: boolean;
}

interface AdaptiveUploadManifest {
    version: 1;
    fileName: string;
    fileSize: number;
    fileType: string;
    lastModified: number;
    clientUploadUUID: string;
    createdAt: string;
    updatedAt: string;
    chunkSize: number;
    partSize: number;
    parts: Array<{
        index: number;
        start: number;
        end: number;
        uploadUrl?: string;
        complete: boolean;
    }>;
    finalUploadUrl?: string;
}

interface NetworkHints {
    saveData?: boolean;
    effectiveType?: string;
}

export interface AdaptiveConcurrencyBounds {
    minConcurrency: number;
    startConcurrency: number;
    maxConcurrency: number;
}

export interface AdaptiveIncreaseMetrics {
    targetConcurrency: number;
    maxConcurrency: number;
    retryCountWindow: number;
    stalled: boolean;
    bytesSinceLastDecision: number;
    msSinceLastDecision: number;
    progressRatio: number;
    rollingSpeedBps: number;
    previousBestSpeedBps?: number;
    minBytesPerDecision: number;
}

export interface AdaptiveDecreaseMetrics {
    targetConcurrency: number;
    retryableError: boolean;
    stalled: boolean;
    throughputDrop: boolean;
    saveData: boolean;
}

export const splitFileIntoAdaptiveParts = (fileSize: number, chunkSize: number) => {
    const safeFileSize = Math.max(0, Math.ceil(fileSize));
    const safeChunkSize = Math.max(1, Math.ceil(chunkSize));
    const minPartSize = Math.max(AUTO_MIN_PART_SIZE, safeChunkSize * AUTO_TARGET_PART_CHUNKS);
    const partSize = Math.max(minPartSize, Math.ceil(safeFileSize / AUTO_MAX_PARTS));
    const partCount = Math.max(1, Math.ceil(safeFileSize / partSize));
    const parts = Array.from({ length: partCount }, (_, index) => {
        const start = index * partSize;
        const end = Math.min(safeFileSize, start + partSize);
        return {
            index,
            start,
            end,
            size: Math.max(0, end - start),
        };
    });

    return { partSize, partCount, parts };
};

export const calculateAdaptiveConcurrencyBounds = (
    activeFiles: number,
    partCount: number,
    networkInfo: NetworkHints = readNetworkHints(),
): AdaptiveConcurrencyBounds => {
    const safeActiveFiles = Math.max(1, Math.ceil(activeFiles || 1));
    const safePartCount = Math.max(1, Math.ceil(partCount || 1));
    const budgetCap = Math.max(1, Math.floor(AUTO_GLOBAL_MAX_ACTIVE_PATCHES / safeActiveFiles));
    const networkCap = isConstrainedNetwork(networkInfo) ? 2 : AUTO_PER_FILE_MAX_CONCURRENCY;
    const maxConcurrency = Math.max(
        AUTO_MIN_CONCURRENCY,
        Math.min(AUTO_PER_FILE_MAX_CONCURRENCY, budgetCap, networkCap, safePartCount),
    );
    const startConcurrency = Math.min(
        isConstrainedNetwork(networkInfo) ? AUTO_MIN_CONCURRENCY : AUTO_START_CONCURRENCY,
        maxConcurrency,
    );

    return {
        minConcurrency: AUTO_MIN_CONCURRENCY,
        startConcurrency: Math.max(AUTO_MIN_CONCURRENCY, startConcurrency),
        maxConcurrency,
    };
};

export const shouldIncreaseConcurrency = (metrics: AdaptiveIncreaseMetrics) => {
    if (metrics.targetConcurrency >= metrics.maxConcurrency) return false;
    if (metrics.retryCountWindow > 0 || metrics.stalled) return false;
    if (metrics.bytesSinceLastDecision < metrics.minBytesPerDecision) return false;
    if (metrics.msSinceLastDecision < AUTO_MIN_CHANGE_INTERVAL_MS) return false;
    if (metrics.progressRatio >= 0.9) return false;
    if (metrics.rollingSpeedBps <= 0) return false;
    if (metrics.previousBestSpeedBps === undefined || metrics.previousBestSpeedBps <= 0) return true;
    return metrics.rollingSpeedBps >= metrics.previousBestSpeedBps * AUTO_THROUGHPUT_IMPROVEMENT_RATIO;
};

export const shouldDecreaseConcurrency = (metrics: AdaptiveDecreaseMetrics) => {
    if (metrics.targetConcurrency <= AUTO_MIN_CONCURRENCY) return false;
    return metrics.retryableError || metrics.stalled || metrics.throughputDrop || metrics.saveData;
};

export const createAdaptiveTusUpload = (options: AdaptiveTusUploadOptions): UploadController =>
    new AdaptiveTusUploadController(options);

class AdaptiveTusUploadController implements UploadController {
    private manifestKey = "";
    private manifest: AdaptiveUploadManifest | null = null;
    private parts: AdaptiveUploadPart[] = [];
    private effectiveMetadata: Record<string, string>;
    private targetConcurrency: number;
    private maxConcurrency: number;
    private finalUploadUrl: string | null = null;
    private startPromise: Promise<void> | null = null;
    private resolveStart?: () => void;
    private rejectStart?: (error: unknown) => void;
    private evaluationTimer: ReturnType<typeof setInterval> | null = null;
    private finishingFinal = false;
    private aborted = false;
    private acceptedBytesAtLastEvaluation = 0;
    private acceptedBytesAtLastDecision = 0;
    private lastEvaluationAt = Date.now();
    private lastDecisionAt = Date.now();
    private lastAcceptedAt = Date.now();
    private rollingSpeedBps = 0;
    private speedBeforeLastIncrease = 0;
    private lastIncreaseAt = 0;
    private retryCountWindow = 0;
    private totalRetryCount = 0;
    private lastDecision: "increase" | "decrease" | "hold" = "hold";
    private lastDecisionReason = "";
    private bestSpeedBpsByConcurrency = sessionBestSpeedBpsByConcurrency;

    constructor(private readonly options: AdaptiveTusUploadOptions) {
        this.effectiveMetadata = { ...options.metadata };
        this.targetConcurrency = Math.max(options.minConcurrency, Math.min(options.startConcurrency, options.maxConcurrency));
        this.maxConcurrency = Math.max(options.minConcurrency, options.maxConcurrency);
    }

    start() {
        if (this.startPromise) return this.startPromise;
        this.aborted = false;
        this.startPromise = this.startInternal();
        return this.startPromise;
    }

    async abort(shouldTerminate = false) {
        this.aborted = true;
        this.stopEvaluationTimer();

        for (const part of this.parts) {
            if (part.status === "uploading") {
                part.pauseRequested = true;
                part.status = "paused";
            }
        }

        await Promise.allSettled(
            this.parts
                .map((part) => part.upload)
                .filter((upload): upload is tus.Upload => Boolean(upload))
                .map((upload) => upload.abort(shouldTerminate)),
        );

        if (shouldTerminate) {
            await this.terminateKnownUploads();
            this.removeManifest();
        } else {
            this.saveManifest();
        }

        this.rejectStart?.(new Error(shouldTerminate ? "Upload removed" : "Upload paused"));
    }

    getUploadUrl() {
        return this.finalUploadUrl;
    }

    clearStoredState() {
        this.removeManifest();
    }

    private async startInternal() {
        await this.prepareManifest();
        this.emitProgress();
        this.emitTelemetry();

        if (this.finalUploadUrl) {
            this.options.onUploadUrl(this.finalUploadUrl);
            return;
        }

        if (this.allPartsComplete()) {
            await this.createFinalUpload();
            return;
        }

        this.startEvaluationTimer();

        return await new Promise<void>((resolve, reject) => {
            this.resolveStart = resolve;
            this.rejectStart = reject;
            this.schedule();
        });
    }

    private async prepareManifest() {
        const split = splitFileIntoAdaptiveParts(this.options.file.size, this.options.chunkSize);
        this.manifestKey = manifestKeyForFile(this.options.file, this.options.endpoint);

        const savedManifest = readManifest(this.manifestKey);
        if (savedManifest && this.manifestMatches(savedManifest, split.partSize, split.parts)) {
            this.manifest = savedManifest;
            this.effectiveMetadata = {
                ...this.options.metadata,
                client_upload_uuid: savedManifest.clientUploadUUID,
            };
            this.parts = split.parts.map((part) => {
                const savedPart = savedManifest.parts.find((item) => item.index === part.index);
                return {
                    ...part,
                    uploadUrl: savedPart?.uploadUrl,
                    acceptedBytes: savedPart?.complete ? part.size : 0,
                    progressBytes: savedPart?.complete ? part.size : 0,
                    status: savedPart?.complete ? "complete" : savedPart?.uploadUrl ? "paused" : "pending",
                };
            });
            this.finalUploadUrl = savedManifest.finalUploadUrl ?? null;

            if (!this.finalUploadUrl) {
                const verified = await this.verifySavedManifestUrls();
                if (!verified) {
                    this.removeManifest();
                    this.createFreshManifest(split.partSize, split.parts);
                }
            }
            return;
        }

        this.createFreshManifest(split.partSize, split.parts);
    }

    private createFreshManifest(
        partSize: number,
        parts: Array<{ index: number; start: number; end: number; size: number }>,
    ) {
        const now = new Date().toISOString();
        const clientUploadUUID = this.options.metadata.client_upload_uuid || cryptoRandomUUID();
        this.effectiveMetadata = {
            ...this.options.metadata,
            client_upload_uuid: clientUploadUUID,
        };
        this.parts = parts.map((part) => ({
            ...part,
            acceptedBytes: 0,
            progressBytes: 0,
            status: "pending",
        }));
        this.manifest = {
            version: MANIFEST_VERSION,
            fileName: this.options.file.name,
            fileSize: this.options.file.size,
            fileType: this.options.file.type,
            lastModified: this.options.file.lastModified,
            clientUploadUUID,
            createdAt: now,
            updatedAt: now,
            chunkSize: this.options.chunkSize,
            partSize,
            parts: parts.map((part) => ({
                index: part.index,
                start: part.start,
                end: part.end,
                complete: false,
            })),
        };
        this.saveManifest();
    }

    private manifestMatches(
        manifest: AdaptiveUploadManifest,
        partSize: number,
        parts: Array<{ index: number; start: number; end: number }>,
    ) {
        if (manifest.version !== MANIFEST_VERSION) return false;
        if (manifest.fileName !== this.options.file.name) return false;
        if (manifest.fileSize !== this.options.file.size) return false;
        if (manifest.fileType !== this.options.file.type) return false;
        if (manifest.lastModified !== this.options.file.lastModified) return false;
        if (manifest.chunkSize !== this.options.chunkSize) return false;
        if (manifest.partSize !== partSize) return false;
        if (manifest.parts.length !== parts.length) return false;

        return parts.every((part) => {
            const savedPart = manifest.parts.find((item) => item.index === part.index);
            return savedPart && savedPart.start === part.start && savedPart.end === part.end;
        });
    }

    private async verifySavedManifestUrls() {
        for (const part of this.parts) {
            if (!part.uploadUrl) continue;

            const response = await fetch(part.uploadUrl, {
                method: "HEAD",
                headers: tusHeaders(this.options.headers),
            }).catch(() => null);

            if (!response) return true;
            if (response.status === 404 || response.status === 410) return false;
            if (response.status < 200 || response.status >= 300) continue;

            const offset = Number(response.headers.get("Upload-Offset") || 0);
            if (Number.isFinite(offset) && offset >= 0) {
                part.acceptedBytes = Math.min(offset, part.size);
                part.progressBytes = part.acceptedBytes;
                part.status = part.acceptedBytes >= part.size ? "complete" : "paused";
            }
        }
        this.saveManifest();
        return true;
    }

    private schedule() {
        if (this.aborted || this.finishingFinal) return;

        this.recalculateMaxConcurrency();
        while (this.activePartCount() < this.targetConcurrency) {
            const part = this.nextUploadablePart();
            if (!part) break;
            this.startPart(part);
        }

        if (this.allPartsComplete()) {
            void this.createFinalUpload();
            return;
        }

        this.emitProgress();
        this.emitTelemetry();
    }

    private startPart(part: AdaptiveUploadPart) {
        part.status = "uploading";
        part.pauseRequested = false;
        part.progressBytes = part.acceptedBytes;

        const upload = new tus.Upload(this.options.file.slice(part.start, part.end), {
            endpoint: this.options.endpoint,
            uploadUrl: part.uploadUrl || null,
            headers: {
                ...this.options.headers,
                "Upload-Concat": "partial",
            },
            metadata: this.effectiveMetadata,
            chunkSize: this.options.chunkSize,
            retryDelays: this.options.retryDelays,
            parallelUploads: 1,
            storeFingerprintForResuming: false,
            removeFingerprintOnSuccess: false,
            onUploadUrlAvailable: () => {
                if (!upload.url) return;
                part.uploadUrl = resolveUploadUrl(this.options.endpoint, upload.url);
                this.options.onUploadUrl(part.uploadUrl);
                this.saveManifest();
            },
            onProgress: (bytesUploaded) => {
                if (this.aborted || part.pauseRequested) return;
                part.progressBytes = Math.max(part.acceptedBytes, Math.min(bytesUploaded, part.size));
                this.emitProgress();
            },
            onChunkComplete: (_chunkSize, bytesAccepted) => {
                if (this.aborted || part.pauseRequested) return;
                const previousTotal = this.acceptedBytesTotal();
                part.acceptedBytes = Math.max(part.acceptedBytes, Math.min(bytesAccepted, part.size));
                part.progressBytes = Math.max(part.progressBytes, part.acceptedBytes);
                const nextTotal = this.acceptedBytesTotal();
                const delta = Math.max(0, nextTotal - previousTotal);
                if (delta > 0) {
                    this.lastAcceptedAt = Date.now();
                    this.options.onAcceptedBytes(delta, nextTotal);
                }
                this.evaluate();
                this.emitProgress();
            },
            onShouldRetry: (error, retryAttempt) => {
                const shouldRetry = this.options.onShouldRetry
                    ? this.options.onShouldRetry(error, retryAttempt)
                    : true;
                if (shouldRetry) {
                    this.handleRetryableError();
                }
                return shouldRetry;
            },
            onSuccess: () => {
                if (this.aborted || part.pauseRequested) return;
                const previousTotal = this.acceptedBytesTotal();
                part.acceptedBytes = part.size;
                part.progressBytes = part.size;
                part.status = "complete";
                part.upload = undefined;
                const nextTotal = this.acceptedBytesTotal();
                const delta = Math.max(0, nextTotal - previousTotal);
                if (delta > 0) {
                    this.lastAcceptedAt = Date.now();
                    this.options.onAcceptedBytes(delta, nextTotal);
                }
                this.saveManifest();
                this.schedule();
            },
            onError: (error) => {
                part.upload = undefined;
                if (this.aborted || part.pauseRequested) return;
                part.status = "error";
                this.options.onError(error);
                this.fail(error);
            },
        });

        part.upload = upload;
        upload.start();
    }

    private async createFinalUpload() {
        if (this.finishingFinal || this.aborted) return;
        this.finishingFinal = true;
        this.stopEvaluationTimer();
        this.emitProgress();
        this.emitTelemetry();

        try {
            const partialUrls = this.parts
                .map((part) => part.uploadUrl)
                .filter((url): url is string => Boolean(url));
            if (partialUrls.length !== this.parts.length) {
                throw new Error("Missing partial upload URL before final concatenation");
            }

            const response = await fetch(this.options.endpoint, {
                method: "POST",
                headers: {
                    ...tusHeaders(this.options.headers),
                    "Upload-Concat": `final;${partialUrls.join(" ")}`,
                    "Upload-Metadata": encodeTusMetadata(this.effectiveMetadata),
                },
            });
            if (response.status < 200 || response.status >= 300) {
                const body = await response.text().catch(() => "");
                throw httpError(response.status, body || "Final upload concatenation failed");
            }

            const location = response.headers.get("Location");
            if (!location) {
                throw new Error("Missing Location header after final upload concatenation");
            }

            this.finalUploadUrl = resolveUploadUrl(this.options.endpoint, location);
            if (this.manifest) {
                this.manifest.finalUploadUrl = this.finalUploadUrl;
                this.saveManifest();
            }
            this.options.onUploadUrl(this.finalUploadUrl);
            this.emitProgress(this.options.file.size);
            this.resolveStart?.();
        } catch (error) {
            this.options.onError(error);
            this.fail(error);
            if (!this.resolveStart) {
                throw error;
            }
        }
    }

    private evaluate() {
        if (this.aborted || this.finishingFinal) return;

        const now = Date.now();
        if (now - this.lastEvaluationAt < AUTO_EVAL_INTERVAL_MS) return;

        const acceptedBytes = this.acceptedBytesTotal();
        const elapsedSeconds = Math.max(0.001, (now - this.lastEvaluationAt) / 1000);
        const deltaBytes = Math.max(0, acceptedBytes - this.acceptedBytesAtLastEvaluation);
        const currentSpeed = deltaBytes / elapsedSeconds;
        this.rollingSpeedBps = this.rollingSpeedBps === 0
            ? currentSpeed
            : this.rollingSpeedBps * 0.7 + currentSpeed * 0.3;

        this.acceptedBytesAtLastEvaluation = acceptedBytes;
        this.lastEvaluationAt = now;

        this.recalculateMaxConcurrency();

        const stalled = this.isStalled(now);
        const networkHints = readNetworkHints();
        const recentIncrease = this.lastIncreaseAt > 0 && now - this.lastIncreaseAt < AUTO_RECENT_INCREASE_WINDOW_MS;
        const throughputDrop = recentIncrease &&
            this.speedBeforeLastIncrease > 0 &&
            this.rollingSpeedBps > 0 &&
            this.rollingSpeedBps < this.speedBeforeLastIncrease * AUTO_THROUGHPUT_DROP_RATIO;

        if (shouldDecreaseConcurrency({
            targetConcurrency: this.targetConcurrency,
            retryableError: false,
            stalled,
            throughputDrop,
            saveData: Boolean(networkHints.saveData),
        })) {
            const reason = stalled
                ? "upload stalled"
                : throughputDrop
                    ? "throughput dropped"
                    : "reduced data mode";
            this.decreaseConcurrency(reason, stalled || throughputDrop);
            this.retryCountWindow = 0;
            this.emitTelemetry();
            return;
        }

        const previousBest = this.bestSpeedBpsByConcurrency.get(this.targetConcurrency);
        const minBytesPerDecision = Math.max(20 * 1024 * 1024, this.options.chunkSize * 2);
        const shouldIncrease = shouldIncreaseConcurrency({
            targetConcurrency: this.targetConcurrency,
            maxConcurrency: this.maxConcurrency,
            retryCountWindow: this.retryCountWindow,
            stalled,
            bytesSinceLastDecision: acceptedBytes - this.acceptedBytesAtLastDecision,
            msSinceLastDecision: now - this.lastDecisionAt,
            progressRatio: acceptedBytes / Math.max(1, this.options.file.size),
            rollingSpeedBps: this.rollingSpeedBps,
            previousBestSpeedBps: previousBest,
            minBytesPerDecision,
        });

        if (this.rollingSpeedBps > 0 && (!previousBest || this.rollingSpeedBps > previousBest)) {
            this.bestSpeedBpsByConcurrency.set(this.targetConcurrency, this.rollingSpeedBps);
        }

        if (shouldIncrease) {
            this.speedBeforeLastIncrease = this.rollingSpeedBps;
            this.lastIncreaseAt = now;
            this.targetConcurrency = Math.min(this.maxConcurrency, this.targetConcurrency + 1);
            this.markDecision("increase", "throughput improved");
            this.schedule();
        } else {
            this.markDecision("hold", "");
        }

        this.retryCountWindow = 0;
        this.emitTelemetry();
    }

    private handleRetryableError() {
        this.retryCountWindow++;
        this.totalRetryCount++;
        this.decreaseConcurrency("retryable upload error", true);
        this.emitTelemetry();
    }

    private decreaseConcurrency(reason: string, trimActiveUploads: boolean) {
        if (this.targetConcurrency <= AUTO_MIN_CONCURRENCY) return;
        this.targetConcurrency = Math.max(AUTO_MIN_CONCURRENCY, Math.floor(this.targetConcurrency / 2));
        this.acceptedBytesAtLastDecision = this.acceptedBytesTotal();
        this.lastDecisionAt = Date.now();
        this.markDecision("decrease", reason);

        if (trimActiveUploads) {
            void this.pauseOverflowUploads();
        }
    }

    private async pauseOverflowUploads() {
        const overflow = this.activePartCount() - this.targetConcurrency;
        if (overflow <= 1) return;

        const activeParts = this.parts
            .filter((part) => part.status === "uploading" && part.upload)
            .sort((a, b) => b.index - a.index)
            .slice(0, overflow - 1);

        await Promise.allSettled(activeParts.map(async (part) => {
            part.pauseRequested = true;
            part.status = "paused";
            await part.upload?.abort(false);
            part.upload = undefined;
        }));
        this.saveManifest();
        this.schedule();
    }

    private recalculateMaxConcurrency() {
        const dynamicMax = Math.max(
            this.options.minConcurrency,
            Math.min(this.options.maxConcurrency, this.options.globalConcurrencyBudget(), this.parts.length),
        );
        this.maxConcurrency = dynamicMax;
        if (this.targetConcurrency > this.maxConcurrency) {
            this.targetConcurrency = this.maxConcurrency;
        }
    }

    private activePartCount() {
        return this.parts.filter((part) => part.status === "uploading").length;
    }

    private nextUploadablePart() {
        return this.parts.find((part) => part.status === "pending" || part.status === "paused");
    }

    private allPartsComplete() {
        return this.parts.length > 0 && this.parts.every((part) => part.status === "complete");
    }

    private acceptedBytesTotal() {
        return this.parts.reduce((sum, part) => sum + Math.min(part.acceptedBytes, part.size), 0);
    }

    private progressBytesTotal() {
        return this.parts.reduce((sum, part) => {
            const progressBytes = Math.max(part.acceptedBytes, part.progressBytes);
            return sum + Math.min(progressBytes, part.size);
        }, 0);
    }

    private isStalled(now: number) {
        return this.activePartCount() > 0 && now - this.lastAcceptedAt >= AUTO_STALL_AFTER_MS;
    }

    private emitProgress(forcedUploaded?: number) {
        this.options.onProgress(
            forcedUploaded ?? Math.min(this.progressBytesTotal(), this.options.file.size),
            this.options.file.size,
        );
    }

    private emitTelemetry() {
        this.options.onTelemetry({
            activeChunks: this.activePartCount(),
            targetChunks: this.targetConcurrency,
            maxChunks: this.maxConcurrency,
            uploadSpeedBps: this.rollingSpeedBps,
            acceptedBytes: this.acceptedBytesTotal(),
            retryCount: this.totalRetryCount,
            stalled: this.isStalled(Date.now()),
            lastDecision: this.lastDecision,
            lastDecisionReason: this.lastDecisionReason || undefined,
        });
    }

    private markDecision(decision: "increase" | "decrease" | "hold", reason: string) {
        this.lastDecision = decision;
        this.lastDecisionReason = reason;
        if (decision !== "hold") {
            this.acceptedBytesAtLastDecision = this.acceptedBytesTotal();
            this.lastDecisionAt = Date.now();
        }
    }

    private startEvaluationTimer() {
        this.stopEvaluationTimer();
        this.lastEvaluationAt = Date.now();
        this.acceptedBytesAtLastEvaluation = this.acceptedBytesTotal();
        this.lastAcceptedAt = Date.now();
        this.evaluationTimer = setInterval(() => {
            this.evaluate();
        }, AUTO_EVAL_INTERVAL_MS);
    }

    private stopEvaluationTimer() {
        if (this.evaluationTimer) {
            clearInterval(this.evaluationTimer);
            this.evaluationTimer = null;
        }
    }

    private fail(error: unknown) {
        this.stopEvaluationTimer();
        this.rejectStart?.(error);
    }

    private saveManifest() {
        if (!this.manifest) return;

        this.manifest.updatedAt = new Date().toISOString();
        this.manifest.parts = this.parts.map((part) => ({
            index: part.index,
            start: part.start,
            end: part.end,
            uploadUrl: part.uploadUrl,
            complete: part.status === "complete",
        }));
        writeManifest(this.manifestKey, this.manifest);
    }

    private removeManifest() {
        removeManifest(this.manifestKey);
    }

    private async terminateKnownUploads() {
        const urls = [
            this.finalUploadUrl,
            ...this.parts.map((part) => part.uploadUrl),
        ].filter((url): url is string => Boolean(url));

        await Promise.allSettled(urls.map((url) => fetch(url, {
            method: "DELETE",
            headers: tusHeaders(this.options.headers),
        })));
    }
}

const readNetworkHints = (): NetworkHints => {
    if (typeof navigator === "undefined") return {};
    const connection = (navigator as any).connection;
    if (!connection) return {};
    return {
        saveData: Boolean(connection.saveData),
        effectiveType: typeof connection.effectiveType === "string" ? connection.effectiveType : undefined,
    };
};

const isConstrainedNetwork = (networkInfo: NetworkHints) =>
    Boolean(networkInfo.saveData) ||
    networkInfo.effectiveType === "slow-2g" ||
    networkInfo.effectiveType === "2g" ||
    networkInfo.effectiveType === "3g";

const manifestKeyForFile = (file: File, endpoint: string) => {
    const raw = JSON.stringify([
        file.name,
        file.size,
        file.type,
        file.lastModified,
        endpoint,
    ]);
    return `${MANIFEST_PREFIX}${stableHash(raw)}`;
};

const stableHash = (value: string) => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
};

const readManifest = (key: string): AdaptiveUploadManifest | null => {
    if (typeof localStorage === "undefined") return null;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as AdaptiveUploadManifest;
        return parsed?.version === MANIFEST_VERSION ? parsed : null;
    } catch {
        return null;
    }
};

const writeManifest = (key: string, manifest: AdaptiveUploadManifest) => {
    if (typeof localStorage === "undefined") return;
    try {
        localStorage.setItem(key, JSON.stringify(manifest));
    } catch {
        // Resumability is best effort; upload progress remains authoritative on the server.
    }
};

const removeManifest = (key: string) => {
    if (typeof localStorage === "undefined" || !key) return;
    try {
        localStorage.removeItem(key);
    } catch {
        // Ignore storage cleanup failures.
    }
};

const tusHeaders = (headers: Record<string, string>) => ({
    ...headers,
    "Tus-Resumable": "1.0.0",
});

const encodeTusMetadata = (metadata: Record<string, string>) =>
    Object.entries(metadata)
        .map(([key, value]) => `${key} ${base64EncodeUtf8(String(value))}`)
        .join(",");

const base64EncodeUtf8 = (value: string) => {
    if (typeof TextEncoder !== "undefined" && typeof btoa !== "undefined") {
        const bytes = new TextEncoder().encode(value);
        let binary = "";
        for (const byte of bytes) {
            binary += String.fromCharCode(byte);
        }
        return btoa(binary);
    }
    return btoa(unescape(encodeURIComponent(value)));
};

const resolveUploadUrl = (endpoint: string, uploadUrl: string) => {
    if (typeof window === "undefined") return uploadUrl;
    const endpointUrl = new URL(endpoint, window.location.origin);
    return new URL(uploadUrl, endpointUrl).toString();
};

const cryptoRandomUUID = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
        const random = Math.floor(Math.random() * 16);
        const value = char === "x" ? random : (random & 0x3) | 0x8;
        return value.toString(16);
    });
};

const httpError = (status: number, body: string) => {
    const error = new Error(body) as Error & { status: number; data: string };
    error.status = status;
    error.data = body;
    return error;
};
