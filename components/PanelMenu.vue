<template>
    <div class="h-full bg-base-200 text-base-content w-80 lg:w-64 p-4 flex flex-col border-r border-base-content/5">
        <!-- Sidebar Header / Branding -->
        <div class="mb-6 px-2 flex items-center gap-2">
            <nuxtLink to="/" class="btn btn-ghost normal-case text-xl font-bold tracking-tight text-primary px-2">
                VideoCMS
            </nuxtLink>
        </div>

        <!-- Navigation Menu -->
        <ul class="menu w-full p-0 gap-1">
            <li v-for="menuItem in menuItems" :key="menuItem.href">
                <nuxtLink 
                    :to="menuItem.href" 
                    :class="{ 'active': isActive(menuItem.href) }"
                    class="rounded-lg font-medium hover:bg-base-300"
                >
                    {{ menuItem.text }}
                </nuxtLink>
            </li>
        </ul>
        
        <div class="mt-auto pt-6 border-t border-base-content/10 px-2 text-xs opacity-50">
            <p>VideoCMS Panel</p>
        </div>
    </div>
</template>

<script lang="ts" setup>
const route = useRoute();
const { data: accountData } = useAccountData()

const menuItems = ref<Array<{ text: string; href: string; }>>([]);

onMounted(() => {
    renderMenu()
})

watch(accountData, () => {
    renderMenu()
})

function renderMenu() {
    menuItems.value = [
        { text: "Dashboard", href: "/my" },
        { text: "Videos", href: "/my/videos" },
        { text: "Encodings", href: "/my/encodings" },
        { text: "Webhooks", href: "/my/webhooks" },
        { text: "Account Settings", href: "/my/settings" },
    ];
    
    if (accountData.value?.Admin) {
        menuItems.value.push({ text: "Web Pages", href: "/my/webpages" });
        menuItems.value.push({ text: "Config", href: "/my/config" });
    }
}

// Improved active state detection
function isActive(href: string): boolean {
    if (href === '/my') {
        return route.path === '/my';
    }
    return route.path.startsWith(href);
}
</script>