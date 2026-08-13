<template>
    <div class="flex h-full grow flex-col">
        <!-- Notifications -->
        <div class="toast toast-top toast-end z-(--z-toast)">
            <div role="alert" class="alert alert-error" v-if="err">
                <Icon name="lucide:alert-circle" class="h-5 w-5 shrink-0" />
                <span>{{ err }}</span>
            </div>
            <div role="status" class="alert alert-success" v-if="successMsg">
                <Icon name="lucide:check-circle-2" class="h-5 w-5 shrink-0" />
                <span>{{ successMsg }}</span>
            </div>
        </div>

        <!-- Access Denied -->
        <div v-if="accountData && !accountData.Admin" role="alert" class="alert alert-error">
            <Icon name="lucide:shield-alert" class="h-5 w-5 shrink-0" />
            <span>You don't have access to this page.</span>
        </div>

        <!-- Main Content -->
        <div v-if="accountData?.Admin" class="flex grow flex-col">
            <PageHeader title="Users" description="Accounts, permissions, and storage quotas.">
                <button @click="load()" :disabled="isLoading" class="btn btn-ghost btn-sm gap-2">
                    <Icon name="lucide:refresh-cw" class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
                    Reload
                </button>
                <button @click="openCreateModal()" class="btn btn-primary btn-sm gap-2">
                    <Icon name="lucide:plus" class="h-4 w-4" />
                    Create user
                </button>
            </PageHeader>

            <!-- Search -->
            <div class="mb-4 w-full max-w-md">
                <label class="input input-sm w-full">
                    <Icon name="lucide:search" class="h-3.5 w-3.5 text-base-content/50" />
                    <input type="search" placeholder="Search by username or email" v-model="searchQuery"
                        @keyup.enter="handleSearch" />
                    <button v-if="searchQuery" @click="searchQuery = ''; handleSearch()"
                        class="text-base-content/50 hover:text-base-content" aria-label="Clear search">
                        <Icon name="lucide:x" class="h-3.5 w-3.5" />
                    </button>
                </label>
            </div>

            <!-- Users Table -->
            <div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
                <table class="table table-sm">
                    <thead>
                        <tr class="border-base-300 text-xs text-base-content/70">
                            <th class="font-medium">User</th>
                            <th class="font-medium">Role</th>
                            <th class="font-medium">Storage</th>
                            <th class="text-right font-medium">Balance</th>
                            <th class="text-right font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="isLoading && !users.length">
                            <td colspan="5" class="p-0">
                                <div class="flex flex-col gap-1.5 p-4" aria-hidden="true">
                                    <div v-for="i in 5" :key="i" class="skeleton h-9 w-full rounded-selector"></div>
                                </div>
                            </td>
                        </tr>
                        <tr v-else-if="users.length === 0">
                            <td colspan="5">
                                <div class="flex flex-col items-center justify-center gap-1 py-14 text-center">
                                    <Icon name="lucide:users" class="h-6 w-6 text-base-content/30" />
                                    <p class="text-sm font-medium">No users found</p>
                                    <p v-if="searchQuery" class="text-sm text-base-content/60">Try a different search.</p>
                                </div>
                            </td>
                        </tr>
                        <tr v-for="user in users" :key="user.ID" class="border-base-300 hover:bg-base-200/60">
                            <td>
                                <div class="flex items-center gap-3">
                                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral text-xs font-medium text-neutral-content"
                                        aria-hidden="true">
                                        {{ user.Username ? user.Username.substring(0, 2).toUpperCase() : '??' }}
                                    </div>
                                    <div class="flex min-w-0 flex-col">
                                        <span class="truncate font-medium">{{ user.Username }}</span>
                                        <span class="truncate text-xs text-base-content/60">{{ user.Email }}</span>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span v-if="user.Admin" class="badge badge-sm border-none bg-primary/10 text-primary">Admin</span>
                                <span v-else class="badge badge-ghost badge-sm">User</span>
                            </td>
                            <td>
                                <div class="flex w-full max-w-xs flex-col gap-1">
                                    <div class="flex justify-between text-xs tabular-nums">
                                        <span class="tooltip" :data-tip="(user.file_count || 0) + ' files'">{{ formatBytes(user.used_storage || 0) }}</span>
                                        <span class="text-base-content/60">{{ formatBytes(user.Storage) }}</span>
                                    </div>
                                    <progress class="progress progress-primary h-1 w-full" :value="user.used_storage || 0"
                                        :max="user.Storage"></progress>
                                </div>
                            </td>
                            <td class="text-right tabular-nums">
                                {{ user.Balance.toFixed(2) }}
                            </td>
                            <td class="text-right">
                                <div class="flex justify-end gap-0.5">
                                    <button class="btn btn-square btn-ghost btn-sm tooltip" data-tip="Inspect files"
                                        @click="openInspectModal(user)" aria-label="Inspect files">
                                        <Icon name="lucide:folder-search" class="h-4 w-4" />
                                    </button>
                                    <button class="btn btn-square btn-ghost btn-sm tooltip" data-tip="Edit user"
                                        @click="openEditModal(user)" aria-label="Edit user">
                                        <Icon name="lucide:edit-2" class="h-4 w-4" />
                                    </button>
                                    <button class="btn btn-square btn-ghost btn-sm tooltip" data-tip="Change password"
                                        @click="openPasswordModal(user)" aria-label="Change password">
                                        <Icon name="lucide:key" class="h-4 w-4" />
                                    </button>
                                    <button class="btn btn-square btn-ghost btn-sm tooltip text-error" data-tip="Delete user"
                                        @click="confirmDelete(user)" aria-label="Delete user">
                                        <Icon name="lucide:trash-2" class="h-4 w-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <!-- Pagination -->
                <div class="flex items-center justify-between border-t border-base-300 p-3" v-if="meta.total > 0">
                    <span class="text-xs tabular-nums text-base-content/70">
                        {{ meta.total }} users · page {{ meta.page }} of {{ Math.ceil(meta.total / meta.limit) }}
                    </span>
                    <div class="join">
                        <button class="btn btn-ghost join-item btn-xs" :disabled="meta.page <= 1"
                            @click="changePage(meta.page - 1)" aria-label="Previous page">
                            <Icon name="lucide:chevron-left" class="h-3.5 w-3.5" />
                        </button>
                        <button class="btn btn-ghost join-item btn-xs" :disabled="meta.page * meta.limit >= meta.total"
                            @click="changePage(meta.page + 1)" aria-label="Next page">
                            <Icon name="lucide:chevron-right" class="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </div>

        </div>

        <!-- Create/Edit Modal -->
        <dialog id="user_modal" class="modal">
            <div class="modal-box w-11/12 max-w-2xl">
                <form method="dialog">
                    <button class="btn btn-square btn-ghost btn-sm absolute top-3 right-3" aria-label="Close">
                        <Icon name="lucide:x" class="h-4 w-4" />
                    </button>
                </form>
                <h3 class="mb-5 text-base font-semibold">{{ isEditing ? 'Edit user' : 'Create user' }}</h3>

                <form @submit.prevent="saveUser" class="flex flex-col gap-5">

                    <!-- Identity Section -->
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label class="flex w-full flex-col gap-1.5">
                            <span class="text-sm font-medium">Username</span>
                            <input v-model="formData.username" type="text" class="input input-sm w-full" required
                                :disabled="isEditing" placeholder="johndoe" />
                        </label>

                        <label class="flex w-full flex-col gap-1.5">
                            <span class="text-sm font-medium">Email</span>
                            <input v-model="formData.email" type="email" class="input input-sm w-full"
                                placeholder="john@example.com" />
                        </label>
                    </div>

                    <label v-if="!isEditing" class="flex w-full flex-col gap-1.5">
                        <span class="text-sm font-medium">Password</span>
                        <input v-model="formData.password" type="password" class="input input-sm w-full" required
                            minlength="6" placeholder="At least 6 characters" autocomplete="new-password" />
                    </label>

                    <!-- Permissions & Quotas -->
                    <fieldset class="rounded-field border border-base-300 p-4">
                        <legend class="px-1.5 text-sm font-medium">Quotas</legend>
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <label class="flex w-full flex-col gap-1.5">
                                <span class="text-sm font-medium">Storage limit <span class="font-normal text-base-content/60">(bytes)</span></span>
                                <div class="join w-full">
                                    <input v-model.number="formData.storage" type="number"
                                        class="input join-item input-sm w-full tabular-nums" min="0" />
                                    <span
                                        class="btn no-animation join-item btn-sm cursor-default border-base-300 bg-base-200 font-normal tabular-nums">
                                        {{ formatBytes(formData.storage) }}
                                    </span>
                                </div>
                            </label>

                            <label class="flex w-full flex-col gap-1.5">
                                <span class="text-sm font-medium">Balance</span>
                                <div class="relative">
                                    <span class="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-base-content/50">$</span>
                                    <input v-model.number="formData.balance" type="number" step="0.01"
                                        class="input input-sm w-full pl-7 tabular-nums" placeholder="0.00" />
                                </div>
                            </label>

                            <label class="flex w-full flex-col gap-1.5 md:col-span-2">
                                <span class="text-sm font-medium">Max concurrent remote downloads</span>
                                <input v-model.number="formData.maxRemoteDownloads" type="number"
                                    class="input input-sm w-full tabular-nums" min="1" />
                            </label>
                        </div>
                    </fieldset>

                    <label class="flex w-full flex-col gap-1.5">
                        <span class="text-sm font-medium">Upload storage pool</span>
                        <select v-model.number="formData.storagePoolId" class="select select-sm w-full"
                            :disabled="!!storagePoolsError" aria-describedby="storage-pool-help">
                            <option :value="0">Use instance default</option>
                            <option v-for="pool in storagePools" :key="pool.ID" :value="pool.ID">
                                {{ pool.Name }}{{ pool.IsDefault ? ' · instance default' : '' }}
                            </option>
                        </select>
                        <span id="storage-pool-help" class="text-xs"
                            :class="storagePoolsError ? 'text-error' : 'text-base-content/70'">
                            {{ storagePoolsError || 'New uploads use this pool. Existing files stay on their current mount.' }}
                        </span>
                    </label>

                    <label class="flex cursor-pointer items-center justify-between gap-4">
                        <span class="flex flex-col gap-0.5">
                            <span class="text-sm font-medium">Remote downloads</span>
                            <span class="text-xs text-base-content/60">Allow this user to queue server-side downloads.</span>
                        </span>
                        <input type="checkbox" class="toggle toggle-primary" v-model="formData.remoteDownloadEnabled" />
                    </label>

                    <label class="flex cursor-pointer items-center justify-between gap-4">
                        <span class="flex flex-col gap-0.5">
                            <span class="text-sm font-medium">Administrator</span>
                            <span class="text-xs text-base-content/60">Full access to the admin panel and configuration.</span>
                        </span>
                        <input type="checkbox" class="toggle toggle-primary" v-model="formData.admin" />
                    </label>

                    <div class="modal-action">
                        <button type="button" class="btn btn-ghost btn-sm" @click="closeModal('user_modal')">Cancel</button>
                        <button type="submit" class="btn btn-primary btn-sm" :disabled="isSubmitting">
                            <span v-if="isSubmitting" class="loading loading-spinner loading-xs"></span>
                            {{ isEditing ? 'Save changes' : 'Create user' }}
                        </button>
                    </div>
                </form>
            </div>
            <form method="dialog" class="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>

        <!-- Password Modal -->
        <dialog id="password_modal" class="modal">
            <div class="modal-box max-w-md">
                <form method="dialog">
                    <button class="btn btn-square btn-ghost btn-sm absolute top-3 right-3" aria-label="Close">
                        <Icon name="lucide:x" class="h-4 w-4" />
                    </button>
                </form>
                <h3 class="mb-1 text-base font-semibold">Reset password</h3>
                <p class="mb-4 text-sm text-base-content/70">
                    Set a new password for <span class="font-medium text-base-content">{{ selectedUser?.Username }}</span>.
                </p>

                <form @submit.prevent="savePassword" class="flex flex-col gap-4">
                    <label class="flex w-full flex-col gap-1.5">
                        <span class="text-sm font-medium">New password</span>
                        <input v-model="passwordForm.new_password" type="password" class="input input-sm w-full" required
                            minlength="6" placeholder="At least 6 characters" autocomplete="new-password" />
                    </label>

                    <div class="modal-action">
                        <button type="button" class="btn btn-ghost btn-sm" @click="closeModal('password_modal')">Cancel</button>
                        <button type="submit" class="btn btn-primary btn-sm" :disabled="isSubmitting">
                            <span v-if="isSubmitting" class="loading loading-spinner loading-xs"></span>
                            Reset password
                        </button>
                    </div>
                </form>
            </div>
            <form method="dialog" class="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>

        <!-- Inspect Modal -->
        <dialog id="inspect_modal" class="modal">
            <div class="modal-box flex h-[90vh] w-11/12 max-w-7xl flex-col overflow-hidden bg-base-100 p-0">
                <div class="z-(--z-dropdown) flex shrink-0 items-center justify-between border-b border-base-300 bg-base-100 p-4">
                    <h3 class="text-base font-semibold">Inspecting {{ selectedUser?.Username }}</h3>
                    <form method="dialog">
                        <button class="btn btn-square btn-ghost btn-sm" @click="selectedInspectionUserId = undefined"
                            aria-label="Close">
                            <Icon name="lucide:x" class="h-4 w-4" />
                        </button>
                    </form>
                </div>
                <div class="grow overflow-y-auto bg-base-200 p-4">
                    <VideoManager v-if="selectedInspectionUserId" :user-id="selectedInspectionUserId" />
                </div>
            </div>
            <form method="dialog" class="modal-backdrop">
                <button @click="selectedInspectionUserId = undefined">close</button>
            </form>
        </dialog>

    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: "panel",
    middleware: "auth",
});

const { data: accountData } = useAccountData();
const conf = useRuntimeConfig();
const token = useToken();
const err = ref("");
const successMsg = ref("");
const isLoading = ref(false);
const isSubmitting = ref(false);

interface User {
    ID: number;
    Username: string;
    Email: string;
    Admin: boolean;
    Balance: number;
    Storage: number;
    MaxRemoteDownloads: number;
    RemoteDownloadEnabled: boolean;
    StoragePoolID?: number | null;
    used_storage: number;
    file_count: number;
    CreatedAt: string;
}

interface StoragePool {
    ID: number;
    Name: string;
    IsDefault: boolean;
}

interface StorageOverview {
    Pools: StoragePool[];
}

interface Meta {
    total: number;
    page: number;
    limit: number;
}

interface UserListResponse {
    data: User[];
    meta: Meta;
}

const users = ref<User[]>([]);
const storagePools = ref<StoragePool[]>([]);
const storagePoolsError = ref("");
const meta = ref<Meta>({ total: 0, page: 1, limit: 10 });
const selectedUser = ref<User | null>(null);
const selectedInspectionUserId = ref<number | undefined>(undefined);
const isEditing = ref(false);

const searchQuery = ref("");
const page = ref(1);
const limit = ref(10);

const formData = ref({
    username: '',
    email: '',
    password: '',
    admin: false,
    storage: 5368709120, // 5GB default
    balance: 0.0,
    maxRemoteDownloads: 5,
    remoteDownloadEnabled: true,
    storagePoolId: 0,
});

const passwordForm = ref({
    new_password: ''
});

// Initial Load & Auth Check
onMounted(() => {
    if (accountData.value?.Admin) {
        load();
    }
});

watch(accountData, (newData) => {
    if (newData?.Admin) {
        // Only load if not already loading or if users are empty
        if (users.value.length === 0) {
            load();
        }
    } else if (newData) {
        // Only redirect if we have data and it says NOT admin
        navigateTo("/my");
    }
});

async function load() {
    isLoading.value = true;
    err.value = "";
    const [usersResult, storageResult] = await Promise.allSettled([
        $fetch<UserListResponse>(`${conf.public.apiUrl}/users`, {
            headers: { Authorization: `Bearer ${token.value}` },
            query: {
                page: page.value,
                limit: limit.value,
                search: searchQuery.value || undefined
            }
        }),
        $fetch<StorageOverview>(`${conf.public.apiUrl}/admin/storage`, {
            headers: { Authorization: `Bearer ${token.value}` },
        }),
    ]);
    if (storageResult.status === "fulfilled") {
        storagePools.value = storageResult.value.Pools || [];
        storagePoolsError.value = "";
    } else {
        storagePoolsError.value = "Storage pool choices could not be loaded. The current assignment will be preserved; reload before changing it.";
    }
    if (usersResult.status === "fulfilled") {
        users.value = usersResult.value.data || [];
        meta.value = usersResult.value.meta;
    } else {
        err.value = `Failed to load users: ${requestErrorMessage(usersResult.reason)}`;
        users.value = [];
    }
    isLoading.value = false;
}

function requestErrorMessage(error: unknown) {
    if (typeof error !== "object" || error === null) return String(error || "Unknown error");
    const requestError = error as { data?: unknown; message?: string };
    if (typeof requestError.data === "string" && requestError.data) return requestError.data;
    return requestError.message || "Unknown error";
}

function handleSearch() {
    page.value = 1; // Reset to page 1 on search
    load();
}

function changePage(newPage: number) {
    if (newPage < 1 || (newPage * limit.value >= meta.value.total + limit.value)) return;
    page.value = newPage;
    load();
}

// Modal Actions
function openCreateModal() {
    isEditing.value = false;
    formData.value = {
        username: '',
        email: '',
        password: '',
        admin: false,
        storage: 5368709120,
        balance: 0.0,
        maxRemoteDownloads: 5,
        remoteDownloadEnabled: true,
        storagePoolId: 0,
    };
    (document.getElementById('user_modal') as HTMLDialogElement)?.showModal();
}

function openInspectModal(user: User) {
    selectedUser.value = user;
    selectedInspectionUserId.value = user.ID;
    (document.getElementById('inspect_modal') as HTMLDialogElement)?.showModal();
}

function openEditModal(user: User) {
    selectedUser.value = user;
    isEditing.value = true;
    formData.value = {
        username: user.Username,
        email: user.Email,
        password: '', // Not needed for edit
        admin: user.Admin,
        storage: user.Storage,
        balance: user.Balance,
        maxRemoteDownloads: user.MaxRemoteDownloads,
        remoteDownloadEnabled: user.RemoteDownloadEnabled !== false,
        storagePoolId: user.StoragePoolID || 0,
    };
    (document.getElementById('user_modal') as HTMLDialogElement)?.showModal();
}

function openPasswordModal(user: User) {
    selectedUser.value = user;
    passwordForm.value.new_password = '';
    (document.getElementById('password_modal') as HTMLDialogElement)?.showModal();
}

function closeModal(id: string) {
    (document.getElementById(id) as HTMLDialogElement)?.close();
}

// CRUD Operations
async function saveUser() {
    isSubmitting.value = true;
    err.value = "";
    try {
        if (isEditing.value && selectedUser.value) {
            // Update
            const payload = {
                username: formData.value.username,
                email: formData.value.email,
                admin: formData.value.admin,
                storage: formData.value.storage,
                balance: formData.value.balance,
                maxRemoteDownloads: formData.value.maxRemoteDownloads,
                remoteDownloadEnabled: formData.value.remoteDownloadEnabled,
                storagePoolId: formData.value.storagePoolId,
            };
            await $fetch(`${conf.public.apiUrl}/users/${selectedUser.value.ID}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token.value}` },
                body: payload
            });
            showSuccess('User updated successfully');
        } else {
            // Create
            await $fetch(`${conf.public.apiUrl}/users`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token.value}` },
                body: formData.value
            });
            showSuccess('User created successfully');
        }
        closeModal('user_modal');
        load();
    } catch (error: any) {
        err.value = error?.data || error.message;
    } finally {
        isSubmitting.value = false;
    }
}

async function savePassword() {
    if (!selectedUser.value) return;
    isSubmitting.value = true;
    err.value = "";
    try {
        await $fetch(`${conf.public.apiUrl}/users/${selectedUser.value.ID}/password`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token.value}` },
            body: { new_password: passwordForm.value.new_password }
        });
        showSuccess('Password updated successfully');
        closeModal('password_modal');
    } catch (error: any) {
        err.value = error?.data || error.message;
    } finally {
        isSubmitting.value = false;
    }
}

async function confirmDelete(user: User) {
    if (!confirm(`Are you sure you want to delete user ${user.Username}? This action cannot be undone.`)) return;
    
    try {
        await $fetch(`${conf.public.apiUrl}/users/${user.ID}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token.value}` },
        });
        showSuccess('User deleted successfully');
        load();
    } catch (error: any) {
        err.value = `Failed to delete user: ${error?.data || error.message}`;
    }
}

// Helpers
function showSuccess(msg: string) {
    successMsg.value = msg;
    setTimeout(() => successMsg.value = "", 3000);
}

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
</script>
