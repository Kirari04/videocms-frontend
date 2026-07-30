<template>
    <!-- TOASTS -->
    <div class="toast toast-top toast-end z-(--z-toast)">
        <div role="alert" class="alert alert-error" v-if="err">
            <Icon name="lucide:alert-circle" class="h-5 w-5 shrink-0" />
            <span>{{ err }}</span>
            <button @click="err = ''" class="btn btn-square btn-ghost btn-sm" aria-label="Dismiss">
                <Icon name="lucide:x" class="h-4 w-4" />
            </button>
        </div>
    </div>

    <!-- FOLDER PATH -->
    <div class="breadcrumbs mb-1 p-0 text-sm">
        <ul class="flex flex-wrap">
            <li v-for="(folder, index) in folderPathHistory" :key="folder.folderId">
                <button @click="openFolder(folder.folderId, folder.name, index)" :disabled="isLoading" type="button"
                    class="flex items-center gap-1.5 transition-colors hover:text-primary"
                    :aria-current="index === folderPathHistory.length - 1 ? 'location' : undefined"
                    :class="index === folderPathHistory.length - 1 ? 'font-medium text-base-content' : 'text-base-content/60'">
                    <Icon :name="index === 0 ? 'lucide:home' : 'lucide:folder'" class="h-3.5 w-3.5" />
                    <span class="max-w-28 truncate">{{ folder.name }}</span>
                </button>
            </li>
        </ul>
    </div>

    <!-- FOLDER LIST -->
    <div class="flex flex-col gap-0.5">
        <div v-if="isLoading" role="status" aria-label="Loading folders" class="flex flex-col gap-1.5 px-2.5 py-1.5">
            <span class="skeleton h-5 w-3/4"></span>
            <span class="skeleton h-5 w-1/2"></span>
        </div>
        <button v-for="folder in folderList" :key="folder.ID" @click="openFolder(folder.ID, folder.Name)"
            v-show="!isLoading" :disabled="isLoading" type="button"
            class="flex w-full items-center gap-2.5 rounded-selector px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-base-300/60">
            <Icon name="lucide:folder" class="h-4 w-4 shrink-0 text-base-content/50" />
            <span class="min-w-0 grow truncate">{{ folder.Name }}</span>
            <Icon name="lucide:chevron-right" class="h-3.5 w-3.5 shrink-0 text-base-content/40" />
        </button>
        <p v-if="folderList.length === 0 && !isLoading" class="px-2.5 py-1.5 text-sm text-base-content/60">
            No subfolders — items will land here.
        </p>
    </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
    userId?: number;
    initialPath?: Array<{
        name: string;
        folderId: number;
    }>;
}>();

const emit = defineEmits<{
    (event: 'update', folderId: number): void
    (event: 'path-change', path: Array<{ name: string; folderId: number }>): void
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

onMounted(async () => {
    const initialPath = props.initialPath?.length
        ? props.initialPath.map(folder => ({ ...folder }))
        : [{ name: "Home", folderId: 0 }];
    folderPathHistory.value = initialPath[0]?.folderId === 0
        ? initialPath
        : [{ name: "Home", folderId: 0 }, ...initialPath];

    const currentFolder = folderPathHistory.value[folderPathHistory.value.length - 1]!;
    activeFolderID.value = currentFolder.folderId;
    isLoading.value = true;
    const initialFolderList = await listFolders(currentFolder.folderId);
    if (initialFolderList) {
        folderList.value = initialFolderList;
    }
    emitSelection();
    isLoading.value = false;
})

const emitSelection = () => {
    emit('update', activeFolderID.value);
    emit('path-change', folderPathHistory.value.map(folder => ({ ...folder })));
};

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

const openFolder = async (
    folderId: number,
    folderName: string,
    jumpToIndex = -1
) => {
    isLoading.value = true;

    const newFolderList = await listFolders(folderId)
    if (!newFolderList) {
        isLoading.value = false;
        return;
    }
    folderList.value = newFolderList;

    if (jumpToIndex >= 0) {
        folderPathHistory.value = folderPathHistory.value.slice(0, jumpToIndex + 1);
    } else if (folderPathHistory.value[folderPathHistory.value.length - 1]?.folderId !== folderId) {
        folderPathHistory.value.push({
            name: folderName,
            folderId,
        });
    }
    activeFolderID.value = folderId;
    emitSelection();
    isLoading.value = false;
};
</script>
