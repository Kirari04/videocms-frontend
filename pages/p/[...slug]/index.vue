<template>
    <div class="w-full flex justify-center">
        <div class="w-full max-w-[1700px] bg-base-200 flex flex-col gap-6">
            <div :class="pending ? 'loading loading-bars' : 'loading loading-bars opacity-0'"></div>
            <div class="px-6 pt-6">
                <h1 class="text-4xl font-bold">
                    {{ webPages?.find(e => e.Path == frontendPath)?.Title }}
                </h1>
            </div>
            <div v-if="error" class="alert alert-error">
                {{ error.data ? error.data : error.message }}
            </div>
            <WebpageRenderer :html="html" />
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
