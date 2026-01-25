<template>
    <div class="flex flex-col h-full">
        <!-- Notifications -->
        <div class="toast toast-top toast-end z-50">
            <div class="alert alert-error shadow-lg" v-if="err">
                <Icon name="lucide:alert-circle" class="stroke-current shrink-0 h-6 w-6" />
                <div>{{ err }}</div>
            </div>
            <div class="alert alert-success shadow-lg" v-if="successMsg">
                <Icon name="lucide:check-circle" class="stroke-current shrink-0 h-6 w-6" />
                <div>{{ successMsg }}</div>
            </div>
        </div>

        <!-- Access Denied -->
        <div v-if="!accountData?.Admin" class="alert alert-error m-4">
            You don't have access to this page
        </div>

        <!-- Main Content -->
        <div v-if="accountData?.Admin" class="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
            
            <!-- Header -->
            <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 class="text-3xl font-extrabold tracking-tight">User Management</h1>
                    <p class="text-base-content/70">Manage registered users, permissions, and storage quotas.</p>
                </div>
                <div class="flex gap-2">
                    <button @click="load()" :disabled="isLoading" class="btn btn-ghost gap-2">
                        <Icon name="lucide:refresh-cw" :class="{'animate-spin': isLoading}" />
                        Reload
                    </button>
                    <button @click="openCreateModal()" class="btn btn-primary gap-2">
                        <Icon name="lucide:plus" />
                        Create User
                    </button>
                </div>
            </div>

            <!-- Search and Filter -->
            <div class="form-control w-full max-w-md">
                <div class="join w-full">
                    <input type="text" placeholder="Search users by username or email..." class="input input-bordered join-item flex-1" v-model="searchQuery" @keyup.enter="handleSearch" />
                    <button class="btn btn-square join-item" @click="handleSearch">
                        <Icon name="lucide:search" class="w-5 h-5" />
                    </button>
                </div>
            </div>

            <!-- Users Table -->
            <div class="card bg-base-100 shadow-xl border border-base-200 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="table table-zebra w-full">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>User</th>
                                <th>Role</th>
                                <th>Storage (Used / Limit)</th>
                                <th>Balance</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="isLoading && !users.length">
                                <td colspan="6" class="text-center py-8">
                                    <span class="loading loading-spinner loading-lg"></span>
                                </td>
                            </tr>
                            <tr v-else-if="users.length === 0">
                                <td colspan="6" class="text-center py-8 text-base-content/50">
                                    No users found.
                                </td>
                            </tr>
                            <tr v-for="user in users" :key="user.ID" class="hover">
                                <td class="font-mono text-xs">{{ user.ID }}</td>
                                <td>
                                    <div class="flex items-center gap-3">
                                        <div class="avatar placeholder">
                                            <div class="bg-neutral text-neutral-content rounded-full w-8">
                                                <span class="text-xs">{{ user.Username ? user.Username.substring(0, 2).toUpperCase() : '??' }}</span>
                                            </div>
                                        </div>
                                        <div class="flex flex-col">
                                            <span class="font-bold">{{ user.Username }}</span>
                                            <span class="text-xs opacity-50">{{ user.Email }}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span v-if="user.Admin" class="badge badge-primary badge-sm">Admin</span>
                                    <span v-else class="badge badge-ghost badge-sm">User</span>
                                </td>
                                <td>
                                    <div class="flex flex-col gap-1 w-full max-w-xs">
                                        <div class="flex justify-between text-xs">
                                            <span class="tooltip" :data-tip="(user.file_count || 0) + ' files'">{{ formatBytes(user.used_storage || 0) }} used</span>
                                            <span>{{ formatBytes(user.Storage) }}</span>
                                        </div>
                                        <progress class="progress progress-primary w-full h-2" :value="user.used_storage || 0" :max="user.Storage"></progress>
                                    </div>
                                </td>
                                <td>
                                    {{ user.Balance.toFixed(2) }}
                                </td>
                                <td class="text-right">
                                    <div class="join">
                                        <button class="btn btn-ghost btn-xs join-item tooltip" data-tip="Inspect Files" @click="openInspectModal(user)">
                                            <Icon name="lucide:folder-search" class="w-4 h-4" />
                                        </button>
                                        <button class="btn btn-ghost btn-xs join-item tooltip" data-tip="Edit User" @click="openEditModal(user)">
                                            <Icon name="lucide:edit-2" class="w-4 h-4" />
                                        </button>
                                        <button class="btn btn-ghost btn-xs join-item tooltip" data-tip="Change Password" @click="openPasswordModal(user)">
                                            <Icon name="lucide:key" class="w-4 h-4" />
                                        </button>
                                        <button class="btn btn-ghost btn-xs join-item text-error tooltip" data-tip="Delete User" @click="confirmDelete(user)">
                                            <Icon name="lucide:trash-2" class="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <!-- Pagination -->
                <div class="p-4 border-t border-base-200 flex justify-center" v-if="meta.total > 0">
                    <div class="join">
                        <button class="join-item btn btn-sm" :disabled="meta.page <= 1" @click="changePage(meta.page - 1)">«</button>
                        <button class="join-item btn btn-sm">Page {{ meta.page }} of {{ Math.ceil(meta.total / meta.limit) }}</button>
                        <button class="join-item btn btn-sm" :disabled="meta.page * meta.limit >= meta.total" @click="changePage(meta.page + 1)">»</button>
                    </div>
                </div>
            </div>

        </div>

        <!-- Create/Edit Modal -->
        <dialog id="user_modal" class="modal">
            <div class="modal-box w-11/12 max-w-2xl">
                <form method="dialog">
                    <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                </form>
                <h3 class="font-bold text-2xl mb-6">{{ isEditing ? 'Edit User' : 'Create New User' }}</h3>
                
                <form @submit.prevent="saveUser" class="flex flex-col gap-6">
                    
                    <!-- Identity Section -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div class="form-control w-full">
                            <label class="label"><span class="label-text font-semibold">Username</span></label>
                            <input v-model="formData.username" type="text" class="input input-bordered w-full" required :disabled="isEditing" placeholder="johndoe" />
                        </div>
                        
                        <div class="form-control w-full">
                            <label class="label"><span class="label-text font-semibold">Email</span></label>
                            <input v-model="formData.email" type="email" class="input input-bordered w-full" placeholder="john@example.com" />
                        </div>
                    </div>

                    <div v-if="!isEditing" class="form-control w-full">
                        <label class="label"><span class="label-text font-semibold">Password</span></label>
                        <input v-model="formData.password" type="password" class="input input-bordered w-full" required minlength="6" placeholder="••••••••" />
                    </div>

                    <div class="divider my-0"></div>

                    <!-- Permissions & Quotas -->
                     <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="form-control w-full">
                             <label class="label"><span class="label-text font-semibold">Storage Limit</span></label>
                             <div class="join w-full">
                                <input v-model.number="formData.storage" type="number" class="input input-bordered join-item w-full" min="0" />
                                <span class="btn btn-ghost join-item no-animation font-normal cursor-default bg-base-200 border-base-300">
                                    {{ formatBytes(formData.storage) }}
                                </span>
                             </div>
                        </div>

                        <div class="form-control w-full">
                            <label class="label"><span class="label-text font-semibold">Balance</span></label>
                            <div class="relative">
                                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50">$</span>
                                <input v-model.number="formData.balance" type="number" step="0.01" class="input input-bordered w-full pl-8" placeholder="0.00" />
                            </div>
                        </div>
                    </div>

                    <div class="form-control">
                        <label class="label cursor-pointer justify-start gap-4 p-0">
                            <input type="checkbox" class="toggle toggle-primary" v-model="formData.admin" />
                            <div class="flex flex-col">
                                <span class="label-text font-semibold">Administrator Privileges</span>
                                <span class="label-text-alt text-base-content/60">Grant full access to the admin panel and configuration.</span>
                            </div>
                        </label>
                    </div>

                    <div class="modal-action mt-8">
                        <button type="button" class="btn" @click="closeModal('user_modal')">Cancel</button>
                        <button type="submit" class="btn btn-primary min-w-[100px]" :disabled="isSubmitting">
                            <span v-if="isSubmitting" class="loading loading-spinner loading-xs"></span>
                            {{ isEditing ? 'Save Changes' : 'Create User' }}
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
                    <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                </form>
                <h3 class="font-bold text-xl mb-2">Reset Password</h3>
                <p class="text-base-content/70 mb-6">Enter a new secure password for <span class="font-bold text-base-content">{{ selectedUser?.Username }}</span>.</p>
                
                <form @submit.prevent="savePassword" class="flex flex-col gap-4">
                    <div class="form-control w-full">
                        <label class="label"><span class="label-text font-semibold">New Password</span></label>
                        <input v-model="passwordForm.new_password" type="password" class="input input-bordered w-full" required minlength="6" placeholder="••••••••" />
                    </div>

                    <div class="modal-action">
                        <button type="button" class="btn" @click="closeModal('password_modal')">Cancel</button>
                        <button type="submit" class="btn btn-warning" :disabled="isSubmitting">
                            <span v-if="isSubmitting" class="loading loading-spinner loading-xs"></span>
                            Reset Password
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
            <div class="modal-box w-11/12 max-w-7xl h-[90vh] p-0 overflow-hidden flex flex-col bg-base-100">
                <div class="p-4 border-b border-base-200 flex items-center justify-between shrink-0 bg-base-100 z-10">
                    <h3 class="font-bold text-lg flex items-center gap-2">
                        <Icon name="lucide:eye" class="w-5 h-5 text-primary" />
                        Inspecting: {{ selectedUser?.Username }}
                    </h3>
                    <form method="dialog">
                        <button class="btn btn-sm btn-circle btn-ghost" @click="selectedInspectionUserId = undefined">✕</button>
                    </form>
                </div>
                <div class="grow overflow-y-auto p-4 bg-base-200/30">
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
    used_storage: number;
    file_count: number;
    CreatedAt: string;
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
    balance: 0.0
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
    try {
        const res = await $fetch<UserListResponse>(`${conf.public.apiUrl}/users`, {
            headers: { Authorization: `Bearer ${token.value}` },
            query: {
                page: page.value,
                limit: limit.value,
                search: searchQuery.value || undefined
            }
        });
        users.value = res.data || [];
        meta.value = res.meta;
    } catch (error: any) {
        err.value = `Failed to load users: ${error?.data || error.message}`;
        // Fallback or empty state on error
        users.value = [];
    } finally {
        isLoading.value = false;
    }
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
        balance: 0.0
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
        balance: user.Balance
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
                balance: formData.value.balance
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
            method: 'PUT',
            headers: { Authorization: `Bearer ${token.value}` },
            body: { password: passwordForm.value.new_password }
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