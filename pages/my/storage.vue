<template>
    <div class="flex h-full grow flex-col">
        <div class="toast toast-top toast-end z-(--z-toast)">
            <div v-if="err" role="alert" class="alert alert-error max-w-lg">
                <Icon name="lucide:alert-circle" class="h-5 w-5 shrink-0" />
                <span>{{ err }}</span>
            </div>
            <div v-if="successMsg" role="status" class="alert alert-success max-w-lg">
                <Icon name="lucide:check-circle-2" class="h-5 w-5 shrink-0" />
                <span>{{ successMsg }}</span>
            </div>
        </div>

        <div v-if="accountData && !accountData.Admin" role="alert" class="alert alert-error">
            <Icon name="lucide:shield-alert" class="h-5 w-5 shrink-0" />
            <span>You don't have access to this page.</span>
        </div>

        <div v-if="accountData?.Admin" class="flex grow flex-col">
            <PageHeader title="Storage" description="Mount storage backends and route each new upload to one available mount.">
                <button class="btn btn-ghost btn-sm gap-2" :disabled="isLoading" @click="load">
                    <Icon name="lucide:refresh-cw" class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
                    Reload
                </button>
                <button class="btn btn-primary btn-sm gap-2" :disabled="!overview?.EncryptionConfigured"
                    @click="openCreateMount">
                    <Icon name="lucide:plus" class="h-4 w-4" />
                    Add S3 mount
                </button>
            </PageHeader>

            <div v-if="overview && !overview.EncryptionConfigured" role="alert"
                class="mb-5 flex flex-col items-start gap-3 rounded-box border border-warning/35 bg-warning/10 p-4 text-sm sm:flex-row">
                <Icon name="lucide:key-round" class="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <div class="min-w-0 grow">
                    <p class="font-medium">Adapter credentials need an encryption key</p>
                    <p class="mt-1 text-base-content/70">
                        Set <code class="rounded bg-base-300 px-1.5 py-0.5 font-mono text-xs">StorageEncryptionKey</code>
                        in the server environment and restart VideoCMS before adding a remote mount.
                    </p>
                    <div class="mt-3 flex max-w-xl items-center gap-2 rounded-field border border-base-300 bg-base-100 px-3 py-2">
                        <code class="min-w-0 grow overflow-x-auto font-mono text-xs">openssl rand -base64 32</code>
                        <button class="btn btn-square btn-ghost btn-xs" aria-label="Copy key generation command"
                            title="Copy command" @click="copyKeyCommand">
                            <Icon name="lucide:copy" class="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            <div v-if="isLoading && !overview" class="grid gap-3 md:grid-cols-3" aria-hidden="true">
                <div v-for="i in 3" :key="i" class="skeleton h-24 rounded-box"></div>
            </div>

            <template v-if="overview">
                <section aria-label="Storage summary" class="mb-8 grid gap-3 sm:grid-cols-3">
                    <div class="rounded-box border border-base-300 bg-base-100 p-4">
                        <div class="flex items-center justify-between text-xs font-medium text-base-content/60">
                            <span>Active mounts</span>
                            <Icon name="lucide:hard-drive" class="h-4 w-4" />
                        </div>
                        <p class="mt-2 text-2xl font-semibold tabular-nums">{{ mountedCount }}</p>
                        <p class="mt-1 text-xs text-base-content/60">of {{ overview.Mounts.length }} configured</p>
                    </div>
                    <div class="rounded-box border border-base-300 bg-base-100 p-4">
                        <div class="flex items-center justify-between text-xs font-medium text-base-content/60">
                            <span>Tracked storage</span>
                            <Icon name="lucide:database" class="h-4 w-4" />
                        </div>
                        <p class="mt-2 text-2xl font-semibold tabular-nums">{{ formatBytes(totalUsedBytes) }}</p>
                        <p class="mt-1 text-xs text-base-content/60">across {{ totalFiles }} files</p>
                    </div>
                    <div class="rounded-box border border-base-300 bg-base-100 p-4"
                        :class="totalUnavailableFiles ? 'border-warning/45' : ''">
                        <div class="flex items-center justify-between text-xs font-medium text-base-content/60">
                            <span>Unavailable files</span>
                            <Icon :name="totalUnavailableFiles ? 'lucide:cloud-off' : 'lucide:circle-check'"
                                class="h-4 w-4" :class="totalUnavailableFiles ? 'text-warning' : 'text-success'" />
                        </div>
                        <p class="mt-2 text-2xl font-semibold tabular-nums">{{ totalUnavailableFiles }}</p>
                        <p class="mt-1 text-xs text-base-content/60">
                            {{ totalUnavailableFiles ? 'Can be relinked from a matching mount' : 'All tracked files are reachable' }}
                        </p>
                    </div>
                </section>

                <section class="mb-8" aria-labelledby="pools-heading">
                    <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h2 id="pools-heading" class="text-base font-semibold">Upload pools</h2>
                            <p class="mt-0.5 text-sm text-base-content/60">
                                A pool places each upload on its least-used mounted member. Files are never replicated.
                            </p>
                        </div>
                        <button class="btn btn-outline btn-sm gap-2" @click="openCreatePool">
                            <Icon name="lucide:plus" class="h-4 w-4" />
                            New pool
                        </button>
                    </div>

                    <div class="grid gap-3 xl:grid-cols-2">
                        <article v-for="pool in overview.Pools" :key="pool.ID"
                            class="rounded-box border border-base-300 bg-base-100 p-4"
                            :class="pool.IsDefault ? 'border-primary/40 ring-1 ring-primary/10' : ''">
                            <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0">
                                    <div class="flex flex-wrap items-center gap-2">
                                        <h3 class="truncate font-medium">{{ pool.Name }}</h3>
                                        <span v-if="pool.IsDefault" class="badge badge-primary badge-sm">Default</span>
                                        <span v-if="pool.System" class="badge badge-ghost badge-sm">Built in</span>
                                    </div>
                                    <p class="mt-1 text-xs text-base-content/60">
                                        {{ pool.UserOverrideCount }} {{ pool.UserOverrideCount === 1 ? 'user override' : 'user overrides' }}
                                    </p>
                                </div>
                                <div class="flex shrink-0 gap-0.5">
                                    <button v-if="!pool.IsDefault" class="btn btn-square btn-ghost btn-sm tooltip"
                                        data-tip="Make instance default" :disabled="isBusy(`pool-default-${pool.ID}`)"
                                        aria-label="Make instance default" @click="setDefaultPool(pool)">
                                        <Icon name="lucide:star" class="h-4 w-4" />
                                    </button>
                                    <button v-if="!pool.System" class="btn btn-square btn-ghost btn-sm tooltip"
                                        data-tip="Edit pool" aria-label="Edit pool" @click="openEditPool(pool)">
                                        <Icon name="lucide:settings-2" class="h-4 w-4" />
                                    </button>
                                    <button v-if="!pool.System" class="btn btn-square btn-ghost btn-sm text-error tooltip"
                                        data-tip="Delete pool" aria-label="Delete pool" @click="deletePool(pool)">
                                        <Icon name="lucide:trash-2" class="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div class="mt-4 flex items-stretch gap-2" aria-label="Pool routing">
                                <div class="flex w-10 shrink-0 items-center justify-center rounded-field bg-primary/10 text-primary">
                                    <Icon name="lucide:split" class="h-4 w-4" />
                                </div>
                                <div class="relative flex min-w-0 grow flex-wrap gap-2 border-l border-base-300 pl-3">
                                    <div v-for="mount in poolMounts(pool)" :key="mount.ID"
                                        class="flex min-w-0 items-center gap-2 rounded-field border border-base-300 bg-base-200 px-2.5 py-2 text-xs">
                                        <span class="h-2 w-2 shrink-0 rounded-full"
                                            :class="mount.Mounted && !mount.LastError ? 'bg-success' : 'bg-warning'"></span>
                                        <span class="truncate font-medium">{{ mount.Name }}</span>
                                        <span v-if="!mount.Mounted" class="text-base-content/50">detached</span>
                                    </div>
                                    <span v-if="!poolMounts(pool).length" class="py-2 text-xs text-error">No members</span>
                                </div>
                            </div>
                            <p v-if="poolAvailableMountCount(pool) === 0"
                                class="mt-3 flex items-center gap-1.5 text-xs text-warning">
                                <Icon name="lucide:triangle-alert" class="h-3.5 w-3.5" />
                                No mounted members. New uploads routed here will fail until a member is connected.
                            </p>
                        </article>
                    </div>
                </section>

                <section aria-labelledby="mounts-heading">
                    <div class="mb-3">
                        <h2 id="mounts-heading" class="text-base font-semibold">Storage mounts</h2>
                        <p class="mt-0.5 text-sm text-base-content/60">
                            Detaching a mount keeps its objects and database identity, so the same or a migrated bucket can be connected later.
                        </p>
                    </div>

                    <div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
                        <table class="table table-sm">
                            <thead>
                                <tr class="border-base-300 text-xs text-base-content/70">
                                    <th class="font-medium">Mount</th>
                                    <th class="font-medium">Location</th>
                                    <th class="font-medium">State</th>
                                    <th class="font-medium">Tracked data</th>
                                    <th class="text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="mount in overview.Mounts" :key="mount.ID" class="border-base-300 align-top">
                                    <td>
                                        <div class="flex items-center gap-3">
                                            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-field bg-base-200">
                                                <Icon :name="mount.Provider === 's3' ? 'lucide:cloud' : 'lucide:hard-drive'"
                                                    class="h-4 w-4" />
                                            </div>
                                            <div class="min-w-0">
                                                <div class="flex flex-wrap items-center gap-1.5">
                                                    <span class="font-medium">{{ mount.Name }}</span>
                                                    <span v-if="mount.System" class="badge badge-ghost badge-xs">Built in</span>
                                                </div>
                                                <span class="font-mono text-[11px] text-base-content/50">{{ mount.UUID }}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="max-w-xs">
                                        <template v-if="mount.Configuration">
                                            <p class="truncate text-sm font-medium">{{ mount.Configuration.bucket }}</p>
                                            <p class="truncate text-xs text-base-content/60">
                                                {{ mount.Configuration.endpoint || `AWS · ${mount.Configuration.region}` }}
                                                <template v-if="mount.Configuration.prefix"> · /{{ mount.Configuration.prefix }}</template>
                                            </p>
                                        </template>
                                        <span v-else class="text-sm text-base-content/60">Server filesystem</span>
                                    </td>
                                    <td>
                                        <span class="badge badge-sm gap-1.5" :class="mountStatus(mount).className">
                                            <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
                                            {{ mountStatus(mount).label }}
                                        </span>
                                        <p v-if="mount.Mounted && mount.LastError" class="mt-1 max-w-xs text-xs text-error" :title="mount.LastError">
                                            {{ truncate(mount.LastError, 90) }}
                                        </p>
                                        <p v-else-if="!mount.Mounted && mount.UnmountedAt" class="mt-1 text-[11px] text-base-content/50">
                                            Detached {{ formatDate(mount.UnmountedAt) }}
                                        </p>
                                        <p v-else-if="mount.LastCheckedAt" class="mt-1 text-[11px] text-base-content/50">
                                            Checked {{ formatDate(mount.LastCheckedAt) }}
                                        </p>
                                    </td>
                                    <td>
                                        <p class="text-sm font-medium tabular-nums">{{ formatBytes(mount.UsedBytes) }}</p>
                                        <p class="text-xs text-base-content/60">{{ mount.FileCount }} files</p>
                                        <p v-if="mount.UnavailableFileCount" class="mt-0.5 text-xs text-warning">
                                            {{ mount.UnavailableFileCount }} unavailable
                                        </p>
                                    </td>
                                    <td>
                                        <div class="flex justify-end gap-0.5">
                                            <button v-if="mount.Mounted" class="btn btn-square btn-ghost btn-sm tooltip"
                                                data-tip="Check connection" aria-label="Check connection"
                                                :disabled="isBusy(`check-${mount.ID}`)" @click="checkMount(mount)">
                                                <Icon name="lucide:activity" class="h-4 w-4"
                                                    :class="{ 'animate-pulse': isBusy(`check-${mount.ID}`) }" />
                                            </button>
                                            <button v-if="mount.Mounted && !mount.System" class="btn btn-square btn-ghost btn-sm tooltip"
                                                data-tip="Scan and reconnect files" aria-label="Scan and reconnect files"
                                                :disabled="isBusy(`scan-${mount.ID}`)" @click="previewReconnect(mount)">
                                                <Icon name="lucide:scan-search" class="h-4 w-4" />
                                            </button>
                                            <button v-if="!mount.System" class="btn btn-square btn-ghost btn-sm tooltip"
                                                data-tip="Edit mount" aria-label="Edit mount" @click="openEditMount(mount)">
                                                <Icon name="lucide:settings-2" class="h-4 w-4" />
                                            </button>
                                            <button v-if="mount.Mounted && !mount.System"
                                                class="btn btn-square btn-ghost btn-sm text-warning tooltip" data-tip="Detach mount"
                                                aria-label="Detach mount" @click="openUnmount(mount)">
                                                <Icon name="lucide:unplug" class="h-4 w-4" />
                                            </button>
                                            <button v-if="!mount.Mounted && !mount.System" class="btn btn-sm btn-outline gap-1.5"
                                                :disabled="isBusy(`remount-${mount.ID}`)" @click="remount(mount)">
                                                <span v-if="isBusy(`remount-${mount.ID}`)" class="loading loading-spinner loading-xs"></span>
                                                <Icon v-else name="lucide:plug" class="h-3.5 w-3.5" />
                                                Mount
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            </template>
        </div>

        <dialog id="storage_mount_modal" class="modal">
            <div class="modal-box w-11/12 max-w-3xl">
                <form method="dialog">
                    <button class="btn btn-square btn-ghost btn-sm absolute top-3 right-3" aria-label="Close">
                        <Icon name="lucide:x" class="h-4 w-4" />
                    </button>
                </form>
                <h3 class="text-base font-semibold">{{ editingMount ? 'Edit S3 mount' : 'Add S3 mount' }}</h3>
                <p class="mt-1 text-sm text-base-content/60">The bucket must already exist. VideoCMS only manages objects under the selected prefix.</p>

                <form class="mt-5 flex flex-col gap-5" @submit.prevent="saveMount">
                    <div class="grid gap-4 sm:grid-cols-2">
                        <label class="flex flex-col gap-1.5 sm:col-span-2">
                            <span class="text-sm font-medium">Mount name</span>
                            <input v-model.trim="mountForm.name" class="input input-sm w-full" required maxlength="120"
                                placeholder="Primary media bucket" />
                        </label>
                        <label class="flex flex-col gap-1.5">
                            <span class="text-sm font-medium">Bucket</span>
                            <input v-model.trim="mountForm.bucket" class="input input-sm w-full font-mono" required
                                placeholder="videocms-media" />
                        </label>
                        <label class="flex flex-col gap-1.5">
                            <span class="text-sm font-medium">Region</span>
                            <input v-model.trim="mountForm.region" class="input input-sm w-full font-mono" required
                                placeholder="us-east-1" />
                        </label>
                        <label class="flex flex-col gap-1.5 sm:col-span-2">
                            <span class="text-sm font-medium">Endpoint <span class="font-normal text-base-content/50">(optional)</span></span>
                            <input v-model.trim="mountForm.endpoint" type="url" class="input input-sm w-full font-mono"
                                placeholder="https://s3.example.com" />
                            <span class="text-xs text-base-content/50">Use this for MinIO or another S3-compatible provider.</span>
                        </label>
                        <label class="flex flex-col gap-1.5">
                            <span class="text-sm font-medium">Object prefix <span class="font-normal text-base-content/50">(optional)</span></span>
                            <input v-model.trim="mountForm.prefix" class="input input-sm w-full font-mono" placeholder="videocms" />
                        </label>
                        <label class="flex cursor-pointer items-center justify-between gap-4 rounded-field border border-base-300 px-3 py-2">
                            <span>
                                <span class="block text-sm font-medium">Path-style URLs</span>
                                <span class="block text-xs text-base-content/50">Common for self-hosted S3</span>
                            </span>
                            <input v-model="mountForm.usePathStyle" type="checkbox" class="toggle toggle-primary toggle-sm" />
                        </label>
                        <label class="flex flex-col gap-1.5">
                            <span class="text-sm font-medium">Multipart part size</span>
                            <div class="join">
                                <input v-model.number="mountForm.uploadPartSizeMiB" type="number" min="5"
                                    class="input input-sm join-item w-full tabular-nums" required />
                                <span class="btn no-animation btn-sm join-item cursor-default bg-base-200 font-normal">MiB</span>
                            </div>
                        </label>
                        <label class="flex flex-col gap-1.5">
                            <span class="text-sm font-medium">Upload concurrency</span>
                            <input v-model.number="mountForm.uploadConcurrency" type="number" min="1" max="64"
                                class="input input-sm w-full tabular-nums" required />
                        </label>
                    </div>

                    <fieldset class="rounded-field border border-base-300 p-4">
                        <legend class="px-1.5 text-sm font-medium">Credentials</legend>
                        <label v-if="editingMount" class="mb-4 flex cursor-pointer items-center justify-between gap-4">
                            <span>
                                <span class="block text-sm font-medium">Replace saved credentials</span>
                                <span class="block text-xs text-base-content/60">Leave off to keep the existing encrypted values.</span>
                            </span>
                            <input v-model="mountForm.replaceCredentials" type="checkbox" class="toggle toggle-primary toggle-sm" />
                        </label>
                        <div v-if="!editingMount || mountForm.replaceCredentials" class="grid gap-4 sm:grid-cols-2">
                            <label class="flex flex-col gap-1.5">
                                <span class="text-sm font-medium">Access key ID</span>
                                <input v-model="mountForm.accessKeyId" class="input input-sm w-full font-mono"
                                    autocomplete="off" />
                            </label>
                            <label class="flex flex-col gap-1.5">
                                <span class="text-sm font-medium">Secret access key</span>
                                <input v-model="mountForm.secretAccessKey" type="password"
                                    class="input input-sm w-full font-mono" autocomplete="new-password" />
                            </label>
                            <label class="flex flex-col gap-1.5 sm:col-span-2">
                                <span class="text-sm font-medium">Session token <span class="font-normal text-base-content/50">(optional)</span></span>
                                <input v-model="mountForm.sessionToken" type="password"
                                    class="input input-sm w-full font-mono" autocomplete="new-password" />
                            </label>
                            <p class="text-xs text-base-content/60 sm:col-span-2">
                                Leave all credential fields empty to use the server's AWS credential provider chain. Saved values are encrypted and never returned by the API.
                            </p>
                        </div>
                    </fieldset>

                    <div class="modal-action">
                        <button type="button" class="btn btn-ghost btn-sm" @click="closeDialog('storage_mount_modal')">Cancel</button>
                        <button type="submit" class="btn btn-primary btn-sm" :disabled="isBusy('save-mount')">
                            <span v-if="isBusy('save-mount')" class="loading loading-spinner loading-xs"></span>
                            {{ editingMount ? 'Save and check' : 'Add and check' }}
                        </button>
                    </div>
                </form>
            </div>
            <form method="dialog" class="modal-backdrop"><button>close</button></form>
        </dialog>

        <dialog id="storage_pool_modal" class="modal">
            <div class="modal-box max-w-xl">
                <form method="dialog">
                    <button class="btn btn-square btn-ghost btn-sm absolute top-3 right-3" aria-label="Close">
                        <Icon name="lucide:x" class="h-4 w-4" />
                    </button>
                </form>
                <h3 class="text-base font-semibold">{{ editingPool ? 'Edit upload pool' : 'Create upload pool' }}</h3>
                <p class="mt-1 text-sm text-base-content/60">Each file is placed on one member—the mount with the fewest tracked bytes.</p>
                <form class="mt-5 flex flex-col gap-5" @submit.prevent="savePool">
                    <label class="flex flex-col gap-1.5">
                        <span class="text-sm font-medium">Pool name</span>
                        <input v-model.trim="poolForm.name" class="input input-sm w-full" required maxlength="120"
                            placeholder="Remote uploads" />
                    </label>
                    <fieldset>
                        <legend class="mb-2 text-sm font-medium">Mount members</legend>
                        <div class="flex flex-col gap-2">
                            <label v-for="mount in overview?.Mounts" :key="mount.ID"
                                class="flex cursor-pointer items-center gap-3 rounded-field border border-base-300 px-3 py-2.5 hover:bg-base-200">
                                <input v-model="poolForm.mountIds" type="checkbox" class="checkbox checkbox-primary checkbox-sm"
                                    :value="mount.ID" />
                                <span class="min-w-0 grow">
                                    <span class="block truncate text-sm font-medium">{{ mount.Name }}</span>
                                    <span class="block text-xs text-base-content/50">
                                        {{ mount.Mounted ? providerLabel(mount.Provider) : `${providerLabel(mount.Provider)} · detached` }}
                                    </span>
                                </span>
                                <span class="text-xs tabular-nums text-base-content/60">{{ formatBytes(mount.UsedBytes) }}</span>
                            </label>
                        </div>
                    </fieldset>
                    <label class="flex cursor-pointer items-center justify-between gap-4 rounded-field border border-base-300 px-3 py-2.5">
                        <span>
                            <span class="block text-sm font-medium">Instance default</span>
                            <span class="block text-xs text-base-content/60">Used when a user has no individual override.</span>
                        </span>
                        <input v-model="poolForm.isDefault" type="checkbox" class="toggle toggle-primary toggle-sm" />
                    </label>
                    <div class="modal-action">
                        <button type="button" class="btn btn-ghost btn-sm" @click="closeDialog('storage_pool_modal')">Cancel</button>
                        <button type="submit" class="btn btn-primary btn-sm"
                            :disabled="isBusy('save-pool') || poolForm.mountIds.length === 0">
                            <span v-if="isBusy('save-pool')" class="loading loading-spinner loading-xs"></span>
                            {{ editingPool ? 'Save changes' : 'Create pool' }}
                        </button>
                    </div>
                </form>
            </div>
            <form method="dialog" class="modal-backdrop"><button>close</button></form>
        </dialog>

        <dialog id="storage_unmount_modal" class="modal">
            <div class="modal-box max-w-lg">
                <div class="flex items-start gap-3">
                    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
                        <Icon name="lucide:unplug" class="h-4 w-4" />
                    </div>
                    <div>
                        <h3 class="text-base font-semibold">Detach {{ selectedMount?.Name }}?</h3>
                        <p class="mt-2 text-sm text-base-content/70">
                            {{ selectedMount?.FileCount || 0 }} active files on this mount will become unavailable in VideoCMS.
                            Their objects will not be deleted.
                        </p>
                        <p class="mt-2 text-sm text-base-content/70">
                            You can edit and mount it again later, or connect a migrated bucket and scan it to relink matching file IDs.
                        </p>
                    </div>
                </div>
                <div class="modal-action">
                    <button class="btn btn-ghost btn-sm" @click="closeDialog('storage_unmount_modal')">Keep mounted</button>
                    <button class="btn btn-warning btn-sm" :disabled="isBusy('unmount')" @click="unmountSelected">
                        <span v-if="isBusy('unmount')" class="loading loading-spinner loading-xs"></span>
                        Detach mount
                    </button>
                </div>
            </div>
            <form method="dialog" class="modal-backdrop"><button>close</button></form>
        </dialog>

        <dialog id="storage_reconnect_modal" class="modal">
            <div class="modal-box max-w-lg">
                <form method="dialog">
                    <button class="btn btn-square btn-ghost btn-sm absolute top-3 right-3" aria-label="Close">
                        <Icon name="lucide:x" class="h-4 w-4" />
                    </button>
                </form>
                <h3 class="text-base font-semibold">Reconnect files from {{ selectedMount?.Name }}</h3>
                <p class="mt-1 text-sm text-base-content/60">The scan compares unavailable file IDs with canonical object prefixes in this mount.</p>
                <div class="mt-5 grid grid-cols-2 gap-3">
                    <div class="rounded-field bg-base-200 p-3">
                        <p class="text-xs text-base-content/60">Unavailable scanned</p>
                        <p class="mt-1 text-xl font-semibold tabular-nums">{{ reconnectPreview?.Scanned || 0 }}</p>
                    </div>
                    <div class="rounded-field bg-primary/10 p-3">
                        <p class="text-xs text-base-content/60">Matches found</p>
                        <p class="mt-1 text-xl font-semibold tabular-nums text-primary">{{ reconnectPreview?.Matched || 0 }}</p>
                    </div>
                </div>
                <p class="mt-4 text-sm text-base-content/70">
                    Applying changes only updates matching database records. It does not move, copy, or delete objects.
                </p>
                <div class="modal-action">
                    <button class="btn btn-ghost btn-sm" @click="closeDialog('storage_reconnect_modal')">Close</button>
                    <button class="btn btn-primary btn-sm" :disabled="!reconnectPreview?.Matched || isBusy('apply-reconnect')"
                        @click="applyReconnect">
                        <span v-if="isBusy('apply-reconnect')" class="loading loading-spinner loading-xs"></span>
                        Relink {{ reconnectPreview?.Matched || 0 }} files
                    </button>
                </div>
            </div>
            <form method="dialog" class="modal-backdrop"><button>close</button></form>
        </dialog>
    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: "panel",
    middleware: "auth",
});

interface S3MountConfiguration {
    bucket: string;
    region: string;
    endpoint?: string;
    prefix?: string;
    use_path_style: boolean;
    upload_part_size: number;
    upload_concurrency: number;
}

interface StorageMount {
    ID: number;
    UUID: string;
    Name: string;
    Provider: string;
    Mounted: boolean;
    System: boolean;
    Configuration?: S3MountConfiguration;
    CredentialsConfigured: boolean;
    UsedBytes: number;
    FileCount: number;
    UnavailableFileCount: number;
    LastError: string;
    LastCheckedAt?: string | null;
    UnmountedAt?: string | null;
}

interface StoragePool {
    ID: number;
    UUID: string;
    Name: string;
    IsDefault: boolean;
    System: boolean;
    MountIDs: number[];
    UserOverrideCount: number;
}

interface StorageOverview {
    EncryptionConfigured: boolean;
    Mounts: StorageMount[];
    Pools: StoragePool[];
}

interface ReconnectResult {
    Scanned: number;
    Matched: number;
    Relinked: number;
    Warning?: string;
}

const { data: accountData } = useAccountData();
const conf = useRuntimeConfig();
const token = useToken();
const overview = ref<StorageOverview | null>(null);
const err = ref("");
const successMsg = ref("");
const isLoading = ref(false);
const busyAction = ref("");
const editingMount = ref<StorageMount | null>(null);
const editingPool = ref<StoragePool | null>(null);
const selectedMount = ref<StorageMount | null>(null);
const reconnectPreview = ref<ReconnectResult | null>(null);

const mountForm = ref(emptyMountForm());
const poolForm = ref(emptyPoolForm());

const mountedCount = computed(() => overview.value?.Mounts.filter((mount) => mount.Mounted).length || 0);
const totalUsedBytes = computed(() => overview.value?.Mounts.reduce((total, mount) => total + mount.UsedBytes, 0) || 0);
const totalFiles = computed(() => overview.value?.Mounts.reduce((total, mount) => total + mount.FileCount, 0) || 0);
const totalUnavailableFiles = computed(() => overview.value?.Mounts.reduce((total, mount) => total + mount.UnavailableFileCount, 0) || 0);

onMounted(() => {
    if (accountData.value?.Admin) load();
});

watch(accountData, (account) => {
    if (account?.Admin && !overview.value) load();
    else if (account && !account.Admin) navigateTo("/my");
});

async function load() {
    isLoading.value = true;
    err.value = "";
    try {
        overview.value = await apiFetch<StorageOverview>("/admin/storage");
    } catch (error: any) {
        err.value = errorMessage(error, "Failed to load storage configuration");
    } finally {
        isLoading.value = false;
    }
}

function emptyMountForm() {
    return {
        name: "",
        bucket: "",
        region: "us-east-1",
        endpoint: "",
        prefix: "",
        usePathStyle: false,
        uploadPartSizeMiB: 16,
        uploadConcurrency: 4,
        replaceCredentials: true,
        accessKeyId: "",
        secretAccessKey: "",
        sessionToken: "",
    };
}

function emptyPoolForm() {
    return { name: "", mountIds: [] as number[], isDefault: false };
}

function openCreateMount() {
    editingMount.value = null;
    mountForm.value = emptyMountForm();
    showDialog("storage_mount_modal");
}

function openEditMount(mount: StorageMount) {
    editingMount.value = mount;
    const configuration = mount.Configuration;
    mountForm.value = {
        ...emptyMountForm(),
        name: mount.Name,
        bucket: configuration?.bucket || "",
        region: configuration?.region || "us-east-1",
        endpoint: configuration?.endpoint || "",
        prefix: configuration?.prefix || "",
        usePathStyle: configuration?.use_path_style || false,
        uploadPartSizeMiB: configuration?.upload_part_size ? configuration.upload_part_size / 1024 / 1024 : 16,
        uploadConcurrency: configuration?.upload_concurrency || 4,
        replaceCredentials: false,
    };
    showDialog("storage_mount_modal");
}

async function saveMount() {
    busyAction.value = "save-mount";
    err.value = "";
    const payload: Record<string, any> = {
        name: mountForm.value.name,
        configuration: {
            bucket: mountForm.value.bucket,
            region: mountForm.value.region,
            endpoint: mountForm.value.endpoint,
            prefix: mountForm.value.prefix,
            use_path_style: mountForm.value.usePathStyle,
            upload_part_size: Math.round(mountForm.value.uploadPartSizeMiB * 1024 * 1024),
            upload_concurrency: mountForm.value.uploadConcurrency,
        },
    };
    if (!editingMount.value || mountForm.value.replaceCredentials) {
        payload.credentials = {
            access_key_id: mountForm.value.accessKeyId,
            secret_access_key: mountForm.value.secretAccessKey,
            session_token: mountForm.value.sessionToken,
        };
    }
    try {
        if (editingMount.value) {
            await apiFetch(`/admin/storage/mounts/${editingMount.value.ID}`, { method: "PUT", body: payload });
            showSuccess("Storage mount updated and connection checked");
        } else {
            const response = await apiFetch<{ reconnect: ReconnectResult }>("/admin/storage/mounts", { method: "POST", body: payload });
            if (response.reconnect.Warning) {
                err.value = `Storage mount was added, but its reconnect scan did not finish: ${response.reconnect.Warning}`;
            } else {
                showSuccess(`Storage mount added; ${response.reconnect.Relinked} matching files relinked`);
            }
        }
        closeDialog("storage_mount_modal");
        await load();
    } catch (error: any) {
        err.value = errorMessage(error, "Failed to save storage mount");
    } finally {
        busyAction.value = "";
    }
}

function openCreatePool() {
    editingPool.value = null;
    poolForm.value = emptyPoolForm();
    showDialog("storage_pool_modal");
}

function openEditPool(pool: StoragePool) {
    editingPool.value = pool;
    poolForm.value = { name: pool.Name, mountIds: [...pool.MountIDs], isDefault: pool.IsDefault };
    showDialog("storage_pool_modal");
}

async function savePool() {
    busyAction.value = "save-pool";
    err.value = "";
    const payload = {
        name: poolForm.value.name,
        mount_ids: poolForm.value.mountIds,
        is_default: poolForm.value.isDefault,
    };
    try {
        if (editingPool.value) {
            await apiFetch(`/admin/storage/pools/${editingPool.value.ID}`, { method: "PUT", body: payload });
            showSuccess("Upload pool updated");
        } else {
            await apiFetch("/admin/storage/pools", { method: "POST", body: payload });
            showSuccess("Upload pool created");
        }
        closeDialog("storage_pool_modal");
        await load();
    } catch (error: any) {
        err.value = errorMessage(error, "Failed to save upload pool");
    } finally {
        busyAction.value = "";
    }
}

async function setDefaultPool(pool: StoragePool) {
    busyAction.value = `pool-default-${pool.ID}`;
    try {
        await apiFetch(`/admin/storage/pools/${pool.ID}/default`, { method: "POST" });
        showSuccess(`${pool.Name} is now the instance default`);
        await load();
    } catch (error: any) {
        err.value = errorMessage(error, "Failed to set the default pool");
    } finally {
        busyAction.value = "";
    }
}

async function deletePool(pool: StoragePool) {
    const impact = pool.UserOverrideCount
        ? ` ${pool.UserOverrideCount} user overrides will return to the instance default.`
        : "";
    if (!confirm(`Delete the upload pool “${pool.Name}”?${impact} Existing files will not move.`)) return;
    busyAction.value = `pool-delete-${pool.ID}`;
    try {
        await apiFetch(`/admin/storage/pools/${pool.ID}`, { method: "DELETE" });
        showSuccess("Upload pool deleted");
        await load();
    } catch (error: any) {
        err.value = errorMessage(error, "Failed to delete upload pool");
    } finally {
        busyAction.value = "";
    }
}

function openUnmount(mount: StorageMount) {
    selectedMount.value = mount;
    showDialog("storage_unmount_modal");
}

async function unmountSelected() {
    if (!selectedMount.value) return;
    busyAction.value = "unmount";
    try {
        const result = await apiFetch<{ unavailable_files: number }>(`/admin/storage/mounts/${selectedMount.value.ID}`, {
            method: "DELETE",
        });
        closeDialog("storage_unmount_modal");
        showSuccess(`Mount detached; ${result.unavailable_files} files are now unavailable`);
        await load();
    } catch (error: any) {
        err.value = errorMessage(error, "Failed to detach storage mount");
    } finally {
        busyAction.value = "";
    }
}

async function remount(mount: StorageMount) {
    busyAction.value = `remount-${mount.ID}`;
    try {
        const result = await apiFetch<ReconnectResult>(`/admin/storage/mounts/${mount.ID}/remount`, { method: "POST" });
        if (result.Warning) {
            err.value = `Mount connected, but its reconnect scan did not finish: ${result.Warning}`;
        } else {
            showSuccess(`Mount connected; ${result.Relinked} matching files relinked`);
        }
        await load();
    } catch (error: any) {
        err.value = errorMessage(error, "Failed to connect storage mount");
    } finally {
        busyAction.value = "";
    }
}

async function checkMount(mount: StorageMount) {
    busyAction.value = `check-${mount.ID}`;
    try {
        await apiFetch(`/admin/storage/mounts/${mount.ID}/check`, { method: "POST" });
        showSuccess(`${mount.Name} is reachable`);
        await load();
    } catch (error: any) {
        err.value = errorMessage(error, "Storage connection check failed");
        await load();
    } finally {
        busyAction.value = "";
    }
}

async function previewReconnect(mount: StorageMount) {
    selectedMount.value = mount;
    reconnectPreview.value = null;
    busyAction.value = `scan-${mount.ID}`;
    try {
        reconnectPreview.value = await apiFetch<ReconnectResult>(`/admin/storage/mounts/${mount.ID}/reconnect`, {
            method: "POST",
            body: { apply: false },
        });
        showDialog("storage_reconnect_modal");
    } catch (error: any) {
        err.value = errorMessage(error, "Failed to scan storage mount");
    } finally {
        busyAction.value = "";
    }
}

async function applyReconnect() {
    if (!selectedMount.value) return;
    busyAction.value = "apply-reconnect";
    try {
        const result = await apiFetch<ReconnectResult>(`/admin/storage/mounts/${selectedMount.value.ID}/reconnect`, {
            method: "POST",
            body: { apply: true },
        });
        closeDialog("storage_reconnect_modal");
        showSuccess(`${result.Relinked} files relinked to ${selectedMount.value.Name}`);
        await load();
    } catch (error: any) {
        err.value = errorMessage(error, "Failed to relink files");
    } finally {
        busyAction.value = "";
    }
}

function poolMounts(pool: StoragePool) {
    return pool.MountIDs.map((id) => overview.value?.Mounts.find((mount) => mount.ID === id)).filter(Boolean) as StorageMount[];
}

function poolAvailableMountCount(pool: StoragePool) {
    return poolMounts(pool).filter((mount) => mount.Mounted).length;
}

function mountStatus(mount: StorageMount) {
    if (!mount.Mounted) return { label: "Detached", className: "badge-ghost" };
    if (mount.LastError) return { label: "Attention", className: "badge-warning" };
    return { label: "Available", className: "badge-success" };
}

function providerLabel(provider: string) {
    return provider === "s3" ? "S3-compatible" : "Local storage";
}

function formatBytes(bytes: number) {
    if (!bytes) return "0 B";
    const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function truncate(value: string, max: number) {
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function isBusy(action: string) {
    return busyAction.value === action;
}

function showDialog(id: string) {
    (document.getElementById(id) as HTMLDialogElement | null)?.showModal();
}

function closeDialog(id: string) {
    (document.getElementById(id) as HTMLDialogElement | null)?.close();
}

async function copyKeyCommand() {
    await navigator.clipboard.writeText("openssl rand -base64 32");
    showSuccess("Command copied");
}

function showSuccess(message: string) {
    successMsg.value = message;
    window.setTimeout(() => {
        if (successMsg.value === message) successMsg.value = "";
    }, 3500);
}

function errorMessage(error: any, fallback: string) {
    const detail = typeof error?.data === "string" ? error.data : error?.data?.message || error?.message;
    return detail ? `${fallback}: ${detail}` : fallback;
}

function apiFetch<T>(path: string, options: Record<string, any> = {}) {
    return $fetch<T>(`${conf.public.apiUrl}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token.value}`,
            ...(options.headers || {}),
        },
    });
}
</script>
