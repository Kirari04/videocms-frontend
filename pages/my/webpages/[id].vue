<template>
    <div v-if="loading" class="flex flex-col">
        <PageHeader title="Edit static page" description="Loading page content…" />
        <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
            <div class="space-y-6">
                <div class="skeleton h-44 w-full"></div>
                <div class="skeleton h-[34rem] w-full"></div>
            </div>
            <div class="skeleton h-72 w-full"></div>
        </div>
    </div>

    <div v-else-if="errorMessage" class="flex flex-col">
        <PageHeader title="Edit static page" description="The requested page could not be loaded.">
            <NuxtLink to="/my/webpages" class="btn btn-ghost btn-sm">Back</NuxtLink>
        </PageHeader>
        <div class="alert alert-error" role="alert">
            <Icon name="lucide:circle-alert" class="h-5 w-5" />
            <span>{{ errorMessage }}</span>
        </div>
    </div>

    <StaticPageForm v-else-if="page" :page="page" />
</template>

<script setup lang="ts">
import type { AdminWebPage } from "~/types/webpage";

definePageMeta({
    layout: "panel",
    middleware: ["auth", "admin"],
});

const route = useRoute();
const conf = useRuntimeConfig();
const token = useToken();

const page = ref<AdminWebPage | null>(null);
const loading = ref(true);
const errorMessage = ref<string | null>(null);

onMounted(async () => {
    try {
        page.value = await $fetch<AdminWebPage>(`${conf.public.apiUrl}/page/${route.params.id}`, {
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
        });
    } catch (error: any) {
        errorMessage.value = error.data || error.message;
    } finally {
        loading.value = false;
    }
});
</script>
