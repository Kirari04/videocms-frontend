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
                    :class="index === folderPathHistory.length - 1 ? 'font-medium text-base-content' : 'text-base-content/60'">
                    <Icon :name="index === 0 ? 'lucide:home' : 'lucide:folder'" class="h-3.5 w-3.5" />
                    <span class="max-w-28 truncate">{{ folder.name }}</span>
                </button>
            </li>
        </ul>
    </div>

    <!-- FOLDER LIST -->
    <div class="flex flex-col gap-0.5">
        <button v-for="folder in folderList" :key="folder.ID" @click="openFolder(folder.ID, folder.Name)"
            :disabled="isLoading" type="button"
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
}>();

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
