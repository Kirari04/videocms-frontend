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
            <PageHeader title="Storage" description="Connect local or remote storage and route each new upload to one available mount.">
				<NuxtLink to="/my/storage/migrations" class="btn btn-ghost btn-sm gap-2">
					<Icon name="lucide:database-zap" class="h-4 w-4" />
					Migrations
				</NuxtLink>
                <button class="btn btn-ghost btn-sm gap-2" :disabled="isLoading" @click="load">
                    <Icon name="lucide:refresh-cw" class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
                    Reload
                </button>
                <button class="btn btn-primary btn-sm gap-2" :disabled="!overview?.EncryptionConfigured"
                    @click="openCreateMount">
                    <Icon name="lucide:plus" class="h-4 w-4" />
                    Add storage mount
                </button>
            </PageHeader>

            <div v-if="overview && !overview.EncryptionConfigured" role="alert"
                class="mb-5 flex flex-col items-start gap-3 rounded-box border border-warning/35 bg-warning/10 p-4 text-sm sm:flex-row">
                <Icon name="lucide:key-round" class="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <div class="min-w-0 grow">
                    <p class="font-medium">Remote storage credentials need an encryption key</p>
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
                <div v-if="overview.TrafficRecorder?.LastError || overview.TrafficRecorder?.DroppedEvents"
                    role="alert" class="alert alert-warning mb-6 items-start border border-warning/35 bg-warning/10 text-sm">
                    <Icon name="lucide:triangle-alert" class="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                        <p class="font-medium">Delivery statistics need attention</p>
                        <p v-if="overview.TrafficRecorder?.LastError" class="mt-1 text-base-content/75">
                            Playback is unaffected. VideoCMS will keep retrying buffered traffic updates.
                        </p>
                        <p v-if="overview.TrafficRecorder?.DroppedEvents" class="mt-1 text-base-content/75">
                            The displayed totals may be incomplete because
                            {{ formatNumber(overview.TrafficRecorder.DroppedEvents) }} events could not be retained in memory.
                        </p>
                        <p v-if="overview.TrafficRecorder?.LastError"
                            class="mt-2 break-all font-mono text-xs text-base-content/65">
                            Last write error: {{ overview.TrafficRecorder.LastError }}
                        </p>
                    </div>
                </div>
                <section aria-label="Storage summary" class="mb-8 grid gap-3 sm:grid-cols-3">
                    <div class="rounded-box border border-base-300 bg-base-100 p-4">
                        <div class="flex items-center justify-between text-xs font-medium text-base-content/70">
                            <span>Available mounts</span>
                            <Icon name="lucide:hard-drive" class="h-4 w-4" />
                        </div>
                        <p class="mt-2 text-2xl font-semibold tabular-nums">{{ mountedCount }}</p>
                        <p class="mt-1 text-xs text-base-content/70">of {{ overview.Mounts.length }} configured</p>
                    </div>
                    <div class="rounded-box border border-base-300 bg-base-100 p-4">
                        <div class="flex items-center justify-between text-xs font-medium text-base-content/70">
                            <span>Tracked storage</span>
                            <Icon name="lucide:database" class="h-4 w-4" />
                        </div>
                        <p class="mt-2 text-2xl font-semibold tabular-nums">{{ formatBytes(totalUsedBytes) }}</p>
                        <p class="mt-1 text-xs text-base-content/70">across {{ totalFiles }} files</p>
                    </div>
                    <div class="rounded-box border border-base-300 bg-base-100 p-4"
                        :class="totalUnavailableFiles ? 'border-warning/45' : ''">
                        <div class="flex items-center justify-between text-xs font-medium text-base-content/70">
                            <span>Unavailable files</span>
                            <Icon :name="totalUnavailableFiles ? 'lucide:cloud-off' : 'lucide:circle-check'"
                                class="h-4 w-4" :class="totalUnavailableFiles ? 'text-warning' : 'text-success'" />
                        </div>
                        <p class="mt-2 text-2xl font-semibold tabular-nums">{{ totalUnavailableFiles }}</p>
                        <p class="mt-1 text-xs text-base-content/70">
                            {{ totalUnavailableFiles ? 'Can be relinked from a matching mount' : 'All tracked files are reachable' }}
                        </p>
                    </div>
                </section>

				<section aria-labelledby="delivery-traffic-heading"
					class="mb-8 overflow-hidden rounded-box border border-base-300 bg-base-100">
					<div class="flex flex-wrap items-start justify-between gap-3 p-4">
						<div>
							<h2 id="delivery-traffic-heading" class="text-base font-semibold">Delivery traffic</h2>
							<p class="mt-0.5 text-sm text-base-content/70">
								Bytes served from configured storage during the last {{ overview.TrafficWindowDays }} days.
							</p>
						</div>
						<div v-if="overview.Traffic.Requests" class="text-right">
							<p class="text-lg font-semibold tabular-nums">{{ formatBytes(overview.Traffic.Bytes) }}</p>
							<p class="text-xs text-base-content/70">{{ formatRequests(overview.Traffic.Requests) }}</p>
						</div>
					</div>
					<div v-if="overview.Traffic.Requests" class="border-t border-base-300 p-4">
						<div class="flex h-2 overflow-hidden rounded-full bg-base-300"
							role="img" :aria-label="`${formatPercent(cacheShare(overview.Traffic))} served from read cache`">
							<span class="bg-base-content/25" :style="{ width: `${100 - cacheShare(overview.Traffic)}%` }"></span>
							<span class="bg-primary" :style="{ width: `${cacheShare(overview.Traffic)}%` }"></span>
						</div>
						<div class="mt-4 grid gap-4 sm:grid-cols-2 sm:divide-x sm:divide-base-300">
							<div class="flex items-center justify-between gap-4 sm:pr-4">
								<div class="flex items-center gap-2 text-sm font-medium">
									<span class="h-2 w-2 rounded-full bg-base-content/25"></span>
									Primary storage
								</div>
								<div class="text-right">
									<p class="text-sm font-medium tabular-nums">{{ formatBytes(overview.Traffic.OriginBytes) }}</p>
									<p class="text-xs text-base-content/70">{{ formatRequests(overview.Traffic.OriginRequests) }}</p>
								</div>
							</div>
							<div class="flex items-center justify-between gap-4 sm:pl-4">
								<div class="flex items-center gap-2 text-sm font-medium">
									<span class="h-2 w-2 rounded-full bg-primary"></span>
									Read cache
								</div>
								<div class="text-right">
									<p class="text-sm font-medium tabular-nums">{{ formatBytes(overview.Traffic.CacheBytes) }}</p>
									<p class="text-xs text-base-content/70">{{ formatRequests(overview.Traffic.CacheRequests) }}</p>
								</div>
							</div>
						</div>
					</div>
					<div v-else class="flex items-center gap-2 border-t border-base-300 px-4 py-5 text-sm text-base-content/70">
						<Icon name="lucide:activity" class="h-4 w-4 shrink-0" />
						No attributed playback traffic yet. New storage reads will appear here.
					</div>
				</section>

                <section class="mb-8" aria-labelledby="pools-heading">
                    <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h2 id="pools-heading" class="text-base font-semibold">Storage pools</h2>
                            <p class="mt-0.5 text-sm text-base-content/70">
                                Primary mounts store files. Optional read caches keep disposable playback copies on demand.
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
                                    <p class="mt-1 text-xs text-base-content/70">
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
                                            :class="mount.Available ? 'bg-success' : 'bg-warning'"></span>
                                        <span class="truncate font-medium">{{ mount.Name }}</span>
                                        <span v-if="!mount.Available" class="text-base-content/70">
                                            {{ mount.Mounted ? 'unavailable' : 'detached' }}
                                        </span>
                                    </div>
                                    <span v-if="!poolMounts(pool).length" class="py-2 text-xs text-error">No members</span>
                                </div>
                            </div>
                            <div v-if="poolCacheMounts(pool).length" class="mt-3 flex items-start gap-2 border-t border-base-300 pt-3">
                                <div class="flex h-8 w-10 shrink-0 items-center justify-center text-base-content/70">
                                    <Icon name="lucide:database-zap" class="h-4 w-4" />
                                </div>
                                <div class="min-w-0 grow">
                                    <p class="text-xs font-medium">Read cache</p>
                                    <div class="mt-1.5 flex flex-wrap gap-2">
                                        <div v-for="cache in poolCacheMounts(pool)" :key="cache.MountID"
                                            class="flex min-w-0 items-center gap-2 rounded-field bg-base-200 px-2.5 py-2 text-xs">
                                            <span class="h-2 w-2 shrink-0 rounded-full"
                                                :class="cacheMount(cache)?.Available ? 'bg-success' : 'bg-warning'"></span>
                                            <span class="truncate font-medium">{{ cacheMount(cache)?.Name || 'Unknown mount' }}</span>
                                            <span class="tabular-nums text-base-content/70">
                                                {{ formatBytes(cache.UsedBytes) }} / {{ formatBytes(cache.MaxBytes) }}
                                            </span>
                                        </div>
                                    </div>
                                    <p class="mt-1.5 text-[11px] text-base-content/70">Filled by playback and cleaned automatically.</p>
                                </div>
                            </div>
							<div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-base-300 pt-3 text-xs">
								<span class="text-base-content/70">Delivery · last {{ overview.TrafficWindowDays }} days</span>
								<span v-if="pool.Traffic.Requests" class="tabular-nums">
									<span class="font-medium">{{ formatBytes(pool.Traffic.Bytes) }}</span>
									<span class="text-base-content/70"> · {{ formatRequests(pool.Traffic.Requests) }} · {{ formatPercent(cacheShare(pool.Traffic)) }} cached</span>
								</span>
								<span v-else class="text-base-content/70">No attributed traffic</span>
							</div>
                            <p v-if="poolAvailableMountCount(pool) === 0"
                                class="mt-3 flex items-center gap-1.5 text-xs text-warning">
                                <Icon name="lucide:triangle-alert" class="h-3.5 w-3.5" />
                                No available primary mounts. New uploads routed here will fail until one is healthy.
                            </p>
                        </article>
                    </div>
                </section>

                <section aria-labelledby="mounts-heading">
                    <div class="mb-3">
                        <h2 id="mounts-heading" class="text-base font-semibold">Storage mounts</h2>
                        <p class="mt-0.5 text-sm text-base-content/70">
                            Detaching a mount keeps its objects and database identity, so the same or migrated storage can be connected later.
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
									<th class="font-medium">Delivery traffic</th>
                                    <th class="text-right font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="mount in overview.Mounts" :key="mount.ID" class="border-base-300 align-top">
                                    <td>
                                        <div class="flex items-center gap-3">
                                            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-field bg-base-200">
                                                <Icon :name="mountIcon(mount.Provider)"
                                                    class="h-4 w-4" />
                                            </div>
                                            <div class="min-w-0">
                                                <div class="flex flex-wrap items-center gap-1.5">
                                                    <span class="font-medium">{{ mount.Name }}</span>
                                                    <span v-if="mount.System" class="badge badge-ghost badge-xs">Built in</span>
                                                </div>
                                                <span class="font-mono text-[11px] text-base-content/70">{{ mount.UUID }}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="max-w-xs">
                                        <template v-if="mount.Configuration">
                                            <template v-if="mount.Provider === 'sftp'">
                                                <p class="truncate text-sm font-medium">
                                                    {{ sftpConfiguration(mount).username }}@{{ sftpConfiguration(mount).host }}:{{ sftpConfiguration(mount).port }}
                                                </p>
                                                <p class="truncate font-mono text-xs text-base-content/70">
                                                    {{ sftpConfiguration(mount).root }}
                                                </p>
                                            </template>
                                            <template v-else>
                                                <p class="truncate text-sm font-medium">{{ s3Configuration(mount).bucket }}</p>
                                                <p class="truncate text-xs text-base-content/70">
                                                    {{ s3Configuration(mount).endpoint || `AWS · ${s3Configuration(mount).region}` }}
                                                    <template v-if="s3Configuration(mount).prefix"> · /{{ s3Configuration(mount).prefix }}</template>
                                                </p>
                                            </template>
                                        </template>
                                        <span v-else class="text-sm text-base-content/70">Server filesystem</span>
                                    </td>
                                    <td>
                                        <span class="badge badge-sm gap-1.5" :class="mountStatus(mount).className">
                                            <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
                                            {{ mountStatus(mount).label }}
                                        </span>
                                        <p v-if="mount.Mounted && mount.LastError" class="mt-1 max-w-xs text-xs text-error" :title="mount.LastError">
                                            {{ truncate(mount.LastError, 90) }}
                                        </p>
                                        <p v-else-if="!mount.Mounted && mount.UnmountedAt" class="mt-1 text-[11px] text-base-content/70">
                                            Detached {{ formatDate(mount.UnmountedAt) }}
                                        </p>
                                        <p v-else-if="mount.LastCheckedAt" class="mt-1 text-[11px] text-base-content/70">
                                            Checked {{ formatDate(mount.LastCheckedAt) }}
                                        </p>
                                    </td>
                                    <td>
                                        <p class="text-sm font-medium tabular-nums">{{ formatBytes(mount.UsedBytes) }}</p>
                                        <p class="text-xs text-base-content/70">{{ mount.FileCount }} files</p>
                                        <p v-if="mount.UnavailableFileCount" class="mt-0.5 text-xs text-warning">
                                            {{ mount.UnavailableFileCount }} unavailable
                                        </p>
                                    </td>
									<td>
										<template v-if="mount.Traffic.Requests">
											<p class="text-sm font-medium tabular-nums">{{ formatBytes(mount.Traffic.Bytes) }}</p>
											<p class="text-xs text-base-content/70">
												{{ formatRequests(mount.Traffic.Requests) }} · {{ overview.TrafficWindowDays }} days
											</p>
											<p v-if="mount.Traffic.CacheBytes && mount.Traffic.OriginBytes"
												class="mt-0.5 text-[11px] text-base-content/70">
												{{ formatBytes(mount.Traffic.CacheBytes) }} cache · {{ formatBytes(mount.Traffic.OriginBytes) }} primary
											</p>
											<p v-else-if="mount.Traffic.CacheBytes" class="mt-0.5 text-[11px] text-primary">Read cache</p>
											<p v-else class="mt-0.5 text-[11px] text-base-content/70">Primary storage</p>
										</template>
										<span v-else class="text-xs text-base-content/70">No attributed traffic</span>
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
                                                <Icon name="lucide:scan-search" class="h-4 w-4"
                                                    :class="{ 'animate-pulse': isBusy(`scan-${mount.ID}`) }" />
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
                                            <button v-if="!mount.Mounted && !mount.System"
                                                class="btn btn-square btn-ghost btn-sm text-error tooltip"
                                                data-tip="Delete mount" aria-label="Delete mount"
                                                :disabled="isBusy('delete-mount')" @click="openDeleteMount(mount)">
                                                <Icon name="lucide:trash-2" class="h-4 w-4" />
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

        <dialog id="storage_mount_modal" class="modal" aria-labelledby="storage-mount-title"
            aria-describedby="storage-mount-description">
            <div class="modal-box w-11/12 max-w-3xl">
                <form method="dialog">
                    <button class="btn btn-square btn-ghost btn-sm absolute top-3 right-3" aria-label="Close">
                        <Icon name="lucide:x" class="h-4 w-4" />
                    </button>
                </form>
                <h3 id="storage-mount-title" class="text-base font-semibold">
                    {{ editingMount ? `Edit ${providerLabel(mountForm.provider)} mount` : 'Add storage mount' }}
                </h3>
                <p id="storage-mount-description" class="mt-1 max-w-[65ch] text-sm text-base-content/70">
                    {{ mountForm.provider === 'sftp'
                        ? 'Connect an existing SFTP folder. Review the server identity and test the complete connection before saving.'
                        : 'Connect an existing bucket. Test the connection before saving; VideoCMS only manages objects under the selected prefix.' }}
                </p>

                <div v-if="editingMount?.Mounted" role="note"
                    class="mt-4 flex items-start gap-2 rounded-field border border-info/35 bg-info/10 p-3 text-sm">
                    <Icon name="lucide:info" class="mt-0.5 h-4 w-4 shrink-0 text-info" />
                    <span>
                        Detach this mount before changing
                        {{ mountForm.provider === 'sftp' ? 'its host, port, username, or remote folder' : 'its bucket, region, endpoint, prefix, or path-style mode' }}.
                        Its name, credentials, and connection security can be changed while mounted.
                    </span>
                </div>

                <form ref="mountSettingsForm" class="mt-5 flex flex-col gap-5" @submit.prevent="saveMount">
                    <fieldset :disabled="isMountFormBusy" class="contents">
                        <div class="grid gap-4 sm:grid-cols-2">
                        <label class="flex flex-col gap-1.5 sm:col-span-2">
                            <span class="text-sm font-medium">Mount name</span>
                            <input v-model.trim="mountForm.name" class="input input-sm w-full" required maxlength="120"
                                placeholder="Primary media storage" />
                        </label>

                        <fieldset v-if="!editingMount" class="sm:col-span-2">
                            <legend class="mb-2 text-sm font-medium">Storage type</legend>
                            <div class="grid gap-2 sm:grid-cols-2">
                                <label v-for="provider in mountProviders" :key="provider.value"
                                    class="flex cursor-pointer items-start gap-3 rounded-field border p-3 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary motion-reduce:transition-none"
                                    :class="mountForm.provider === provider.value ? 'border-primary/55 bg-primary/10' : 'border-base-300 hover:bg-base-200'">
                                    <input v-model="mountForm.provider" type="radio" class="radio radio-primary radio-sm mt-0.5"
                                        name="storage-provider" :value="provider.value" />
                                    <Icon :name="provider.icon" class="mt-0.5 h-4 w-4 shrink-0"
                                        :class="mountForm.provider === provider.value ? 'text-primary' : 'text-base-content/70'" />
                                    <span>
                                        <span class="block text-sm font-medium">{{ provider.label }}</span>
                                        <span class="mt-0.5 block text-xs leading-relaxed text-base-content/70">{{ provider.description }}</span>
                                    </span>
                                </label>
                            </div>
                        </fieldset>
                        <div v-else class="flex flex-wrap items-center gap-2 rounded-field border border-base-300 bg-base-200 px-3 py-2 sm:col-span-2">
                            <Icon :name="mountIcon(mountForm.provider)" class="h-4 w-4 text-base-content/70" />
                            <span class="text-sm font-medium">{{ providerLabel(mountForm.provider) }}</span>
                            <span class="text-xs text-base-content/70">Storage type cannot be changed after creation</span>
                        </div>

                        <template v-if="mountForm.provider === 's3'">
                            <label class="flex flex-col gap-1.5">
                                <span class="text-sm font-medium">Bucket</span>
                                <input v-model.trim="mountForm.bucket" class="input input-sm w-full font-mono" required
                                    :disabled="locationFieldsLocked"
                                    placeholder="videocms-media" />
                            </label>
                            <label class="flex flex-col gap-1.5">
                                <span class="text-sm font-medium">Region</span>
                                <input v-model.trim="mountForm.region" class="input input-sm w-full font-mono" required
                                    :disabled="locationFieldsLocked"
                                    placeholder="us-east-1" />
                            </label>
                            <label class="flex flex-col gap-1.5 sm:col-span-2">
                                <span class="text-sm font-medium">Endpoint <span class="font-normal text-base-content/70">(optional)</span></span>
                                <input v-model.trim="mountForm.endpoint" type="url" class="input input-sm w-full font-mono"
                                    :disabled="locationFieldsLocked"
                                    placeholder="https://s3.example.com" />
                                <span class="text-xs text-base-content/70">Use this for MinIO or another S3-compatible provider.</span>
                            </label>
                            <label class="flex flex-col gap-1.5">
                                <span class="text-sm font-medium">Object prefix <span class="font-normal text-base-content/70">(optional)</span></span>
                                <input v-model.trim="mountForm.prefix" class="input input-sm w-full font-mono"
                                    :disabled="locationFieldsLocked" placeholder="videocms" />
                            </label>
                            <label class="flex cursor-pointer items-center justify-between gap-4 rounded-field border border-base-300 px-3 py-2">
                                <span>
                                    <span class="block text-sm font-medium">Path-style URLs</span>
                                    <span class="block text-xs text-base-content/70">Common for self-hosted S3</span>
                                </span>
                                <input v-model="mountForm.usePathStyle" type="checkbox" class="toggle toggle-primary toggle-sm"
                                    :disabled="locationFieldsLocked" />
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
                        </template>

                        <template v-else>
                            <label class="flex flex-col gap-1.5">
                                <span class="text-sm font-medium">Host</span>
                                <input v-model.trim="mountForm.sftpHost" class="input input-sm w-full font-mono" required
                                    :disabled="locationFieldsLocked" autocomplete="off" placeholder="storage.example.com" />
                            </label>
                            <label class="flex flex-col gap-1.5">
                                <span class="text-sm font-medium">Port</span>
                                <input v-model.number="mountForm.sftpPort" type="number" min="1" max="65535"
                                    class="input input-sm w-full tabular-nums" required :disabled="locationFieldsLocked" />
                            </label>
                            <label class="flex flex-col gap-1.5">
                                <span class="text-sm font-medium">Username</span>
                                <input v-model.trim="mountForm.sftpUsername" class="input input-sm w-full font-mono" required
                                    :disabled="locationFieldsLocked" autocomplete="username" placeholder="u123456" />
                            </label>
                            <label class="flex flex-col gap-1.5">
                                <span class="text-sm font-medium">Remote folder</span>
                                <input v-model.trim="mountForm.sftpRoot" class="input input-sm w-full font-mono" required
                                    :disabled="locationFieldsLocked" placeholder="videocms" />
                                <span class="text-xs text-base-content/70">The folder must already exist and be writable.</span>
                            </label>
                            <fieldset class="sm:col-span-2">
                                <legend class="text-sm font-medium">Server identity</legend>
                                <div class="mt-1.5 rounded-field border border-base-300 bg-base-200/55 p-3">
                                    <div class="flex flex-wrap items-start justify-between gap-3">
                                        <div class="min-w-0">
                                            <p class="text-sm font-medium">Fetch the presented host key</p>
                                            <p class="mt-0.5 max-w-[65ch] text-xs leading-relaxed text-base-content/70">
                                                VideoCMS reads the server identity without sending the username, password, or private key.
                                            </p>
                                        </div>
                                        <button type="button" class="btn btn-outline btn-sm shrink-0 gap-1.5"
                                            :disabled="!canScanSFTPHostKey || isMountFormBusy" @click="scanSFTPHostKey">
                                            <span v-if="isBusy('scan-sftp-host-key')" class="loading loading-spinner loading-xs"></span>
                                            <Icon v-else name="lucide:scan-search" class="h-3.5 w-3.5" />
                                            {{ scannedSFTPHostKey ? 'Scan again' : 'Fetch host key' }}
                                        </button>
                                    </div>

                                    <p v-if="hostKeyScanError" role="alert" class="mt-3 flex items-start gap-2 text-xs text-error">
                                        <Icon name="lucide:circle-alert" class="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                        <span>{{ hostKeyScanError }}</span>
                                    </p>

                                    <div v-if="scannedSFTPHostKey" class="mt-3 border-t border-base-300 pt-3">
                                        <div class="flex flex-wrap items-center gap-2">
                                            <span class="badge badge-ghost badge-sm">{{ hostKeyAlgorithmLabel(scannedSFTPHostKey.algorithm) }}</span>
                                            <code class="min-w-0 break-all font-mono text-xs">{{ scannedSFTPHostKey.fingerprint }}</code>
                                        </div>
                                        <p class="mt-2 max-w-[65ch] text-xs leading-relaxed text-base-content/70">
                                            Compare this fingerprint with your provider or server before trusting it. A first scan alone cannot prove that this is the intended server.
                                        </p>
                                        <div class="mt-3">
                                            <span v-if="scannedSFTPHostKeyTrusted" class="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                                                <Icon name="lucide:shield-check" class="h-4 w-4" />
                                                Trusted for this mount
                                            </span>
                                            <button v-else type="button" class="btn btn-primary btn-sm gap-1.5" @click="trustScannedSFTPHostKey">
                                                <Icon name="lucide:shield-check" class="h-3.5 w-3.5" />
                                                Trust this host key
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div class="mt-3">
                                    <p class="text-sm font-medium">Trusted host keys</p>
                                    <div v-if="trustedSFTPFingerprints().length" class="mt-1.5 overflow-hidden rounded-field border border-base-300">
                                        <div v-for="fingerprint in trustedSFTPFingerprints()" :key="fingerprint"
                                            class="flex items-center gap-2 border-b border-base-300 px-3 py-2 last:border-b-0">
                                            <Icon name="lucide:key-round" class="h-3.5 w-3.5 shrink-0 text-base-content/70" />
                                            <code class="min-w-0 grow break-all font-mono text-xs">{{ fingerprint }}</code>
                                            <button type="button" class="btn btn-square btn-ghost btn-xs shrink-0"
                                                :aria-label="`Stop trusting ${fingerprint}`" title="Remove trusted key"
                                                @click="removeTrustedSFTPFingerprint(fingerprint)">
                                                <Icon name="lucide:x" class="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <p v-else class="mt-1.5 text-xs text-warning">Trust at least one host key before testing the connection.</p>

                                    <details class="mt-2 text-xs">
                                        <summary class="cursor-pointer select-none text-base-content/70 hover:text-base-content">
                                            Add a verified fingerprint manually
                                        </summary>
                                        <div class="mt-2 flex flex-col gap-2 sm:flex-row">
                                            <input v-model.trim="manualSFTPFingerprint" class="input input-sm min-w-0 grow font-mono text-xs"
                                                spellcheck="false" placeholder="SHA256:…" @keydown.enter.prevent="addManualSFTPFingerprint" />
                                            <button type="button" class="btn btn-outline btn-sm shrink-0"
                                                :disabled="!canAddManualSFTPFingerprint" @click="addManualSFTPFingerprint">
                                                Add fingerprint
                                            </button>
                                        </div>
                                        <p v-if="manualSFTPFingerprintError" role="alert" class="mt-1.5 text-error">
                                            {{ manualSFTPFingerprintError }}
                                        </p>
                                        <p v-else class="mt-1.5 text-base-content/70">
                                            Use the complete SHA256 fingerprint supplied by your provider or server administrator.
                                        </p>
                                    </details>
                                </div>
                            </fieldset>
                            <fieldset class="sm:col-span-2">
                                <legend class="mb-2 text-sm font-medium">Authentication method</legend>
                                <div class="join w-full sm:w-auto">
                                    <label class="btn join-item btn-sm grow focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary sm:grow-0"
                                        :class="mountForm.sftpAuthentication === 'password' ? 'btn-primary' : 'btn-outline'">
                                        <input class="sr-only" type="radio" name="sftp-authentication" value="password"
                                            :checked="mountForm.sftpAuthentication === 'password'" @change="selectSFTPAuthentication('password')" />
                                        <Icon name="lucide:key-round" class="h-3.5 w-3.5" />
                                        Password
                                    </label>
                                    <label class="btn join-item btn-sm grow focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary sm:grow-0"
                                        :class="mountForm.sftpAuthentication === 'private_key' ? 'btn-primary' : 'btn-outline'">
                                        <input class="sr-only" type="radio" name="sftp-authentication" value="private_key"
                                            :checked="mountForm.sftpAuthentication === 'private_key'" @change="selectSFTPAuthentication('private_key')" />
                                        <Icon name="lucide:file-key-2" class="h-3.5 w-3.5" />
                                        Private key
                                    </label>
                                </div>
                            </fieldset>
                        </template>
                        </div>

                        <fieldset class="rounded-field border border-base-300 p-4">
                            <legend class="px-1.5 text-sm font-medium">Credentials</legend>
                            <label v-if="editingMount" class="mb-4 flex cursor-pointer items-center justify-between gap-4">
                                <span>
                                    <span class="block text-sm font-medium">Replace saved credentials</span>
                                    <span class="block text-xs text-base-content/70">Leave off to keep the existing encrypted values.</span>
                                </span>
                                <input v-model="mountForm.replaceCredentials" type="checkbox" class="toggle toggle-primary toggle-sm" />
                            </label>
                            <div v-if="(!editingMount || mountForm.replaceCredentials) && mountForm.provider === 's3'" class="grid gap-4 sm:grid-cols-2">
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
                                    <span class="text-sm font-medium">Session token <span class="font-normal text-base-content/70">(optional)</span></span>
                                    <input v-model="mountForm.sessionToken" type="password"
                                        class="input input-sm w-full font-mono" autocomplete="new-password" />
                                </label>
                                <p class="text-xs text-base-content/70 sm:col-span-2">
                                    Leave all credential fields empty to use the server's AWS credential provider chain. Saved values are encrypted and never returned by the API.
                                </p>
                            </div>
                            <div v-else-if="!editingMount || mountForm.replaceCredentials" class="grid gap-4">
                                <label v-if="mountForm.sftpAuthentication === 'password'" class="flex flex-col gap-1.5">
                                    <span class="text-sm font-medium">Password</span>
                                    <input v-model="mountForm.sftpPassword" type="password" class="input input-sm w-full font-mono"
                                        required autocomplete="new-password" />
                                </label>
                                <template v-else>
                                    <label class="flex flex-col gap-1.5">
                                        <span class="text-sm font-medium">Private key</span>
                                        <textarea v-model="mountForm.sftpPrivateKey" class="textarea min-h-40 w-full font-mono text-xs"
                                            required spellcheck="false" autocomplete="off" placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"></textarea>
                                        <span class="text-xs text-base-content/70">Paste the private key used for this mount. It is encrypted before being stored.</span>
                                    </label>
                                    <label class="flex flex-col gap-1.5">
                                        <span class="text-sm font-medium">Private key passphrase <span class="font-normal text-base-content/70">(optional)</span></span>
                                        <input v-model="mountForm.sftpPrivateKeyPassphrase" type="password"
                                            class="input input-sm w-full font-mono" autocomplete="new-password" />
                                    </label>
                                </template>
                            </div>
                        </fieldset>
                    </fieldset>

                    <div v-if="mountTestResult" role="status" aria-live="polite"
                        class="flex items-start gap-2 rounded-field border p-3 text-sm"
                        :class="mountTestResult.kind === 'success' ? 'border-success/35 bg-success/10' : 'border-error/35 bg-error/10'">
                        <Icon :name="mountTestResult.kind === 'success' ? 'lucide:circle-check' : 'lucide:circle-alert'"
                            class="mt-0.5 h-4 w-4 shrink-0"
                            :class="mountTestResult.kind === 'success' ? 'text-success' : 'text-error'" />
                        <span>{{ mountTestResult.message }}</span>
                    </div>

                    <div class="modal-action flex-wrap">
                        <button type="button" class="btn btn-ghost btn-sm" @click="closeDialog('storage_mount_modal')">Cancel</button>
                        <button type="button" class="btn btn-outline btn-sm gap-1.5" :disabled="isMountFormBusy"
                            @click="testMountConfiguration">
                            <span v-if="isBusy('test-mount')" class="loading loading-spinner loading-xs"></span>
                            <Icon v-else name="lucide:activity" class="h-3.5 w-3.5" />
                            Test connection
                        </button>
                        <button type="submit" class="btn btn-primary btn-sm" :disabled="isMountFormBusy">
                            <span v-if="isBusy('save-mount')" class="loading loading-spinner loading-xs"></span>
                            {{ editingMount ? 'Save changes' : 'Add mount' }}
                        </button>
                    </div>
                </form>
            </div>
            <form method="dialog" class="modal-backdrop"><button>close</button></form>
        </dialog>

        <dialog id="storage_pool_modal" class="modal" aria-labelledby="storage-pool-title"
            aria-describedby="storage-pool-description">
            <div class="modal-box max-w-3xl">
                <form method="dialog">
                    <button class="btn btn-square btn-ghost btn-sm absolute top-3 right-3" aria-label="Close">
                        <Icon name="lucide:x" class="h-4 w-4" />
                    </button>
                </form>
                <h3 id="storage-pool-title" class="text-base font-semibold">{{ editingPool ? 'Edit storage pool' : 'Create storage pool' }}</h3>
                <p id="storage-pool-description" class="mt-1 max-w-2xl text-sm text-base-content/70">
                    Choose where new files are stored and which mounts can keep temporary playback copies.
                </p>
                <form class="mt-5 flex flex-col gap-6" @submit.prevent="savePool">
                    <label class="flex flex-col gap-1.5">
                        <span class="text-sm font-medium">Pool name</span>
                        <input v-model.trim="poolForm.name" class="input input-sm w-full" required maxlength="120"
                            placeholder="Remote uploads" />
                    </label>
                    <fieldset>
                        <legend class="text-sm font-medium">Primary storage</legend>
                        <p class="mt-1 text-xs text-base-content/70">Stores the authoritative copy of every file. New uploads use the least-filled available mount.</p>
                        <div class="mt-3 flex flex-col gap-2">
                            <label v-for="mount in overview?.Mounts" :key="mount.ID"
                                class="flex min-h-11 cursor-pointer items-center gap-3 rounded-field border border-base-300 px-3 py-2.5 transition-colors hover:bg-base-200">
                                <input type="checkbox" class="checkbox checkbox-primary checkbox-sm"
                                    :checked="poolForm.primaryMountIds.includes(mount.ID)" @change="togglePrimaryMount(mount.ID)" />
                                <span class="min-w-0 grow">
                                    <span class="block truncate text-sm font-medium">{{ mount.Name }}</span>
                                    <span class="block text-xs text-base-content/70">
                                        {{ mount.Mounted ? providerLabel(mount.Provider) : `${providerLabel(mount.Provider)} · detached` }}
                                    </span>
                                </span>
                                <span class="text-xs tabular-nums text-base-content/70">{{ formatBytes(mount.UsedBytes) }}</span>
                            </label>
                        </div>
                    </fieldset>
                    <fieldset class="border-t border-base-300 pt-5">
                        <legend class="text-sm font-medium">Read cache</legend>
                        <p class="mt-1 max-w-2xl text-xs text-base-content/70">
                            Keeps disposable playback copies to reduce requests to remote storage. Nothing is downloaded until it is watched.
                        </p>
                        <div class="mt-3 flex flex-col gap-2">
                            <div v-for="mount in overview?.Mounts" :key="`cache-${mount.ID}`"
                                class="rounded-field border border-base-300 transition-colors"
                                :class="poolCacheMount(mount.ID) ? 'bg-base-200/60' : ''">
                                <label class="flex min-h-11 items-center gap-3 px-3 py-2.5"
                                    :class="poolForm.primaryMountIds.includes(mount.ID) ? 'cursor-not-allowed opacity-55' : 'cursor-pointer hover:bg-base-200'">
                                    <input type="checkbox" class="checkbox checkbox-primary checkbox-sm"
                                        :checked="Boolean(poolCacheMount(mount.ID))"
                                        :disabled="poolForm.primaryMountIds.includes(mount.ID)"
                                        @change="toggleCacheMount(mount.ID)" />
                                    <span class="min-w-0 grow">
                                        <span class="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                                            <span class="truncate">{{ mount.Name }}</span>
                                            <span v-if="mount.System" class="badge badge-ghost badge-xs">Built in</span>
                                        </span>
                                        <span class="block text-xs text-base-content/70">
                                            {{ poolForm.primaryMountIds.includes(mount.ID) ? 'Already used as primary storage' : providerLabel(mount.Provider) }}
                                        </span>
                                    </span>
                                    <Icon :name="mountIcon(mount.Provider)" class="h-4 w-4 shrink-0 text-base-content/70" />
                                </label>
                                <div v-if="poolCacheMount(mount.ID)" class="border-t border-base-300 px-3 py-3">
                                    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <label class="flex max-w-xs grow flex-col gap-1.5">
                                            <span class="text-xs font-medium">Maximum cache size</span>
                                            <span class="join w-full">
                                                <input type="number" inputmode="decimal" min="0.1" step="0.1" required
                                                    class="input input-sm join-item w-full tabular-nums"
                                                    :value="poolCacheMount(mount.ID)?.maxGiB || ''"
                                                    placeholder="Enter a limit" @input="updateCacheLimit(mount.ID, $event)" />
                                                <span class="join-item flex items-center border border-base-300 bg-base-200 px-3 text-xs">GiB</span>
                                            </span>
                                        </label>
                                        <div v-if="editingCacheMount(mount.ID)" class="text-xs text-base-content/70 sm:text-right">
                                            <p><span class="font-medium text-base-content">{{ formatBytes(editingCacheMount(mount.ID)?.UsedBytes || 0) }}</span> cached</p>
                                            <p v-if="editingCacheMount(mount.ID)?.CapacityKnown">
                                                {{ formatPercent(editingCacheMount(mount.ID)?.FreePercent || 0) }} disk free
                                            </p>
                                        </div>
                                    </div>
                                    <div class="mt-3 flex items-start gap-2 text-xs text-base-content/70">
                                        <Icon name="lucide:shield-check" class="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                        <p>
                                            Cached on demand. Older cached files are removed automatically near the limit.
                                            VideoCMS also preserves 10% free space when this mount reports disk capacity.
                                        </p>
                                    </div>
                                    <p v-if="editingCacheMount(mount.ID)?.LastError" class="mt-2 flex items-start gap-1.5 text-xs text-warning">
                                        <Icon name="lucide:triangle-alert" class="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                        <span>{{ editingCacheMount(mount.ID)?.LastError }}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </fieldset>
                    <label class="flex cursor-pointer items-center justify-between gap-4 rounded-field border border-base-300 px-3 py-2.5">
                        <span>
                            <span class="block text-sm font-medium">Instance default</span>
                            <span class="block text-xs text-base-content/70">Used when a user has no individual override.</span>
                        </span>
                        <input v-model="poolForm.isDefault" type="checkbox" class="toggle toggle-primary toggle-sm" />
                    </label>
                    <div class="modal-action">
                        <button type="button" class="btn btn-ghost btn-sm" @click="closeDialog('storage_pool_modal')">Cancel</button>
                        <button type="submit" class="btn btn-primary btn-sm"
                            :disabled="isBusy('save-pool') || poolForm.primaryMountIds.length === 0 || !cacheLimitsValid">
                            <span v-if="isBusy('save-pool')" class="loading loading-spinner loading-xs"></span>
                            {{ editingPool ? 'Save changes' : 'Create pool' }}
                        </button>
                    </div>
                </form>
            </div>
            <form method="dialog" class="modal-backdrop"><button>close</button></form>
        </dialog>

        <dialog id="storage_unmount_modal" class="modal" aria-labelledby="storage-unmount-title"
            aria-describedby="storage-unmount-description">
            <div class="modal-box max-w-lg">
                <div class="flex items-start gap-3">
                    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
                        <Icon name="lucide:unplug" class="h-4 w-4" />
                    </div>
                    <div>
                        <h3 id="storage-unmount-title" class="text-base font-semibold">Detach {{ selectedMount?.Name }}?</h3>
                        <p id="storage-unmount-description" class="mt-2 text-sm text-base-content/70">
                            {{ selectedMount?.FileCount || 0 }} active files on this mount will become unavailable in VideoCMS.
                            Their stored data will not be deleted.
                        </p>
                        <p class="mt-2 text-sm text-base-content/70">
                            You can edit and mount it again later, or connect migrated storage and scan it to relink matching file IDs.
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

        <dialog id="storage_mount_delete_modal" class="modal" aria-labelledby="storage-mount-delete-title"
            aria-describedby="storage-mount-delete-description">
            <div class="modal-box max-w-lg">
                <div class="flex items-start gap-3">
                    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-error/15 text-error">
                        <Icon name="lucide:trash-2" class="h-4 w-4" />
                    </div>
                    <div>
                        <h3 id="storage-mount-delete-title" class="text-base font-semibold">
                            Delete {{ selectedMount?.Name }}?
                        </h3>
                        <p id="storage-mount-delete-description" class="mt-2 text-sm text-base-content/70">
                            VideoCMS will permanently delete this mount's saved configuration and encrypted credentials.
                            Data in the connected storage will not be deleted.
                        </p>
                        <p class="mt-2 text-sm text-base-content/70">
                            {{ selectedMount?.UnavailableFileCount || 0 }} unavailable
                            {{ selectedMount?.UnavailableFileCount === 1 ? 'file record will' : 'file records will' }}
                            keep their previous storage ID and can be reconnected from a matching mount later.
                        </p>
                        <p v-if="selectedMountPoolCount" class="mt-2 text-sm text-base-content/70">
                            The mount will also be removed from {{ selectedMountPoolCount }}
                            {{ selectedMountPoolCount === 1 ? 'upload pool' : 'upload pools' }}.
                        </p>
                        <p v-if="selectedMountEmptyPoolCount" class="mt-2 flex items-start gap-1.5 text-sm text-warning">
                            <Icon name="lucide:triangle-alert" class="mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                                {{ selectedMountEmptyPoolCount }}
                                {{ selectedMountEmptyPoolCount === 1 ? 'pool will have' : 'pools will have' }} no members.
                                Add another mount before routing new uploads there.
                            </span>
                        </p>
                    </div>
                </div>
                <div class="modal-action">
                    <button class="btn btn-ghost btn-sm" @click="closeDialog('storage_mount_delete_modal')">Keep mount</button>
                    <button class="btn btn-error btn-sm" :disabled="isBusy('delete-mount')" @click="deleteSelectedMount">
                        <span v-if="isBusy('delete-mount')" class="loading loading-spinner loading-xs"></span>
                        Delete mount
                    </button>
                </div>
            </div>
            <form method="dialog" class="modal-backdrop"><button>close</button></form>
        </dialog>

        <dialog id="storage_reconnect_modal" class="modal" aria-labelledby="storage-reconnect-title"
            aria-describedby="storage-reconnect-description">
            <div class="modal-box max-w-lg">
                <form method="dialog">
                    <button class="btn btn-square btn-ghost btn-sm absolute top-3 right-3" aria-label="Close">
                        <Icon name="lucide:x" class="h-4 w-4" />
                    </button>
                </form>
                <h3 id="storage-reconnect-title" class="text-base font-semibold">Reconnect files from {{ selectedMount?.Name }}</h3>
                <p id="storage-reconnect-description" class="mt-1 text-sm text-base-content/70">The scan validates unavailable file IDs against their persisted source or completed output manifests in this mount.</p>
                <div class="mt-5 grid grid-cols-2 gap-3">
                    <div class="rounded-field bg-base-200 p-3">
                        <p class="text-xs text-base-content/70">Unavailable scanned</p>
                        <p class="mt-1 text-xl font-semibold tabular-nums">{{ reconnectPreview?.Scanned || 0 }}</p>
                    </div>
                    <div class="rounded-field bg-primary/10 p-3">
                        <p class="text-xs text-base-content/70">Matches found</p>
                        <p class="mt-1 text-xl font-semibold tabular-nums text-primary">{{ reconnectPreview?.Matched || 0 }}</p>
                    </div>
                </div>
                <p class="mt-4 text-sm text-base-content/70">
                    Applying changes only updates matching database records. It does not move, copy, or delete objects. Interrupted apply scans can be retried safely.
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

interface SFTPMountConfiguration {
    host: string;
    port: number;
    username: string;
    root: string;
    authentication: "password" | "private_key";
    host_key_fingerprints: string[];
}

type MountConfiguration = S3MountConfiguration | SFTPMountConfiguration;
type MountProvider = "s3" | "sftp";
type SFTPAuthentication = "password" | "private_key";

interface StorageMount {
    ID: number;
    UUID: string;
    Name: string;
    Provider: string;
    Mounted: boolean;
    Available: boolean;
    System: boolean;
    Configuration?: MountConfiguration;
    CredentialsConfigured: boolean;
    UsedBytes: number;
    FileCount: number;
    UnavailableFileCount: number;
    LastError: string;
    LastCheckedAt?: string | null;
    UnmountedAt?: string | null;
	Traffic: StorageTraffic;
}

interface StoragePool {
    ID: number;
    UUID: string;
    Name: string;
    IsDefault: boolean;
    System: boolean;
    MountIDs: number[];
    PrimaryMountIDs: number[];
    CacheMounts?: StorageCacheMount[];
    UserOverrideCount: number;
	Traffic: StorageTraffic;
}

interface StorageTraffic {
	Bytes: number;
	Requests: number;
	OriginBytes: number;
	OriginRequests: number;
	CacheBytes: number;
	CacheRequests: number;
}

interface StorageCacheMount {
    MountID: number;
    MaxBytes: number;
    UsedBytes: number;
    EntryCount: number;
    CapacityKnown: boolean;
    CapacityTotal: number;
    CapacityFree: number;
    FreePercent: number;
    MinimumFreePct: number;
    LastError: string;
    LastErrorAt?: string | null;
}

interface StorageCacheMountForm {
    mountId: number;
    maxGiB: number;
}

interface StorageOverview {
    EncryptionConfigured: boolean;
    UsedBytes: number;
    FileCount: number;
    UnavailableFileCount: number;
	TrafficWindowDays: number;
	Traffic: StorageTraffic;
	TrafficRecorder?: TrafficRecorderStatus;
    Mounts: StorageMount[];
    Pools: StoragePool[];
}

interface TrafficRecorderStatus {
	PendingBuckets: number;
	DroppedEvents: number;
	FlushFailures: number;
	FlushedRequests: number;
	LastFlushAt?: string | null;
	LastError: string;
}

interface ReconnectResult {
    Scanned: number;
    Matched: number;
    Relinked: number;
    Warning?: string;
}

interface SFTPHostKeyScan {
    host: string;
    port: number;
    algorithm: string;
    fingerprint: string;
}

interface MountTestResult {
    kind: "success" | "error";
    message: string;
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
const mountSettingsForm = ref<HTMLFormElement | null>(null);
const scannedSFTPHostKey = ref<SFTPHostKeyScan | null>(null);
const hostKeyScanError = ref("");
const mountTestResult = ref<MountTestResult | null>(null);
const manualSFTPFingerprint = ref("");

const mountProviders: Array<{ value: MountProvider; label: string; description: string; icon: string }> = [
    { value: "s3", label: "S3-compatible", description: "AWS S3, MinIO, and compatible object storage", icon: "lucide:cloud" },
    { value: "sftp", label: "SFTP", description: "A writable folder on an SFTP server or hosted storage box", icon: "lucide:server" },
];

const mountForm = ref(emptyMountForm());
const poolForm = ref(emptyPoolForm());

const mountedCount = computed(() => overview.value?.Mounts.filter((mount) => mount.Available).length || 0);
const totalUsedBytes = computed(() => overview.value?.UsedBytes || 0);
const totalFiles = computed(() => overview.value?.FileCount || 0);
const totalUnavailableFiles = computed(() => overview.value?.UnavailableFileCount || 0);
const cacheLimitsValid = computed(() => poolForm.value.cacheMounts.every((cache) => Number.isFinite(cache.maxGiB) && cache.maxGiB > 0));
const selectedMountPools = computed(() => {
    if (!selectedMount.value) return [];
    return overview.value?.Pools.filter((pool) =>
        poolPrimaryMountIds(pool).includes(selectedMount.value!.ID)
        || poolCacheMounts(pool).some((cache) => cache.MountID === selectedMount.value!.ID)
    ) || [];
});
const selectedMountPoolCount = computed(() => selectedMountPools.value.length);
const selectedMountEmptyPoolCount = computed(() => selectedMountPools.value.filter((pool) =>
    poolPrimaryMountIds(pool).length === 1 && poolPrimaryMountIds(pool).includes(selectedMount.value!.ID)
).length);
const locationFieldsLocked = computed(() => editingMount.value?.Mounted === true);
const canScanSFTPHostKey = computed(() => Boolean(
    mountForm.value.sftpHost.trim()
    && mountForm.value.sftpPort >= 1
    && mountForm.value.sftpPort <= 65535,
));
const isMountFormBusy = computed(() => ["scan-sftp-host-key", "test-mount", "save-mount"].includes(busyAction.value));
const scannedSFTPHostKeyTrusted = computed(() => {
    if (!scannedSFTPHostKey.value) return false;
    return trustedSFTPFingerprints().includes(scannedSFTPHostKey.value.fingerprint);
});
const manualSFTPFingerprintError = computed(() => {
    const fingerprint = manualSFTPFingerprint.value.trim();
    if (!fingerprint) return "";
    if (!/^SHA256:[A-Za-z0-9+/]{43}$/.test(fingerprint)) return "Enter a complete SHA256 host key fingerprint.";
    if (trustedSFTPFingerprints().includes(fingerprint)) return "This fingerprint is already trusted.";
    return "";
});
const canAddManualSFTPFingerprint = computed(() => Boolean(
    manualSFTPFingerprint.value.trim() && !manualSFTPFingerprintError.value,
));

onMounted(() => {
    if (accountData.value?.Admin) load();
});

watch(accountData, (account) => {
    if (account?.Admin && !overview.value) load();
    else if (account && !account.Admin) navigateTo("/my");
});

watch([
    () => mountForm.value.sftpHost,
    () => mountForm.value.sftpPort,
], () => {
    scannedSFTPHostKey.value = null;
    hostKeyScanError.value = "";
});

watch(mountForm, () => {
    mountTestResult.value = null;
}, { deep: true });

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
        provider: "s3" as MountProvider,
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
        sftpHost: "",
        sftpPort: 22,
        sftpUsername: "",
        sftpRoot: ".",
        sftpAuthentication: "password" as SFTPAuthentication,
        sftpHostKeyFingerprints: "",
        sftpPassword: "",
        sftpPrivateKey: "",
        sftpPrivateKeyPassphrase: "",
    };
}

function emptyPoolForm() {
    return {
        name: "",
        primaryMountIds: [] as number[],
        cacheMounts: [] as StorageCacheMountForm[],
        isDefault: false,
    };
}

function openCreateMount() {
    editingMount.value = null;
    mountForm.value = emptyMountForm();
    resetMountChecks();
    showDialog("storage_mount_modal");
}

function openEditMount(mount: StorageMount) {
    editingMount.value = mount;
    resetMountChecks();
    const provider = mount.Provider as MountProvider;
    mountForm.value = {
        ...emptyMountForm(),
        name: mount.Name,
        provider,
        replaceCredentials: false,
    };
    if (provider === "sftp") {
        const configuration = mount.Configuration as SFTPMountConfiguration | undefined;
        mountForm.value.sftpHost = configuration?.host || "";
        mountForm.value.sftpPort = configuration?.port || 22;
        mountForm.value.sftpUsername = configuration?.username || "";
        mountForm.value.sftpRoot = configuration?.root || ".";
        mountForm.value.sftpAuthentication = configuration?.authentication || "password";
        mountForm.value.sftpHostKeyFingerprints = configuration?.host_key_fingerprints?.join("\n") || "";
    } else {
        const configuration = mount.Configuration as S3MountConfiguration | undefined;
        mountForm.value.bucket = configuration?.bucket || "";
        mountForm.value.region = configuration?.region || "us-east-1";
        mountForm.value.endpoint = configuration?.endpoint || "";
        mountForm.value.prefix = configuration?.prefix || "";
        mountForm.value.usePathStyle = configuration?.use_path_style || false;
        mountForm.value.uploadPartSizeMiB = configuration?.upload_part_size ? configuration.upload_part_size / 1024 / 1024 : 16;
        mountForm.value.uploadConcurrency = configuration?.upload_concurrency || 4;
    }
    showDialog("storage_mount_modal");
}

async function saveMount() {
    if (mountForm.value.provider === "sftp" && !trustedSFTPFingerprints().length) {
        mountTestResult.value = { kind: "error", message: "Fetch and trust the server host key before adding this mount." };
        return;
    }
    busyAction.value = "save-mount";
    err.value = "";
    const payload = buildMountPayload();
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

function buildMountPayload() {
    const payload: Record<string, any> = {
        name: mountForm.value.name,
        provider: mountForm.value.provider,
    };
    if (mountForm.value.provider === "sftp") {
        payload.configuration = {
            host: mountForm.value.sftpHost,
            port: mountForm.value.sftpPort,
            username: mountForm.value.sftpUsername,
            root: mountForm.value.sftpRoot,
            authentication: mountForm.value.sftpAuthentication,
            host_key_fingerprints: trustedSFTPFingerprints(),
        };
        if (!editingMount.value || mountForm.value.replaceCredentials) {
            payload.credentials = mountForm.value.sftpAuthentication === "password"
                ? { password: mountForm.value.sftpPassword }
                : {
                    private_key: mountForm.value.sftpPrivateKey,
                    private_key_passphrase: mountForm.value.sftpPrivateKeyPassphrase,
                };
        }
    } else {
        payload.configuration = {
            bucket: mountForm.value.bucket,
            region: mountForm.value.region,
            endpoint: mountForm.value.endpoint,
            prefix: mountForm.value.prefix,
            use_path_style: mountForm.value.usePathStyle,
            upload_part_size: Math.round(mountForm.value.uploadPartSizeMiB * 1024 * 1024),
            upload_concurrency: mountForm.value.uploadConcurrency,
        };
        if (!editingMount.value || mountForm.value.replaceCredentials) {
            payload.credentials = {
                access_key_id: mountForm.value.accessKeyId,
                secret_access_key: mountForm.value.secretAccessKey,
                session_token: mountForm.value.sessionToken,
            };
        }
    }
    return payload;
}

async function scanSFTPHostKey() {
    if (!canScanSFTPHostKey.value) return;
    busyAction.value = "scan-sftp-host-key";
    hostKeyScanError.value = "";
    scannedSFTPHostKey.value = null;
    try {
        scannedSFTPHostKey.value = await apiFetch<SFTPHostKeyScan>("/admin/storage/sftp/host-key", {
            method: "POST",
            body: { host: mountForm.value.sftpHost, port: mountForm.value.sftpPort },
        });
    } catch (error: any) {
        hostKeyScanError.value = errorMessage(error, "Could not fetch the host key");
    } finally {
        busyAction.value = "";
    }
}

function trustScannedSFTPHostKey() {
    const fingerprint = scannedSFTPHostKey.value?.fingerprint;
    if (!fingerprint) return;
    const fingerprints = trustedSFTPFingerprints();
    if (!fingerprints.includes(fingerprint)) fingerprints.push(fingerprint);
    mountForm.value.sftpHostKeyFingerprints = fingerprints.join("\n");
}

function addManualSFTPFingerprint() {
    if (!canAddManualSFTPFingerprint.value) return;
    const fingerprints = trustedSFTPFingerprints();
    fingerprints.push(manualSFTPFingerprint.value.trim());
    mountForm.value.sftpHostKeyFingerprints = fingerprints.join("\n");
    manualSFTPFingerprint.value = "";
}

function removeTrustedSFTPFingerprint(fingerprint: string) {
    mountForm.value.sftpHostKeyFingerprints = trustedSFTPFingerprints()
        .filter((trusted) => trusted !== fingerprint)
        .join("\n");
}

async function testMountConfiguration() {
    if (!mountSettingsForm.value?.reportValidity()) return;
    if (mountForm.value.provider === "sftp" && !trustedSFTPFingerprints().length) {
        mountTestResult.value = { kind: "error", message: "Fetch and trust the server host key before testing the connection." };
        return;
    }
    busyAction.value = "test-mount";
    mountTestResult.value = null;
    try {
        await apiFetch("/admin/storage/mounts/test", {
            method: "POST",
            body: {
                ...buildMountPayload(),
                mount_id: editingMount.value?.ID || 0,
            },
        });
        mountTestResult.value = {
            kind: "success",
            message: mountForm.value.provider === "sftp"
                ? "Connection successful. VideoCMS created, safely replaced, read, and removed a test file. Nothing was saved."
                : "Connection successful. VideoCMS can access this bucket. Nothing was saved.",
        };
    } catch (error: any) {
        mountTestResult.value = { kind: "error", message: errorMessage(error, "Connection test failed") };
    } finally {
        busyAction.value = "";
    }
}

function trustedSFTPFingerprints() {
    return mountForm.value.sftpHostKeyFingerprints
        .split(/\r?\n/)
        .map((fingerprint) => fingerprint.trim())
        .filter(Boolean);
}

function hostKeyAlgorithmLabel(algorithm: string) {
    const labels: Record<string, string> = {
        "ssh-ed25519": "ED25519",
        "ssh-rsa": "RSA",
        "ecdsa-sha2-nistp256": "ECDSA P-256",
        "ecdsa-sha2-nistp384": "ECDSA P-384",
        "ecdsa-sha2-nistp521": "ECDSA P-521",
    };
    return labels[algorithm] || algorithm;
}

function resetMountChecks() {
    scannedSFTPHostKey.value = null;
    hostKeyScanError.value = "";
    mountTestResult.value = null;
    manualSFTPFingerprint.value = "";
}

function openCreatePool() {
    editingPool.value = null;
    poolForm.value = emptyPoolForm();
    showDialog("storage_pool_modal");
}

function openEditPool(pool: StoragePool) {
    editingPool.value = pool;
    poolForm.value = {
        name: pool.Name,
        primaryMountIds: [...poolPrimaryMountIds(pool)],
        cacheMounts: poolCacheMounts(pool).map((cache) => ({
            mountId: cache.MountID,
            maxGiB: cache.MaxBytes / Math.pow(1024, 3),
        })),
        isDefault: pool.IsDefault,
    };
    showDialog("storage_pool_modal");
}

async function savePool() {
    busyAction.value = "save-pool";
    err.value = "";
    const payload = {
        name: poolForm.value.name,
        primary_mount_ids: poolForm.value.primaryMountIds,
        cache_mounts: poolForm.value.cacheMounts.map((cache) => ({
            mount_id: cache.mountId,
            max_bytes: Math.round(cache.maxGiB * Math.pow(1024, 3)),
        })),
        is_default: poolForm.value.isDefault,
    };
    try {
        if (editingPool.value) {
            await apiFetch(`/admin/storage/pools/${editingPool.value.ID}`, { method: "PUT", body: payload });
            showSuccess("Storage pool updated");
        } else {
            await apiFetch("/admin/storage/pools", { method: "POST", body: payload });
            showSuccess("Storage pool created");
        }
        closeDialog("storage_pool_modal");
        await load();
    } catch (error: any) {
        err.value = errorMessage(error, "Failed to save storage pool");
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
    if (!confirm(`Delete the storage pool “${pool.Name}”?${impact} Existing files will not move.`)) return;
    busyAction.value = `pool-delete-${pool.ID}`;
    try {
        await apiFetch(`/admin/storage/pools/${pool.ID}`, { method: "DELETE" });
        showSuccess("Storage pool deleted");
        await load();
    } catch (error: any) {
        err.value = errorMessage(error, "Failed to delete storage pool");
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

function openDeleteMount(mount: StorageMount) {
    selectedMount.value = mount;
    showDialog("storage_mount_delete_modal");
}

async function deleteSelectedMount() {
    if (!selectedMount.value) return;
    busyAction.value = "delete-mount";
    try {
        const result = await apiFetch<{ unavailable_files: number }>(`/admin/storage/mounts/${selectedMount.value.ID}/forget`, {
            method: "DELETE",
        });
        closeDialog("storage_mount_delete_modal");
        const fileLabel = result.unavailable_files === 1 ? "file record remains" : "file records remain";
        showSuccess(`Mount deleted; ${result.unavailable_files} ${fileLabel} available for reconnection`);
        selectedMount.value = null;
        await load();
    } catch (error: any) {
        err.value = errorMessage(error, "Failed to delete storage mount");
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
    return poolPrimaryMountIds(pool).map((id) => overview.value?.Mounts.find((mount) => mount.ID === id)).filter(Boolean) as StorageMount[];
}

function poolPrimaryMountIds(pool: StoragePool) {
    return pool.PrimaryMountIDs?.length ? pool.PrimaryMountIDs : pool.MountIDs || [];
}

function cacheMount(cache: StorageCacheMount) {
    return overview.value?.Mounts.find((mount) => mount.ID === cache.MountID);
}

function poolCacheMounts(pool: StoragePool) {
    return pool.CacheMounts || [];
}

function poolCacheMount(mountId: number) {
    return poolForm.value.cacheMounts.find((cache) => cache.mountId === mountId);
}

function editingCacheMount(mountId: number) {
    return editingPool.value ? poolCacheMounts(editingPool.value).find((cache) => cache.MountID === mountId) : undefined;
}

function togglePrimaryMount(mountId: number) {
    const index = poolForm.value.primaryMountIds.indexOf(mountId);
    if (index >= 0) {
        poolForm.value.primaryMountIds.splice(index, 1);
        return;
    }
    poolForm.value.cacheMounts = poolForm.value.cacheMounts.filter((cache) => cache.mountId !== mountId);
    poolForm.value.primaryMountIds.push(mountId);
}

function toggleCacheMount(mountId: number) {
    if (poolForm.value.primaryMountIds.includes(mountId)) return;
    const index = poolForm.value.cacheMounts.findIndex((cache) => cache.mountId === mountId);
    if (index >= 0) {
        poolForm.value.cacheMounts.splice(index, 1);
        return;
    }
    poolForm.value.cacheMounts.push({ mountId, maxGiB: 0 });
}

function updateCacheLimit(mountId: number, event: Event) {
    const cache = poolCacheMount(mountId);
    if (!cache) return;
    cache.maxGiB = Number((event.target as HTMLInputElement).value);
}

function poolAvailableMountCount(pool: StoragePool) {
    return poolMounts(pool).filter((mount) => mount.Available).length;
}

function mountStatus(mount: StorageMount) {
    if (!mount.Mounted) return { label: "Detached", className: "badge-ghost" };
    if (!mount.Available) return { label: "Unavailable", className: "badge-warning" };
    return { label: "Available", className: "badge-success" };
}

function providerLabel(provider: string) {
    if (provider === "s3") return "S3-compatible";
    if (provider === "sftp") return "SFTP";
    return "Local storage";
}

function mountIcon(provider: string) {
    if (provider === "s3") return "lucide:cloud";
    if (provider === "sftp") return "lucide:server";
    return "lucide:hard-drive";
}

function s3Configuration(mount: StorageMount) {
    return mount.Configuration as S3MountConfiguration;
}

function sftpConfiguration(mount: StorageMount) {
    return mount.Configuration as SFTPMountConfiguration;
}

function selectSFTPAuthentication(authentication: SFTPAuthentication) {
    if (mountForm.value.sftpAuthentication === authentication) return;
    mountForm.value.sftpAuthentication = authentication;
    if (editingMount.value) mountForm.value.replaceCredentials = true;
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

function formatPercent(value: number) {
    return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)}%`;
}

function formatRequests(requests: number) {
	return `${formatNumber(requests)} ${requests === 1 ? "request" : "requests"}`;
}

function formatNumber(value: number) {
	return new Intl.NumberFormat().format(value);
}

function cacheShare(traffic: StorageTraffic) {
	if (!traffic.Bytes) return 0;
	return Math.min(100, Math.max(0, traffic.CacheBytes / traffic.Bytes * 100));
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
    try {
        await navigator.clipboard.writeText("openssl rand -base64 32");
        showSuccess("Command copied");
    } catch {
        err.value = "Could not copy the command. Select it and copy it manually.";
    }
}

function showSuccess(message: string) {
    err.value = "";
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
