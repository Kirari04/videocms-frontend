<template>
    <dialog ref="dialog" class="modal" aria-labelledby="share-links-title" @close="closeSharing">
        <div class="modal-box max-w-2xl">
            <button type="button" class="btn btn-circle btn-ghost btn-sm absolute right-3 top-3" aria-label="Close sharing" @click="dialog?.close()">
                <Icon name="lucide:x" class="h-4 w-4" />
            </button>
            <div class="flex flex-wrap items-center justify-between gap-3 pr-8">
                <h2 id="share-links-title" class="text-lg font-semibold">Share {{ folderName }}</h2>
                <button type="button" class="btn btn-primary btn-sm" :disabled="busy || loading" @click="create">Create share link</button>
            </div>
            <div v-if="error" class="alert alert-error mt-4 text-sm" role="alert">{{ error }}</div>
            <div v-if="notice" class="alert alert-success mt-4 text-sm" role="status">{{ notice }}</div>
            <div class="mt-5">
                <p v-if="loading" class="mt-3 text-sm text-base-content/60" role="status">Loading links…</p>
                <p v-else-if="!shares.length" class="mt-3 text-sm text-base-content/60">No share links yet.</p>
                <div v-for="share in shares" :key="share.ID" class="mt-3 rounded-box border border-base-300 p-3">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <span class="text-sm font-medium">{{ share.Name || modeLabel(share) }}</span>
                        <div class="flex gap-1">
                            <button type="button" class="btn btn-ghost btn-xs" :disabled="busy" @click="edit(share)">Edit</button>
                            <button type="button" class="btn btn-ghost btn-xs text-error" :disabled="busy" @click="revoke(share)">Revoke</button>
                        </div>
                    </div>
                    <p class="mt-1 text-xs text-base-content/60">
                        {{ modeLabel(share) }} · {{ share.HasPassword ? 'Password protected' : 'Anyone with the link' }}
                        <span v-if="share.RequireCaptcha"> · CAPTCHA</span>
                        <span v-if="share.ExpiresAt"> · {{ new Date(share.ExpiresAt).getTime() <= Date.now() ? 'Expired' : 'Expires ' + new Date(share.ExpiresAt).toLocaleString() }}</span>
                    </p>
                    <div class="mt-2 flex gap-2">
                        <input :value="shareURL(share)" readonly class="input input-sm w-full min-w-0 text-xs" aria-label="Share link" @focus="($event.target as HTMLInputElement).select()" />
                        <button type="button" class="btn btn-ghost btn-sm" aria-label="Copy share link" @click="copy(share)"><Icon name="lucide:copy" class="h-4 w-4" /></button>
                    </div>
                </div>
            </div>
        </div>
        <form method="dialog" class="modal-backdrop"><button>Close</button></form>
    </dialog>

    <dialog ref="editorDialog" class="modal" aria-labelledby="share-editor-title" @close="reset" @cancel="guardEditorClose">
        <div class="modal-box max-w-2xl">
            <button type="button" class="btn btn-circle btn-ghost btn-sm absolute right-3 top-3" aria-label="Close link editor" :disabled="busy" @click="editorDialog?.close()">
                <Icon name="lucide:x" class="h-4 w-4" />
            </button>
            <h2 id="share-editor-title" class="pr-8 text-lg font-semibold">{{ editing ? 'Edit share link' : 'Create share link' }}</h2>
            <p class="mt-1 text-sm text-base-content/70">{{ folderName }} and its subfolders. Visitors do not need an account.</p>
            <div v-if="editorError" class="alert alert-error mt-4 text-sm" role="alert">{{ editorError }}</div>
            <form class="mt-5 grid gap-4 sm:grid-cols-2" @submit.prevent="save">
                <label class="flex flex-col gap-1.5">
                    <span class="text-sm font-medium">Link label (optional)</span>
                    <input v-model="label" maxlength="120" class="input w-full" placeholder="e.g. Client review" :disabled="busy" autofocus />
                </label>
                <label class="flex flex-col gap-1.5">
                    <span class="text-sm font-medium">Visitors can</span>
                    <select v-model="permission" class="select w-full" :disabled="busy">
                        <option value="read">View and download</option>
                        <option value="upload">Upload only</option>
                        <option value="both">View, download and upload</option>
                    </select>
                </label>
                <label class="flex flex-col gap-1.5">
                    <span class="text-sm font-medium">Password protection</span>
                    <select v-model="passwordMode" class="select w-full" :disabled="busy">
                        <option v-if="editing?.HasPassword" value="keep">Keep current password</option>
                        <option value="none">Anyone with the link</option>
                        <option value="set">Require a password</option>
                    </select>
                </label>
                <label v-if="passwordMode === 'set'" class="flex flex-col gap-1.5">
                    <span class="text-sm font-medium">Shared password</span>
                    <input v-model="password" type="password" autocomplete="new-password" maxlength="72" required class="input w-full" :disabled="busy" />
                </label>
                <label class="flex flex-col gap-1.5">
                    <span class="text-sm font-medium">Expires (optional)</span>
                    <input v-model="expires" type="datetime-local" class="input w-full" :disabled="busy" />
                </label>
                <fieldset v-if="permission !== 'read'" class="grid min-w-0 gap-4 border-t border-base-300 pt-4 sm:col-span-2 sm:grid-cols-2">
                    <legend class="mb-2 text-sm font-semibold">Upload settings</legend>
                    <div>
                        <label for="share-max-video-size" class="text-sm font-medium">Maximum video size</label>
                        <div class="mt-1.5 flex gap-2">
                            <input id="share-max-video-size" v-model="maxVideoSize" type="number" min="0" step="any" class="input min-w-0 flex-1" placeholder="Server limit" aria-describedby="share-video-limit-hint" :disabled="busy" />
                            <select v-model="videoSizeUnit" class="select w-24" aria-label="Video size unit" :disabled="busy"><option>GiB</option><option>MiB</option></select>
                        </div>
                        <p id="share-video-limit-hint" class="mt-1.5 text-xs text-base-content/70">Leave empty to use the server limit<span v-if="serverConfig.MaxUploadFilesize > 0"> ({{ humanFileSize(serverConfig.MaxUploadFilesize) }})</span>.</p>
                    </div>
                    <div>
                        <label for="share-max-folder-size" class="text-sm font-medium">Total folder size limit</label>
                        <div class="mt-1.5 flex gap-2">
                            <input id="share-max-folder-size" v-model="maxFolderSize" type="number" min="0" step="any" class="input min-w-0 flex-1" placeholder="No folder limit" aria-describedby="share-folder-limit-hint" :disabled="busy" />
                            <select v-model="folderSizeUnit" class="select w-24" aria-label="Folder size unit" :disabled="busy"><option>GiB</option><option>MiB</option></select>
                        </div>
                        <p id="share-folder-limit-hint" class="mt-1.5 text-xs text-base-content/70">Includes videos in subfolders and pending uploads. Leave empty for no folder limit.</p>
                    </div>
                    <label class="flex items-start gap-2 sm:col-span-2">
                        <input v-model="returnUploadLink" type="checkbox" class="checkbox checkbox-sm mt-0.5" :disabled="busy" />
                        <span><span class="block text-sm font-medium">Give visitors public links to their uploads</span><span class="mt-1 block text-xs text-base-content/70">Links appear after processing and work independently of this share’s password or CAPTCHA.</span></span>
                    </label>
                </fieldset>
                <label class="flex items-center gap-2 sm:col-span-2">
                    <input v-model="captcha" type="checkbox" class="checkbox checkbox-sm" :disabled="busy || (!serverConfig.CaptchaEnabled && !captcha)" />
                    <span class="text-sm">Require CAPTCHA before access</span>
                </label>
                <p v-if="!serverConfig.CaptchaEnabled" class="text-xs text-base-content/60 sm:col-span-2">CAPTCHA is disabled in server configuration. You can remove it from existing links or enable it in server settings.</p>
                <p v-if="permission === 'upload'" class="text-sm text-base-content/70 sm:col-span-2">Visitors can send videos to this folder without seeing its contents.</p>
                <p v-if="permission !== 'read'" class="text-sm text-base-content/70 sm:col-span-2">Visitor uploads count toward your storage allowance.</p>
                <div class="flex items-center gap-2 sm:col-span-2">
                    <button class="btn btn-primary btn-sm" :disabled="busy">
                        <span v-if="busy" class="loading loading-spinner loading-xs"></span>
                        {{ editing ? 'Save changes' : 'Create share link' }}
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm" :disabled="busy" @click="editorDialog?.close()">Cancel</button>
                </div>
            </form>
            <p class="mt-4 text-xs text-base-content/70">Changes end existing visitor sessions. Individual video links continue to work independently.</p>
        </div>
        <form method="dialog" class="modal-backdrop"><button :disabled="busy">Close</button></form>
    </dialog>
</template>

<script setup lang="ts">
import { uploadLimitBytes, uploadLimitInput, type UploadSizeUnit } from '@/utils/uploadLimits';
interface Share {
    ID: number; FolderID: number; Name: string; Token: string; URL: string;
    AllowRead: boolean; AllowUpload: boolean; HasPassword: boolean; RequireCaptcha: boolean; ExpiresAt: string | null;
    MaxVideoSize: number; MaxFolderSize: number; ReturnUploadLink: boolean;
}
const dialog = ref<HTMLDialogElement | null>(null);
const editorDialog = ref<HTMLDialogElement | null>(null);
const conf = useRuntimeConfig();
const token = useToken();
const serverConfig = useServerConfig();
const folderID = ref(0);
const folderName = ref('');
const shares = ref<Share[]>([]);
const editing = ref<Share | null>(null);
const label = ref('');
const permission = ref('read');
const passwordMode = ref('none');
const password = ref('');
const expires = ref('');
const captcha = ref(false);
const maxVideoSize = ref<string | number>('');
const maxFolderSize = ref<string | number>('');
const videoSizeUnit = ref<UploadSizeUnit>('GiB');
const folderSizeUnit = ref<UploadSizeUnit>('GiB');
const returnUploadLink = ref(true);
const busy = ref(false);
const loading = ref(false);
const error = ref('');
const editorError = ref('');
const notice = ref('');
const headers = () => ({ Authorization: `Bearer ${token.value}` });
const message = (e: any) => typeof e.data === 'string' ? e.data : e.data?.message || e.data?.error || e.message;
const modeLabel = (share: Share) => share.AllowRead ? (share.AllowUpload ? 'View and upload' : 'View and download') : 'Upload only';
const shareURL = (share: Share) => new URL(share.URL, window.location.origin).href;

function reset() {
    editing.value = null; label.value = ''; permission.value = 'read'; passwordMode.value = 'none';
    password.value = ''; expires.value = ''; captcha.value = false; editorError.value = '';
    maxVideoSize.value = ''; maxFolderSize.value = ''; videoSizeUnit.value = 'GiB'; folderSizeUnit.value = 'GiB'; returnUploadLink.value = true;
}
function closeSharing() { editorDialog.value?.close(); reset(); }
function guardEditorClose(event: Event) { if (busy.value) event.preventDefault(); }
function create() { reset(); editorDialog.value?.showModal(); }
async function load() {
    loading.value = true;
    try { shares.value = await $fetch<Share[]>(`${conf.public.apiUrl}/folder-shares`, { query: { FolderID: folderID.value }, headers: headers() }); }
    catch (e) { error.value = message(e); }
    finally { loading.value = false; }
}
async function open(id: number, name: string) {
    reset(); error.value = ''; notice.value = ''; shares.value = [];
    folderID.value = id; folderName.value = name;
    dialog.value?.showModal();
    await load();
}
function edit(share: Share) {
    editing.value = share; label.value = share.Name;
    permission.value = share.AllowRead ? (share.AllowUpload ? 'both' : 'read') : 'upload';
    passwordMode.value = share.HasPassword ? 'keep' : 'none'; password.value = ''; captcha.value = share.RequireCaptcha;
    const videoLimit = uploadLimitInput(share.MaxVideoSize), folderLimit = uploadLimitInput(share.MaxFolderSize);
    maxVideoSize.value = videoLimit.value; videoSizeUnit.value = videoLimit.unit;
    maxFolderSize.value = folderLimit.value; folderSizeUnit.value = folderLimit.unit;
    returnUploadLink.value = share.ReturnUploadLink;
    expires.value = share.ExpiresAt ? new Date(new Date(share.ExpiresAt).getTime() - new Date(share.ExpiresAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
    editorError.value = '';
    editorDialog.value?.showModal();
}
async function save() {
    busy.value = true; editorError.value = ''; notice.value = '';
    try {
        if (passwordMode.value === 'set' && new TextEncoder().encode(password.value).length > 72) throw new Error('Password must be at most 72 bytes.');
        if (expires.value && new Date(expires.value).getTime() <= Date.now()) throw new Error('Choose a future expiration.');
        await $fetch(`${conf.public.apiUrl}/folder-shares${editing.value ? '/' + editing.value.ID : ''}`, {
            method: editing.value ? 'PUT' : 'POST', headers: headers(),
            body: { FolderID: folderID.value, Name: label.value, AllowRead: permission.value !== 'upload', AllowUpload: permission.value !== 'read',
                MaxVideoSize: uploadLimitBytes(maxVideoSize.value, videoSizeUnit.value), MaxFolderSize: uploadLimitBytes(maxFolderSize.value, folderSizeUnit.value), ReturnUploadLink: returnUploadLink.value,
                RequireCaptcha: captcha.value, ExpiresAt: expires.value ? new Date(expires.value).toISOString() : null,
                ...(passwordMode.value !== 'keep' ? { Password: passwordMode.value === 'set' ? password.value : '' } : {}) },
        });
        notice.value = editing.value ? 'Share settings updated.' : 'Share link created.';
        editorDialog.value?.close(); await load();
    } catch (e) { editorError.value = message(e); }
    finally { busy.value = false; }
}
async function revoke(share: Share) {
    busy.value = true; error.value = ''; notice.value = '';
    try {
        await $fetch(`${conf.public.apiUrl}/folder-shares/${share.ID}`, { method: 'DELETE', headers: headers() });
        if (editing.value?.ID === share.ID) reset();
        shares.value = shares.value.filter(item => item.ID !== share.ID); notice.value = 'Share link revoked.';
    } catch (e) { error.value = message(e); }
    finally { busy.value = false; }
}
async function copy(share: Share) {
    try { await navigator.clipboard.writeText(shareURL(share)); notice.value = 'Link copied.'; }
    catch { error.value = 'Select the link text to copy it manually.'; }
}
defineExpose({ open });
</script>
