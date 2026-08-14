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
        </div>

        <div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
            <table class="table table-sm">
                <thead>
                    <tr class="border-base-300 text-xs text-base-content/70">
                        <th class="font-medium">Video</th>
                        <th class="font-medium">State</th>
                        <th class="font-medium">Current step</th>
                        <th class="font-medium">Progress</th>
                        <th class="w-20"><span class="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody>
                    <template v-if="loading && jobs.length === 0">
                        <tr v-for="row in 5" :key="row"><td colspan="5"><div class="skeleton h-8 w-full rounded-selector" /></td></tr>
                    </template>
                    <tr v-else-if="jobs.length === 0">
                        <td colspan="5">
                            <div class="flex flex-col items-center gap-1 py-14 text-center">
                                <Icon name="lucide:circle-check" class="h-6 w-6 text-success/70" />
                                <p class="text-sm font-medium">No jobs need attention</p>
                                <p class="text-sm text-base-content/60">New background work will appear here automatically.</p>
                            </div>
                        </td>
                    </tr>
                    <tr v-for="job in jobs" :key="job.id" class="border-base-300 hover:bg-base-200/60">
                        <td>
                            <p class="max-w-xs truncate font-medium" :title="job.label">{{ job.label }}</p>
                            <p class="font-mono text-[11px] text-base-content/50">{{ job.id.slice(0, 8) }}</p>
                        </td>
                        <td><span class="badge badge-sm" :class="statusClass(job.status)">{{ statusLabel(job.status) }}</span></td>
                        <td class="max-w-xs truncate text-sm text-base-content/70">{{ job.phase || 'Waiting for a worker' }}</td>
                        <td>
                            <div class="flex min-w-36 items-center gap-3">
                                <progress class="progress progress-primary h-1.5 w-24" :value="backgroundProgressPercent(job.progress)" max="100" />
                                <span class="w-10 text-right text-xs tabular-nums">{{ Math.round(backgroundProgressPercent(job.progress)) }}%</span>
                            </div>
                        </td>
                        <td>
                            <div class="flex justify-end gap-1">
                                <button v-if="isBackgroundJobActive(job.status)" class="btn btn-ghost btn-xs" :disabled="acting === job.id" @click="runAction(job, 'cancel')">Cancel</button>
                                <button v-else-if="['failed', 'canceled', 'succeeded_with_warnings'].includes(job.status)" class="btn btn-ghost btn-xs" :disabled="acting === job.id" @click="runAction(job, 'retry')">Retry</button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {
    backgroundJobAction,
    backgroundProgressPercent,
    isBackgroundJobActive,
    listMyBackgroundJobs,
    type BackgroundJob,
    type BackgroundJobStatus,
} from "@/composables/backgroundJobs";

definePageMeta({ layout: "panel", middleware: "auth" });

const jobs = ref<BackgroundJob[]>([]);
const loading = ref(false);
const error = ref("");
const acting = ref("");
let timer: ReturnType<typeof setTimeout> | undefined;

const load = async () => {
    loading.value = true;
    try {
        const response = await listMyBackgroundJobs({
            status: "queued,running,retry_wait,cancel_requested,failed,canceled,succeeded_with_warnings",
            limit: 50,
        });
        jobs.value = response.jobs;
        error.value = "";
    } catch (cause: any) {
        error.value = cause?.data?.error || cause?.message || "Could not load media processing";
    } finally {
        loading.value = false;
        schedule();
    }
};

const schedule = () => {
    if (timer) clearTimeout(timer);
    if (!import.meta.client) return;
    if (document.hidden) return;
    const active = jobs.value.some((job) => isBackgroundJobActive(job.status));
    timer = setTimeout(load, active ? 2000 : 10000);
};

const runAction = async (job: BackgroundJob, action: "cancel" | "retry") => {
    if (action === "cancel" && !confirm(`Cancel “${job.label}”?`)) return;
    acting.value = job.id;
    try { await backgroundJobAction(job.id, action); await load(); }
    catch (cause: any) { error.value = cause?.data?.error || cause?.message || `Could not ${action} job`; }
    finally { acting.value = ""; }
};

const statusLabel = (status: BackgroundJobStatus) => status.replaceAll("_", " ");
const statusClass = (status: BackgroundJobStatus) => ({
    running: "badge-info", queued: "badge-ghost", retry_wait: "badge-warning", cancel_requested: "badge-warning",
    succeeded: "badge-success", succeeded_with_warnings: "badge-warning", failed: "badge-error", canceled: "badge-ghost",
}[status]);

const onVisibility = () => { if (!document.hidden) load(); else if (timer) clearTimeout(timer); };
onMounted(() => { document.addEventListener("visibilitychange", onVisibility); load(); });
onUnmounted(() => { document.removeEventListener("visibilitychange", onVisibility); if (timer) clearTimeout(timer); });
</script>
