<template>
    <ul class="menu bg-base-200 w-56 rounded-box grow-0">
        <li>
            <h2 class="menu-title">{{ serverConf.AppName }} Panel</h2>
            <ul>
                <li>
                    <nuxtLink to="/my">Dashboard</nuxtLink>
                </li>
                <li>
                    <nuxtLink to="/my/videos">Videos</nuxtLink>
                </li>
                <li>
                    <nuxtLink to="/my/stats">Statistics</nuxtLink>
                </li>
            </ul>
        </li>
    </ul>
</template>

<script lang="ts" setup>
const serverConf = useServerConfig();
</script>
