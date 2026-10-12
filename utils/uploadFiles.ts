export const videoExtensions = [
    'mp4', 'mkv', 'webm', 'avi', 'mov', 'ts', 'm4v', '3gp', '3g2', 'wmv',
    'mpg', 'mpeg', 'asf', 'flv', 'f4v', 'm2ts', 'mts', 'vob', 'mxf', 'divx',
    'ogv', 'rm', 'rmvb', 'dv',
];
export const videoFileAccept = ['video/*', ...videoExtensions.map(extension => `.${extension}`)].join(',');
export function videoUploadError(file: File, maxSize: number) {
    if (!videoExtensions.includes(file.name.split('.').pop()?.toLowerCase() || '')) return 'This video format is not supported.';
    if (!file.size) return 'This file is empty. Choose a video with content.';
    if (maxSize > 0 && file.size > maxSize) return 'This file exceeds the upload limit. Choose a smaller video.';
    return '';
}
