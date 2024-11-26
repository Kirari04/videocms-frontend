<template>
    <div data-theme="dark" class="flex flex-col items-center min-h-screen">
        <NuxtLoadingIndicator />
        <Navbar />
        <div class="flex flex-col items-center w-full grow">
            <slot />
        </div>
        <div class="mt-auto w-full">
            <FFooter />
        </div>
    </div>
</template>

<script lang="ts" setup>
import { trackAuthState, type ServerConfig } from "../composables/states";

const conf = useRuntimeConfig();
const serverConfig = useServerConfig();
const { data, error } = await useFetch<ServerConfig>(
    `${conf.public.apiUrl}/config`
);
if (error.value) {
    throw new Error(`Can't load server config: ${error.value.message}`);
}
if (data.value) {
    serverConfig.value = data.value;
}

const token = useToken()
const { fetch: fetchWebPage } = useWebPage()
onMounted(() => {
    fetchWebPage()
    trackAuthState()
})
watch(token, () => {
    trackAuthState()
})
</script>
