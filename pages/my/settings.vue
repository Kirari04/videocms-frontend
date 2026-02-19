<template>
    <div class="flex flex-col grow gap-8">
        <!-- Page Header -->
        <div class="flex flex-col gap-1">
            <h1 class="text-3xl font-extrabold tracking-tight">Account Settings</h1>
            <div class="text-sm breadcrumbs opacity-70">
                <ul>
                    <li><nuxtLink to="/my">Dashboard</nuxtLink></li>
                    <li>Settings</li>
                </ul>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <!-- Sidebar Navigation -->
            <div class="lg:col-span-1">
                <div class="card bg-base-100 shadow-xl border border-base-200 sticky top-4">
                    <div class="card-body p-2">
                        <ul class="menu menu-md w-full gap-1">
                            <li>
                                <button 
                                    @click="activeTab = 'security'" 
                                    :class="['rounded-lg py-3 transition-all', activeTab === 'security' ? 'active bg-primary text-primary-content font-bold shadow-md shadow-primary/20' : 'hover:bg-base-200 opacity-70 hover:opacity-100']"
                                >
                                    <Icon name="lucide:shield-check" class="w-5 h-5" />
                                    Security & Auth
                                </button>
                            </li>
                            <li>
                                <button 
                                    @click="activeTab = 'apikeys'" 
                                    :class="['rounded-lg py-3 transition-all', activeTab === 'apikeys' ? 'active bg-primary text-primary-content font-bold shadow-md shadow-primary/20' : 'hover:bg-base-200 opacity-70 hover:opacity-100']"
                                >
                                    <Icon name="lucide:key" class="w-5 h-5" />
                                    API Management
                                    <span v-if="apiKeys.length > 0" class="badge badge-sm badge-secondary ml-auto">{{ apiKeys.length }}</span>
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Content Area -->
            <div class="lg:col-span-3 flex flex-col gap-6">
                <!-- Notifications/Toasts (Inline) -->
                <div v-if="err || successMsg" class="animate-in fade-in slide-in-from-top-4 duration-300">
                    <div v-if="err" class="alert alert-error shadow-lg">
                        <Icon name="lucide:alert-circle" class="w-6 h-6" />
                        <div class="flex-1">
                            <h3 class="font-bold">Error</h3>
                            <div class="text-xs">{{ err }}</div>
                        </div>
                        <button @click="err = ''" class="btn btn-sm btn-ghost btn-circle">✕</button>
                    </div>
                    <div v-if="successMsg" class="alert alert-success shadow-lg">
                        <Icon name="lucide:check-circle" class="w-6 h-6" />
                        <div class="flex-1">
                            <h3 class="font-bold">Success</h3>
                            <div class="text-xs">{{ successMsg }}</div>
                        </div>
                        <button @click="successMsg = ''" class="btn btn-sm btn-ghost btn-circle">✕</button>
                    </div>
                </div>

                <!-- SECURITY TAB -->
                <div v-if="activeTab === 'security'" class="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <!-- Password Update -->
                    <div class="card bg-base-100 shadow-xl border border-base-200 overflow-hidden">
                        <div class="p-1 bg-gradient-to-r from-primary to-accent"></div>
                        <div class="card-body">
                            <h2 class="card-title text-xl mb-2">
                                <Icon name="lucide:lock" class="text-primary" />
                                Update Password
                            </h2>
                            <p class="text-sm opacity-60 mb-6">Changing your password will log you out of all other sessions for security.</p>
                            
                            <form @submit.prevent="update()" class="flex flex-col gap-4 max-w-md">
                                <div class="form-control flex flex-col gap-1">
                                    <label class="label p-0"><span class="label-text font-bold">New Password</span></label>
                                    <div class="relative">
                                        <input 
                                            v-model="newPassword" 
                                            :type="showPassword ? 'text' : 'password'" 
                                            placeholder="••••••••••••" 
                                            class="input input-bordered w-full pr-12 focus:input-primary transition-all"
                                            :disabled="isLoading"
                                        />
                                        <button 
                                            type="button" 
                                            @click="showPassword = !showPassword" 
                                            class="absolute right-4 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
                                        >
                                            <Icon :name="showPassword ? 'lucide:eye-off' : 'lucide:eye'" class="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div class="mt-2 flex gap-1">
                                        <div v-for="i in 4" :key="i" :class="['h-1.5 flex-1 rounded-full transition-all', passwordStrength >= i ? 'bg-success' : 'bg-base-300']"></div>
                                    </div>
                                    <label class="label p-0" v-if="newPassword.length > 0 && newPassword.length < 8">
                                        <span class="label-text-alt text-error font-medium">Password is too short (min 8 chars)</span>
                                    </label>
                                </div>
                                <button type="submit" class="btn btn-primary w-full mt-2 shadow-lg" :disabled="isLoading || (newPassword.length > 0 && newPassword.length < 8)">
                                    <span v-if="isLoading" class="loading loading-spinner loading-xs"></span>
                                    Update Account
                                </button>
                            </form>
                        </div>
                    </div>

                    <!-- Additional Security Preferences -->
                    <div class="card bg-base-100 shadow-xl border border-base-200">
                        <div class="card-body">
                            <h2 class="card-title text-xl mb-4">
                                <Icon name="lucide:shield" class="text-secondary" />
                                Security Preferences
                            </h2>
                            <div class="space-y-4">
                                <div class="flex items-center justify-between p-4 rounded-xl bg-base-200/50 border border-base-200 hover:bg-base-200 transition-colors">
                                    <div class="flex flex-col gap-1">
                                        <span class="font-bold">Player Captcha</span>
                                        <span class="text-xs opacity-60">Require viewers to complete a challenge before watching your videos.</span>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        class="toggle toggle-primary toggle-lg" 
                                        v-model="settings.EnablePlayerCaptcha" 
                                        @change="update()"
                                        :disabled="isLoading"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- API KEYS TAB -->
                <div v-if="activeTab === 'apikeys'" class="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <!-- New Key Alert (Success State) -->
                    <div v-if="createdKey" class="card bg-success text-success-content shadow-2xl">
                        <div class="card-body py-6">
                            <div class="flex items-start justify-between gap-4">
                                <div class="flex flex-col gap-2">
                                    <h3 class="font-black text-2xl flex items-center gap-2">
                                        <Icon name="lucide:party-popper" />
                                        Key Generated!
                                    </h3>
                                    <p class="text-sm font-medium opacity-90">Copy this key now. For your security, we won't show it again.</p>
                                </div>
                                <button @click="createdKey = null" class="btn btn-sm btn-circle btn-ghost text-success-content">✕</button>
                            </div>
                            <div class="mt-4 flex flex-col md:flex-row gap-3">
                                <div class="bg-black/20 p-4 rounded-xl flex-1 font-mono text-sm break-all border border-white/10 backdrop-blur-sm">
                                    {{ createdKey.key }}
                                </div>
                                <button @click="copyToClipboard(createdKey.key)" class="btn btn-secondary shadow-xl min-w-[120px]">
                                    <Icon name="lucide:copy" />
                                    Copy Key
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Create New Key -->
                    <div class="card bg-base-100 shadow-xl border border-base-200 overflow-hidden">
                        <div class="p-1 bg-gradient-to-r from-secondary to-primary"></div>
                        <div class="card-body">
                            <h2 class="card-title text-xl mb-4">
                                <Icon name="lucide:plus-circle" class="text-secondary" />
                                Create New API Access
                            </h2>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="form-control flex flex-col gap-1">
                                    <label class="label p-0"><span class="label-text font-bold">Friendly Name</span></label>
                                    <input 
                                        v-model="newKeyName" 
                                        type="text" 
                                        placeholder="e.g. Personal Server" 
                                        class="input input-bordered focus:input-secondary"
                                        :disabled="isLoading"
                                    />
                                </div>
                                <div class="form-control flex flex-col gap-1">
                                    <label class="label p-0"><span class="label-text font-bold">Expiration (Optional)</span></label>
                                    <input 
                                        v-model="newKeyExpiresAt" 
                                        type="datetime-local" 
                                        class="input input-bordered focus:input-secondary"
                                        :disabled="isLoading"
                                    />
                                </div>
                            </div>
                            <div class="card-actions justify-end mt-6">
                                <button @click="createApiKey" class="btn btn-secondary px-8 shadow-lg" :disabled="isLoading || newKeyName.length < 3">
                                    <Icon name="lucide:zap" class="w-4 h-4" />
                                    Generate Access Key
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- API Keys Table -->
                    <div class="card bg-base-100 shadow-xl border border-base-200">
                        <div class="card-body p-0">
                            <div class="p-6 pb-2">
                                <h2 class="card-title text-xl">
                                    <Icon name="lucide:terminal" class="text-primary" />
                                    Existing API Keys
                                </h2>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="table table-zebra w-full">
                                    <thead class="bg-base-200/50">
                                        <tr class="text-xs uppercase tracking-wider">
                                            <th class="pl-6 py-4">Name</th>
                                            <th class="py-4">Prefix</th>
                                            <th class="py-4">Last Used</th>
                                            <th class="py-4">Expires</th>
                                            <th class="pr-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody class="text-sm">
                                        <tr v-for="key in apiKeys" :key="key.ID" class="group hover:bg-base-200/50 transition-colors">
                                            <td class="pl-6 py-4 font-black">{{ key.name }}</td>
                                            <td class="py-4">
                                                <code class="px-2 py-1 bg-primary/10 text-primary rounded font-mono text-xs">{{ key.prefix }}</code>
                                            </td>
                                            <td class="py-4">
                                                <div v-if="key.last_used_at" class="flex flex-col gap-1">
                                                    <span class="font-medium">{{ formatDate(key.last_used_at) }}</span>
                                                    <span class="text-[10px] opacity-40 uppercase font-bold">{{ dayjs(key.last_used_at).fromNow() }}</span>
                                                </div>
                                                <span v-else class="badge badge-ghost badge-sm opacity-50">Never</span>
                                            </td>
                                            <td class="py-4">
                                                <div v-if="key.expires_at" :class="['flex items-center gap-2', isExpired(key.expires_at) ? 'text-error font-bold' : 'opacity-70']">
                                                    <Icon v-if="isExpired(key.expires_at)" name="lucide:alert-circle" class="w-4 h-4" />
                                                    {{ formatDate(key.expires_at) }}
                                                </div>
                                                <span v-else class="text-xs opacity-40 font-medium italic">Never</span>
                                            </td>
                                            <td class="pr-6 py-4 text-right">
                                                <div class="flex justify-end gap-1">
                                                    <button @click="fetchAuditLogs(key)" class="btn btn-ghost btn-sm btn-square" title="View Audit Logs">
                                                        <Icon name="lucide:list" class="w-4 h-4" />
                                                    </button>
                                                    <button @click="openDeleteModal(key)" class="btn btn-ghost btn-sm btn-square text-error opacity-0 group-hover:opacity-100 transition-opacity" title="Revoke Key">
                                                        <Icon name="lucide:trash-2" class="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr v-if="apiKeys.length === 0">
                                            <td colspan="5" class="py-16 text-center">
                                                <div class="flex flex-col items-center gap-3 opacity-30">
                                                    <Icon name="lucide:key" class="w-12 h-12" />
                                                    <p class="font-medium italic">No API keys generated yet.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modals -->
        <Teleport to="body">
            <dialog id="delete_key_modal" class="modal">
                <div class="modal-box border border-error/20 shadow-2xl">
                    <div class="flex items-center gap-4 text-error mb-6">
                        <div class="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
                            <Icon name="lucide:alert-triangle" class="w-6 h-6" />
                        </div>
                        <h3 class="font-black text-2xl">Revoke Access?</h3>
                    </div>
                    <p class="opacity-70 leading-relaxed">
                        Are you absolutely sure you want to revoke the key <span class="badge badge-error badge-outline font-bold">{{ keyToDelete?.name }}</span>? 
                        Any application using this key will immediately lose access.
                    </p>
                    <div class="modal-action">
                        <button @click="keyToDelete = null" class="btn btn-ghost px-8" onclick="delete_key_modal.close()">Keep it</button>
                        <button @click="confirmDeleteApiKey" class="btn btn-error px-8 shadow-lg shadow-error/20" :disabled="isLoading">
                            <span v-if="isLoading" class="loading loading-spinner loading-xs"></span>
                            Revoke Key
                        </button>
                    </div>
                </div>
                <form method="dialog" class="modal-backdrop bg-black/40 backdrop-blur-sm">
                    <button @click="keyToDelete = null">close</button>
                </form>
            </dialog>

            <dialog id="audit_logs_modal" class="modal">
                <div class="modal-box w-11/12 max-w-4xl border border-base-200 shadow-2xl p-0 overflow-hidden bg-base-100">
                    <div class="p-6 border-b border-base-200 flex items-center justify-between bg-base-200/30">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <Icon name="lucide:list" class="w-5 h-5" />
                            </div>
                            <div>
                                <h3 class="font-black text-xl">Audit Logs</h3>
                                <p class="text-xs opacity-50 font-bold uppercase tracking-widest">{{ auditingKey?.name }}</p>
                            </div>
                        </div>
                        <button onclick="audit_logs_modal.close()" class="btn btn-sm btn-circle btn-ghost">✕</button>
                    </div>

                    <div class="overflow-x-auto max-h-[60vh]">
                        <table class="table table-sm table-zebra w-full">
                            <thead class="sticky top-0 bg-base-100 z-10 border-b border-base-200">
                                <tr class="text-xs opacity-50 uppercase tracking-tighter">
                                    <th class="py-4 pl-6">Method</th>
                                    <th class="py-4">Path</th>
                                    <th class="py-4">IP Address</th>
                                    <th class="py-4 pr-6 text-right">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(log, index) in auditLogs" :key="index" class="hover:bg-base-200/50 transition-colors">
                                    <td class="pl-6 font-bold py-3">
                                        <span :class="['badge badge-sm font-black', log.Method === 'GET' ? 'badge-info' : (log.Method === 'DELETE' ? 'badge-error' : 'badge-primary')]">
                                            {{ log.Method }}
                                        </span>
                                    </td>
                                    <td class="font-mono text-[11px] opacity-70">{{ log.Path }}</td>
                                    <td class="font-mono text-[11px] opacity-70">{{ log.IP }}</td>
                                    <td class="pr-6 text-right text-[11px] font-medium opacity-60">
                                        {{ formatDate(log.CreatedAt) }}
                                    </td>
                                </tr>
                                <tr v-if="auditLogs.length === 0 && !isAuditLoading">
                                    <td colspan="4" class="py-20 text-center opacity-30 italic">No usage logs found for this key.</td>
                                </tr>
                                <tr v-if="isAuditLoading">
                                    <td colspan="4" class="py-20 text-center">
                                        <span class="loading loading-spinner loading-md opacity-20"></span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="p-4 bg-base-200/30 border-t border-base-200 flex justify-end">
                        <button onclick="audit_logs_modal.close()" class="btn btn-ghost px-8">Close Logs</button>
                    </div>
                </div>
                <form method="dialog" class="modal-backdrop bg-black/40 backdrop-blur-sm">
                    <button>close</button>
                </form>
            </dialog>
        </Teleport>
    </div>
</template>

<script lang="ts" setup>
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

definePageMeta({
    layout: "panel",
    middleware: "auth",
});

const conf = useRuntimeConfig();
const token = useToken();
const err = ref("");
const successMsg = ref("");
const isLoading = ref(false);
const activeTab = ref("security");
const showPassword = ref(false);

const settings = ref<{
    EnablePlayerCaptcha: boolean;
}>({
    EnablePlayerCaptcha: false,
})

const newPassword = ref("");

const passwordStrength = computed(() => {
    let s = 0;
    if (newPassword.value.length >= 8) s++;
    if (newPassword.value.length >= 12) s++;
    if (/[A-Z]/.test(newPassword.value)) s++;
    if (/[0-9]/.test(newPassword.value) || /[^A-Za-z0-9]/.test(newPassword.value)) s++;
    return s;
});

interface ApiKey {
    ID: number;
    name: string;
    key?: string; // Only present on creation
    prefix?: string; // Present in list
    expires_at?: string;
    last_used_at?: string;
}

interface ApiKeyAudit {
    Method: string;
    Path: string;
    IP: string;
    CreatedAt: string;
}

const apiKeys = ref<ApiKey[]>([]);
const newKeyName = ref("");
const newKeyExpiresAt = ref("");
const createdKey = ref<ApiKey | null>(null);
const keyToDelete = ref<ApiKey | null>(null);

const auditLogs = ref<ApiKeyAudit[]>([]);
const auditingKey = ref<ApiKey | null>(null);
const isAuditLoading = ref(false);

onMounted(() => {
    load()
    loadApiKeys()
})

async function load() {
    isLoading.value = true;
    try {
        const data = await $fetch<{
            EnablePlayerCaptcha: boolean;
        }>(`${conf.public.apiUrl}/account/settings`, {
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
        });
        if (data) {
            settings.value = data;
            newPassword.value = "";
        }
    } catch (error: any) {
        err.value = `${error.data ? error.data : error.message}`;
    }
    isLoading.value = false;
}

async function loadApiKeys() {
    isLoading.value = true;
    try {
        const data = await $fetch<ApiKey[]>(`${conf.public.apiUrl}/apikeys`, {
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
        });
        apiKeys.value = data || [];
    } catch (error: any) {
        err.value = `${error.data ? error.data : error.message}`;
    }
    isLoading.value = false;
}

async function createApiKey() {
    isLoading.value = true;
    try {
        const data = await $fetch<ApiKey>(`${conf.public.apiUrl}/apikey`, {
            method: "post",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: {
                name: newKeyName.value,
                expires_at: newKeyExpiresAt.value ? new Date(newKeyExpiresAt.value).toISOString() : undefined,
            }
        });
        createdKey.value = data;
        newKeyName.value = "";
        newKeyExpiresAt.value = "";
        showSuccess("New access key generated successfully.");
        loadApiKeys();
    } catch (error: any) {
        err.value = `${error.data ? error.data : error.message}`;
    }
    isLoading.value = false;
}

function openDeleteModal(key: ApiKey) {
    keyToDelete.value = key;
    (document.getElementById("delete_key_modal") as HTMLDialogElement).showModal();
}

async function confirmDeleteApiKey() {
    if (!keyToDelete.value) return;
    isLoading.value = true;
    try {
        await $fetch(`${conf.public.apiUrl}/apikey/${keyToDelete.value.ID}`, {
            method: "delete",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
        });
        (document.getElementById("delete_key_modal") as HTMLDialogElement).close();
        keyToDelete.value = null;
        showSuccess("API access revoked.");
        loadApiKeys();
    } catch (error: any) {
        err.value = `${error.data ? error.data : error.message}`;
    }
    isLoading.value = false;
}

async function fetchAuditLogs(key: ApiKey) {
    auditingKey.value = key;
    isAuditLoading.value = true;
    auditLogs.value = [];
    (document.getElementById("audit_logs_modal") as HTMLDialogElement).showModal();
    try {
        const data = await $fetch<ApiKeyAudit[]>(`${conf.public.apiUrl}/apikey/${key.ID}/audit`, {
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
        });
        auditLogs.value = data || [];
    } catch (error: any) {
        err.value = `${error.data ? error.data : error.message}`;
    }
    isAuditLoading.value = false;
}

function copyToClipboard(text: string | undefined) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showSuccess("Key copied to clipboard.");
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function isExpired(dateStr: string) {
    return new Date(dateStr) < new Date();
}

function showSuccess(msg: string) {
    successMsg.value = msg;
    setTimeout(() => {
        successMsg.value = "";
    }, 4000);
}

async function update() {
    isLoading.value = true;
    try {
        await $fetch<{
            EnablePlayerCaptcha: boolean;
        }>(`${conf.public.apiUrl}/account/settings`, {
            method: "put",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: {
                EnablePlayerCaptcha: settings.value?.EnablePlayerCaptcha,
                NewPassword: newPassword.value.length >= 8 ? newPassword.value : undefined,
            }
        });
        showSuccess("Account settings saved.");
        load();
    } catch (error: any) {
        err.value = `${error.data ? error.data : error.message}`;
    }
    isLoading.value = false;
}

</script>

<style scoped>
.animate-in {
    animation-fill-mode: forwards;
}

@keyframes slide-in-from-bottom-4 {
    from { transform: translateY(1rem); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

@keyframes slide-in-from-top-4 {
    from { transform: translateY(-1rem); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

@keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
}
</style>