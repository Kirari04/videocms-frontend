<template>
    <div class="flex flex-col h-full">
        <!-- Notifications -->
        <div class="toast toast-top toast-end z-50">
            <div class="alert alert-error shadow-lg" v-if="err">
                <Icon name="lucide:alert-circle" class="stroke-current shrink-0 h-6 w-6" />
                <div>{{ err }}</div>
            </div>
            <div class="alert alert-success shadow-lg" v-if="successMsg">
                <Icon name="lucide:check-circle" class="stroke-current shrink-0 h-6 w-6" />
                <div>{{ successMsg }}</div>
            </div>
        </div>

        <!-- Access Denied -->
        <div v-if="!accountData?.Admin" class="alert alert-error m-4">
            You don't have access to this page
        </div>

        <!-- Main Content -->
        <div v-if="accountData?.Admin && datas" class="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
            
            <!-- Header -->
            <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 class="text-3xl font-extrabold tracking-tight">System Configuration</h1>
                    <p class="text-base-content/70">Manage your instance settings, encoding quality, and security preferences.</p>
                </div>
                <div class="flex gap-2">
                    <button @click="load()" :disabled="isLoading" class="btn btn-ghost gap-2">
                        <Icon name="lucide:refresh-cw" :class="{'animate-spin': isLoading}" />
                        Reload
                    </button>
                    <button @click="update()" :disabled="isLoading || !isDirty" class="btn btn-primary gap-2 min-w-35">
                        <span v-if="isLoading" class="loading loading-spinner loading-sm"></span>
                        <Icon v-else name="lucide:save" />
                        {{ isDirty ? 'Save Changes' : 'Saved' }}
                    </button>
                </div>
            </div>

            <!-- Unsaved Changes Alert -->
            <transition name="fade">
                <div v-if="isDirty" class="alert alert-warning shadow-sm flex items-center">
                    <Icon name="lucide:alert-triangle" class="w-5 h-5" />
                    <span class="font-medium">You have unsaved changes. Don't forget to save before leaving.</span>
                </div>
            </transition>

            <!-- Tabs Navigation -->
            <div role="tablist" class="tabs tabs-boxed bg-base-200/50 p-1 gap-1 overflow-x-auto flex-nowrap">
                <a v-for="tab in tabs" :key="tab.id" role="tab" 
                   class="tab transition-all duration-200 whitespace-nowrap px-6" 
                   :class="{ 'tab-active bg-base-100 shadow-sm font-bold': activeTab === tab.id }" 
                   @click="activeTab = tab.id">
                   {{ tab.label }}
                </a>
            </div>

            <!-- Tab Content -->
            <div class="bg-base-100 rounded-2xl shadow-xl border border-base-200 p-6 md:p-8 min-h-100">
                
                <!-- General Tab -->
                <div v-if="activeTab === 'general'" class="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                    <div class="form-control w-full">
                        <label class="label"><span class="label-text font-bold">App Name</span></label>
                        <input v-model="datas.AppName" type="text" class="input input-bordered w-full" maxlength="120" />
                        <label class="label"><span class="label-text-alt whitespace-normal">Displayed in the top left corner</span></label>
                    </div>
                    
                    <div class="form-control w-full">
                        <label class="label"><span class="label-text font-bold">Base URL</span></label>
                        <input v-model="datas.BaseUrl" type="url" class="input input-bordered w-full" maxlength="255" />
                        <label class="label"><span class="label-text-alt whitespace-normal">Public URL of this API server</span></label>
                    </div>

                    <div class="col-span-1 md:col-span-2 divider">License Information</div>

                    <div class="form-control w-full">
                        <label class="label"><span class="label-text font-bold">Project Name</span></label>
                        <input v-model="datas.Project" type="text" class="input input-bordered w-full" maxlength="120" />
                    </div>

                    <div class="form-control w-full">
                        <label class="label"><span class="label-text font-bold">Project Documentation URL</span></label>
                        <input v-model="datas.ProjectDocumentation" type="url" class="input input-bordered w-full" maxlength="512" />
                    </div>

                    <div class="form-control w-full">
                        <label class="label"><span class="label-text font-bold">Project Download URL</span></label>
                        <input v-model="datas.ProjectDownload" type="url" class="input input-bordered w-full" maxlength="512" />
                    </div>

                    <div class="form-control w-full">
                        <label class="label"><span class="label-text font-bold">Example Video ID</span></label>
                        <input v-model="datas.ProjectExampleVideo" type="text" class="input input-bordered w-full" maxlength="512" />
                        <label class="label"><span class="label-text-alt whitespace-normal">The ID of the video shown on the homepage as a demo</span></label>
                    </div>
                </div>

                <!-- Security Tab -->
                <div v-if="activeTab === 'security'" class="flex flex-col gap-6 animate-fade-in">
                    <div class="alert alert-info shadow-sm">
                        <Icon name="lucide:shield-alert" class="w-5 h-5" />
                        <span>Sensitive credentials. Ensure these are kept private.</span>
                    </div>

                    <div class="form-control w-full">
                        <label class="label"><span class="label-text font-bold">JWT Secret Key</span></label>
                        <div class="join w-full">
                            <input :type="showSecrets ? 'text' : 'password'" v-model="datas.JwtSecretKey" class="input input-bordered join-item w-full font-mono" />
                            <button class="btn join-item" @click="showSecrets = !showSecrets">
                                <Icon :name="showSecrets ? 'lucide:eye-off' : 'lucide:eye'" />
                            </button>
                        </div>
                    </div>

                    <div class="form-control w-full">
                        <label class="label"><span class="label-text font-bold">JWT Upload Secret Key</span></label>
                        <div class="join w-full">
                            <input :type="showSecrets ? 'text' : 'password'" v-model="datas.JwtUploadSecretKey" class="input input-bordered join-item w-full font-mono" />
                            <button class="btn join-item" @click="showSecrets = !showSecrets">
                                <Icon :name="showSecrets ? 'lucide:eye-off' : 'lucide:eye'" />
                            </button>
                        </div>
                    </div>

                    <div class="form-control w-full">
                        <label class="label"><span class="label-text font-bold">CORS Allow Origins</span></label>
                        <input v-model="datas.CorsAllowOrigins" type="text" class="input input-bordered w-full font-mono" placeholder="*" />
                        <label class="label"><span class="label-text-alt whitespace-normal">Comma separated list of allowed origins or * for all</span></label>
                    </div>
                </div>

                <!-- Functionality Tab -->
                <div v-if="activeTab === 'functionality'" class="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                    <!-- Core Features -->
                    <div class="card bg-base-200 shadow-sm border border-base-300 h-full">
                        <div class="card-body p-6">
                            <h3 class="card-title text-lg mb-2">Core Features</h3>
                            
                            <div class="form-control">
                                <label class="label cursor-pointer justify-between">
                                    <span class="label-text font-medium">Encoding</span>
                                    <input type="checkbox" class="toggle toggle-primary" :checked="String(datas.EncodingEnabled) === 'true'" 
                                           @change="updateBool('EncodingEnabled', $event)" />
                                </label>
                                <label class="label pt-0"><span class="label-text-alt whitespace-normal text-base-content/70">Enable or disable video encoding processing.</span></label>
                            </div>

                            <div class="divider my-1"></div>

                            <div class="form-control">
                                <label class="label cursor-pointer justify-between">
                                    <span class="label-text font-medium">Upload</span>
                                    <input type="checkbox" class="toggle toggle-primary" :checked="String(datas.UploadEnabled) === 'true'" 
                                           @change="updateBool('UploadEnabled', $event)" />
                                </label>
                                <label class="label pt-0"><span class="label-text-alt whitespace-normal text-base-content/70">Allow users to upload new videos.</span></label>
                            </div>

                            <div class="divider my-1"></div>

                            <div class="form-control">
                                <label class="label cursor-pointer justify-between">
                                    <span class="label-text font-medium">Download</span>
                                    <input type="checkbox" class="toggle toggle-primary" :checked="String(datas.DownloadEnabled) === 'true'" 
                                           @change="updateBool('DownloadEnabled', $event)" />
                                </label>
                                <label class="label pt-0"><span class="label-text-alt whitespace-normal text-base-content/70">Allow users to download processed videos.</span></label>
                            </div>
                        </div>
                    </div>

                    <!-- User Experience -->
                    <div class="card bg-base-200 shadow-sm border border-base-300 h-fit">
                        <div class="card-body p-6">
                            <h3 class="card-title text-lg mb-2">User Experience</h3>
                            <div class="form-control">
                                <label class="label cursor-pointer justify-between">
                                    <span class="label-text font-medium">Continue Watching</span>
                                    <input type="checkbox" class="toggle toggle-secondary" :checked="String(datas.ContinueWatchingPopupEnabled) === 'true'" 
                                           @change="updateBool('ContinueWatchingPopupEnabled', $event)" />
                                </label>
                                <label class="label pt-0"><span class="label-text-alt whitespace-normal text-base-content/70">Show a popup to resume playback where left off.</span></label>
                            </div>
                        </div>
                    </div>

                    <!-- Networking & Security -->
                    <div class="card bg-base-200 shadow-sm border border-base-300 h-fit">
                        <div class="card-body p-6">
                            <h3 class="card-title text-lg mb-2">Networking & Security</h3>
                            <div class="form-control">
                                <label class="label cursor-pointer justify-between">
                                    <span class="label-text font-medium">Rate Limiting</span>
                                    <input type="checkbox" class="toggle toggle-accent" :checked="String(datas.RatelimitEnabled) === 'true'" 
                                           @change="updateBool('RatelimitEnabled', $event)" />
                                </label>
                                <label class="label pt-0"><span class="label-text-alt whitespace-normal text-base-content/70">Limit API request frequency to prevent abuse.</span></label>
                            </div>

                            <div class="divider my-1"></div>

                            <div class="form-control">
                                <label class="label cursor-pointer justify-between">
                                    <span class="label-text font-medium">Cloudflare Proxy</span>
                                    <input type="checkbox" class="toggle toggle-accent" :checked="String(datas.CloudflareEnabled) === 'true'" 
                                           @change="updateBool('CloudflareEnabled', $event)" />
                                </label>
                                <label class="label pt-0"><span class="label-text-alt whitespace-normal text-base-content/70">Enable if server is behind Cloudflare to resolve IPs correctly.</span></label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quality Tab -->
                <div v-if="activeTab === 'quality'" class="flex flex-col gap-6 animate-fade-in">
                    <div class="alert shadow-sm bg-base-200">
                        <Icon name="lucide:info" class="w-5 h-5" />
                        <div class="text-sm">
                            <p class="font-bold">Encoding Strategy</p>
                            <p><strong>CRF (Constant Rate Factor):</strong> Controls quality (0-51). Lower is better. 18-28 is standard.</p>
                            <p><strong>Bitrate Cap:</strong> Limits the maximum bandwidth used, useful for streaming constraints.</p>
                        </div>
                    </div>

                     <div class="form-control w-full max-w-xs">
                        <label class="label"><span class="label-text font-bold">Global Max Framerate</span></label>
                        <input v-model="datas.MaxFramerate" type="text" class="input input-bordered" />
                        <label class="label"><span class="label-text-alt whitespace-normal">Videos with higher FPS will be capped to this value.</span></label>
                    </div>

                    <div class="divider">Resolutions</div>

                    <!-- Changed grid to single column to avoid accordion layout issues -->
                    <div class="flex flex-col gap-3">
                        <div v-for="res in resolutions" :key="res" 
                             class="collapse collapse-arrow border border-base-300 bg-base-100 rounded-box transition-all"
                             :class="{'border-primary shadow-md': String((datas as any)[`EncodeHls${res}`]) === 'true'}">
                            <input type="checkbox" /> 
                            <div class="collapse-title text-xl font-medium flex items-center gap-4">
                                <input type="checkbox" class="toggle toggle-primary z-10" 
                                       :checked="String((datas as any)[`EncodeHls${res}`]) === 'true'" 
                                       @change="updateBool(`EncodeHls${res}` as any, $event)" 
                                       @click.stop />
                                <span>{{ res }}</span>
                                <span v-if="String((datas as any)[`EncodeHls${res}`]) === 'true'" class="badge badge-primary badge-sm">Enabled</span>
                                <span v-else class="badge badge-ghost badge-sm">Disabled</span>
                            </div>
                            <div class="collapse-content">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    <div class="form-control w-full">
                                        <label class="label"><span class="label-text font-bold">Bitrate Cap</span></label>
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
                                            <span class="label-text font-bold">CRF (Quality)</span>
                                            <span class="badge badge-neutral font-mono">{{ (datas as any)[`Hls${res}Crf`] }}</span>
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
                <div v-if="activeTab === 'performance'" class="flex flex-col gap-8 animate-fade-in">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div class="card bg-base-200 border border-base-300">
                            <div class="card-body">
                                <h3 class="card-title text-lg mb-4">Concurrency</h3>
                                <div class="flex flex-col gap-4">
                                    <div class="form-control w-full">
                                        <label class="label"><span class="label-text font-bold">Max Running Encodes</span></label>
                                        <input v-model="datas.MaxRunningEncodes" type="number" class="input input-bordered w-full" min="1" max="10" />
                                        <label class="label"><span class="label-text-alt whitespace-normal">Simultaneous transcoding jobs (CPU intensive)</span></label>
                                    </div>
                                    <div class="form-control w-full">
                                        <label class="label"><span class="label-text font-bold">Max Upload Sessions</span></label>
                                        <input v-model="datas.MaxUploadSessions" type="number" class="input input-bordered w-full" min="1" max="100" />
                                        <label class="label"><span class="label-text-alt whitespace-normal">Maximum number of concurrent uploads allowed.</span></label>
                                    </div>
                                     <div class="form-control w-full">
                                        <label class="label"><span class="label-text font-bold">Max Items Multi-Delete</span></label>
                                        <input v-model="datas.MaxItemsMultiDelete" type="number" class="input input-bordered w-full" min="1" max="10000" />
                                        <label class="label"><span class="label-text-alt whitespace-normal">Limit for bulk deletion actions.</span></label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="card bg-base-200 border border-base-300">
                            <div class="card-body">
                                <h3 class="card-title text-lg mb-4">Limits & Sizes</h3>
                                
                                <!-- Byte Input: Max Upload Filesize -->
                                <ByteInput v-model="datas.MaxUploadFilesize" label="Max Upload Filesize" />

                                <!-- Byte Input: Max Upload Chunksize -->
                                <ByteInput v-model="datas.MaxUploadChuncksize" label="Max Upload Chunk Size" 
                                           hint="Must match proxy limits (e.g. Cloudflare 100MB)" />

                                <!-- Byte Input: Max Post Size -->
                                <ByteInput v-model="datas.MaxPostSize" label="Max Post Size" 
                                           hint="Should be larger than chunk size" />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Captcha Tab -->
                <div v-if="activeTab === 'captcha'" class="flex flex-col gap-6 animate-fade-in">
                    <div class="form-control w-full max-w-md">
                        <label class="label"><span class="label-text font-bold">Captcha Type</span></label>
                        <select v-model="datas.CaptchaType" class="select select-bordered w-full">
                            <option value="">None (Disabled)</option>
                            <option value="recaptcha">ReCaptcha</option>
                            <option value="hcaptcha">hCaptcha</option>
                        </select>
                    </div>

                    <div v-if="datas.CaptchaType" class="form-control w-full max-w-md">
                         <label class="label cursor-pointer justify-start gap-4">
                            <span class="label-text font-bold">Enabled</span>
                            <input type="checkbox" class="toggle toggle-success" :checked="String(datas.CaptchaEnabled) === 'true'" 
                                   @change="updateBool('CaptchaEnabled', $event)" />
                        </label>
                    </div>

                    <div v-if="datas.CaptchaType === 'recaptcha'" class="card bg-base-200 border border-base-300 p-6 gap-4">
                        <h3 class="font-bold text-lg">ReCaptcha Settings</h3>
                        <div class="form-control">
                            <label class="label"><span class="label-text">Site Key (Public)</span></label>
                            <input v-model="datas.Captcha_Recaptcha_PublicKey" type="text" class="input input-bordered" />
                        </div>
                        <div class="form-control">
                            <label class="label"><span class="label-text">Secret Key (Private)</span></label>
                            <input v-model="datas.Captcha_Recaptcha_PrivateKey" type="text" class="input input-bordered font-mono" />
                        </div>
                    </div>

                    <div v-if="datas.CaptchaType === 'hcaptcha'" class="card bg-base-200 border border-base-300 p-6 gap-4">
                        <h3 class="font-bold text-lg">hCaptcha Settings</h3>
                        <div class="form-control">
                            <label class="label"><span class="label-text">Site Key (Public)</span></label>
                            <input v-model="datas.Captcha_Hcaptcha_PublicKey" type="text" class="input input-bordered" />
                        </div>
                        <div class="form-control">
                            <label class="label"><span class="label-text">Secret Key (Private)</span></label>
                            <input v-model="datas.Captcha_Hcaptcha_PrivateKey" type="text" class="input input-bordered font-mono" />
                        </div>
                    </div>
                </div>

                <!-- Plugins Tab -->
                <div v-if="activeTab === 'plugins'" class="flex flex-col gap-6 animate-fade-in">
                    <div class="card bg-base-200 border border-base-300 p-6">
                        <h3 class="font-bold text-lg mb-4">PGS Subtitle Server</h3>
                        <div class="form-control mb-4">
                             <label class="label cursor-pointer justify-start gap-4">
                                <span class="label-text font-bold">Enable Plugin</span>
                                <input type="checkbox" class="toggle toggle-success" :checked="String(datas.EnablePluginPgsServer) === 'true'" 
                                       @change="updateBool('EnablePluginPgsServer', $event)" />
                            </label>
                        </div>
                        <div class="form-control w-full">
                            <label class="label"><span class="label-text font-bold">Server URL</span></label>
                            <input v-model="datas.PluginPgsServer" type="url" class="input input-bordered w-full" placeholder="http://..." />
                            <label class="label"><span class="label-text-alt whitespace-normal">Service used to convert image-based subtitles</span></label>
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
            h('label', { class: 'label' }, [ h('span', { class: 'label-text font-bold' }, props.label) ]),
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
const err = ref("");
const successMsg = ref("");
const isLoading = ref(false);
const showSecrets = ref(false);

// State
const datas = ref<ConfigResponse | null>(null);
const originalDatas = ref<string>(""); // JSON string for deep comparison

// Tabs
const activeTab = ref("general");
const tabs = [
    { id: 'general', label: 'General' },
    { id: 'security', label: 'Security' },
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

useAsyncData('config', async () => {
    return await load();
});

// Navigation Guard
onBeforeRouteLeave((to, from, next) => {
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
            originalDatas.value = JSON.stringify(data);
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

function updateBool(key: keyof ConfigResponse, event: Event) {
    if (datas.value) {
        (datas.value as any)[key] = (event.target as HTMLInputElement).checked ? 'true' : 'false';
    }
}

export interface ConfigResponse {
    ID: number
    CreatedAt: string
    UpdatedAt: string
    DeletedAt: any

    AppName: string
    BaseUrl: string
    Project: string
    ProjectDocumentation: string
    ProjectDownload: string
    ProjectExampleVideo: string

    JwtSecretKey: string
    JwtUploadSecretKey: string
    CorsAllowOrigins: string

    ReloadHtml: string
    EncodingEnabled: string
    UploadEnabled: string
    DownloadEnabled: string
    ContinueWatchingPopupEnabled: string
    RatelimitEnabled: string
    CloudflareEnabled: string

    MaxItemsMultiDelete: string
    MaxRunningEncodes: string
    MaxUploadFilesize: string
    MaxUploadChuncksize: string
    MaxUploadSessions: string
    MaxPostSize: string

    CaptchaEnabled: string
    CaptchaType: string
    Captcha_Recaptcha_PrivateKey: string
    Captcha_Recaptcha_PublicKey: string
    Captcha_Hcaptcha_PrivateKey: string
    Captcha_Hcaptcha_PublicKey: string

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