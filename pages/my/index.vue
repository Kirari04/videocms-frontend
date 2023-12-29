<template>
    <div class="flex flex-col grow">
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

const { data: accountData, fetch: fetchAccountData } = useAccountData()
onMounted(() => {
    fetchAccountData()
})

</script>
