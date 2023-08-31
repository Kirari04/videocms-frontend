<template>
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 -960 960 960"
        :class="props.class"
    >
        <path
            d="M320-640v320-320Zm-80 400v-480h480v480H240Zm80-80h320v-320H320v320Z"
        />
    </svg>
</template>

<script lang="ts" setup>
const props = defineProps<{
    class: string;
}>();
</script>
