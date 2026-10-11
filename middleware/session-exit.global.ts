export default defineNuxtRouteMiddleware(() => {
    // Keep the current screen until a session-ending request succeeds or fails.
    if (useSessionExitPhase().value === 'pending') return abortNavigation();
});
