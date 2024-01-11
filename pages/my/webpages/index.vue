<template>
    <div class="flex flex-col gap-2">
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
    const {
        data,
        error,
    } = await useFetch<WebPage[]>(`${conf.public.apiUrl}/pages`, {
        headers: {
            Authorization: `Bearer ${token.value}`,
        },
    });
    isLoading.value = false;
    if (error.value) {
        errors.value = `${error.value.data}`
        return
    }
    if (data.value) {
        datas.value = data.value
    }
}

async function update(webPage: WebPage) {
    isLoading.value = true;
    const {
        error,
    } = await useFetch<{
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

    if (error.value) {
        errors.value = `${error.value?.data}`;
        return;
    }
    isLoading.value = false;
    load()
}

async function deleteWebPage(id: number) {
    isLoading.value = true;
    const {
        error,
    } = await useFetch<{
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

    if (error.value) {
        errors.value = `${error.value?.data}`;
        return;
    }
    isLoading.value = false;
    load()
}

onMounted(() => {
    load()
})
</script>
