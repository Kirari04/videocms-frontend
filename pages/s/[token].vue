<template>
    <main class="mx-auto w-full max-w-4xl px-4 py-10">
        <div class="mb-6 flex items-center gap-3">
            <div class="rounded-box bg-primary/10 p-3 text-primary"><Icon name="lucide:folder-open" class="h-6 w-6" /></div>
            <div><h1 class="text-xl font-semibold">{{ share?.Name || 'Shared folder' }}</h1><p class="text-sm text-base-content/60">{{ share?.AllowRead === false ? 'Send videos to this folder.' : 'Browse videos shared with you.' }}</p></div>
        </div>
        <div v-if="error" role="alert" class="alert alert-error mb-4 text-sm">{{ error }}</div>
        <p v-if="loading" role="status" class="py-6 text-sm text-base-content/60">Loading shared folder…</p>
        <button v-else-if="!share" type="button" class="btn btn-ghost btn-sm" @click="load()">Try again</button>

        <form v-else-if="share?.Locked" class="mx-auto max-w-sm rounded-box border border-base-300 bg-base-100 p-6" @submit.prevent="unlock">
            <h2 class="font-semibold">Access this folder</h2>
            <p class="mt-1 mb-4 text-sm text-base-content/70">{{ share.PasswordRequired ? 'Enter the password provided by the folder owner.' : 'Complete the CAPTCHA to continue.' }}</p>
            <label v-if="share.PasswordRequired" class="flex flex-col gap-1.5">
                <span class="text-sm font-medium">Password</span>
                <input type="password" name="password" autocomplete="current-password" class="input w-full" maxlength="72" required :disabled="unlocking" />
            </label>
            <div v-if="share.RequireCaptcha" :key="captchaAttempt" class="my-4">
                <ClientOnly><ShareCaptcha /></ClientOnly>
                <p v-if="!serverConfig.CaptchaEnabled" class="text-sm text-error">CAPTCHA is temporarily unavailable. Please contact the folder owner.</p>
            </div>
            <button class="btn btn-primary mt-4 w-full" :disabled="unlocking || (share.RequireCaptcha && !serverConfig.CaptchaEnabled)">
                <span v-if="unlocking" class="loading loading-spinner loading-sm"></span> Open folder
            </button>
        </form>

        <template v-else-if="share">
            <div v-if="share.AllowRead" class="rounded-box border border-base-300 bg-base-100">
                <nav aria-label="Shared folder path" class="flex flex-wrap items-center gap-2 border-b border-base-300 p-4 text-sm">
                    <template v-for="(folder, index) in path" :key="folder.ID">
                        <Icon v-if="index" name="lucide:chevron-right" class="h-3 w-3 text-base-content/40" />
                        <button class="max-w-48 truncate hover:text-primary disabled:cursor-not-allowed disabled:opacity-50" :aria-current="index === path.length - 1 ? 'location' : undefined" :disabled="uploadPending || refreshing" :title="uploadPending ? 'Finish or remove queued uploads before changing folders.' : undefined" @click="browse(folder.ID, folder.Name, index)">{{ folder.Name }}</button>
                    </template>
                </nav>
                <ul class="divide-y divide-base-300">
                    <li v-for="folder in share.Folders" :key="folder.ID">
                        <button class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-base-200 disabled:cursor-not-allowed disabled:opacity-50" :disabled="uploadPending || refreshing" :title="uploadPending ? 'Finish or remove queued uploads before changing folders.' : undefined" @click="browse(folder.ID, folder.Name)">
                            <Icon name="lucide:folder" class="h-5 w-5 shrink-0 text-base-content/50" /><span class="truncate">{{ folder.Name }}</span><Icon name="lucide:chevron-right" class="ml-auto h-4 w-4 shrink-0" />
                        </button>
                    </li>
                    <li v-for="file in share.Files" :key="file.PlayURL" class="flex flex-wrap items-center gap-3 px-4 py-3">
                        <Icon name="lucide:video" class="h-5 w-5 shrink-0 text-base-content/50" />
                        <div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">{{ file.Name }}</p><p class="text-xs text-base-content/60">{{ sizeLabel(file.Size) }}<span v-if="!file.Available"> · Storage unavailable</span><span v-else-if="file.Processing"> · Processing</span></p></div>
                        <a :href="mediaURL(file.PlayURL)" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm">Watch</a>
                        <a v-if="file.DownloadURL" :href="mediaURL(file.DownloadURL)" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm" aria-label="Download video"><Icon name="lucide:download" class="h-4 w-4" /></a>
                    </li>
                </ul>
                <p v-if="!share.Folders.length && !share.Files.length" class="p-8 text-center text-sm text-base-content/60">This folder is empty.</p>
            </div>

            <p v-if="!share.AllowRead && !share.AllowUpload" class="rounded-box border border-base-300 p-5 text-sm text-base-content/70">Uploads are temporarily disabled. Please try again later or contact the folder owner.</p>

            <UploadSharedFolder v-if="share.AllowUpload && currentFolder" :share-token="String(route.params.token)" :folder="currentFolder" :allow-read="share.AllowRead"
                :max-video-size="share.MaxVideoSize" :max-folder-size="share.MaxFolderSize" :upload-bytes-remaining="share.UploadBytesRemaining" :return-upload-link="share.ReturnUploadLink"
                @received="received" @pending="uploadPending = $event" />
        </template>
    </main>
</template>

<script setup lang="ts">
interface Folder { ID: number; Name: string }
interface SharedFolder {
    Name: string; FolderID: number; AllowRead: boolean; AllowUpload: boolean;
    MaxVideoSize: number; MaxFolderSize: number; UploadBytesRemaining: number | null; ReturnUploadLink: boolean;
    Locked: boolean; PasswordRequired: boolean; RequireCaptcha: boolean; Folders: Folder[];
    Files: { Name: string; Size: number; Processing: boolean; Available: boolean; PlayURL: string; DownloadURL: string }[];
}
definePageMeta({ key: route => route.params.token as string });
useHead({ title: 'Shared folder', meta: [{ name: 'referrer', content: 'no-referrer' }, { name: 'robots', content: 'noindex, nofollow' }] });
const route = useRoute();
const conf = useRuntimeConfig();
const serverConfig = useServerConfig();
const endpoint = `${conf.public.apiUrl}/shares/${encodeURIComponent(route.params.token as string)}`;
const mediaURL = (path: string) => `${String(conf.public.baseUrl || '').replace(/\/+$/, '')}${path}`;
const share = ref<SharedFolder | null>(null);
const path = ref<Folder[]>([]);
const currentFolder = computed(() => share.value && !share.value.Locked ? {
    ID: share.value.FolderID,
    Path: path.value.map(folder => folder.Name).join(' / ') || share.value.Name,
} : null);
const loading = ref(true);
const refreshing = ref(false);
const unlocking = ref(false);
const error = ref('');
const captchaAttempt = ref(0);
const uploadPending = ref(false);
const message = (e: any) => typeof e.data === 'string' ? e.data : e.data?.message || e.data?.error || e.message;
function sizeLabel(size: number) { const units = ['B', 'KB', 'MB', 'GB']; let unit = 0; while (size >= 1024 && unit < 3) { size /= 1024; unit++; } return `${size.toFixed(unit ? 1 : 0)} ${units[unit]}`; }

async function load(folderID?: number) {
    loading.value = !share.value;
    refreshing.value = true;
    error.value = '';
    try {
        const data = await $fetch<SharedFolder>(endpoint, { credentials: 'include', query: folderID ? { FolderID: folderID } : undefined });
        share.value = data;
        if (data.Locked) path.value = [];
        else if (!folderID || !path.value.length) path.value = [{ ID: data.FolderID, Name: data.Name }];
        return data;
    } catch (e) { error.value = message(e); share.value = null; return null; }
    finally { loading.value = false; refreshing.value = false; }
}
async function unlock(event: Event) {
    unlocking.value = true; error.value = '';
    try {
        await $fetch(`${endpoint}/unlock`, { method: 'POST', credentials: 'include', body: new FormData(event.target as HTMLFormElement) });
        await load();
    } catch (e) { error.value = message(e); captchaAttempt.value++; }
    finally { unlocking.value = false; }
}
async function browse(id: number, name: string, index?: number) {
    if (uploadPending.value || refreshing.value) return;
    const data = await load(id);
    if (data && !data.Locked) path.value = index === undefined ? [...path.value, { ID: id, Name: name }] : path.value.slice(0, index + 1);
}
async function received(folderID: number) {
    if (share.value?.AllowRead && currentFolder.value?.ID === folderID) await load(folderID);
}
onMounted(() => load());
</script>
