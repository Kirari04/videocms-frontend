<template>
    <button @click="toggleTheme" class="btn btn-ghost btn-circle">
        <div class="swap swap-rotate" :class="{ 'swap-active': theme === 'dark' }">
            <!-- sun icon (visible when swap is NOT active aka light mode) -->
            <Icon name="lucide:sun" class="swap-off w-6 h-6" />

            <!-- moon icon (visible when swap IS active aka dark mode) -->
            <Icon name="lucide:moon" class="swap-on w-6 h-6" />
        </div>
    </button>
</template>

<script lang="ts" setup>
const { theme, toggleTheme } = useTheme();
</script>
