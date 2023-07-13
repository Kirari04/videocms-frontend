<template>
    <div class="flex flex-col grow p-2">
        <div class="toast toast-top toast-end">
            <div class="alert alert-error" v-if="err">
                <IconError class="stroke-current shrink-0 h-6 w-6" />
                <div>{{ err }}</div>
                <div>
                    <button
                        @click="
                            openFolder(
                                activeFolderID,
                                folderPathHistory[folderPathHistory.length - 1]
                                    .name
                            )
                        "
                        :disabled="isLoading"
                        class="btn btn-sm"
                    >
                        Retry
                    </button>
                </div>
            </div>
        </div>
        <div class="flex flex-wrap w-full">
            <div class="justify-start flex items-center">
                <div class="btn-group">
                    <button
                        :disabled="isLoading"
                        class="btn btn-neutral btn-square btn-sm"
                    >
                        <IconUploadFile
                            class="w-6 h-6 stroke-current fill-current"
                        />
                    </button>
                    <button
                        :disabled="isLoading"
                        class="btn btn-neutral btn-sm"
                    >
                        <IconCreateFolder
                            class="w-6 h-6 stroke-current fill-current"
                        />
                    </button>
                </div>
                <div
                    v-if="isLoading"
                    class="loading loading-spinner ml-2"
                ></div>
            </div>
            <div class="flex grow justify-end">
                <div class="dropdown dropdown-end dropdown-bottom md:hidden">
                    <label
                        tabindex="0"
                        class="btn btn-neutral btn-square btn-sm"
                    >
                        <IconVert class="w-6 h-6 stroke-current fill-current" />
                    </label>
                    <div
                        tabindex="0"
                        class="dropdown-content z-[1] p-0 mt-2 shadow menu btn-group btn-group-vertical flex-wrap"
                    >
                        <button
                            @click="
                                openFolder(
                                    activeFolderID,
                                    folderPathHistory[
                                        folderPathHistory.length - 1
                                    ].name,
                                    folderPathHistory.length - 1
                                )
                            "
                            :disabled="isLoading"
                            class="btn btn-neutral btn-sm"
                        >
                            Refresh
                        </button>
                        <button
                            :disabled="isLoading"
                            class="btn btn-neutral btn-sm"
                        >
                            Move
                        </button>
                        <button
                            :disabled="isLoading"
                            class="btn btn-neutral btn-sm"
                        >
                            Export
                        </button>
                        <button
                            :disabled="isLoading"
                            class="btn btn-error btn-sm"
                        >
                            <IconDelete
                                class="w-6 h-6 stroke-current fill-current"
                            />
                        </button>
                    </div>
                </div>
                <div class="btn-group flex-wrap hidden md:flex">
                    <button
                        @click="
                            openFolder(
                                activeFolderID,
                                folderPathHistory[folderPathHistory.length - 1]
                                    .name,
                                folderPathHistory.length - 1
                            )
                        "
                        :disabled="isLoading"
                        class="btn btn-neutral btn-sm"
                    >
                        Refresh
                    </button>
                    <button
                        :disabled="isLoading"
                        class="btn btn-neutral btn-sm"
                    >
                        Move
                    </button>
                    <button
                        :disabled="isLoading"
                        class="btn btn-neutral btn-sm"
                    >
                        Export
                    </button>
                    <button :disabled="isLoading" class="btn btn-error btn-sm">
                        <IconDelete
                            class="w-6 h-6 stroke-current fill-current"
                        />
                    </button>
                </div>
            </div>
        </div>
        <div class="text-sm breadcrumbs flex flex-wrap items-center">
            <input
                v-model="globalCheckboxChecked"
                @change="checkAllCallback"
                type="checkbox"
                class="checkbox checkbox-sm mr-4"
            />
            <ul class="flex flex-wrap">
                <li v-for="(folder, index) in folderPathHistory">
                    <button
                        @click="openFolder(folder.folderId, folder.name, index)"
                        :disabled="isLoading"
                        class="flex items-center link link-hover"
                    >
                        <IconFolder class="w-4 h-4 mr-2 stroke-current" />
                        {{ folder.name }}
                    </button>
                </li>
            </ul>
        </div>
        <div class="flex flex-col-reverse gap-2 lg:flex-row">
            <div class="flex flex-col grow shrink">
                <!-- LIST FOLDERS -->
                <div
                    class="flex flex-row items-center shrink"
                    v-for="folder in folderList"
                >
                    <input
                        v-model="folder.checked"
                        @change="globalCheckboxChecked = false"
                        type="checkbox"
                        class="checkbox checkbox-sm mr-4"
                    />
                    <button
                        @dblclick="openFolder(folder.ID, folder.Name)"
                        @click="folder.checked = !folder.checked"
                        :disabled="isLoading"
                        :class="
                            folder.checked
                                ? 'btn btn-sm btn-primary no-animation grow shrink flex flex-nowrap justify-start normal-case'
                                : 'btn btn-sm no-animation grow shrink flex flex-nowrap justify-start normal-case'
                        "
                    >
                        <span>
                            <IconFolder class="w-4 h-4 mr-2 stroke-current" />
                        </span>
                        <span class="shrink truncate">
                            {{ folder.Name }}
                        </span>
                    </button>
                    <div class="dropdown dropdown-left dropdown-end">
                        <label
                            tabindex="0"
                            class="btn btn-sm rounded-full p-1 w-8 h-8"
                        >
                            <IconVert
                                class="grow stroke-current fill-current"
                            />
                        </label>
                        <div
                            tabindex="0"
                            class="dropdown-content z-[1] menu p-0 shadow btn-group btn-group-vertical"
                        >
                            <button class="btn btn-neutral btn-sm">Move</button>
                            <button class="btn btn-neutral btn-sm">
                                Rename
                            </button>
                            <button class="btn btn-error btn-sm">
                                <IconDelete
                                    class="w-6 h-6 stroke-current fill-current"
                                />
                            </button>
                        </div>
                    </div>
                </div>
                <!-- LIST FILES -->
                <div
                    class="flex flex-row items-center shrink"
                    v-for="file in fileList"
                >
                    <input
                        v-model="file.checked"
                        @change="globalCheckboxChecked = false"
                        type="checkbox"
                        class="checkbox checkbox-sm mr-4"
                    />
                    <button
                        @click="
                            () => {
                                file.checked = !file.checked;
                                if (file.checked) {
                                    openFileInfo(file.ID);
                                }
                            }
                        "
                        :disabled="isLoading"
                        :class="
                            file.checked
                                ? 'btn btn-sm btn-primary no-animation grow shrink flex flex-nowrap justify-start normal-case'
                                : 'btn btn-sm no-animation grow shrink flex flex-nowrap justify-start normal-case'
                        "
                    >
                        <div>
                            <IconVideo class="w-4 h-4 mr-2 fill-current" />
                        </div>
                        <div class="shrink truncate">
                            {{ file.Name }}
                        </div>
                    </button>
                    <div class="dropdown dropdown-left dropdown-start">
                        <label
                            tabindex="0"
                            class="btn btn-sm rounded-full p-1 ml-2 w-8 h-8"
                        >
                            <IconVert
                                class="grow stroke-current fill-current"
                            />
                        </label>
                        <div
                            tabindex="0"
                            class="dropdown-content z-[1] menu p-0 shadow btn-group btn-group-vertical"
                        >
                            <button
                                @click="openFileInfo(file.ID)"
                                :disabled="isLoading"
                                class="btn btn-neutral btn-sm"
                            >
                                Info
                            </button>
                            <button class="btn btn-neutral btn-sm">
                                Export
                            </button>
                            <button class="btn btn-neutral btn-sm">Move</button>
                            <button class="btn btn-neutral btn-sm">
                                Rename
                            </button>

                            <button class="btn btn-error btn-sm">
                                <IconDelete
                                    class="w-6 h-6 stroke-current fill-current"
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div
                :class="
                    showFileInfo
                        ? 'bg-base-300 p-2 rounded-xl w-full lg:w-96 transition-all'
                        : 'bg-base-300 py-2 px-0 rounded-box overflow-hidden h-0 w-0 opacity-0 transition-all'
                "
            >
                <div class="flex items-center">
                    <span class="truncate">{{ fileInfo?.Name }}</span>

                    <button
                        @click="showFileInfo = false"
                        class="btn btn-square btn-sm ml-auto"
                    >
                        <IconError class="stroke-current shrink-0 h-6 w-6" />
                    </button>
                </div>
                <img
                    :src="`${conf.public.baseUrl}${fileInfo?.Thumbnail}`"
                    alt="Thumbnail"
                    class="mt-2 rounded"
                />
                <div class="btn-group mt-2 flex flex-wrap">
                    <button
                        @click="
                            openFile(
                                fileList.find((e) => e.UUID === fileInfo?.UUID)!
                            )
                        "
                        :disabled="isLoading"
                        class="btn btn-sm grow"
                    >
                        Open
                    </button>
                    <button class="btn btn-sm grow">Export</button>
                    <button class="btn btn-sm grow">Move</button>
                    <button class="btn btn-sm grow">Rename</button>
                    <button class="btn btn-error btn-sm grow">
                        <IconDelete
                            class="w-6 h-6 stroke-current fill-current"
                        />
                    </button>
                </div>
                <table class="table mt-2">
                    <tbody>
                        <tr>
                            <th>Created</th>
                            <td>
                                {{
                                    fileInfo && fileInfo.CreatedAt
                                        ? dayjs(fileInfo.CreatedAt).calendar()
                                        : "Never"
                                }}
                            </td>
                        </tr>
                        <tr>
                            <th>Updated</th>
                            <td>
                                {{
                                    fileInfo && fileInfo.UpdatedAt
                                        ? dayjs(fileInfo.UpdatedAt).calendar()
                                        : "Never"
                                }}
                            </td>
                        </tr>
                        <tr>
                            <th>Storage</th>
                            <td>
                                {{
                                    fileInfo ? humanFileSize(fileInfo?.Size) : 0
                                }}
                            </td>
                        </tr>
                        <tr>
                            <th>Duration</th>
                            <td>
                                {{
                                    fileInfo
                                        ? dayjs
                                              .duration(
                                                  fileInfo.Duration,
                                                  "seconds"
                                              )
                                              .format("H[h] m[m] s[s]")
                                        : "Unknow"
                                }}
                            </td>
                        </tr>
                        <tr v-if="fileInfo?.Qualitys">
                            <th class="align-top">Encodes</th>
                            <td class="flex flex-col justify-start">
                                <div
                                    v-for="qualityType in [
                                        ...new Set(
                                            fileInfo?.Qualitys.map(
                                                (e) => e.Type
                                            )
                                        ),
                                    ]"
                                    class="flex flex-col gap-2 mb-2"
                                >
                                    <div class="uppercase font-bold">
                                        {{ qualityType }}
                                    </div>
                                    <div
                                        class="flex flex-row items-center gap-2"
                                        v-for="quality in fileInfo?.Qualitys.filter(
                                            (e) => e.Type === qualityType
                                        )"
                                    >
                                        <div
                                            class="badge badge-primary badge-sm"
                                        >
                                            {{ quality.Name }}
                                        </div>
                                        <div
                                            class="badge badge-primary badge-outline badge-sm whitespace-nowrap"
                                        >
                                            {{ quality.Width }}x{{
                                                quality.Height
                                            }}
                                            / {{ quality.AvgFrameRate }}fps /
                                            {{ humanFileSize(quality.Size) }}
                                        </div>
                                        <div v-if="quality.Ready">
                                            <IconDone
                                                class="shrink-0 h-6 w-6 fill-success"
                                            />
                                        </div>
                                        <div v-if="quality.Failed">
                                            <IconError
                                                class="shrink-0 h-6 w-6 stroke-error"
                                            />
                                        </div>
                                        <div
                                            v-if="
                                                !quality.Ready &&
                                                !quality.Failed
                                            "
                                            class="flex items-center"
                                        >
                                            <span
                                                :class="
                                                    quality.Progress == 0
                                                        ? 'loading loading-spinner text-primary loading-md'
                                                        : 'radial-progress text-primary'
                                                "
                                                :style="`
                                                    --value: ${quality.Progress};
                                                    --size: 1.5rem;
                                                    --thickness: 3px;
                                                `"
                                            ></span>
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr v-if="fileInfo?.Audios">
                            <th class="align-top">Audios</th>
                            <td class="flex flex-col justify-start">
                                <div
                                    v-for="audioType in [
                                        ...new Set(
                                            fileInfo?.Audios.map((e) => e.Type)
                                        ),
                                    ]"
                                    class="flex flex-col gap-2 mb-2"
                                >
                                    <div class="uppercase font-bold">
                                        {{ audioType }}
                                    </div>
                                    <div
                                        v-for="audio in fileInfo?.Audios.filter(
                                            (e) => e.Type === audioType
                                        )"
                                        class="flex flex-row items-center gap-2"
                                    >
                                        <div
                                            class="badge badge-primary badge-sm"
                                        >
                                            {{ audio.Name }}
                                        </div>
                                        <div
                                            class="badge badge-primary badge-sm badge-outline"
                                        >
                                            {{ audio.Lang }}
                                        </div>
                                        <div v-if="!audio.Ready">
                                            <span
                                                class="loading loading-spinner text-primary loading-md"
                                            ></span>
                                        </div>
                                        <div v-if="audio.Ready">
                                            <IconDone
                                                class="shrink-0 h-6 w-6 fill-success"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr v-if="fileInfo?.Subtitles">
                            <th class="align-top">Subtitles</th>
                            <td class="flex flex-col justify-start">
                                <div
                                    v-for="subType in [
                                        ...new Set(
                                            fileInfo?.Subtitles.map(
                                                (e) => e.Type
                                            )
                                        ),
                                    ]"
                                    class="flex flex-col gap-2 mb-2"
                                >
                                    <div class="uppercase font-bold">
                                        {{ subType }}
                                    </div>
                                    <div
                                        v-for="sub in fileInfo?.Subtitles.filter(
                                            (e) => e.Type === subType
                                        )"
                                        class="flex flex-row items-center gap-2"
                                    >
                                        <div
                                            class="badge badge-primary badge-sm"
                                        >
                                            {{ sub.Name }}
                                        </div>
                                        <div
                                            class="badge badge-primary badge-sm badge-outline"
                                        >
                                            {{ sub.Lang }}
                                        </div>
                                        <div v-if="!sub.Ready">
                                            <span
                                                class="loading loading-spinner text-primary loading-md"
                                            ></span>
                                        </div>
                                        <div v-if="sub.Ready">
                                            <IconDone
                                                class="shrink-0 h-6 w-6 fill-success"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import dayjs from "dayjs";
import calendar from "dayjs/plugin/calendar";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import localizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(calendar);
dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

const activeFolderID = ref(0);
const isLoading = ref(false);
const err = ref("");
const globalCheckboxChecked = ref(false);
const showFileInfo = ref(false);
const fileInfo = ref<FileInfoItem | null>(null);

definePageMeta({
    middleware: "auth",
});

const conf = useRuntimeConfig();
const token = useToken();
const folderPathHistory = ref<
    Array<{
        name: string;
        folderId: number;
    }>
>([]);

interface FolderListItem {
    ID: number;
    CreatedAt: string;
    UpdatedAt: string;
    Name: string;
    ParentFolderID: number;
    checked?: boolean;
}
const folderList = ref<Array<FolderListItem>>([]);
const listFolders = async (folderId: number) => {
    const { data, error } = await useFetch<Array<FolderListItem>>(
        `${conf.public.apiUrl}/folders`,
        {
            query: {
                ParentFolderID: folderId,
            },
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            retry: 5,
        }
    );
    if (error.value) {
        err.value = `${
            error.value.data ? error.value.data : error.value.message
        }`;
        return null;
    }
    err.value = "";
    return data.value;
};

interface FileListItem {
    ID: number;
    CreatedAt: string;
    UpdatedAt: string;
    Name: string;
    UUID: string;
    ParentFolderID: number;
    checked?: boolean;
}
const fileList = ref<Array<FileListItem>>([]);
const listFiles = async (folderId: number) => {
    const { data, error } = await useFetch<Array<FileListItem>>(
        `${conf.public.apiUrl}/files`,
        {
            query: {
                ParentFolderID: folderId,
            },
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            retry: 5,
        }
    );
    if (error.value) {
        err.value = `${
            error.value.data ? error.value.data : error.value.message
        }`;
        return null;
    }
    err.value = "";
    return data.value;
};
const openFile = (file: FileListItem) => {
    window.open(`${conf.public.baseUrl}/${file.UUID}`);
};

const openFolder = async (
    folderId: number,
    folderName: string,
    jumpToIndex = -1
) => {
    isLoading.value = true;

    // load folders & files
    folderList.value = [];
    fileList.value = [];

    const [newFolderList, newFileList] = await Promise.all([
        listFolders(folderId),
        listFiles(folderId),
    ]);

    if (newFolderList) {
        folderList.value = newFolderList.map((e) => {
            e.checked = false;
            return e;
        });
    }
    if (newFileList) {
        fileList.value = newFileList.map((e) => {
            e.checked = false;
            return e;
        });
    }

    if (jumpToIndex >= 0) {
        folderPathHistory.value = folderPathHistory.value.slice(0, jumpToIndex);
    }
    activeFolderID.value = folderId;
    folderPathHistory.value.push({
        name: folderName,
        folderId: folderId,
    });
    isLoading.value = false;
};
interface FileInfoItem {
    CreatedAt: string;
    UpdatedAt: string;
    UUID: string;
    Name: string;
    Thumbnail: string;
    ParentFolderID: number;
    Size: number;
    Duration: number;
    Qualitys: Quality[];
    Subtitles: Subtitle[];
    Audios: Audio[];
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

const openFileInfo = async (fileId: number) => {
    showFileInfo.value = true;
    isLoading.value = true;
    const { data, error } = await useFetch<FileInfoItem>(
        `${conf.public.apiUrl}/file`,
        {
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            query: {
                LinkID: fileId,
            },
            retry: 5,
            lazy: true,
        }
    );
    isLoading.value = false;
    if (error.value) {
        err.value = `${
            error.value.data ? error.value.data : error.value.message
        }`;
        return null;
    }
    fileInfo.value = data.value;
};

const trackFileInfo = setInterval(async () => {
    const fileId = fileList.value.find(
        (e) => e.UUID === fileInfo.value?.UUID
    )?.ID;
    if (fileId) {
        const { data } = await useFetch<FileInfoItem>(
            `${conf.public.apiUrl}/file`,
            {
                headers: {
                    Authorization: `Bearer ${token.value}`,
                },
                query: {
                    LinkID: fileId,
                },
                retry: 5,
                lazy: true,
            }
        );
        if (fileInfo.value?.UUID === data.value?.UUID) {
            fileInfo.value = data.value;
        }
    }
}, 2000);
onBeforeRouteLeave(async (to, from) => {
    clearInterval(trackFileInfo);
});

await useLazyAsyncData(`folder-${activeFolderID.value}`, () =>
    openFolder(activeFolderID.value, "Home")
);

const checkAllCallback = () => {
    folderList.value.forEach((e) => (e.checked = globalCheckboxChecked.value));
    fileList.value.forEach((e) => (e.checked = globalCheckboxChecked.value));
};
</script>
