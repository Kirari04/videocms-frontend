<template>
    <div class="navbar max-w-screen-xl bg-base-100">
        <div class="flex-1">
            <nuxtLink to="/" class="btn btn-ghost normal-case text-xl">
                {{ serverConfig.AppName }}
            </nuxtLink>
        </div>
        <div class="flex-none">
            <ul class="menu menu-horizontal gap-2 xl:px-0">
                <li v-if="!token">
                    <nuxtLink class="p-0" to="/login">
                        <button class="btn btn-sm btn-primary normal-case">
                            Login
                        </button>
                    </nuxtLink>
                </li>
                <li v-if="token">
                    <a class="p-0" :href="conf.public.apiDocs" target="_blank">
                        <button class="btn btn-sm btn-neutral normal-case">
                            Docs
                        </button>
                    </a>
                </li>
                <li v-if="token">
                    <nuxtLink class="p-0" to="/my">
                        <button class="btn btn-sm btn-primary normal-case">
                            Panel
                        </button>
                    </nuxtLink>
                </li>
            </ul>
        </div>
    </div>
</template>

<script lang="ts" setup>
const token = useToken();
const serverConfig = useServerConfig();
const conf = useRuntimeConfig();
</script>
