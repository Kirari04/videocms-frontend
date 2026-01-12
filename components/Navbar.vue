<template>
    <div class="sticky top-0 z-40 w-full backdrop-blur flex-none transition-colors duration-500 lg:z-50 lg:border-b lg:border-base-200/50 bg-base-100/80 supports-backdrop-blur:bg-base-100/60">
        <div class="navbar max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex-1">
                <nuxtLink to="/" class="btn btn-ghost normal-case text-xl font-bold tracking-tight text-primary">
                    {{ serverConfig.AppName || 'VideoCMS' }}
                </nuxtLink>
            </div>
            
            <!-- Desktop Menu -->
            <div class="hidden md:flex flex-none items-center gap-2">
                <ul class="menu menu-horizontal px-1 gap-1">
                    <li><nuxtLink to="/" class="font-medium">Homepage</nuxtLink></li>
                    <li v-if="token"><nuxtLink to="/my" class="font-medium">Dashboard</nuxtLink></li>
                </ul>
                <div class="divider divider-horizontal mx-0"></div>
                
                <ThemeToggle />

                <div v-if="!token" class="ml-2">
                    <nuxtLink to="/login" class="btn btn-primary btn-sm">
                        Login
                    </nuxtLink>
                </div>
                <div v-else class="ml-2">
                     <button @click="logout" class="btn btn-error btn-outline btn-sm">
                        Logout
                    </button>
                </div>
            </div>

            <!-- Mobile Menu -->
            <div class="flex-none md:hidden">
                 <ThemeToggle />
                <div class="drawer drawer-end">
                    <input id="navbar-drawer" type="checkbox" class="drawer-toggle" />
                    <div class="drawer-content">
                        <label for="navbar-drawer" class="btn btn-ghost btn-circle ml-1">
                            <Icon name="lucide:more-vertical" class="w-6 h-6" />
                        </label>
                    </div>
                    <div class="drawer-side z-[999]">
                        <label for="navbar-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
                        <ul class="menu p-4 w-80 min-h-full bg-base-100 text-base-content gap-2">
                            <li class="menu-title"><span>Navigation</span></li>
                            <li><nuxtLink to="/">Homepage</nuxtLink></li>
                             <li v-if="token"><nuxtLink to="/my">Dashboard</nuxtLink></li>
                            
                            <div class="divider my-2"></div>
                            
                            <li v-if="!token">
                                <nuxtLink to="/login" class="active:bg-primary text-primary-content bg-primary hover:bg-primary-focus">
                                    Login
                                </nuxtLink>
                            </li>
                            <li v-if="token">
                                <button @click="logout" class="text-error active:bg-error active:text-white">
                                    Logout
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
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