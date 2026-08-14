<template>
    <div class="flex grow flex-col">
        <PageHeader title="My jobs" description="Follow uploads, downloads, deletions, retries, and media processing in one place.">
            <button class="btn btn-ghost btn-sm gap-2" :disabled="loading" @click="load">
                <Icon name="lucide:refresh-cw" class="h-4 w-4" :class="{ 'animate-spin': loading }" />
                Refresh
            </button>
        </PageHeader>

        <div v-if="error" role="alert" class="alert alert-error mb-4">
            <Icon name="lucide:circle-alert" class="h-5 w-5 shrink-0" />
            <span>{{ error }}</span>
            <button class="btn btn-square btn-ghost btn-sm ml-auto" aria-label="Dismiss error" @click="error = ''">
                <Icon name="lucide:x" class="h-4 w-4" />
            </button>
        </div>

        <div class="grid min-w-0 gap-4" :class="selected ? 'lg:grid-cols-[minmax(0,1fr)_24rem]' : ''">
            <section class="min-w-0 rounded-box border border-base-300 bg-base-100" aria-label="Background jobs">
                <div v-if="loading && jobs.length === 0" class="space-y-3 p-4">
                    <div v-for="row in 5" :key="row" class="skeleton h-14 w-full rounded-selector" />
                </div>

                <div v-else-if="jobs.length === 0" class="flex flex-col items-center gap-1 px-4 py-14 text-center">
                    <Icon name="lucide:inbox" class="h-6 w-6 text-base-content/40" />
                    <p class="text-sm font-medium">No background jobs yet</p>
                    <p class="text-sm text-base-content/70">Uploads, downloads, deletions, and processing will appear here.</p>
                </div>

                <template v-else>
                    <div class="divide-y divide-base-300 md:hidden">
                        <article v-for="job in jobs" :key="job.id" class="p-4" :class="{ 'bg-primary/5': selected?.id === job.id }">
                            <button class="block w-full rounded-selector text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" :aria-current="selected?.id === job.id ? 'true' : undefined" @click="selectJob(job.id)">
                                <span class="flex items-start justify-between gap-3">
                                    <span class="min-w-0">
                                        <span class="block truncate text-sm font-medium" :title="job.label">{{ job.label }}</span>
                                        <span class="mt-0.5 block text-xs text-base-content/70">{{ job.phase || 'Waiting for a worker' }}</span>
                                    </span>
                                    <span class="badge badge-sm shrink-0" :class="statusClass(job.status)">{{ backgroundStatusLabel(job.status) }}</span>
                                </span>
                                <span class="mt-3 flex items-center gap-3">
                                    <progress class="progress progress-primary h-1.5 flex-1" :aria-label="`${job.label} progress`" :value="backgroundProgressPercent(job.progress)" max="100" />
                                    <span class="w-10 text-right text-xs tabular-nums">{{ Math.round(backgroundProgressPercent(job.progress)) }}%</span>
                                    <Icon name="lucide:chevron-right" class="h-4 w-4 text-base-content/70" />
                                </span>
                            </button>
                            <div v-if="job.canCancel || retryable(job.status) || job.status === 'cancel_requested'" class="mt-3 flex justify-end border-t border-base-300 pt-3">
                                <button v-if="job.canCancel" class="btn btn-ghost btn-sm min-h-11" :disabled="acting === job.id" @click="runAction(job, 'cancel')">Cancel</button>
                                <span v-else-if="job.status === 'cancel_requested'" class="self-center text-xs text-base-content/70">Cancellation requested</span>
                                <button v-else-if="retryable(job.status)" class="btn btn-ghost btn-sm min-h-11" :disabled="acting === job.id" @click="runAction(job, 'retry')">Retry</button>
                            </div>
                        </article>
                    </div>

                    <div class="hidden overflow-x-auto md:block">
                        <table class="table table-sm">
                            <thead>
                                <tr class="border-base-300 text-xs text-base-content/70">
                                    <th class="font-medium">Operation</th>
                                    <th class="font-medium">State</th>
                                    <th class="font-medium">Current step</th>
                                    <th class="font-medium">Progress</th>
                                    <th class="w-20"><span class="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="job in jobs" :key="job.id" class="border-base-300 hover:bg-base-200/60" :class="{ 'bg-primary/5': selected?.id === job.id }">
                                    <td>
                                        <button class="block max-w-xs rounded-selector text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" :aria-current="selected?.id === job.id ? 'true' : undefined" @click="selectJob(job.id)">
                                            <span class="block truncate font-medium" :title="job.label">{{ job.label }}</span>
                                            <span class="block font-mono text-[11px] text-base-content/70">{{ job.id.slice(0, 8) }}</span>
                                        </button>
                                    </td>
                                    <td><span class="badge badge-sm" :class="statusClass(job.status)">{{ backgroundStatusLabel(job.status) }}</span></td>
                                    <td class="max-w-xs truncate text-sm text-base-content/70">{{ job.phase || 'Waiting for a worker' }}</td>
                                    <td>
                                        <div class="flex min-w-36 items-center gap-3">
                                            <progress class="progress progress-primary h-1.5 w-24" :aria-label="`${job.label} progress`" :value="backgroundProgressPercent(job.progress)" max="100" />
                                            <span class="w-10 text-right text-xs tabular-nums">{{ Math.round(backgroundProgressPercent(job.progress)) }}%</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div class="flex justify-end gap-1">
                                            <button v-if="job.canCancel" class="btn btn-ghost btn-xs" :disabled="acting === job.id" @click="runAction(job, 'cancel')">Cancel</button>
                                            <span v-else-if="job.status === 'cancel_requested'" class="whitespace-nowrap text-xs text-base-content/70">Canceling…</span>
                                            <button v-else-if="retryable(job.status)" class="btn btn-ghost btn-xs" :disabled="acting === job.id" @click="runAction(job, 'retry')">Retry</button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </template>

                <div v-if="nextCursor" class="flex justify-center border-t border-base-300 p-3">
                    <button class="btn btn-ghost btn-sm" :disabled="loadingMore" @click="loadMoreJobs">
                        <span v-if="loadingMore" class="loading loading-spinner loading-xs" />
                        Load older jobs
                    </button>
                </div>
            </section>

            <aside v-if="selected" class="min-w-0 rounded-box border border-base-300 bg-base-100 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto" aria-label="Selected job details">
                <div class="sticky top-0 z-10 flex items-start gap-3 border-b border-base-300 bg-base-100 p-4">
                    <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-2">
                            <h2 class="truncate text-base font-semibold">{{ selected.label }}</h2>
                            <span class="badge badge-sm" :class="statusClass(selected.status)">{{ backgroundStatusLabel(selected.status) }}</span>
                        </div>
                        <p class="mt-1 break-all font-mono text-[11px] text-base-content/70">{{ selected.id }}</p>
                    </div>
                    <button class="btn btn-square btn-ghost btn-sm" aria-label="Close details" @click="closeSelected"><Icon name="lucide:x" class="h-4 w-4" /></button>
                </div>

                <div class="flex flex-col gap-5 p-4">
                    <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                        <dt class="text-base-content/70">Operation</dt><dd>{{ kindLabel(selected.kind) }}</dd>
                        <dt class="text-base-content/70">Created</dt><dd>{{ formatDate(selected.createdAt) }}</dd>
                        <dt class="text-base-content/70">Duration</dt><dd>{{ jobDuration(selected) }}</dd>
                        <dt class="text-base-content/70">Result</dt><dd class="break-all">{{ selected.resultId || '—' }}</dd>
                    </dl>

                    <div v-if="selected.errorMessage" role="alert" class="rounded-field bg-error/10 p-3 text-sm text-error">
                        <p class="font-medium">{{ selected.errorCode || 'Job failed' }}</p>
                        <p class="mt-1 text-error/90">{{ selected.errorMessage }}</p>
                    </div>

                    <div v-if="selected.status === 'cancel_requested'" class="rounded-field bg-warning/10 p-3 text-sm">
                        Cancellation was requested. Active work is stopping at the next safe point.
                    </div>
                    <div v-else-if="isBackgroundJobActive(selected.status) && !selected.canCancel" class="rounded-field bg-info/10 p-3 text-sm">
                        This job is finalizing an irreversible step and can no longer be canceled safely.
                    </div>

                    <div class="flex flex-wrap gap-2">
                        <button v-if="selected.canCancel" class="btn btn-error btn-sm min-h-11" :disabled="Boolean(acting)" @click="runAction(selected, 'cancel')"><Icon name="lucide:square" class="h-4 w-4" /> Cancel job</button>
                        <button v-if="retryable(selected.status)" class="btn btn-primary btn-sm min-h-11" :disabled="Boolean(acting)" @click="runAction(selected, 'retry')"><Icon name="lucide:rotate-ccw" class="h-4 w-4" /> Retry job</button>
                    </div>

                    <section>
                        <h3 class="mb-2 text-sm font-semibold">Tasks</h3>
                        <ol class="flex flex-col gap-2">
                            <li v-for="task in selected.tasks || []" :key="task.id" class="rounded-field border border-base-300 p-3">
                                <div class="flex items-start gap-2">
                                    <Icon :name="taskIcon(task.status)" class="mt-0.5 h-4 w-4 shrink-0" :class="taskIconClass(task.status)" />
                                    <div class="min-w-0 flex-1">
                                        <div class="flex flex-wrap items-center justify-between gap-2">
                                            <p class="truncate text-sm font-medium">{{ task.phase || kindLabel(task.kind) }}</p>
                                            <span class="text-[11px] text-base-content/70">{{ backgroundStatusLabel(task.status) }} · {{ task.attemptCount }}/{{ task.maxAttempts }}</span>
                                        </div>
                                        <p v-if="task.progressMessage" class="mt-1 text-xs text-base-content/70">{{ task.progressMessage }}</p>
                                        <progress class="progress progress-primary mt-2 h-1 w-full" :aria-label="`${task.phase || task.kind} progress`" :value="backgroundProgressPercent(task.progress)" max="100" />
                                        <p v-if="task.commitStartedAt && ['running', 'cancel_requested'].includes(task.status)" class="mt-2 text-xs text-base-content/70">Finalizing; cancellation is unavailable.</p>
                                        <p v-if="task.errorMessage" class="mt-2 text-xs text-error">{{ task.errorMessage }}</p>
                                        <details v-if="task.attempts?.length" class="mt-2 text-xs">
                                            <summary class="cursor-pointer text-base-content/70">{{ task.attempts.length }} attempt{{ task.attempts.length === 1 ? '' : 's' }}</summary>
                                            <div class="mt-2 flex flex-col gap-2 border-t border-base-300 pt-2">
                                                <div v-for="attempt in task.attempts" :key="attempt.id">
                                                    <div class="flex justify-between gap-2"><span>Attempt {{ attempt.number }} · {{ backgroundStatusLabel(attempt.status) }}</span><span class="text-base-content/70">{{ durationBetween(attempt.startedAt, attempt.finishedAt) }}</span></div>
                                                    <p v-if="attempt.errorMessage" class="mt-1 text-error">{{ attempt.errorMessage }}</p>
                                                </div>
                                            </div>
                                        </details>
                                    </div>
                                </div>
                            </li>
                        </ol>
                    </section>

                    <section v-if="selected.events?.length">
                        <h3 class="mb-2 text-sm font-semibold">Timeline</h3>
                        <ol class="flex flex-col gap-2 border-l border-base-300 pl-3 text-xs">
                            <li v-for="event in [...(selected.events || [])].reverse()" :key="event.id">
                                <p>{{ event.message }}</p>
                                <p class="text-base-content/70">{{ formatDate(event.createdAt) }}</p>
                            </li>
                        </ol>
                    </section>
                </div>
            </aside>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {
    backgroundJobAction,
    backgroundProgressPercent,
    backgroundStatusLabel,
    getMyBackgroundJob,
    isBackgroundJobActive,
    listMyBackgroundJobs,
    type BackgroundJob,
    type BackgroundJobStatus,
} from "@/composables/backgroundJobs";

definePageMeta({ layout: "panel", middleware: "auth" });

const route = useRoute();
const router = useRouter();
const jobs = ref<BackgroundJob[]>([]);
const selected = ref<BackgroundJob | null>(null);
const loading = ref(false);
const loadingMore = ref(false);
const error = ref("");
const acting = ref("");
const nextCursor = ref("");
let timer: ReturnType<typeof setTimeout> | undefined;

const query = {
    status: "queued,running,retry_wait,cancel_requested,failed,canceled,succeeded_with_warnings,succeeded",
    limit: 50,
};

const loadJobs = async (reset = false) => {
    const response = await listMyBackgroundJobs(query);
    if (reset || jobs.value.length <= response.jobs.length) {
        jobs.value = response.jobs;
        nextCursor.value = response.nextCursor || "";
        return;
    }
    const recent = new Set(response.jobs.map((job) => job.id));
    jobs.value = [...response.jobs, ...jobs.value.filter((job) => !recent.has(job.id))];
};

const loadSelected = async () => {
    const id = String(route.query.job || "");
    if (!id) {
        selected.value = null;
        return;
    }
    try {
        selected.value = await getMyBackgroundJob(id);
    } catch (cause: any) {
        if (cause?.data?.error !== "job_not_found") throw cause;
        selected.value = null;
        const nextQuery = { ...route.query };
        delete nextQuery.job;
        await router.replace({ query: nextQuery });
    }
};

const load = async () => {
    if (loading.value) return;
    loading.value = true;
    try {
        await Promise.all([loadJobs(), loadSelected()]);
        error.value = "";
    } catch (cause: any) {
        error.value = actionError(cause, "Could not load background jobs");
    } finally {
        loading.value = false;
        schedule();
    }
};

const loadMoreJobs = async () => {
    if (!nextCursor.value || loadingMore.value) return;
    loadingMore.value = true;
    try {
        const response = await listMyBackgroundJobs({ ...query, cursor: nextCursor.value });
        const known = new Set(jobs.value.map((job) => job.id));
        jobs.value.push(...response.jobs.filter((job) => !known.has(job.id)));
        nextCursor.value = response.nextCursor || "";
    } catch (cause: any) {
        error.value = actionError(cause, "Could not load older jobs");
    } finally {
        loadingMore.value = false;
    }
};

const schedule = () => {
    if (timer) clearTimeout(timer);
    if (!import.meta.client || document.hidden) return;
    const active = jobs.value.some((job) => isBackgroundJobActive(job.status));
    timer = setTimeout(load, active ? 2000 : 10000);
};

const selectJob = (id: string) => router.replace({ query: { ...route.query, job: id } });
const closeSelected = () => {
    const nextQuery = { ...route.query };
    delete nextQuery.job;
    router.replace({ query: nextQuery });
};

const runAction = async (job: BackgroundJob, action: "cancel" | "retry") => {
    if (action === "cancel" && !confirm(`Cancel “${job.label}”? Running work will stop at the next safe point.`)) return;
    acting.value = job.id;
    try {
        await backgroundJobAction(job.id, action);
        await load();
    } catch (cause: any) {
        error.value = actionError(cause, `Could not ${action} job`);
    } finally {
        acting.value = "";
    }
};

function actionError(cause: any, fallback: string) {
    const code = cause?.data?.error;
    if (code === "commit_in_progress") return "This job is finalizing an irreversible step and can no longer be canceled.";
    if (code === "invalid_job_state") return "This job changed state before the action could be applied. Its latest status is shown below.";
    return code || cause?.message || fallback;
}

const retryable = (status: BackgroundJobStatus) => ["failed", "canceled", "succeeded_with_warnings"].includes(status);
const kindLabel = (kind: string) => kind.replaceAll(/[._-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const statusClass = (status: string) => ({ running: "badge-info", queued: "badge-ghost", retry_wait: "badge-warning", cancel_requested: "badge-warning", succeeded: "badge-success", succeeded_with_warnings: "badge-warning", failed: "badge-error", canceled: "badge-ghost" } as Record<string, string>)[status] || "badge-ghost";
const taskIcon = (status: string) => status === "succeeded" ? "lucide:circle-check" : status === "failed" ? "lucide:circle-x" : status === "running" ? "lucide:loader-circle" : status === "retry_wait" ? "lucide:clock-3" : status === "canceled" ? "lucide:ban" : "lucide:circle-dashed";
const taskIconClass = (status: string) => status === "succeeded" ? "text-success" : status === "failed" ? "text-error" : status === "running" ? "animate-spin text-info" : status === "retry_wait" ? "text-warning" : "text-base-content/70";
const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const relativeTime = (value: string) => { const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000); const abs = Math.abs(seconds); const unit: Intl.RelativeTimeFormatUnit = abs >= 86400 ? "day" : abs >= 3600 ? "hour" : abs >= 60 ? "minute" : "second"; const divisor = unit === "day" ? 86400 : unit === "hour" ? 3600 : unit === "minute" ? 60 : 1; return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(Math.round(seconds / divisor), unit); };
const durationBetween = (start?: string, end?: string) => { if (!start) return "—"; const seconds = Math.max(0, Math.round(((end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime()) / 1000)); if (seconds < 60) return `${seconds}s`; if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`; return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`; };
const jobDuration = (job: BackgroundJob) => job.startedAt ? durationBetween(job.startedAt, job.finishedAt) : relativeTime(job.createdAt);
const onVisibility = () => { if (!document.hidden) load(); else if (timer) clearTimeout(timer); };

watch(() => route.query.job, () => loadSelected().catch((cause: any) => { error.value = actionError(cause, "Could not load job"); }));
onMounted(() => { document.addEventListener("visibilitychange", onVisibility); load(); });
onUnmounted(() => { document.removeEventListener("visibilitychange", onVisibility); if (timer) clearTimeout(timer); });
</script>
