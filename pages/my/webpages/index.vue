<template>
    <div class="flex flex-col">
        <PageHeader title="Static pages" description="Supporting content served under /p.">
            <button
                type="button"
                class="btn btn-square btn-ghost btn-sm"
                aria-label="Refresh pages"
                :disabled="loading"
                @click="load">
                <Icon name="lucide:refresh-cw" class="h-4 w-4" :class="{ 'animate-spin': loading }" />
            </button>
            <NuxtLink to="/my/webpages/add" class="btn btn-primary btn-sm gap-2">
                <Icon name="lucide:plus" class="h-4 w-4" />
                New page
            </NuxtLink>
        </PageHeader>

        <div v-if="errorMessage" class="alert alert-error mb-6" role="alert">
            <Icon name="lucide:circle-alert" class="h-5 w-5" />
            <span>{{ errorMessage }}</span>
        </div>

        <div class="overflow-hidden rounded-box border border-base-300 bg-base-100">
            <div v-if="loading && pages.length === 0" class="space-y-3 p-4" aria-label="Loading pages">
                <div v-for="row in 4" :key="row" class="grid grid-cols-[1fr_6rem] gap-6 py-2">
                    <div class="space-y-2">
                        <div class="skeleton h-4 w-1/3"></div>
                        <div class="skeleton h-3 w-1/2"></div>
                    </div>
                    <div class="skeleton h-8 w-full"></div>
                </div>
            </div>

            <div
                v-else-if="pages.length === 0"
                class="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                <Icon name="lucide:file-text" class="h-7 w-7 text-base-content/30" />
                <p class="text-sm font-medium">No static pages yet</p>
                <p class="max-w-[45ch] text-sm text-base-content/70">
                    Add supporting content such as a privacy policy, terms, or an imprint.
                </p>
                <NuxtLink to="/my/webpages/add" class="btn btn-primary btn-sm mt-2">Create a page</NuxtLink>
            </div>

            <div v-else class="overflow-x-auto" :class="{ 'opacity-60': loading }">
                <table class="table table-sm">
                    <thead>
                        <tr class="border-base-300 text-xs text-base-content/70">
                            <th class="font-medium">Page</th>
                            <th class="font-medium">Status</th>
                            <th class="font-medium">Footer</th>
                            <th class="font-medium">Updated</th>
                            <th class="text-right font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="page in pages" :key="page.ID" class="border-base-300 hover:bg-base-200/60">
                            <td>
                                <div class="font-medium">{{ page.Title }}</div>
                                <div class="font-mono text-xs text-base-content/70">/p{{ page.Path }}</div>
                            </td>
                            <td>
                                <span
                                    class="badge badge-sm border-none"
                                    :class="page.Published ? 'bg-success/10 text-success' : 'badge-ghost'">
                                    {{ page.Published ? "Published" : "Hidden" }}
                                </span>
                            </td>
                            <td>
                                <span v-if="page.ListInFooter" class="text-sm">Included</span>
                                <span v-else class="text-sm text-base-content/70">Not included</span>
                            </td>
                            <td class="whitespace-nowrap text-sm text-base-content/70">
                                {{ formatDate(page.UpdatedAt) }}
                            </td>
                            <td>
                                <div class="flex justify-end gap-1">
                                    <NuxtLink
                                        v-if="page.Published"
                                        :to="`/p${page.Path}`"
                                        target="_blank"
                                        class="btn btn-square btn-ghost btn-sm"
                                        :aria-label="`Open ${page.Title}`">
                                        <Icon name="lucide:external-link" class="h-4 w-4" />
                                    </NuxtLink>
                                    <NuxtLink
                                        :to="`/my/webpages/${page.ID}`"
                                        class="btn btn-square btn-ghost btn-sm"
                                        :aria-label="`Edit ${page.Title}`">
                                        <Icon name="lucide:pencil" class="h-4 w-4" />
                                    </NuxtLink>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { AdminWebPage } from "~/types/webpage";

definePageMeta({
    layout: "panel",
    middleware: ["auth", "admin"],
});

const conf = useRuntimeConfig();
const token = useToken();
const pages = ref<AdminWebPage[]>([]);
const loading = ref(false);
const errorMessage = ref<string | null>(null);

async function load() {
    loading.value = true;
    errorMessage.value = null;
    try {
        pages.value = await $fetch<AdminWebPage[]>(`${conf.public.apiUrl}/pages`, {
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
        });
    } catch (error: any) {
        errorMessage.value = error.data || error.message;
    } finally {
        loading.value = false;
    }
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
    }).format(new Date(value));
}

onMounted(load);
</script>
