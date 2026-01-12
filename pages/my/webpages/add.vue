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
    try {
        await $fetch(`${conf.public.apiUrl}/page`, {
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
        errors.value = null;
        navigateTo("/my/webpages");
    } catch (error: any) {
        errors.value = `${error.data ? error.data : error.message}`;
    }
    isLoading.value = false;
}
</script>

<template>
    <div class="flex flex-col grow gap-8">
        <!-- Header -->
        <div class="flex items-center gap-4">
            <NuxtLink to="/my/webpages" class="btn btn-circle btn-ghost">
                <Icon name="lucide:arrow-left" class="w-6 h-6" />
            </NuxtLink>
            <div class="flex flex-col gap-1">
                <h1 class="text-2xl font-bold">Create New Webpage</h1>
                <p class="text-sm opacity-70">Design a custom static page for your site.</p>
            </div>
        </div>

        <!-- Error Alert -->
        <div v-if="errors" class="alert alert-error shadow-lg">
            <Icon name="lucide:alert-circle" class="stroke-current shrink-0 h-6 w-6" />
            <div>{{ errors }}</div>
            <button @click="errors = null" class="btn btn-sm btn-circle btn-ghost ml-auto">✕</button>
        </div>

        <form @submit.prevent="create()" class="flex flex-col gap-6">
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <!-- Editor Section -->
                <div class="card bg-base-100 shadow-xl border border-base-200">
                    <div class="card-body gap-4">
                        <h2 class="card-title text-lg mb-2">Page Details</h2>
                        
                        <div class="form-control">
                            <label class="label">
                                <span class="label-text font-medium">Title</span>
                            </label>
                            <input v-model="createWebpageTitle" type="text" placeholder="e.g. Terms of Service" class="input input-bordered w-full" required />
                        </div>

                        <div class="form-control">
                            <label class="label">
                                <span class="label-text font-medium">Path</span>
                            </label>
                            <div class="join">
                                <span class="btn btn-neutral join-item no-animation">/p</span>
                                <input v-model="createWebpagePath" type="text" placeholder="/terms" class="input input-bordered join-item w-full" required />
                            </div>
                        </div>

                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-4">
                                <input v-model="createWebpageListInFooter" type="checkbox" class="checkbox checkbox-primary" />
                                <span class="label-text font-medium">Show link in footer</span>
                            </label>
                        </div>

                        <div class="form-control flex-1 flex flex-col">
                            <label class="label">
                                <span class="label-text font-medium">Content</span>
                            </label>
                            <div class="min-h-[400px]">
                                <TinyEditor @update="html => createWebpageContent = html" />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Preview Section -->
                <div class="flex flex-col gap-4">
                    <div class="flex items-center justify-between px-2">
                        <h2 class="font-bold text-lg flex items-center gap-2">
                            <Icon name="lucide:eye" class="w-5 h-5" />
                            Live Preview
                        </h2>
                        <span class="badge badge-neutral opacity-50">Read-only</span>
                    </div>
                    
                    <div class="mockup-window border border-base-300 bg-base-300 min-h-[600px] shadow-xl">
                        <div class="bg-base-100 flex justify-center px-4 py-8 min-h-full h-full overflow-y-auto">
                            <div class="prose max-w-none w-full">
                                <h1 v-if="createWebpageTitle">{{ createWebpageTitle }}</h1>
                                <div v-if="!createWebpageContent" class="flex flex-col items-center justify-center h-64 opacity-20">
                                    <Icon name="lucide:layout-template" class="w-16 h-16 mb-4" />
                                    <p>Start typing to see preview...</p>
                                </div>
                                <WebpageContent v-else :html="createWebpageContent" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Action Bar -->
            <div class="flex justify-end pt-4 border-t border-base-200">
                <button type="submit" class="btn btn-primary shadow-lg px-8" :disabled="isLoading">
                    <span v-if="isLoading" class="loading loading-spinner"></span>
                    <Icon v-else name="lucide:save" class="w-5 h-5" />
                    Create Webpage
                </button>
            </div>
        </form>
    </div>
</template>