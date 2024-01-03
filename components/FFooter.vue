<template>
    <footer class="flex flex-wrap items-center justify-center gap-6 bg-base-200 p-6 w-full">
        <nuxt-link :to="`/p${webPage.Path}`" v-for="webPage in webPages">
            {{ webPage.Title }}
        </nuxt-link>
    </footer>
</template>

<script lang="ts" setup>


const { data: webPages } = useWebPage()
</script>