<template>
    <div class="flex flex-col">
        <div class="toast toast-top toast-end z-10">
            <div class="alert alert-error" v-if="err">
                <IconError class="stroke-current shrink-0 h-6 w-6" />
                <div>{{ err }}</div>
            </div>
        </div>
        <div v-if="!accountData?.Admin" class="alert alert-error">
            You don't have access to this page
        </div>
        <div v-if="accountData?.Admin" class="flex flex-col gap-4 p-6">
            <table class="table" v-if="datas">
                <tbody>
                    <tr>
                        <th>Setting</th>
                        <th>Value</th>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <button @click="load()" :disabled="isLoading" class="btn btn-neutral">
                                Reload
                            </button>
                        </td>
                    </tr>
                    <tr v-for="(value, key) in datas">
                        <td>
                            {{ key }}
                        </td>
                        <td>
                            <input :value="value"
                                @input="e => (datas as any)[key] = (e.target as HTMLInputElement).value" type="text"
                                class="input text-base-content"
                                :disabled="['ID', 'CreatedAt', 'UpdatedAt', 'DeletedAt'].includes(key)">
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <button @click="update()" :disabled="isLoading" class="btn btn-primary">
                                Save
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: "panel",
    middleware: "auth",
});

const { data: accountData } = useAccountData()
watch(accountData, () => {
    if (accountData.value) {
        if (!accountData.value.Admin) {
            navigateTo("/my", {
                redirectCode: 307,
            })
        }
    }
})

const conf = useRuntimeConfig();
const token = useToken();
const err = ref("");
const isLoading = ref(false)

const datas = ref<ConfigResponse | null>(null)
onMounted(() => {
    load()
})

async function load() {
    isLoading.value = true;
    const {
        data,
        error,
    } = await useFetch<ConfigResponse>(`${conf.public.apiUrl}/settings`, {
        headers: {
            Authorization: `Bearer ${token.value}`,
        },
    });

    if (error.value) {
        err.value = `${error.value?.data}`;
        isLoading.value = false;
        return;
    }
    if (data.value) {
        datas.value = data.value
    }
    isLoading.value = false;
}

async function update() {
    isLoading.value = true;
    const {
        error,
    } = await useFetch(`${conf.public.apiUrl}/settings`, {
        method: "put",
        headers: {
            Authorization: `Bearer ${token.value}`,
        },
        body: datas.value,
    });

    if (error.value) {
        err.value = `${error.value?.data}`;
        isLoading.value = false;
        return;
    }
    isLoading.value = false;
    load();
}

export interface ConfigResponse {
    ID: number
    CreatedAt: string
    UpdatedAt: string
    DeletedAt: any
    AppName: string
    Project: string
    ProjectDocumentation: string
    ProjectDownload: string
    JwtSecretKey: string
    JwtUploadSecretKey: string
    CookieDomain: string
    ReloadHtml: string
    EncodingEnabled: string
    UploadEnabled: string
    RatelimitEnabled: string
    CloudflareEnabled: string
    MaxItemsMultiDelete: string
    MaxRunningEncodes: string
    MaxUploadFilesize: string
    MaxUploadChuncksize: string
    MaxUploadSessions: string
    MaxPostSize: string
    CorsAllowOrigins: string
    CorsAllowHeaders: string
    CorsAllowCredentials: string
    CaptchaEnabled: string
    CaptchaType: string
    Captcha_Recaptcha_PrivateKey: string
    Captcha_Recaptcha_PublicKey: string
    Captcha_Hcaptcha_PrivateKey: string
    Captcha_Hcaptcha_PublicKey: string
    EncodeHls240p: string
    EncodeHls360p: string
    EncodeHls480p: string
    EncodeHls720p: string
    EncodeHls1080p: string
    EncodeHls1440p: string
    EncodeHls2160p: string
    EncodeAv1: string
    EncodeVp9: string
    EncodeH264: string
    FFmpegAv1AudioCodec: string
    FFmpegVp9AudioCodec: string
    FFmpegH264AudioCodec: string
    FFmpegAv1Crf: string
    FFmpegVp9Crf: string
    FFmpegH264Crf: string
    FFmpegAv1Height: string
    FFmpegAv1Width: string
    FFmpegVp9Height: string
    FFmpegVp9Width: string
    FFmpegH264Height: string
    FFmpegH264Width: string
}

</script>
