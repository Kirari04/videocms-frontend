<template>
    <footer class="flex flex-wrap items-center justify-center gap-6 bg-base-200 p-6 w-full">
        <nuxt-link :to="`/p${webPage.Path}`" v-for="webPage in webPages">
            {{ webPage.Title }}
        </nuxt-link>
        <nuxt-link :to="'https://videocms-docs.vercel.app/'" target="_blank"
            class="btn">
            <img src="https://raw.githubusercontent.com/Kirari04/videocms/master/public/logo.png" class="w-6 h-6" />
            Docs
        </nuxt-link>
    </footer>
</template>

<script lang="ts" setup>


const { data: webPages } = useWebPage()
const serverConfig = useServerConfig();
</script>