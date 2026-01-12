<template>
    <div class="flex flex-col grow gap-8">
        <!-- Page Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div class="flex flex-col gap-1">
                <h1 class="text-2xl font-bold">Webhooks</h1>
                <p class="text-sm opacity-70">Configure playback tracking and event notifications.</p>
            </div>
            <button 
                :onclick="`create_webhook_modal.showModal()`" 
                :disabled="pending" 
                class="btn btn-primary shadow-lg"
            >
                <Icon name="lucide:plus" class="w-5 h-5" />
                Create Webhook
            </button>
        </div>

        <!-- Error/Status Toasts -->
        <div class="toast toast-top toast-end z-50">
            <div class="alert alert-info" v-if="pending">
                <div class="loading loading-spinner loading-sm"></div>
                <div>Loading...</div>
            </div>
            <div class="alert alert-error shadow-lg" v-if="error">
                <Icon name="lucide:alert-circle" class="stroke-current shrink-0 h-6 w-6" />
                <div v-if="error.data">{{ error.data }}</div>
                <div v-else>{{ error.message }}</div>
                <button @click="refresh()" class="btn btn-sm btn-ghost">Retry</button>
            </div>
        </div>

        <!-- Webhooks List -->
        <div class="card bg-base-100 shadow-xl border border-base-200">
            <div class="card-body p-0">
                <div v-if="!pending && (!webhooks || webhooks?.length === 0)">
                    <div class="flex flex-col items-center justify-center py-16 opacity-50">
                        <Icon name="lucide:webhook" class="w-16 h-16 mb-4 opacity-50" />
                        <h3 class="text-lg font-bold">No Webhooks Configured</h3>
                        <p>Create your first webhook to start tracking events.</p>
                    </div>
                </div>
                
                <div class="overflow-x-auto" v-if="webhooks && webhooks?.length > 0">
                    <table class="table table-zebra w-full">
                        <thead class="bg-base-200/50">
                            <tr>
                                <th>Name</th>
                                <th>Target URL</th>
                                <th>Frequency</th>
                                <th>Config</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(webhook, i) in webhooks" :key="webhook.ID">
                                <td class="font-bold">{{ webhook.Name }}</td>
                                <td>
                                    <div class="flex items-center gap-2 max-w-xs truncate" :title="webhook.Url">
                                        <span class="badge badge-sm badge-neutral">POST</span>
                                        <span class="opacity-70 font-mono text-xs">{{ webhook.Url }}</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="tooltip" :data-tip="`${webhook.Rpm} requests per minute`">
                                        <div class="badge badge-outline gap-1">
                                            <Icon name="lucide:timer" class="w-3 h-3" />
                                            {{ webhook.Rpm }} RPM
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div class="flex flex-col gap-1 text-xs">
                                        <span class="opacity-50">Req: <span class="font-mono text-base-content">{{ webhook.ReqQuery || '-' }}</span></span>
                                        <span class="opacity-50">Res: <span class="font-mono text-base-content">{{ webhook.ResField || '-' }}</span></span>
                                    </div>
                                </td>
                                <td class="text-right">
                                    <button 
                                        :onclick="`edit_webhook_modal_${i}.showModal()`" 
                                        class="btn btn-sm btn-ghost btn-square"
                                    >
                                        <Icon name="lucide:edit-2" class="w-4 h-4" />
                                    </button>

                                    <!-- Edit Modal Teleport -->
                                    <Teleport to="body">
                                        <dialog :id="`edit_webhook_modal_${i}`" class="modal">
                                            <form @submit.prevent="update(webhook, `edit_webhook_modal_${i}`)" class="modal-box w-11/12 max-w-2xl bg-base-100">
                                                <button :onclick="`edit_webhook_modal_${i}.close()`" type="button" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                                                
                                                <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
                                                    <Icon name="lucide:settings" class="w-5 h-5" />
                                                    Edit Webhook
                                                </h3>
                                                
                                                <EditWebhook
                                                    v-if="renderCreateField"
                                                    :loading="loading"
                                                    :name="webhook.Name"
                                                    @name="webhook.Name = $event"
                                                    :url="webhook.Url"
                                                    @url="webhook.Url = $event"
                                                    :rpm="webhook.Rpm"
                                                    @rpm="webhook.Rpm = $event"
                                                    :req-query="webhook.ReqQuery"
                                                    @req-query="webhook.ReqQuery = $event"
                                                    :res-field="webhook.ResField"
                                                    @res-field="webhook.ResField = $event"
                                                />
                                                
                                                <div class="alert alert-error text-sm mt-4" v-if="err">
                                                    <Icon name="lucide:alert-circle" class="w-4 h-4" />
                                                    <span>{{ err }}</span>
                                                </div>
                                                
                                                <div class="modal-action">
                                                    <button :disabled="loading" type="submit" class="btn btn-primary">
                                                        Save Changes
                                                    </button>
                                                </div>
                                            </form>
                                            <form method="dialog" class="modal-backdrop">
                                                <button>close</button>
                                            </form>
                                        </dialog>
                                    </Teleport>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Documentation & Guide -->
        <div class="collapse collapse-arrow bg-base-100 border border-base-200 shadow-sm">
            <input type="checkbox" /> 
            <div class="collapse-title text-xl font-medium flex items-center gap-2">
                <Icon name="lucide:book-open" class="w-5 h-5 text-secondary" />
                How Webhooks Work
            </div>
            <div class="collapse-content"> 
                <div class="prose max-w-none pt-4">
                    <p>The webhook system acts as a <strong>playback tracker</strong> (heartbeat). It periodically sends data to your configured server while a user watches a video.</p>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 not-prose mb-8">
                        <div class="card bg-base-200 p-6 rounded-xl">
                            <h4 class="font-bold flex items-center gap-2 mb-4">
                                <span class="badge badge-primary badge-sm">1</span> Initialization
                            </h4>
                            <p class="text-sm opacity-80">
                                When the player loads, it initializes a timer based on your <strong>RPM (Requests Per Minute)</strong> setting.
                                <br><br>
                                <span class="font-mono text-xs bg-base-300 p-1 rounded">60 RPM = Every 1 second</span>
                            </p>
                        </div>
                        <div class="card bg-base-200 p-6 rounded-xl">
                            <h4 class="font-bold flex items-center gap-2 mb-4">
                                <span class="badge badge-primary badge-sm">2</span> Execution
                            </h4>
                            <p class="text-sm opacity-80">
                                The tracking only fires if the video is <strong>actively playing</strong>. If paused, no data is sent.
                            </p>
                        </div>
                    </div>

                    <h4>Data Flow</h4>
                    <ul class="steps steps-vertical lg:steps-horizontal w-full my-4">
                        <li class="step step-primary">Video Plays</li>
                        <li class="step step-primary">Extract <code>ReqQuery</code> param from URL</li>
                        <li class="step step-primary">Build Payload (UUID, Time, Custom Field)</li>
                        <li class="step step-primary">POST to Target URL</li>
                    </ul>

                    <div class="alert alert-warning shadow-sm mt-6">
                        <Icon name="lucide:alert-triangle" class="w-6 h-6" />
                        <div>
                            <h3 class="font-bold">Common Pitfalls</h3>
                            <ul class="list-disc list-inside text-sm mt-2">
                                <li><strong>CORS Issues:</strong> Ensure your target server accepts requests from this domain.</li>
                                <li><strong>Missing URL Params:</strong> If <code>ReqQuery</code> is set (e.g. 'uid'), the player URL must contain it (e.g. <code>?uid=123</code>), otherwise that field will be empty.</li>
                                <li><strong>Rate Limiting:</strong> High RPM (e.g. 60) can spam your server. Use lower RPM (e.g. 6) for general analytics.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Create Modal Teleport -->
        <Teleport to="body">
            <dialog :id="`create_webhook_modal`" class="modal">
                <form id="create_webhook_form" @submit.prevent="create({ Name: name, Url: url, Rpm: rpm, ReqQuery: reqQuery, ResField: resField }, `create_webhook_modal`)" class="modal-box w-11/12 max-w-2xl bg-base-100">
                    <button :onclick="`create_webhook_modal.close()`" type="button" class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                    
                    <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
                        <Icon name="lucide:plus-circle" class="w-5 h-5" />
                        Create Webhook
                    </h3>
                    
                    <EditWebhook
                        v-if="renderCreateField"
                        :loading="loading"
                        :name="name"
                        @name="name = $event"
                        :url="url"
                        @url="url = $event"
                        :rpm="rpm"
                        @rpm="rpm = $event"
                        :req-query="reqQuery"
                        @req-query="reqQuery = $event"
                        :res-field="resField"
                        @res-field="resField = $event"
                    />
                    
                    <div class="alert alert-error text-sm mt-4" v-if="err">
                        <Icon name="lucide:alert-circle" class="w-4 h-4" />
                        <span>{{ err }}</span>
                    </div>
                    
                    <div class="modal-action">
                        <button :disabled="loading" type="submit" class="btn btn-primary">
                            Create Webhook
                        </button>
                    </div>
                </form>
                <form method="dialog" class="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </Teleport>
    </div>
</template>

<script lang="ts" setup>
const conf = useRuntimeConfig();
const token = useToken();
definePageMeta({
    layout: "panel",
    middleware: "auth",
});

const err = ref("");
const loading = ref(false);

const name = ref("");
const url = ref("");
const rpm = ref(1);
const reqQuery = ref("");
const resField = ref("");
const renderCreateField = ref(true);

const {
    data: webhooks,
    error,
    pending,
    refresh,
} = useFetch<
    Array<{
        ID: number;
        CreatedAt: string;
        UpdatedAt: string;
        Name: string;
        Url: string;
        Rpm: number;
        ReqQuery: string;
        ResField: string;
    }>
>(`${conf.public.apiUrl}/webhooks`, {
    headers: {
        Authorization: `Bearer ${token.value}`,
    },
    retry: 5,
    lazy: true,
});

const update = async (
    data: {
        ID: number;
        Name: string;
        Url: string;
        Rpm: number;
        ReqQuery: string;
        ResField: string;
    },
    id: string
) => {
    loading.value = true;
    const formData = new FormData();
    formData.append("WebhookID", `${data.ID}`);
    formData.append("Name", data.Name);
    formData.append("Url", data.Url);
    formData.append("Rpm", `${data.Rpm}`);
    formData.append("ReqQuery", data.ReqQuery);
    formData.append("ResField", data.ResField);
    try {
        await $fetch(`${conf.public.apiUrl}/webhook`, {
            method: "put",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: formData,
        });
        err.value = "";
        refresh();
        (document.getElementById(id) as HTMLDialogElement).close();
        resetForm();
    } catch (error: any) {
        console.log("error", error.message, error.data);
        err.value = `${error.data ? error.data : error.message}`;
    }
    loading.value = false;
};

const create = async (
    data: {
        Name: string;
        Url: string;
        Rpm: number;
        ReqQuery: string;
        ResField: string;
    },
    id: string
) => {
    loading.value = true;
    const formData = new FormData();
    formData.append("Name", data.Name);
    formData.append("Url", data.Url);
    formData.append("Rpm", `${data.Rpm}`);
    formData.append("ReqQuery", data.ReqQuery);
    formData.append("ResField", data.ResField);
    try {
        await $fetch(`${conf.public.apiUrl}/webhook`, {
            method: "post",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: formData,
        });
        err.value = "";
        name.value = "";
        url.value = "";
        rpm.value = 1;
        reqQuery.value = "";
        resField.value = "";
        refresh();
        (document.getElementById(id) as HTMLDialogElement).close();
        resetForm();
    } catch (error: any) {
        console.log("error", error.message, error.data);
        err.value = `${error.data ? error.data : error.message}`;
    }
    loading.value = false;
};

const resetForm = async () => {
    renderCreateField.value = false;
    await new Promise((res) => setTimeout(res, 500));
    renderCreateField.value = true;
};
</script>
