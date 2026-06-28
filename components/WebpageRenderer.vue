<template>
    <div class="vc-page-shell">
        <div class="vc-page-renderer" v-html="html || ''"></div>
    </div>
</template>

<script lang="ts" setup>
defineProps<{
    html?: string | null
}>()
</script>
