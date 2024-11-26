<template>
    <div data-theme="dark" class="flex flex-col items-center min-h-screen">
        <NuxtLoadingIndicator />
        <Navbar />
        <div class="hero bg-base-200 max-w-[1700px]">
            <div class="w-full p-6">
                <div class="flex flex-col md:flex-row w-full">
                    <PanelMenu />
                    <div class="flex flex-col w-full">
                        <slot />
                    </div>
                </div>
            </div>
        </div>
        <div class="w-full mt-auto">
            <FFooter />
        </div>
        <dialog id="upload_modal" class="modal">
            <div class="modal-box max-w-5xl">
                <button onclick="upload_modal.close()" type="button"
                    class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                    ✕
                </button>
                <UploadManager />
            </div>

            <form method="dialog" class="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>

        <button onclick="upload_modal.showModal()" class="btn btn-circle fixed bottom-6 right-6 flex">
            <div v-if="uploadProgress > 0" :class="isUploading
                ? 'radial-progress text-primary w-full h-full'
                : 'radial-progress text-primary w-full h-full opacity-0'"
                :style="`--value: ${uploadProgress}; --size: 1.5em`"></div>
            <IconUploadFile
                class="w-6 h-6 stroke-current fill-current absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
        </button>
    </div>
</template>

<script lang="ts" setup>
import { trackAuthState, type ServerConfig } from "../composables/states";

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

const token = useToken();
const router = useRouter();
if (!token.value) {
    router.push("/login");
}

//ask if upload should be cancled
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

const { fetch: fetchAccountData } = useAccountData()
const { fetch: fetchWebPage } = useWebPage()
watch(token, () => {
    fetchAccountData()
    trackAuthState()
})
onMounted(() => {
    fetchAccountData()
    trackAuthState()
    fetchWebPage()
})

</script>
