<template>
    <div class="flex flex-col grow gap-6">
        <!-- Toasts -->
        <div class="toast toast-top toast-end z-50">
            <div class="alert alert-error shadow-lg" v-if="err">
                <Icon name="lucide:alert-circle" class="stroke-current shrink-0 h-6 w-6" />
                <div>{{ err }}</div>
                <button @click="err = ''" class="btn btn-sm btn-circle btn-ghost">✕</button>
            </div>
            <div v-for="alertMessage in alertList" class="alert alert-success shadow-lg">
                <Icon name="lucide:check-circle" class="stroke-current shrink-0 h-6 w-6" />
                <div>{{ alertMessage }}</div>
            </div>
        </div>

        <!-- Page Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div class="flex flex-col gap-1">
                <h1 class="text-2xl font-bold">My Videos</h1>
                <p class="text-sm opacity-70">Manage your video library and folders.</p>
            </div>
            <div class="flex gap-2">
                <button @click="openCreateFolder" :disabled="isLoading" class="btn btn-neutral shadow-sm">
                    <Icon name="lucide:folder-plus" class="w-4 h-4" />
                    <span class="hidden sm:inline">New Folder</span>
                </button>
                <button @click="openUpload" :disabled="isLoading" class="btn btn-primary shadow-lg">
                    <Icon name="lucide:upload" class="w-4 h-4" />
                    <span>Upload</span>
                </button>
            </div>
        </div>

        <!-- Toolbar & Breadcrumbs -->
        <div class="card bg-base-100 shadow-sm border border-base-200">
            <div class="card-body p-3 sm:p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <!-- Left: Breadcrumbs & Selection -->
                <div class="flex items-center gap-4 w-full md:w-auto overflow-hidden">
                    <div class="tooltip" data-tip="Select All">
                        <input 
                            v-model="globalCheckboxChecked" 
                            @change="checkAllCallback" 
                            type="checkbox"
                            class="checkbox checkbox-sm" 
                        />
                    </div>
                    <div class="divider divider-horizontal mx-0"></div>
                    <div class="breadcrumbs text-sm grow overflow-hidden">
                        <ul>
                             <li v-for="(folder, index) in folderPathHistory" :key="folder.folderId">
                                <button 
                                    @click="openFolder(folder.folderId, folder.name, index)" 
                                    :disabled="isLoading"
                                    class="flex items-center gap-2 hover:text-primary transition-colors"
                                    :class="index === folderPathHistory.length - 1 ? 'font-bold text-base-content' : 'opacity-70'"
                                >
                                    <Icon :name="index === 0 ? 'lucide:home' : 'lucide:folder'" class="w-4 h-4" />
                                    <span class="max-w-[100px] sm:max-w-xs truncate">{{ folder.name }}</span>
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- Right: Actions -->
                <div class="flex items-center gap-2">
                    <div class="form-control">
                        <div class="relative">
                            <input 
                                v-model="searchQuery" 
                                type="text" 
                                placeholder="Search videos..." 
                                class="input input-sm input-bordered w-32 md:w-48 pr-8" 
                            />
                            <div v-if="searchQuery" @click="searchQuery = ''" class="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer opacity-50 hover:opacity-100">
                                <Icon name="lucide:x" class="w-3 h-3" />
                            </div>
                            <div v-else class="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none">
                                <Icon name="lucide:search" class="w-3 h-3" />
                            </div>
                        </div>
                    </div>

                    <div class="join shadow-sm">
                        <button class="btn btn-sm join-item" @click="reloadActiveFolder" :disabled="isLoading" title="Refresh">
                            <Icon name="lucide:rotate-cw" class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
                        </button>
                        <button 
                            class="btn btn-sm join-item"
                            :disabled="isLoading || selectedFilesCount() === 0"
                            @click="openExport(currentFileList.filter(e => e.checked))"
                            title="Export Selected"
                        >
                            Export
                            <div v-if="selectedFilesCount() > 0" class="badge badge-xs badge-neutral">{{ selectedFilesCount() }}</div>
                        </button>
                        <button 
                            class="btn btn-sm join-item btn-error text-error-content"
                            :disabled="isLoading || selectedCount() === 0"
                            @click="openDelete(currentFileList.filter(e => e.checked), currentFolderList.filter(e => e.checked))"
                            title="Delete Selected"
                        >
                            <Icon name="lucide:trash-2" class="w-4 h-4" />
                            <div v-if="selectedCount() > 0" class="badge badge-xs badge-white/20">{{ selectedCount() }}</div>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main Content Layout -->
        <div class="flex flex-col gap-6 lg:flex-row lg:gap-0 items-start">
            
            <!-- List Section -->
            <div class="flex-1 w-full flex flex-col gap-4 transition-all duration-300 ease-in-out">
                <div class="card bg-base-100 shadow-xl border border-base-200 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="table w-full">
                            <thead class="bg-base-200/50">
                                <tr>
                                    <th class="w-12"></th>
                                    <th>Name</th>
                                    <th class="w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- Search Empty State -->
                                <tr v-if="searchQuery && searchResults.length === 0 && !isLoading">
                                    <td colspan="3">
                                        <div class="flex flex-col items-center justify-center py-12 opacity-50">
                                            <Icon name="lucide:search-x" class="w-12 h-12 mb-2" />
                                            <p>No results found for "{{ searchQuery }}"</p>
                                        </div>
                                    </td>
                                </tr>

                                <!-- Empty State -->
                                <tr v-else-if="!searchQuery && listPaginationItems().folders.length === 0 && listPaginationItems().files.length === 0">
                                    <td colspan="3">
                                        <div class="flex flex-col items-center justify-center py-12 opacity-50">
                                            <Icon name="lucide:folder-open" class="w-12 h-12 mb-2" />
                                            <p>This folder is empty.</p>
                                        </div>
                                    </td>
                                </tr>

                                <!-- Folders -->
                                <tr v-for="folder in listPaginationItems().folders" :key="'folder-'+folder.ID" class="group hover:bg-base-200/50">
                                    <td>
                                        <input v-model="folder.checked" @change="globalCheckboxChecked = false" type="checkbox" class="checkbox checkbox-sm" />
                                    </td>
                                    <td class="w-full">
                                        <button 
                                            @click="openFolder(folder.ID, folder.Name)" 
                                            class="flex items-center gap-3 w-full text-left font-medium group-hover:text-primary transition-colors"
                                        >
                                            <Icon name="lucide:folder" class="w-5 h-5 text-yellow-500 fill-yellow-500/20" />
                                            <span class="truncate">{{ folder.Name }}</span>
                                        </button>
                                    </td>
                                    <td class="text-right">
                                        <div class="dropdown dropdown-end">
                                            <label tabindex="0" class="btn btn-ghost btn-sm btn-square opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Icon name="lucide:more-vertical" class="w-4 h-4" />
                                            </label>
                                            <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-200">
                                                <li><a @click="openRenameFolder(folder.ID, folder.Name)"><Icon name="lucide:edit-2" class="w-4 h-4" /> Rename</a></li>
                                                <li><a @click="openDelete([], [folder])" class="text-error hover:bg-error/10"><Icon name="lucide:trash-2" class="w-4 h-4" /> Delete</a></li>
                                            </ul>
                                        </div>
                                    </td>
                                </tr>

                                <!-- Files -->
                                <tr 
                                    v-for="file in listPaginationItems().files" 
                                    :key="'file-'+file.ID" 
                                    class="group hover:bg-base-200/50"
                                    :class="{'bg-primary/5': fileInfo?.ID === file.ID && showFileInfo}"
                                >
                                    <td>
                                        <input v-model="file.checked" @change="globalCheckboxChecked = false" type="checkbox" class="checkbox checkbox-sm" />
                                    </td>
                                    <td class="w-full">
                                        <button 
                                            @click="openFileInfo(file.ID)" 
                                            class="flex items-center gap-3 w-full text-left font-medium group-hover:text-primary transition-colors"
                                        >
                                            <Icon name="lucide:video" class="w-5 h-5 text-blue-500 fill-blue-500/20" />
                                            <span class="truncate">{{ file.Name }}</span>
                                            <span v-if="searchQuery" class="badge badge-ghost badge-xs font-mono opacity-50 ml-auto mr-2">
                                                <Icon name="lucide:folder" class="w-3 h-3 mr-1" />
                                                in folder
                                            </span>
                                        </button>
                                    </td>
                                    <td class="text-right">
                                        <div class="dropdown dropdown-end">
                                            <label tabindex="0" class="btn btn-ghost btn-sm btn-square opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Icon name="lucide:more-vertical" class="w-4 h-4" />
                                            </label>
                                            <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-200">
                                                <li><a @click="openFileInfo(file.ID)"><Icon name="lucide:info" class="w-4 h-4" /> Info</a></li>
                                                <li><a @click="openExport([file])"><Icon name="lucide:share" class="w-4 h-4" /> Export</a></li>
                                                <li><a @click="openMoveFile(file.ID, file.Name)"><Icon name="lucide:folder-input" class="w-4 h-4" /> Move</a></li>
                                                <li><a @click="openRenameFile(file.ID, file.Name)"><Icon name="lucide:edit-2" class="w-4 h-4" /> Rename</a></li>
                                                <div class="divider my-0"></div>
                                                <li><a @click="openDelete([file], [])" class="text-error hover:bg-error/10"><Icon name="lucide:trash-2" class="w-4 h-4" /> Delete</a></li>
                                            </ul>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Pagination -->
                    <div class="p-4 border-t border-base-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-base-100">
                        <div class="dropdown dropdown-top">
                            <label tabindex="0" class="btn btn-ghost btn-sm text-xs font-normal border border-base-200">
                                Show {{ paginationMaxSize }}
                                <Icon name="lucide:chevron-up" class="w-3 h-3 ml-1" />
                            </label>
                            <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32 border border-base-200">
                                <li v-for="max in [10, 25, 50, 100]" :key="max">
                                    <button @click="paginationMaxSize = max" :class="{ 'active': paginationMaxSize === max }">
                                        {{ max }} rows
                                    </button>
                                </li>
                            </ul>
                        </div>

                        <div class="join">
                            <button 
                                v-for="index in paginationMenusAmount()" 
                                :key="index"
                                @click="paginationIndex = index - 1" 
                                class="join-item btn btn-sm"
                                :class="paginationIndex === index - 1 ? 'btn-active' : ''"
                            >
                                {{ index }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- File Info Sidebar -->
            <div 
                class="flex-none transition-all duration-300 ease-in-out"
                :class="showFileInfo ? 'w-full lg:w-96 translate-x-0 opacity-100 block lg:ml-6' : 'w-0 translate-x-full opacity-0 hidden lg:block lg:w-0 lg:overflow-hidden lg:ml-0'"
            >
                <div class="card bg-base-100 shadow-xl border border-base-200 sticky top-4 w-full lg:w-96">
                    <div class="card-body p-0">
                        <!-- Sidebar Header -->
                        <div class="p-4 border-b border-base-200 flex items-start gap-3 bg-base-200/30">
                            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Icon name="lucide:file-video" class="w-5 h-5 text-primary" />
                            </div>
                            <div class="flex-1 overflow-hidden">
                                <h3 class="font-bold truncate" :title="fileInfo?.Name">{{ fileInfo?.Name }}</h3>
                                <p class="text-xs opacity-50 truncate font-mono">{{ fileInfo?.UUID }}</p>
                            </div>
                            <button @click="showFileInfo = false" class="btn btn-ghost btn-xs btn-square">
                                <Icon name="lucide:x" class="w-4 h-4" />
                            </button>
                        </div>

                        <!-- Preview & Actions -->
                        <div class="p-4 flex flex-col gap-4">
                            <div class="relative aspect-video rounded-lg overflow-hidden bg-base-300 group shadow-inner">
                                <img 
                                    v-if="fileInfo?.Thumbnail"
                                    :src="`${conf.public.baseUrl}${fileInfo?.Thumbnail}?cache=${new Date().getMinutes()}`" 
                                    class="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                                <div v-else class="w-full h-full flex items-center justify-center text-base-content/20">
                                    <Icon name="lucide:image-off" class="w-10 h-10" />
                                </div>
                                <a 
                                    v-if="fileInfo?.UUID"
                                    :href="`${conf.public.baseUrl}/v/${fileInfo?.UUID}`" 
                                    target="_blank"
                                    class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Icon name="lucide:play-circle" class="w-12 h-12 text-white drop-shadow-lg" />
                                </a>
                            </div>

                            <div class="grid grid-cols-2 gap-2">
                                <button v-if="fileInfo" @click="openFile(findFileInContext(fileInfo?.UUID!)!)" class="btn btn-primary btn-sm btn-block col-span-2">
                                    <Icon name="lucide:external-link" class="w-4 h-4" /> Open Player
                                </button>
                                <button v-if="fileInfo" @click="openExport([findFileInContext(fileInfo?.UUID!)!])" class="btn btn-neutral btn-sm">
                                    <Icon name="lucide:share" class="w-4 h-4" /> Export
                                </button>
                                <button v-if="fileInfo" @click="openRenameFile(fileInfo!.ID, fileInfo!.Name)" class="btn btn-neutral btn-sm">
                                    <Icon name="lucide:edit-2" class="w-4 h-4" /> Rename
                                </button>
                            </div>
                        </div>
                        
                        <!-- Metadata Details -->
                        <div class="overflow-y-auto max-h-[500px] border-t border-base-200">
                            <table class="table table-sm w-full">
                                <tbody>
                                    <tr>
                                        <td class="text-xs opacity-50 font-bold uppercase">Size</td>
                                        <td class="text-right font-mono">{{ fileInfo ? humanFileSize(fileInfo?.Size) : 0 }}</td>
                                    </tr>
                                    <tr>
                                        <td class="text-xs opacity-50 font-bold uppercase">Duration</td>
                                        <td class="text-right font-mono">{{ fileInfo ? dayjs.duration(fileInfo.Duration, "seconds").format("H[h] m[m] s[s]") : '-' }}</td>
                                    </tr>
                                    <tr>
                                        <td class="text-xs opacity-50 font-bold uppercase">Created</td>
                                        <td class="text-right">{{ fileInfo?.CreatedAt ? dayjs(fileInfo.CreatedAt).calendar() : '-' }}</td>
                                    </tr>
                                     <!-- Tags -->
                                     <tr>
                                         <td colspan="2" class="p-0">
                                             <div class="p-3 bg-base-200/30 flex flex-wrap gap-1">
                                                 <span class="text-xs opacity-50 font-bold uppercase w-full mb-1 block">Tags</span>
                                                 <span v-for="tag in fileInfo?.Tags" :key="tag.ID" class="badge badge-neutral badge-sm group pr-1">
                                                     {{ tag.Name }}
                                                     <button @click="deleteTag(fileInfo.ID, tag.ID)" class="ml-1 hover:text-error transition-colors">
                                                         <Icon name="lucide:x" class="w-3 h-3" />
                                                     </button>
                                                 </span>
                                                 <button @click="openCreateTag" class="badge badge-ghost badge-sm border-dashed gap-1 hover:bg-base-300">
                                                     <Icon name="lucide:plus" class="w-3 h-3" /> Add
                                                 </button>
                                             </div>
                                         </td>
                                     </tr>
                                     <!-- Qualities (Encodes) -->
                                     <tr v-if="fileInfo?.Qualitys?.length">
                                         <td colspan="2" class="p-0 border-t border-base-200">
                                             <div class="collapse collapse-arrow rounded-none">
                                                 <input type="checkbox" /> 
                                                 <div class="collapse-title text-xs font-bold opacity-50 uppercase min-h-0 py-3">
                                                     Encodings
                                                 </div>
                                                 <div class="collapse-content text-xs p-0 px-4 pb-2"> 
                                                     <div v-for="qualityType in [...new Set(fileInfo?.Qualitys.map(e => e.Type))]" class="mb-3 last:mb-0">
                                                         <div class="font-bold mb-1 opacity-70">{{ qualityType }}</div>
                                                         <div v-for="q in fileInfo?.Qualitys.filter(e => e.Type === qualityType)" class="flex items-center justify-between py-1 border-b border-base-200/50 last:border-0">
                                                             <span>{{ q.Name }}</span>
                                                             <div class="flex items-center gap-2">
                                                                 <span class="badge badge-xs">{{ q.Width }}x{{ q.Height }}</span>
                                                                 <span class="badge badge-xs badge-ghost">{{ humanFileSize(q.Size) }}</span>
                                                                 <div class="tooltip tooltip-left" :data-tip="q.Ready ? 'Ready' : 'Processing'">
                                                                     <Icon v-if="q.Ready" name="lucide:check-circle" class="w-3 h-3 text-success" />
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
                </div>
            </div>
        </div>

        <!-- MODALS -->
        <Teleport to="body">
            <!-- Create Folder -->
            <dialog id="create_folder_modal" class="modal">
                <form @submit.prevent="createFolder" class="modal-box w-full max-w-md">
                    <button type="button" onclick="create_folder_modal.close()" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                    <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
                        <Icon name="lucide:folder-plus" class="w-5 h-5" /> New Folder
                    </h3>
                    <div class="form-control w-full">
                        <label class="label"><span class="label-text">Folder Name</span></label>
                        <input v-model="createFolderValue" type="text" placeholder="e.g. Vacation 2024" class="input input-bordered w-full" autofocus />
                    </div>
                    <div class="modal-action">
                        <button type="submit" class="btn btn-primary" :disabled="!createFolderValue">Create Folder</button>
                    </div>
                </form>
                <form method="dialog" class="modal-backdrop"><button>close</button></form>
            </dialog>

            <!-- Add Tag -->
            <dialog id="create_tag_modal" class="modal">
                <form @submit.prevent="createTag" class="modal-box w-full max-w-md">
                    <button type="button" onclick="create_tag_modal.close()" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                    <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
                        <Icon name="lucide:tag" class="w-5 h-5" /> Add Tag
                    </h3>
                    <div class="form-control w-full">
                         <label class="label"><span class="label-text">Tag Name</span></label>
                        <input v-model="createTagValue" type="text" placeholder="e.g. Funny" class="input input-bordered w-full" autofocus />
                    </div>
                    <div class="modal-action">
                        <button type="submit" class="btn btn-primary" :disabled="!createTagValue">Add Tag</button>
                    </div>
                </form>
                <form method="dialog" class="modal-backdrop"><button>close</button></form>
            </dialog>

            <!-- Rename File -->
            <dialog id="rename_file_modal" class="modal">
                <form @submit.prevent="renameFile" class="modal-box w-full max-w-md">
                    <button type="button" onclick="rename_file_modal.close()" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                    <h3 class="font-bold text-lg mb-4">Rename File</h3>
                    <div class="form-control w-full">
                        <input v-model="renameFileName" type="text" class="input input-bordered w-full" autofocus />
                    </div>
                    <div class="modal-action">
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
                <form method="dialog" class="modal-backdrop"><button>close</button></form>
            </dialog>

            <!-- Rename Folder -->
            <dialog id="rename_folder_modal" class="modal">
                 <form @submit.prevent="renameFolder" class="modal-box w-full max-w-md">
                    <button type="button" onclick="rename_folder_modal.close()" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                    <h3 class="font-bold text-lg mb-4">Rename Folder</h3>
                    <div class="form-control w-full">
                        <input v-model="renameFolderName" type="text" class="input input-bordered w-full" autofocus />
                    </div>
                    <div class="modal-action">
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
                <form method="dialog" class="modal-backdrop"><button>close</button></form>
            </dialog>

            <!-- Move File -->
            <dialog id="move_file_modal" class="modal">
                <form @submit.prevent="moveFile" class="modal-box w-full max-w-lg">
                    <button type="button" onclick="move_file_modal.close()" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                    <h3 class="font-bold text-lg mb-4">Move File</h3>
                    <div class="p-4 bg-base-200 rounded-box max-h-60 overflow-y-auto">
                        <SelectFolder v-if="moveFileLinkId !== 0" v-on:update="folderId => moveFileFolderId = folderId" />
                    </div>
                    <div class="modal-action">
                        <button type="submit" class="btn btn-primary">Move Here</button>
                    </div>
                </form>
                <form method="dialog" class="modal-backdrop"><button>close</button></form>
            </dialog>

            <!-- Delete Confirmation -->
            <dialog id="delete_items_modal" class="modal">
                <form @submit.prevent="deleteItems" class="modal-box">
                    <button type="button" onclick="delete_items_modal.close()" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                    
                    <h3 class="font-bold text-lg mb-4 text-error flex items-center gap-2">
                        <Icon name="lucide:alert-triangle" class="w-6 h-6" />
                        Confirm Deletion
                    </h3>
                    
                    <div class="alert alert-warning shadow-sm mb-4">
                        <Icon name="lucide:info" class="w-5 h-5" />
                        <span class="text-xs">This action is permanent and cannot be undone.</span>
                    </div>

                    <p class="font-medium mb-2">You are about to delete:</p>
                    <div class="bg-base-200 rounded-box p-2 mb-6 max-h-48 overflow-y-auto">
                        <ul class="menu menu-xs p-0">
                            <li v-for="folder in deleteFolderList" :key="'del-folder-'+folder.ID">
                                <a class="pointer-events-none gap-2">
                                    <Icon name="lucide:folder" class="w-4 h-4 text-warning" />
                                    <span class="truncate">{{ folder.Name }}</span>
                                </a>
                            </li>
                            <li v-for="file in deleteFileList" :key="'del-file-'+file.ID">
                                <a class="pointer-events-none gap-2">
                                    <Icon name="lucide:file-video" class="w-4 h-4 text-primary" />
                                    <span class="truncate">{{ file.Name }}</span>
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div class="modal-action">
                        <button type="button" onclick="delete_items_modal.close()" class="btn">Cancel</button>
                        <button type="submit" class="btn btn-error" :disabled="deleteIsLoading > 0">
                            <span v-if="deleteIsLoading > 0" class="loading loading-spinner loading-xs"></span>
                            Delete {{ deleteFileList.length + deleteFolderList.length }} Item(s)
                        </button>
                    </div>
                </form>
                <form method="dialog" class="modal-backdrop"><button>close</button></form>
            </dialog>

             <!-- Export Modal -->
            <dialog id="create_export_modal" class="modal">
                <form @submit.prevent="copyExport" class="modal-box w-11/12 max-w-5xl p-0 overflow-hidden bg-base-100 h-[80vh] flex flex-col">
                    <!-- Header -->
                    <div class="p-4 border-b border-base-200 flex items-center justify-between bg-base-100 shrink-0">
                        <h3 class="font-bold text-lg flex items-center gap-2">
                            <Icon name="lucide:share-2" class="w-5 h-5 text-primary" />
                            Export Links
                        </h3>
                        <button type="button" onclick="create_export_modal.close()" class="btn btn-sm btn-circle btn-ghost">✕</button>
                    </div>

                    <div class="flex grow overflow-hidden">
                        <!-- Sidebar / Config -->
                        <div class="w-80 bg-base-200/30 border-r border-base-200 p-6 flex flex-col gap-6 overflow-y-auto shrink-0">
                            <!-- Type Selection -->
                            <div class="form-control">
                                <label class="label text-xs font-bold uppercase opacity-50 mb-1">Export Format</label>
                                <div class="join join-vertical w-full shadow-sm bg-base-100">
                                    <input type="radio" name="exportType" class="btn btn-sm join-item justify-start content-center" :class="{ 'btn-active btn-primary': exportActiveTab === 0 }" aria-label="Plain Links" @click="exportActiveTab = 0" />
                                    <input type="radio" name="exportType" class="btn btn-sm join-item justify-start content-center" :class="{ 'btn-active btn-primary': exportActiveTab === 1 }" aria-label="Embed Code (Iframe)" @click="exportActiveTab = 1" />
                                    <input type="radio" name="exportType" class="btn btn-sm join-item justify-start content-center" :class="{ 'btn-active btn-primary': exportActiveTab === 2 }" aria-label="JSON Data" @click="exportActiveTab = 2" />
                                </div>
                            </div>

                            <div class="divider my-0 opacity-50"></div>

                            <!-- Separator Settings (Tab 0) -->
                            <div v-if="exportActiveTab === 0" class="flex flex-col gap-4 animate-fade-in">
                                <div class="form-control">
                                    <label class="label text-xs font-bold uppercase opacity-50 mb-1">Separator</label>
                                    <select class="select select-bordered select-sm w-full" v-model="exportSeparatorMode">
                                        <option value="\n">New Line</option>
                                        <option value="\n\n">Double New Line</option>
                                        <option value=", ">Comma</option>
                                        <option value=" | ">Pipe</option>
                                        <option value="custom">Custom...</option>
                                    </select>
                                    <input v-if="exportSeparatorMode === 'custom'" v-model="exportSeparatorCustom" type="text" class="input input-sm input-bordered mt-2" placeholder="e.g. ; " />
                                </div>
                                <div class="form-control">
                                    <label class="label cursor-pointer justify-start gap-3">
                                        <input type="checkbox" class="toggle toggle-xs toggle-primary" :checked="exportShowFilename" @change="e => exportShowFilename = (e.target as HTMLInputElement).checked" />
                                        <span class="label-text font-medium">Include Filenames</span>
                                    </label>
                                </div>
                            </div>

                            <!-- Iframe Settings (Tab 1) -->
                            <div v-if="exportActiveTab === 1" class="flex flex-col gap-4 animate-fade-in">
                                <div class="grid grid-cols-2 gap-2">
                                    <div class="form-control">
                                        <label class="label text-xs opacity-70">Width</label>
                                        <input type="number" v-model="exportIframeWidth" class="input input-sm input-bordered w-full" />
                                    </div>
                                    <div class="form-control">
                                        <label class="label text-xs opacity-70">Height</label>
                                        <input type="number" v-model="exportIframeHeight" class="input input-sm input-bordered w-full" />
                                    </div>
                                </div>
                                <div class="form-control bg-base-100 p-2 rounded-lg border border-base-200">
                                    <label class="label cursor-pointer justify-start gap-3">
                                        <input type="checkbox" class="checkbox checkbox-xs checkbox-primary" v-model="exportIframeAutoplay" />
                                        <span class="label-text text-sm">Autoplay</span>
                                    </label>
                                </div>
                                <div class="form-control bg-base-100 p-2 rounded-lg border border-base-200">
                                    <label class="label cursor-pointer justify-start gap-3">
                                        <input type="checkbox" class="toggle toggle-xs toggle-primary" :checked="exportShowFilename" @change="e => exportShowFilename = (e.target as HTMLInputElement).checked" />
                                        <span class="label-text text-sm">Include Comments</span>
                                    </label>
                                </div>
                            </div>

                            <!-- JSON Settings (Tab 2) -->
                            <div v-if="exportActiveTab === 2" class="flex flex-col gap-4 animate-fade-in">
                                <div class="alert alert-info text-xs shadow-sm rounded-lg">
                                    <Icon name="lucide:info" class="w-4 h-4 shrink-0" />
                                    <span>Exports array of objects with metadata.</span>
                                </div>
                            </div>
                        </div>

                        <!-- Preview Area -->
                        <div class="grow flex flex-col min-w-0 bg-base-100 relative">
                            <div class="absolute top-4 right-4 z-10">
                                <button type="submit" class="btn btn-primary btn-sm shadow-lg gap-2">
                                    <Icon name="lucide:copy" class="w-4 h-4" /> Copy Output
                                </button>
                            </div>
                            <textarea 
                                id="export_file_list" 
                                class="textarea textarea-ghost w-full h-full font-mono text-xs leading-relaxed resize-none focus:outline-none p-6 bg-base-100 text-base-content"
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
        const data = await $fetch<Array<FileListItem>>(`${conf.public.apiUrl}/files/search`, {
            headers: { Authorization: `Bearer ${token.value}` },
            query: { Query: query }
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
const folderPathHistory = useState<
    Array<{
        name: string;
        folderId: number;
    }>
>("folderPathHistory", () => ([]));

const listPaginationItems = () => {
    const currentFiles = searchQuery.value ? searchResults.value : fileList.value;
    const currentFolders = searchQuery.value ? [] : folderList.value;

    let returnValues: Array<{
        isFolder: boolean;
        index: number;
    }> = [];
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
        const data = await $fetch<Array<FolderListItem>>(
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
    checked?: boolean;
}
const fileList = useState<Array<FileListItem>>("fileList", () => ([]));
const listFiles = async (folderId: number) => {
    try {
        const data = await $fetch<Array<FileListItem>>(
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
        err.value = "";
        return data;
    } catch (error: any) {
        err.value = `${error.data ? error.data : error.message}`;
        return null;
    }
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
    showFileInfo.value = false;
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
    isLoading.value = true;
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
        fileInfo.value = data;
    } catch (error: any) {
        err.value = `${error.data ? error.data : error.message}`;
    }
    isLoading.value = false;
};

const trackFileInfo = setInterval(async () => {
    await reloadFileInfo()
}, 2000);

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
                fileInfo.value = data;
            }
        } catch (error) {
            // Silent error
        }
    }
}

const openCreateFolder = () => {
    (
        document.getElementById("create_folder_modal") as HTMLDialogElement
    ).showModal();
};
const openCreateTag = () => {
    (
        document.getElementById("create_tag_modal") as HTMLDialogElement
    ).showModal();
};


const openRenameFile = (linkId: number, fileName: string) => {
    renameFileLinkId.value = linkId;
    renameFileName.value = fileName;
    (
        document.getElementById("rename_file_modal") as HTMLDialogElement
    ).showModal();
};
const openRenameFolder = (folderId: number, folderName: string) => {
    renameFolderLinkId.value = folderId;
    renameFolderName.value = folderName;
    (
        document.getElementById("rename_folder_modal") as HTMLDialogElement
    ).showModal();
};

const openMoveFile = (linkId: number, fileName: string) => {
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
    const formData = new FormData();
    formData.append("FolderId", `${renameFolderLinkId.value}`);
    formData.append("Name", renameFolderName.value);
    formData.append("ParentFolderID", `${activeFolderID.value}`);
    try {
        const data = await $fetch<{ 
            ID: string;
            Name: string;
        }>(`${conf.public.apiUrl}/folder`, {
            method: "put",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: formData,
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
    const formData = new FormData();
    formData.append("LinkID", `${renameFileLinkId.value}`);
    formData.append("Name", renameFileName.value);
    formData.append("ParentFolderID", `${activeFolderID.value}`);
    try {
        const data = await $fetch<{ 
            ID: string;
            Name: string;
        }>(`${conf.public.apiUrl}/file`, {
            method: "put",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: formData,
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

const moveFileLinkId = ref(0)
const moveFileName = ref("")
const moveFileFolderId = ref(0)
const moveFile = async () => {
    isLoading.value = true;
    const formData = new FormData();
    formData.append("LinkID", `${moveFileLinkId.value}`);
    formData.append("Name", moveFileName.value);
    formData.append("ParentFolderID", `${moveFileFolderId.value}`);
    try {
        const data = await $fetch<{ 
            ID: string;
            Name: string;
        }>(`${conf.public.apiUrl}/file`, {
            method: "put",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: formData,
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
const exportSeparatorMode = ref('\\n');
const exportSeparatorCustom = ref('');
const exportIframeWidth = ref(560);
const exportIframeHeight = ref(315);
const exportIframeAutoplay = ref(false);
const exportIframeControls = ref(true);

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
            url: `${conf.public.baseUrl}/v/${e.UUID}`,
        })), null, 2);
    }
    
    return exportFileList.value.map((e) => {
        if (exportActiveTab.value === 1) {
            let src = `${conf.public.baseUrl}/v/${e.UUID}`;
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
        return `${exportShowFilename.value ? "## " + e.Name + "\n" : ""}${conf.public.baseUrl}/v/${e.UUID}`;
    }).join(exportSeparatorFinal.value);
}

const openExport = (files: Array<FileListItem>) => {
    exportFileList.value = files;
    (
        document.getElementById("create_export_modal") as HTMLDialogElement
    ).showModal();
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

    try {
        const data = await $fetch<string>(
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

    try {
        const data = await $fetch<string>(
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
const currentFileList = computed(() => searchQuery.value ? searchResults.value : fileList.value);
const currentFolderList = computed(() => searchQuery.value ? [] : folderList.value);

const findFileInContext = (uuid: string) => {
    return fileList.value.find(e => e.UUID === uuid) || searchResults.value.find(e => e.UUID === uuid);
}

const checkAllCallback = () => {
    currentFolderList.value.forEach((e) => (e.checked = globalCheckboxChecked.value));
    currentFileList.value.forEach((e) => (e.checked = globalCheckboxChecked.value));
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