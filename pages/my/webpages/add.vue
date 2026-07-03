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
        <div class="flex items-center gap-3 pt-2">
            <NuxtLink to="/my/webpages" class="btn btn-square btn-ghost btn-sm" aria-label="Back to web pages">
                <Icon name="lucide:arrow-left" class="h-4 w-4" />
            </NuxtLink>
            <div class="flex flex-col gap-0.5">
                <h1 class="text-xl font-semibold tracking-tight">New page</h1>
                <p class="text-sm text-base-content/70">Design a custom static page for your site.</p>
            </div>
        </div>

        <!-- Error Alert -->
        <div v-if="errors" class="alert alert-error">
            <Icon name="lucide:alert-circle" class="stroke-current shrink-0 h-6 w-6" />
            <div>{{ errors }}</div>
            <button @click="errors = null" class="btn btn-sm btn-circle btn-ghost ml-auto">✕</button>
        </div>

        <form @submit.prevent="create()" class="flex flex-col gap-6">
            <!-- Editor Section -->
            <div class="rounded-box border border-base-300 bg-base-100">
                <div class="card-body gap-4">
                    <h2 class="card-title text-base mb-2">Page Details</h2>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="form-control">
                            <label class="label">
                                <span class="label-text font-medium">Title</span>
                            </label>
                            <input v-model="createWebpageTitle" type="text" placeholder="e.g. Terms of Service" class="input w-full" required />
                        </div>

                        <div class="form-control">
                            <label class="label">
                                <span class="label-text font-medium">Path</span>
                            </label>
                            <div class="join">
                                <span class="btn btn-ghost join-item no-animation border-base-300 bg-base-200 font-mono">/p</span>
                                <input v-model="createWebpagePath" type="text" placeholder="/terms" class="input join-item w-full" required />
                            </div>
                        </div>
                    </div>

                    <div class="form-control">
                        <label class="label cursor-pointer justify-start gap-4">
                            <input v-model="createWebpageListInFooter" type="checkbox" class="checkbox checkbox-primary" />
                            <span class="label-text font-medium">Show link in footer navigation</span>
                        </label>
                    </div>

                    <div class="form-control flex-1 flex flex-col mt-4">
                        <label class="label">
                            <span class="label-text font-medium">Design</span>
                        </label>
                        <div class="min-h-[600px]">
                            <ClientOnly>
                                <GrapesEditor @update="html => createWebpageContent = html" />
                            </ClientOnly>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Action Bar -->
            <div class="flex justify-end border-t border-base-300 pt-4">
                <button type="submit" class="btn btn-primary btn-sm gap-2 px-6" :disabled="isLoading">
                    <span v-if="isLoading" class="loading loading-spinner loading-xs"></span>
                    <Icon v-else name="lucide:save" class="h-4 w-4" />
                    Create page
                </button>
            </div>
        </form>
    </div>
</template>