<template>
    <header class="sticky top-0 z-(--z-sticky) w-full border-b border-base-300 bg-base-100/90 backdrop-blur">
        <div class="navbar mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="flex-1">
                <nuxtLink to="/" class="flex items-center gap-2.5 text-base font-semibold tracking-tight">
                    <img src="/logo.png" alt="" class="h-7 w-7 object-contain" />
                    {{ serverConfig.AppName || 'VideoCMS' }}
                </nuxtLink>
            </div>

            <!-- Desktop Menu -->
            <div class="hidden flex-none items-center gap-1 md:flex">
                <nuxtLink to="/" class="btn btn-ghost btn-sm font-medium">Home</nuxtLink>
                <a href="https://videocms-docs.vercel.app/" target="_blank" class="btn btn-ghost btn-sm font-medium">Docs</a>
                <nuxtLink v-if="token" to="/my" class="btn btn-ghost btn-sm font-medium">Panel</nuxtLink>

                <ThemeToggle class="ml-1" />

                <nuxtLink v-if="!token" to="/login" class="btn btn-primary btn-sm ml-2">
                    Sign in
                </nuxtLink>
                <button v-else @click="logout" class="btn btn-ghost btn-sm ml-2 border-base-300">
                    Log out
                </button>
            </div>

            <!-- Mobile Menu -->
            <div class="flex-none md:hidden">
                <ThemeToggle />
                <div class="drawer drawer-end inline-block w-auto">
                    <input id="navbar-drawer" type="checkbox" class="drawer-toggle" />
                    <div class="drawer-content">
                        <label for="navbar-drawer" class="btn btn-square btn-ghost btn-sm ml-1" aria-label="Open menu">
                            <Icon name="lucide:menu" class="h-5 w-5" />
                        </label>
                    </div>
                    <div class="drawer-side z-(--z-drawer)">
                        <label for="navbar-drawer" aria-label="Close menu" class="drawer-overlay"></label>
                        <div class="flex min-h-full w-72 flex-col gap-1 border-l border-base-300 bg-base-100 p-4 text-base-content">
                            <p class="px-3 pb-1.5 text-xs font-medium text-base-content/60">Navigation</p>
                            <nuxtLink to="/" class="rounded-field px-3 py-2 text-sm font-medium hover:bg-base-200">Home</nuxtLink>
                            <a href="https://videocms-docs.vercel.app/" target="_blank"
                                class="rounded-field px-3 py-2 text-sm font-medium hover:bg-base-200">Docs</a>
                            <nuxtLink v-if="token" to="/my"
                                class="rounded-field px-3 py-2 text-sm font-medium hover:bg-base-200">Panel</nuxtLink>

                            <div class="my-2 border-t border-base-300"></div>

                            <nuxtLink v-if="!token" to="/login" class="btn btn-primary btn-sm">
                                Sign in
                            </nuxtLink>
                            <button v-if="token" @click="logout" class="btn btn-ghost btn-sm border-base-300">
                                Log out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </header>
</template>

<script lang="ts" setup>
const token = useToken();
const serverConfig = useServerConfig();
const router = useRouter();

const logout = () => {
    token.value = "";
    router.push("/login");
};

// Close mobile menu on route change
router.afterEach(() => {
    const drawerToggle = document.getElementById("navbar-drawer") as HTMLInputElement;
    if (drawerToggle) drawerToggle.checked = false;
});
</script>
