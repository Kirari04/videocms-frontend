<template>
    <div class="join" role="group" aria-label="Time range">
        <button
            v-for="range in chartTimeRanges"
            :key="range.label"
            @click="$emit('update:modelValue', range.hours)"
            class="btn join-item btn-xs border-base-300"
            :class="modelValue === range.hours
                ? 'bg-primary/10 text-primary hover:bg-primary/15'
                : 'btn-ghost text-base-content/70'"
            :aria-pressed="modelValue === range.hours">
            {{ range.label }}
        </button>
    </div>
</template>

<script lang="ts" setup>
defineProps<{
    modelValue: number;
}>();

defineEmits<{
    (e: "update:modelValue", hours: number): void;
}>();
</script>
