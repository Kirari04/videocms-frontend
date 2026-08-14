import { useRuntimeConfig } from "#imports";
import { useToken } from "@/composables/states";

export type BackgroundJobStatus =
    | "queued"
    | "running"
    | "retry_wait"
    | "cancel_requested"
    | "succeeded"
    | "succeeded_with_warnings"
    | "failed"
    | "canceled";

export type BackgroundTaskStatus = "queued" | "running" | "retry_wait" | "cancel_requested" | "succeeded" | "failed" | "canceled";

export interface BackgroundAttempt {
    id: string;
    number: number;
    status: string;
    worker?: string;
    errorCode?: string;
    errorMessage?: string;
    diagnostics?: string;
    startedAt: string;
    finishedAt?: string;
}

export interface BackgroundTask {
    id: string;
    jobId: string;
    parentTaskId?: string;
    kind: string;
    queue: string;
    status: BackgroundTaskStatus;
    phase: string;
    priority: number;
    required: boolean;
    progress: number;
    progressMessage?: string;
    attemptCount: number;
    maxAttempts: number;
    runAfter?: string;
    cancelRequestedAt?: string;
    commitStartedAt?: string;
    errorCode?: string;
    errorMessage?: string;
    createdAt: string;
    startedAt?: string;
    finishedAt?: string;
    attempts?: BackgroundAttempt[];
}

export interface BackgroundEvent {
    id: number;
    taskId?: string;
    type: string;
    actorName?: string;
    message: string;
    createdAt: string;
}

export interface BackgroundJob {
    id: string;
    kind: string;
    status: BackgroundJobStatus;
    visibility: string;
    ownerId?: number;
    ownerName?: string;
    subjectType?: string;
    subjectId?: string;
    label: string;
    phase?: string;
    progress: number;
    resultType?: string;
    resultId?: string;
    errorCode?: string;
    errorMessage?: string;
    cancelRequestedAt?: string;
    canCancel: boolean;
    createdAt: string;
    startedAt?: string;
    finishedAt?: string;
    tasks?: BackgroundTask[];
    events?: BackgroundEvent[];
}

export interface BackgroundJobAccepted {
    job: BackgroundJob;
    retryAfterSeconds: number;
}

export interface BackgroundSummary {
    running: number;
    waiting: number;
    failed24h: number;
    pausedQueues: number;
}

export interface BackgroundQueue {
    name: string;
    paused: boolean;
    pausedBy?: number;
    pausedAt?: string;
    capacity: number;
    active: number;
    waiting: number;
    oldestAt?: string;
}

export interface BackgroundSchedule {
    key: string;
    kind: string;
    queue: string;
    enabled: boolean;
    lastJobId?: string;
    lastStatus?: string;
    lastError?: string;
    lastRunAt?: string;
    lastSuccessAt?: string;
    nextRunAt?: string;
}

export interface SupervisedService {
    name: string;
    status: string;
    restarts: number;
    lastStartAt?: string;
    lastError?: string;
}

export interface BackgroundRuntimeStatus {
    status: string;
    queues: BackgroundQueue[];
    schedules: BackgroundSchedule[];
    services: SupervisedService[];
    checkedAt: string;
}

const api = () => `${useRuntimeConfig().public.apiUrl}/v2`;
const headers = () => ({ Authorization: `Bearer ${useToken().value}` });

export const listMyBackgroundJobs = (query: Record<string, string | number | boolean | undefined> = {}) =>
    $fetch<{ jobs: BackgroundJob[]; nextCursor?: string }>(`${api()}/jobs`, { headers: headers(), query });

export const getMyBackgroundJob = (id: string) =>
    $fetch<BackgroundJob>(`${api()}/jobs/${encodeURIComponent(id)}`, { headers: headers() });

export const listAdminBackgroundJobs = (query: Record<string, string | number | boolean | undefined> = {}) =>
    $fetch<{ jobs: BackgroundJob[]; nextCursor?: string }>(`${api()}/admin/jobs`, { headers: headers(), query });

export const getAdminBackgroundJob = (id: string) =>
    $fetch<BackgroundJob>(`${api()}/admin/jobs/${encodeURIComponent(id)}`, { headers: headers() });

export const getAdminBackgroundSummary = () =>
    $fetch<BackgroundSummary>(`${api()}/admin/jobs/summary`, { headers: headers() });

export const backgroundJobAction = (id: string, action: "cancel" | "retry", admin = false) =>
    $fetch(`${api()}${admin ? "/admin" : ""}/jobs/${encodeURIComponent(id)}/${action}`, { method: "POST", headers: headers() });

export const backgroundTaskAction = (id: string, action: "cancel" | "retry") =>
    $fetch(`${api()}/admin/tasks/${encodeURIComponent(id)}/${action}`, { method: "POST", headers: headers() });

export const getBackgroundQueues = () =>
    $fetch<BackgroundQueue[]>(`${api()}/admin/task-queues`, { headers: headers() });

export const setBackgroundQueuePaused = (name: string, paused: boolean) =>
    $fetch(`${api()}/admin/task-queues/${encodeURIComponent(name)}/${paused ? "pause" : "resume"}`, { method: "POST", headers: headers() });

export const getBackgroundSchedules = () =>
    $fetch<BackgroundSchedule[]>(`${api()}/admin/task-schedules`, { headers: headers() });

export const runBackgroundSchedule = (key: string) =>
    $fetch<BackgroundJobAccepted>(`${api()}/admin/task-schedules/${encodeURIComponent(key)}/run`, { method: "POST", headers: headers() });

export const getBackgroundRuntime = () =>
    $fetch<BackgroundRuntimeStatus>(`${api()}/admin/task-runtime`, { headers: headers() });

export const waitForBackgroundJob = async (id: string, timeoutMs = 30 * 60 * 1000): Promise<BackgroundJob> => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        const job = await getMyBackgroundJob(id);
        if (["succeeded", "succeeded_with_warnings"].includes(job.status)) return job;
        if (["failed", "canceled"].includes(job.status)) throw new Error(job.errorMessage || `Background job ${job.status}`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error("Background job timed out");
};

// Upload queue capacity is released as soon as ingestion produces the video
// link. Optional thumbnail and encoding work remains visible in My jobs.
export const waitForBackgroundJobResult = async (id: string, timeoutMs = 30 * 60 * 1000): Promise<BackgroundJob> => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        const job = await getMyBackgroundJob(id);
        if (job.resultId) return job;
        if (["failed", "canceled"].includes(job.status)) throw new Error(job.errorMessage || `Background job ${job.status}`);
        if (["succeeded", "succeeded_with_warnings"].includes(job.status)) throw new Error("The import completed without a video link");
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error("Background import timed out");
};

export const backgroundProgressPercent = (progress: number) => Math.max(0, Math.min(100, progress / 100));

export const isBackgroundJobActive = (status: BackgroundJobStatus) =>
    ["queued", "running", "retry_wait", "cancel_requested"].includes(status);

export const backgroundStatusLabel = (status: string) => ({
    queued: "Queued",
    running: "Running",
    retry_wait: "Retry scheduled",
    cancel_requested: "Canceling",
    succeeded: "Completed",
    succeeded_with_warnings: "Completed with warnings",
    failed: "Failed",
    canceled: "Canceled",
} as Record<string, string>)[status] || status.replaceAll("_", " ");
