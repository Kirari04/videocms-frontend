<template>
    <div class="flex flex-col justify-center w-full">
        <div class="hero flex w-full py-6 bg-base-200">
            <div class="w-full flex items-center justify-center py-6">
                <form id="loginForm" @submit="login" class="card bg-base-300 shadow-xl sm:w-96 shadow-base-300">
                    <div class="card-body">
                        <h2 class="card-title">Login</h2>
                        <label class="label">
                            <span class="label-text">Username</span>
                        </label>
                        <input type="text" placeholder="maxmuster" class="input input-bordered w-full" :disabled="loading"
                            name="username" autocomplete="username" :autofocus="true" />
                        <label class="label">
                            <span class="label-text">Password</span>
                        </label>
                        <input type="password" placeholder="secret123" class="input input-bordered w-full" name="password"
                            :disabled="loading" autocomplete="current-password" />

                        <div v-if="serverConf.CaptchaEnabled" id="captcha_container" class="h-[80px]">
                            <ClientOnly placeholder="Loading Captcha">
                                <HCaptcha />
                                <RECaptcha />
                            </ClientOnly>
                        </div>

                        <div v-if="conf.public.demo" class="alert alert-info mt-2">
                            <IconInfo class="stroke-current shrink-0 w-6 h-6" />
                            <div>
                                <div>Login with demo user:</div>
                                <div>
                                    <strong>username:</strong> admin<br />
                                    <strong>password:</strong> 12345678
                                </div>
                            </div>
                        </div>
                        <label class="label">
                            <span class="label-text-alt text-red-400" v-if="err">{{ err }}</span>
                        </label>

                        <div class="card-actions justify-end">
                            <button type="submit" class="btn btn-primary">
                                <span v-if="!loading"> Login</span>
                                <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
const conf = useRuntimeConfig();
const serverConf = useServerConfig()
const token = useToken();
const router = useRouter();
if (token.value) {
    router.push("/");
}

let err = ref("");
let loading = ref(false);

const login = async (e: Event) => {
    e.preventDefault();
    loading.value = true;
    const formData = new FormData(
        document.getElementById("loginForm") as HTMLFormElement
    );
    try {
        const data = await $fetch<{
            exp: string;
            token: string;
        }>(`${conf.public.apiUrl}/auth/login`, {
            method: "post",
            body: formData,
        });
        err.value = "";
        token.value = data?.token;
        router.push("/my");
    } catch (error: any) {
        console.log("error", error.message, error.data);
        err.value = `${error.data ? error.data : error.message}`;
    }
    loading.value = false;
};
</script>
