<template>
    <div class="vc-page-shell" :class="{ 'vc-page-shell-preview': compact }">
        <div class="vc-page-renderer" v-html="html || ''"></div>
    </div>
</template>

<script lang="ts" setup>
withDefaults(defineProps<{
    html?: string | null
    compact?: boolean
}>(), {
    html: "",
    compact: false,
})
</script>
