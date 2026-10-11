import { describe, expect, test } from 'bun:test';
import { runSessionExit, type SessionExitPhase } from '../utils/sessionExit';

function fixture(unsavedChanges = false, queuedUploads = false) {
    const phase = { value: 'idle' as SessionExitPhase };
    const events: string[] = [];
    let token = 'valid-session';
    return {
        phase, events, token: () => token,
        options: {
            phase, unsavedChanges, queuedUploads,
            confirm: (_message: string) => true,
            mutate: async () => { events.push('revoke'); },
            clearSession: () => {
                // Route guards must permit exit before reactive token watchers run.
                expect(phase.value).toBe('leaving');
                events.push('clear');
                token = '';
            },
            navigate: async () => {
                expect(phase.value).toBe('leaving');
                events.push('login');
            },
        },
    };
}

describe('session-ending actions', () => {
    for (const [unsaved, uploads] of [[true, false], [false, true], [true, true]]) {
        test(`cancel before revocation preserves session (dirty=${unsaved}, uploads=${uploads})`, async () => {
            const f = fixture(unsaved, uploads);
            let prompt = '';
            const result = await runSessionExit({ ...f.options, confirm: message => { prompt = message; return false; } });
            expect(result).toBe(false);
            expect(prompt.includes('configuration')).toBe(unsaved);
            expect(prompt.includes('uploads')).toBe(uploads);
            expect(f.events).toEqual([]);
            expect(f.token()).toBe('valid-session');
            expect(f.phase.value).toBe('idle');
        });
    }

    test('confirmed logout revokes before clearing and cannot be cancelled after revocation', async () => {
        const f = fixture(true, true);
        await runSessionExit({ ...f.options, confirm: () => { f.events.push('confirm'); return true; } });
        expect(f.events).toEqual(['confirm', 'revoke', 'clear', 'login']);
        expect(f.token()).toBe('');
        expect(f.phase.value).toBe('idle');
    });

    test('failed revocation preserves the session and permits retry', async () => {
        const f = fixture();
        await expect(runSessionExit({ ...f.options, mutate: async () => { throw new Error('offline'); } })).rejects.toThrow('offline');
        expect(f.token()).toBe('valid-session');
        expect(f.events).toEqual([]);
        expect(f.phase.value).toBe('idle');
        expect(await runSessionExit(f.options)).toBe(true);
    });

    test('in-flight actions share a lock until navigation finishes', async () => {
        const f = fixture();
        let complete!: () => void;
        const request = new Promise<void>(resolve => { complete = resolve; });
        const first = runSessionExit({ ...f.options, mutate: () => request });
        expect(f.phase.value).toBe('pending');
        expect(await runSessionExit(f.options)).toBe(false);
        expect(f.token()).toBe('valid-session');
        complete();
        await first;
        expect(f.events).toEqual(['clear', 'login']);
    });
});
