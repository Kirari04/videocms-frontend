<template>
    <div class="flex flex-col">
        <div class="toast toast-top toast-end z-10">
            <div class="alert alert-error" v-if="err">
                <IconError class="stroke-current shrink-0 h-6 w-6" />
                <div>{{ err }}</div>
            </div>
        </div>
        <form @submit.prevent="update()">
            <table class="table">
                <tbody>
                    <!-- <tr>
                        <th>
                            Enable Player Captcha
                        </th>
                        <td>
                            <input :disabled="isLoading" v-model="settings.EnablePlayerCaptcha" type="checkbox"
                                class="toggle toggle-primary">
                        </td>
                    </tr> -->
                    <tr>
                        <th class="whitespace-nowrap">
                            Update Password
                        </th>
                        <td class="w-full">
                            <div class="flex flex-col gap-2">
                                <input :disabled="isLoading" v-model="newPassword" type="password" class=" input"
                                    placeholder="New Password (leave empty to keep current)" autocomplete="new-password"
                                    min="8" maxlength="64">
                                <span class="fieldset-label text-error"
                                    v-if="newPassword.length > 0 && newPassword.length < 8">
                                    Password must be at least 8 characters long.
                                </span>
                                <span class="fieldset-label text-error"
                                    v-if="newPassword.length > 0 && newPassword.length > 64">
                                    Password must be at most 64 characters long.
                                </span>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <button type="submit" class="btn btn-primary" :disabled="isLoading">
                                <div v-if="isLoading" class="loading loading-spinner"></div>
                                Save
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </form>
    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: "panel",
    middleware: "auth",
});

const conf = useRuntimeConfig();
const token = useToken();
const err = ref("");
const isLoading = ref(false)

const settings = ref<{
    EnablePlayerCaptcha: boolean;
}>({
    EnablePlayerCaptcha: false,
})

const newPassword = ref("");

onMounted(() => {
    load()
})

async function load() {
    isLoading.value = true;
    const {
        data,
        error,
    } = await useFetch<{
        EnablePlayerCaptcha: boolean;
    }>(`${conf.public.apiUrl}/account/settings`, {
        headers: {
            Authorization: `Bearer ${token.value}`,
        },
    });

    if (error.value) {
        err.value = `${error.value?.data}`;
        return;
    }
    if (data.value) {
        settings.value = data.value
        newPassword.value = "";
    }
    isLoading.value = false;
}

async function update() {
    isLoading.value = true;
    const {
        error,
    } = await useFetch<{
        EnablePlayerCaptcha: boolean;
    }>(`${conf.public.apiUrl}/account/settings`, {
        method: "put",
        headers: {
            Authorization: `Bearer ${token.value}`,
        },
        body: {
            EnablePlayerCaptcha: settings.value?.EnablePlayerCaptcha,
            NewPassword: newPassword.value.length >= 8 ? newPassword.value : undefined,
        }
    });

    if (error.value) {
        err.value = `${error.value?.data}`;
        return;
    }
    isLoading.value = false;
    load()
}

</script>
