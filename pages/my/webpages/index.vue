<template>
    <div class="flex flex-col grow gap-8">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div class="flex flex-col gap-1">
                <h1 class="text-2xl font-bold">Web Pages</h1>
                <p class="text-sm opacity-70">Manage your custom static pages.</p>
            </div>
            <div class="flex gap-2">
                <button :disabled="isLoading" class="btn btn-ghost" @click="load()">
                    <Icon name="lucide:refresh-cw" class="w-5 h-5" :class="{ 'animate-spin': isLoading }" />
                </button>
                <NuxtLink :class="isLoading ? `btn btn-primary btn-disabled` : `btn btn-primary shadow-lg`" to="/my/webpages/add">
                    <Icon name="lucide:plus" class="w-5 h-5" />
                    New Webpage
                </NuxtLink>
            </div>
        </div>

        <!-- Error Alert -->
        <div v-if="errors" class="alert alert-error shadow-lg">
            <Icon name="lucide:alert-circle" class="stroke-current shrink-0 h-6 w-6" />
            <div>{{ errors }}</div>
            <button @click="errors = null" class="btn btn-sm btn-circle btn-ghost ml-auto">✕</button>
        </div>

        <!-- List Card -->
        <div class="card bg-base-100 shadow-xl border border-base-200">
            <div class="card-body p-0">
                <div v-if="datas.length === 0 && !isLoading" class="flex flex-col items-center justify-center py-16 opacity-50">
                    <Icon name="lucide:file-x" class="w-16 h-16 mb-4 opacity-50" />
                    <h3 class="text-lg font-bold">No Pages Found</h3>
                    <p>Create a new webpage to get started.</p>
                </div>

                <div class="overflow-x-auto" v-else>
                    <table class="table table-zebra w-full">
                        <thead class="bg-base-200/50">
                            <tr>
                                <th class="w-16">ID</th>
                                <th>Title</th>
                                <th>Path</th>
                                <th>Footer Link</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="webpage in datas" :key="webpage.ID">
                                <td class="font-mono opacity-50">#{{ webpage.ID }}</td>
                                <td class="font-bold">{{ webpage.Title }}</td>
                                <td class="font-mono text-xs opacity-70">{{ webpage.Path }}</td>
                                <td>
                                    <div v-if="webpage.ListInFooter" class="badge badge-success badge-xs gap-1">
                                        <Icon name="lucide:check" class="w-3 h-3" />
                                        Visible
                                    </div>
                                    <div v-else class="badge badge-ghost badge-xs opacity-50">Hidden</div>
                                </td>
                                <td class="text-right">
                                    <button class="btn btn-sm btn-ghost btn-square" @click="openEditDrawer(webpage)">
                                        <Icon name="lucide:edit-2" class="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Edit Drawer (Teleported) -->
        <Teleport to="body">
            <div class="drawer drawer-end z-[100]">
                <input id="edit-drawer" type="checkbox" class="drawer-toggle" :checked="isDrawerOpen" @change="isDrawerOpen = !isDrawerOpen" />
                <div class="drawer-side">
                    <div class="drawer-overlay" @click="isDrawerOpen = false"></div>
                    <div class="menu p-4 w-full max-w-[95vw] xl:max-w-[1400px] min-h-full bg-base-100 text-base-content flex flex-col gap-6 shadow-2xl">
                        <!-- Drawer Header -->
                        <div class="flex items-center justify-between pb-4 border-b border-base-200">
                            <h3 class="text-xl font-bold flex items-center gap-2">
                                <Icon name="lucide:edit" class="w-5 h-5" />
                                Edit Webpage
                            </h3>
                            <div class="flex gap-2">
                                <button @click="deleteWebPage(editingPage?.ID!)" :disabled="isLoading" class="btn btn-error btn-sm btn-outline">
                                    <Icon name="lucide:trash-2" class="w-4 h-4" />
                                    Delete
                                </button>
                                <button @click="isDrawerOpen = false" class="btn btn-sm btn-circle btn-ghost">✕</button>
                            </div>
                        </div>

                        <!-- Drawer Content -->
                        <div v-if="editingPage" class="flex flex-col gap-4 overflow-y-auto flex-1 px-1">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="form-control">
                                    <label class="label">
                                        <span class="label-text font-medium text-base-content/70">Page Title</span>
                                    </label>
                                    <input v-model="editingPage.Title" type="text" class="input input-bordered w-full focus:input-primary transition-all" />
                                </div>
                                
                                <div class="form-control">
                                    <label class="label">
                                        <span class="label-text font-medium text-base-content/70">Public Path</span>
                                    </label>
                                    <div class="join">
                                        <span class="btn btn-neutral join-item no-animation font-mono">/p</span>
                                        <input v-model="editingPage.Path" type="text" class="input input-bordered join-item w-full font-mono" />
                                    </div>
                                </div>
                            </div>

                            <div class="form-control">
                                <label class="label cursor-pointer justify-start gap-4">
                                    <input v-model="editingPage.ListInFooter" type="checkbox" class="checkbox checkbox-primary" />
                                    <span class="label-text font-medium">Include link in footer navigation</span>
                                </label>
                            </div>

                            <div class="form-control flex-1 flex flex-col">
                                <label class="label">
                                    <span class="label-text font-medium text-base-content/70">Design</span>
                                </label>
                                <div class="flex-1 min-h-[600px] border border-base-300 rounded-lg overflow-hidden">
                                    <ClientOnly>
                                        <GrapesEditor :init-html="editingPage.Html" @update="html => editingPage!.Html = html" />
                                    </ClientOnly>
                                </div>
                            </div>
                        </div>

                        <!-- Drawer Footer -->
                        <div class="pt-4 border-t border-base-200">
                            <button :disabled="isLoading || !editingPage" @click="update(editingPage!)" class="btn btn-primary w-full shadow-lg shadow-primary/20">
                                <span v-if="isLoading" class="loading loading-spinner"></span>
                                <Icon v-else name="lucide:save" class="w-5 h-5" />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: "panel",
    middleware: "auth",
});

const conf = useRuntimeConfig();
const token = useToken();
const isLoading = ref(false)
const isDrawerOpen = ref(false)
const editingPage = ref<WebPage | null>(null)

// Clear editing state when drawer closes
watch(isDrawerOpen, (newVal) => {
    if (!newVal) {
        setTimeout(() => {
            editingPage.value = null;
        }, 300); // Wait for transition
    }
})

interface WebPage {
    ID: number
    CreatedAt: string
    UpdatedAt: string
    DeletedAt: any
    Path: string
    Title: string
    Html: string
    ListInFooter: boolean
}
const datas = ref<WebPage[]>([])
const errors = ref<string | null>(null)

async function load() {
    isLoading.value = true;
    try {
        const data = await $fetch<WebPage[]>(`${conf.public.apiUrl}/pages`, {
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
        });
        if (data) {
            datas.value = data;
        }
    } catch (error: any) {
        errors.value = `${error.data ? error.data : error.message}`;
    }
    isLoading.value = false;
}

function openEditDrawer(page: WebPage) {
    // Clone to avoid direct mutation before save
    editingPage.value = JSON.parse(JSON.stringify(page));
    isDrawerOpen.value = true;
}

async function update(webPage: WebPage) {
    isLoading.value = true;
    try {
        await $fetch(`${conf.public.apiUrl}/page`, {
            method: "put",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: {
                WebPageID: webPage.ID,
                Path: webPage.Path,
                Title: webPage.Title,
                Html: webPage.Html,
                ListInFooter: webPage.ListInFooter,
            }
        });
        isDrawerOpen.value = false;
        load();
    } catch (error: any) {
        errors.value = `${error.data ? error.data : error.message}`;
    }
    isLoading.value = false;
}

async function deleteWebPage(id: number) {
    if(!confirm("Are you sure you want to delete this page?")) return;
    
    isLoading.value = true;
    try {
        await $fetch(`${conf.public.apiUrl}/page`, {
            method: "delete",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: {
                WebPageID: id,
            }
        });
        isDrawerOpen.value = false;
        load();
    } catch (error: any) {
        errors.value = `${error.data ? error.data : error.message}`;
    }
    isLoading.value = false;
}

onMounted(() => {
    load()
})
</script>
