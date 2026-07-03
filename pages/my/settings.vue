<template>
    <div class="flex grow flex-col">
        <PageHeader title="Account settings" description="Password, player protection, and API access." />

        <!-- Tabs -->
        <div role="tablist" class="tabs tabs-box mb-6 w-fit">
            <a role="tab" class="tab gap-2" :class="{ 'tab-active': activeTab === 'security' }"
                @click="activeTab = 'security'">
                <Icon name="lucide:shield-check" class="h-4 w-4" />
                Security
            </a>
            <a role="tab" class="tab gap-2" :class="{ 'tab-active': activeTab === 'apikeys' }"
                @click="activeTab = 'apikeys'">
                <Icon name="lucide:key" class="h-4 w-4" />
                API keys
                <span v-if="apiKeys.length > 0" class="badge badge-sm border-none bg-primary/10 text-primary tabular-nums">{{ apiKeys.length }}</span>
            </a>
        </div>

        <!-- Notifications -->
        <div v-if="err || successMsg" class="mb-4 flex flex-col gap-2">
            <div v-if="err" role="alert" class="alert alert-error">
                <Icon name="lucide:alert-circle" class="h-5 w-5 shrink-0" />
                <span>{{ err }}</span>
                <button @click="err = ''" class="btn btn-square btn-ghost btn-sm" aria-label="Dismiss">
                    <Icon name="lucide:x" class="h-4 w-4" />
                </button>
            </div>
            <div v-if="successMsg" role="status" class="alert alert-success">
                <Icon name="lucide:check-circle-2" class="h-5 w-5 shrink-0" />
                <span>{{ successMsg }}</span>
                <button @click="successMsg = ''" class="btn btn-square btn-ghost btn-sm" aria-label="Dismiss">
                    <Icon name="lucide:x" class="h-4 w-4" />
                </button>
            </div>
        </div>

        <!-- SECURITY TAB -->
        <div v-if="activeTab === 'security'" class="flex max-w-2xl flex-col gap-6">
            <!-- Password Update -->
            <section class="rounded-box border border-base-300 bg-base-100 p-5">
                <h2 class="text-sm font-semibold">Password</h2>
                <p class="mt-0.5 mb-4 max-w-[65ch] text-sm text-base-content/70">
                    Changing your password logs you out of all other sessions.
                </p>

                <form @submit.prevent="update()" class="flex max-w-md flex-col gap-3">
                    <label class="flex flex-col gap-1.5">
                        <span class="text-sm font-medium">New password</span>
                        <div class="relative">
                            <input
                                v-model="newPassword"
                                :type="showPassword ? 'text' : 'password'"
                                placeholder="At least 8 characters"
                                class="input w-full pr-11"
                                :disabled="isLoading"
                                autocomplete="new-password"
                            />
                            <button
                                type="button"
                                @click="showPassword = !showPassword"
                                class="absolute top-1/2 right-3 -translate-y-1/2 text-base-content/50 transition-colors hover:text-base-content"
                                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                            >
                                <Icon :name="showPassword ? 'lucide:eye-off' : 'lucide:eye'" class="h-4 w-4" />
                            </button>
                        </div>
                        <div class="mt-1 flex gap-1" aria-hidden="true">
                            <div v-for="i in 4" :key="i"
                                :class="['h-1 flex-1 rounded-full transition-colors', passwordStrength >= i ? 'bg-success' : 'bg-base-300']">
                            </div>
                        </div>
                        <span v-if="newPassword.length > 0 && newPassword.length < 8" class="text-xs text-error">
                            Password is too short (minimum 8 characters).
                        </span>
                    </label>
                    <div>
                        <button type="submit" class="btn btn-primary btn-sm"
                            :disabled="isLoading || (newPassword.length > 0 && newPassword.length < 8)">
                            <span v-if="isLoading" class="loading loading-spinner loading-xs"></span>
                            Save changes
                        </button>
                    </div>
                </form>
            </section>

            <!-- Player protection -->
            <section class="rounded-box border border-base-300 bg-base-100 p-5">
                <h2 class="mb-4 text-sm font-semibold">Player protection</h2>
                <label class="flex cursor-pointer items-center justify-between gap-4">
                    <span class="flex flex-col gap-0.5">
                        <span class="text-sm font-medium">Player captcha</span>
                        <span class="max-w-[55ch] text-xs text-base-content/60">
                            Require viewers to complete a challenge before watching your videos.
                        </span>
                    </span>
                    <input
                        type="checkbox"
                        class="toggle toggle-primary"
                        v-model="settings.EnablePlayerCaptcha"
                        @change="update()"
                        :disabled="isLoading"
                    />
                </label>
            </section>
        </div>

        <!-- API KEYS TAB -->
        <div v-if="activeTab === 'apikeys'" class="flex flex-col gap-6">
            <!-- New Key (shown once) -->
            <div v-if="createdKey" class="rounded-box border border-success/40 bg-success/10 p-5">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <h3 class="flex items-center gap-2 text-sm font-semibold">
                            <Icon name="lucide:key-round" class="h-4 w-4 text-success" />
                            Key generated
                        </h3>
                        <p class="mt-0.5 text-sm text-base-content/70">Copy it now — it won't be shown again.</p>
                    </div>
                    <button @click="createdKey = null" class="btn btn-square btn-ghost btn-sm" aria-label="Dismiss">
                        <Icon name="lucide:x" class="h-4 w-4" />
                    </button>
                </div>
                <div class="mt-3 flex flex-col gap-2 md:flex-row">
                    <code class="flex-1 rounded-field border border-base-300 bg-base-100 p-3 font-mono text-sm break-all">{{ createdKey.key }}</code>
                    <button @click="copyToClipboard(createdKey.key)" class="btn btn-primary btn-sm gap-2 md:self-center">
                        <Icon name="lucide:copy" class="h-4 w-4" />
                        Copy key
                    </button>
                </div>
            </div>

            <!-- Create New Key -->
            <section class="max-w-2xl rounded-box border border-base-300 bg-base-100 p-5">
                <h2 class="mb-4 text-sm font-semibold">Create API key</h2>
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label class="flex flex-col gap-1.5">
                        <span class="text-sm font-medium">Name</span>
                        <input
                            v-model="newKeyName"
                            type="text"
                            placeholder="e.g. Personal server"
                            class="input input-sm"
                            :disabled="isLoading"
                        />
                    </label>
                    <label class="flex flex-col gap-1.5">
                        <span class="text-sm font-medium">Expiration <span class="font-normal text-base-content/60">(optional)</span></span>
                        <input
                            v-model="newKeyExpiresAt"
                            type="datetime-local"
                            class="input input-sm"
                            :disabled="isLoading"
                        />
                    </label>
                </div>
                <div class="mt-4">
                    <button @click="createApiKey" class="btn btn-primary btn-sm" :disabled="isLoading || newKeyName.length < 3">
                        Generate key
                    </button>
                </div>
            </section>

            <!-- API Keys Table -->
            <div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
                <table class="table table-sm">
                    <thead>
                        <tr class="border-base-300 text-xs text-base-content/70">
                            <th class="font-medium">Name</th>
                            <th class="font-medium">Prefix</th>
                            <th class="font-medium">Last used</th>
                            <th class="font-medium">Expires</th>
                            <th class="text-right font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="key in apiKeys" :key="key.ID" class="group border-base-300 hover:bg-base-200/60">
                            <td class="font-medium">{{ key.name }}</td>
                            <td>
                                <code class="rounded-selector bg-base-200 px-2 py-0.5 font-mono text-xs">{{ key.prefix }}</code>
                            </td>
                            <td>
                                <span v-if="key.last_used_at" :title="formatDate(key.last_used_at)">
                                    {{ dayjs(key.last_used_at).fromNow() }}
                                </span>
                                <span v-else class="text-base-content/50">Never</span>
                            </td>
                            <td>
                                <span v-if="key.expires_at"
                                    :class="['flex items-center gap-1.5', isExpired(key.expires_at) ? 'font-medium text-error' : '']">
                                    <Icon v-if="isExpired(key.expires_at)" name="lucide:alert-circle" class="h-3.5 w-3.5" />
                                    {{ formatDate(key.expires_at) }}
                                </span>
                                <span v-else class="text-base-content/50">Never</span>
                            </td>
                            <td class="text-right">
                                <div class="flex justify-end gap-1">
                                    <button @click="fetchAuditLogs(key)" class="btn btn-square btn-ghost btn-sm"
                                        title="View audit log" aria-label="View audit log">
                                        <Icon name="lucide:scroll-text" class="h-4 w-4" />
                                    </button>
                                    <button @click="openDeleteModal(key)"
                                        class="btn btn-square btn-ghost btn-sm text-error" title="Revoke key"
                                        aria-label="Revoke key">
                                        <Icon name="lucide:trash-2" class="h-4 w-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                        <tr v-if="apiKeys.length === 0">
                            <td colspan="5">
                                <div class="flex flex-col items-center justify-center gap-1 py-14 text-center">
                                    <Icon name="lucide:key" class="h-6 w-6 text-base-content/30" />
                                    <p class="text-sm font-medium">No API keys yet</p>
                                    <p class="text-sm text-base-content/60">Generate one above to use the HTTP API.</p>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Modals -->
        <Teleport to="body">
            <dialog id="delete_key_modal" class="modal">
                <div class="modal-box">
                    <h3 class="mb-1 flex items-center gap-2 text-base font-semibold text-error">
                        <Icon name="lucide:alert-triangle" class="h-5 w-5" />
                        Revoke “{{ keyToDelete?.name }}”?
                    </h3>
                    <p class="text-sm text-base-content/70">
                        Any application using this key immediately loses access. This cannot be undone.
                    </p>
                    <div class="modal-action">
                        <button @click="keyToDelete = null" class="btn btn-ghost btn-sm" onclick="delete_key_modal.close()">Keep it</button>
                        <button @click="confirmDeleteApiKey" class="btn btn-error btn-sm" :disabled="isLoading">
                            <span v-if="isLoading" class="loading loading-spinner loading-xs"></span>
                            Revoke key
                        </button>
                    </div>
                </div>
                <form method="dialog" class="modal-backdrop">
                    <button @click="keyToDelete = null">close</button>
                </form>
            </dialog>

            <dialog id="audit_logs_modal" class="modal">
                <div class="modal-box w-11/12 max-w-4xl overflow-hidden bg-base-100 p-0">
                    <div class="flex items-center justify-between border-b border-base-300 p-4">
                        <div>
                            <h3 class="text-base font-semibold">Audit log</h3>
                            <p class="text-xs text-base-content/60">{{ auditingKey?.name }}</p>
                        </div>
                        <button onclick="audit_logs_modal.close()" class="btn btn-square btn-ghost btn-sm" aria-label="Close">
                            <Icon name="lucide:x" class="h-4 w-4" />
                        </button>
                    </div>

                    <div class="max-h-[60vh] overflow-x-auto">
                        <table class="table table-sm w-full">
                            <thead class="sticky top-0 z-(--z-dropdown) border-b border-base-300 bg-base-100">
                                <tr class="text-xs text-base-content/70">
                                    <th class="font-medium">Method</th>
                                    <th class="font-medium">Path</th>
                                    <th class="font-medium">IP address</th>
                                    <th class="text-right font-medium">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(log, index) in auditLogs" :key="index" class="border-base-300 hover:bg-base-200/60">
                                    <td>
                                        <span class="badge badge-ghost badge-sm font-mono">{{ log.Method }}</span>
                                    </td>
                                    <td class="font-mono text-xs text-base-content/80">{{ log.Path }}</td>
                                    <td class="font-mono text-xs tabular-nums text-base-content/80">{{ log.IP }}</td>
                                    <td class="text-right text-xs tabular-nums text-base-content/70">
                                        {{ formatDate(log.CreatedAt) }}
                                    </td>
                                </tr>
                                <tr v-if="auditLogs.length === 0 && !isAuditLoading">
                                    <td colspan="4" class="py-16 text-center text-sm text-base-content/50">
                                        No usage recorded for this key yet.
                                    </td>
                                </tr>
                                <tr v-if="isAuditLoading">
                                    <td colspan="4" class="p-0">
                                        <div class="flex flex-col gap-1.5 p-4" aria-hidden="true">
                                            <div v-for="i in 4" :key="i" class="skeleton h-7 w-full rounded-selector"></div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="flex justify-end border-t border-base-300 p-3">
                        <button onclick="audit_logs_modal.close()" class="btn btn-ghost btn-sm">Close</button>
                    </div>
                </div>
                <form method="dialog" class="modal-backdrop">
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

