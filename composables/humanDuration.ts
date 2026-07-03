/**
 * Format a duration in seconds as human-readable text (e.g. "2h 14m").
 */
export function humanDuration(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return "0s";
    }
    if (seconds < 60) {
        return `${Math.round(seconds)}s`;
    }
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m < 60) {
        return `${m}m ${s}s`;
    }
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
}
