import { useRuntimeConfig } from "#imports";
import { useToken } from "@/composables/states";
import type { BackgroundJob } from "@/composables/backgroundJobs";

export interface StoragePoolSummary {
    ID: number;
    UUID: string;
    Name: string;
    IsDefault: boolean;
    System: boolean;
    MountIDs: number[];
    UserOverrideCount: number;
}

export interface StorageMountSummary {
    ID: number;
    UUID: string;
    Name: string;
    Provider: string;
    Mounted: boolean;
    Available: boolean;
    UsedBytes: number;
    FileCount: number;
}

export interface StorageOverviewSummary {
    Pools: StoragePoolSummary[];
    Mounts: StorageMountSummary[];
}

export interface MigrationMountPreview {
    id: number;
    uuid: string;
    name: string;
    provider: string;
    usedBytes: number;
}

export interface MigrationPlacementPreview {
    mountId: string;
    mountName: string;
    fileCount: number;
    plannedBytes: number;
}

export interface MigrationAccountPreview {
    id: number;
    username: string;
}

export interface StorageMigrationPreview {
    sourcePoolId: number;
    sourcePoolName: string;
    destinationPoolId: number;
    destinationPoolName: string;
    scope: "all" | "accounts";
    accounts: MigrationAccountPreview[];
    sharedFileCount: number;
    fileCount: number;
    plannedBytes: number;
    sourceMounts: MigrationMountPreview[];
    destinationMounts: MigrationMountPreview[];
    destinationPlacements: MigrationPlacementPreview[];
    warnings: string[];
    cleanupGraceHours: number;
    planFingerprint: string;
}

export interface StorageMigrationAccount {
    MigrationID: number;
    UserID: number;
    Username: string;
}

export interface StorageMigration {
    ID: number;
    UUID: string;
    SourcePoolID: number;
    DestinationPoolID: number;
    SourcePoolName: string;
    DestinationPoolName: string;
    Scope: "all" | "accounts" | "";
    AccountCount: number;
    SharedFileCount: number;
    Accounts?: StorageMigrationAccount[];
    BackgroundJobID?: string;
    CleanupJobID?: string;
    Status: string;
    Phase: string;
    FileCount: number;
    PlannedBytes: number;
    ActualBytes: number;
    CopiedBytes: number;
    CutoverCount: number;
    CleanedCount: number;
    DeletedCount: number;
    CreatedByName?: string;
    KeepOriginals: boolean;
    CleanupAfter?: string;
    StartedAt?: string;
    CopyCompletedAt?: string;
    CompletedAt?: string;
    CanceledAt?: string;
    ErrorCode?: string;
    ErrorMessage?: string;
    CreatedAt?: string;
    UpdatedAt?: string;
}

export interface StorageMigrationItem {
    ID: number;
    FileID: number;
    FileUUID: string;
    VideoName: string;
    SourceMountID: string;
    DestinationMountID: string;
    Status: string;
    PlannedBytes: number;
    BytesTotal: number;
    BytesCopied: number;
    ObjectCount: number;
    ObjectsVerified: number;
    ProgressMessage?: string;
    ErrorCode?: string;
    ErrorMessage?: string;
    CopyStartedAt?: string;
    VerifiedAt?: string;
    CutoverAt?: string;
    CleanedAt?: string;
}

export interface StorageMigrationDetail {
    migration: StorageMigration;
    job?: BackgroundJob;
    cleanupJob?: BackgroundJob;
}

export interface StorageMigrationSummary {
	active: number;
	retainingOriginals: number;
	needsAttention: number;
	videosMoved: number;
}

export interface StorageMigrationAccountSearchResult {
    ID: number;
    Username: string;
}

const api = () => `${useRuntimeConfig().public.apiUrl}/v2/admin/storage/migrations`;
const legacyApi = () => `${useRuntimeConfig().public.apiUrl}/admin/storage`;
const headers = () => ({ Authorization: `Bearer ${useToken().value}` });

export const getStorageOverviewSummary = () =>
    $fetch<StorageOverviewSummary>(legacyApi(), { headers: headers() });

export const previewStorageMigration = (sourcePoolId: number, destinationPoolId: number, accountIds: number[] = []) =>
    $fetch<StorageMigrationPreview>(`${api()}/preview`, {
        method: "POST",
        headers: headers(),
        body: { sourcePoolId, destinationPoolId, accountIds },
    });

export const createStorageMigration = (sourcePoolId: number, destinationPoolId: number, planFingerprint: string, idempotencyKey: string, accountIds: number[] = []) =>
    $fetch<{ migration: StorageMigration; job: BackgroundJob; retryAfterSeconds: number }>(api(), {
        method: "POST",
        headers: { ...headers(), "Idempotency-Key": idempotencyKey },
        body: { sourcePoolId, destinationPoolId, planFingerprint, accountIds },
    });

export const searchStorageMigrationAccounts = (search = "") =>
    $fetch<{ accounts: StorageMigrationAccountSearchResult[] }>(`${api()}/accounts`, {
        headers: headers(),
        query: { search: search.trim() || undefined },
    });

export const listStorageMigrations = (query: Record<string, string | number | undefined> = {}) =>
	$fetch<{ migrations: StorageMigration[]; summary: StorageMigrationSummary; nextBeforeId?: number }>(api(), { headers: headers(), query });

export const getStorageMigration = (id: string) =>
    $fetch<StorageMigrationDetail>(`${api()}/${encodeURIComponent(id)}`, { headers: headers() });

export const listStorageMigrationItems = (id: string, query: Record<string, string | number | undefined> = {}) =>
	$fetch<{ items: StorageMigrationItem[]; nextAfterId?: number }>(`${api()}/${encodeURIComponent(id)}/items`, { headers: headers(), query });

export const keepStorageMigrationOriginals = (id: string) =>
	$fetch<StorageMigration>(`${api()}/${encodeURIComponent(id)}/keep-originals`, { method: "POST", headers: headers() });

export const cancelFailedStorageMigration = (id: string) =>
	$fetch<StorageMigration>(`${api()}/${encodeURIComponent(id)}/cancel`, { method: "POST", headers: headers() });

export const storageMigrationStatusLabel = (status: string) => ({
    queued: "Queued",
    running: "Migrating",
    paused: "Paused",
    failed: "Needs attention",
    canceled: "Canceled",
    retaining_originals: "Retaining originals",
    cleaning_originals: "Cleaning originals",
    completed: "Complete",
    originals_retained: "Originals retained",
    pending: "Waiting",
    copying: "Copying",
    verifying: "Verifying",
    cleanup_pending: "Destination active",
    cleaning: "Cleaning original",
    cleaned: "Original removed",
    original_kept: "Original retained",
    original_partial: "Original may be incomplete",
    deleted: "Deleted by user",
} as Record<string, string>)[status] || status.replaceAll("_", " ");
