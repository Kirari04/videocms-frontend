export type SessionExitPhase = 'idle' | 'pending' | 'leaving';

// Confirm before a server mutation makes the current session unusable. Once it
// succeeds, navigation guards must let the browser reach the sign-in page.
export async function runSessionExit(options: {
    phase: { value: SessionExitPhase };
    unsavedChanges: boolean;
    queuedUploads: boolean;
    confirm: (message: string) => boolean;
    mutate: () => Promise<unknown>;
    clearSession: () => void;
    navigate: () => Promise<unknown>;
}) {
    if (options.phase.value !== 'idle') return false;
    const consequences = [
        options.unsavedChanges ? 'Unsaved configuration changes will be discarded.' : '',
        options.queuedUploads ? 'Active uploads and queued uploads may stop.' : '',
    ].filter(Boolean);
    if (consequences.length && !options.confirm(`${consequences.join(' ')} Continue and sign out?`)) {
        return false;
    }

    options.phase.value = 'pending';
    try {
        await options.mutate();
        options.phase.value = 'leaving';
        options.clearSession();
        await options.navigate();
        return true;
    } finally {
        options.phase.value = 'idle';
    }
}
