export function useLogout() {
    const token = useToken();
    const tokenExpire = useTokenExpire();
    const conf = useRuntimeConfig();
    const isLoggingOut = ref(false);
    const logoutError = ref('');

    async function logout() {
        if (isLoggingOut.value) return;
        isLoggingOut.value = true;
        logoutError.value = '';
        try {
            if (token.value && !token.value.startsWith('ak_')) {
                await $fetch(`${conf.public.apiUrl}/auth/logout`, {
                    method: 'post',
                    headers: { Authorization: `Bearer ${token.value}` },
                });
            }
            token.value = '';
            tokenExpire.value = null;
            await navigateTo('/login');
        } catch {
            logoutError.value = 'Could not end your session. Try logging out again.';
        } finally {
            isLoggingOut.value = false;
        }
    }
    return { logout, isLoggingOut, logoutError };
}
