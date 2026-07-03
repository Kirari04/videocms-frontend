<template>
    <div class="flex min-h-screen flex-col items-center justify-center bg-base-200 px-4 py-10">
        <div class="w-full max-w-sm">
            <!-- Brand -->
            <div class="mb-6 flex flex-col items-center gap-2.5">
                <img src="/logo.png" alt="" class="h-12 w-12 object-contain" />
                <span class="text-lg font-semibold tracking-tight">{{ serverConf.AppName || 'VideoCMS' }}</span>
            </div>

            <div class="rounded-box border border-base-300 bg-base-100 p-6">
                <h1 class="text-base font-semibold">Sign in</h1>
                <p class="mt-0.5 mb-5 text-sm text-base-content/70">Use your account credentials.</p>

                <form id="loginForm" @submit.prevent="login" class="flex flex-col gap-4">
                    <label class="flex flex-col gap-1.5">
                        <span class="text-sm font-medium">Username</span>
                        <input type="text" placeholder="Username" class="input w-full" :disabled="loading"
                            name="username" autocomplete="username" autofocus required />
                    </label>

                    <label class="flex flex-col gap-1.5">
                        <span class="text-sm font-medium">Password</span>
                        <input type="password" placeholder="Password" class="input w-full" name="password"
                            :disabled="loading" autocomplete="current-password" required />
                    </label>

                    <!-- CAPTCHA -->
                    <div v-if="serverConf.CaptchaEnabled && serverConf.CaptchaLoginEnabled" id="captcha_container"
                        class="flex min-h-[80px] justify-center">
                        <ClientOnly>
                            <HCaptcha />
                            <RECaptcha />
                            <Turnstile />
                        </ClientOnly>
                    </div>

                    <!-- DEMO INFO -->
                    <div v-if="conf.public.demo" role="note" class="alert alert-info text-sm">
                        <Icon name="lucide:info" class="h-4 w-4 shrink-0" />
                        <div class="flex flex-col">
                            <span class="font-medium">Demo credentials</span>
                            <span>User <strong>admin</strong> · Pass <strong>12345678</strong></span>
                        </div>
                    </div>

                    <!-- ERROR MESSAGE -->
                    <div v-if="err" role="alert" class="alert alert-error text-sm">
                        <Icon name="lucide:alert-circle" class="h-4 w-4 shrink-0" />
                        <span>{{ err }}</span>
                    </div>

                    <button type="submit" class="btn btn-primary w-full" :disabled="loading">
                        <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                        <span v-else>Sign in</span>
                    </button>
                </form>
            </div>

            <p class="mt-4 text-center text-sm text-base-content/60">
                No account? Contact your administrator.
            </p>
        </div>
    </div>
</template>

<script lang="ts" setup>
const conf = useRuntimeConfig();
const serverConf = useServerConfig()
const token = useToken();
const router = useRouter();

// Redirect if already logged in
if (token.value) {
    router.push("/my");
}

let err = ref("");
let loading = ref(false);

const login = async () => {
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
        console.error("Login error:", error);
        err.value = error.data ? error.data : error.message;
    } finally {
        loading.value = false;
    }
};
</script>
