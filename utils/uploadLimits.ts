export const uploadSizeUnits = { MiB: 1024 ** 2, GiB: 1024 ** 3 };
export type UploadSizeUnit = keyof typeof uploadSizeUnits;

export function uploadLimitBytes(value: string | number, unit: UploadSizeUnit): number {
    if (value === '') return 0;
    const bytes = Number(value) * uploadSizeUnits[unit];
    if (!Number.isFinite(bytes) || bytes < 0 || bytes > Number.MAX_SAFE_INTEGER || (bytes > 0 && bytes < 1)) {
        throw new Error('Enter a valid upload limit, or leave it empty to use the default.');
    }
    return Math.round(bytes);
}

export function uploadLimitInput(bytes: number): { value: string; unit: UploadSizeUnit } {
    const unit: UploadSizeUnit = bytes >= uploadSizeUnits.GiB ? 'GiB' : 'MiB';
    return { value: bytes > 0 ? String(bytes / uploadSizeUnits[unit]) : '', unit };
}
