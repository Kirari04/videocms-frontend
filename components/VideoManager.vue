<template>
    <div class="flex min-w-0 grow flex-col">
        <!-- Toasts -->
        <div class="toast toast-top toast-end z-(--z-toast)">
            <div role="alert" class="alert alert-error" v-if="err">
                <Icon name="lucide:alert-circle" class="h-5 w-5 shrink-0" />
                <span>{{ err }}</span>
                <button @click="err = ''" class="btn btn-square btn-ghost btn-sm" aria-label="Dismiss">
                    <Icon name="lucide:x" class="h-4 w-4" />
                </button>
            </div>
            <div v-for="alertMessage in alertList" role="status" class="alert alert-success">
                <Icon name="lucide:check-circle-2" class="h-5 w-5 shrink-0" />
                <span>{{ alertMessage }}</span>
            </div>
        </div>

        <!-- Page Header -->
        <PageHeader
            :title="readOnlyMode ? 'User files' : 'Videos'"
            :description="readOnlyMode ? 'Inspect and manage this user\'s content.' : 'Your library, organized in folders.'">
            <template v-if="!readOnlyMode">
                <button @click="openCreateFolder" :disabled="isLoading" class="btn btn-ghost btn-sm gap-2">
                    <Icon name="lucide:folder-plus" class="h-4 w-4" />
                    <span class="hidden sm:inline">New folder</span>
                </button>
                <button @click="openUpload" :disabled="isLoading" class="btn btn-primary btn-sm gap-2">
                    <Icon name="lucide:upload" class="h-4 w-4" />
                    Upload
                </button>
            </template>
        </PageHeader>

        <!-- Main Content Layout -->
        <div class="flex min-w-0 flex-col items-start gap-6 lg:flex-row lg:gap-0">

            <!-- List Section -->
            <div
                class="video-manager-list flex min-w-0 w-full flex-1 flex-col transition-all duration-(--motion-base) ease-(--ease-out)">
                <div class="min-w-0 rounded-box border border-base-300 bg-base-100">
                    <!-- Toolbar: selection, breadcrumbs, search, actions -->
                    <div class="video-manager-toolbar flex flex-col gap-3 border-b border-base-300 p-3">
                        <div class="flex min-w-0 grow items-center gap-3">
                            <input
                                v-model="globalCheckboxChecked"
                                @change="checkAllCallback"
                                type="checkbox"
                                class="checkbox checkbox-sm"
                                aria-label="Select all" />
                            <div class="breadcrumbs grow overflow-hidden p-0 text-sm">
                                <ul>
                                    <li v-for="(folder, index) in folderPathHistory" :key="folder.folderId"
                                        @dragover="canManage && handleDragOver($event, folder.folderId)"
                                        @dragleave="canManage && (dragTargetId = null)"
                                        @drop="canManage && handleDrop($event, folder.folderId)"
                                        :class="{ 'rounded-selector bg-primary/10': dragTargetId === folder.folderId }">
                                        <button
                                            @click="openFolder(folder.folderId, folder.name, index)"
                                            :disabled="isLoading"
                                            class="flex items-center gap-1.5 transition-colors hover:text-primary"
                                            :class="index === folderPathHistory.length - 1 ? 'font-medium text-base-content' : 'text-base-content/60'">
                                            <Icon :name="index === 0 ? 'lucide:home' : 'lucide:folder'" class="h-3.5 w-3.5" />
                                            <span class="max-w-[100px] truncate sm:max-w-xs">{{ folder.name }}</span>
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div class="video-manager-controls flex min-w-0 items-center gap-2">
                            <label class="video-manager-search input input-sm">
                                <Icon name="lucide:search" class="h-3.5 w-3.5 text-base-content/50" />
                                <input v-model="searchQuery" type="search" placeholder="Search videos" />
                                <button
                                    v-if="searchQuery"
                                    @click="searchQuery = ''"
                                    class="text-base-content/50 hover:text-base-content"
                                    aria-label="Clear search">
                                    <Icon name="lucide:x" class="h-3.5 w-3.5" />
                                </button>
                            </label>

                            <button
                                class="btn btn-square btn-ghost btn-sm"
                                @click="reloadActiveFolder"
                                :disabled="isLoading"
                                title="Refresh"
                                aria-label="Refresh">
                                <Icon name="lucide:rotate-cw" class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
                            </button>
                            <div class="join">
                                <button
                                    v-if="canManage"
                                    class="btn join-item btn-ghost btn-sm border-base-300"
                                    :disabled="isLoading || selectedCount() === 0"
                                    @click="openMoveItems">
                                    Move
                                    <span v-if="selectedCount() > 0" class="badge badge-sm border-none bg-primary/10 text-primary tabular-nums">{{ selectedCount() }}</span>
                                </button>
                                <button
                                    class="btn join-item btn-ghost btn-sm border-base-300"
                                    :disabled="isLoading || selectedFilesCount() === 0"
                                    @click="openExport(currentFileList.filter(e => e.checked))">
                                    Export
                                    <span v-if="selectedFilesCount() > 0" class="badge badge-sm border-none bg-primary/10 text-primary tabular-nums">{{ selectedFilesCount() }}</span>
                                </button>
                                <button
                                    v-if="canManage"
                                    class="btn join-item btn-ghost btn-sm border-base-300 text-error"
                                    :disabled="isLoading || selectedCount() === 0"
                                    @click="openDelete(currentFileList.filter(e => e.checked), currentFolderList.filter(e => e.checked))"
                                    title="Delete selected">
                                    <Icon name="lucide:trash-2" class="h-4 w-4" />
                                    <span v-if="selectedCount() > 0" class="badge badge-sm border-none bg-error/10 text-error tabular-nums">{{ selectedCount() }}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="min-h-[500px] overflow-x-auto">
                        <table class="table w-full">
                            <thead>
                                <tr class="border-base-300 text-xs text-base-content/70">
                                    <th class="w-12"></th>
                                    <th class="font-medium">
                                        <button @click="toggleSort('name')"
                                            class="flex items-center gap-1 transition-colors hover:text-base-content"
                                            :class="{ 'text-base-content': sortKey === 'name' }">
                                            Name
                                            <Icon :name="sortIcon('name')" class="h-3 w-3" />
                                        </button>
                                    </th>
                                    <th class="video-manager-secondary-column w-24 font-medium">
                                        <button @click="toggleSort('duration')"
                                            class="flex items-center gap-1 transition-colors hover:text-base-content"
                                            :class="{ 'text-base-content': sortKey === 'duration' }">
                                            Duration
                                            <Icon :name="sortIcon('duration')" class="h-3 w-3" />
                                        </button>
                                    </th>
                                    <th class="video-manager-secondary-column w-24 font-medium">
                                        <button @click="toggleSort('size')"
                                            class="flex items-center gap-1 transition-colors hover:text-base-content"
                                            :class="{ 'text-base-content': sortKey === 'size' }">
                                            Size
                                            <Icon :name="sortIcon('size')" class="h-3 w-3" />
                                        </button>
                                    </th>
                                    <th class="video-manager-secondary-column w-28 font-medium">
                                        <button @click="toggleSort('date')"
                                            class="flex items-center gap-1 transition-colors hover:text-base-content"
                                            :class="{ 'text-base-content': sortKey === 'date' }">
                                            Added
                                            <Icon :name="sortIcon('date')" class="h-3 w-3" />
                                        </button>
                                    </th>
                                    <th class="w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- Search Empty State -->
                                <tr v-if="searchQuery && searchResults.length === 0 && !isLoading">
                                    <td colspan="6">
                                        <div class="flex flex-col items-center justify-center gap-1 py-16 text-center">
                                            <Icon name="lucide:search-x" class="h-6 w-6 text-base-content/30" />
                                            <p class="text-sm font-medium">No results for “{{ searchQuery }}”</p>
                                            <p class="text-sm text-base-content/60">Search covers every folder in this library.</p>
                                        </div>
                                    </td>
                                </tr>

                                <!-- Empty State -->
                                <tr v-else-if="!searchQuery && listPaginationItems().folders.length === 0 && listPaginationItems().files.length === 0">
                                    <td colspan="6">
                                        <div class="flex flex-col items-center justify-center gap-1 py-16 text-center">
                                            <Icon name="lucide:folder-open" class="h-6 w-6 text-base-content/30" />
                                            <p class="text-sm font-medium">This folder is empty</p>
                                            <p v-if="canManage" class="text-sm text-base-content/60">
                                                Upload a video or create a folder to get started.
                                            </p>
                                        </div>
                                    </td>
                                </tr>

                                <!-- Folders -->
                                <tr v-for="folder in listPaginationItems().folders" :key="'folder-' + folder.ID"
                                    class="group border-base-300 hover:bg-base-200/60"
                                    :draggable="canManage"
                                    @dragstart="canManage && handleDragStart($event, 'folder', folder)"
                                    @dragover="canManage && handleDragOver($event, folder.ID)"
                                    @dragleave="canManage && (dragTargetId = null)"
                                    @drop="canManage && handleDrop($event, folder.ID)"
                                    :class="{ 'bg-primary/10': dragTargetId === folder.ID, 'bg-primary/5': folder.checked && dragTargetId !== folder.ID }">
                                    <td class="w-12">
                                        <input v-model="folder.checked" @change="globalCheckboxChecked = false" type="checkbox"
                                            class="checkbox checkbox-sm" :aria-label="`Select ${folder.Name}`" />
                                    </td>
                                    <td class="w-full">
                                        <button
                                            @click="openFolder(folder.ID, folder.Name)"
                                            class="flex w-full items-center gap-3 text-left font-medium transition-colors group-hover:text-primary">
                                            <span
                                                class="flex h-9 w-14 shrink-0 items-center justify-center rounded-selector bg-base-200">
                                                <Icon name="lucide:folder" class="h-4.5 w-4.5 text-base-content/50" />
                                            </span>
                                            <span class="truncate">{{ folder.Name }}</span>
                                        </button>
                                    </td>
                                    <td class="video-manager-secondary-column" colspan="3"></td>
                                    <td class="text-right">
                                        <div class="dropdown dropdown-end" v-if="canManage">
                                            <label tabindex="0"
                                                class="btn btn-square btn-ghost btn-sm opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-within:opacity-100"
                                                aria-label="Folder actions">
                                                <Icon name="lucide:more-vertical" class="h-4 w-4" />
                                            </label>
                                            <ul tabindex="0"
                                                class="dropdown-content z-(--z-dropdown) menu w-52 rounded-box border border-base-300 bg-base-100 p-2 shadow-md">
                                                <li><a @click="openRenameFolder(folder.ID, folder.Name)">
                                                        <Icon name="lucide:edit-2" class="h-4 w-4" /> Rename
                                                    </a></li>
                                                <li><a @click="openDelete([], [folder])" class="text-error hover:bg-error/10">
                                                        <Icon name="lucide:trash-2" class="h-4 w-4" /> Delete
                                                    </a></li>
                                            </ul>
                                        </div>
                                    </td>
                                </tr>

                                <!-- Files -->
                                <tr v-for="file in listPaginationItems().files" :key="'file-' + file.ID"
                                    class="group border-base-300 hover:bg-base-200/60"
                                    :class="{ 'bg-primary/5': (fileInfo?.ID === file.ID && showFileInfo) || file.checked }"
                                    :draggable="canManage"
                                    @dragstart="canManage && handleDragStart($event, 'file', file)">
                                    <td class="w-12">
                                        <input v-model="file.checked" @change="globalCheckboxChecked = false" type="checkbox"
                                            class="checkbox checkbox-sm" :aria-label="`Select ${file.Name}`" />
                                    </td>
                                    <td class="w-full">
                                        <button
                                            @click="openFileInfo(file.ID)"
                                            class="flex w-full items-center gap-3 text-left font-medium transition-colors group-hover:text-primary">
                                            <span
                                                class="relative flex h-9 w-14 shrink-0 items-center justify-center overflow-hidden rounded-selector bg-base-200">
                                                <Icon name="lucide:film" class="h-4 w-4 text-base-content/40" />
                                                <img
                                                    v-if="file.Thumbnail && file.Available !== false"
                                                    :src="`${baseUrl}${file.Thumbnail}`"
                                                    class="absolute inset-0 h-full w-full object-cover"
                                                    loading="lazy"
                                                    alt=""
                                                    @error="($event.target as HTMLImageElement).remove()" />
                                            </span>
                                            <span class="flex min-w-0 flex-col">
                                                <span class="truncate">{{ file.Name }}</span>
                                                <span v-if="file.Processing"
                                                    class="flex items-center gap-1 text-xs font-normal text-warning">
                                                    <span class="loading loading-spinner h-2.5 w-2.5"></span>
                                                    Processing
                                                </span>
                                                <span v-else-if="file.Available === false"
                                                    class="flex items-center gap-1 text-xs font-normal text-warning">
                                                    <Icon name="lucide:cloud-off" class="h-3 w-3" />
                                                    Storage unavailable
                                                </span>
                                            </span>
                                        </button>
                                    </td>
                                    <td
                                        class="video-manager-secondary-column text-sm tabular-nums whitespace-nowrap text-base-content/70">
                                        {{ file.Duration != null ? humanDuration(file.Duration) : '—' }}
                                    </td>
                                    <td
                                        class="video-manager-secondary-column text-sm tabular-nums whitespace-nowrap text-base-content/70">
                                        {{ file.Size != null ? humanFileSize(file.Size) : '—' }}
                                    </td>
                                    <td
                                        class="video-manager-secondary-column text-sm tabular-nums whitespace-nowrap text-base-content/70">
                                        {{ file.CreatedAt ? new Date(file.CreatedAt).toLocaleDateString() : '—' }}
                                    </td>
                                    <td class="text-right">
                                        <div class="dropdown dropdown-end">
                                            <label tabindex="0"
                                                class="btn btn-square btn-ghost btn-sm opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-within:opacity-100"
                                                aria-label="File actions">
                                                <Icon name="lucide:more-vertical" class="h-4 w-4" />
                                            </label>
                                            <ul tabindex="0"
                                                class="dropdown-content z-(--z-dropdown) menu w-52 rounded-box border border-base-300 bg-base-100 p-2 shadow-md">
                                                <li><a @click="openFileInfo(file.ID)">
                                                        <Icon name="lucide:info" class="h-4 w-4" /> Info
                                                    </a></li>
                                                <li :class="{ 'disabled': file.Available === false }">
                                                    <button type="button" :disabled="file.Available === false"
                                                        :title="file.Available === false ? 'Reconnect storage before exporting' : undefined"
                                                        @click="openExport([file])">
                                                        <Icon name="lucide:share" class="h-4 w-4" /> Export
                                                    </button>
                                                </li>
                                                <li v-if="canManage"><a @click="openMoveFile(file.ID, file.Name)">
                                                        <Icon name="lucide:folder-input" class="h-4 w-4" /> Move
                                                    </a></li>
                                                <li v-if="canManage"><a @click="openRenameFile(file.ID, file.Name)">
                                                        <Icon name="lucide:edit-2" class="h-4 w-4" /> Rename
                                                    </a></li>
                                                <li v-if="canManage"><a @click="openDelete([file], [])"
                                                        class="text-error hover:bg-error/10">
                                                        <Icon name="lucide:trash-2" class="h-4 w-4" /> Delete
                                                    </a></li>
                                            </ul>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Pagination -->
                    <PaginationBar
                        class="border-t border-base-300 p-3"
                        v-model:page="paginationIndex"
                        v-model:pageSize="paginationMaxSize"
                        :pages="paginationMenusAmount()" />
                </div>
            </div>

            <!-- File Info Sidebar -->
            <div
                class="hidden flex-none transition-all duration-(--motion-base) ease-(--ease-out) lg:block"
                :class="showFileInfo ? 'lg:w-96 translate-x-0 opacity-100 lg:ml-6' : 'lg:w-0 translate-x-full opacity-0 lg:overflow-hidden lg:ml-0'">
                <div
                    class="sticky top-4 max-h-[calc(100dvh-2rem)] w-full overflow-hidden rounded-box border border-base-300 bg-base-100 lg:w-96">
                    <VideoFileInfoPanel
                        class="max-h-[calc(100dvh-2rem)]"
                        :file-info="fileInfo"
                        :can-manage="canManage"
                        :base-url="baseUrl"
                        :cache-key="fileInfoCacheKey"
                        :resolve-context-file="findFileInContext"
                        @close="closeFileInfo"
                        @export-file="openExportFileFromInfo"
                        @rename-file="openRenameFileFromInfo"
                        @create-tag="openCreateTagFromInfo"
                        @delete-tag="deleteTag"
                        @upload-thumbnail="uploadThumbnail"
                        @reset-thumbnail="resetThumbnail"
                    />
                </div>
            </div>
        </div>

        <!-- MODALS -->
        <Teleport to="body">
            <!-- Mobile File Info -->
            <dialog id="file_info_modal" class="modal lg:hidden" @close="handleFileInfoDialogClose">
                <div class="modal-box h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-hidden rounded-none bg-base-100 p-0">
                    <VideoFileInfoPanel
                        class="h-full"
                        :file-info="fileInfo"
                        :can-manage="canManage"
                        :base-url="baseUrl"
                        :cache-key="fileInfoCacheKey"
                        :resolve-context-file="findFileInContext"
                        @close="closeFileInfo"
                        @export-file="openExportFileFromInfo"
                        @rename-file="openRenameFileFromInfo"
                        @create-tag="openCreateTagFromInfo"
                        @delete-tag="deleteTag"
                        @upload-thumbnail="uploadThumbnail"
                        @reset-thumbnail="resetThumbnail"
                    />
                </div>
                <form method="dialog" class="modal-backdrop"><button @click="closeFileInfo">close</button></form>
            </dialog>

            <!-- Create Folder -->
            <dialog id="create_folder_modal" class="modal">
                <form @submit.prevent="createFolder" class="modal-box w-full max-w-md">
                    <button type="button" onclick="create_folder_modal.close()"
                        class="btn btn-square btn-ghost btn-sm absolute top-3 right-3" aria-label="Close">
                        <Icon name="lucide:x" class="h-4 w-4" />
                    </button>
                    <h3 class="mb-4 text-base font-semibold">New folder</h3>
                    <label class="flex flex-col gap-1.5">
                        <span class="text-sm font-medium">Folder name</span>
                        <input v-model="createFolderValue" type="text" placeholder="e.g. Vacation 2024"
                            class="input w-full" autofocus />
                    </label>
                    <div class="modal-action">
                        <button type="submit" class="btn btn-primary btn-sm" :disabled="!createFolderValue">Create folder</button>
                    </div>
                </form>
                <form method="dialog" class="modal-backdrop"><button>close</button></form>
            </dialog>

            <!-- Add Tag -->
            <dialog id="create_tag_modal" class="modal" @close="syncFileInfoLayout">
                <form @submit.prevent="createTag" class="modal-box w-full max-w-md">
                    <button type="button" onclick="create_tag_modal.close()"
                        class="btn btn-square btn-ghost btn-sm absolute top-3 right-3" aria-label="Close">
                        <Icon name="lucide:x" class="h-4 w-4" />
                    </button>
                    <h3 class="mb-4 text-base font-semibold">Add tag</h3>
                    <label class="flex flex-col gap-1.5">
                        <span class="text-sm font-medium">Tag name</span>
                        <input v-model="createTagValue" type="text" placeholder="e.g. Tutorials" class="input w-full"
                            autofocus />
                    </label>
                    <div class="modal-action">
                        <button type="submit" class="btn btn-primary btn-sm" :disabled="!createTagValue">Add tag</button>
                    </div>
                </form>
                <form method="dialog" class="modal-backdrop"><button>close</button></form>
            </dialog>

            <!-- Rename File -->
            <dialog id="rename_file_modal" class="modal" @close="syncFileInfoLayout">
                <form @submit.prevent="renameFile" class="modal-box w-full max-w-md">
                    <button type="button" onclick="rename_file_modal.close()"
                        class="btn btn-square btn-ghost btn-sm absolute top-3 right-3" aria-label="Close">
                        <Icon name="lucide:x" class="h-4 w-4" />
                    </button>
                    <h3 class="mb-4 text-base font-semibold">Rename file</h3>
                    <label class="flex flex-col gap-1.5">
                        <span class="text-sm font-medium">File name</span>
                        <input v-model="renameFileName" type="text" class="input w-full" autofocus />
                    </label>
                    <div class="modal-action">
                        <button type="submit" class="btn btn-primary btn-sm">Save changes</button>
                    </div>
                </form>
                <form method="dialog" class="modal-backdrop"><button>close</button></form>
            </dialog>

            <!-- Rename Folder -->
            <dialog id="rename_folder_modal" class="modal">
                <form @submit.prevent="renameFolder" class="modal-box w-full max-w-md">
                    <button type="button" onclick="rename_folder_modal.close()"
                        class="btn btn-square btn-ghost btn-sm absolute top-3 right-3" aria-label="Close">
                        <Icon name="lucide:x" class="h-4 w-4" />
                    </button>
                    <h3 class="mb-4 text-base font-semibold">Rename folder</h3>
                    <label class="flex flex-col gap-1.5">
                        <span class="text-sm font-medium">Folder name</span>
                        <input v-model="renameFolderName" type="text" class="input w-full" autofocus />
                    </label>
                    <div class="modal-action">
                        <button type="submit" class="btn btn-primary btn-sm">Save changes</button>
                    </div>
                </form>
                <form method="dialog" class="modal-backdrop"><button>close</button></form>
            </dialog>

            <!-- Move File -->
            <dialog id="move_file_modal" class="modal">
                <form @submit.prevent="moveFile" class="modal-box w-full max-w-lg">
                    <button type="button" onclick="move_file_modal.close()"
                        class="btn btn-square btn-ghost btn-sm absolute top-3 right-3" aria-label="Close">
                        <Icon name="lucide:x" class="h-4 w-4" />
                    </button>
                    <h3 class="mb-4 text-base font-semibold">Move file</h3>
                    <div class="max-h-60 overflow-y-auto rounded-field border border-base-300 bg-base-200 p-3">
                        <SelectFolder v-if="moveFileLinkId !== 0" :user-id="props.userId"
                            v-on:update="folderId => moveFileFolderId = folderId" />
                    </div>
                    <div class="modal-action">
                        <button type="submit" class="btn btn-primary btn-sm">Move here</button>
                    </div>
                </form>
                <form method="dialog" class="modal-backdrop"><button>close</button></form>
            </dialog>

            <!-- Bulk Move Items -->
            <dialog id="move_items_modal" class="modal">
                <form @submit.prevent="moveItems" class="modal-box w-full max-w-lg">
                    <button type="button" onclick="move_items_modal.close()"
                        class="btn btn-square btn-ghost btn-sm absolute top-3 right-3" aria-label="Close">
                        <Icon name="lucide:x" class="h-4 w-4" />
                    </button>
                    <h3 class="mb-1 text-base font-semibold">
                        Move {{ moveItemsFileList.length + moveItemsFolderList.length }} items
                    </h3>
                    <p class="mb-4 text-sm text-base-content/70" v-if="moveItemsFolderList.length > 0">
                        Moving folders may take a moment while the structure is validated.
                    </p>

                    <div class="max-h-60 overflow-y-auto rounded-field border border-base-300 bg-base-200 p-3">
                        <SelectFolder v-if="moveItemsShowPicker" :user-id="props.userId"
                            v-on:update="folderId => moveItemsTargetFolderId = folderId" />
                    </div>
                    <div class="modal-action">
                        <button type="submit" class="btn btn-primary btn-sm" :disabled="isLoading">
                            <span v-if="isLoading" class="loading loading-spinner loading-xs"></span>
                            Move here
                        </button>
                    </div>
                </form>
                <form method="dialog" class="modal-backdrop"><button>close</button></form>
            </dialog>

            <!-- Delete Confirmation -->
            <dialog id="delete_items_modal" class="modal">
                <form @submit.prevent="deleteItems" class="modal-box">
                    <button type="button" onclick="delete_items_modal.close()"
                        class="btn btn-square btn-ghost btn-sm absolute top-3 right-3" aria-label="Close">
                        <Icon name="lucide:x" class="h-4 w-4" />
                    </button>

                    <h3 class="mb-1 flex items-center gap-2 text-base font-semibold text-error">
                        <Icon name="lucide:alert-triangle" class="h-5 w-5" />
                        Delete {{ deleteFileList.length + deleteFolderList.length }} items
                    </h3>
                    <p class="mb-4 text-sm text-base-content/70">This is permanent and cannot be undone.</p>

                    <div class="mb-2 max-h-48 overflow-y-auto rounded-field border border-base-300 bg-base-200 p-2">
                        <ul class="flex flex-col gap-1">
                            <li v-for="folder in deleteFolderList" :key="'del-folder-' + folder.ID"
                                class="flex items-center gap-2 px-2 py-1 text-sm">
                                <Icon name="lucide:folder" class="h-4 w-4 shrink-0 text-base-content/50" />
                                <span class="truncate">{{ folder.Name }}</span>
                            </li>
                            <li v-for="file in deleteFileList" :key="'del-file-' + file.ID"
                                class="flex items-center gap-2 px-2 py-1 text-sm">
                                <Icon name="lucide:film" class="h-4 w-4 shrink-0 text-base-content/50" />
                                <span class="truncate">{{ file.Name }}</span>
                            </li>
                        </ul>
                    </div>

                    <div class="modal-action">
                        <button type="button" onclick="delete_items_modal.close()" class="btn btn-ghost btn-sm">Cancel</button>
                        <button type="submit" class="btn btn-error btn-sm" :disabled="deleteIsLoading > 0">
                            <span v-if="deleteIsLoading > 0" class="loading loading-spinner loading-xs"></span>
                            Delete
                        </button>
                    </div>
                </form>
                <form method="dialog" class="modal-backdrop"><button>close</button></form>
            </dialog>

            <!-- Export Modal -->
            <dialog id="create_export_modal" class="modal" @close="syncFileInfoLayout">
                <form @submit.prevent="copyExport"
                    class="modal-box flex h-[80vh] w-11/12 max-w-5xl flex-col overflow-hidden bg-base-100 p-0">
                    <!-- Header -->
                    <div class="flex shrink-0 items-center justify-between border-b border-base-300 p-4">
                        <h3 class="text-base font-semibold">Export links</h3>
                        <button type="button" onclick="create_export_modal.close()"
                            class="btn btn-square btn-ghost btn-sm" aria-label="Close">
                            <Icon name="lucide:x" class="h-4 w-4" />
                        </button>
                    </div>

                    <div class="flex grow flex-col overflow-hidden md:flex-row">
                        <!-- Sidebar / Config -->
                        <div
                            class="flex w-full shrink-0 flex-col gap-5 overflow-y-auto border-b border-base-300 bg-base-200/50 p-5 md:w-72 md:border-b-0 md:border-r">
                            <!-- Type Selection -->
                            <div class="flex flex-col gap-1.5">
                                <span class="text-sm font-medium">Format</span>
                                <div class="join join-vertical w-full">
                                    <input type="radio" name="exportType" class="btn btn-sm join-item justify-start"
                                        :class="{ 'btn-active': exportActiveTab === 0 }" aria-label="Plain links"
                                        @click="exportActiveTab = 0" />
                                    <input type="radio" name="exportType" class="btn btn-sm join-item justify-start"
                                        :class="{ 'btn-active': exportActiveTab === 1 }" aria-label="Embed code (iframe)"
                                        @click="exportActiveTab = 1" />
                                    <input type="radio" name="exportType" class="btn btn-sm join-item justify-start"
                                        :class="{ 'btn-active': exportActiveTab === 2 }" aria-label="JSON data"
                                        @click="exportActiveTab = 2" />
                                </div>
                            </div>

                            <!-- Separator Settings (Tab 0) -->
                            <div v-if="exportActiveTab === 0" class="flex flex-col gap-4">
                                <label class="flex flex-col gap-1.5">
                                    <span class="text-sm font-medium">Separator</span>
                                    <select class="select select-sm w-full" v-model="exportSeparatorMode">
                                        <option value="\n">New line</option>
                                        <option value="\n\n">Double new line</option>
                                        <option value=", ">Comma</option>
                                        <option value=" | ">Pipe</option>
                                        <option value="custom">Custom…</option>
                                    </select>
                                    <input v-if="exportSeparatorMode === 'custom'" v-model="exportSeparatorCustom"
                                        type="text" class="input input-sm" placeholder="e.g. ; " />
                                </label>
                                <label class="flex cursor-pointer items-center gap-3">
                                    <input type="checkbox" class="toggle toggle-primary toggle-xs"
                                        :checked="exportShowFilename"
                                        @change="e => exportShowFilename = (e.target as HTMLInputElement).checked" />
                                    <span class="text-sm">Include filenames</span>
                                </label>
                            </div>

                            <!-- Iframe Settings (Tab 1) -->
                            <div v-if="exportActiveTab === 1" class="flex flex-col gap-4">
                                <div class="grid grid-cols-2 gap-2">
                                    <label class="flex flex-col gap-1.5">
                                        <span class="text-sm text-base-content/70">Width</span>
                                        <input type="number" v-model="exportIframeWidth" class="input input-sm w-full" />
                                    </label>
                                    <label class="flex flex-col gap-1.5">
                                        <span class="text-sm text-base-content/70">Height</span>
                                        <input type="number" v-model="exportIframeHeight" class="input input-sm w-full" />
                                    </label>
                                </div>
                                <label class="flex cursor-pointer items-center gap-3">
                                    <input type="checkbox" class="checkbox checkbox-primary checkbox-xs"
                                        v-model="exportIframeAutoplay" />
                                    <span class="text-sm">Autoplay</span>
                                </label>
                                <label class="flex cursor-pointer items-center gap-3">
                                    <input type="checkbox" class="toggle toggle-primary toggle-xs"
                                        :checked="exportShowFilename"
                                        @change="e => exportShowFilename = (e.target as HTMLInputElement).checked" />
                                    <span class="text-sm">Include comments</span>
                                </label>
                            </div>

                            <!-- JSON Settings (Tab 2) -->
                            <div v-if="exportActiveTab === 2" class="flex flex-col gap-4">
                                <p class="text-sm text-base-content/70">
                                    Exports an array of objects with ID, UUID, name, and URL.
                                </p>
                            </div>
                        </div>

                        <!-- Preview Area -->
                        <div class="relative flex min-w-0 grow flex-col bg-base-100">
                            <div class="absolute top-4 right-4 z-(--z-dropdown)">
                                <button type="submit" class="btn btn-primary btn-sm gap-2">
                                    <Icon name="lucide:copy" class="h-4 w-4" /> Copy output
                                </button>
                            </div>
                            <textarea
                                id="export_file_list"
                                class="textarea textarea-ghost h-full w-full resize-none bg-base-100 p-6 font-mono text-xs leading-relaxed text-base-content focus:outline-none"
                                readonly
                                :value="getExportContent()"
                            ></textarea>
                        </div>
                    </div>
                </form>
                <form method="dialog" class="modal-backdrop"><button>close</button></form>
            </dialog>
        </Teleport>
    </div>
</template>

<script lang="ts" setup>
const props = defineProps<{ 
    userId?: number;
}>();

const readOnlyMode = computed(() => !!props.userId);

const { data: accountData } = useAccountData()
const canManage = computed(() => !readOnlyMode.value || accountData.value?.Admin);

const lastActiveUsername = useState<null | string>("lastActiveUsername", () => null);
const activeFolderID = useState("activeFolderID", () => 0);
const isLoading = ref(false);
const err = ref("");
const globalCheckboxChecked = ref(false);
const showFileInfo = ref(false);
const fileInfo = ref<FileInfoItem | null>(null);
const fileInfoCacheKey = ref(Date.now());
const isDesktopFileInfoLayout = ref(true);
const paginationIndex = ref(0);
const paginationMaxSize = ref(25);
const exportOptions = ['Separator', 'Iframe', 'Json'];
let fileInfoMediaQuery: MediaQueryList | null = null;
let preserveFileInfoOnDialogClose = false;

// Search Logic
let searchTimeout: NodeJS.Timeout;
const searchQuery = ref("");
const searchResults = ref<Array<FileListItem>>([]);

watch(searchQuery, (newVal) => {
    clearTimeout(searchTimeout);
    paginationIndex.value = 0;
    if (!newVal || newVal.trim().length === 0) {
        searchResults.value = [];
        return;
    }
    isLoading.value = true;
    searchTimeout = setTimeout(() => {
        performSearch(newVal);
    }, 500);
});

const performSearch = async (query: string) => {
    try {
        const queryParams: any = { Query: query };
        if (props.userId) queryParams.UserID = props.userId;

        const data = await $fetch<Array<FileListItem>>(`${conf.public.apiUrl}/files/search`, {
            headers: { Authorization: `Bearer ${token.value}` },
            query: queryParams
        });
        if (data) {
            searchResults.value = data.map(e => ({ ...e, checked: false }));
        } else {
            searchResults.value = [];
        }
    } catch (e) {
        searchResults.value = [];
        err.value = "Search failed";
    } finally {
        isLoading.value = false;
    }
}

const serverConfig = useServerConfig();
const conf = useRuntimeConfig();
const token = useToken();
const folderPathHistory = useState<Array<{ name: string; folderId: number }>>("folderPathHistory", () => ([]));

const getFileInfoModal = () => {
    if (!import.meta.client) return null;
    return document.getElementById("file_info_modal") as HTMLDialogElement | null;
};

const closeFileInfoDialog = (preserveFileInfo = false) => {
    const modal = getFileInfoModal();
    if (!modal?.open) {
        if (!preserveFileInfo) preserveFileInfoOnDialogClose = false;
        return;
    }

    preserveFileInfoOnDialogClose = preserveFileInfo;
    modal.close();
    if (preserveFileInfo) {
        window.setTimeout(() => {
            preserveFileInfoOnDialogClose = false;
        }, 0);
    }
};

const syncFileInfoLayout = () => {
    if (!import.meta.client || !fileInfoMediaQuery) return;

    isDesktopFileInfoLayout.value = fileInfoMediaQuery.matches;
    const modal = getFileInfoModal();
    if (!modal) return;

    if (!showFileInfo.value) {
        closeFileInfoDialog();
        return;
    }

    if (isDesktopFileInfoLayout.value) {
        closeFileInfoDialog(true);
    } else if (!modal.open) {
        try {
            modal.showModal();
        } catch {
            // Another modal can be active briefly; the next close/layout sync will retry.
        }
    }
};

const closeFileInfo = () => {
    showFileInfo.value = false;
    closeFileInfoDialog();
};

const handleFileInfoDialogClose = () => {
    if (preserveFileInfoOnDialogClose) return;
    showFileInfo.value = false;
};

// Display sorting (client-side; the API returns name ASC)
type SortKey = 'name' | 'duration' | 'size' | 'date';
const sortKey = ref<SortKey>('name');
const sortDir = ref<1 | -1>(1);

const toggleSort = (key: SortKey) => {
    if (sortKey.value === key) {
        sortDir.value = sortDir.value === 1 ? -1 : 1;
    } else {
        sortKey.value = key;
        sortDir.value = 1;
    }
    paginationIndex.value = 0;
};

const sortIcon = (key: SortKey) => {
    if (sortKey.value !== key) return 'lucide:chevrons-up-down';
    return sortDir.value === 1 ? 'lucide:chevron-up' : 'lucide:chevron-down';
};

const sortedFiles = (files: FileListItem[]) =>
    [...files].sort((a, b) => {
        let r = 0;
        switch (sortKey.value) {
            case 'duration': r = (a.Duration ?? 0) - (b.Duration ?? 0); break;
            case 'size': r = (a.Size ?? 0) - (b.Size ?? 0); break;
            case 'date': r = new Date(a.CreatedAt).getTime() - new Date(b.CreatedAt).getTime(); break;
            default: r = a.Name.localeCompare(b.Name);
        }
        return r * sortDir.value;
    });

const sortedFolders = (folders: FolderListItem[]) =>
    sortKey.value === 'name' && sortDir.value === -1
        ? [...folders].reverse()
        : folders;

const listPaginationItems = () => {
    const currentFiles = sortedFiles(searchQuery.value ? searchResults.value : fileList.value);
    const currentFolders = sortedFolders(searchQuery.value ? [] : folderList.value);

    let returnValues: Array<{ isFolder: boolean; index: number }> = [];
    returnValues.push(
        ...currentFolders.map((e, i) => ({
            isFolder: true,
            index: i,
        }))
    );
    returnValues.push(
        ...currentFiles.map((e, i) => ({
            isFolder: false,
            index: i,
        }))
    );
    returnValues = returnValues.slice(
        paginationIndex.value * paginationMaxSize.value,
        (paginationIndex.value + 1) * paginationMaxSize.value
    );

    let returnFolders = currentFolders.filter((e, i) =>
        returnValues.find((re) => re.isFolder === true && re.index === i)
    );
    let returnFiles = currentFiles.filter((e, i) =>
        returnValues.find((re) => re.isFolder === false && re.index === i)
    );
    return {
        folders: returnFolders,
        files: returnFiles,
    };
};

const paginationMenusAmount = () => {
    const currentFiles = searchQuery.value ? searchResults.value : fileList.value;
    const currentFolders = searchQuery.value ? [] : folderList.value;
    return Math.ceil(
        (currentFolders.length + currentFiles.length) /
        paginationMaxSize.value
    );
};

const selectedCount = () => {
    const currentFiles = searchQuery.value ? searchResults.value : fileList.value;
    const currentFolders = searchQuery.value ? [] : folderList.value;
    return (
        currentFiles.filter((e) => e.checked === true).length +
        currentFolders.filter((e) => e.checked === true).length
    );
};
const selectedFilesCount = () => {
    const currentFiles = searchQuery.value ? searchResults.value : fileList.value;
    return currentFiles.filter((e) => e.checked === true).length;
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
    try {
        const queryParams: any = { ParentFolderID: folderId };
        if (props.userId) queryParams.UserID = props.userId;

        const data = await $fetch<Array<FolderListItem>>(
            `${conf.public.apiUrl}/folders`,
            {
                query: queryParams,
                headers: {
                    Authorization: `Bearer ${token.value}`,
                },
                retry: 5,
            }
        );
        err.value = "";
        return data;
    } catch (error: any) {
        err.value = `${error.data ? error.data : error.message}`;
        return null;
    }
};

interface FileListItem {
    ID: number;
    CreatedAt: string;
    UpdatedAt: string;
    Name: string;
    UUID: string;
    ParentFolderID: number;
    Size?: number;
    Duration?: number;
    Thumbnail?: string;
    Processing?: boolean;
    Available?: boolean;
    checked?: boolean;
}
const fileList = useState<Array<FileListItem>>("fileList", () => ([]));
const listFiles = async (folderId: number) => {
    try {
        const queryParams: any = { ParentFolderID: folderId };
        if (props.userId) queryParams.UserID = props.userId;

        const data = await $fetch<Array<FileListItem>>(
            `${conf.public.apiUrl}/files`,
            {
                query: queryParams,
                headers: {
                    Authorization: `Bearer ${token.value}`,
                },
                retry: 5,
            }
        );
        err.value = "";
        return data;
    } catch (error: any) {
        err.value = `${error.data ? error.data : error.message}`;
        return null;
    }
};
const openFolder = async (
    folderId: number,
    folderName: string,
    jumpToIndex = -1
) => {
    isLoading.value = true;
    closeFileInfo();
    globalCheckboxChecked.value = false;

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

const openFileInfo = async (fileId: number) => {
    showFileInfo.value = true;
    syncFileInfoLayout();
    isLoading.value = true;
    try {
        const queryParams: any = { LinkID: fileId };
        
        const data = await $fetch<FileInfoItem>(
            `${conf.public.apiUrl}/file`,
            {
                headers: {
                    Authorization: `Bearer ${token.value}`,
                },
                query: queryParams,
                retry: 5,
            }
        );
        fileInfo.value = data;
        fileInfoCacheKey.value = Date.now();
    } catch (error: any) {
        err.value = `${error.data ? error.data : error.message}`;
    } finally {
        isLoading.value = false;
        syncFileInfoLayout();
    }
};

const trackFileInfo = setInterval(async () => {
    await reloadFileInfo()
}, 2000);

// While any visible file is still encoding, quietly refresh the current
// folder so the processing badges resolve without user interaction.
// Selection state is preserved across refreshes.
const trackProcessing = setInterval(async () => {
    if (searchQuery.value) return;
    if (!fileList.value.some((f) => f.Processing)) return;
    const newFiles = await listFiles(activeFolderID.value);
    if (!newFiles) return;
    const checkedByID = new Map(fileList.value.map((f) => [f.ID, f.checked]));
    fileList.value = newFiles.map((f) => ({
        ...f,
        checked: checkedByID.get(f.ID) ?? false,
    }));
}, 5000);

const reloadFileInfo = async () => {
    const fileId = findFileInContext(fileInfo.value?.UUID!)?.ID;
    if (fileId && showFileInfo.value) {
        try {
            const data = await $fetch<FileInfoItem>(
                `${conf.public.apiUrl}/file`,
                {
                    headers: {
                        Authorization: `Bearer ${token.value}`,
                    },
                    query: {
                        LinkID: fileId,
                    },
                    retry: 5,
                }
            );
            if (fileInfo.value?.UUID === data?.UUID) {
                const previousThumbnail = fileInfo.value?.Thumbnail;
                fileInfo.value = data;
                if (data.Thumbnail !== previousThumbnail) {
                    fileInfoCacheKey.value = Date.now();
                }
            }
        } catch (error) {
            // Silent error
        }
    }
}

const openCreateFolder = () => {
    if (!canManage.value) return;
    (
        document.getElementById("create_folder_modal") as HTMLDialogElement
    ).showModal();
};
const openCreateTag = () => {
    if (!canManage.value) return;
    (
        document.getElementById("create_tag_modal") as HTMLDialogElement
    ).showModal();
};
const openCreateTagFromInfo = () => {
    closeFileInfoDialog(true);
    openCreateTag();
};


const openRenameFile = (linkId: number, fileName: string) => {
    if (!canManage.value) return;
    renameFileLinkId.value = linkId;
    renameFileName.value = fileName;
    (
        document.getElementById("rename_file_modal") as HTMLDialogElement
    ).showModal();
};
const openRenameFileFromInfo = (file: FileListItem) => {
    closeFileInfoDialog(true);
    openRenameFile(file.ID, file.Name);
};
const openRenameFolder = (folderId: number, folderName: string) => {
    if (!canManage.value) return;
    renameFolderLinkId.value = folderId;
    renameFolderName.value = folderName;
    (
        document.getElementById("rename_folder_modal") as HTMLDialogElement
    ).showModal();
};

const openMoveFile = (linkId: number, fileName: string) => {
    if (!canManage.value) return;
    moveFileLinkId.value = linkId;
    moveFileName.value = fileName;
    (
        document.getElementById("move_file_modal") as HTMLDialogElement
    ).showModal();
};

const renameFolderLinkId = ref(0)
const renameFolderName = ref("")
const renameFolder = async () => {
    isLoading.value = true;
    try {
        const payload: any = {
            FolderID: renameFolderLinkId.value,
            Name: renameFolderName.value
        };
        if (props.userId) payload.UserID = props.userId;

        await $fetch(`${conf.public.apiUrl}/folder`, {
            method: "put",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: payload,
        });
        err.value = "";
        renameFolderLinkId.value = 0;
        renameFolderName.value = "";
        reloadActiveFolder();
        (
            document.getElementById("rename_folder_modal") as HTMLDialogElement
        ).close();
    } catch (error: any) {
        err.value = `${error.data ? error.data : error.message}`;
    }
    isLoading.value = false;
};

const renameFileLinkId = ref(0)
const renameFileName = ref("")
const renameFile = async () => {
    isLoading.value = true;
    try {
        const payload: any = {
            LinkID: renameFileLinkId.value,
            Name: renameFileName.value
        };
        if (props.userId) payload.UserID = props.userId;

        await $fetch(`${conf.public.apiUrl}/file`, {
            method: "put",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: payload,
        });
        err.value = "";
        renameFileLinkId.value = 0;
        renameFileName.value = "";
        reloadActiveFolder();
        (
            document.getElementById("rename_file_modal") as HTMLDialogElement
        ).close();
    } catch (error: any) {
        err.value = `${error.data ? error.data : error.message}`;
    }
    isLoading.value = false;
};

const uploadThumbnail = async (thumbnail: File) => {
    if (!canManage.value || !fileInfo.value) return;

    isLoading.value = true;
    const formData = new FormData();
    formData.append("LinkID", `${fileInfo.value.ID}`);
    formData.append("thumbnail", thumbnail);
    try {
        await $fetch(`${conf.public.apiUrl}/file/thumbnail`, {
            method: "put",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: formData,
        });
        await reloadFileInfo();
        fileInfoCacheKey.value = Date.now();
        inlineAlert("Poster updated");
    } catch (error: any) {
        err.value = `${error.data ? error.data : error.message}`;
    } finally {
        isLoading.value = false;
    }
};

const resetThumbnail = async () => {
    if (!canManage.value || !fileInfo.value) return;

    isLoading.value = true;
    try {
        await $fetch(`${conf.public.apiUrl}/file/thumbnail`, {
            method: "delete",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            query: {
                LinkID: fileInfo.value.ID,
            },
        });
        await reloadFileInfo();
        fileInfoCacheKey.value = Date.now();
        inlineAlert("Poster reset");
    } catch (error: any) {
        err.value = `${error.data ? error.data : error.message}`;
    } finally {
        isLoading.value = false;
    }
};

const moveFileLinkId = ref(0)
const moveFileName = ref("")
const moveFileFolderId = ref(0)
const moveFile = async () => {
    isLoading.value = true;
    try {
        const payload: any = {
            ParentFolderID: moveFileFolderId.value,
            LinkIDs: [moveFileLinkId.value]
        };
        if (props.userId) payload.UserID = props.userId;

        await $fetch(`${conf.public.apiUrl}/move`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token.value}` },
            body: payload
        });
        err.value = "";
        moveFileLinkId.value = 0;
        moveFileName.value = "";
        moveFileFolderId.value = 0;
        reloadActiveFolder();
        (
            document.getElementById("move_file_modal") as HTMLDialogElement
        ).close();
    } catch (error: any) {
        err.value = `${error.data ? error.data : error.message}`;
    }
    isLoading.value = false;
};

const moveItemsFileList = ref<FileListItem[]>([]);
const moveItemsFolderList = ref<FolderListItem[]>([]);
const moveItemsTargetFolderId = ref(0);
const moveItemsShowPicker = ref(false);

const openMoveItems = async () => {
    if (!canManage.value) return;
    moveItemsShowPicker.value = false;
    await nextTick();
    moveItemsFileList.value = currentFileList.value.filter(e => e.checked);
    moveItemsFolderList.value = currentFolderList.value.filter(e => e.checked);
    if (moveItemsFileList.value.length === 0 && moveItemsFolderList.value.length === 0) return;
    
    moveItemsTargetFolderId.value = 0; 
    moveItemsShowPicker.value = true;
    (document.getElementById("move_items_modal") as HTMLDialogElement).showModal();
}

const moveItems = async () => {
    isLoading.value = true;
    try {
        const payload: any = {
            ParentFolderID: moveItemsTargetFolderId.value,
            FolderIDs: moveItemsFolderList.value.map(e => e.ID),
            LinkIDs: moveItemsFileList.value.map(e => e.ID)
        };
        if (props.userId) payload.UserID = props.userId;

        await $fetch(`${conf.public.apiUrl}/move`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token.value}` },
            body: payload
        });
        reloadActiveFolder();
        (document.getElementById("move_items_modal") as HTMLDialogElement).close();
        moveItemsShowPicker.value = false;
        inlineAlert("Items moved successfully");
    } catch (error: any) {
        err.value = error.data || error.message;
    } finally {
        isLoading.value = false;
    }
}

// Drag & Drop
const handleDragStart = (event: DragEvent, type: 'file' | 'folder', item: any) => {
    if (!canManage.value) return;
    let filesToMove: number[] = [];
    let foldersToMove: number[] = [];
    
    if (item.checked) {
        filesToMove = currentFileList.value.filter(f => f.checked).map(f => f.ID);
        foldersToMove = currentFolderList.value.filter(f => f.checked).map(f => f.ID);
    } else {
        if (type === 'file') filesToMove = [item.ID];
        else foldersToMove = [item.ID];
    }
    
    event.dataTransfer?.setData('application/json', JSON.stringify({
        LinkIDs: filesToMove,
        FolderIDs: foldersToMove
    }));
    event.dataTransfer!.effectAllowed = 'move';
}

const dragTargetId = ref<number | null>(null);
const handleDragOver = (event: DragEvent, folderId: number) => {
    if (!canManage.value) return;
    event.preventDefault();
    dragTargetId.value = folderId;
}

const handleDrop = async (event: DragEvent, targetFolderId: number) => {
    if (!canManage.value) return;
    event.preventDefault();
    dragTargetId.value = null;
    const data = event.dataTransfer?.getData('application/json');
    if (!data) return;
    
    const { LinkIDs, FolderIDs } = JSON.parse(data);
    
    if (FolderIDs.includes(targetFolderId)) {
        err.value = "Cannot move a folder into itself";
        return;
    }

    isLoading.value = true;
    try {
        const payload: any = {
            ParentFolderID: targetFolderId,
            FolderIDs,
            LinkIDs
        };
        if (props.userId) payload.UserID = props.userId;

        await $fetch(`${conf.public.apiUrl}/move`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token.value}` },
            body: payload
        });
        reloadActiveFolder();
        inlineAlert("Items moved successfully");
    } catch (error: any) {
        err.value = error.data || error.message;
    } finally {
        isLoading.value = false;
    }
}

const openUpload = () => {
    if (!canManage.value) return;
    navigateTo("/my/upload");
};
const createFolderValue = ref("");
const createFolder = async () => {
    isLoading.value = true;
    const formData = new FormData();
    formData.append("name", createFolderValue.value);
    formData.append("ParentFolderID", `${activeFolderID.value}`);
    try {
        const data = await $fetch<{ 
            ID: string;
            Name: string;
        }>(`${conf.public.apiUrl}/folder`, {
            method: "post",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: formData,
        });
        err.value = "";
        createFolderValue.value = "";
        reloadActiveFolder();
        (
            document.getElementById("create_folder_modal") as HTMLDialogElement
        ).close();
    } catch (error: any) {
        err.value = `${error.data ? error.data : error.message}`;
    }
    isLoading.value = false;
};

const createTagValue = ref("");
const createTag = async () => {
    isLoading.value = true;
    const formData = new FormData();
    formData.append("Name", createTagValue.value);
    formData.append("LinkId", `${fileInfo.value?.ID}`);
    try {
        const data = await $fetch<{ 
            ID: string;
            Name: string;
        }>(`${conf.public.apiUrl}/file/tag`, {
            method: "post",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: formData,
        });
        err.value = "";
        createTagValue.value = "";
        reloadFileInfo();
        (
            document.getElementById("create_tag_modal") as HTMLDialogElement
        ).close();
    } catch (error: any) {
        err.value = `${error.data ? error.data : error.message}`;
    }
    isLoading.value = false;
};

const deleteTag = async (LinkId: number, TagId: number) => {
    isLoading.value = true;
    const formData = new FormData();
    formData.append("TagId", `${TagId}`);
    formData.append("LinkId", `${LinkId}`);
    try {
        const data = await $fetch<{ 
            ID: string;
            Name: string;
        }>(`${conf.public.apiUrl}/file/tag`, {
            method: "delete",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: formData,
        });
        err.value = "";
        reloadFileInfo();
    } catch (error: any) {
        err.value = `${error.data ? error.data : error.message}`;
    }
    isLoading.value = false;
};

const reloadActiveFolder = () => {
    if (searchQuery.value) {
        performSearch(searchQuery.value);
        globalCheckboxChecked.value = false;
        return;
    }
    openFolder(
        activeFolderID.value,
        folderPathHistory.value[folderPathHistory.value.length - 1]!.name,
        folderPathHistory.value.length - 1
    );
    globalCheckboxChecked.value = false;
};
const exportFileList = ref<Array<FileListItem>>([]);
const exportShowFilename = ref(false);
const exportActiveTab = ref(0);

// Export Config
const exportSeparatorMode = ref('\n');
const exportSeparatorCustom = ref('');
const exportIframeWidth = ref(560);
const exportIframeHeight = ref(315);
const exportIframeAutoplay = ref(false);
const exportIframeControls = ref(true);

// we fall back to window.location.origin if the baseUrl is not set or is not a valid URL
// this makes sense as the Dockerfile contains backend and frontend combined (and this way on the same origin)
const baseUrl = conf.public.baseUrl && conf.public.baseUrl.includes('http') ? conf.public.baseUrl : window.location.origin

const exportSeparatorFinal = computed(() => {
    if (exportSeparatorMode.value === 'custom') return exportSeparatorCustom.value.replace(/\\n/g, '\n');
    return exportSeparatorMode.value.replace(/\\n/g, '\n');
});

const getExportContent = () => {
    if (exportActiveTab.value === 2) {
        return JSON.stringify(exportFileList.value.map((e) => ({
            id: `${e.ID}`,
            uuid: `${e.UUID}`,
            name: `${e.Name}`,
            url: `${baseUrl}/v/${e.UUID}`,
        })), null, 2);
    }
    
    return exportFileList.value.map((e) => {
        if (exportActiveTab.value === 1) {
            let src = `${baseUrl}/v/${e.UUID}`;
            const allow = [
                "accelerometer", 
                exportIframeAutoplay.value ? "autoplay" : "", 
                "clipboard-write", 
                "encrypted-media", 
                "gyroscope", 
                "picture-in-picture", 
                "web-share"
            ].filter(Boolean).join("; ");

            return `${exportShowFilename.value ? "<!-- " + e.Name + " -->\n" : ""}<iframe width="${exportIframeWidth.value}" height="${exportIframeHeight.value}" src="${src}" title="Watch ${e.Name} on ${serverConfig.value.AppName}" frameborder="0" allow="${allow}" allowfullscreen></iframe>`;
        }
        return `${exportShowFilename.value ? "## " + e.Name + "\n" : ""}${baseUrl}/v/${e.UUID}`;
    }).join(exportSeparatorFinal.value);
}

const openExport = (files: Array<FileListItem>) => {
    const availableFiles = files.filter((file) => file.Available !== false);
    if (availableFiles.length !== files.length) {
        const unavailableCount = files.length - availableFiles.length;
        err.value = `${unavailableCount} selected ${unavailableCount === 1 ? 'file is' : 'files are'} unavailable. Deselect ${unavailableCount === 1 ? 'it' : 'them'} or reconnect the storage before exporting.`;
        return;
    }
    exportFileList.value = availableFiles;
    (
        document.getElementById("create_export_modal") as HTMLDialogElement
    ).showModal();
};
const openExportFileFromInfo = (file: FileListItem) => {
    closeFileInfoDialog(true);
    openExport([file]);
};
const copyExport = () => {
    navigator.clipboard.writeText(getExportContent()).then(
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
    if (!canManage.value) return;
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

    const body: any = {
        LinkIDs: linkIDs,
    };
    if (props.userId) body.UserID = props.userId;

    try {
        const data = await $fetch<string>(
            `${conf.public.apiUrl}/files`,
            {
                method: "delete",
                headers: {
                    Authorization: `Bearer ${token.value}`,
                    "Content-Type": `application/json`,
                },
                body: JSON.stringify(body),
            }
        );
        deleteIsLoading.value--;
        return data;
    } catch (error: any) {
        deleteIsLoading.value--;
        err.value = `${error.data ? error.data : error.message}`;
        return null;
    }
};

const deleteFolders = async (folders: Array<FolderListItem>) => {
    deleteIsLoading.value++;
    const folderIDs: Array<{ FolderID: number }> = folders.map((e) => ({
        FolderID: e.ID,
    }));

    const body: any = {
        FolderIDs: folderIDs,
    };
    if (props.userId) body.UserID = props.userId;

    try {
        const data = await $fetch<string>(
            `${conf.public.apiUrl}/folders`,
            {
                method: "delete",
                headers: {
                    Authorization: `Bearer ${token.value}`,
                    "Content-Type": `application/json`,
                },
                body: JSON.stringify(body),
            }
        );
        deleteIsLoading.value--;
        return data;
    } catch (error: any) {
        deleteIsLoading.value--;
        err.value = `${error.data ? error.data : error.message}`;
        return null;
    }
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
    if (import.meta.client) {
        fileInfoMediaQuery = window.matchMedia("(min-width: 1024px)");
        isDesktopFileInfoLayout.value = fileInfoMediaQuery.matches;
        fileInfoMediaQuery.addEventListener("change", syncFileInfoLayout);
        syncFileInfoLayout();
    }
    await resetVideoManager();
})

onBeforeUnmount(() => {
    fileInfoMediaQuery?.removeEventListener("change", syncFileInfoLayout);
    closeFileInfoDialog();
    clearInterval(trackFileInfo);
    clearInterval(trackProcessing);
});

watch(() => props.userId, async () => {
    if (props.userId) {
        await resetVideoManager();
    }
});

watch(accountData, async (newValue, oldValue) => {
    if (newValue &&
        accountData.value &&
        lastActiveUsername.value !== accountData.value.Username && !props.userId) {
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
const currentFileList = computed(() => searchQuery.value ? searchResults.value : fileList.value);
const currentFolderList = computed(() => searchQuery.value ? [] : folderList.value);

const findFileInContext = (
    uuid: string
) => {
    return fileList.value.find(e => e.UUID === uuid) || searchResults.value.find(e => e.UUID === uuid);
}

const checkAllCallback = () => {
    currentFolderList.value.forEach((e) => (e.checked = globalCheckboxChecked.value));
    currentFileList.value.forEach((e) => (e.checked = globalCheckboxChecked.value));
};
onBeforeRouteLeave(async (to, from) => {
    clearInterval(trackFileInfo);
    clearInterval(trackProcessing);
    closeFileInfoDialog();

    (
        document.getElementById("create_folder_modal") as HTMLDialogElement
    ).close();
    (
        document.getElementById("create_export_modal") as HTMLDialogElement
    ).close();
    await new Promise((res) => setTimeout(res, 100));
});
</script>

<style scoped>
.video-manager-list {
    container-type: inline-size;
}

.video-manager-controls {
    width: 100%;
}

.video-manager-search {
    min-width: 0;
    flex: 1 1 0%;
}

.video-manager-secondary-column {
    display: none;
}

@container (min-width: 44rem) {
    .video-manager-toolbar {
        flex-direction: row;
        align-items: center;
    }

    .video-manager-controls {
        width: auto;
        flex: none;
    }

    .video-manager-search {
        width: 12rem;
        flex: none;
    }

    .video-manager-secondary-column {
        display: table-cell;
    }
}

/* Force last rows to open upwards ONLY if there is enough space above (4th row or later) */
:deep(tr:nth-last-child(-n+3):nth-child(n+4) .dropdown .dropdown-content) {
    bottom: 100%;
    top: auto;
    margin-bottom: 0.5rem; 
}
</style>
