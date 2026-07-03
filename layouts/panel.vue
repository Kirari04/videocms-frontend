<template>
    <div class="drawer min-h-screen bg-base-200 lg:drawer-open">
        <input id="my-drawer-2" type="checkbox" class="drawer-toggle" />

        <div class="drawer-content flex min-w-0 flex-col">
            <!-- Mobile top bar -->
            <header
                class="sticky top-0 z-(--z-sticky) flex items-center gap-1 border-b border-base-300 bg-base-100 px-3 py-2 lg:hidden">
                <label for="my-drawer-2" class="btn btn-square btn-ghost btn-sm" aria-label="Open navigation">
                    <Icon name="lucide:menu" class="h-5 w-5" />
                </label>
                <span class="ml-1 text-sm font-semibold tracking-tight">
                    {{ serverConfig.AppName || 'VideoCMS' }}
                </span>
                <button
                    onclick="upload_modal.showModal()"
                    class="btn btn-square btn-ghost btn-sm ml-auto"
                    aria-label="Upload video">
                    <Icon name="lucide:upload" class="h-5 w-5" />
                </button>
            </header>

            <main class="mx-auto w-full max-w-7xl grow px-4 py-6 lg:px-8">
                <slot />
            </main>
        </div>

        <div class="drawer-side z-(--z-drawer)">
            <label for="my-drawer-2" aria-label="Close navigation" class="drawer-overlay"></label>
            <PanelMenu />
        </div>

        <!-- Upload Modal -->
        <Teleport to="body">
            <dialog id="upload_modal" class="modal">
                <div class="modal-box w-11/12 max-w-5xl">
                    <form method="dialog">
                        <button class="btn btn-square btn-ghost btn-sm absolute top-3 right-3" aria-label="Close">
                            <Icon name="lucide:x" class="h-4 w-4" />
                        </button>
                    </form>
                    <UploadManager />
                </div>
                <form method="dialog" class="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </Teleport>
    </div>
</template>

<script lang="ts" setup>
import { trackAuthState, type ServerConfig } from "../composables/states";

// Theme Logic
const { initTheme } = useTheme();

// Auth & Router Logic
const token = useToken();
const router = useRouter();
if (!token.value) {
    router.push("/login");
}

// ask if upload should be canceled
router.beforeEach((to, from, next) => {
    if (!to.fullPath.startsWith("/my") && from.fullPath.startsWith("/my")) {
        const uploadList = getUploadQueue();
        if (uploadList.value.length === 0) {
            return next(true)
        }
        if (!confirm("If you move to this page you might kill the upload and its queue. Are u sure?")) {
            return next(false)
        }
    }
    return next(true)
})

const conf = useRuntimeConfig();

// Server Config Logic
const serverConfig = useServerConfig();
const { data, error } = await useFetch<ServerConfig>(
    `${conf.public.apiUrl}/config`
);
if (error.value) {
    throw new Error(`Can't load server config: ${error.value.message}`);
}
if (data.value) {
    serverConfig.value = data.value;
}

// Data Fetching
const { fetch: fetchAccountData } = useAccountData()
const { fetch: fetchWebPage } = useWebPage()
const { fetch: fetchServerVersion } = useServerVersion()

watch(token, () => {
    fetchAccountData().then(() => {
        fetchServerVersion()
    })
    trackAuthState()
})

onMounted(() => {
    initTheme();
    fetchAccountData().then(() => {
        fetchServerVersion()
    })
    trackAuthState()
    fetchWebPage()
})
</script>
