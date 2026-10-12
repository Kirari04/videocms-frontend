<template>
    <section class="mt-8" aria-labelledby="shared-upload-title">
        <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
                <h2 id="shared-upload-title" class="text-base font-semibold">Upload videos</h2>
                <p class="mt-1 break-words text-sm text-base-content/70"><template v-if="allowRead">Upload to <span class="font-medium text-base-content">{{ folder.Path }}</span>.</template><template v-else-if="returnUploadLink">Send videos to the folder owner. You’ll receive a public link after processing.</template><template v-else>Your uploads are sent privately to the folder owner.</template></p>
                <p v-if="maxFolderSize > 0 && uploadBytesRemaining != null" class="mt-1 text-xs text-base-content/70" role="status">{{ uploadBytesRemaining > 0 ? `${humanFileSize(uploadBytesRemaining)} available of the ${humanFileSize(maxFolderSize)} folder limit.` : 'Folder limit reached. New uploads are blocked.' }}</p>
            </div>
            <button type="button" class="btn btn-primary btn-sm gap-2" :disabled="!hasPending || running" @click="start">
                <span v-if="running" class="loading loading-spinner loading-xs"></span><Icon v-else name="lucide:play" class="h-4 w-4" />
                {{ running ? 'Uploading…' : 'Start upload' }}
            </button>
        </div>
        <div class="grid min-h-72 grid-cols-1 gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <UploadDropzone :hint="maxFileSize > 0 ? `Maximum file size: ${humanFileSize(maxFileSize)}.` : 'Add one or more videos.'" @files="addFiles" />
            <div class="flex max-h-[28rem] min-h-72 flex-col overflow-hidden rounded-box border border-base-300 bg-base-100">
                <div class="flex shrink-0 flex-wrap items-center gap-2 border-b border-base-300 p-3">
                    <Icon name="lucide:list-video" class="h-4 w-4 shrink-0 text-base-content/70" />
                    <h3 class="min-w-0 flex-1 text-sm font-medium">Upload queue <span v-if="items.length" class="ml-1 text-base-content/70">{{ items.length }}</span></h3>
                    <div class="flex shrink-0 gap-1">
                        <button type="button" class="btn btn-square btn-ghost btn-sm" :disabled="!items.some(item => item.fin && !item.linkPending)" title="Clear finished" aria-label="Clear finished uploads" @click="clearFinished"><Icon name="lucide:eraser" class="h-4 w-4" /></button>
                        <button type="button" class="btn btn-square btn-ghost btn-sm" :disabled="!items.some(item => item.error)" title="Retry errors" aria-label="Retry errored uploads" @click="retry()"><Icon name="lucide:rotate-cw" class="h-4 w-4" /></button>
                        <button v-if="running" type="button" class="btn btn-square btn-ghost btn-sm" title="Pause all" aria-label="Pause all uploads" @click="pause()"><Icon name="lucide:pause" class="h-4 w-4" /></button>
                    </div>
                </div>
                <div class="flex-1 overflow-y-auto p-2">
                    <UploadQueueItems :items="items" :status="status" :has-error="item => !!item.error" :error-message="item => item.error || item.linkError || ''" pausable
                        @retry="retry" @remove="remove" @pause="pause" @resume="resume">
                        <template #actions="{ item }">
                            <a v-if="item.publicURL" :href="publicURL(item.publicURL)" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-xs" :aria-label="`Open uploaded video: ${item.name}`" title="Open video"><Icon name="lucide:external-link" class="h-3 w-3" /></a>
                            <button v-if="item.publicURL" type="button" class="btn btn-ghost btn-xs" :aria-label="`Copy public link: ${item.name}`" title="Copy public link" @click="copyLink(item.publicURL)"><Icon name="lucide:copy" class="h-3 w-3" /></button>
                        </template>
                    </UploadQueueItems>
                </div>
            </div>
        </div>
        <p class="mt-3 text-xs text-base-content/70" role="status" aria-live="polite">{{ summary }}</p>
        <p v-if="linkNotice" class="mt-2 text-xs text-base-content/70" role="status">{{ linkNotice }}</p>
    </section>
</template>

<script setup lang="ts">
import { createSharedFolderUploadQueue, type SharedUploadQueueItem } from '@/composables/sharedFolderUploadQueue';
const props = defineProps<{ shareToken: string; folder: { ID: number; Path: string }; allowRead: boolean; maxVideoSize: number; maxFolderSize: number; uploadBytesRemaining: number | null; returnUploadLink: boolean }>();
const emit = defineEmits<{ received: [folderID: number]; pending: [pending: boolean] }>();
const conf = useRuntimeConfig();
const serverConfig = useServerConfig();
const maxFileSize = computed(() => props.maxVideoSize > 0 ? props.maxVideoSize : serverConfig.value.MaxUploadFilesize);
const linkNotice = ref('');
const publicURL = (path: string) => new URL(path, String(conf.public.baseUrl || window.location.origin)).href;
async function copyLink(path: string) {
    try { await navigator.clipboard.writeText(publicURL(path)); linkNotice.value = 'Public link copied.'; }
    catch { linkNotice.value = 'Open the video and copy its address from your browser.'; }
}
const queue = createSharedFolderUploadQueue({
    apiUrl: String(conf.public.apiUrl), shareToken: props.shareToken,
    chunkSize: () => serverConfig.value.MaxUploadChunkSize,
    maxFileSize: () => maxFileSize.value,
    returnUploadLink: () => props.returnUploadLink,
    onReceived: folderID => emit('received', folderID),
    onReady: folderID => emit('received', folderID),
});
const { items, running, add, start, pause, resume, retry, remove, clearFinished } = queue;
function addFiles(files: File[]) { add(files, props.folder.ID); }
const hasPending = computed(() => items.value.some(item => !item.fin && !item.error && !item.deleted));
watch(() => items.value.some(item => !item.fin && !item.deleted), pending => emit('pending', pending), { immediate: true });
const summary = computed(() => {
    const received = items.value.filter(item => item.fin).length;
    const failed = items.value.filter(item => item.error).length;
    if (received || failed) return [received ? `${received} received.${items.value.some(item => item.linkPending) ? ' Preparing public links…' : ''}` : '', failed ? `${failed} failed. Check the queue for details.` : ''].filter(Boolean).join(' ');
    return 'Add videos to the queue, then start the upload.';
});
function status(item: SharedUploadQueueItem) {
    const bytes = `${humanFileSize(item.bytesUploaded)} / ${humanFileSize(item.size)}`;
    if (item.deleted) return 'Removing…';
    if (item.fin) return item.publicURL ? 'Ready · Public link available' : item.linkError ? 'Received · Public link unavailable' : item.linkPending ? 'Received · Preparing public link…' : 'Received · Processing in the background';
    if (item.error) return `Failed · ${bytes}`;
    if (item.paused) return `Paused · ${bytes}`;
    if (item.receiving) return 'Receiving upload…';
    if (item.uploading) return `Uploading · ${Math.floor(item.progress)}%${item.speed ? ` · ${humanFileSize(item.speed)}/s` : ''} · ${bytes}`;
    return `Queued · ${humanFileSize(item.size)}`;
}
onBeforeUnmount(() => { queue.dispose(); emit('pending', false); });
</script>
