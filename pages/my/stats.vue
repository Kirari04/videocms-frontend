<template>
    <div class="hero bg-base-200 max-w-screen-xl">
        <div class="hero-content w-full">
            <div class="flex w-full">
                <PanelMenu />
                <div class="flex flex-col grow">No Stats available</div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    middleware: "auth",
});
</script>
