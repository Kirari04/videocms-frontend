<template>
    <div class="min-h-screen bg-base-200">
        <Navbar />
        <div class="w-full min-h-screen flex flex-col">
            <slot />
        </div>
        <FFooter />
    </div>
</template>

<script lang="ts" setup>
import { trackAuthState, type ServerConfig } from "../composables/states";

// Theme Logic
const { theme, initTheme } = useTheme();

// Server Config Logic
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

// Auth & WebPage Logic
const token = useToken()
const { fetch: fetchWebPage } = useWebPage()

onMounted(() => {
    initTheme();
    fetchWebPage();
    trackAuthState();
});

watch(token, () => {
    trackAuthState();
});
</script>