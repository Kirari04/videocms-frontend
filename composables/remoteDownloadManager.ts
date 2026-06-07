import { ref } from "vue";
import { useToken } from "@/composables/states";
import { useRuntimeConfig } from "#imports";

export type RemoteDownloadStatus = "pending" | "downloading" | "importing" | "completed" | "failed" | "canceling" | "canceled";

export interface RemoteDownload {
    ID: number;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
    UserID: number;
    Url: string;
    Name?: string;
    Status: RemoteDownloadStatus;
    Progress: number;
    Error?: string;
    FileID?: number;
    LinkID?: number;
    LinkUUID?: string;
    ParentFolderID?: number;
    BytesDownloaded?: number;
    TotalSize?: number;
    Duration?: number;
    StartedAt?: string | null;
    FinishedAt?: string | null;
    CancelRequestedAt?: string | null;
    CanceledAt?: string | null;
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

const authHeaders = () => {
    const token = useToken();
    return {
        Authorization: `Bearer ${token.value}`,
    };
};

export const remoteDownloadApiError = (error: any) => `${error?.data || error?.message || "Remote download request failed"}`;

export const createRemoteDownload = async (urls: string[], parentFolderID?: number) => {
    const conf = useRuntimeConfig();

    try {
        await $fetch(`${conf.public.apiUrl}/remote/download`, {
            method: "POST",
            headers: authHeaders(),
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

export const cancelRemoteDownload = async (id: number) => {
    const conf = useRuntimeConfig();
    try {
        await $fetch(`${conf.public.apiUrl}/remote/download/${id}/cancel`, {
            method: "POST",
            headers: authHeaders(),
        });
        await fetchRemoteDownloads();
    } catch (e) {
        console.error("Failed to cancel remote download", e);
        throw e;
    }
};

export const retryRemoteDownload = async (id: number) => {
    const conf = useRuntimeConfig();
    try {
        await $fetch(`${conf.public.apiUrl}/remote/download/${id}/retry`, {
            method: "POST",
            headers: authHeaders(),
        });
        await fetchRemoteDownloads();
    } catch (e) {
        console.error("Failed to retry remote download", e);
        throw e;
    }
};

export const deleteRemoteDownload = async (id: number) => {
    const conf = useRuntimeConfig();
    try {
        await $fetch(`${conf.public.apiUrl}/remote/download/${id}`, {
            method: "DELETE",
            headers: authHeaders(),
        });
        await fetchRemoteDownloads();
    } catch (e) {
        console.error("Failed to delete remote download", e);
        throw e;
    }
};

export const clearRemoteDownloads = async (statuses: RemoteDownloadStatus[]) => {
    const conf = useRuntimeConfig();
    try {
        await $fetch(`${conf.public.apiUrl}/remote/downloads`, {
            method: "DELETE",
            headers: authHeaders(),
            body: { statuses },
        });
        await fetchRemoteDownloads();
    } catch (e) {
        console.error("Failed to clear remote downloads", e);
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
