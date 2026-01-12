<template>
    <div class="hero min-h-screen bg-base-200">
        <div class="hero-content text-center">
            <div class="max-w-md">
                <h1 class="text-9xl font-bold text-primary">
                    {{ error?.statusCode }}
                </h1>
                <h2 class="text-3xl font-bold mt-4">
                    {{ error?.statusCode === 404 ? 'Page Not Found' : 'An Error Occurred' }}
                </h2>
                <p class="py-6 text-lg opacity-70">
                    {{ error?.message || 'Something went wrong.' }}
                </p>
                <button class="btn btn-primary" @click="handleError">
                    Back to Home
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps({
    error: Object as () => NuxtError
})

const handleError = () => clearError({ redirect: '/' })
</script>