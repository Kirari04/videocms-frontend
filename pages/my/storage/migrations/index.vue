<template>
    <div class="flex grow flex-col">
        <PageHeader title="Storage migrations" description="Move existing videos between storage pools without interrupting playback.">
            <NuxtLink to="/my/storage" class="btn btn-ghost btn-sm gap-2">
                <Icon name="lucide:arrow-left" class="h-4 w-4" /> Storage
            </NuxtLink>
            <button class="btn btn-primary btn-sm gap-2" :disabled="loading" @click="toggleCreate">
                <Icon :name="creating ? 'lucide:x' : 'lucide:plus'" class="h-4 w-4" />
                {{ creating ? 'Close setup' : 'Create migration' }}
            </button>
        </PageHeader>

        <div v-if="accountData && !accountData.Admin" role="alert" class="alert alert-error">
            <Icon name="lucide:shield-alert" class="h-5 w-5" />
            <span>You do not have access to storage migrations.</span>
        </div>

        <template v-else>
            <div v-if="error" role="alert" class="alert alert-error mb-4">
                <Icon name="lucide:circle-alert" class="h-5 w-5 shrink-0" />
                <span>{{ error }}</span>
                <button class="btn btn-square btn-ghost btn-sm ml-auto" aria-label="Dismiss error" @click="error = ''"><Icon name="lucide:x" class="h-4 w-4" /></button>
            </div>

            <section v-if="creating" class="mb-6 overflow-hidden rounded-box border border-base-300 bg-base-100" aria-labelledby="create-migration-heading">
                <header class="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 px-4 py-3 sm:px-5">
                    <div>
                        <h2 id="create-migration-heading" class="font-semibold">Create storage migration</h2>
                        <p class="mt-0.5 text-sm text-base-content/70">Review exactly which videos will move, then start a migration you can safely pause or cancel.</p>
                    </div>
                    <ol class="flex items-center gap-2 text-xs" aria-label="Migration setup steps">
                        <li v-for="item in setupSteps" :key="item.step" class="flex items-center gap-1.5" :class="step >= item.step ? 'text-primary' : 'text-base-content/50'">
                            <span class="flex h-5 w-5 items-center justify-center rounded-full border text-[11px]" :class="step >= item.step ? 'border-primary bg-primary text-primary-content' : 'border-base-300'">{{ item.step }}</span>
                            <span class="hidden sm:inline">{{ item.label }}</span>
                        </li>
                    </ol>
                </header>

                <div v-if="step === 1" class="p-4 sm:p-5">
                    <div class="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-end">
                        <label class="form-control">
                            <span class="label-text mb-1.5 text-sm font-medium">Source pool</span>
                            <select v-model.number="sourcePoolId" class="select select-bordered w-full" :disabled="previewing">
                                <option :value="0" disabled>Select the pool containing the videos</option>
                                <option v-for="pool in pools" :key="pool.ID" :value="pool.ID">{{ pool.Name }}{{ pool.IsDefault ? ' · default' : '' }}</option>
                            </select>
                            <span class="mt-1.5 text-xs text-base-content/70">All currently available videos on its member mounts are included.</span>
                        </label>
                        <Icon name="lucide:arrow-right" class="mb-8 hidden h-5 w-5 text-base-content/40 lg:block" />
                        <label class="form-control">
                            <span class="label-text mb-1.5 text-sm font-medium">Destination pool</span>
                            <select v-model.number="destinationPoolId" class="select select-bordered w-full" :disabled="previewing">
                                <option :value="0" disabled>Select where the videos should move</option>
                                <option v-for="pool in destinationPools" :key="pool.ID" :value="pool.ID">{{ pool.Name }}</option>
                            </select>
                            <span class="mt-1.5 text-xs text-base-content/70">Placement is balanced across healthy members and fixed for reliable retries.</span>
                        </label>
                    </div>
                    <div class="mt-5 flex justify-end">
                        <button class="btn btn-primary btn-sm min-h-11" :disabled="!canPreview || previewing" @click="reviewMigration">
                            <span v-if="previewing" class="loading loading-spinner loading-xs" />
                            Review migration
                            <Icon v-if="!previewing" name="lucide:arrow-right" class="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div v-else-if="preview" class="p-4 sm:p-5">
                    <div class="flex flex-wrap items-center gap-2 text-sm font-medium">
                        <span>{{ preview.sourcePoolName }}</span>
                        <Icon name="lucide:arrow-right" class="h-4 w-4 text-base-content/40" />
                        <span>{{ preview.destinationPoolName }}</span>
                    </div>

                    <dl class="mt-4 flex flex-wrap divide-x divide-base-300 rounded-field bg-base-200">
                        <div class="min-w-36 flex-1 px-4 py-3"><dt class="text-xs text-base-content/70">Snapshot</dt><dd class="mt-1 font-semibold tabular-nums">{{ preview.fileCount }} videos</dd></div>
                        <div class="min-w-36 flex-1 px-4 py-3"><dt class="text-xs text-base-content/70">Tracked data</dt><dd class="mt-1 font-semibold tabular-nums">{{ formatBytes(preview.plannedBytes) }}</dd></div>
                        <div class="min-w-36 flex-1 px-4 py-3"><dt class="text-xs text-base-content/70">Original retention</dt><dd class="mt-1 font-semibold tabular-nums">{{ preview.cleanupGraceHours }} hours</dd></div>
                    </dl>

                    <div class="mt-5 grid gap-5 lg:grid-cols-2">
                        <section>
                            <h3 class="text-sm font-semibold">Safety behavior</h3>
                            <ul class="mt-2 space-y-2 text-sm text-base-content/80">
                                <li class="flex gap-2"><Icon name="lucide:play-circle" class="mt-0.5 h-4 w-4 shrink-0 text-success" /><span>Each video keeps playing from its source until its complete destination copy is verified.</span></li>
                                <li class="flex gap-2"><Icon name="lucide:shield-check" class="mt-0.5 h-4 w-4 shrink-0 text-success" /><span>Cutover is atomic. Partially copied data is never used for playback.</span></li>
                                <li class="flex gap-2"><Icon name="lucide:clock-3" class="mt-0.5 h-4 w-4 shrink-0 text-info" /><span>Originals remain until every video finishes, then for {{ preview.cleanupGraceHours }} more hours.</span></li>
                            </ul>
                        </section>
                        <section>
                            <h3 class="text-sm font-semibold">Destination placement</h3>
                            <div class="mt-2 divide-y divide-base-300 rounded-field border border-base-300">
                                <div v-for="placement in preview.destinationPlacements" :key="placement.mountId" class="flex items-center justify-between gap-4 px-3 py-2 text-sm">
                                    <span class="truncate">{{ placement.mountName }}</span>
                                    <span class="shrink-0 text-xs tabular-nums text-base-content/70">{{ placement.fileCount }} videos · {{ formatBytes(placement.plannedBytes) }}</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div v-if="preview.warnings.length" class="mt-5 rounded-field bg-warning/10 p-3 text-sm">
                        <p class="font-medium">Before you start</p>
                        <ul class="mt-1.5 list-disc space-y-1 pl-5 text-base-content/80"><li v-for="warning in preview.warnings" :key="warning">{{ warning }}</li></ul>
                    </div>

                    <label v-if="step === 3" class="mt-5 flex cursor-pointer items-start gap-3 rounded-field border border-base-300 p-3">
                        <input v-model="confirmed" type="checkbox" class="checkbox checkbox-sm mt-0.5" />
                        <span class="text-sm">I understand that already-cut-over videos stay on the destination if I cancel, while unfinished videos remain on the source.</span>
                    </label>

                    <div class="mt-5 flex flex-wrap justify-between gap-2">
                        <button class="btn btn-ghost btn-sm min-h-11" :disabled="starting" @click="backSetup"><Icon name="lucide:arrow-left" class="h-4 w-4" /> Back</button>
                        <button v-if="step === 2" class="btn btn-primary btn-sm min-h-11" @click="step = 3">Continue to confirmation <Icon name="lucide:arrow-right" class="h-4 w-4" /></button>
                        <button v-else class="btn btn-primary btn-sm min-h-11" :disabled="!confirmed || starting" @click="startMigration">
                            <span v-if="starting" class="loading loading-spinner loading-xs" />
                            Start migration
                        </button>
                    </div>
                </div>
            </section>

            <section class="mb-5 flex flex-wrap divide-x divide-base-300 rounded-box border border-base-300 bg-base-100" aria-label="Migration summary">
                <div v-for="item in summary" :key="item.label" class="min-w-36 flex-1 px-4 py-3">
                    <p class="text-xs text-base-content/70">{{ item.label }}</p>
                    <p class="mt-0.5 text-xl font-semibold tabular-nums">{{ item.value }}</p>
                </div>
            </section>

            <div class="mb-3 flex flex-wrap items-end gap-2">
                <label class="form-control min-w-44">
                    <span class="label-text mb-1 text-xs text-base-content/70">Status</span>
                    <select v-model="statusFilter" class="select select-sm select-bordered" @change="applyFilter">
                        <option value="">All migrations</option>
                        <option value="active">Active</option>
                        <option value="retention">Retaining originals</option>
                        <option value="attention">Needs attention</option>
                        <option value="complete">Complete</option>
                    </select>
                </label>
                <button class="btn btn-ghost btn-sm ml-auto gap-2" :disabled="loading" @click="load(false, true)">
                    <Icon name="lucide:refresh-cw" class="h-4 w-4" :class="{ 'animate-spin': loading }" /> Refresh
                </button>
            </div>

            <section class="overflow-hidden rounded-box border border-base-300 bg-base-100">
                <div class="overflow-x-auto"><table class="table table-sm">
                    <thead><tr class="border-base-300 text-xs text-base-content/70"><th class="font-medium">Route</th><th class="font-medium">Status</th><th class="font-medium">Progress</th><th class="font-medium">Videos</th><th class="font-medium">Cleanup</th><th class="font-medium">Started</th><th><span class="sr-only">Open</span></th></tr></thead>
                    <tbody>
                        <template v-if="loading && migrations.length === 0"><tr v-for="row in 5" :key="row"><td colspan="7"><div class="skeleton h-9 w-full rounded-selector" /></td></tr></template>
                        <tr v-else-if="migrations.length === 0"><td colspan="7"><div class="flex flex-col items-center gap-1 py-14 text-center"><Icon name="lucide:database-zap" class="h-7 w-7 text-base-content/30" /><p class="mt-1 text-sm font-medium">No storage migrations</p><p class="text-sm text-base-content/70">Create one when videos need to move between pools.</p></div></td></tr>
                        <tr v-for="migration in migrations" :key="migration.UUID" class="border-base-300 hover:bg-base-200/60">
                            <td><NuxtLink :to="`/my/storage/migrations/${migration.UUID}`" class="block min-w-48"><span class="block font-medium">{{ migration.SourcePoolName }} → {{ migration.DestinationPoolName }}</span><span class="font-mono text-[11px] text-base-content/60">{{ migration.UUID.slice(0, 8) }}</span></NuxtLink></td>
                            <td><span class="badge badge-sm" :class="statusClass(migration.Status)">{{ storageMigrationStatusLabel(migration.Status) }}</span></td>
                            <td class="min-w-40"><div class="flex items-center gap-2"><progress class="progress progress-primary h-1.5 w-24" :value="migrationProgress(migration)" max="100" /><span class="w-9 text-right text-xs tabular-nums">{{ Math.round(migrationProgress(migration)) }}%</span></div></td>
                            <td class="whitespace-nowrap text-sm tabular-nums">{{ migration.CutoverCount }} / {{ migration.FileCount }}</td>
                            <td class="max-w-48 text-sm text-base-content/70">{{ cleanupLabel(migration) }}</td>
                            <td class="whitespace-nowrap text-xs text-base-content/70">{{ formatDate(migration.StartedAt || migration.CreatedAt) }}</td>
                            <td><NuxtLink :to="`/my/storage/migrations/${migration.UUID}`" class="btn btn-square btn-ghost btn-sm" :aria-label="`Open migration from ${migration.SourcePoolName}`"><Icon name="lucide:chevron-right" class="h-4 w-4" /></NuxtLink></td>
                        </tr>
                    </tbody>
                </table></div>
                <div v-if="nextBeforeId" class="flex justify-center border-t border-base-300 p-3">
					<button class="btn btn-ghost btn-sm min-h-11" :disabled="loading" @click="load(true)">
						<span v-if="loading" class="loading loading-spinner loading-xs" />
						Load older migrations
					</button>
				</div>
            </section>
        </template>
    </div>
</template>

<script setup lang="ts">
import { v4 as uuidv4 } from "uuid";
import {
    createStorageMigration, getStorageOverviewSummary, listStorageMigrations, previewStorageMigration,
    storageMigrationStatusLabel, type StorageMigration, type StorageMigrationPreview, type StorageMigrationSummary, type StoragePoolSummary,
} from "@/composables/storageMigrations";

definePageMeta({ layout: "panel", middleware: "auth" });

const { data: accountData } = useAccountData();
const router = useRouter();
const migrations = ref<StorageMigration[]>([]);
const migrationTotals = ref<StorageMigrationSummary>({ active: 0, retainingOriginals: 0, needsAttention: 0, videosMoved: 0 });
const nextBeforeId = ref<number>();
const pools = ref<StoragePoolSummary[]>([]);
const creating = ref(false);
const step = ref(1);
const sourcePoolId = ref(0);
const destinationPoolId = ref(0);
const preview = ref<StorageMigrationPreview | null>(null);
const confirmed = ref(false);
const requestId = ref("");
const loading = ref(false);
const previewing = ref(false);
const starting = ref(false);
const error = ref("");
const statusFilter = ref("");
let timer: ReturnType<typeof setTimeout> | undefined;

const setupSteps = [{ step: 1, label: "Pools" }, { step: 2, label: "Safety review" }, { step: 3, label: "Confirm" }];
const destinationPools = computed(() => pools.value.filter((pool) => pool.ID !== sourcePoolId.value));
const canPreview = computed(() => sourcePoolId.value > 0 && destinationPoolId.value > 0 && sourcePoolId.value !== destinationPoolId.value);
const summary = computed(() => [
	{ label: "Active", value: migrationTotals.value.active },
	{ label: "Retaining originals", value: migrationTotals.value.retainingOriginals },
	{ label: "Needs attention", value: migrationTotals.value.needsAttention },
	{ label: "Videos moved", value: migrationTotals.value.videosMoved },
]);

async function load(append = false, refreshLoaded = false) {
    if (!accountData.value?.Admin || loading.value) return;
    loading.value = true;
    try {
		const pages = append ? 1 : refreshLoaded ? Math.max(1, Math.ceil(migrations.value.length / 100)) : 1;
		const migrationRequest = append
			? listStorageMigrations({ limit: 100, beforeId: nextBeforeId.value, status: statusFilter.value || undefined })
			: refreshMigrationPages(pages);
		const [migrationResponse, storage] = await Promise.all([migrationRequest, getStorageOverviewSummary()]);
		const incoming = migrationResponse.migrations || [];
		migrations.value = append ? [...migrations.value, ...incoming] : incoming;
		migrationTotals.value = migrationResponse.summary;
		nextBeforeId.value = migrationResponse.nextBeforeId;
        pools.value = storage.Pools || [];
        error.value = "";
    } catch (cause: unknown) {
        error.value = errorMessage(cause, "Could not load storage migrations");
    } finally {
        loading.value = false;
        schedulePoll();
    }
}

async function refreshMigrationPages(pageCount: number) {
	const refreshed: StorageMigration[] = [];
	let cursor: number | undefined;
	let totals = migrationTotals.value;
	for (let page = 0; page < pageCount; page += 1) {
		const response = await listStorageMigrations({ limit: 100, beforeId: cursor, status: statusFilter.value || undefined });
		refreshed.push(...(response.migrations || []));
		totals = response.summary;
		cursor = response.nextBeforeId;
		if (!cursor) break;
	}
	return { migrations: refreshed, summary: totals, nextBeforeId: cursor };
}

function toggleCreate() {
    creating.value = !creating.value;
    if (creating.value) resetSetup();
}

function resetSetup() {
    step.value = 1;
    sourcePoolId.value = 0;
    destinationPoolId.value = 0;
    preview.value = null;
    confirmed.value = false;
	requestId.value = "";
}

async function reviewMigration() {
    if (!canPreview.value || previewing.value) return;
    previewing.value = true;
    try {
        preview.value = await previewStorageMigration(sourcePoolId.value, destinationPoolId.value);
		requestId.value = uuidv4();
        step.value = 2;
        error.value = "";
    } catch (cause: unknown) {
        error.value = errorMessage(cause, "Preflight could not approve this migration");
    } finally {
        previewing.value = false;
    }
}

function backSetup() {
    if (step.value === 3) {
        confirmed.value = false;
        step.value = 2;
    } else {
        preview.value = null;
        step.value = 1;
    }
}

async function startMigration() {
    if (!confirmed.value || starting.value) return;
    starting.value = true;
    try {
		if (!preview.value || !requestId.value) return;
        const response = await createStorageMigration(sourcePoolId.value, destinationPoolId.value, preview.value.planFingerprint, requestId.value);
        await router.push(`/my/storage/migrations/${response.migration.UUID}`);
    } catch (cause: unknown) {
        error.value = errorMessage(cause, "Could not start storage migration");
    } finally {
        starting.value = false;
    }
}

function migrationProgress(migration: StorageMigration) {
    const total = migration.ActualBytes || migration.PlannedBytes;
	if (!total && migration.FileCount) return Math.max(0, Math.min(100, (migration.CutoverCount / migration.FileCount) * 100));
	if (!total) return ["retaining_originals", "cleaning_originals", "completed", "originals_retained"].includes(migration.Status) ? 100 : 0;
    return Math.max(0, Math.min(100, (migration.CopiedBytes / total) * 100));
}

function cleanupLabel(migration: StorageMigration) {
    if (migration.Status === "retaining_originals" && migration.CleanupAfter) return `Starts ${relativeTime(migration.CleanupAfter)}`;
    if (migration.Status === "cleaning_originals") return `${migration.CleanedCount} of ${migration.FileCount} removed`;
    if (migration.Status === "originals_retained") return "Kept by administrator";
    if (migration.Status === "completed") return "Complete";
    return "After all videos finish";
}

const statusClass = (status: string) => ({ queued: "badge-ghost", running: "badge-info", paused: "badge-neutral", failed: "badge-error", canceled: "badge-ghost", retaining_originals: "badge-info", cleaning_originals: "badge-warning", completed: "badge-success", originals_retained: "badge-neutral" } as Record<string, string>)[status] || "badge-ghost";
const formatBytes = (bytes: number) => { if (!bytes) return "0 B"; const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"]; const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1); const value = bytes / Math.pow(1024, index); return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`; };
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const relativeTime = (value: string) => { const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000); const abs = Math.abs(seconds); const unit: Intl.RelativeTimeFormatUnit = abs >= 86400 ? "day" : abs >= 3600 ? "hour" : abs >= 60 ? "minute" : "second"; const divisor = unit === "day" ? 86400 : unit === "hour" ? 3600 : unit === "minute" ? 60 : 1; return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(Math.round(seconds / divisor), unit); };
const errorMessage = (cause: unknown, fallback: string) => {
	if (!cause || typeof cause !== "object") return fallback;
	const value = cause as { data?: { message?: unknown; error?: unknown }; message?: unknown };
	if (typeof value.data?.message === "string") return value.data.message;
	if (typeof value.data?.error === "string") return value.data.error;
	return typeof value.message === "string" ? value.message : fallback;
};
const applyFilter = () => {
	migrations.value = [];
	nextBeforeId.value = undefined;
	load();
};
const schedulePoll = () => {
    if (timer) clearTimeout(timer);
    if (!import.meta.client || document.hidden) return;
    const activelyMoving = migrations.value.some((item) => ["queued", "running", "cleaning_originals"].includes(item.Status));
    const retaining = migrations.value.some((item) => item.Status === "retaining_originals");
	timer = setTimeout(() => load(false, true), activelyMoving ? 3000 : retaining ? 30000 : 10000);
};
const onVisibility = () => { if (!document.hidden) load(false, true); else if (timer) clearTimeout(timer); };

watch(sourcePoolId, () => { if (destinationPoolId.value === sourcePoolId.value) destinationPoolId.value = 0; });
watch(accountData, (account) => { if (account && !account.Admin) navigateTo("/my"); else if (account?.Admin) load(); }, { immediate: true });
onMounted(() => document.addEventListener("visibilitychange", onVisibility));
onUnmounted(() => { document.removeEventListener("visibilitychange", onVisibility); if (timer) clearTimeout(timer); });
</script>
