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
                        <button class="max-w-48 truncate hover:text-primary" :aria-current="index === path.length - 1 ? 'location' : undefined" @click="browse(folder.ID, folder.Name, index)">{{ folder.Name }}</button>
                    </template>
                </nav>
                <ul class="divide-y divide-base-300">
                    <li v-for="folder in share.Folders" :key="folder.ID">
                        <button class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-base-200" @click="browse(folder.ID, folder.Name)">
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

            <div v-if="share.AllowUpload" class="mt-6 rounded-box border border-base-300 bg-base-100 p-5">
                <h2 class="font-semibold">Upload videos</h2>
                <p class="mt-1 text-sm text-base-content/70">{{ share.AllowRead ? 'Add videos to the current folder.' : 'Your uploads are sent privately to the folder owner. Existing files are hidden.' }}</p>
                <p class="mt-1 text-xs text-base-content/60">Maximum file size: {{ sizeLabel(serverConfig.MaxUploadFilesize) }}.</p>
                <label class="mt-4 block"><span class="sr-only">Choose videos to upload</span><input type="file" multiple accept="video/*,.mkv,.mov,.webm,.avi,.m4v,.ts" class="file-input w-full" :disabled="uploading" @change="chooseFiles" /></label>
                <div v-if="uploading" role="status" class="mt-4">
                    <p class="truncate text-sm">Uploading {{ uploadName }} · {{ progress }}%</p><progress class="progress progress-primary mt-2 w-full" :value="progress" max="100"></progress>
                    <button type="button" class="btn btn-ghost btn-xs mt-2" @click="cancelUpload">Cancel upload</button>
                </div>
                <ul v-if="receipts.length" class="mt-4 space-y-2 text-sm" aria-live="polite"><li v-for="(receipt, index) in receipts" :key="index" :class="receipt.failed ? 'text-error' : 'text-success'">{{ receipt.name }} — {{ receipt.message }}</li></ul>
            </div>
        </template>
    </main>
</template>

<script setup lang="ts">
interface Folder { ID: number; Name: string }
interface SharedFolder {
    Name: string; FolderID: number; AllowRead: boolean; AllowUpload: boolean;
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
const loading = ref(true);
const unlocking = ref(false);
const error = ref('');
const captchaAttempt = ref(0);
const uploading = ref(false);
const uploadName = ref('');
const progress = ref(0);
const receipts = ref<{ name: string; message: string; failed: boolean }[]>([]);
let activeUpload: XMLHttpRequest | null = null;
let cancelled = false;
const message = (e: any) => typeof e.data === 'string' ? e.data : e.data?.message || e.data?.error || e.message;
function sizeLabel(size: number) { const units = ['B', 'KB', 'MB', 'GB']; let unit = 0; while (size >= 1024 && unit < 3) { size /= 1024; unit++; } return `${size.toFixed(unit ? 1 : 0)} ${units[unit]}`; }

async function load(folderID?: number) {
    loading.value = true;
    error.value = '';
    try {
        const data = await $fetch<SharedFolder>(endpoint, { credentials: 'include', query: folderID ? { FolderID: folderID } : undefined });
        share.value = data;
        if (data.Locked) path.value = [];
        else if (!folderID || !path.value.length) path.value = [{ ID: data.FolderID, Name: data.Name }];
        return data;
    } catch (e) { error.value = message(e); share.value = null; return null; }
    finally { loading.value = false; }
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
    if (uploading.value) return;
    loading.value = true;
    const data = await load(id);
    if (data && !data.Locked) path.value = index === undefined ? [...path.value, { ID: id, Name: name }] : path.value.slice(0, index + 1);
}
function send(file: File, folderID: number) {
    return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest(); activeUpload = xhr;
        xhr.open('POST', `${endpoint}/uploads?FolderID=${folderID}`);
        xhr.withCredentials = true;
        xhr.upload.onprogress = event => { if (event.lengthComputable) progress.value = Math.round(event.loaded / event.total * 100); };
        xhr.onload = () => {
            if (xhr.status === 202) { resolve(); return; }
            let message = xhr.responseText || 'Upload failed';
            try { const data = JSON.parse(message); message = data.message || data.error || message; } catch { /* Plain text errors are already readable. */ }
            reject(new Error(message));
        };
        xhr.onerror = () => reject(new Error('Connection lost. Please try again.'));
        xhr.onabort = () => reject(new Error('Upload canceled'));
        const body = new FormData(); body.append('file', file); body.append('Name', file.name); xhr.send(body);
    });
}
async function chooseFiles(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length || !share.value?.AllowUpload) return;
    const folderID = share.value.FolderID;
    uploading.value = true; cancelled = false;
    let received = false;
    try {
        for (const file of files) {
            if (cancelled) break;
            uploadName.value = file.name; progress.value = 0;
            try {
                if (!file.size || file.size > serverConfig.value.MaxUploadFilesize) throw new Error('File is empty or exceeds the upload limit.');
                await send(file, folderID);
                received = true;
                receipts.value.push({ name: file.name, message: 'Received. Processing in the background.', failed: false });
            } catch (e) { receipts.value.push({ name: file.name, message: message(e), failed: true }); }
        }
    } finally {
        uploading.value = false; activeUpload = null; input.value = '';
        if (received && share.value?.AllowRead) await load(folderID);
    }
}
function cancelUpload() { cancelled = true; activeUpload?.abort(); }
onMounted(() => load());
onBeforeUnmount(cancelUpload);
</script>
