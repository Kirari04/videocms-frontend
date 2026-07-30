<template>
    <div class="flex w-full justify-center">
        <div class="flex w-full max-w-[70rem] flex-col bg-base-200">
            <div :class="pending ? 'loading loading-bars' : 'loading loading-bars opacity-0'"></div>
            <div class="px-6 pt-8">
                <h1 class="text-3xl font-semibold tracking-tight">
                    {{ pageTitle }}
                </h1>
            </div>
            <div v-if="error" class="alert alert-error mx-6 mt-6">
                {{ error.data ? error.data : error.message }}
            </div>
            <WebpageRenderer v-else :html="html" />
        </div>
    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: "default",
});

const conf = useRuntimeConfig();
const route = useRoute()
const { data: webPages } = useWebPage()

const frontendPath = `/${[...route.params.slug].join("/")}/`.replaceAll("//", "/")
const pageTitle = computed(() => webPages.value?.find(page => page.Path === frontendPath)?.Title || "Page")

const {
    data: html,
    pending,
    error,
} = useFetch<string>(`${conf.public.apiUrl}/p/page`, {
    query: {
        path: frontendPath,
    }
});
</script>
