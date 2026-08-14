<template>
    <aside class="flex h-full min-h-screen w-72 flex-col border-r border-base-300 bg-base-100 text-base-content">
        <!-- Brand -->
        <nuxtLink to="/my" class="flex items-center gap-2.5 px-5 pt-5 pb-4">
            <img src="/logo.png" alt="" class="h-8 w-8 object-contain" />
            <span class="text-base font-semibold tracking-tight">
                {{ serverConfig.AppName || 'VideoCMS' }}
            </span>
        </nuxtLink>

        <!-- Upload -->
        <div class="px-4 pb-2">
            <nuxtLink to="/my/upload" class="btn btn-primary btn-sm btn-block gap-2">
                <Icon name="lucide:upload" class="h-4 w-4" />
                Upload video
            </nuxtLink>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto px-4 py-3">
            <ul class="flex flex-col gap-0.5">
                <li v-for="item in mainItems" :key="item.href">
                    <nuxtLink :to="item.href" :class="linkClass(item.href)">
                        <Icon :name="item.icon" class="h-4 w-4 shrink-0" />
                        {{ item.text }}
                    </nuxtLink>
                </li>
            </ul>

            <template v-if="accountData?.Admin">
                <p class="px-3 pt-6 pb-1.5 text-xs font-medium text-base-content/60">Administration</p>
                <ul class="flex flex-col gap-0.5">
                    <li v-for="item in adminItems" :key="item.href">
                        <nuxtLink :to="item.href" :class="linkClass(item.href)">
                            <Icon :name="item.icon" class="h-4 w-4 shrink-0" />
                            {{ item.text }}
                        </nuxtLink>
                    </li>
                </ul>
            </template>

            <ul class="mt-6 flex flex-col gap-0.5 border-t border-base-300 pt-3">
                <li>
                    <nuxtLink to="/" :class="linkClass('/')">
                        <Icon name="lucide:globe" class="h-4 w-4 shrink-0" />
                        View site
                    </nuxtLink>
                </li>
            </ul>
        </nav>

        <!-- Active upload indicator -->
        <nuxtLink
            v-if="isUploading"
            to="/my/upload"
            class="mx-4 mb-2 flex flex-col gap-1.5 rounded-field border border-base-300 bg-base-200 px-3 py-2 text-left transition-colors hover:border-primary/40">
            <span class="flex items-center justify-between text-xs font-medium">
                <span class="flex items-center gap-1.5">
                    <Icon name="lucide:upload" class="h-3.5 w-3.5 text-primary" />
                    Uploading
                </span>
                <span class="tabular-nums text-base-content/70">{{ Math.round(uploadProgress) }}%</span>
            </span>
            <progress class="progress progress-primary h-1" :value="uploadProgress" max="100"></progress>
        </nuxtLink>

        <!-- Footer -->
        <div class="border-t border-base-300 px-4 py-3">
            <div v-if="accountData" class="flex items-center gap-2.5">
                <div
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral text-xs font-medium text-neutral-content"
                    aria-hidden="true">
                    {{ accountData.Username?.substring(0, 2).toUpperCase() }}
                </div>
                <div class="flex min-w-0 flex-col">
                    <span class="truncate text-sm font-medium">{{ accountData.Username }}</span>
                    <span class="truncate text-xs text-base-content/60">
                        {{ accountData.Admin ? 'Administrator' : 'User' }}
                    </span>
                </div>
                <div class="ml-auto flex items-center">
                    <ThemeToggle />
                    <nuxtLink to="/my/settings" class="btn btn-square btn-ghost btn-sm" title="Account settings"
                        aria-label="Account settings">
                        <Icon name="lucide:settings" class="h-4 w-4" />
                    </nuxtLink>
                    <button @click="logout" class="btn btn-square btn-ghost btn-sm" title="Log out" aria-label="Log out">
                        <Icon name="lucide:log-out" class="h-4 w-4" />
                    </button>
                </div>
            </div>
            <div v-else class="flex items-center gap-2.5" aria-hidden="true">
                <div class="skeleton h-8 w-8 shrink-0 rounded-full"></div>
                <div class="flex flex-col gap-1.5">
                    <div class="skeleton h-3 w-24"></div>
                    <div class="skeleton h-2.5 w-16"></div>
                </div>
            </div>
        </div>
    </aside>
</template>

<script lang="ts" setup>
const route = useRoute();
const router = useRouter();
const token = useToken();
const serverConfig = useServerConfig();
const { data: accountData } = useAccountData();

const isUploading = isUploadingState();
const uploadProgress = getUploadProgress();

const mainItems = [
    { text: "Dashboard", href: "/my", icon: "lucide:layout-dashboard" },
    { text: "Videos", href: "/my/videos", icon: "lucide:video" },
    { text: "Jobs", href: "/my/encodings", icon: "lucide:list-checks" },
    { text: "Webhooks", href: "/my/webhooks", icon: "lucide:webhook" },
];

const adminItems = [
    { text: "Users", href: "/my/users", icon: "lucide:users" },
    { text: "Background jobs", href: "/my/tasks", icon: "lucide:list-checks" },
    { text: "Static pages", href: "/my/webpages", icon: "lucide:file-text" },
    { text: "Storage", href: "/my/storage", icon: "lucide:database" },
    { text: "System stats", href: "/my/stats", icon: "lucide:activity" },
    { text: "Config", href: "/my/config", icon: "lucide:sliders-horizontal" },
];

function isActive(href: string): boolean {
    if (href === '/my' || href === '/') {
        return route.path === href;
    }
    return route.path.startsWith(href);
}

function linkClass(href: string) {
    return [
        'flex items-center gap-2.5 rounded-field px-3 py-2 text-sm font-medium transition-colors',
        isActive(href)
            ? 'bg-primary/10 text-primary'
            : 'text-base-content/70 hover:bg-base-200 hover:text-base-content',
    ];
}

const logout = () => {
    token.value = "";
    router.push("/login");
};
</script>
