<template>
    <div v-if="conf.public.currentEdition === 'cloud'" class="flex flex-col w-full max-w-[1700px]">
        <div class="hero w-full py-6 bg-base-300">
            <div class="hero-content flex flex-col py-6">
                <h1 class="text-6xl font-bold">Pricing</h1>
                <div class="overflow-x-auto"></div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: "default",
});

const conf = useRuntimeConfig();
const serverConf = useServerConfig();
</script>
