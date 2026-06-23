<template>
    <div class="flex h-full min-h-0 flex-col overflow-hidden">
        <div class="shrink-0 border-b border-base-200 bg-base-200/30 p-4">
            <div class="flex items-start gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon name="lucide:file-video" class="h-5 w-5 text-primary" />
                </div>
                <div class="min-w-0 flex-1">
                    <h3 class="truncate font-bold" :title="fileInfo?.Name">{{ fileInfo?.Name }}</h3>
                    <p class="truncate font-mono text-xs opacity-50">{{ fileInfo?.UUID }}</p>
                </div>
                <button @click="emit('close')" class="btn btn-ghost btn-xs btn-square" title="Close">
                    <Icon name="lucide:x" class="h-4 w-4" />
                </button>
            </div>
        </div>

        <div class="flex shrink-0 flex-col gap-4 p-4">
            <div class="group relative aspect-video overflow-hidden rounded-lg bg-base-300 shadow-inner">
                <img
                    v-if="fileInfo?.Thumbnail"
                    :src="`${baseUrl}${fileInfo.Thumbnail}?cache=${cacheKey}`"
                    class="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                <div v-else class="flex h-full w-full items-center justify-center text-base-content/20">
                    <Icon name="lucide:image-off" class="h-10 w-10" />
                </div>
                <button
                    v-if="fileInfo?.UUID"
                    @click="openPlayer"
                    class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                    title="Open Player"
                >
                    <Icon name="lucide:play-circle" class="h-12 w-12 text-white drop-shadow-lg" />
                </button>
            </div>

            <input
                ref="thumbnailInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="hidden"
                @change="uploadThumbnail"
            />
            <div class="grid grid-cols-2 gap-2">
                <button v-if="fileInfo" @click="openPlayer" :disabled="!contextFile" class="btn btn-primary btn-sm col-span-2">
                    <Icon name="lucide:external-link" class="h-4 w-4" /> Open Player
                </button>
                <button v-if="fileInfo" @click="exportFile" :disabled="!contextFile" class="btn btn-neutral btn-sm" :class="!canManage ? 'col-span-2' : ''">
                    <Icon name="lucide:share" class="h-4 w-4" /> Export
                </button>
                <button v-if="fileInfo && canManage" @click="renameFile" :disabled="!contextFile" class="btn btn-neutral btn-sm">
                    <Icon name="lucide:edit-2" class="h-4 w-4" /> Rename
                </button>
                <button v-if="fileInfo && canManage" @click="openThumbnailUpload" class="btn btn-neutral btn-sm" :class="!fileInfo.CustomThumbnail ? 'col-span-2' : ''">
                    <Icon name="lucide:image-up" class="h-4 w-4" /> Upload Poster
                </button>
                <button v-if="fileInfo && canManage && fileInfo.CustomThumbnail" @click="emit('resetThumbnail')" class="btn btn-neutral btn-sm">
                    <Icon name="lucide:rotate-ccw" class="h-4 w-4" /> Reset Poster
                </button>
            </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto border-t border-base-200">
            <table class="table table-sm w-full">
                <tbody>
                    <tr>
                        <td class="text-xs font-bold uppercase opacity-50">Size</td>
                        <td class="text-right font-mono">{{ fileInfo ? humanFileSize(fileInfo.Size) : "0 B" }}</td>
                    </tr>
                    <tr>
                        <td class="text-xs font-bold uppercase opacity-50">Duration</td>
                        <td class="text-right font-mono">{{ fileInfo ? dayjs.duration(fileInfo.Duration, "seconds").format("H[h] m[m] s[s]") : "-" }}</td>
                    </tr>
                    <tr>
                        <td class="text-xs font-bold uppercase opacity-50">Created</td>
                        <td class="text-right">{{ fileInfo?.CreatedAt ? dayjs(fileInfo.CreatedAt).calendar() : "-" }}</td>
                    </tr>
                    <tr>
                        <td colspan="2" class="p-0">
                            <div class="flex flex-wrap gap-1 bg-base-200/30 p-3">
                                <span class="mb-1 block w-full text-xs font-bold uppercase opacity-50">Tags</span>
                                <span v-for="tag in fileInfo?.Tags" :key="tag.ID" class="badge badge-neutral badge-sm group pr-1">
                                    {{ tag.Name }}
                                    <button v-if="canManage && fileInfo" @click="emit('deleteTag', fileInfo.ID, tag.ID)" class="ml-1 transition-colors hover:text-error" title="Delete Tag">
                                        <Icon name="lucide:x" class="h-3 w-3" />
                                    </button>
                                </span>
                                <button v-if="canManage" @click="emit('createTag')" class="badge badge-ghost badge-sm gap-1 border-dashed hover:bg-base-300">
                                    <Icon name="lucide:plus" class="h-3 w-3" /> Add
                                </button>
                                <span v-if="!canManage && (!fileInfo?.Tags || fileInfo.Tags.length === 0)" class="text-xs italic opacity-50">No tags</span>
                            </div>
                        </td>
                    </tr>
                    <tr v-if="fileInfo?.Qualitys?.length">
                        <td colspan="2" class="border-t border-base-200 p-0">
                            <div class="collapse collapse-arrow rounded-none">
                                <input type="checkbox" />
                                <div class="collapse-title min-h-0 py-3 text-xs font-bold uppercase opacity-50">
                                    Encodings
                                </div>
                                <div class="collapse-content p-0 px-4 pb-2 text-xs">
                                    <div v-for="qualityType in qualityTypes" :key="qualityType" class="mb-3 last:mb-0">
                                        <div class="mb-1 font-bold opacity-70">{{ qualityType }}</div>
                                        <div
                                            v-for="q in qualitiesByType(qualityType)"
                                            :key="`${qualityType}-${q.Name}-${q.Width}-${q.Height}`"
                                            class="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-base-200/50 py-1 last:border-0"
                                        >
                                            <span class="min-w-0 flex-1 truncate">{{ q.Name }}</span>
                                            <div class="flex shrink-0 flex-wrap items-center justify-end gap-1">
                                                <span class="badge badge-xs">{{ q.Width }}x{{ q.Height }}</span>
                                                <span class="badge badge-xs badge-ghost">{{ humanFileSize(q.Size) }}</span>
                                                <div class="tooltip tooltip-left" :data-tip="q.Ready ? 'Ready' : 'Processing'">
                                                    <Icon v-if="q.Ready" name="lucide:check-circle" class="h-3 w-3 text-success" />
                                                    <span v-else class="loading loading-spinner loading-xs text-warning"></span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script lang="ts" setup>
import dayjs from "dayjs";
import calendar from "dayjs/plugin/calendar";
import duration from "dayjs/plugin/duration";
import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(calendar);
dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

interface FileListItem {
    ID: number;
    CreatedAt: string;
    UpdatedAt: string;
    Name: string;
    UUID: string;
    ParentFolderID: number;
    checked?: boolean;
}

interface FileInfoItem {
    CreatedAt: string;
    UpdatedAt: string;
    ID: number;
    UUID: string;
    Name: string;
    Thumbnail: string;
    CustomThumbnail: boolean;
    ParentFolderID: number;
    Size: number;
    Duration: number;
    Qualitys: Quality[];
    Subtitles: Subtitle[];
    Audios: Audio[];
    Tags: Tag[];
}

interface Quality {
    Name: string;
    Type: string;
    Height: number;
    Width: number;
    AvgFrameRate: number;
    Ready: boolean;
    Failed: boolean;
    Progress: number;
    Size: number;
}

interface Subtitle {
    Name: string;
    Type: string;
    Lang: string;
    Ready: boolean;
}

interface Audio {
    Name: string;
    Type: string;
    Lang: string;
    Ready: boolean;
}

interface Tag {
    ID: number;
    Name: string;
}

interface VideoFileInfoPanelProps {
    fileInfo: FileInfoItem | null;
    canManage: boolean;
    baseUrl: string;
    cacheKey: string | number;
    resolveContextFile: (uuid: string) => FileListItem | undefined;
}

const props = defineProps<VideoFileInfoPanelProps>();
const emit = defineEmits<{
    close: [];
    openPlayer: [file: FileListItem];
    exportFile: [file: FileListItem];
    renameFile: [file: FileListItem];
    createTag: [];
    deleteTag: [linkId: number, tagId: number];
    uploadThumbnail: [thumbnail: File];
    resetThumbnail: [];
}>();

const contextFile = computed(() => {
    if (!props.fileInfo?.UUID) return undefined;
    return props.resolveContextFile(props.fileInfo.UUID);
});

const qualityTypes = computed(() => [...new Set(props.fileInfo?.Qualitys?.map((quality) => quality.Type) || [])]);
const qualitiesByType = (qualityType: string) => props.fileInfo?.Qualitys?.filter((quality) => quality.Type === qualityType) || [];

const openPlayer = () => {
    if (!contextFile.value) return;
    emit("openPlayer", contextFile.value);
};

const exportFile = () => {
    if (!contextFile.value) return;
    emit("exportFile", contextFile.value);
};

const renameFile = () => {
    if (!props.canManage || !contextFile.value) return;
    emit("renameFile", contextFile.value);
};

const thumbnailInput = ref<HTMLInputElement | null>(null);

const openThumbnailUpload = () => {
    if (!props.canManage || !props.fileInfo) return;
    thumbnailInput.value?.click();
};

const uploadThumbnail = (event: Event) => {
    if (!props.canManage || !props.fileInfo) return;
    const input = event.target as HTMLInputElement;
    const thumbnail = input.files?.[0];
    input.value = "";
    if (!thumbnail) return;
    emit("uploadThumbnail", thumbnail);
};
</script>
