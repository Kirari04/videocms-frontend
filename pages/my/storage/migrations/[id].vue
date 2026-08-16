<template>
    <div class="flex grow flex-col">
        <PageHeader :title="migration ? `${migration.SourcePoolName} → ${migration.DestinationPoolName}` : 'Storage migration'" description="Verified per-video cutover with deferred original cleanup.">
            <NuxtLink to="/my/storage/migrations" class="btn btn-ghost btn-sm gap-2"><Icon name="lucide:arrow-left" class="h-4 w-4" /> Migrations</NuxtLink>
            <NuxtLink v-if="activeJob" :to="`/my/tasks?job=${activeJob.id}`" class="btn btn-ghost btn-sm gap-2"><Icon name="lucide:list-checks" class="h-4 w-4" /> Background job</NuxtLink>
            <button class="btn btn-ghost btn-sm gap-2" :disabled="loading" @click="load"><Icon name="lucide:refresh-cw" class="h-4 w-4" :class="{ 'animate-spin': loading }" /> Refresh</button>
        </PageHeader>

        <div v-if="error" role="alert" class="alert alert-error mb-4"><Icon name="lucide:circle-alert" class="h-5 w-5 shrink-0" /><span>{{ error }}</span><button class="btn btn-square btn-ghost btn-sm ml-auto" aria-label="Dismiss error" @click="error = ''"><Icon name="lucide:x" class="h-4 w-4" /></button></div>

        <template v-if="migration">
            <section class="mb-5 flex flex-col gap-3 rounded-box bg-info/10 p-4 sm:flex-row sm:items-center" aria-label="Playback safety">
                <Icon name="lucide:shield-check" class="h-5 w-5 shrink-0 text-info" />
                <div class="min-w-0 grow text-sm">
                    <p class="font-medium">Playback stays on verified storage</p>
                    <p class="mt-0.5 text-base-content/75">A video remains on its source until the destination copy is complete and verified. Existing playback sessions can continue using retained originals.</p>
                </div>
                <span class="badge shrink-0" :class="statusClass(displayStatus)">{{ displayStatusLabel }}</span>
            </section>

            <section class="mb-5 overflow-x-auto rounded-box border border-base-300 bg-base-100 p-4" aria-label="Migration lifecycle">
                <ol class="flex min-w-[44rem] items-start">
                    <li v-for="(stage, index) in stages" :key="stage.key" class="relative flex flex-1 flex-col items-center text-center">
                        <div v-if="index > 0" class="absolute right-1/2 top-3 h-px w-full" :class="stage.reached ? 'bg-primary' : 'bg-base-300'" />
                        <span class="relative z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-base-100" :class="stage.current ? 'border-primary text-primary ring-4 ring-primary/10' : stage.reached ? 'border-primary bg-primary text-primary-content' : 'border-base-300 text-base-content/40'">
                            <Icon :name="stage.reached && !stage.current ? 'lucide:check' : stage.icon" class="h-3.5 w-3.5" />
                        </span>
                        <span class="mt-2 text-xs font-medium" :class="stage.current ? 'text-primary' : stage.reached ? 'text-base-content' : 'text-base-content/50'">{{ stage.label }}</span>
                    </li>
                </ol>
            </section>

            <section class="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div class="rounded-box border border-base-300 bg-base-100 p-4">
                    <div class="flex flex-wrap items-end justify-between gap-3">
                        <div><p class="text-sm font-medium">Migration progress</p><p class="mt-0.5 text-xs text-base-content/70">{{ migration.CutoverCount }} of {{ migration.FileCount }} videos active on the destination</p></div>
                        <p class="text-2xl font-semibold tabular-nums">{{ Math.round(overallProgress) }}%</p>
                    </div>
                    <progress class="progress progress-primary mt-3 h-2 w-full" :value="overallProgress" max="100" />
                    <dl class="mt-4 flex flex-wrap divide-x divide-base-300 rounded-field bg-base-200 text-sm">
                        <div class="min-w-36 flex-1 px-3 py-2"><dt class="text-xs text-base-content/70">Verified data</dt><dd class="mt-0.5 font-medium tabular-nums">{{ formatBytes(migration.CopiedBytes) }} / {{ formatBytes(migration.ActualBytes || migration.PlannedBytes) }}</dd></div>
                        <div class="min-w-36 flex-1 px-3 py-2"><dt class="text-xs text-base-content/70">Original cleanup</dt><dd class="mt-0.5 font-medium">{{ cleanupSummary }}</dd></div>
                    </dl>
                </div>

                <aside class="rounded-box border border-base-300 bg-base-100 p-4" aria-label="Migration actions">
                    <h2 class="text-sm font-semibold">Controls</h2>
                    <p class="mt-1 text-xs text-base-content/70">Transfers stop at safe checkpoints. During cleanup, the current video finishes before pausing.</p>
                    <div class="mt-4 flex flex-wrap gap-2">
                        <button v-if="activeJob?.canPause" class="btn btn-outline btn-sm min-h-11 flex-1" :disabled="acting" @click="jobAction('pause')"><Icon name="lucide:pause" class="h-4 w-4" /> Pause</button>
                        <button v-if="activeJob?.canResume" class="btn btn-primary btn-sm min-h-11 flex-1" :disabled="acting" @click="jobAction('resume')"><Icon name="lucide:play" class="h-4 w-4" /> Resume</button>
                        <button v-if="activeJob?.canCancel && !canKeepOriginals" class="btn btn-error btn-sm min-h-11 flex-1" :disabled="acting" @click="jobAction('cancel')"><Icon name="lucide:square" class="h-4 w-4" /> Cancel</button>
                        <button v-if="['failed', 'canceled', 'succeeded_with_warnings'].includes(activeJob?.status || '') && !canKeepOriginals" class="btn btn-primary btn-sm min-h-11 flex-1" :disabled="acting" @click="jobAction('retry')"><Icon name="lucide:rotate-ccw" class="h-4 w-4" /> Retry</button>
                        <button v-if="canCancelFailedMigration" class="btn btn-error btn-sm min-h-11 flex-1" :disabled="acting" @click="cancelFailedMigration"><Icon name="lucide:square" class="h-4 w-4" /> Cancel migration</button>
                        <button v-if="canKeepOriginals" class="btn btn-outline btn-sm min-h-11 w-full" :disabled="acting" @click="keepOriginals"><Icon name="lucide:archive-restore" class="h-4 w-4" /> Keep originals</button>
                    </div>
                    <p v-if="activeJob?.status === 'pause_requested'" class="mt-3 rounded-field bg-info/10 p-2.5 text-xs">The current transfer is checkpointing. The status changes to paused when it is safe to stop.</p>
                    <p v-else-if="activeJob?.status === 'paused'" class="mt-3 rounded-field bg-base-200 p-2.5 text-xs">Resume continues from verified destination objects.</p>
					<p v-if="activeJob?.errorMessage" class="mt-3 rounded-field bg-error/10 p-2.5 text-xs text-error">{{ activeJob.errorMessage }}</p>
                    <p v-if="canKeepOriginals" class="mt-3 text-xs text-base-content/70">This stops after the current video, then retains every remaining original. Originals already removed cannot be restored.</p>
                </aside>
            </section>

            <section class="mb-5 overflow-hidden rounded-box border border-base-300 bg-base-100" aria-labelledby="migration-videos-heading">
                <header class="flex flex-wrap items-end gap-3 border-b border-base-300 px-4 py-3">
                    <div class="mr-auto"><h2 id="migration-videos-heading" class="text-sm font-semibold">Videos</h2><p class="mt-0.5 text-xs text-base-content/70">Copy, verification, active storage, and original cleanup per physical video.</p></div>
                    <label class="form-control min-w-44"><span class="label-text mb-1 text-xs text-base-content/70">Status</span><select v-model="itemFilter" class="select select-sm select-bordered" @change="changeItemFilter"><option value="">All videos</option><option value="failed">Failed</option><option value="pending">Waiting</option><option value="copying">Copying</option><option value="verifying">Verifying</option><option value="cleanup_pending">Destination active</option><option value="cleaned">Original removed</option><option value="original_kept">Original retained</option><option value="original_partial">Original may be incomplete</option></select></label>
                </header>
                <div class="overflow-x-auto">
                    <table class="table table-sm">
                        <thead><tr class="border-base-300 text-xs text-base-content/70"><th class="font-medium">Video</th><th class="font-medium">Route</th><th class="font-medium">Copy</th><th class="font-medium">Verification</th><th class="font-medium">Active storage</th><th class="font-medium">Original</th></tr></thead>
                        <tbody>
                            <template v-if="loadingItems && items.length === 0"><tr v-for="row in 6" :key="row"><td colspan="6"><div class="skeleton h-8 w-full rounded-selector" /></td></tr></template>
                            <tr v-else-if="items.length === 0"><td colspan="6" class="py-10 text-center text-sm text-base-content/70">No videos match this filter.</td></tr>
                            <tr v-for="item in items" :key="item.ID" class="border-base-300 align-top">
                                <td class="max-w-56"><span class="block truncate font-medium" :title="item.VideoName">{{ item.VideoName || item.FileUUID }}</span><span class="font-mono text-[11px] text-base-content/60">{{ item.FileUUID.slice(0, 8) }}</span><p v-if="item.ErrorMessage" class="mt-1 text-xs text-error">{{ item.ErrorMessage }}</p></td>
                                <td class="min-w-40 text-xs"><span class="block truncate">{{ mountName(item.SourceMountID) }}</span><span class="text-base-content/40">↓</span><span class="block truncate">{{ mountName(item.DestinationMountID) }}</span></td>
                                <td class="min-w-40"><div class="flex items-center gap-2"><progress class="progress progress-primary h-1.5 w-20" :value="itemProgress(item)" max="100" /><span class="text-xs tabular-nums">{{ Math.round(itemProgress(item)) }}%</span></div><span class="mt-1 block text-[11px] text-base-content/60">{{ formatBytes(item.BytesCopied) }} / {{ formatBytes(item.BytesTotal || item.PlannedBytes) }}</span></td>
                                <td><span class="badge badge-sm" :class="itemVerificationClass(item)">{{ verificationLabel(item) }}</span><span v-if="item.ObjectCount" class="mt-1 block text-[11px] tabular-nums text-base-content/60">{{ item.ObjectsVerified }} / {{ item.ObjectCount }} objects</span></td>
                                <td class="text-sm"><span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full" :class="item.CutoverAt ? 'bg-success' : 'bg-info'" />{{ item.CutoverAt ? mountName(item.DestinationMountID) : mountName(item.SourceMountID) }}</span></td>
                                <td><span class="badge badge-sm" :class="itemCleanupClass(item)">{{ storageMigrationStatusLabel(item.Status) }}</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div v-if="nextItemAfterId" class="flex justify-center border-t border-base-300 p-3">
                    <button class="btn btn-ghost btn-sm min-h-11" :disabled="loadingItems" @click="loadItems(true)">
                        <span v-if="loadingItems" class="loading loading-spinner loading-xs" />
                        Load more videos
                    </button>
                </div>
            </section>

            <section v-if="events.length" class="rounded-box border border-base-300 bg-base-100 p-4" aria-labelledby="migration-events-heading">
                <h2 id="migration-events-heading" class="text-sm font-semibold">Activity</h2>
                <ol class="mt-3 space-y-3">
                    <li v-for="event in events" :key="`${event.jobId}-${event.id}`" class="flex gap-3 text-sm"><span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-base-content/30" /><div class="min-w-0 grow"><div class="flex flex-wrap justify-between gap-2"><p>{{ event.message }}</p><time class="text-xs text-base-content/60">{{ formatDate(event.createdAt) }}</time></div><p class="mt-0.5 text-xs text-base-content/60">{{ event.actorName || 'VideoCMS' }}</p></div></li>
                </ol>
            </section>
        </template>

        <div v-else-if="loading" class="space-y-4" aria-hidden="true"><div class="skeleton h-20 rounded-box" /><div class="skeleton h-36 rounded-box" /><div class="skeleton h-72 rounded-box" /></div>
    </div>
</template>

<script setup lang="ts">
import { backgroundJobAction, backgroundStatusLabel, type BackgroundEvent, type BackgroundJob } from "@/composables/backgroundJobs";
import {
    cancelFailedStorageMigration, getStorageMigration, getStorageOverviewSummary, keepStorageMigrationOriginals, listStorageMigrationItems,
    storageMigrationStatusLabel, type StorageMigration, type StorageMigrationItem,
} from "@/composables/storageMigrations";

definePageMeta({ layout: "panel", middleware: "auth" });

const route = useRoute();
const { data: accountData } = useAccountData();
const migration = ref<StorageMigration | null>(null);
const job = ref<BackgroundJob | null>(null);
const cleanupJob = ref<BackgroundJob | null>(null);
const items = ref<StorageMigrationItem[]>([]);
const mounts = ref(new Map<string, string>());
const loading = ref(false);
const loadingItems = ref(false);
const acting = ref(false);
const error = ref("");
const itemFilter = ref("");
const nextItemAfterId = ref<number>();
let timer: ReturnType<typeof setTimeout> | undefined;

const activeJob = computed(() => {
    if (["completed", "originals_retained"].includes(migration.value?.Status || "")) return job.value;
    const cleanupNeedsAttention = cleanupJob.value && !["succeeded", "succeeded_with_warnings"].includes(cleanupJob.value.status);
    return cleanupNeedsAttention ? cleanupJob.value : job.value;
});
const displayStatus = computed(() => {
	const jobStatus = activeJob.value?.status;
	if (["pause_requested", "paused", "retry_wait", "cancel_requested", "failed"].includes(jobStatus || "")) return jobStatus!;
	if (activeJob.value?.kind === "storage.migration" && ["queued", "retry_wait", "cancel_requested"].includes(jobStatus || "")) return jobStatus!;
	return migration.value?.Status || "queued";
});
const displayStatusLabel = computed(() => ["pause_requested", "paused", "retry_wait", "cancel_requested", "failed"].includes(displayStatus.value) ? backgroundStatusLabel(displayStatus.value) : storageMigrationStatusLabel(displayStatus.value));
const overallProgress = computed(() => {
	if (!migration.value) return 0;
	const total = migration.value.ActualBytes || migration.value.PlannedBytes;
	if (!total && migration.value.FileCount) return Math.max(0, Math.min(100, (migration.value.CutoverCount / migration.value.FileCount) * 100));
	if (!total) return ["retaining_originals", "cleaning_originals", "completed", "originals_retained"].includes(migration.value.Status) ? 100 : 0;
	return Math.max(0, Math.min(100, (migration.value.CopiedBytes / total) * 100));
});
const cleanupSummary = computed(() => {
    if (!migration.value) return "—";
    if (migration.value.Status === "retaining_originals" && migration.value.CleanupAfter) return `Scheduled ${relativeTime(migration.value.CleanupAfter)}`;
	if (migration.value.Status === "paused" && cleanupJob.value?.kind === "storage.migration.cleanup") return migration.value.CleanupAfter ? `Paused · scheduled ${relativeTime(migration.value.CleanupAfter)}` : "Cleanup paused";
    if (migration.value.Status === "cleaning_originals") return `${migration.value.CleanedCount} of ${migration.value.FileCount} removed`;
    if (migration.value.Status === "originals_retained") return "Kept by administrator";
    if (migration.value.Status === "completed") return "Complete";
    return "Waits for every cutover";
});
const canKeepOriginals = computed(() => (!!migration.value && ["retaining_originals", "cleaning_originals"].includes(migration.value.Status)) || (!!cleanupJob.value && cleanupJob.value.kind === "storage.migration.cleanup" && cleanupJob.value.status === "paused"));
const canCancelFailedMigration = computed(() => migration.value?.Status === "failed" && (!job.value || job.value.status === "failed") && (!cleanupJob.value || activeJob.value?.id !== cleanupJob.value.id));
const stages = computed(() => {
    const status = migration.value?.Status || "queued";
	let index = status === "queued" ? 0 : ["running", "paused", "failed", "canceled"].includes(status) ? 1 : status === "retaining_originals" ? 2 : status === "cleaning_originals" ? 3 : 4;
	if (status === "paused" && cleanupJob.value?.kind === "storage.migration.cleanup") index = migration.value?.CleanupAfter && new Date(migration.value.CleanupAfter).getTime() > Date.now() ? 2 : 3;
    return [
        { key: "snapshot", label: "Snapshot ready", icon: "lucide:list-checks" },
        { key: "migrate", label: "Migrating videos", icon: "lucide:copy" },
        { key: "retain", label: "Retaining originals", icon: "lucide:clock-3" },
        { key: "cleanup", label: migration.value?.KeepOriginals ? "Originals retained" : "Cleaning originals", icon: "lucide:trash-2" },
        { key: "complete", label: "Complete", icon: "lucide:check" },
    ].map((stage, stageIndex) => ({ ...stage, reached: stageIndex <= index, current: stageIndex === index }));
});
const events = computed(() => {
    const combined: Array<BackgroundEvent & { jobId: string }> = [];
    for (const current of [job.value, cleanupJob.value]) for (const event of current?.events || []) combined.push({ ...event, jobId: current!.id });
    return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 30);
});

async function load() {
    if (!accountData.value?.Admin || loading.value) return;
    loading.value = true;
    try {
        const id = String(route.params.id);
        const [detail, storage] = await Promise.all([getStorageMigration(id), getStorageOverviewSummary()]);
        migration.value = detail.migration;
        job.value = detail.job || null;
        cleanupJob.value = detail.cleanupJob || null;
        mounts.value = new Map((storage.Mounts || []).map((mount) => [mount.UUID, mount.Name]));
        await loadItems(false, items.value.length > 0);
        error.value = "";
    } catch (cause: unknown) {
		error.value = actionError(cause, "Could not load storage migration");
    } finally {
        loading.value = false;
        schedulePoll();
    }
}

async function loadItems(append = false, refreshLoaded = false) {
	if (loadingItems.value) return;
    loadingItems.value = true;
    try {
		if (append) {
			const response = await listStorageMigrationItems(String(route.params.id), {
				status: itemFilter.value || undefined, limit: 500, afterId: nextItemAfterId.value,
			});
			items.value = [...items.value, ...(response.items || [])];
			nextItemAfterId.value = response.nextAfterId;
			return;
		}
		const pageCount = refreshLoaded ? Math.max(1, Math.ceil(items.value.length / 500)) : 1;
		const refreshed: StorageMigrationItem[] = [];
		let cursor: number | undefined;
		for (let page = 0; page < pageCount; page += 1) {
			const response = await listStorageMigrationItems(String(route.params.id), {
				status: itemFilter.value || undefined, limit: 500, afterId: cursor,
			});
			refreshed.push(...(response.items || []));
			cursor = response.nextAfterId;
			if (!cursor) break;
		}
		items.value = refreshed;
		nextItemAfterId.value = cursor;
    } finally {
        loadingItems.value = false;
    }
}

function changeItemFilter() {
	items.value = [];
	nextItemAfterId.value = undefined;
	loadItems();
}

async function jobAction(action: "pause" | "resume" | "cancel" | "retry") {
    if (!activeJob.value || acting.value) return;
    if (action === "cancel") {
        const message = activeJob.value.kind === "storage.migration.cleanup"
            ? "Stop original cleanup? Originals already removed cannot be restored."
            : "Cancel this migration? Videos already cut over stay on the destination; unfinished videos remain on the source.";
        if (!confirm(message)) return;
    }
    acting.value = true;
    try {
        await backgroundJobAction(activeJob.value.id, action, true);
        await load();
    } catch (cause: unknown) {
        error.value = actionError(cause, `Could not ${action} migration`);
    } finally {
        acting.value = false;
    }
}

async function keepOriginals() {
    if (!migration.value || acting.value || !confirm("Keep all remaining original copies? Pending cleanup will be canceled. Originals already removed cannot be restored.")) return;
    acting.value = true;
    try {
        await keepStorageMigrationOriginals(migration.value.UUID);
        await load();
    } catch (cause: unknown) {
        error.value = actionError(cause, "Could not keep original copies");
    } finally {
        acting.value = false;
    }
}

async function cancelFailedMigration() {
	if (!migration.value || acting.value || !confirm("Cancel this failed migration? Partial destination data will be cleaned. Videos already cut over stay on the destination and keep their source originals.")) return;
	acting.value = true;
	try {
		await cancelFailedStorageMigration(migration.value.UUID);
		await load();
	} catch (cause: unknown) {
		error.value = actionError(cause, "Could not cancel failed migration");
	} finally {
		acting.value = false;
	}
}

const mountName = (id: string) => mounts.value.get(id) || id;
const itemProgress = (item: StorageMigrationItem) => { const total = item.BytesTotal || item.PlannedBytes; if (!total) return item.CutoverAt ? 100 : 0; return Math.max(0, Math.min(100, (item.BytesCopied / total) * 100)); };
const verificationLabel = (item: StorageMigrationItem) => item.CutoverAt ? "Verified" : item.Status === "verifying" ? "Verifying" : item.Status === "failed" ? "Failed" : "Waiting";
const itemVerificationClass = (item: StorageMigrationItem) => item.CutoverAt ? "badge-success" : item.Status === "failed" ? "badge-error" : item.Status === "verifying" ? "badge-info" : "badge-ghost";
const itemCleanupClass = (item: StorageMigrationItem) => item.Status === "cleaned" ? "badge-success" : item.Status === "original_partial" ? "badge-warning" : item.Status === "original_kept" ? "badge-neutral" : item.Status === "cleaning" ? "badge-warning" : item.CutoverAt ? "badge-info" : "badge-ghost";
const statusClass = (status: string) => ({ queued: "badge-ghost", running: "badge-info", retry_wait: "badge-warning", pause_requested: "badge-info", paused: "badge-neutral", failed: "badge-error", canceled: "badge-ghost", retaining_originals: "badge-info", cleaning_originals: "badge-warning", completed: "badge-success", originals_retained: "badge-neutral" } as Record<string, string>)[status] || "badge-ghost";
const formatBytes = (bytes: number) => { if (!bytes) return "0 B"; const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"]; const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1); const value = bytes / Math.pow(1024, index); return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`; };
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const relativeTime = (value: string) => { const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000); const abs = Math.abs(seconds); const unit: Intl.RelativeTimeFormatUnit = abs >= 86400 ? "day" : abs >= 3600 ? "hour" : abs >= 60 ? "minute" : "second"; const divisor = unit === "day" ? 86400 : unit === "hour" ? 3600 : unit === "minute" ? 60 : 1; return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(Math.round(seconds / divisor), unit); };
const actionError = (cause: unknown, fallback: string) => {
	if (!cause || typeof cause !== "object") return fallback;
	const value = cause as { data?: { message?: unknown; error?: unknown }; message?: unknown };
	if (value.data?.error === "commit_in_progress") return "This operation is finalizing an irreversible step.";
	if (typeof value.data?.message === "string") return value.data.message;
	if (typeof value.data?.error === "string") return value.data.error;
	return typeof value.message === "string" ? value.message : fallback;
};
const schedulePoll = () => {
	if (timer) clearTimeout(timer);
	if (!import.meta.client || document.hidden) return;
	const active = activeJob.value && !["succeeded", "succeeded_with_warnings", "failed", "canceled", "paused"].includes(activeJob.value.status);
	const retaining = migration.value?.Status === "retaining_originals" && cleanupJob.value?.status === "queued";
	timer = setTimeout(load, active && !retaining ? 2500 : retaining ? 30000 : 10000);
};
const onVisibility = () => { if (!document.hidden) load(); else if (timer) clearTimeout(timer); };

watch(accountData, (account) => { if (account && !account.Admin) navigateTo("/my"); else if (account?.Admin) load(); }, { immediate: true });
onMounted(() => document.addEventListener("visibilitychange", onVisibility));
onUnmounted(() => { document.removeEventListener("visibilitychange", onVisibility); if (timer) clearTimeout(timer); });
</script>
