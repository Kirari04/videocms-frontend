<template>
    <div class="flex flex-col grow">
        <h1 class="text-5xl font-bold">
            Hello
            <span class="text-blue-400">{{ accountData?.Username }}</span>
        </h1>
        <div class="stats shadow mt-6 flex flex-wrap lg:inline-grid">
            <div class="stat bg-base-300">
                <div class="stat-title">Free Storage</div>
                <div class="stat-value">
                    {{
                        accountData?.Storage == 0
                            ? "∞"
                            : accountData?.Storage
                                ? humanFileSize(accountData?.Storage)
                                : "?"
                    }}
                </div>
                <div class="stat-desc">The amount you have free</div>
            </div>
            <div class="stat bg-base-300">
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
            <div class="stat bg-base-300">
                <div class="stat-title">Videos</div>
                <div class="stat-value">
                    {{ accountData?.Files ? accountData?.Files : "?" }}
                </div>
                <div class="stat-desc">The amount of existing videos</div>
            </div>
        </div>
        <LazyClientOnly>
            <Stats v-if="accountData?.Admin" />
        </LazyClientOnly>
    </div>
</template>

<script lang="ts" setup>
const conf = useRuntimeConfig();
const token = useToken();
definePageMeta({
    layout: "panel",
    middleware: "auth",
});

const { data: accountData, fetch: fetchAccountData } = useAccountData()
onMounted(() => {
    fetchAccountData()
})

</script>
