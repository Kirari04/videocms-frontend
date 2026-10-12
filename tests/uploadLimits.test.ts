import { expect, test } from 'bun:test';
import { uploadLimitBytes, uploadLimitInput } from '../utils/uploadLimits';

test('upload limits preserve byte values and accept optional fractional units', () => {
    expect(uploadLimitBytes('', 'GiB')).toBe(0);
    expect(uploadLimitBytes('1.5', 'GiB')).toBe(1610612736);
    for (const bytes of [0, 7, 1048576, 1610612736, 1099511627776]) {
        const input = uploadLimitInput(bytes);
        expect(uploadLimitBytes(input.value, input.unit)).toBe(bytes);
    }
});

test('invalid upload limits cannot silently disable a limit', () => {
    for (const value of [-1, NaN, Infinity, 'invalid', Number.MAX_SAFE_INTEGER]) {
        expect(() => uploadLimitBytes(value, 'GiB')).toThrow();
    }
});
