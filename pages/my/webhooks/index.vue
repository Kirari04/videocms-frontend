<template>
    <div class="flex flex-col grow">
        <div class="toast toast-top toast-end">
            <div class="alert alert-info" v-if="pending">
                <div class="loading loading-spinner loading-sm"></div>
                <div>Loading...</div>
            </div>
            <div class="alert alert-error" v-if="error">
                <IconError class="stroke-current shrink-0 h-6 w-6" />
                <div v-if="error.data">{{ error.data }}</div>
                <div v-else>{{ error.message }}</div>
                <div>
                    <button @click="refresh()" class="btn btn-sm">Retry</button>
                </div>
            </div>
        </div>
        <div class="flex justify-end">
            <div class="btn-group">
                <button
                    @click="refresh()"
                    :disabled="pending"
                    class="btn btn-neutral btn-sm"
                >
                    Refresh
                </button>
                <button
                    :onclick="`create_webhook_modal.showModal()`"
                    :disabled="pending"
                    class="btn btn-neutral btn-sm"
                >
                    Create
                </button>
            </div>
        </div>
        <div v-if="!pending && (!webhooks || webhooks?.length === 0)">
            <p>No webhooks created yet</p>
        </div>
        <div
            class="overflow-x-auto p-6"
            v-if="webhooks && webhooks?.length > 0"
        >
            <table class="table border-collapse border-base-100">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Url</th>
                        <th>Rpm</th>
                        <th>ReqQuery</th>
                        <th>ResField</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(webhook, i) in webhooks">
                        <td>{{ webhook.Name }}</td>
                        <td>{{ webhook.Url }}</td>
                        <td>{{ webhook.Rpm }}</td>
                        <td>{{ webhook.ReqQuery }}</td>
                        <td>{{ webhook.ResField }}</td>
                        <td>
                            <label
                                :onclick="`edit_webhook_modal_${i}.showModal()`"
                                class="btn btn-neutral btn-sm"
                            >
                                Edit
                            </label>
                            <dialog
                                :id="`edit_webhook_modal_${i}`"
                                class="modal"
                            >
                                <form
                                    @submit.prevent="
                                        update(
                                            webhook,
                                            `edit_webhook_modal_${i}`
                                        )
                                    "
                                    class="modal-box card"
                                >
                                    <button
                                        :onclick="`edit_webhook_modal_${i}.close()`"
                                        type="button"
                                        class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                                    >
                                        ✕
                                    </button>
                                    <div class="card-body">
                                        <h2 class="card-title">Edit Webhook</h2>
                                        <EditWebhook
                                            :loading="loading"
                                            :name="webhook.Name"
                                            @name="webhook.Name = $event"
                                            :url="webhook.Url"
                                            @url="webhook.Url = $event"
                                            :rpm="webhook.Rpm"
                                            @rpm="webhook.Rpm = $event"
                                            :req-query="webhook.ReqQuery"
                                            @req-query="
                                                webhook.ReqQuery = $event
                                            "
                                            :res-field="webhook.ResField"
                                            @res-field="
                                                webhook.ResField = $event
                                            "
                                        />
                                        <label class="label">
                                            <span
                                                class="label-text-alt text-red-400"
                                                v-if="err"
                                                >{{ err }}</span
                                            >
                                        </label>
                                        <div class="card-actions justify-start">
                                            <button
                                                :disabled="loading"
                                                type="submit"
                                                class="btn btn-primary btn-sm"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                </form>
                                <form method="dialog" class="modal-backdrop">
                                    <button>close</button>
                                </form>
                            </dialog>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    <teleport to="body">
        <dialog :id="`create_webhook_modal`" class="modal">
            <form
                @submit.prevent="
                    create(
                        {
                            Name: name,
                            Url: url,
                            Rpm: rpm,
                            ReqQuery: reqQuery,
                            ResField: resField,
                        },
                        `create_webhook_modal`
                    )
                "
                class="modal-box card"
            >
                <button
                    :onclick="`create_webhook_modal.close()`"
                    type="button"
                    class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                >
                    ✕
                </button>
                <div class="card-body">
                    <h2 class="card-title">Create Webhook</h2>
                    <EditWebhook
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
                    <label class="label">
                        <span class="label-text-alt text-red-400" v-if="err">{{
                            err
                        }}</span>
                    </label>
                    <div class="card-actions justify-start">
                        <button
                            :disabled="loading"
                            type="submit"
                            class="btn btn-primary btn-sm"
                        >
                            Create
                        </button>
                    </div>
                </div>
            </form>
            <form method="dialog" class="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    </teleport>
</template>

<script lang="ts" setup>
const conf = useRuntimeConfig();
const token = useToken();
definePageMeta({
    layout: "panel",
});

const err = ref("");
const loading = ref(false);

const name = ref("");
const url = ref("");
const rpm = ref("");
const reqQuery = ref("");
const resField = ref("");

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
        Rpm: string;
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
        Rpm: string;
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
    formData.append("Rpm", data.Rpm);
    formData.append("ReqQuery", data.ReqQuery);
    formData.append("ResField", data.ResField);
    const { error } = await useFetch(`${conf.public.apiUrl}/webhook`, {
        method: "put",
        headers: {
            Authorization: `Bearer ${token.value}`,
        },
        body: formData,
    });
    loading.value = false;
    if (error.value) {
        console.log("error", error.value.message, error.value.data);
        err.value = `${error.value?.data}`;
        return;
    }
    err.value = "";
    refresh();
    (document.getElementById(id) as HTMLDialogElement).close();
};

const create = async (
    data: {
        Name: string;
        Url: string;
        Rpm: string;
        ReqQuery: string;
        ResField: string;
    },
    id: string
) => {
    loading.value = true;
    const formData = new FormData();
    formData.append("Name", data.Name);
    formData.append("Url", data.Url);
    formData.append("Rpm", data.Rpm);
    formData.append("ReqQuery", data.ReqQuery);
    formData.append("ResField", data.ResField);
    const { error } = await useFetch(`${conf.public.apiUrl}/webhook`, {
        method: "post",
        headers: {
            Authorization: `Bearer ${token.value}`,
        },
        body: formData,
    });
    loading.value = false;
    if (error.value) {
        console.log("error", error.value.message, error.value.data);
        err.value = `${error.value?.data}`;
        return;
    }
    err.value = "";
    refresh();
    (document.getElementById(id) as HTMLDialogElement).close();
    name.value = "";
    url.value = "";
    rpm.value = "";
    reqQuery.value = "";
    resField.value = "";
};
</script>
