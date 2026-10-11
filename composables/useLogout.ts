export function useLogout() {
    const token = useToken();
    const conf = useRuntimeConfig();
    const { endSession, isEndingSession: isLoggingOut } = useSessionExit();
    const logoutError = ref('');

    async function logout() {
        if (isLoggingOut.value) return;
        logoutError.value = '';
        try {
            await endSession(async () => {
                if (token.value && !token.value.startsWith('ak_')) {
                    await $fetch(`${conf.public.apiUrl}/auth/logout`, {
                        method: 'post',
                        headers: { Authorization: `Bearer ${token.value}` },
                    });
                }
            });
        } catch {
            logoutError.value = 'Could not end your session. Try logging out again.';
        }
    }
    return { logout, isLoggingOut, logoutError };
}
