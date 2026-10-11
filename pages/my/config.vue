<template>
    <div class="flex flex-col h-full">
        <!-- Notifications -->
        <div class="toast toast-top toast-end z-(--z-toast)">
            <div class="alert alert-error" role="alert" v-if="err">
                <Icon name="lucide:alert-circle" class="stroke-current shrink-0 h-6 w-6" />
                <div>{{ err }}</div>
            </div>
            <div class="alert alert-success" role="status" v-if="successMsg">
                <Icon name="lucide:check-circle" class="stroke-current shrink-0 h-6 w-6" />
                <div>{{ successMsg }}</div>
            </div>
        </div>

        <!-- Access Denied -->
        <div v-if="accountData && !accountData.Admin" role="alert" class="alert alert-error">
            <Icon name="lucide:shield-alert" class="h-5 w-5 shrink-0" />
            <span>You don't have access to this page.</span>
        </div>

        <!-- Main Content -->
        <div v-if="accountData?.Admin && datas" :inert="isEndingSession" class="flex flex-col gap-5">

            <PageHeader title="Config" description="Instance settings, encoding quality, and security." class="pb-0">
                <button @click="load()" :disabled="isLoading" class="btn btn-ghost btn-sm gap-2">
                    <Icon name="lucide:refresh-cw" class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
                    Reload
                </button>
                <button @click="update()" :disabled="isLoading || !isDirty" class="btn btn-primary btn-sm min-w-32 gap-2">
                    <span v-if="isLoading" class="loading loading-spinner loading-xs"></span>
                    <Icon v-else name="lucide:save" class="h-4 w-4" />
                    {{ isDirty ? 'Save changes' : 'Saved' }}
                </button>
            </PageHeader>

            <!-- Unsaved Changes Alert -->
            <transition name="fade">
                <div v-if="isDirty" role="status" class="alert alert-warning flex items-center">
                    <Icon name="lucide:alert-triangle" class="w-5 h-5" />
                    <span class="font-medium">You have unsaved changes. Don't forget to save before leaving.</span>
                </div>
            </transition>

            <!-- Tabs Navigation -->
            <SettingsTabs v-model="activeTab" :tabs="tabs" id-prefix="config" label="Configuration sections" />

            <!-- Tab Content -->
            <div class="rounded-box border border-base-300 bg-base-100 p-5 md:p-6 min-h-100">

                <!-- General Tab -->
                <div v-show="activeTab === 'general'" id="config-panel-general" role="tabpanel" aria-labelledby="config-tab-general" tabindex="0" class="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                    <div class="form-control w-full">
                        <label class="label" for="config-AppName"><span class="label-text font-medium text-base-content">App Name</span></label>
                        <input v-model="datas.AppName" id="config-AppName" type="text" class="input input-bordered w-full" maxlength="120" />
                        <label class="label"><span class="label-text-alt whitespace-normal">Displayed in the top left corner</span></label>
                    </div>

                    <div class="form-control w-full">
                        <label class="label" for="config-BaseUrl"><span class="label-text font-medium text-base-content">Base URL</span></label>
                        <input v-model="datas.BaseUrl" id="config-BaseUrl" type="url" class="input input-bordered w-full" maxlength="255" />
                        <label class="label"><span class="label-text-alt whitespace-normal">Public URL of this API server</span></label>
                    </div>

                    <div class="col-span-1 md:col-span-2 divider">Homepage demo</div>

                    <div class="form-control w-full">
                        <label class="label" for="config-ProjectExampleVideo"><span class="label-text font-medium text-base-content">Example Video ID</span></label>
                        <input v-model="datas.ProjectExampleVideo" id="config-ProjectExampleVideo" type="text" class="input input-bordered w-full" maxlength="512" />
                        <label class="label"><span class="label-text-alt whitespace-normal">The ID of the video shown on the homepage as a demo</span></label>
                    </div>
                </div>

                <!-- Security Tab -->
                <div v-show="activeTab === 'security'" id="config-panel-security" role="tabpanel" aria-labelledby="config-tab-security" tabindex="0" class="flex flex-col gap-6 animate-fade-in">
                    <div class="flex flex-col items-start gap-3">
                        <h2 class="text-sm font-medium">Signing keys</h2>
                        <p id="signing-keys-help" class="max-w-prose text-sm text-base-content">Keys are generated securely and stored on the server. Rotating them signs everyone out and resets active playback sessions.</p>
                        <button type="button" class="btn btn-outline" :disabled="isRotatingKeys || isDirty" :aria-describedby="isDirty ? 'signing-keys-help signing-keys-dirty' : 'signing-keys-help'" @click="rotateSigningKeys">
                            {{ isRotatingKeys ? 'Rotating signing keys…' : 'Rotate signing keys' }}
                        </button>
                        <p v-if="isDirty" id="signing-keys-dirty" class="text-sm text-base-content">Save or discard your changes before rotating keys.</p>
                    </div>

                    <div class="form-control w-full">
                        <label class="label" for="config-CorsAllowOrigins"><span class="label-text font-medium text-base-content">CORS Allow Origins</span></label>
                        <input v-model="datas.CorsAllowOrigins" id="config-CorsAllowOrigins" type="text" class="input input-bordered w-full font-mono" placeholder="*" />
                        <label class="label"><span class="label-text-alt whitespace-normal">Comma separated list of allowed origins or * for all</span></label>
                    </div>
                </div>

                <!-- Network Tab -->
                <div v-show="activeTab === 'network'" id="config-panel-network" role="tabpanel" aria-labelledby="config-tab-network" tabindex="0" class="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                    <div class="flex flex-col gap-6">
                        <div class="card border border-base-300 bg-base-100">
                            <div class="card-body p-6">
                                <h3 class="card-title text-base mb-2">Trusted Proxies & CDNs</h3>
                                <p class="text-xs opacity-70 mb-4">Correctly identify visitor IPs when behind proxies.</p>

                                <div class="form-control w-full">
                                    <label class="label w-full cursor-pointer justify-between gap-4">
                                        <div class="flex flex-col">
                                            <span class="label-text font-medium text-base-content">Cloudflare</span>
                                            <span class="text-xs text-base-content/60">Auto-fetch IP ranges</span>
                                        </div>
                                        <input type="checkbox" class="toggle toggle-primary" :checked="String(datas.CloudflareEnabled) === 'true'"
                                               @change="updateBool('CloudflareEnabled', $event)" />
                                    </label>
                                </div>

                                <div class="divider my-1"></div>

                                <div class="form-control w-full">
                                    <label class="label w-full cursor-pointer justify-between gap-4">
                                        <div class="flex flex-col">
                                            <span class="label-text font-medium text-base-content">BunnyCDN</span>
                                            <span class="text-xs text-base-content/60">Auto-fetch IP ranges</span>
                                        </div>
                                        <input type="checkbox" class="toggle toggle-primary" :checked="String(datas.BunnyCDNEnabled) === 'true'"
                                               @change="updateBool('BunnyCDNEnabled', $event)" />
                                    </label>
                                </div>

                                <div class="divider my-1"></div>

                                <div class="form-control w-full">
                                    <label class="label w-full cursor-pointer justify-between gap-4">
                                        <div class="flex flex-col">
                                            <span class="label-text font-medium text-base-content">Fastly</span>
                                            <span class="text-xs text-base-content/60">Auto-fetch IP ranges</span>
                                        </div>
                                        <input type="checkbox" class="toggle toggle-primary" :checked="String(datas.FastlyEnabled) === 'true'"
                                               @change="updateBool('FastlyEnabled', $event)" />
                                    </label>
                                </div>

                                <div class="divider my-1"></div>

                                <div class="form-control w-full">
                                    <label class="label w-full cursor-pointer justify-between gap-4">
                                        <div class="flex flex-col">
                                            <span class="label-text font-medium text-base-content">KeyCDN</span>
                                            <span class="text-xs text-base-content/60">Auto-fetch IP ranges</span>
                                        </div>
                                        <input type="checkbox" class="toggle toggle-primary" :checked="String(datas.KeyCDNEnabled) === 'true'"
                                               @change="updateBool('KeyCDNEnabled', $event)" />
                                    </label>
                                </div>

                                <div class="divider my-1"></div>

                                <div class="form-control w-full">
                                    <label class="label w-full cursor-pointer justify-between gap-4">
                                        <div class="flex flex-col">
                                            <span class="label-text font-medium text-base-content">Trust Local Traffic</span>
                                            <span class="text-xs text-base-content/60">Private, Loopback & Link-Local</span>
                                        </div>
                                        <input type="checkbox" class="toggle toggle-primary" :checked="String(datas.TrustLocalTraffic) === 'true'"
                                               @change="updateBool('TrustLocalTraffic', $event)" />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col gap-6">
                        <div class="card border border-base-300 bg-base-100">
                            <div class="card-body p-6">
                                <h3 class="card-title text-base mb-2">Manual Configuration</h3>

                                <div class="form-control w-full">
                                    <label class="label" for="config-TrustedProxies"><span class="label-text font-medium text-base-content">Trusted Proxies</span></label>
                                    <textarea v-model="datas.TrustedProxies" id="config-TrustedProxies" class="textarea textarea-bordered h-32 font-mono text-xs w-full"
                                              placeholder="1.2.3.4, 10.0.0.0/24"></textarea>
                                    <label class="label pt-1"><span class="label-text-alt opacity-70">Comma-separated list of manual IP ranges.</span></label>
                                </div>
                            </div>
                        </div>

                        <div class="alert alert-warning">
                            <Icon name="lucide:refresh-cw" class="w-5 h-5" />
                            <div class="text-xs">Changes to network trust settings require a <strong>server restart</strong> to take full effect.</div>
                        </div>
                    </div>
                </div>

                <!-- Rate Limits Tab -->
                <div v-show="activeTab === 'ratelimit'" id="config-panel-ratelimit" role="tabpanel" aria-labelledby="config-tab-ratelimit" tabindex="0" class="flex flex-col gap-6 animate-fade-in">
                    <div class="card border border-base-300 bg-base-100">
                        <div class="card-body">
                            <div class="flex items-center justify-between gap-4 mb-4">
                                <div class="flex flex-col">
                                    <h3 class="card-title text-base">Master Toggle</h3>
                                    <p class="text-sm opacity-70">Enable or disable all rate limiting across the application.</p>
                                </div>
                                <input type="checkbox" class="toggle toggle-primary" :checked="String(datas.RatelimitEnabled) === 'true'"
                                       @change="updateBool('RatelimitEnabled', $event)" />
                            </div>

                            <div v-if="String(datas.RatelimitEnabled) === 'true'" class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div class="col-span-1 md:col-span-2 divider">Global Limits</div>
                                <div class="form-control w-full">
                                    <label class="label" for="config-RatelimitRateGlobal"><span class="label-text font-medium text-base-content">Global Rate (req/s)</span></label>
                                    <input v-model="datas.RatelimitRateGlobal" id="config-RatelimitRateGlobal" type="text" class="input input-bordered w-full" />
                                </div>
                                <div class="form-control w-full">
                                    <label class="label" for="config-RatelimitBurstGlobal"><span class="label-text font-medium text-base-content">Global Burst</span></label>
                                    <input v-model="datas.RatelimitBurstGlobal" id="config-RatelimitBurstGlobal" type="text" class="input input-bordered w-full" />
                                </div>

                                <div class="col-span-1 md:col-span-2 divider">Authentication (/api/auth/*)</div>
                                <div class="form-control w-full">
                                    <label class="label" for="config-RatelimitRateAuth"><span class="label-text font-medium text-base-content">Auth Rate (req/s)</span></label>
                                    <input v-model="datas.RatelimitRateAuth" id="config-RatelimitRateAuth" type="text" class="input input-bordered w-full" />
                                </div>
                                <div class="form-control w-full">
                                    <label class="label" for="config-RatelimitBurstAuth"><span class="label-text font-medium text-base-content">Auth Burst</span></label>
                                    <input v-model="datas.RatelimitBurstAuth" id="config-RatelimitBurstAuth" type="text" class="input input-bordered w-full" />
                                </div>

                                <div class="col-span-1 md:col-span-2 divider">Admin API (CRUD Ops)</div>
                                <div class="form-control w-full">
                                    <label class="label" for="config-RatelimitRateApi"><span class="label-text font-medium text-base-content">API Rate (req/s)</span></label>
                                    <input v-model="datas.RatelimitRateApi" id="config-RatelimitRateApi" type="text" class="input input-bordered w-full" />
                                </div>
                                <div class="form-control w-full">
                                    <label class="label" for="config-RatelimitBurstApi"><span class="label-text font-medium text-base-content">API Burst</span></label>
                                    <input v-model="datas.RatelimitBurstApi" id="config-RatelimitBurstApi" type="text" class="input input-bordered w-full" />
                                </div>

                                <div class="col-span-1 md:col-span-2 divider">Uploads (/api/uploads)</div>
                                <div class="form-control w-full">
                                    <label class="label" for="config-RatelimitRateUpload"><span class="label-text font-medium text-base-content">Upload Rate (req/s)</span></label>
                                    <input v-model="datas.RatelimitRateUpload" id="config-RatelimitRateUpload" type="text" class="input input-bordered w-full" />
                                </div>
                                <div class="form-control w-full">
                                    <label class="label" for="config-RatelimitBurstUpload"><span class="label-text font-medium text-base-content">Upload Burst</span></label>
                                    <input v-model="datas.RatelimitBurstUpload" id="config-RatelimitBurstUpload" type="text" class="input input-bordered w-full" />
                                </div>

                                <div class="col-span-1 md:col-span-2 divider">Public Web & Player</div>
                                <div class="form-control w-full">
                                    <label class="label" for="config-RatelimitRateWeb"><span class="label-text font-medium text-base-content">Web Rate (req/s)</span></label>
                                    <input v-model="datas.RatelimitRateWeb" id="config-RatelimitRateWeb" type="text" class="input input-bordered w-full" />
                                </div>
                                <div class="form-control w-full">
                                    <label class="label" for="config-RatelimitBurstWeb"><span class="label-text font-medium text-base-content">Web Burst</span></label>
                                    <input v-model="datas.RatelimitBurstWeb" id="config-RatelimitBurstWeb" type="text" class="input input-bordered w-full" />
                                </div>
                            </div>

                            <div v-else class="alert alert-info mt-4">
                                <Icon name="lucide:info" class="w-5 h-5" />
                                <span>Rate limiting is currently disabled. All traffic will be accepted without throttling.</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Functionality Tab -->
                <div v-show="activeTab === 'functionality'" id="config-panel-functionality" role="tabpanel" aria-labelledby="config-tab-functionality" tabindex="0"
                    class="grid min-w-0 grid-cols-1 gap-6 animate-fade-in xl:grid-cols-2">
                    <!-- Core Features -->
                    <div class="card border border-base-300 bg-base-100 h-full min-w-0">
                        <div class="card-body p-4 sm:p-6">
                            <h3 class="card-title text-base mb-2">Core Features</h3>

                            <div class="form-control w-full">
                                <label class="label w-full cursor-pointer items-start justify-between gap-3 whitespace-normal">
                                    <div class="min-w-0 flex flex-1 flex-col whitespace-normal">
                                        <span class="label-text font-medium text-base-content">Encoding</span>
                                        <span class="text-xs leading-5 text-base-content/70">Enable or disable video encoding processing.</span>
                                    </div>
                                    <input type="checkbox" class="toggle toggle-primary mt-0.5 shrink-0" :checked="String(datas.EncodingEnabled) === 'true'"
                                           @change="updateBool('EncodingEnabled', $event)" />
                                </label>
                            </div>

                            <div class="divider my-1"></div>

                            <div class="form-control w-full">
                                <label class="label w-full cursor-pointer items-start justify-between gap-3 whitespace-normal">
                                    <div class="min-w-0 flex flex-1 flex-col whitespace-normal">
                                        <span class="label-text font-medium text-base-content">Upload</span>
                                        <span class="text-xs leading-5 text-base-content/70">Allow users to upload new videos.</span>
                                    </div>
                                    <input type="checkbox" class="toggle toggle-primary mt-0.5 shrink-0" :checked="String(datas.UploadEnabled) === 'true'"
                                           @change="updateBool('UploadEnabled', $event)" />
                                </label>
                            </div>

                            <div class="divider my-1"></div>

                            <div class="form-control w-full">
                                <label class="label w-full cursor-pointer items-start justify-between gap-3 whitespace-normal">
                                    <div class="min-w-0 flex flex-1 flex-col whitespace-normal">
                                        <span class="label-text font-medium text-base-content">Remote Downloads</span>
                                        <span class="text-xs leading-5 text-base-content/70">Allow users to queue server-side downloads. Disabling cancels active and pending remote jobs.</span>
                                    </div>
                                    <input type="checkbox" class="toggle toggle-primary mt-0.5 shrink-0" :checked="String(datas.RemoteDownloadEnabled) === 'true'"
                                           @change="updateBool('RemoteDownloadEnabled', $event)" />
                                </label>
                            </div>

                            <div class="divider my-1"></div>

                            <div class="form-control w-full">
                                <label class="label w-full cursor-pointer items-start justify-between gap-3 whitespace-normal">
                                    <div class="min-w-0 flex flex-1 flex-col whitespace-normal">
                                        <span class="label-text font-medium text-base-content">Download</span>
                                        <span class="text-xs leading-5 text-base-content/70">Allow viewers to prepare and download processed videos. Disabling cancels queued work and removes prepared files.</span>
                                    </div>
                                    <input type="checkbox" class="toggle toggle-primary mt-0.5 shrink-0" :checked="String(datas.DownloadEnabled) === 'true'"
                                           @change="updateBool('DownloadEnabled', $event)" />
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- User Experience -->
                    <div class="card border border-base-300 bg-base-100 h-fit min-w-0">
                        <div class="card-body p-4 sm:p-6">
                            <h3 class="card-title text-base mb-2">User Experience</h3>
                            <div class="form-control w-full">
                                <label class="label w-full cursor-pointer items-start justify-between gap-3 whitespace-normal">
                                    <div class="min-w-0 flex flex-1 flex-col whitespace-normal">
                                        <span class="label-text font-medium text-base-content">Continue Watching</span>
                                        <span class="text-xs leading-5 text-base-content/70">Show a popup to resume playback where left off.</span>
                                    </div>
                                    <input type="checkbox" class="toggle toggle-primary mt-0.5 shrink-0" :checked="String(datas.ContinueWatchingPopupEnabled) === 'true'"
                                           @change="updateBool('ContinueWatchingPopupEnabled', $event)" />
                                </label>
                            </div>

                            <div class="divider my-1"></div>

                            <div class="form-control w-full">
                                <label class="label w-full cursor-pointer items-start justify-between gap-3 whitespace-normal">
                                    <div class="min-w-0 flex flex-1 flex-col whitespace-normal">
                                        <span class="label-text font-medium text-base-content">Player V2</span>
                                        <span class="text-xs leading-5 text-base-content/70">Enable the new V2 video player (Vidstack). <span class="text-error font-medium">Note: Does not support ASS subtitles.</span></span>
                                    </div>
                                    <input type="checkbox" class="toggle toggle-primary mt-0.5 shrink-0" :checked="String(datas.PlayerV2Enabled) === 'true'"
                                           @change="updateBool('PlayerV2Enabled', $event)" />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quality Tab -->
                <div v-show="activeTab === 'quality'" id="config-panel-quality" role="tabpanel" aria-labelledby="config-tab-quality" tabindex="0" class="flex flex-col gap-6 animate-fade-in">
                    <div class="alert border-base-300 bg-base-100">
                        <Icon name="lucide:info" class="w-5 h-5" />
                        <div class="text-sm">
                            <p class="font-bold">Encoding Strategy</p>
                            <p><strong>CRF (Constant Rate Factor):</strong> Controls quality (0-51). Lower is better. 18-28 is standard.</p>
                            <p><strong>Bitrate Cap:</strong> Limits the maximum bandwidth used, useful for streaming constraints.</p>
                        </div>
                    </div>

                     <div class="form-control w-full">
                        <label class="label" for="config-MaxFramerate"><span class="label-text font-medium text-base-content">Global Max Framerate</span></label>
                        <input v-model="datas.MaxFramerate" id="config-MaxFramerate" type="text" class="input input-bordered w-full" />
                        <label class="label"><span class="label-text-alt whitespace-normal">Videos with higher FPS will be capped to this value.</span></label>
                    </div>

                    <div class="divider">Resolutions</div>

                    <!-- Changed grid to single column to avoid accordion layout issues -->
                    <div class="flex flex-col gap-3">
                        <div v-for="res in resolutions" :key="res"
                             class="collapse collapse-arrow border border-base-300 bg-base-100 rounded-box transition-all"
                             :class="{'border-primary/50': String((datas as any)[`EncodeHls${res}`]) === 'true'}">
                            <input type="checkbox" />
                            <div class="collapse-title flex items-center justify-between gap-4 pr-12 text-base font-medium">
                                <div class="flex items-center gap-3">
                                    <span>{{ res }}</span>
                                    <span v-if="String((datas as any)[`EncodeHls${res}`]) === 'true'" class="badge badge-primary badge-sm">Enabled</span>
                                    <span v-else class="badge badge-ghost badge-sm">Disabled</span>
                                </div>
                                <input type="checkbox" class="toggle toggle-primary z-10"
                                       :checked="String((datas as any)[`EncodeHls${res}`]) === 'true'"
                                       @change="updateBool(`EncodeHls${res}` as any, $event)"
                                       @click.stop />
                            </div>
                            <div class="collapse-content">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    <div class="form-control w-full">
                                        <label class="label"><span class="label-text font-medium text-base-content">Bitrate Cap</span></label>
                                        <input :value="(datas as any)[`Hls${res}VideoBitrate`]"
                                               @input="e => (datas as any)[`Hls${res}VideoBitrate`] = (e.target as HTMLInputElement).value"
                                               type="text" class="input input-bordered w-full" placeholder="e.g. 5000k" />
                                        <label class="label">
                                            <span class="label-text-alt whitespace-normal text-base-content/70">
                                                FFmpeg syntax (e.g. 500k, 2M). <br>
                                                <span class="font-semibold text-primary">Recommended: {{ getBitrateRecommendation(res) }}</span>
                                            </span>
                                        </label>
                                    </div>
                                    <div class="form-control w-full">
                                        <div class="flex justify-between items-center mb-2">
                                            <span class="label-text font-medium text-base-content">CRF (Quality)</span>
                                            <span class="badge badge-ghost font-mono tabular-nums">{{ (datas as any)[`Hls${res}Crf`] }}</span>
                                        </div>
                                        <input :value="(datas as any)[`Hls${res}Crf`]"
                                               @input="e => (datas as any)[`Hls${res}Crf`] = (e.target as HTMLInputElement).value"
                                               type="range" min="0" max="51" class="range range-primary range-sm" />
                                        <div class="w-full flex justify-between text-xs px-1 mt-2 font-medium text-base-content/60">
                                            <span>0 (Lossless)</span>
                                            <span>18 (High)</span>
                                            <span>23 (Default)</span>
                                            <span>28 (Medium)</span>
                                            <span>51 (Low)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Performance Tab -->
                <div v-show="activeTab === 'performance'" id="config-panel-performance" role="tabpanel" aria-labelledby="config-tab-performance" tabindex="0" class="flex flex-col gap-8 animate-fade-in">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div class="card border border-base-300 bg-base-100">
                            <div class="card-body">
                                <h3 class="card-title text-base mb-4">Concurrency</h3>
                                <div class="flex flex-col gap-4">
                                    <div class="form-control w-full">
                                        <label class="label"><span class="label-text font-medium text-base-content">Legacy Encode Limit</span></label>
                                        <input :value="datas.MaxRunningEncodes" @input="e => datas.MaxRunningEncodes = (e.target as HTMLInputElement).value" type="number" class="input input-bordered w-full" min="1" max="10" />
                                        <label class="label"><span class="label-text-alt whitespace-normal">Retained for configuration compatibility. Shared FFmpeg Capacity controls new task scheduling.</span></label>
                                    </div>
                                    <div class="form-control w-full">
                                        <label class="label"><span class="label-text font-medium text-base-content">Shared FFmpeg Capacity</span></label>
                                        <input :value="datas.MaxParallelFFmpegTasks" @input="e => datas.MaxParallelFFmpegTasks = (e.target as HTMLInputElement).value" type="number" class="input input-bordered w-full" min="1" max="16" />
                                        <label class="label"><span class="label-text-alt whitespace-normal">Global CPU budget shared by encodes, thumbnails, and prepared downloads.</span></label>
                                    </div>
                                    <div class="form-control w-full">
                                        <label class="label"><span class="label-text font-medium text-base-content">Max Parallel Remote Downloads</span></label>
                                        <input :value="datas.MaxParallelDownloads" @input="e => datas.MaxParallelDownloads = (e.target as HTMLInputElement).value" type="number" class="input input-bordered w-full" min="1" max="50" />
                                        <label class="label"><span class="label-text-alt whitespace-normal">Simultaneous remote download jobs.</span></label>
                                    </div>
                                    <div class="form-control w-full">
                                        <label class="label"><span class="label-text font-medium text-base-content">Max Parallel Download Preparations</span></label>
                                        <input :value="datas.MaxParallelDownloadPreparations" @input="e => datas.MaxParallelDownloadPreparations = (e.target as HTMLInputElement).value" type="number" class="input input-bordered w-full" min="1" max="8" />
                                        <label class="label"><span class="label-text-alt whitespace-normal">Simultaneous FFmpeg packaging jobs for public downloads.</span></label>
                                    </div>
                                    <div class="form-control w-full">
                                        <label class="label"><span class="label-text font-medium text-base-content">Max Queued Download Preparations</span></label>
                                        <input :value="datas.MaxQueuedDownloadPreparations" @input="e => datas.MaxQueuedDownloadPreparations = (e.target as HTMLInputElement).value" type="number" class="input input-bordered w-full" min="1" max="500" />
                                        <label class="label"><span class="label-text-alt whitespace-normal">Maximum public preparation jobs waiting for a worker.</span></label>
                                    </div>
                                    <div class="form-control w-full">
                                        <label class="label"><span class="label-text font-medium text-base-content">Prepared File Retention (hours)</span></label>
                                        <input :value="datas.DownloadPreparationRetentionHours" @input="e => datas.DownloadPreparationRetentionHours = (e.target as HTMLInputElement).value" type="number" class="input input-bordered w-full" min="1" max="168" />
                                        <label class="label"><span class="label-text-alt whitespace-normal">How long newly prepared files remain available.</span></label>
                                    </div>
                                    <div class="form-control w-full">
                                        <label class="label"><span class="label-text font-medium text-base-content">Remote Download Timeout (s)</span></label>
                                        <input :value="datas.RemoteDownloadTimeout" @input="e => datas.RemoteDownloadTimeout = (e.target as HTMLInputElement).value" type="number" class="input input-bordered w-full" min="0" />
                                        <label class="label"><span class="label-text-alt whitespace-normal">Maximum time allowed for a single download. 0 for no timeout.</span></label>
                                    </div>
                                    <div class="form-control w-full">
                                        <label class="label"><span class="label-text font-medium text-base-content">Max Upload Sessions</span></label>
                                        <input :value="datas.MaxUploadSessions" @input="e => datas.MaxUploadSessions = (e.target as HTMLInputElement).value" type="number" class="input input-bordered w-full" min="1" max="100" />
                                        <label class="label"><span class="label-text-alt whitespace-normal">Maximum number of concurrent uploads allowed.</span></label>
                                    </div>
                                     <div class="form-control w-full">
                                        <label class="label"><span class="label-text font-medium text-base-content">Max Items Multi-Delete</span></label>
                                        <input :value="datas.MaxItemsMultiDelete" @input="e => datas.MaxItemsMultiDelete = (e.target as HTMLInputElement).value" type="number" class="input input-bordered w-full" min="1" max="10000" />
                                        <label class="label"><span class="label-text-alt whitespace-normal">Limit for bulk deletion actions.</span></label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="card border border-base-300 bg-base-100">
                            <div class="card-body">
                                <h3 class="card-title text-base mb-4">Limits & Sizes</h3>

                                <!-- Byte Input: Max Upload Filesize -->
                                <ByteInput v-model="datas.MaxUploadFilesize" label="Max Upload Filesize" />

                                <!-- Byte Input: Max Upload Chunksize -->
                                <ByteInput v-model="datas.MaxUploadChunkSize" label="Max Upload Chunk Size"
                                           hint="Must match proxy limits (e.g. Cloudflare 100MB)" />

                                <!-- Byte Input: Max Post Size -->
                                <ByteInput v-model="datas.MaxPostSize" label="Max Post Size"
                                           hint="Should be larger than chunk size" />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Captcha Tab -->
                <div v-show="activeTab === 'captcha'" id="config-panel-captcha" role="tabpanel" aria-labelledby="config-tab-captcha" tabindex="0" class="flex flex-col gap-6 animate-fade-in">
                    <div class="form-control w-full">
                        <label class="label" for="config-CaptchaType"><span class="label-text font-medium text-base-content">Captcha Type</span></label>
                        <select v-model="datas.CaptchaType" id="config-CaptchaType" class="select select-bordered w-full">
                            <option value="">None (Disabled)</option>
                            <option value="recaptcha">ReCaptcha</option>
                            <option value="hcaptcha">hCaptcha</option>
                            <option value="turnstile">Turnstile (Cloudflare)</option>
                        </select>
                    </div>

                    <div v-if="datas.CaptchaType" class="flex flex-col gap-4">
                        <div class="form-control w-full">
                             <label class="label w-full cursor-pointer justify-between gap-4">
                                <div class="flex flex-col">
                                    <span class="label-text font-medium text-base-content">Global Master Switch</span>
                                    <span class="text-xs opacity-70">Enable captcha verification system-wide.</span>
                                </div>
                                <input type="checkbox" class="toggle toggle-primary" :checked="String(datas.CaptchaEnabled) === 'true'"
                                       @change="updateBool('CaptchaEnabled', $event)" />
                            </label>
                        </div>

                        <div v-if="String(datas.CaptchaEnabled) === 'true'" class="ml-2 flex flex-col gap-4 rounded-field border border-base-300 p-4">
                            <div class="form-control w-full">
                                <label class="label w-full cursor-pointer justify-between gap-4">
                                    <div class="flex flex-col">
                                        <span class="label-text font-medium text-base-content">Login Page</span>
                                        <span class="text-xs opacity-70">Require captcha on user login.</span>
                                    </div>
                                    <input type="checkbox" class="toggle toggle-primary" :checked="String(datas.CaptchaLoginEnabled) === 'true'"
                                           @change="updateBool('CaptchaLoginEnabled', $event)" />
                                </label>
                            </div>

                            <div class="form-control w-full">
                                <label class="label w-full cursor-pointer justify-between gap-4">
                                    <div class="flex flex-col">
                                        <span class="label-text font-medium text-base-content">Video Player</span>
                                        <span class="text-xs opacity-70">Require captcha to watch videos.</span>
                                    </div>
                                    <input type="checkbox" class="toggle toggle-primary" :checked="String(datas.CaptchaPlayerEnabled) === 'true'"
                                           @change="updateBool('CaptchaPlayerEnabled', $event)" />
                                </label>
                            </div>
                        </div>
                    </div>

                    <div v-if="datas.CaptchaType === 'recaptcha'" class="card border border-base-300 bg-base-100 p-6 gap-4">
                        <h3 class="text-base font-semibold">ReCaptcha Settings</h3>
                        <div class="form-control w-full">
                            <label class="label" for="config-Captcha_Recaptcha_PublicKey"><span class="label-text">Site Key (Public)</span></label>
                            <input v-model="datas.Captcha_Recaptcha_PublicKey" id="config-Captcha_Recaptcha_PublicKey" type="text" class="input input-bordered w-full" />
                        </div>
                        <div class="form-control w-full">
                            <label class="label" for="config-Captcha_Recaptcha_PrivateKey"><span class="label-text">Secret Key (Private)</span></label>
                            <input v-model="datas.Captcha_Recaptcha_PrivateKey" id="config-Captcha_Recaptcha_PrivateKey" type="password" autocomplete="new-password" class="input input-bordered font-mono w-full" placeholder="Enter a replacement secret" aria-describedby="config-Captcha_Recaptcha_PrivateKey-help" />
                            <p id="config-Captcha_Recaptcha_PrivateKey-help" class="mt-2 text-sm text-base-content/70">
                                {{ datas.Captcha_Recaptcha_PrivateKeyConfigured ? 'A secret is configured. Leave blank to keep it, or enter a new secret to replace it.' : 'No secret is configured. Enter the secret from your captcha provider.' }}
                            </p>
                        </div>
                    </div>

                    <div v-if="datas.CaptchaType === 'hcaptcha'" class="card border border-base-300 bg-base-100 p-6 gap-4">
                        <h3 class="text-base font-semibold">hCaptcha Settings</h3>
                        <div class="form-control w-full">
                            <label class="label" for="config-Captcha_Hcaptcha_PublicKey"><span class="label-text">Site Key (Public)</span></label>
                            <input v-model="datas.Captcha_Hcaptcha_PublicKey" id="config-Captcha_Hcaptcha_PublicKey" type="text" class="input input-bordered w-full" />
                        </div>
                        <div class="form-control w-full">
                            <label class="label" for="config-Captcha_Hcaptcha_PrivateKey"><span class="label-text">Secret Key (Private)</span></label>
                            <input v-model="datas.Captcha_Hcaptcha_PrivateKey" id="config-Captcha_Hcaptcha_PrivateKey" type="password" autocomplete="new-password" class="input input-bordered font-mono w-full" placeholder="Enter a replacement secret" aria-describedby="config-Captcha_Hcaptcha_PrivateKey-help" />
                            <p id="config-Captcha_Hcaptcha_PrivateKey-help" class="mt-2 text-sm text-base-content/70">
                                {{ datas.Captcha_Hcaptcha_PrivateKeyConfigured ? 'A secret is configured. Leave blank to keep it, or enter a new secret to replace it.' : 'No secret is configured. Enter the secret from your captcha provider.' }}
                            </p>
                        </div>
                    </div>

                    <div v-if="datas.CaptchaType === 'turnstile'" class="card border border-base-300 bg-base-100 p-6 gap-4">
                        <h3 class="text-base font-semibold">Turnstile Settings</h3>
                        <div class="form-control w-full">
                            <label class="label" for="config-Captcha_Turnstile_PublicKey"><span class="label-text">Site Key (Public)</span></label>
                            <input v-model="datas.Captcha_Turnstile_PublicKey" id="config-Captcha_Turnstile_PublicKey" type="text" class="input input-bordered w-full" />
                        </div>
                        <div class="form-control w-full">
                            <label class="label" for="config-Captcha_Turnstile_PrivateKey"><span class="label-text">Secret Key (Private)</span></label>
                            <input v-model="datas.Captcha_Turnstile_PrivateKey" id="config-Captcha_Turnstile_PrivateKey" type="password" autocomplete="new-password" class="input input-bordered font-mono w-full" placeholder="Enter a replacement secret" aria-describedby="config-Captcha_Turnstile_PrivateKey-help" />
                            <p id="config-Captcha_Turnstile_PrivateKey-help" class="mt-2 text-sm text-base-content/70">
                                {{ datas.Captcha_Turnstile_PrivateKeyConfigured ? 'A secret is configured. Leave blank to keep it, or enter a new secret to replace it.' : 'No secret is configured. Enter the secret from your captcha provider.' }}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Plugins Tab -->
                <div v-show="activeTab === 'plugins'" id="config-panel-plugins" role="tabpanel" aria-labelledby="config-tab-plugins" tabindex="0" class="flex flex-col gap-6 animate-fade-in">
                    <div class="card border border-base-300 bg-base-100 p-4 sm:p-6">
                        <h3 class="mb-4 text-base font-semibold">PGS Subtitle Server</h3>
                        <div class="form-control mb-4">
                             <label class="label cursor-pointer justify-between">
                                <span class="label-text font-medium text-base-content">Enable Plugin</span>
                                <input type="checkbox" class="toggle toggle-primary" :checked="String(datas.EnablePluginPgsServer) === 'true'"
                                       @change="updateBool('EnablePluginPgsServer', $event)" />
                            </label>
                        </div>
                        <div class="form-control w-full">
                            <label class="label"><span class="label-text font-medium text-base-content">Server URL</span></label>
                            <div class="flex min-w-0 flex-col gap-3 sm:flex-row">
                                <input v-model="datas.PluginPgsServer" type="url" class="input input-bordered min-w-0 w-full"
                                       placeholder="http://..." @input="resetPgsConnectionTest()" />
                                <button type="button" class="btn btn-outline btn-sm h-12 shrink-0 gap-2 sm:h-auto"
                                        :disabled="isLoading || isTestingPgsConnection || !datas.PluginPgsServer.trim()"
                                        @click="testPgsConnection()">
                                    <span v-if="isTestingPgsConnection" class="loading loading-spinner loading-xs"></span>
                                    <Icon v-else name="lucide:plug-zap" class="h-4 w-4" />
                                    {{ isTestingPgsConnection ? 'Testing…' : 'Test connection' }}
                                </button>
                            </div>
                            <label class="label"><span class="label-text-alt whitespace-normal">Service used to convert image-based subtitles</span></label>
                            <div v-if="pgsConnectionMessage" role="status" aria-live="polite"
                                 class="mt-2 flex min-w-0 items-start gap-2 text-sm"
                                 :class="pgsConnectionSucceeded ? 'text-success' : 'text-error'">
                                <Icon :name="pgsConnectionSucceeded ? 'lucide:circle-check' : 'lucide:circle-x'"
                                      class="mt-0.5 h-4 w-4 shrink-0" />
                                <span class="min-w-0 break-words">{{ pgsConnectionMessage }}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { onBeforeRouteLeave } from 'vue-router';
import { h, defineComponent } from 'vue';

definePageMeta({
    layout: "panel",
    middleware: "auth",
});

// --- Internal Component: ByteInput ---
// Defining a small inline component for handling byte conversion logic cleanly
const ByteInput = defineComponent({
    props: ['modelValue', 'label', 'hint'],
    emits: ['update:modelValue'],
    setup(props, { emit }) {
        const units = [
            { label: 'B', val: 1 },
            { label: 'KB', val: 1024 },
            { label: 'MB', val: 1024 * 1024 },
            { label: 'GB', val: 1024 * 1024 * 1024 }
        ];

        const localVal = ref(0);
        const localUnit = ref(1);

        // Sync from Parent (Bytes -> Local Unit + Value)
        watch(() => props.modelValue, (newBytes) => {
            const bytes = Number(newBytes);
            if (!bytes) { localVal.value = 0; localUnit.value = 1; return; }

            // Don't update if it matches our current calculated state (avoids loop/rounding jitter)
            if (Math.abs(bytes - (localVal.value * localUnit.value)) < 1) return;

            // Find best unit
            let bestUnit = units[0];
            for (let i = units.length - 1; i >= 0; i--) {
                if (units[i] && bytes >= units[i].val) {
                    bestUnit = units[i];
                    break;
                }
            }
            localUnit.value = bestUnit.val;
            localVal.value = parseFloat((bytes / bestUnit.val).toFixed(2));
        }, { immediate: true });

        // Sync to Parent (Local Unit + Value -> Bytes)
        const updateParent = () => {
             const bytes = Math.floor(localVal.value * localUnit.value);
             emit('update:modelValue', bytes.toString());
        };

        return () => h('div', { class: 'form-control w-full' }, [
            h('label', { class: 'label' }, [ h('span', { class: 'label-text font-medium text-base-content' }, props.label) ]),
            h('div', { class: 'join w-full' }, [
                h('input', {
                    type: 'number',
                    class: 'input input-bordered join-item w-full',
                    value: localVal.value,
                    step: '0.01',
                    min: '0',
                    onInput: (e: any) => { localVal.value = parseFloat(e.target.value) || 0; updateParent(); }
                }),
                h('select', {
                    class: 'select select-bordered join-item',
                    value: localUnit.value,
                    onChange: (e: any) => { localUnit.value = Number(e.target.value); updateParent(); }
                }, units.map(u => h('option', { value: u.val }, u.label)))
            ]),
            props.hint ? h('label', { class: 'label' }, [ h('span', { class: 'label-text-alt whitespace-normal text-base-content/70' }, props.hint) ]) : null
        ]);
    }
});


const { data: accountData } = useAccountData();
watch(accountData, () => {
    if (accountData.value && !accountData.value.Admin) {
        navigateTo("/my", { redirectCode: 307 });
    }
});

const conf = useRuntimeConfig();
const token = useToken();
const { endSession, isEndingSession, phase: sessionExitPhase } = useSessionExit();
const unsavedConfig = useUnsavedConfig();
const serverConfig = useServerConfig();
const err = ref("");
const successMsg = ref("");
const isLoading = ref(false);
const isRotatingKeys = ref(false);
const isTestingPgsConnection = ref(false);
const pgsConnectionSucceeded = ref(false);
const pgsConnectionMessage = ref("");

// State
const datas = ref<ConfigResponse | null>(null);
const originalDatas = ref<string>(""); // JSON string for deep comparison

// Tabs
const activeTab = ref("general");
const tabs = [
    { id: 'general', label: 'General' },
    { id: 'security', label: 'Security' },
    { id: 'network', label: 'Network' },
    { id: 'ratelimit', label: 'Rate Limits' },
    { id: 'functionality', label: 'Functionality' },
    { id: 'quality', label: 'Quality' },
    { id: 'performance', label: 'Performance' },
    { id: 'captcha', label: 'Captcha' },
    { id: 'plugins', label: 'Plugins' },
];

const resolutions = ['240p', '360p', '480p', '720p', '1080p', '1440p', '2160p'];

function getBitrateRecommendation(res: string): string {
    switch (res) {
        case '240p': return '400k - 600k';
        case '360p': return '700k - 1000k';
        case '480p': return '1200k - 2000k';
        case '720p': return '2500k - 4000k';
        case '1080p': return '4500k - 8000k';
        case '1440p': return '8000k - 14000k';
        case '2160p': return '15000k - 25000k';
        default: return 'N/A';
    }
}

// Computed Dirty State
const isDirty = computed(() => {
    return datas.value && JSON.stringify(datas.value) !== originalDatas.value;
});

watch(isDirty, (dirty) => { unsavedConfig.value = Boolean(dirty); }, { immediate: true, flush: 'sync' });
onUnmounted(() => { unsavedConfig.value = false; });

useAsyncData('config', async () => {
    return await load();
});

// Navigation Guard
onBeforeRouteLeave((to, from, next) => {
    if (sessionExitPhase.value === 'pending') return next(false);
    if (sessionExitPhase.value === 'leaving') return next();
    if (isDirty.value) {
        const answer = window.confirm('You have unsaved changes. Do you really want to leave?');
        if (answer) {
            next();
        } else {
            next(false);
        }
    } else {
        next();
    }
});

async function load() {
    try {
        isLoading.value = true;
        err.value = "";
        const data = await $fetch<ConfigResponse>(`${conf.public.apiUrl}/settings`, {
            headers: { Authorization: `Bearer ${token.value}` },
        });
        if (data) {
            datas.value = data;
            serverConfig.value.RemoteDownloadEnabled = String(data.RemoteDownloadEnabled) === 'true';
            originalDatas.value = JSON.stringify(data);
            resetPgsConnectionTest();
        }
    } catch (error: any) {
        err.value = `${error?.data || error.message}`;
    } finally {
        setTimeout(() => isLoading.value = false, 300);
    }
}

async function update() {
    try {
        isLoading.value = true;
        err.value = "";
        successMsg.value = "";
        await $fetch<ConfigResponse>(`${conf.public.apiUrl}/settings`, {
            method: "put",
            headers: { Authorization: `Bearer ${token.value}` },
            body: datas.value,
        });

        // Reload data to ensure we have the full, correct state from the server
        await load();

        successMsg.value = "Configuration saved successfully!";
        setTimeout(() => successMsg.value = "", 3000);
    } catch (error: any) {
        err.value = `${error?.data || error.message}`;
        isLoading.value = false; // Ensure loading is disabled on error
    }
}

async function rotateSigningKeys() {
    if (isDirty.value || isRotatingKeys.value || isEndingSession.value) return;
    if (!window.confirm('Rotate signing keys? Everyone will be signed out and active playback sessions will reset.')) return;
    isRotatingKeys.value = true;
    err.value = '';
    try {
        await endSession(() => $fetch(`${conf.public.apiUrl}/settings/rotate-signing-keys`, {
            method: 'post',
            headers: { Authorization: `Bearer ${token.value}` },
            body: { confirm: true },
        }), 'Signing keys rotated. Sign in again to continue.');
    } catch (error: any) {
        err.value = `${error?.data || error.message}`;
    } finally {
        isRotatingKeys.value = false;
    }
}

function resetPgsConnectionTest() {
    if (!isTestingPgsConnection.value) {
        pgsConnectionSucceeded.value = false;
        pgsConnectionMessage.value = "";
    }
}

async function testPgsConnection() {
    const url = datas.value?.PluginPgsServer.trim();
    if (!url || isTestingPgsConnection.value) {
        return;
    }

    try {
        isTestingPgsConnection.value = true;
        pgsConnectionSucceeded.value = false;
        pgsConnectionMessage.value = "";

        const response = await $fetch<PgsConnectionResponse>(`${conf.public.apiUrl}/settings/test-pgs-server`, {
            method: "post",
            headers: { Authorization: `Bearer ${token.value}` },
            body: { url },
        });

        if (datas.value?.PluginPgsServer.trim() !== url) {
            return;
        }
        pgsConnectionSucceeded.value = response.ok;
        pgsConnectionMessage.value = response.message;
    } catch (error: any) {
        if (datas.value?.PluginPgsServer.trim() !== url) {
            return;
        }
        pgsConnectionSucceeded.value = false;
        pgsConnectionMessage.value = error?.data?.message || error?.message || "Could not connect to the server.";
    } finally {
        isTestingPgsConnection.value = false;
    }
}

function updateBool(key: keyof ConfigResponse, event: Event) {
    if (datas.value) {
        (datas.value as any)[key] = (event.target as HTMLInputElement).checked ? 'true' : 'false';
    }
}

interface PgsConnectionResponse {
    ok: boolean
    message: string
    statusCode?: number
    latencyMs?: number
}

export interface ConfigResponse {
    ID: number
    CreatedAt: string
    UpdatedAt: string
    DeletedAt: any

    AppName: string
    BaseUrl: string
    ProjectExampleVideo: string

    CorsAllowOrigins: string

    ReloadHtml: string
    EncodingEnabled: string
    UploadEnabled: string
    DownloadEnabled: string
    RemoteDownloadEnabled: string
    ContinueWatchingPopupEnabled: string
    PlayerV2Enabled: string
    RatelimitEnabled: string
    RatelimitRateGlobal: string
    RatelimitBurstGlobal: string
    RatelimitRateAuth: string
    RatelimitBurstAuth: string
    RatelimitRateApi: string
    RatelimitBurstApi: string
    RatelimitRateUpload: string
    RatelimitBurstUpload: string
    RatelimitRateWeb: string
    RatelimitBurstWeb: string
    CloudflareEnabled: string
    BunnyCDNEnabled: string
    FastlyEnabled: string
    KeyCDNEnabled: string
    TrustedProxies: string
    TrustLocalTraffic: string

    MaxItemsMultiDelete: string
    MaxRunningEncodes: string
    MaxParallelFFmpegTasks: string
    MaxParallelDownloads: string
    RemoteDownloadTimeout: string
    MaxParallelDownloadPreparations: string
    MaxQueuedDownloadPreparations: string
    DownloadPreparationRetentionHours: string
    MaxUploadFilesize: string
    MaxUploadChunkSize: string
    MaxUploadSessions: string
    MaxPostSize: string

    CaptchaEnabled: string
    CaptchaLoginEnabled: string
    CaptchaPlayerEnabled: string
    CaptchaType: string
    Captcha_Recaptcha_PrivateKeyConfigured: boolean
    Captcha_Recaptcha_PrivateKey: string
    Captcha_Recaptcha_PublicKey: string
    Captcha_Hcaptcha_PrivateKeyConfigured: boolean
    Captcha_Hcaptcha_PrivateKey: string
    Captcha_Hcaptcha_PublicKey: string
    Captcha_Turnstile_PrivateKeyConfigured: boolean
    Captcha_Turnstile_PrivateKey: string
    Captcha_Turnstile_PublicKey: string

    EncodeHls240p: string
    Hls240pVideoBitrate: string
    Hls240pCrf: string
    EncodeHls360p: string
    Hls360pVideoBitrate: string
    Hls360pCrf: string
    EncodeHls480p: string
    Hls480pVideoBitrate: string
    Hls480pCrf: string
    EncodeHls720p: string
    Hls720pVideoBitrate: string
    Hls720pCrf: string
    EncodeHls1080p: string
    Hls1080pVideoBitrate: string
    Hls1080pCrf: string
    EncodeHls1440p: string
    Hls1440pVideoBitrate: string
    Hls1440pCrf: string
    EncodeHls2160p: string
    Hls2160pVideoBitrate: string
    Hls2160pCrf: string

    MaxFramerate: string

    PluginPgsServer: string
    EnablePluginPgsServer: string
}
</script>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.3s ease-in-out;
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
