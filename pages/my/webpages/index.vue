<template>
    <div class="flex flex-col grow gap-8">
        <PageHeader title="Web pages" description="Custom static pages served under /p." class="pb-0">
            <button :disabled="isLoading" class="btn btn-square btn-ghost btn-sm" @click="load()" aria-label="Refresh">
                <Icon name="lucide:refresh-cw" class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
            </button>
            <NuxtLink :class="isLoading ? `btn btn-primary btn-sm btn-disabled gap-2` : `btn btn-primary btn-sm gap-2`"
                to="/my/webpages/add">
                <Icon name="lucide:plus" class="h-4 w-4" />
                New page
            </NuxtLink>
        </PageHeader>

        <!-- Error Alert -->
        <div v-if="errors" class="alert alert-error">
            <Icon name="lucide:alert-circle" class="stroke-current shrink-0 h-6 w-6" />
            <div>{{ errors }}</div>
            <button @click="errors = null" class="btn btn-sm btn-circle btn-ghost ml-auto">✕</button>
        </div>

        <!-- List Card -->
        <div class="rounded-box border border-base-300 bg-base-100">
            <div class="card-body p-0">
                <div v-if="datas.length === 0 && !isLoading"
                    class="flex flex-col items-center justify-center gap-1 py-16 text-center">
                    <Icon name="lucide:file-text" class="h-6 w-6 text-base-content/30" />
                    <p class="text-sm font-medium">No pages yet</p>
                    <p class="text-sm text-base-content/60">Create a page to publish custom content.</p>
                </div>

                <div class="overflow-x-auto" v-else>
                    <table class="table table-sm">
                        <thead>
                            <tr class="border-base-300 text-xs text-base-content/70">
                                <th class="font-medium">Title</th>
                                <th class="font-medium">Path</th>
                                <th class="font-medium">Footer link</th>
                                <th class="text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="webpage in datas" :key="webpage.ID" class="border-base-300 hover:bg-base-200/60">
                                <td class="font-medium">{{ webpage.Title }}</td>
                                <td class="font-mono text-xs text-base-content/70">{{ webpage.Path }}</td>
                                <td>
                                    <span v-if="webpage.ListInFooter" class="badge badge-sm gap-1 border-none bg-success/10 text-success">
                                        <Icon name="lucide:check" class="h-3 w-3" />
                                        Visible
                                    </span>
                                    <span v-else class="badge badge-ghost badge-sm">Hidden</span>
                                </td>
                                <td class="text-right">
                                    <button class="btn btn-square btn-ghost btn-sm" @click="openEditDrawer(webpage)"
                                        :aria-label="`Edit ${webpage.Title}`">
                                        <Icon name="lucide:edit-2" class="h-4 w-4" />
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
            <div class="drawer drawer-end z-(--z-modal)">
                <input id="edit-drawer" type="checkbox" class="drawer-toggle" :checked="isDrawerOpen" @change="isDrawerOpen = !isDrawerOpen" />
                <div class="drawer-side">
                    <div class="drawer-overlay" @click="isDrawerOpen = false"></div>
                    <div class="flex min-h-full w-full max-w-[95vw] flex-col gap-5 border-l border-base-300 bg-base-100 p-4 text-base-content xl:max-w-[1400px]">
                        <!-- Drawer Header -->
                        <div class="flex items-center justify-between border-b border-base-300 pb-3">
                            <h3 class="text-base font-semibold">Edit page</h3>
                            <div class="flex gap-2">
                                <button @click="deleteWebPage(editingPage?.ID!)" :disabled="isLoading"
                                    class="btn btn-ghost btn-sm gap-2 text-error">
                                    <Icon name="lucide:trash-2" class="h-4 w-4" />
                                    Delete
                                </button>
                                <button @click="isDrawerOpen = false" class="btn btn-square btn-ghost btn-sm" aria-label="Close">
                                    <Icon name="lucide:x" class="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <!-- Drawer Content -->
                        <div v-if="editingPage" class="flex flex-col gap-4 overflow-y-auto flex-1 px-1">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="form-control">
                                    <label class="label">
                                        <span class="label-text font-medium">Page Title</span>
                                    </label>
                                    <input v-model="editingPage.Title" type="text" class="input w-full" />
                                </div>
                                
                                <div class="form-control">
                                    <label class="label">
                                        <span class="label-text font-medium">Public Path</span>
                                    </label>
                                    <div class="join">
                                        <span class="btn btn-ghost join-item no-animation border-base-300 bg-base-200 font-mono">/p</span>
                                        <input v-model="editingPage.Path" type="text" class="input join-item w-full font-mono" />
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
                                    <span class="label-text font-medium">Design</span>
                                </label>
                                <div class="flex-1 min-h-[600px] border border-base-300 rounded-lg overflow-hidden">
                                    <ClientOnly>
                                        <GrapesEditor :init-html="editingPage.Html" @update="html => editingPage!.Html = html" />
                                    </ClientOnly>
                                </div>
                            </div>
                        </div>

                        <!-- Drawer Footer -->
                        <div class="pt-4 border-t border-base-300">
                            <button :disabled="isLoading || !editingPage" @click="update(editingPage!)" class="btn btn-primary w-full">
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
