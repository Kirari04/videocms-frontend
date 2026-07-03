<template>
    <div class="flex grow flex-col">
        <PageHeader title="Webhooks" description="Playback tracking and event notifications.">
            <button
                :onclick="`create_webhook_modal.showModal()`"
                :disabled="pending"
                class="btn btn-primary btn-sm gap-2">
                <Icon name="lucide:plus" class="h-4 w-4" />
                Create webhook
            </button>
        </PageHeader>

        <!-- Error/Status Toasts -->
        <div class="toast toast-top toast-end z-(--z-toast)">
            <div role="alert" class="alert alert-error" v-if="error">
                <Icon name="lucide:alert-circle" class="h-5 w-5 shrink-0" />
                <span v-if="error.data">{{ error.data }}</span>
                <span v-else>{{ error.message }}</span>
                <button @click="refresh()" class="btn btn-ghost btn-sm">Retry</button>
            </div>
        </div>

        <!-- Webhooks List -->
        <div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
            <div v-if="pending" class="flex flex-col gap-1.5 p-4" aria-hidden="true">
                <div v-for="i in 3" :key="i" class="skeleton h-9 w-full rounded-selector"></div>
            </div>

            <div v-else-if="!webhooks || webhooks?.length === 0"
                class="flex flex-col items-center justify-center gap-1 py-16 text-center">
                <Icon name="lucide:webhook" class="h-6 w-6 text-base-content/30" />
                <p class="text-sm font-medium">No webhooks yet</p>
                <p class="text-sm text-base-content/60">Create one to start tracking playback events.</p>
            </div>

            <table class="table table-sm" v-if="!pending && webhooks && webhooks?.length > 0">
                <thead>
                    <tr class="border-base-300 text-xs text-base-content/70">
                        <th class="font-medium">Name</th>
                        <th class="font-medium">Target URL</th>
                        <th class="font-medium">Frequency</th>
                        <th class="font-medium">Mapping</th>
                        <th class="text-right font-medium">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(webhook, i) in webhooks" :key="webhook.ID" class="border-base-300 hover:bg-base-200/60">
                        <td class="font-medium">{{ webhook.Name }}</td>
                        <td>
                            <div class="flex max-w-xs items-center gap-2 truncate" :title="webhook.Url">
                                <span class="badge badge-ghost badge-sm font-mono">POST</span>
                                <span class="truncate font-mono text-xs text-base-content/70">{{ webhook.Url }}</span>
                            </div>
                        </td>
                        <td>
                            <span class="tabular-nums" :title="`${webhook.Rpm} requests per minute`">{{ webhook.Rpm }} rpm</span>
                        </td>
                        <td>
                            <div class="flex flex-col gap-0.5 text-xs">
                                <span class="text-base-content/60">Req: <span class="font-mono text-base-content">{{ webhook.ReqQuery || '—' }}</span></span>
                                <span class="text-base-content/60">Res: <span class="font-mono text-base-content">{{ webhook.ResField || '—' }}</span></span>
                            </div>
                        </td>
                        <td class="text-right">
                            <button
                                :onclick="`edit_webhook_modal_${i}.showModal()`"
                                class="btn btn-square btn-ghost btn-sm"
                                :aria-label="`Edit ${webhook.Name}`">
                                <Icon name="lucide:edit-2" class="h-4 w-4" />
                            </button>

                            <!-- Edit Modal Teleport -->
                            <Teleport to="body">
                                <dialog :id="`edit_webhook_modal_${i}`" class="modal">
                                    <form @submit.prevent="update(webhook, `edit_webhook_modal_${i}`)"
                                        class="modal-box w-11/12 max-w-2xl bg-base-100">
                                        <button :onclick="`edit_webhook_modal_${i}.close()`" type="button"
                                            class="btn btn-square btn-ghost btn-sm absolute top-3 right-3" aria-label="Close">
                                            <Icon name="lucide:x" class="h-4 w-4" />
                                        </button>

                                        <h3 class="mb-4 text-base font-semibold">Edit webhook</h3>

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

                                        <div role="alert" class="alert alert-error mt-4 text-sm" v-if="err">
                                            <Icon name="lucide:alert-circle" class="h-4 w-4 shrink-0" />
                                            <span>{{ err }}</span>
                                        </div>

                                        <div class="modal-action">
                                            <button :disabled="loading" type="submit" class="btn btn-primary btn-sm">
                                                Save changes
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

        <!-- Documentation & Guide -->
        <div class="collapse-arrow collapse mt-6 rounded-box border border-base-300 bg-base-100">
            <input type="checkbox" aria-label="Toggle webhook documentation" />
            <div class="collapse-title flex items-center gap-2 text-sm font-medium">
                <Icon name="lucide:book-open" class="h-4 w-4 text-base-content/60" />
                How webhooks work
            </div>
            <div class="collapse-content">
                <div class="flex max-w-[70ch] flex-col gap-4 pt-1 text-sm">
                    <p>
                        The webhook system acts as a <strong>playback tracker</strong> (heartbeat). While a viewer
                        watches a video, the player periodically sends data to your configured server.
                    </p>

                    <ol class="flex flex-col gap-2">
                        <li class="flex gap-2.5">
                            <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium tabular-nums text-primary">1</span>
                            <span>When the player loads, it starts a timer based on your <strong>requests-per-minute</strong>
                                setting — <code class="rounded-selector bg-base-200 px-1 py-0.5 font-mono text-xs">60 rpm = every second</code>.</span>
                        </li>
                        <li class="flex gap-2.5">
                            <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium tabular-nums text-primary">2</span>
                            <span>On each tick, if the video is <strong>actively playing</strong>, the player extracts the
                                <code class="rounded-selector bg-base-200 px-1 py-0.5 font-mono text-xs">ReqQuery</code> parameter from the page URL.</span>
                        </li>
                        <li class="flex gap-2.5">
                            <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium tabular-nums text-primary">3</span>
                            <span>It builds a JSON payload (video UUID, playback time, your custom field) and
                                <strong>POSTs</strong> it to the target URL. Paused videos send nothing.</span>
                        </li>
                    </ol>

                    <div role="alert" class="alert alert-warning items-start">
                        <Icon name="lucide:alert-triangle" class="mt-0.5 h-5 w-5 shrink-0" />
                        <div class="text-sm">
                            <p class="font-medium">Common pitfalls</p>
                            <ul class="mt-1 list-inside list-disc">
                                <li><strong>CORS:</strong> your target server must accept requests from this domain.</li>
                                <li><strong>Missing URL params:</strong> if <code>ReqQuery</code> is set (e.g. <code>uid</code>), the player URL must contain it (e.g. <code>?uid=123</code>).</li>
                                <li><strong>Rate limiting:</strong> 60 rpm can spam your server — use a lower rate (e.g. 6) for general analytics.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Create Modal Teleport -->
        <Teleport to="body">
            <dialog :id="`create_webhook_modal`" class="modal">
                <form id="create_webhook_form"
                    @submit.prevent="create({ Name: name, Url: url, Rpm: rpm, ReqQuery: reqQuery, ResField: resField }, `create_webhook_modal`)"
                    class="modal-box w-11/12 max-w-2xl bg-base-100">
                    <button :onclick="`create_webhook_modal.close()`" type="button"
                        class="btn btn-square btn-ghost btn-sm absolute top-3 right-3" aria-label="Close">
                        <Icon name="lucide:x" class="h-4 w-4" />
                    </button>

                    <h3 class="mb-4 text-base font-semibold">Create webhook</h3>

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

                    <div role="alert" class="alert alert-error mt-4 text-sm" v-if="err">
                        <Icon name="lucide:alert-circle" class="h-4 w-4 shrink-0" />
                        <span>{{ err }}</span>
                    </div>

                    <div class="modal-action">
                        <button :disabled="loading" type="submit" class="btn btn-primary btn-sm">
                            Create webhook
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
    try {
        await $fetch(`${conf.public.apiUrl}/webhook`, {
            method: "put",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: {
                WebhookID: data.ID,
                Name: data.Name,
                Url: data.Url,
                Rpm: data.Rpm,
                ReqQuery: data.ReqQuery,
                ResField: data.ResField,
            },
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
    try {
        await $fetch(`${conf.public.apiUrl}/webhook`, {
            method: "post",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: {
                Name: data.Name,
                Url: data.Url,
                Rpm: data.Rpm,
                ReqQuery: data.ReqQuery,
                ResField: data.ResField,
            },
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
