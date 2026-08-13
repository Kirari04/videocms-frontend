<template>
    <div class="flex h-full min-h-0 flex-col overflow-hidden">
        <div class="shrink-0 border-b border-base-300 p-4">
            <div class="flex items-start gap-3">
                <div class="min-w-0 flex-1">
                    <h3 class="truncate text-sm font-semibold" :title="fileInfo?.Name">{{ fileInfo?.Name }}</h3>
                    <p class="truncate text-xs tabular-nums text-base-content/50">{{ fileInfo?.UUID }}</p>
                </div>
                <button @click="emit('close')" class="btn btn-square btn-ghost btn-xs" title="Close" aria-label="Close">
                    <Icon name="lucide:x" class="h-4 w-4" />
                </button>
            </div>
        </div>

        <div class="flex shrink-0 flex-col gap-3 p-4">
            <div v-if="fileInfo?.Available === false" role="status"
                class="flex items-start gap-2 rounded-field border border-warning/35 bg-warning/10 p-3 text-sm">
                <Icon name="lucide:cloud-off" class="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>This file's storage is detached. Playback and export return when an administrator reconnects it.</span>
            </div>
            <div class="group relative aspect-video overflow-hidden rounded-field border border-base-300 bg-base-200">
                <img
                    v-if="fileInfo?.Thumbnail && fileInfo.Available !== false"
                    :src="`${baseUrl}${fileInfo.Thumbnail}?cache=${cacheKey}`"
                    class="h-full w-full object-cover"
                    :alt="`Poster for ${fileInfo?.Name}`"
                />
                <div v-else class="flex h-full w-full items-center justify-center text-base-content/20">
                    <Icon name="lucide:image-off" class="h-8 w-8" />
                </div>
                <a
                    v-if="playerUrl"
                    :href="playerUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-(--motion-fast) group-hover:opacity-100 focus-visible:opacity-100"
                    title="Open player"
                >
                    <Icon name="lucide:play-circle" class="h-12 w-12 text-white" />
                </a>
            </div>

            <input
                ref="thumbnailInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="hidden"
                @change="uploadThumbnail"
            />
            <div class="grid grid-cols-2 gap-2">
                <a
                    v-if="playerUrl"
                    :href="playerUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn-primary btn-sm col-span-2">
                    <Icon name="lucide:external-link" class="h-4 w-4" /> Open player
                </a>
                <button v-if="fileInfo" @click="exportFile" :disabled="!contextFile || fileInfo.Available === false"
                    class="btn btn-ghost btn-sm border-base-300" :class="!canManage ? 'col-span-2' : ''">
                    <Icon name="lucide:share" class="h-4 w-4" /> Export
                </button>
                <button v-if="fileInfo && canManage" @click="renameFile" :disabled="!contextFile"
                    class="btn btn-ghost btn-sm border-base-300">
                    <Icon name="lucide:edit-2" class="h-4 w-4" /> Rename
                </button>
                <button v-if="fileInfo && canManage" @click="openThumbnailUpload"
                    class="btn btn-ghost btn-sm border-base-300" :class="!fileInfo.CustomThumbnail ? 'col-span-2' : ''">
                    <Icon name="lucide:image-up" class="h-4 w-4" /> Upload poster
                </button>
                <button v-if="fileInfo && canManage && fileInfo.CustomThumbnail" @click="emit('resetThumbnail')"
                    class="btn btn-ghost btn-sm border-base-300">
                    <Icon name="lucide:rotate-ccw" class="h-4 w-4" /> Reset poster
                </button>
            </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto border-t border-base-300">
            <dl class="divide-y divide-base-300/60 px-4 text-sm">
                <div class="flex items-center justify-between py-2.5">
                    <dt class="text-base-content/60">Size</dt>
                    <dd class="tabular-nums">{{ fileInfo ? humanFileSize(fileInfo.Size) : "0 B" }}</dd>
                </div>
                <div class="flex items-center justify-between py-2.5">
                    <dt class="text-base-content/60">Duration</dt>
                    <dd class="tabular-nums">{{ fileInfo ? dayjs.duration(fileInfo.Duration, "seconds").format("H[h] m[m] s[s]") : "-" }}</dd>
                </div>
                <div class="flex items-center justify-between py-2.5">
                    <dt class="text-base-content/60">Created</dt>
                    <dd>{{ fileInfo?.CreatedAt ? dayjs(fileInfo.CreatedAt).calendar() : "-" }}</dd>
                </div>
            </dl>

            <div class="border-t border-base-300/60 p-4">
                <p class="mb-2 text-sm text-base-content/60">Tags</p>
                <div class="flex flex-wrap gap-1.5">
                    <span v-for="tag in fileInfo?.Tags" :key="tag.ID" class="badge badge-ghost badge-sm gap-1">
                        {{ tag.Name }}
                        <button v-if="canManage && fileInfo" @click="emit('deleteTag', fileInfo.ID, tag.ID)"
                            class="transition-colors hover:text-error" title="Delete tag" :aria-label="`Delete tag ${tag.Name}`">
                            <Icon name="lucide:x" class="h-3 w-3" />
                        </button>
                    </span>
                    <button v-if="canManage" @click="emit('createTag')"
                        class="badge badge-ghost badge-sm gap-1 border-dashed hover:bg-base-200">
                        <Icon name="lucide:plus" class="h-3 w-3" /> Add
                    </button>
                    <span v-if="!canManage && (!fileInfo?.Tags || fileInfo.Tags.length === 0)"
                        class="text-xs text-base-content/50">No tags</span>
                </div>
            </div>

            <div v-if="fileInfo?.Qualitys?.length" class="border-t border-base-300/60">
                <div class="collapse-arrow collapse rounded-none">
                    <input type="checkbox" aria-label="Toggle encodings" />
                    <div class="collapse-title min-h-0 py-3 text-sm text-base-content/60">
                        Encodings
                    </div>
                    <div class="collapse-content p-0 px-4 pb-2 text-xs">
                        <div v-for="qualityType in qualityTypes" :key="qualityType" class="mb-3 last:mb-0">
                            <div class="mb-1 font-medium text-base-content/70">{{ qualityType }}</div>
                            <div
                                v-for="q in qualitiesByType(qualityType)"
                                :key="`${qualityType}-${q.Name}-${q.Width}-${q.Height}`"
                                class="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-base-300/40 py-1 last:border-0"
                            >
                                <span class="min-w-0 flex-1 truncate">{{ q.Name }}</span>
                                <div class="flex shrink-0 flex-wrap items-center justify-end gap-1">
                                    <span class="badge badge-ghost badge-xs tabular-nums">{{ q.Width }}x{{ q.Height }}</span>
                                    <span class="badge badge-ghost badge-xs tabular-nums">{{ humanFileSize(q.Size) }}</span>
                                    <div class="tooltip tooltip-left" :data-tip="q.Ready ? 'Ready' : 'Processing'">
                                        <Icon v-if="q.Ready" name="lucide:check-circle-2" class="h-3 w-3 text-success" />
                                        <span v-else class="loading loading-spinner loading-xs text-warning"></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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
    Available?: boolean;
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
const playerUrl = computed(() => {
    if (!props.fileInfo?.UUID || props.fileInfo.Available === false) return undefined;
    return `${props.baseUrl.replace(/\/+$/, "")}/v/${props.fileInfo.UUID}`;
});

const qualityTypes = computed(() => [...new Set(props.fileInfo?.Qualitys?.map((quality) => quality.Type) || [])]);
const qualitiesByType = (qualityType: string) => props.fileInfo?.Qualitys?.filter((quality) => quality.Type === qualityType) || [];

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
