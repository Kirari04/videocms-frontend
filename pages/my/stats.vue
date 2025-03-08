<template>
    <div class="flex flex-col gap-4">
        <div class="alert alert-warning">
            <IconInfo class="stroke-current shrink-0 h-6 w-6" />
            Page under construction
        </div>
        <!-- <div class="flex flex-col grow">No Stats available</div> -->
    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: "panel",
    middleware: "auth",
});
</script>
