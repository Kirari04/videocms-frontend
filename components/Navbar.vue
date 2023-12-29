<template>
    <div class="navbar max-w-screen-xl bg-base-100">
        <div class="flex-1">
            <nuxtLink to="/" class="btn btn-ghost normal-case text-xl">
                {{ serverConfig.AppName }}
            </nuxtLink>
        </div>
        <div class="flex-none">
            <div class="drawer md:hidden">
                <input id="navbar" type="checkbox" class="drawer-toggle" />
                <div class="drawer-content">
                    <!-- Page content here -->
                    <label for="navbar" class="btn btn-circle drawer-button">
                        <IconVert class="fill-current shrink-0 w-6 h-6" />
                    </label>
                </div>
                <div class="drawer-side z-50">
                    <label for="navbar" class="drawer-overlay"></label>
                    <ul class="menu p-4 w-80 h-full bg-base-200 text-base-content gap-2 xl:px-0">
                        <li class="flex justify-start">
                            <nuxtLink to="/"> Homepage </nuxtLink>
                        </li>
                        <li v-if="conf.public.currentEdition === 'cloud'">
                            <nuxtLink to="/comparison"> Comparison </nuxtLink>
                        </li>
                        <li v-if="conf.public.currentEdition === 'cloud'">
                            <div class="dropdown dropdown-bottom dropdown-hover">
                                <label tabindex="0">Documentation</label>
                                <ul tabindex="0"
                                    class="dropdown-content z-10 menu p-2 shadow bg-base-100 right-0 rounded-box">
                                    <li>
                                        <nuxtLink :to="conf.public.apiDocs" target="_blank">
                                            Api Documentation
                                        </nuxtLink>
                                    </li>
                                    <li>
                                        <nuxtLink :to="conf.public.tutorial" target="_blank">
                                            Tutorials
                                        </nuxtLink>
                                    </li>
                                </ul>
                            </div>
                        </li>
                        <li v-if="!token">
                            <nuxtLink class="p-0" to="/login">
                                <button class="btn btn-sm btn-primary normal-case">
                                    Login
                                </button>
                            </nuxtLink>
                        </li>
                        <li v-if="token">
                            <nuxtLink class="p-0" to="/my">
                                <button class="btn btn-sm btn-primary normal-case">
                                    Panel
                                </button>
                            </nuxtLink>
                        </li>
                        <li v-if="token">
                            <button @click="logout" class="btn btn-sm btn-error normal-case">
                                Logout
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
            <ul class="hidden md:flex md:flex-row menu gap-2 xl:px-0">
                <li class="flex justify-start">
                    <nuxtLink to="/"> Homepage </nuxtLink>
                </li>
                <li v-if="conf.public.currentEdition === 'cloud'">
                    <nuxtLink to="/comparison"> Comparison </nuxtLink>
                </li>
                <li v-if="conf.public.currentEdition === 'cloud'">
                    <div class="dropdown dropdown-bottom dropdown-hover">
                        <label tabindex="0">Documentation</label>
                        <ul tabindex="0" class="dropdown-content z-10 menu p-2 shadow bg-base-100 right-0 rounded-box">
                            <li>
                                <nuxtLink :to="conf.public.apiDocs" target="_blank">
                                    Api Documentation
                                </nuxtLink>
                            </li>
                            <li>
                                <nuxtLink :to="conf.public.tutorial" target="_blank">
                                    Tutorials
                                </nuxtLink>
                            </li>
                        </ul>
                    </div>
                </li>
                <li v-if="!token">
                    <nuxtLink class="p-0" to="/login">
                        <button class="btn btn-sm btn-primary normal-case">
                            Login
                        </button>
                    </nuxtLink>
                </li>
                <li v-if="token">
                    <nuxtLink class="p-0" to="/my">
                        <button class="btn btn-sm btn-primary normal-case">
                            Panel
                        </button>
                    </nuxtLink>
                </li>
                <li v-if="token">
                    <button @click="logout" class="btn btn-sm btn-error normal-case">
                        Logout
                    </button>
                </li>
            </ul>
        </div>
    </div>
</template>

<script lang="ts" setup>
const token = useToken();
const serverConfig = useServerConfig();
const conf = useRuntimeConfig();
const router = useRouter();
const logout = () => {
    token.value = "";
    router.push("/login");
};

router.afterEach(() => {
    (document.getElementById("navbar") as HTMLInputElement).checked = false;
});
</script>
