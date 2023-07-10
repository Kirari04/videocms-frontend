<template>
    <div class="hero flex min-h-screen w-full bg-base-200">
        <div
            class="hero-content w-full flex flex-col items-center justify-center py-6"
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

                    <label class="label">
                        <span class="label-text-alt text-red-400" v-if="err">{{
                            err
                        }}</span>
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
    router.push("/");
};
</script>
