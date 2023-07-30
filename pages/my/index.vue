<template>
    <div class="flex flex-col grow">
        <div class="toast toast-top toast-end">
            <div class="alert alert-info" v-if="pending">
                <div class="loading loading-spinner loading-sm"></div>
                <div>Loading...</div>
            </div>
            <div class="alert alert-error" v-if="error">
                <IconError class="stroke-current shrink-0 h-6 w-6" />
                <div v-if="error.data">{{ error.data }}</div>
                <div v-else>{{ error.message }}</div>
                <div>
                    <button @click="refresh()" class="btn btn-sm">Retry</button>
                </div>
            </div>
        </div>
        <h1 class="text-5xl font-bold">
            Hello
            <span class="text-blue-400">{{ accountData?.Username }}</span>
        </h1>
        <div class="stats shadow mt-6 flex flex-wrap lg:inline-grid">
            <div class="stat">
                <div class="stat-title">Max Storage</div>
                <div class="stat-value">
                    {{
                        accountData?.Storage == 0
                            ? "∞"
                            : accountData?.Storage
                            ? accountData?.Storage
                            : "?"
                    }}
                </div>
                <div class="stat-desc">The maximum amount you can use</div>
            </div>
            <div class="stat">
                <div class="stat-title">Used Storage</div>
                <div class="stat-value">
                    {{
                        accountData?.Used
                            ? humanFileSize(accountData?.Used)
                            : "?"
                    }}
                </div>
                <div class="stat-desc">The current amount of used Storage</div>
            </div>
            <div class="stat">
                <div class="stat-title">Videos</div>
                <div class="stat-value">
                    {{ accountData?.Files ? accountData?.Files : "?" }}
                </div>
                <div class="stat-desc">The amount of existing videos</div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
const conf = useRuntimeConfig();
const token = useToken();
definePageMeta({
    layout: "panel",
    middleware: "auth",
});

const {
    data: accountData,
    error,
    pending,
    refresh,
} = useFetch<{
    CreatedAt: string;
    Username: string;
    Admin: boolean;
    Email: string;
    Balance: number;
    Storage: number;
    Files: number;
    Used: number;
}>(`${conf.public.apiUrl}/account`, {
    headers: {
        Authorization: `Bearer ${token.value}`,
    },
    retry: 5,
    lazy: true,
});
</script>
