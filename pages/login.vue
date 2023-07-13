<template>
    <div class="flex flex-col w-full max-w-screen-xl">
        <div class="hero flex w-full py-6 bg-base-200">
            <div
                class="hero-content w-full flex items-center justify-center py-6"
            >
                <form
                    @submit="login"
                    class="card bg-base-300 shadow-xl sm:w-96 shadow-base-300"
                >
                    <div class="card-body">
                        <h2 class="card-title">Login</h2>
                        <label class="label">
                            <span class="label-text">Username</span>
                        </label>
                        <input
                            type="text"
                            placeholder="maxmuster"
                            class="input input-bordered w-full"
                            :disabled="loading"
                            v-model="username"
                            autocomplete="username"
                            :autofocus="true"
                        />
                        <label class="label">
                            <span class="label-text">Password</span>
                        </label>
                        <input
                            type="password"
                            placeholder="secret123"
                            class="input input-bordered w-full"
                            v-model="password"
                            :disabled="loading"
                            autocomplete="current-password"
                        />
                        <div class="alert alert-info mt-2">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                class="stroke-current shrink-0 w-6 h-6"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                ></path>
                            </svg>
                            <div>
                                <div>Login with demo user:</div>
                                <div>
                                    <button
                                        @click="
                                            (e) => {
                                                username = 'admin';
                                                password = '12345678';
                                                login(e);
                                            }
                                        "
                                        type="button"
                                        class="btn btn-sm btn-outline btn-active"
                                    >
                                        Try now
                                    </button>
                                </div>
                            </div>
                        </div>
                        <label class="label">
                            <span
                                class="label-text-alt text-red-400"
                                v-if="err"
                                >{{ err }}</span
                            >
                        </label>

                        <div class="card-actions justify-end">
                            <button type="submit" class="btn btn-primary">
                                <span v-if="!loading"> Login</span>
                                <span
                                    v-if="loading"
                                    class="loading loading-spinner loading-sm"
                                ></span>
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
const token = useToken();
const router = useRouter();
if (token.value) {
    router.push("/");
}

let err = ref("");
let loading = ref(false);

let username = ref("");
let password = ref("");

const login = async (e: Event) => {
    e.preventDefault();
    loading.value = true;
    const formData = new FormData();
    formData.append("username", username.value);
    formData.append("password", password.value);
    const { data, error } = await useFetch<{
        exp: string;
        token: string;
    }>(`${conf.public.apiUrl}/auth/login`, {
        method: "post",
        body: formData,
    });
    loading.value = false;
    if (error.value) {
        console.log("error", error.value.message, error.value.data);
        err.value = `${error.value?.data}`;
        return;
    }
    err.value = "";
    token.value = data.value?.token;
    router.push("/my");
};
</script>
