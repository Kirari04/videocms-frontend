<template>
    <div class="hero bg-base-200 max-w-6xl">
        <div class="hero-content w-full">
            <div class="flex flex-col md:flex-row w-full">
                <PanelMenu />
                <div class="flex flex-col grow p-2">
                    <div class="flex flex-wrap w-full">
                        <div class="justify-start">
                            <div class="btn-group">
                                <button class="btn btn-neutral btn-sm">
                                    Upload
                                </button>
                                <button class="btn btn-neutral btn-sm">
                                    Add Folder
                                </button>
                            </div>
                        </div>
                        <div class="flex grow justify-end">
                            <div class="btn-group flex-wrap">
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
                                <button class="btn btn-neutral btn-sm">
                                    Move
                                </button>
                                <button class="btn btn-neutral btn-sm">
                                    Export
                                </button>
                                <button class="btn btn-error btn-sm">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                    <div
                        class="text-sm breadcrumbs flex flex-wrap items-center"
                    >
                        <input
                            v-model="globalCheckboxChecked"
                            @change="checkAllCallback"
                            type="checkbox"
                            class="checkbox checkbox-sm mr-4"
                        />
                        <ul>
                            <li v-for="(folder, index) in folderPathHistory">
                                <button
                                    @click="
                                        openFolder(
                                            folder.folderId,
                                            folder.name,
                                            index
                                        )
                                    "
                                    :disabled="isLoading"
                                    class="flex items-center link link-hover"
                                >
                                    <IconFolder
                                        class="w-4 h-4 mr-2 stroke-current"
                                    />
                                    {{ folder.name }}
                                </button>
                            </li>
                        </ul>
                    </div>
                    <div class="flex flex-col">
                        <div
                            class="flex flex-row items-center"
                            v-for="folder in folderList"
                        >
                            <input
                                v-model="folder.checked"
                                @change="globalCheckboxChecked = false"
                                type="checkbox"
                                class="checkbox checkbox-sm mr-4"
                            />
                            <button
                                @click="openFolder(folder.ID, folder.Name)"
                                :disabled="isLoading"
                                class="btn btn-sm no-animation grow flex justify-start normal-case"
                            >
                                <span>
                                    <IconFolder
                                        class="w-4 h-4 mr-2 stroke-current"
                                    />
                                </span>
                                <span class="truncate">
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
                                    <button class="btn btn-neutral btn-sm">
                                        Info
                                    </button>
                                    <button class="btn btn-neutral btn-sm">
                                        Move
                                    </button>
                                    <button class="btn btn-neutral btn-sm">
                                        Export
                                    </button>
                                    <button class="btn btn-error btn-sm">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="toast toast-top toast-end">
            <div class="alert alert-info" v-if="isLoading">
                <div class="loading loading-spinner loading-sm"></div>
                <div>Loading...</div>
            </div>
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
    </div>
</template>

<script lang="ts" setup>
const activeFolderID = ref(0);
const isLoading = ref(false);
const err = ref("");
const globalCheckboxChecked = ref(false);

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
    const formData = new FormData();
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

const openFolder = async (
    folderId: number,
    folderName: string,
    jumpToIndex = -1
) => {
    isLoading.value = true;
    folderList.value = [];
    let newFolderList = await listFolders(folderId);
    if (newFolderList) {
        folderList.value = newFolderList.map((e) => {
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

await useLazyAsyncData(`folder-${activeFolderID.value}`, () =>
    openFolder(activeFolderID.value, "Home")
);

const checkAllCallback = () => {
    folderList.value.forEach((e) => (e.checked = globalCheckboxChecked.value));
};
</script>
