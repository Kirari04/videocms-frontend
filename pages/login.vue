<template>
    <div class="min-h-screen flex items-center justify-center bg-base-200">
        <div class="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl bg-base-100 min-h-[600px] m-4">
            
            <!-- Left Side: Branding (Desktop Only) -->
            <div class="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-primary to-accent text-primary-content relative overflow-hidden">
                <!-- Decorative circles -->
                <div class="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white/10 blur-3xl"></div>
                <div class="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 rounded-full bg-black/10 blur-3xl"></div>

                <div class="relative z-10">
                    <h2 class="text-4xl font-bold mb-2">{{ serverConf.AppName || 'VideoCMS' }}</h2>
                    <p class="opacity-80 text-lg">Your content, your control.</p>
                </div>

                <div class="relative z-10">
                     <p class="font-medium text-lg italic">
                        "The best way to manage and stream your video content securely and efficiently."
                    </p>
                </div>
            </div>

            <!-- Right Side: Login Form -->
            <div class="flex flex-col justify-center p-8 sm:p-12 relative">
                <div class="max-w-md w-full mx-auto">
                    <!-- Mobile Logo -->
                    <div class="md:hidden text-center mb-8">
                         <h1 class="text-3xl font-bold text-primary">{{ serverConf.AppName || 'VideoCMS' }}</h1>
                    </div>

                    <h2 class="text-3xl font-bold mb-2">Welcome Back</h2>
                    <p class="text-base-content/60 mb-8">Please enter your details to sign in.</p>

                    <form id="loginForm" @submit.prevent="login" class="space-y-4">
                        <div class="form-control">
                            <label class="label">
                                <span class="label-text font-medium">Username</span>
                            </label>
                            <input type="text" placeholder="Enter your username" class="input input-bordered w-full focus:input-primary transition-all" :disabled="loading"
                                name="username" autocomplete="username" autofocus required />
                        </div>
                        
                        <div class="form-control">
                            <label class="label">
                                <span class="label-text font-medium">Password</span>
                            </label>
                            <input type="password" placeholder="••••••••" class="input input-bordered w-full focus:input-primary transition-all" name="password"
                                :disabled="loading" autocomplete="current-password" required />
                        </div>

                        <!-- CAPTCHA -->
                        <div v-if="serverConf.CaptchaEnabled" id="captcha_container" class="min-h-[80px] flex justify-center">
                            <ClientOnly>
                                <HCaptcha />
                                <RECaptcha />
                            </ClientOnly>
                        </div>

                        <!-- DEMO INFO -->
                        <div v-if="conf.public.demo" class="alert alert-info shadow-sm text-sm">
                            <Icon name="lucide:info" class="stroke-current shrink-0 w-5 h-5" />
                            <div class="flex flex-col">
                                <span class="font-bold">Demo Credentials:</span>
                                <span>User: <strong>admin</strong> | Pass: <strong>12345678</strong></span>
                            </div>
                        </div>

                        <!-- ERROR MESSAGE -->
                        <div v-if="err" class="alert alert-error shadow-sm text-sm">
                            <Icon name="lucide:alert-circle" class="stroke-current shrink-0 h-6 w-6" />
                            <span>{{ err }}</span>
                        </div>

                        <button type="submit" class="btn btn-primary w-full shadow-lg shadow-primary/20" :disabled="loading">
                            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                            <span v-else>Sign In</span>
                        </button>
                    </form>
                    
                    <div class="mt-8 text-center text-sm opacity-60">
                        <p>Don't have an account? Contact your administrator.</p>
                    </div>
                </div>
            </div>
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