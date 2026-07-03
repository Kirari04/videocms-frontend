<template>
    <header class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 pt-2 pb-6">
        <div class="flex min-w-0 flex-col gap-1">
            <h1 class="text-xl font-semibold tracking-tight text-base-content">
                {{ title }}
            </h1>
            <p v-if="description" class="max-w-[65ch] text-sm text-base-content/70">
                {{ description }}
            </p>
        </div>
        <div v-if="$slots.default" class="flex shrink-0 items-center gap-2">
            <slot />
        </div>
    </header>
</template>

<script lang="ts" setup>
defineProps<{
    title: string;
    description?: string;
}>();
</script>
