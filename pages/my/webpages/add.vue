<script lang="ts" setup>
definePageMeta({
    layout: "panel",
    middleware: "auth",
});
const { data: accountData } = useAccountData()
watch(accountData, () => {
    if (accountData.value) {
        if (!accountData.value.Admin) {
            navigateTo("/my", {
                redirectCode: 307,
            })
        }
    }
})

const conf = useRuntimeConfig();
const token = useToken();

const isLoading = ref(false)
const errors = ref<string | null>(null)

const createWebpageTitle = ref("")
const createWebpagePath = ref("")
const createWebpageListInFooter = ref(true)
const createWebpageContent = ref("")
async function create() {
    isLoading.value = true;
    const {
        error,
    } = await useFetch<{
        EnablePlayerCaptcha: boolean;
    }>(`${conf.public.apiUrl}/page`, {
        method: "post",
        headers: {
            Authorization: `Bearer ${token.value}`,
        },
        body: {
            Path: createWebpagePath.value,
            Title: createWebpageTitle.value,
            Html: createWebpageContent.value,
            ListInFooter: createWebpageListInFooter.value,
        }
    });

    if (error.value) {
        errors.value = `${error.value?.data}`;
        return;
    }
    isLoading.value = false;
    navigateTo("/my/webpages")
}
</script>

<template>
    <div class="flex flex-col gap-2 w-full">
        <h1 class="font-bold text-lg">Create New Webpage</h1>
        <div v-if="errors">
            {{ errors }}
        </div>
        <form @submit.prevent="create()" class="flex flex-col">
            <div class="mt-2 flex flex-col gap-2">
                <p>Title</p>
                <input v-model="createWebpageTitle" type="text" class=" input input-bordered">
                <p>Path</p>
                <input v-model="createWebpagePath" type="text" class=" input input-bordered">
                <p>List In Footer</p>
                <input v-model="createWebpageListInFooter" type="checkbox" class="checkbox checkbox-primary">
                <div class="flex flex-col xl:flex-row gap-6">
                    <div class="w-full xl:w-1/2">
                        <p class="mb-2">Page Content</p>
                        <TinyEditor @update="html => createWebpageContent = html" />
                    </div>
                    <div class="w-full xl:w-1/2">
                        <div class="flex items-center">
                            <p class="mb-2">Preview</p>
                        </div>
                        <div class="mockup-window border border-base-300 min-h-16">
                            <div class="px-6">
                                <WebpageContent :html="createWebpageContent" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="mt-2">
                <button type="submit" class="btn btn-primary btn-sm">
                    Create Webpage
                </button>
            </div>
        </form>
    </div>
</template>