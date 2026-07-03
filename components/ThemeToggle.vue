<template>
    <button
        @click="toggleTheme"
        class="btn btn-square btn-ghost btn-sm"
        :title="theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
        :aria-label="theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'">
        <div class="swap swap-rotate" :class="{ 'swap-active': theme === 'dark' }">
            <!-- sun icon (visible when swap is NOT active aka light mode) -->
            <Icon name="lucide:sun" class="swap-off h-4 w-4" />

            <!-- moon icon (visible when swap IS active aka dark mode) -->
            <Icon name="lucide:moon" class="swap-on h-4 w-4" />
        </div>
    </button>
</template>

<script lang="ts" setup>
const { theme, toggleTheme } = useTheme();
</script>
