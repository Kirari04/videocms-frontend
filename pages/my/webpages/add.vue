<template>
    <StaticPageForm />
</template>

<script setup lang="ts">
definePageMeta({
    layout: "panel",
    middleware: ["auth", "admin"],
});
</script>
