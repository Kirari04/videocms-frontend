import { ref } from "vue";
import { useToken } from "@/composables/states";
import { useRuntimeConfig } from "#imports";

export interface RemoteDownload {
    ID: number;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
    UserID: number;
    Url: string;
    Status: "pending" | "downloading" | "completed" | "failed";
    Progress: number;
    Error?: string;
    FileID?: number;
    ParentFolderID?: number;
}

const remote_downloads = ref<RemoteDownload[]>([]);
const is_fetching = ref<boolean>(false);
let poll_interval: NodeJS.Timeout | null = null;

export const useRemoteDownloads = () => {
    return {
        remoteDownloads: remote_downloads,
        isFetching: is_fetching,
    };
};

export const fetchRemoteDownloads = async () => {
    const conf = useRuntimeConfig();
    const token = useToken();
    
    is_fetching.value = true;
    try {
        const data = await $fetch<RemoteDownload[]>(`${conf.public.apiUrl}/remote/downloads`, {
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
        });
        if (data) {
            remote_downloads.value = data;
        }
    } catch (e) {
        console.error("Failed to fetch remote downloads", e);
    } finally {
        is_fetching.value = false;
    }
};

export const createRemoteDownload = async (urls: string[], parentFolderID?: number) => {
    const conf = useRuntimeConfig();
    const token = useToken();

    try {
        await $fetch(`${conf.public.apiUrl}/remote/download`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: {
                urls,
                parentFolderID,
            },
        });
        // Immediately fetch updates
        fetchRemoteDownloads();
        return true;
    } catch (e) {
        console.error("Failed to create remote download", e);
        throw e;
    }
};

export const startRemoteDownloadPolling = (interval = 2000) => {
    if (poll_interval) return;
    fetchRemoteDownloads();
    poll_interval = setInterval(fetchRemoteDownloads, interval);
};

export const stopRemoteDownloadPolling = () => {
    if (poll_interval) {
        clearInterval(poll_interval);
        poll_interval = null;
    }
};
