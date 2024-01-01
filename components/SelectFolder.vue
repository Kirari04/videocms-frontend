<template>
    <!-- TOASTS -->
    <div class="toast toast-top toast-end z-10">
        <div class="alert alert-error" v-if="err">
            <IconError class="stroke-current shrink-0 h-6 w-6" />
            <div>{{ err }}</div>
        </div>
    </div>
    <!-- SELECT ALL & FOLDER PATH -->
    <div class="text-sm breadcrumbs flex items-center">
        <!-- FOLDER PATH -->
        <ul class="flex flex-wrap">
            <li v-for="(folder, index) in folderPathHistory">
                <button @click="openFolder(folder.folderId, folder.name, index)" :disabled="isLoading" type="button"
                    class="flex items-center link link-hover">
                    <IconFolder class="w-4 h-4 mr-2 stroke-current" />
                    <span class="w-28 max-w-min truncate">{{
                        folder.name
                    }}</span>
                </button>
            </li>
        </ul>
    </div>
    <div class="flex flex-row items-center shrink" v-for="folder in folderList">
        <button @click="openFolder(folder.ID, folder.Name)" :disabled="isLoading" type="button"
            class="btn btn-sm no-animation grow shrink flex flex-nowrap justify-start normal-case">
            <span>
                <IconFolder class="w-4 h-4 mr-2 stroke-current" />
            </span>
            <span class="w-0 max-w-full grow shrink text-start truncate">
                {{ folder.Name }}
            </span>
        </button>
    </div>
</template>

<script lang="ts" setup>
const emit = defineEmits<{
    (event: 'update', folderId: number): void
}>()
const conf = useRuntimeConfig();
const token = useToken();
const err = ref("");
const isLoading = ref(false);
const folderList = ref<Array<FolderListItem>>([]);
const activeFolderID = ref(0)
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
}

watch(activeFolderID, () => {
    if (activeFolderID.value === 0) {
        folderPathHistory.value = []
        openFolder(0, "Home")
    }
})

onMounted(async () => {
    openFolder(0, "Home")
})
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

const openFolder = async (
    folderId: number,
    folderName: string,
    jumpToIndex = -1
) => {
    isLoading.value = true;

    const newFolderList = await listFolders(folderId)
    if (newFolderList) {
        folderList.value = newFolderList
    }

    if (jumpToIndex >= 0) {
        folderPathHistory.value = folderPathHistory.value.slice(0, jumpToIndex);
    }
    activeFolderID.value = folderId;
    folderPathHistory.value.push({
        name: folderName,
        folderId: folderId,
    });
    emit('update', folderId)
    isLoading.value = false;
};
</script>