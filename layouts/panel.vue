<template>
    <div class="drawer lg:drawer-open min-h-screen bg-base-200">
        <input id="my-drawer-2" type="checkbox" class="drawer-toggle" />
        <div class="drawer-content flex flex-col items-center justify-center">
            <!-- Page content here -->
            <label for="my-drawer-2" class="btn btn-primary drawer-button lg:hidden absolute left-2 top-2 z-50">
                <Icon name="lucide:more-vertical" class="stroke-current shrink-0 h-6 w-6" />
            </label>
            <div class="w-full min-h-screen flex flex-col pt-16 lg:pt-4 px-4 pb-4">
                <slot />
            </div>

        </div>
        <div class="drawer-side z-50">
            <label for="my-drawer-2" aria-label="close sidebar" class="drawer-overlay"></label>
            <PanelMenu />
        </div>

        <!-- Upload Modal & FAB -->
        <Teleport to="body">
            <!-- Quick Access FAB -->
            <div class="fixed bottom-6 right-6 z-50">
                <button onclick="upload_modal.showModal()" class="btn btn-primary btn-circle btn-lg shadow-lg">
                    <Icon name="lucide:upload" class="w-8 h-8" />
                </button>
            </div>

            <!-- Upload Modal -->
            <dialog id="upload_modal" class="modal">
                <div class="modal-box w-11/12 max-w-5xl bg-base-100">
                    <form method="dialog">
                        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
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
const { theme, initTheme } = useTheme();

// Upload & Interval Logic
let myinterval: any = null;
onBeforeUnmount(async () => {
    if (myinterval) {
        console.log(
            "Clear interval: ",
            myinterval,
            clearInterval(myinterval),
            myinterval
        );
    }
});

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

const isUploading = isUploadingState();
const uploadProgress = getUploadProgress();
const conf = useRuntimeConfig();
const tokenExpire = useTokenExpire();

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
const { fetch: fetchAccountData, data: accountData } = useAccountData()
const { fetch: fetchWebPage } = useWebPage()
const { data: serverVersion, fetch: fetchServerVersion } = useServerVersion()

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