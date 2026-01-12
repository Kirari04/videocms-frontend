<template>
    <div class="flex flex-col gap-2">
        <div v-if="errors" class="alert alert-error">
            {{ errors }}
            <button @click="errors = null" class="btn btn-sm btn-circle btn-ghost ml-auto">✕</button>
        </div>
        <div class="flex items-center gap-2">
            <NuxtLink :class="isLoading ? `btn btn-neutral btn-disabled` : `btn btn-neutral`" to="/my/webpages/add">
                New Webpage
            </NuxtLink>
            <button :disabled="isLoading" class="btn btn-neutral" @click="load()">
                Reload
            </button>
        </div>
        <table class="table table-cell table-zebra w-full border-base-100">
            <thead>
                <tr>
                    <th>
                        ID
                    </th>
                    <th>
                        Path
                    </th>
                    <th>
                        Title
                    </th>
                    <th>Edit</th>
                </tr>
            </thead>
            <tbody>
                <tr v-if="datas.length === 0">
                    <td colspan="3">
                        No Web Pages created yet.
                    </td>
                </tr>
                <tr v-for="webpage in datas">
                    <td>
                        {{ webpage.ID }}
                    </td>
                    <td>
                        {{ webpage.Path }}
                    </td>
                    <td>
                        {{ webpage.Title }}
                    </td>
                    <td>
                        <div class="drawer drawer-end">
                            <input :id="`edit-drawer${webpage.ID}`" type="checkbox" class="drawer-toggle" />
                            <div class="drawer-content">
                                <label :for="`edit-drawer${webpage.ID}`"
                                    class="btn btn-neutral btn-sm drawer-button">Edit</label>
                            </div>
                            <div class="drawer-side z-50">
                                <label :for="`edit-drawer${webpage.ID}`" aria-label="close sidebar"
                                    class="drawer-overlay"></label>
                                <div class="flex flex-col gap-2 w-[800px] max-w-[90%] p-4 min-h-full bg-base-200">
                                    <div class="flex">
                                        <button @click="deleteWebPage(webpage.ID)" :disabled="isLoading"
                                            class="btn btn-sm btn-error ml-auto">
                                            Delete Web Page
                                        </button>
                                    </div>
                                    <p>Title</p>
                                    <input v-model="webpage.Title" type="text" class=" input input-bordered">
                                    <p>Path</p>
                                    <input v-model="webpage.Path" type="text" class=" input input-bordered">
                                    <p>List In Footer</p>
                                    <input v-model="webpage.ListInFooter" type="checkbox" class="checkbox checkbox-primary">
                                    <p>Page Content</p>
                                    <TinyEditor :init-html="webpage.Html" @update="html => webpage.Html = html" />
                                    <div class="mt-2">
                                        <button :disabled="isLoading" @click="update(webpage)" type="submit"
                                            class="btn btn-primary btn-sm">
                                            Update Webpage
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
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

async function update(webPage: WebPage) {
    isLoading.value = true;
    try {
        await $fetch<{
            EnablePlayerCaptcha: boolean;
        }>(`${conf.public.apiUrl}/page`, {
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
        load();
    } catch (error: any) {
        errors.value = `${error.data ? error.data : error.message}`;
    }
    isLoading.value = false;
}

async function deleteWebPage(id: number) {
    isLoading.value = true;
    try {
        await $fetch<{
            EnablePlayerCaptcha: boolean;
        }>(`${conf.public.apiUrl}/page`, {
            method: "delete",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: {
                WebPageID: id,
            }
        });
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
