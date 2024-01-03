<template>
    <div data-theme="dark" class="flex flex-col items-center">
        <NuxtLoadingIndicator />
        <Navbar />
        <div class="hero bg-base-200 max-w-[1700px]">
            <div class="w-full p-6">
                <div class="flex flex-col md:flex-row w-full">
                    <PanelMenu />
                    <slot />
                </div>
            </div>
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
import type { ServerConfig } from "../composables/states";

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

// authentications
if (process.client) {
    if (token.value) {
        const { data, error } = await useFetch<{
            exp: string;
            username: string;
        }>(`${conf.public.apiUrl}/auth/check`, {
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
        });
        if (error.value) {
            token.value = "";
        } else {
            tokenExpire.value = new Date(`${data.value?.exp}`);
            let isRegenerating = false;
            myinterval = setInterval(async () => {
                let leftSeconds = Math.round(
                    (tokenExpire.value!.getTime() - new Date().getTime()) / 1000
                );
                if (leftSeconds < 30) {
                    if (isRegenerating) {
                        return;
                    }
                    isRegenerating = true;
                    const { data: refreshData, error } = await useFetch<{
                        exp: string;
                        token: string;
                    }>(`${conf.public.apiUrl}/auth/refresh`, {
                        headers: {
                            Authorization: `Bearer ${token.value}`,
                        },
                    });
                    isRegenerating = false;
                    if (error.value) {
                        console.log(
                            "error",
                            error.value.message,
                            error.value.data
                        );
                        return;
                    }
                    tokenExpire.value = new Date(`${refreshData.value?.exp}`);
                    token.value = refreshData.value?.token;
                }
            }, 1000);
        }
    }
}

const { fetch: fetchAccountData } = useAccountData()
watch(token, () => {
    fetchAccountData()
})
onMounted(() => {
    fetchAccountData()
})

</script>
