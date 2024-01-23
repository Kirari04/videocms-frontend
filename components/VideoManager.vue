<template>
    <div class="flex flex-col grow p-2 w-full">
        <!-- TOASTS -->
        <div class="toast toast-top toast-end z-10">
            <div class="alert alert-error" v-if="err">
                <IconError class="stroke-current shrink-0 h-6 w-6" />
                <div>{{ err }}</div>
            </div>
            <div v-for="alertMessage in alertList" class="alert alert-success">
                <IconDone class="stroke-current shrink-0 h-6 w-6" />
                <div>{{ alertMessage }}</div>
            </div>
        </div>
        <!-- TOP NAV -->
        <div class="flex flex-wrap w-full">
            <!-- LEFT SIDE -->
            <div class="justify-start flex items-center">
                <div class="btn-group">
                    <button @click="openUpload" :disabled="isLoading" class="btn btn-neutral btn-square btn-sm">
                        <IconUploadFile class="w-6 h-6 stroke-current fill-current" />
                    </button>
                    <button @click="openCreateFolder" :disabled="isLoading" class="btn btn-neutral btn-sm">
                        <IconCreateFolder class="w-6 h-6 stroke-current fill-current" />
                    </button>
                </div>
                <!-- LOADING -->
                <div v-if="isLoading" class="loading loading-spinner ml-2"></div>
            </div>
            <!-- RIGHT SIDE -->
            <div class="flex grow justify-end">
                <!-- MOBILE DROPDOWN -->
                <div class="dropdown dropdown-end dropdown-bottom md:hidden">
                    <label tabindex="0" class="btn btn-neutral btn-square btn-sm">
                        <IconVert class="w-6 h-6 stroke-current fill-current" />
                    </label>
                    <div tabindex="0"
                        class="dropdown-content backdrop-blur z-10 p-0 mt-2 shadow menu btn-group btn-group-vertical">
                        <button @click="reloadActiveFolder" :disabled="isLoading" class="btn btn-neutral btn-sm w-full">
                            Refresh
                        </button>

                        <button :disabled="isLoading || selectedCount() === 0"
                            class="btn btn-neutral btn-sm indicator w-full">
                            Move
                            <div v-if="selectedCount() > 0" class="indicator-item badge badge-sm badge-primary">
                                {{ selectedCount() }}
                            </div>
                        </button>
                        <button @click="
                            openExport(
                                fileList.filter((e) => e.checked === true)
                            )
                            " :disabled="isLoading || selectedFilesCount() === 0"
                            class="btn btn-neutral btn-sm indicator w-full">
                            Export
                            <div v-if="selectedFilesCount() > 0" class="indicator-item badge badge-sm badge-primary">
                                {{ selectedFilesCount() }}
                            </div>
                        </button>
                        <button @click="
                            openDelete(
                                fileList.filter((e) => e.checked === true),
                                folderList.filter((e) => e.checked === true)
                            )
                            " :disabled="isLoading || selectedCount() === 0"
                            class="btn btn-error btn-sm indicator w-full">
                            <IconDelete class="w-6 h-6 stroke-current fill-current" />
                            <div v-if="selectedCount() > 0" class="indicator-item badge badge-sm badge-primary">
                                {{ selectedCount() }}
                            </div>
                        </button>
                    </div>
                </div>
                <!-- PC MENU -->
                <div class="btn-group flex-wrap hidden md:flex">
                    <button @click="reloadActiveFolder" :disabled="isLoading" class="btn btn-neutral btn-sm">
                        Refresh
                    </button>

                    <button :disabled="isLoading || selectedCount() === 0" class="btn btn-neutral btn-sm indicator">
                        Move
                        <div v-if="selectedCount() > 0" class="indicator-item badge badge-sm badge-primary">
                            {{ selectedCount() }}
                        </div>
                    </button>
                    <button @click="
                        openExport(
                            fileList.filter((e) => e.checked === true)
                        )
                        " :disabled="isLoading || selectedFilesCount() === 0" class="btn btn-neutral btn-sm indicator">
                        Export
                        <div v-if="selectedFilesCount() > 0" class="indicator-item badge badge-sm badge-primary">
                            {{ selectedFilesCount() }}
                        </div>
                    </button>
                    <button @click="
                        openDelete(
                            fileList.filter((e) => e.checked === true),
                            folderList.filter((e) => e.checked === true)
                        )
                        " :disabled="isLoading || selectedCount() === 0" class="btn btn-error btn-sm indicator">
                        <IconDelete class="w-6 h-6 stroke-current fill-current" />
                        <div v-if="selectedCount() > 0" class="indicator-item badge badge-sm badge-primary">
                            {{ selectedCount() }}
                        </div>
                    </button>
                </div>
            </div>
        </div>
        <!-- SELECT ALL & FOLDER PATH -->
        <div class="text-sm breadcrumbs flex flex-wrap items-center">
            <!-- SELECT ALL CHECKBOX -->
            <input v-model="globalCheckboxChecked" @change="checkAllCallback" type="checkbox"
                class="checkbox checkbox-sm mr-4" />
            <!-- FOLDER PATH -->
            <ul class="flex flex-wrap">
                <li v-for="(folder, index) in folderPathHistory">
                    <button @click="openFolder(folder.folderId, folder.name, index)" :disabled="isLoading"
                        class="flex items-center link link-hover">
                        <IconFolder class="w-4 h-4 mr-2 stroke-current" />
                        <span class="w-28 max-w-min truncate">{{
                            folder.name
                        }}</span>
                    </button>
                </li>
            </ul>
        </div>
        <!-- LIST -->
        <div class="flex flex-col-reverse gap-2 lg:flex-row basis-0">
            <div class="flex flex-col grow shrink">
                <div class="flex flex-col shrink">
                    <!-- LIST FOLDERS -->
                    <div class="flex flex-row items-center shrink" v-for="folder in listPaginationItems().folders">
                        <input v-model="folder.checked" @change="globalCheckboxChecked = false" type="checkbox"
                            class="checkbox checkbox-sm mr-4" />
                        <button @dblclick="openFolder(folder.ID, folder.Name)" @click="folder.checked = !folder.checked"
                            :disabled="isLoading" :class="folder.checked
                                ? 'btn btn-sm btn-primary no-animation grow shrink flex flex-nowrap justify-start normal-case'
                                : 'btn btn-sm no-animation grow shrink flex flex-nowrap justify-start normal-case'
                                ">
                            <span>
                                <IconFolder class="w-4 h-4 mr-2 stroke-current" />
                            </span>
                            <span class="w-0 max-w-full grow shrink text-start truncate">
                                {{ folder.Name }}
                            </span>
                        </button>
                        <div class="dropdown dropdown-left dropdown-end">
                            <label tabindex="0" class="btn btn-sm rounded-full ml-2 p-1 w-8 h-8">
                                <IconVert class="grow stroke-current fill-current" />
                            </label>
                            <div tabindex="0" class="dropdown-content z-[1] menu p-0 shadow btn-group btn-group-vertical">
                                <button class="btn btn-neutral btn-sm">
                                    Move
                                </button>
                                <button class="btn btn-neutral btn-sm">
                                    Rename
                                </button>
                                <button @click="openDelete([], [folder])" class="btn btn-error btn-sm">
                                    <IconDelete class="w-6 h-6 stroke-current fill-current" />
                                </button>
                            </div>
                        </div>
                    </div>
                    <!-- LIST FILES -->
                    <div class="flex flex-row items-center shrink" v-for="file in listPaginationItems().files">
                        <input v-model="file.checked" @change="globalCheckboxChecked = false" type="checkbox"
                            class="checkbox checkbox-sm mr-4" />
                        <button @click="() => {
                            file.checked = !file.checked;
                            if (file.checked) {
                                openFileInfo(file.ID);
                            }
                        }
                            " :disabled="isLoading" :class="file.checked
        ? 'btn btn-sm btn-primary no-animation grow shrink flex flex-nowrap justify-start normal-case'
        : 'btn btn-sm no-animation grow shrink flex flex-nowrap justify-start normal-case'
        ">
                            <div>
                                <IconVideo class="w-4 h-4 mr-2 fill-current" />
                            </div>
                            <div class="w-0 max-w-full grow shrink text-start truncate">
                                {{ file.Name }}
                            </div>
                        </button>
                        <div class="dropdown dropdown-left dropdown-start">
                            <label tabindex="0" class="btn btn-sm rounded-full p-1 ml-2 w-8 h-8">
                                <IconVert class="grow stroke-current fill-current" />
                            </label>
                            <div tabindex="0" class="dropdown-content z-[1] menu p-0 shadow btn-group btn-group-vertical">
                                <button @click="openFileInfo(file.ID)" :disabled="isLoading" class="btn btn-neutral btn-sm">
                                    Info
                                </button>
                                <button @click="openExport([file])" class="btn btn-neutral btn-sm">
                                    Export
                                </button>
                                <button @click="
                                    openMoveFile(
                                        file.ID,
                                        file.Name
                                    )" class="btn btn-neutral btn-sm">
                                    Move
                                </button>
                                <button @click="openRenameFile(
                                    file.ID,
                                    file.Name
                                )" class="btn btn-neutral btn-sm">
                                    Rename
                                </button>

                                <button @click="openDelete([file], [])" class="btn btn-error btn-sm">
                                    <IconDelete class="w-6 h-6 stroke-current fill-current" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="divider"></div>
                <!-- Pagination -->
                <div class="mt-2 flex justify-center items-center shrink">
                    <div class="join">
                        <button v-for="index in paginationMenusAmount()" @click="paginationIndex = index - 1" :class="paginationIndex === index - 1
                            ? 'join-item btn btn-sm btn-primary'
                            : 'join-item btn btn-sm'
                            ">
                            {{ index }}
                        </button>
                    </div>
                    <div class="dropdown dropdown-top dropdown-end">
                        <label tabindex="0" class="btn btn-neutral btn-sm ml-2">
                            Max {{ paginationMaxSize }}</label>
                        <ul tabindex="0"
                            class="dropdown-content z-[1] menu btn-group btn-group-vertical p-0 mb-2 shadow rounded-box">
                            <li v-for="max in [10, 25, 50, 100, 200, 500, 1000]" @click="paginationMaxSize = max" :class="paginationMaxSize === max
                                ? 'btn btn-sm btn-primary whitespace-nowrap'
                                : 'btn btn-sm btn-neutral whitespace-nowrap'
                                ">
                                Max {{ max }}
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <!-- FILEINFO -->
            <div :class="showFileInfo
                ? 'bg-base-300 p-2 rounded-xl w-full lg:w-96 max-w-full transition-all'
                : 'bg-base-300 py-2 px-0 rounded-box overflow-hidden h-0 w-0 opacity-0 max-w-full transition-all'
                ">
                <div class="flex items-center">
                    <span class="w-0 grow truncate">{{ fileInfo?.Name }}</span>

                    <button @click="showFileInfo = false" class="btn btn-square btn-sm ml-auto">
                        <IconError class="stroke-current shrink-0 h-6 w-6" />
                    </button>
                </div>
                <img :src="`${conf.public.baseUrl}${fileInfo?.Thumbnail}?cache=${new Date().getMinutes()}`" alt="Thumbnail"
                    class="mt-2 rounded" />
                <div class="btn-group mt-2 flex flex-wrap">
                    <button @click=" 
                        openFile(
                            fileList.find((e) => e.UUID === fileInfo?.UUID)!
                        )
                        " :disabled="isLoading" class="btn btn-sm grow">
                        Open
                    </button>
                    <button @click="
                        openExport([
                            fileList.find(
                                (e) => e.UUID === fileInfo?.UUID
                            )!,
                        ])
                        " class="btn btn-sm grow">
                        Export
                    </button>
                    <button @click="
                        openMoveFile(
                            fileInfo!.ID,
                            fileInfo!.Name
                        )" class="btn btn-sm grow">Move</button>
                    <button @click="openRenameFile(
                        fileInfo!.ID,
                        fileInfo!.Name
                    )" class="btn btn-sm grow">Rename</button>
                    <button @click="
                        openDelete(
                            [
                                fileList.find(
                                    (e) => e.UUID === fileInfo?.UUID
                                )!,
                            ],
                            []
                        )
                        " class="btn btn-error btn-sm grow">
                        <IconDelete class="w-6 h-6 stroke-current fill-current" />
                    </button>
                </div>
                <table class="table mt-2 max-w-full">
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
                            <td class="flex flex-col justify-start max-w-full">
                                <div v-for="qualityType in [
                                    ...new Set(
                                        fileInfo?.Qualitys.map(
                                            (e) => e.Type
                                        )
                                    ),
                                ]" class="flex flex-col gap-2 mb-2 max-w-full">
                                    <div class="uppercase font-bold">
                                        {{ qualityType }}
                                    </div>
                                    <div class="flex flex-row items-center gap-2 max-w-full" v-for="quality in fileInfo?.Qualitys.filter(
                                        (e) => e.Type === qualityType
                                    )">
                                        <div class="badge badge-primary badge-sm">
                                            {{ quality.Name }}
                                        </div>
                                        <div
                                            class="flex w-0 overflow-x-auto overflow-y-visible grow shrink justify-start relative whitespace-nowrap gap-2">
                                            <div class="badge badge-primary badge-outline badge-sm">
                                                {{ quality.Width }}x{{
                                                    quality.Height
                                                }}
                                            </div>
                                            <div class="badge badge-primary badge-outline badge-sm">
                                                {{ quality.AvgFrameRate }} fps
                                            </div>
                                            <div class="badge badge-primary badge-outline badge-sm">
                                                {{
                                                    humanFileSize(quality.Size)
                                                }}
                                            </div>
                                        </div>
                                        <div v-if="quality.Ready">
                                            <IconDone class="shrink-0 h-6 w-6 fill-success" />
                                        </div>
                                        <div v-if="quality.Failed">
                                            <IconError class="shrink-0 h-6 w-6 stroke-error" />
                                        </div>
                                        <div v-if="!quality.Ready &&
                                            !quality.Failed
                                            " class="flex items-center">
                                            <span :class="quality.Progress == 0
                                                ? 'loading loading-spinner text-primary loading-md'
                                                : 'radial-progress text-primary'
                                                " :style="`
                                                    --value: ${quality.Progress};
                                                    --size: 1.5rem;
                                                    --thickness: 3px;
                                                `"></span>
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr v-if="fileInfo?.Audios">
                            <th class="align-top">Audios</th>
                            <td class="flex flex-col justify-start">
                                <div v-for="audioType in [
                                    ...new Set(
                                        fileInfo?.Audios.map((e) => e.Type)
                                    ),
                                ]" class="flex flex-col gap-2 mb-2">
                                    <div class="uppercase font-bold">
                                        {{ audioType }}
                                    </div>
                                    <div v-for="audio in fileInfo?.Audios.filter(
                                        (e) => e.Type === audioType
                                    )" class="flex flex-row items-center gap-2">
                                        <div
                                            class="flex w-0 overflow-x-auto overflow-y-visible grow shrink justify-start relative whitespace-nowrap gap-2">
                                            <div class="badge badge-primary badge-sm">
                                                {{ audio.Name }}
                                            </div>
                                            <div class="badge badge-primary badge-sm badge-outline">
                                                {{ audio.Lang }}
                                            </div>
                                        </div>
                                        <div v-if="!audio.Ready">
                                            <span class="loading loading-spinner text-primary loading-md"></span>
                                        </div>
                                        <div v-if="audio.Ready">
                                            <IconDone class="shrink-0 h-6 w-6 fill-success" />
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr v-if="fileInfo?.Subtitles">
                            <th class="align-top">Subtitles</th>
                            <td class="flex flex-col justify-start">
                                <div v-for="subType in [
                                    ...new Set(
                                        fileInfo?.Subtitles.map(
                                            (e) => e.Type
                                        )
                                    ),
                                ]" class="flex flex-col gap-2 mb-2">
                                    <div class="uppercase font-bold">
                                        {{ subType }}
                                    </div>
                                    <div v-for="sub in fileInfo?.Subtitles.filter(
                                        (e) => e.Type === subType
                                    )" class="flex flex-row items-center gap-2">
                                        <div
                                            class="flex w-0 overflow-x-auto overflow-y-visible grow shrink justify-start relative whitespace-nowrap gap-2">
                                            <div class="badge badge-primary badge-sm">
                                                {{ sub.Name }}
                                            </div>
                                            <div class="badge badge-primary badge-sm badge-outline">
                                                {{ sub.Lang }}
                                            </div>
                                        </div>
                                        <div v-if="!sub.Ready">
                                            <span class="loading loading-spinner text-primary loading-md"></span>
                                        </div>
                                        <div v-if="sub.Ready">
                                            <IconDone class="shrink-0 h-6 w-6 fill-success" />
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <!-- MODALS -->
        <dialog id="create_folder_modal" class="modal">
            <form @submit.prevent="createFolder" class="modal-box">
                <button onclick="create_folder_modal.close()" type="button"
                    class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                    ✕
                </button>
                <h3 class="font-bold text-lg">Create New Folder</h3>
                <div class="mt-2">
                    <input v-model="createFolderValue" type="text" placeholder="New Folder"
                        class="input input-bordered w-full max-w-xs" autofocus />
                </div>
                <div class="mt-2">
                    <button type="submit" class="btn btn-primary btn-sm">
                        Create Folder
                    </button>
                </div>
            </form>
            <form method="dialog" class="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
        <dialog id="delete_items_modal" class="modal">
            <form @submit.prevent="deleteItems" class="modal-box">
                <button onclick="delete_items_modal.close()" type="button"
                    class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                    ✕
                </button>
                <div class="flex items-center">
                    <h3 class="font-bold text-lg">Delete Items</h3>
                    <div v-if="deleteIsLoading > 0" class="loading loading-spinner ml-2"></div>
                </div>
                <div class="mt-2">
                    <ul class="list-disc">
                        <li v-for="folder in deleteFolderList" class="flex items-center">
                            <IconFolder class="w-4 h-4 mr-2 stroke-current" />
                            <span>
                                {{ folder.Name }}
                            </span>
                        </li>
                        <li v-for="file in deleteFileList" class="flex items-center">
                            <IconVideo class="w-4 h-4 mr-2 fill-current" />
                            <span>
                                {{ file.Name }}
                            </span>
                        </li>
                    </ul>
                </div>
                <div class="mt-2">
                    <button type="submit" class="btn btn-primary btn-sm">
                        Delete Items
                    </button>
                </div>
            </form>
            <form method="dialog" class="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
        <dialog id="create_export_modal" class="modal">
            <form @submit.prevent="copyExport" class="modal-box">
                <button onclick="create_export_modal.close()" type="button"
                    class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                    ✕
                </button>
                <h3 class="font-bold text-lg">Export Files</h3>
                <div class="tabs tabs-boxed mt-2">
                    <button v-for="(n, i) in exportOptions" :autofocus="i === exportActiveTab" @click="exportActiveTab = i"
                        type="button" :class="i === exportActiveTab ? 'tab tab-active' : 'tab'
                            ">
                        {{ n }}
                    </button>
                </div>
                <!-- SEPARATOR -->
                <div v-if="exportActiveTab === 0" class="flex flex-col">
                    <div class="mt-2">
                        <textarea id="export_file_list" class="textarea textarea-bordered w-full h-64"
                            placeholder="File List">{{
                                exportFileList
                                    .map(
                                        (e) =>
                                            `${exportShowFilename
                                                ? "## " + e.Name + "\n"
                                                : ""
                                            }${conf.public.baseUrl}/v/${e.UUID}`
                                    )
                                    .join(
                                        exportSeparator.split("\\n").join("\n")
                                    )
                            }}</textarea>
                    </div>
                    <div class="mt-2 flex justify-start">
                        <label class="label cursor-pointer">
                            <span class="label-text">Show Filenames</span>
                            <input type="checkbox" class="toggle toggle-primary ml-2"
                                @change="e => exportShowFilename = (e.target as HTMLInputElement).checked" />
                        </label>
                    </div>
                    <div class="mt-2">
                        <label class="label">
                            <span class="label-text">Separator</span>
                        </label>
                        <input v-model="exportSeparator" type="text" class="input input-bordered input-sm" />
                    </div>
                </div>
                <!-- IFRAME -->
                <div v-if="exportActiveTab === 1" class="flex flex-col">
                    <div class="mt-2">
                        <textarea id="export_file_list" class="textarea textarea-bordered w-full h-64"
                            placeholder="File List">{{
                                exportFileList
                                    .map(
                                        (e) =>
                                            `${exportShowFilename
                                                ? "<!-- " +
                                                e.Name +
                                                " -->\n"
                                                : ""
                                            }<iframe width="560" height="315" src="${conf.public.baseUrl
                                            }/v/${e.UUID}" title="Watch ${e.Name
                                            } on ${serverConfig.AppName
                                            }" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`
                                    )
                                    .join(
                                        exportSeparator.split("\\n").join("\n")
                                    )
                            }}</textarea>
                    </div>
                    <div class="mt-2 flex justify-start">
                        <label class="label cursor-pointer">
                            <span class="label-text">Show Filenames</span>
                            <input type="checkbox" class="toggle toggle-primary ml-2"
                                @change="e => exportShowFilename = (e.target as HTMLInputElement).checked" />
                        </label>
                    </div>
                    <div class="mt-2">
                        <label class="label">
                            <span class="label-text">Separator</span>
                        </label>
                        <input v-model="exportSeparator" type="text" class="input input-bordered input-sm" />
                    </div>
                </div>
                <!-- JSON -->
                <div v-if="exportActiveTab === 2" class="flex flex-col">
                    <div class="mt-2">
                        <textarea id="export_file_list" class="textarea textarea-bordered w-full h-64"
                            placeholder="File List">{{
                                exportFileList.map((e) => ({
                                    id: `${e.ID}`,
                                    uuid: `${e.UUID}`,
                                    name: `${e.Name}`,
                                    url: `${conf.public.baseUrl}/v/${e.UUID}`,
                                }))
                            }}</textarea>
                    </div>
                </div>

                <div class="mt-2">
                    <button type="submit" class="btn btn-primary btn-sm">
                        Copy
                    </button>
                </div>
            </form>
        </dialog>
        <dialog id="move_file_modal" class="modal">
            <form @submit.prevent="moveFile" class="modal-box">
                <button onclick="move_file_modal.close()" type="button"
                    class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-50">
                    ✕
                </button>
                <h3 class="font-bold text-lg">Move File</h3>
                <div class="mt-2">
                    <SelectFolder v-if="moveFileLinkId !== 0" v-on:update="folderId => moveFileFolderId = folderId" />
                </div>
                <div class="mt-2">
                    <button type="submit" class="btn btn-primary btn-sm">
                        Move
                    </button>
                </div>
            </form>
            <form method="dialog" class="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
        <dialog id="rename_file_modal" class="modal">
            <form @submit.prevent="renameFile" class="modal-box">
                <button onclick="rename_file_modal.close()" type="button"
                    class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                    ✕
                </button>
                <h3 class="font-bold text-lg">Rename File</h3>
                <div class="mt-2">
                    <input v-model="renameFileName" type="text" placeholder="File Name"
                        class="input input-bordered w-full max-w-xs" autofocus />
                </div>
                <div class="mt-2">
                    <button type="submit" class="btn btn-primary btn-sm">
                        Rename File
                    </button>
                </div>
            </form>
            <form method="dialog" class="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
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

const { data: accountData } = useAccountData()
const lastActiveUsername = useState<null | string>("lastActiveUsername", () => null);
const activeFolderID = useState("activeFolderID", () => 0);
const isLoading = ref(false);
const err = ref("");
const globalCheckboxChecked = ref(false);
const showFileInfo = ref(false);
const fileInfo = ref<FileInfoItem | null>(null);
const paginationIndex = ref(0);
const paginationMaxSize = ref(25);
const exportOptions = ['Separator', 'Iframe', 'Json'];

const serverConfig = useServerConfig();
const conf = useRuntimeConfig();
const token = useToken();
const folderPathHistory = useState<
    Array<{
        name: string;
        folderId: number;
    }>
>("folderPathHistory", () => ([]));

const listPaginationItems = () => {
    let returnValues: Array<{
        isFolder: boolean;
        index: number;
    }> = [];
    returnValues.push(
        ...folderList.value.map((e, i) => ({
            isFolder: true,
            index: i,
        }))
    );
    returnValues.push(
        ...fileList.value.map((e, i) => ({
            isFolder: false,
            index: i,
        }))
    );
    returnValues = returnValues.slice(
        paginationIndex.value * paginationMaxSize.value,
        (paginationIndex.value + 1) * paginationMaxSize.value
    );

    let returnFolders = folderList.value.filter((e, i) =>
        returnValues.find((re) => re.isFolder === true && re.index === i)
    );
    let returnFiles = fileList.value.filter((e, i) =>
        returnValues.find((re) => re.isFolder === false && re.index === i)
    );
    return {
        folders: returnFolders,
        files: returnFiles,
    };
};

const paginationMenusAmount = () => {
    return Math.ceil(
        (folderList.value.length + fileList.value.length) /
        paginationMaxSize.value
    );
};

const selectedCount = () => {
    return (
        fileList.value.filter((e) => e.checked === true).length +
        folderList.value.filter((e) => e.checked === true).length
    );
};
const selectedFilesCount = () => {
    return fileList.value.filter((e) => e.checked === true).length;
};

interface FolderListItem {
    ID: number;
    CreatedAt: string;
    UpdatedAt: string;
    Name: string;
    ParentFolderID: number;
    checked?: boolean;
}
const folderList = useState<Array<FolderListItem>>("folderList", () => ([]));
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
        err.value = `${error.value.data ? error.value.data : error.value.message
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
const fileList = useState<Array<FileListItem>>("fileList", () => ([]));
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
        err.value = `${error.value.data ? error.value.data : error.value.message
            }`;
        return null;
    }
    err.value = "";
    return data.value;
};
const openFile = (file: FileListItem) => {
    window.open(`${conf.public.baseUrl}/v/${file.UUID}`);
};

const openFolder = async (
    folderId: number,
    folderName: string,
    jumpToIndex = -1
) => {
    isLoading.value = true;
    showFileInfo.value = false

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
    ID: number;
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
        err.value = `${error.value.data ? error.value.data : error.value.message
            }`;
        return null;
    }
    fileInfo.value = data.value;
};

const trackFileInfo = setInterval(async () => {
    const fileId = fileList.value.find(
        (e) => e.UUID === fileInfo.value?.UUID
    )?.ID;
    if (fileId && showFileInfo.value) {
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

const openCreateFolder = () => {
    (
        document.getElementById("create_folder_modal") as HTMLDialogElement
    ).showModal();
};


const openRenameFile = (linkId: number, fileName: string) => {
    renameFileLinkId.value = linkId;
    renameFileName.value = fileName;
    (
        document.getElementById("rename_file_modal") as HTMLDialogElement
    ).showModal();
};

const openMoveFile = (linkId: number, fileName: string) => {
    moveFileLinkId.value = linkId;
    moveFileName.value = fileName;
    (
        document.getElementById("move_file_modal") as HTMLDialogElement
    ).showModal();
};

const renameFileLinkId = ref(0)
const renameFileName = ref("")
const renameFile = async () => {
    isLoading.value = true;
    const formData = new FormData();
    formData.append("LinkID", `${renameFileLinkId.value}`);
    formData.append("Name", renameFileName.value);
    formData.append("ParentFolderID", `${activeFolderID.value}`);
    const { data, error } = await useFetch<{
        ID: string;
        Name: string;
    }>(`${conf.public.apiUrl}/file`, {
        method: "put",
        headers: {
            Authorization: `Bearer ${token.value}`,
        },
        body: formData,
    });
    isLoading.value = false;
    if (error.value) {
        err.value = `${error.value.data ? error.value.data : error.value.message
            }`;
        return null;
    }
    err.value = "";
    renameFileLinkId.value = 0
    renameFileName.value = ""
    reloadActiveFolder();
    (
        document.getElementById("rename_file_modal") as HTMLDialogElement
    ).close();
};

const moveFileLinkId = ref(0)
const moveFileName = ref("")
const moveFileFolderId = ref(0)
const moveFile = async () => {
    isLoading.value = true;
    const formData = new FormData();
    formData.append("LinkID", `${moveFileLinkId.value}`);
    formData.append("Name", moveFileName.value);
    formData.append("ParentFolderID", `${moveFileFolderId.value}`);
    const { data, error } = await useFetch<{
        ID: string;
        Name: string;
    }>(`${conf.public.apiUrl}/file`, {
        method: "put",
        headers: {
            Authorization: `Bearer ${token.value}`,
        },
        body: formData,
    });
    isLoading.value = false;
    if (error.value) {
        err.value = `${error.value.data ? error.value.data : error.value.message
            }`;
        return null;
    }
    err.value = "";
    moveFileLinkId.value = 0
    moveFileName.value = ""
    moveFileFolderId.value = 0
    reloadActiveFolder();
    (
        document.getElementById("move_file_modal") as HTMLDialogElement
    ).close();
};

const openUpload = () => {
    (
        document.getElementById("upload_modal") as HTMLDialogElement
    ).showModal();
};
const createFolderValue = ref("");
const createFolder = async () => {
    isLoading.value = true;
    const formData = new FormData();
    formData.append("name", createFolderValue.value);
    formData.append("ParentFolderID", `${activeFolderID.value}`);
    const { data, error } = await useFetch<{
        ID: string;
        Name: string;
    }>(`${conf.public.apiUrl}/folder`, {
        method: "post",
        headers: {
            Authorization: `Bearer ${token.value}`,
        },
        body: formData,
    });
    isLoading.value = false;
    if (error.value) {
        err.value = `${error.value.data ? error.value.data : error.value.message
            }`;
        return null;
    }
    err.value = "";
    createFolderValue.value = "";
    reloadActiveFolder();
    (
        document.getElementById("create_folder_modal") as HTMLDialogElement
    ).close();
};

const reloadActiveFolder = () => {
    openFolder(
        activeFolderID.value,
        folderPathHistory.value[folderPathHistory.value.length - 1].name,
        folderPathHistory.value.length - 1
    );
    globalCheckboxChecked.value = false;
};
const exportFileList = ref<Array<FileListItem>>([]);
const exportSeparator = ref("\\n\\n");
const exportShowFilename = ref(false);
const exportActiveTab = ref(0);
const openExport = (files: Array<FileListItem>) => {
    exportFileList.value = files;
    (
        document.getElementById("create_export_modal") as HTMLDialogElement
    ).showModal();
};
const copyExport = () => {
    let export_file_list = document.getElementById(
        "export_file_list"
    ) as HTMLTextAreaElement;
    navigator.clipboard.writeText(export_file_list.value).then(
        () => {
            inlineAlert("Copied");
        },
        () => {
            alert("Failed to copy");
        }
    );
};

const deleteFileList = ref<Array<FileListItem>>([]);
const deleteFolderList = ref<Array<FolderListItem>>([]);
const deleteIsLoading = ref(0);
const openDelete = (
    files: Array<FileListItem>,
    folders: Array<FolderListItem>
) => {
    deleteFileList.value = files;
    deleteFolderList.value = folders;
    (
        document.getElementById("delete_items_modal") as HTMLDialogElement
    ).showModal();
};
const deleteItems = async () => {
    if (deleteFileList.value.length > 0) {
        const fileRes = await deleteFiles(deleteFileList.value);
        if (fileRes == null) {
            (
                document.getElementById(
                    "delete_items_modal"
                ) as HTMLDialogElement
            ).close();
            return;
        }
    }
    if (deleteFolderList.value.length > 0) {
        const folderRes = await deleteFolders(deleteFolderList.value);
        if (folderRes == null) {
            (
                document.getElementById(
                    "delete_items_modal"
                ) as HTMLDialogElement
            ).close();
            return;
        }
    }
    err.value = "";
    reloadActiveFolder();
    (
        document.getElementById("delete_items_modal") as HTMLDialogElement
    ).close();
};

const deleteFiles = async (files: Array<FileListItem>) => {
    deleteIsLoading.value++;
    const linkIDs: Array<{ LinkID: number }> = files.map((e) => ({
        LinkID: e.ID,
    }));

    const { data, error } = await useFetch<string>(
        `${conf.public.apiUrl}/files`,
        {
            method: "delete",
            headers: {
                Authorization: `Bearer ${token.value}`,
                "Content-Type": `application/json`,
            },
            body: JSON.stringify({
                LinkIDs: linkIDs,
            }),
        }
    );
    deleteIsLoading.value--;
    if (error.value) {
        err.value = `${error.value.data ? error.value.data : error.value.message
            }`;
        return null;
    }

    return data.value;
};

const deleteFolders = async (folders: Array<FolderListItem>) => {
    deleteIsLoading.value++;
    const folderIDs: Array<{ FolderID: number }> = folders.map((e) => ({
        FolderID: e.ID,
    }));

    const { data, error } = await useFetch<string>(
        `${conf.public.apiUrl}/folders`,
        {
            method: "delete",
            headers: {
                Authorization: `Bearer ${token.value}`,
                "Content-Type": `application/json`,
            },
            body: JSON.stringify({
                FolderIDs: folderIDs,
            }),
        }
    );
    deleteIsLoading.value--;
    if (error.value) {
        err.value = `${error.value.data ? error.value.data : error.value.message
            }`;
        return null;
    }

    return data.value;
};

const alertList = ref<Array<string>>([]);
const inlineAlert = (message: string, timeout = 2000) => {
    alertList.value.push(message);
    setTimeout(() => {
        alertList.value.pop();
    }, timeout);
};

// INIT
onMounted(async () => {
    await resetVideoManager();
})

watch(accountData, async (newValue, oldValue) => {
    if (newValue &&
        accountData.value &&
        lastActiveUsername.value !== accountData.value.Username) {
        lastActiveUsername.value = accountData.value?.Username ?? null;
        await resetVideoManager();
    }
})
let resettingVideoManager = false;
const resetVideoManager = async () => {
    if (resettingVideoManager) return
    resettingVideoManager = true;
    globalCheckboxChecked.value = false;
    activeFolderID.value = 0;
    folderPathHistory.value = [];
    await openFolder(activeFolderID.value, "Home")
    resettingVideoManager = false;
}

// CALLBACK
const checkAllCallback = () => {
    folderList.value.forEach((e) => (e.checked = globalCheckboxChecked.value));
    fileList.value.forEach((e) => (e.checked = globalCheckboxChecked.value));
};
onBeforeRouteLeave(async (to, from) => {
    clearInterval(trackFileInfo);

    (
        document.getElementById("create_folder_modal") as HTMLDialogElement
    ).close();
    (
        document.getElementById("create_export_modal") as HTMLDialogElement
    ).close();
    await new Promise((res) => setTimeout(res, 100));
});
</script>
