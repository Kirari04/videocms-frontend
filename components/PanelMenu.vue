<template>
    <div class="h-full bg-base-100 text-base-content w-80 lg:w-72 flex flex-col border-r border-base-200">
        <!-- Sidebar Header / Branding -->
        <div class="p-6 flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-content shadow-lg shadow-primary/30">
                <Icon name="lucide:video" class="w-6 h-6" />
            </div>
            <div class="flex flex-col">
                <span class="font-bold text-lg tracking-tight leading-none">VideoCMS</span>
                <span class="text-xs opacity-50 uppercase tracking-widest font-semibold">Panel</span>
            </div>
        </div>

        <!-- Navigation Menu -->
        <div class="flex-1 overflow-y-auto px-4 py-2">
            <ul class="menu w-full p-0 gap-1.5">
                <li v-for="menuItem in menuItems" :key="menuItem.href">
                    <nuxtLink 
                        :to="menuItem.href" 
                        :class="[
                            'rounded-lg font-medium gap-3 py-3',
                            isActive(menuItem.href) ? 'active bg-primary text-primary-content shadow-md shadow-primary/20' : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
                        ]"
                    >
                        <Icon :name="menuItem.icon" class="w-5 h-5" />
                        {{ menuItem.text }}
                    </nuxtLink>
                </li>
            </ul>
        </div>
        
        <!-- Sidebar Footer / Profile -->
        <div class="p-4 border-t border-base-200 bg-base-100/50">
            <div 
                v-if="accountData" 
                class="flex items-center gap-3 p-3 rounded-xl bg-base-200/50"
            >
                <div class="avatar placeholder">
                    <div class="text-neutral-content rounded-full w-10 bg-neutral">
                        <span class="text-xs">
                            {{ accountData.Username?.substring(0, 2).toUpperCase() }}
                        </span>
                    </div>
                </div>
                <div class="flex flex-col overflow-hidden">
                    <span class="font-bold text-sm truncate transition-colors">
                        {{ accountData.Username }}
                    </span>
                    <span class="text-xs opacity-50 truncate">
                        {{ accountData.Admin ? 'Administrator' : 'User' }}
                    </span>
                </div>
                <nuxtLink to="/my/settings" class="ml-auto btn btn-ghost btn-sm btn-square" title="Account Settings">
                    <Icon 
                        name="lucide:settings" 
                        class="w-4 h-4" 
                    />
                </nuxtLink>
            </div>
            <div v-else class="flex justify-center p-4">
                <span class="loading loading-dots loading-sm opacity-50"></span>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
const route = useRoute();
const { data: accountData } = useAccountData()

const menuItems = ref<Array<{ text: string; href: string; icon: string; }>>([]);

onMounted(() => {
    renderMenu()
})

watch(accountData, () => {
    renderMenu()
})

function renderMenu() {
    menuItems.value = [
        { text: "Dashboard", href: "/my", icon: "lucide:layout-dashboard" },
        { text: "Videos", href: "/my/videos", icon: "lucide:video" },
        { text: "Encodings", href: "/my/encodings", icon: "lucide:cpu" },
        { text: "Webhooks", href: "/my/webhooks", icon: "lucide:webhook" },
    ];
    
    if (accountData.value?.Admin) {
        menuItems.value.push({ text: "Web Pages", href: "/my/webpages", icon: "lucide:file-text" });
        menuItems.value.push({ text: "Config", href: "/my/config", icon: "lucide:settings-2" });
    }
}

function isActive(href: string): boolean {
    if (href === '/my') {
        return route.path === '/my';
    }
    return route.path.startsWith(href);
}
</script>