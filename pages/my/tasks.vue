<template>
    <div class="flex grow flex-col">
        <PageHeader title="Background jobs" description="Inspect durable work, retries, queue capacity, and scheduled maintenance.">
            <button class="btn btn-ghost btn-sm gap-2" :disabled="loading" @click="refreshAll">
                <Icon name="lucide:refresh-cw" class="h-4 w-4" :class="{ 'animate-spin': loading }" />
                Refresh
            </button>
        </PageHeader>

        <div v-if="accountData && !accountData.Admin" role="alert" class="alert alert-error">
            <Icon name="lucide:shield-alert" class="h-5 w-5" />
            <span>You do not have access to background operations.</span>
        </div>

        <template v-else>
            <div v-if="error" role="alert" class="alert alert-error mb-4">
                <Icon name="lucide:circle-alert" class="h-5 w-5 shrink-0" />
                <span>{{ error }}</span>
                <button class="btn btn-square btn-ghost btn-sm ml-auto" aria-label="Dismiss error" @click="error = ''"><Icon name="lucide:x" class="h-4 w-4" /></button>
            </div>

            <section class="mb-5 flex flex-wrap divide-x divide-base-300 rounded-box border border-base-300 bg-base-100" aria-label="Job summary">
                <div v-for="item in summaryItems" :key="item.label" class="min-w-32 flex-1 px-4 py-3">
                    <p class="text-xs text-base-content/60">{{ item.label }}</p>
                    <p class="mt-0.5 text-xl font-semibold tabular-nums">{{ item.value }}</p>
                </div>
            </section>

            <div role="tablist" class="tabs tabs-border mb-4">
                <button role="tab" class="tab gap-2" :class="{ 'tab-active': activeView === 'jobs' }" @click="activeView = 'jobs'">
                    <Icon name="lucide:list-checks" class="h-4 w-4" /> Jobs
                </button>
                <button role="tab" class="tab gap-2" :class="{ 'tab-active': activeView === 'runtime' }" @click="activeView = 'runtime'">
                    <Icon name="lucide:gauge" class="h-4 w-4" /> Queues & schedules
                </button>
            </div>

            <template v-if="activeView === 'jobs'">
                <div class="mb-3 flex flex-wrap items-end gap-2 rounded-box border border-base-300 bg-base-100 p-3">
                    <label class="form-control min-w-52 flex-1">
                        <span class="label-text mb-1 text-xs text-base-content/70">Search</span>
                        <input v-model="filters.search" class="input input-sm input-bordered w-full" placeholder="Job, subject, or ID" @keyup.enter="loadJobs(true)" />
                    </label>
                    <label class="form-control min-w-40">
                        <span class="label-text mb-1 text-xs text-base-content/70">Status</span>
                        <select v-model="filters.status" class="select select-sm select-bordered" @change="loadJobs(true)">
                            <option value="">All statuses</option>
                            <option v-for="status in statuses" :key="status" :value="status">{{ statusLabel(status) }}</option>
                        </select>
                    </label>
                    <label class="form-control min-w-40">
                        <span class="label-text mb-1 text-xs text-base-content/70">Queue</span>
                        <select v-model="filters.queue" class="select select-sm select-bordered" @change="loadJobs(true)">
                            <option value="">All queues</option>
                            <option v-for="queue in queues" :key="queue.name" :value="queue.name">{{ queue.name }}</option>
                        </select>
                    </label>
                    <label class="label cursor-pointer gap-2 px-2 py-2">
                        <input v-model="filters.includeSystem" type="checkbox" class="checkbox checkbox-sm" @change="loadJobs(true)" />
                        <span class="label-text text-sm">Show successful system jobs</span>
                    </label>
                    <button class="btn btn-primary btn-sm" @click="loadJobs(true)">Apply</button>
                </div>

                <div class="grid min-w-0 gap-4" :class="selected ? 'lg:grid-cols-[minmax(0,1fr)_24rem]' : ''">
                    <section class="min-w-0 overflow-x-auto rounded-box border border-base-300 bg-base-100">
                        <table class="table table-sm">
                            <thead>
                                <tr class="border-base-300 text-xs text-base-content/70">
                                    <th class="font-medium">Job</th>
                                    <th class="font-medium">Owner</th>
                                    <th class="font-medium">Status</th>
                                    <th class="font-medium">Phase</th>
                                    <th class="font-medium">Progress</th>
                                    <th class="font-medium">Age / duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                <template v-if="loading && jobs.length === 0">
                                    <tr v-for="row in 6" :key="row"><td colspan="6"><div class="skeleton h-8 w-full rounded-selector" /></td></tr>
                                </template>
                                <tr v-else-if="jobs.length === 0">
                                    <td colspan="6">
                                        <div class="flex flex-col items-center gap-1 py-14 text-center">
                                            <Icon name="lucide:inbox" class="h-6 w-6 text-base-content/30" />
                                            <p class="text-sm font-medium">No matching jobs</p>
                                            <p class="text-sm text-base-content/60">Change the filters or wait for new work.</p>
                                        </div>
                                    </td>
                                </tr>
                                <tr v-for="job in jobs" :key="job.id" class="cursor-pointer border-base-300 hover:bg-base-200/60" :class="{ 'bg-primary/5': selected?.id === job.id }" @click="selectJob(job.id)">
                                    <td>
                                        <p class="max-w-64 truncate font-medium" :title="job.label">{{ job.label }}</p>
                                        <p class="font-mono text-[11px] text-base-content/50">{{ kindLabel(job.kind) }} · {{ job.id.slice(0, 8) }}</p>
                                    </td>
                                    <td class="text-sm">{{ job.ownerName || (job.visibility === 'system' ? 'System' : `User ${job.ownerId || '—'}`) }}</td>
                                    <td><span class="badge badge-sm" :class="statusClass(job.status)">{{ statusLabel(job.status) }}</span></td>
                                    <td class="max-w-48 truncate text-sm text-base-content/70">{{ job.phase || 'Waiting' }}</td>
                                    <td>
                                        <div class="flex items-center gap-2">
                                            <progress class="progress progress-primary h-1.5 w-20" :value="backgroundProgressPercent(job.progress)" max="100" />
                                            <span class="w-9 text-right text-xs tabular-nums">{{ Math.round(backgroundProgressPercent(job.progress)) }}%</span>
                                        </div>
                                    </td>
                                    <td class="whitespace-nowrap text-xs tabular-nums text-base-content/60">{{ jobDuration(job) }}</td>
                                </tr>
                            </tbody>
                        </table>
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
                                    <span class="badge badge-sm" :class="statusClass(selected.status)">{{ statusLabel(selected.status) }}</span>
                                </div>
                                <p class="mt-1 break-all font-mono text-[11px] text-base-content/50">{{ selected.id }}</p>
                            </div>
                            <button class="btn btn-square btn-ghost btn-sm" aria-label="Close details" @click="closeSelected"><Icon name="lucide:x" class="h-4 w-4" /></button>
                        </div>

                        <div class="flex flex-col gap-5 p-4">
                            <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                                <dt class="text-base-content/60">Owner</dt><dd>{{ selected.ownerName || (selected.visibility === 'system' ? 'System' : `User ${selected.ownerId || '—'}`) }}</dd>
                                <dt class="text-base-content/60">Operation</dt><dd>{{ kindLabel(selected.kind) }}</dd>
                                <dt class="text-base-content/60">Created</dt><dd>{{ formatDate(selected.createdAt) }}</dd>
                                <dt class="text-base-content/60">Result</dt><dd class="break-all">{{ selected.resultId || '—' }}</dd>
                            </dl>

                            <div v-if="selected.errorMessage" role="alert" class="rounded-field bg-error/10 p-3 text-sm text-error">
                                <p class="font-medium">{{ selected.errorCode || 'Job failed' }}</p>
                                <p class="mt-1 text-error/90">{{ selected.errorMessage }}</p>
                            </div>

                            <div class="flex flex-wrap gap-2">
                                <button v-if="isBackgroundJobActive(selected.status)" class="btn btn-error btn-sm" :disabled="acting" @click="jobAction('cancel')"><Icon name="lucide:square" class="h-4 w-4" /> Cancel job</button>
                                <button v-if="['failed', 'canceled', 'succeeded_with_warnings'].includes(selected.status)" class="btn btn-primary btn-sm" :disabled="acting" @click="jobAction('retry')"><Icon name="lucide:rotate-ccw" class="h-4 w-4" /> Retry job</button>
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
                                                    <span class="text-[11px] text-base-content/50">{{ task.queue }} · {{ task.attemptCount }}/{{ task.maxAttempts }}</span>
                                                </div>
                                                <p v-if="task.progressMessage" class="mt-1 text-xs text-base-content/60">{{ task.progressMessage }}</p>
                                                <progress class="progress progress-primary mt-2 h-1 w-full" :value="backgroundProgressPercent(task.progress)" max="100" />
                                                <p v-if="task.errorMessage" class="mt-2 text-xs text-error">{{ task.errorMessage }}</p>
                                                <div class="mt-2 flex gap-1">
                                                    <button v-if="['running', 'queued', 'retry_wait', 'cancel_requested'].includes(task.status)" class="btn btn-ghost btn-xs" :disabled="acting" @click.stop="taskAction(task.id, 'cancel')">Cancel</button>
                                                    <button v-if="['failed', 'canceled'].includes(task.status)" class="btn btn-ghost btn-xs" :disabled="acting" @click.stop="taskAction(task.id, 'retry')">Retry</button>
                                                </div>
                                                <details v-if="task.attempts?.length" class="mt-2 text-xs">
                                                    <summary class="cursor-pointer text-base-content/60">{{ task.attempts.length }} attempt{{ task.attempts.length === 1 ? '' : 's' }}</summary>
                                                    <div class="mt-2 flex flex-col gap-2 border-t border-base-300 pt-2">
                                                        <div v-for="attempt in task.attempts" :key="attempt.id">
                                                            <div class="flex justify-between gap-2"><span>Attempt {{ attempt.number }} · {{ attempt.status }}</span><span class="text-base-content/50">{{ durationBetween(attempt.startedAt, attempt.finishedAt) }}</span></div>
                                                            <pre v-if="attempt.diagnostics" class="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-field bg-base-200 p-2 font-mono text-[11px]">{{ attempt.diagnostics }}</pre>
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
                                        <p class="text-base-content/50">{{ formatDate(event.createdAt) }}<template v-if="event.actorName"> · {{ event.actorName }}</template></p>
                                    </li>
                                </ol>
                            </section>
                        </div>
                    </aside>
                </div>
            </template>

            <template v-else>
                <section class="mb-5 overflow-x-auto rounded-box border border-base-300 bg-base-100">
                    <div class="border-b border-base-300 px-4 py-3"><h2 class="text-sm font-semibold">Queues</h2></div>
                    <table class="table table-sm">
                        <thead><tr class="text-xs text-base-content/70"><th>Queue</th><th>Capacity</th><th>Waiting</th><th>Oldest wait</th><th>Status</th><th></th></tr></thead>
                        <tbody>
                            <tr v-for="queue in queues" :key="queue.name" class="border-base-300">
                                <td class="font-medium">{{ queue.name }}</td>
                                <td class="tabular-nums">{{ queue.active }} / {{ queue.capacity }}</td>
                                <td class="tabular-nums">{{ queue.waiting }}</td>
                                <td class="text-sm text-base-content/60">{{ queue.oldestAt ? relativeTime(queue.oldestAt) : '—' }}</td>
                                <td><span class="badge badge-sm" :class="queue.paused ? 'badge-warning' : 'badge-success'">{{ queue.paused ? 'Paused' : 'Accepting work' }}</span></td>
                                <td class="text-right"><button class="btn btn-ghost btn-xs" :disabled="acting" @click="toggleQueue(queue)">{{ queue.paused ? 'Resume' : 'Pause' }}</button></td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                <section class="mb-5 overflow-x-auto rounded-box border border-base-300 bg-base-100">
                    <div class="border-b border-base-300 px-4 py-3"><h2 class="text-sm font-semibold">Schedules</h2></div>
                    <table class="table table-sm">
                        <thead><tr class="text-xs text-base-content/70"><th>Schedule</th><th>Queue</th><th>Last run</th><th>Next run</th><th>Result</th><th></th></tr></thead>
                        <tbody>
                            <tr v-for="schedule in schedules" :key="schedule.key" class="border-base-300">
                                <td class="font-medium">{{ kindLabel(schedule.key) }}</td><td>{{ schedule.queue }}</td>
                                <td class="text-sm text-base-content/60">{{ schedule.lastRunAt ? formatDate(schedule.lastRunAt) : 'Never' }}</td>
                                <td class="text-sm text-base-content/60">{{ schedule.nextRunAt ? relativeTime(schedule.nextRunAt) : '—' }}</td>
                                <td><span class="badge badge-sm" :class="schedule.lastStatus ? statusClass(schedule.lastStatus) : 'badge-ghost'">{{ schedule.lastStatus ? statusLabel(schedule.lastStatus) : 'Not run' }}</span></td>
                                <td class="text-right"><button class="btn btn-ghost btn-xs" :disabled="acting" @click="runSchedule(schedule)">Run now</button></td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                <section class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
                    <div class="border-b border-base-300 px-4 py-3"><h2 class="text-sm font-semibold">Supervised services</h2></div>
                    <table class="table table-sm">
                        <thead><tr class="text-xs text-base-content/70"><th>Service</th><th>Status</th><th>Restarts</th><th>Last start</th><th>Last error</th></tr></thead>
                        <tbody>
                            <tr v-if="services.length === 0"><td colspan="5" class="py-8 text-center text-sm text-base-content/60">No supervised services have reported yet.</td></tr>
                            <tr v-for="service in services" :key="service.name" class="border-base-300">
                                <td class="font-medium">{{ kindLabel(service.name) }}</td>
                                <td><span class="badge badge-sm" :class="service.status === 'running' ? 'badge-success' : service.status === 'degraded' ? 'badge-warning' : 'badge-ghost'">{{ service.status }}</span></td>
                                <td>{{ service.restarts }}</td><td>{{ service.lastStartAt ? formatDate(service.lastStartAt) : '—' }}</td>
                                <td class="max-w-md truncate text-xs text-error" :title="service.lastError">{{ service.lastError || '—' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </section>
            </template>
        </template>
    </div>
</template>

<script lang="ts" setup>
import {
    backgroundJobAction, backgroundProgressPercent, backgroundTaskAction, getAdminBackgroundJob,
    getAdminBackgroundSummary, getBackgroundRuntime, isBackgroundJobActive, listAdminBackgroundJobs,
    runBackgroundSchedule, setBackgroundQueuePaused, type BackgroundJob, type BackgroundJobStatus,
    type BackgroundQueue, type BackgroundSchedule, type BackgroundSummary, type SupervisedService,
} from "@/composables/backgroundJobs";

definePageMeta({ layout: "panel", middleware: "auth" });

const { data: accountData } = useAccountData();
const route = useRoute();
const router = useRouter();
const jobs = ref<BackgroundJob[]>([]);
const selected = ref<BackgroundJob | null>(null);
const summary = ref<BackgroundSummary>({ running: 0, waiting: 0, failed24h: 0, pausedQueues: 0 });
const queues = ref<BackgroundQueue[]>([]);
const schedules = ref<BackgroundSchedule[]>([]);
const services = ref<SupervisedService[]>([]);
const activeView = ref<"jobs" | "runtime">("jobs");
const filters = reactive({ search: "", status: "", queue: "", includeSystem: false });
const loading = ref(false);
const acting = ref(false);
const error = ref("");
const nextCursor = ref("");
const loadingMore = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

const statuses: BackgroundJobStatus[] = ["queued", "running", "retry_wait", "cancel_requested", "failed", "canceled", "succeeded_with_warnings", "succeeded"];
const summaryItems = computed(() => [
    { label: "Running", value: summary.value.running }, { label: "Waiting or retrying", value: summary.value.waiting },
    { label: "Failed in 24 hours", value: summary.value.failed24h }, { label: "Paused queues", value: summary.value.pausedQueues },
]);

const loadJobs = async (reset = false) => {
    const response = await listAdminBackgroundJobs({ search: filters.search || undefined, status: filters.status || undefined, queue: filters.queue || undefined, includeSystem: filters.includeSystem, limit: 100 });
    if (reset || jobs.value.length <= response.jobs.length) {
        jobs.value = response.jobs;
        nextCursor.value = response.nextCursor || "";
        return;
    }
    const recent = new Set(response.jobs.map((job) => job.id));
    jobs.value = [...response.jobs, ...jobs.value.filter((job) => !recent.has(job.id))];
};
const loadMoreJobs = async () => {
    if (!nextCursor.value || loadingMore.value) return;
    loadingMore.value = true;
    try {
        const response = await listAdminBackgroundJobs({ search: filters.search || undefined, status: filters.status || undefined, queue: filters.queue || undefined, includeSystem: filters.includeSystem, limit: 100, cursor: nextCursor.value });
        const known = new Set(jobs.value.map((job) => job.id));
        jobs.value.push(...response.jobs.filter((job) => !known.has(job.id)));
        nextCursor.value = response.nextCursor || "";
    } catch (cause: any) { error.value = cause?.data?.error || cause?.message || "Could not load older jobs"; }
    finally { loadingMore.value = false; }
};
const loadSelected = async () => {
    const id = String(route.query.job || "");
    selected.value = id ? await getAdminBackgroundJob(id) : null;
};
const refreshAll = async () => {
    if (!accountData.value?.Admin || loading.value) return;
    loading.value = true;
    try {
        const [nextSummary, runtime] = await Promise.all([getAdminBackgroundSummary(), getBackgroundRuntime()]);
        summary.value = nextSummary; queues.value = runtime.queues; schedules.value = runtime.schedules; services.value = runtime.services;
        await Promise.all([loadJobs(), loadSelected()]); error.value = "";
    } catch (cause: any) { error.value = cause?.data?.error || cause?.message || "Could not load background operations"; }
    finally { loading.value = false; schedulePoll(); }
};
const schedulePoll = () => {
    if (timer) clearTimeout(timer);
    if (!import.meta.client) return;
    if (document.hidden) return;
    const active = jobs.value.some((job) => isBackgroundJobActive(job.status));
    timer = setTimeout(refreshAll, active ? 2000 : 10000);
};
const selectJob = (id: string) => router.replace({ query: { ...route.query, job: id } });
const closeSelected = () => { const query = { ...route.query }; delete query.job; router.replace({ query }); };
const jobAction = async (action: "cancel" | "retry") => {
    if (!selected.value) return;
    if (action === "cancel" && !confirm(`Cancel “${selected.value.label}”? Running work will be interrupted.`)) return;
    acting.value = true;
    try { await backgroundJobAction(selected.value.id, action, true); await refreshAll(); }
    catch (cause: any) { error.value = cause?.data?.error || cause?.message || `Could not ${action} job`; }
    finally { acting.value = false; }
};
const taskAction = async (id: string, action: "cancel" | "retry") => {
    if (action === "cancel" && !confirm("Cancel this task?")) return;
    acting.value = true;
    try { await backgroundTaskAction(id, action); await refreshAll(); }
    catch (cause: any) { error.value = cause?.data?.error || cause?.message || `Could not ${action} task`; }
    finally { acting.value = false; }
};
const toggleQueue = async (queue: BackgroundQueue) => {
    if (!confirm(`${queue.paused ? 'Resume' : 'Pause'} the ${queue.name} queue? Active tasks are not interrupted.`)) return;
    acting.value = true;
    try { await setBackgroundQueuePaused(queue.name, !queue.paused); await refreshAll(); }
    catch (cause: any) { error.value = cause?.data?.error || cause?.message || "Could not update queue"; }
    finally { acting.value = false; }
};
const runSchedule = async (schedule: BackgroundSchedule) => {
    if (!confirm(`Run ${kindLabel(schedule.key)} now?`)) return;
    acting.value = true;
    try { const accepted = await runBackgroundSchedule(schedule.key); activeView.value = "jobs"; await selectJob(accepted.job.id); await refreshAll(); }
    catch (cause: any) { error.value = cause?.data?.error || cause?.message || "Could not run schedule"; }
    finally { acting.value = false; }
};

const statusLabel = (status: string) => status.replaceAll("_", " ");
const kindLabel = (kind: string) => kind.replaceAll(/[._-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const statusClass = (status: string) => ({ running: "badge-info", queued: "badge-ghost", retry_wait: "badge-warning", cancel_requested: "badge-warning", succeeded: "badge-success", succeeded_with_warnings: "badge-warning", failed: "badge-error", canceled: "badge-ghost" } as Record<string, string>)[status] || "badge-ghost";
const taskIcon = (status: string) => status === "succeeded" ? "lucide:circle-check" : status === "failed" ? "lucide:circle-x" : status === "running" ? "lucide:loader-circle" : status === "retry_wait" ? "lucide:clock-3" : status === "canceled" ? "lucide:ban" : "lucide:circle-dashed";
const taskIconClass = (status: string) => status === "succeeded" ? "text-success" : status === "failed" ? "text-error" : status === "running" ? "animate-spin text-info" : status === "retry_wait" ? "text-warning" : "text-base-content/40";
const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const relativeTime = (value: string) => { const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000); const abs = Math.abs(seconds); const unit: Intl.RelativeTimeFormatUnit = abs >= 86400 ? "day" : abs >= 3600 ? "hour" : abs >= 60 ? "minute" : "second"; const divisor = unit === "day" ? 86400 : unit === "hour" ? 3600 : unit === "minute" ? 60 : 1; return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(Math.round(seconds / divisor), unit); };
const durationBetween = (start?: string, end?: string) => { if (!start) return "—"; const seconds = Math.max(0, Math.round(((end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime()) / 1000)); if (seconds < 60) return `${seconds}s`; if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`; return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`; };
const jobDuration = (job: BackgroundJob) => job.startedAt ? durationBetween(job.startedAt, job.finishedAt) : relativeTime(job.createdAt);
const onVisibility = () => { if (!document.hidden) refreshAll(); else if (timer) clearTimeout(timer); };

watch(() => route.query.job, () => loadSelected().catch((cause: any) => { error.value = cause?.message || "Could not load job"; }));
watch(accountData, (account) => { if (account && !account.Admin) navigateTo("/my"); else if (account?.Admin) refreshAll(); }, { immediate: true });
onMounted(() => document.addEventListener("visibilitychange", onVisibility));
onUnmounted(() => { document.removeEventListener("visibilitychange", onVisibility); if (timer) clearTimeout(timer); });
</script>
