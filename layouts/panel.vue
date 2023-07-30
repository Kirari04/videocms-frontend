<template>
    <div class="flex flex-col items-center">
        <NuxtLoadingIndicator />
        <Navbar />
        <div class="hero bg-base-200 max-w-screen-xl">
            <div class="hero-content w-full">
                <div class="flex flex-col md:flex-row w-full">
                    <PanelMenu />
                    <slot />
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" src="@/components/LayoutAuth"></script>
