import { runSessionExit, type SessionExitPhase } from '../utils/sessionExit';

export const useSessionExitPhase = () => useState<SessionExitPhase>('sessionExitPhase', () => 'idle');
export const useUnsavedConfig = () => useState('unsavedConfig', () => false);
export const useSignInNotice = () => useState('signInNotice', () => '');

export function useSessionExit() {
    const phase = useSessionExitPhase();
    const unsavedConfig = useUnsavedConfig();
    const notice = useSignInNotice();
    const token = useToken();
    const tokenExpire = useTokenExpire();
    const { data: accountData } = useAccountData();

    async function endSession(mutate: () => Promise<unknown>, message = '') {
        return runSessionExit({
            phase,
            unsavedChanges: unsavedConfig.value,
            queuedUploads: getUploadQueue().value.length > 0,
            confirm: (text) => window.confirm(text),
            mutate,
            clearSession: () => {
                notice.value = message;
                token.value = '';
                tokenExpire.value = null;
                accountData.value = null;
            },
            navigate: () => navigateTo('/login', { replace: true }),
        });
    }

    return { endSession, isEndingSession: computed(() => phase.value !== 'idle'), phase };
}
