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

const createWebpageTitle = ref("")
const createWebpageContent = ref("")
const openCreateWebpage = () => {
    (
        document.getElementById("create_webpage_modal") as HTMLDialogElement
    ).showModal();
};
const createWebpage = () => { }
</script>

<template>
    <div class="flex flex-col gap-2 w-full">
        <h1 class="font-bold text-lg">Create New Webpage</h1>
        <form @submit.prevent="createWebpage" class="flex flex-col">
            <div class="mt-2 flex flex-col gap-2">
                <input v-model="createWebpageTitle" type="text" placeholder="Title"
                    class="input input-bordered w-full max-w-xs" autofocus />
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