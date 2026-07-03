<template>
    <div class="flex flex-col rounded-box border border-base-300 bg-base-100 p-4">
        <h3 class="mb-3 text-sm font-medium">{{ title }}</h3>
        <div class="relative h-56">
            <!-- First load: skeleton -->
            <div v-if="loading && !hasData" class="skeleton h-full w-full rounded-selector"></div>

            <!-- Error -->
            <div v-else-if="err && !hasData" class="flex h-full items-center justify-center text-center">
                <p class="max-w-[36ch] text-sm text-error">{{ err }}</p>
            </div>

            <!-- Chart: hold previous render at reduced opacity on refetch -->
            <div
                v-else
                class="h-full w-full transition-opacity duration-(--motion-fast)"
                :class="{ 'opacity-50': loading }">
                <slot />
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
defineProps<{
    title: string;
    loading: boolean;
    hasData: boolean;
    err?: string;
}>();
</script>
