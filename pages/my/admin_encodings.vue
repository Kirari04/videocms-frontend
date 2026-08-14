<template><div /></template>

<script lang="ts" setup>
definePageMeta({ layout: "panel", middleware: "auth" });
await navigateTo("/my/tasks", { replace: true, redirectCode: 301 });
</script>
