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
</script>


<template>
    <div>
        <div>
            <NuxtLink class="btn btn-neutral" to="/my/webpages/add">New Webpage</NuxtLink>
        </div>
    </div>
</template>

