<template>
    <div class="flex flex-col items-center">
        <NuxtLoadingIndicator />
        <Navbar />
        <slot />
    </div>
</template>

<script lang="ts" src="@/components/LayoutAuth"></script>
