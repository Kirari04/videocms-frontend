<template>
    <div class="flex flex-col items-center justify-center w-full h-screen gap-6">
        <h2 class="text-4xl">{{ error?.statusCode }}</h2>
        <button class="btn" @click="handleError">Back to Home</button>
    </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps({
    error: Object as () => NuxtError
})

const handleError = () => clearError({ redirect: '/' })
</script>
