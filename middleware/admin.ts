export default defineNuxtRouteMiddleware(async () => {
    const { data: accountData, fetch: fetchAccountData } = useAccountData();

    if (!accountData.value) {
        await fetchAccountData();
    }
    if (!accountData.value?.Admin) {
        return navigateTo("/my");
    }
});
