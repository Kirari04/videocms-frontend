<template>
    <div class="flex flex-col">
        <div class="toast toast-top toast-end z-10">
            <div class="alert alert-error" v-if="err">
                <IconError class="stroke-current shrink-0 h-6 w-6" />
                <div>{{ err }}</div>
            </div>
        </div>
        <div v-if="!accountData?.Admin" class="alert alert-error">
            You don't have access to this page
        </div>
        <div v-if="accountData?.Admin" class="flex flex-col gap-4 p-6">
            <form @submit.prevent="create()" class="flex gap-6">
                <input v-model="hostname" placeholder="Hostname" type="text" :disabled="isLoading || createdServer !== null"
                    class=" input">
                <button type="submit" :disabled="isLoading || createdServer !== null"
                    class="btn btn-primary">Create</button>
            </form>
            <div v-if="createdServer" class=" bg-base-300 rounded-box p-6">
                <table class="table">
                    <tr>
                        <th>
                            UUID
                        </th>
                        <td>
                            {{ createdServer.UUID }}
                        </td>
                    </tr>
                    <tr>
                        <th>
                            Hostname
                        </th>
                        <td>
                            {{ createdServer.Hostname }}
                        </td>
                    </tr>
                    <tr>
                        <th>
                            Token
                        </th>
                        <td>
                            <input class="input text-base-content blur cursor-cell focus-within:blur-none"
                                v-model="createdServer.Token" readonly type="text">
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <div class="alert alert-warning font-bold">
                                <IconInfo class="h-5 w-5 stroke-current" />
                                The Token is only shown once. Make sure to save it.
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <button @click="createdServer = null" class="btn btn-neutral">Close</button>
                        </td>
                    </tr>
                </table>
            </div>
            <table class="table">
                <tr>
                    <th>UUID</th>
                    <th>Hostname</th>
                    <th>Online</th>
                    <th></th>
                </tr>
                <tr v-for="server in datas">
                    <td>
                        <input v-model="server.UUID" type="text" class="input text-base-content" readonly>
                    </td>
                    <td>
                        {{ server.Hostname }}
                    </td>
                    <td>
                        <span v-if="isOnline(server.LastPing)" class="badge badge-success">Online</span>
                        <span v-if="!isOnline(server.LastPing)" class="badge badge-error">Offline</span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-error">
                            Delete
                        </button>
                    </td>
                </tr>
            </table>
        </div>
    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: "panel",
    middleware: "auth",
});

const { data: accountData } = useAccountData()
watch(accountData, () => {
    if (accountData.value) {
        if (!accountData.value.Admin) {
            navigateTo("/my", {
                redirectCode: 307,
            })
        }
    }
})

const conf = useRuntimeConfig();
const token = useToken();
const err = ref("");
const isLoading = ref(false)

interface Server {
    ID: number
    UUID: string
    Hostname: string
    LastPing: string
}

interface CreateServer {
    ID: number
    UUID: string
    Token: string
    Hostname: string
}
const hostname = ref("")
const createdServer = ref<CreateServer | null>(null)
async function create() {
    isLoading.value = true;
    const {
        data,
        error,
    } = await useFetch<CreateServer>(`${conf.public.apiUrl}/server`, {
        method: "post",
        headers: {
            Authorization: `Bearer ${token.value}`,
        },
        body: {
            Hostname: hostname.value,
        }
    });

    if (error.value) {
        err.value = `${error.value?.data}`;
        isLoading.value = false;
        return;
    }
    if (data.value) {
        createdServer.value = data.value
    }
    hostname.value = ""
    isLoading.value = false;
    load()
}

const datas = ref<Server[]>([])

onMounted(() => {
    load()
})

async function load() {
    isLoading.value = true;
    const {
        data,
        error,
    } = await useFetch<Server[]>(`${conf.public.apiUrl}/servers`, {
        headers: {
            Authorization: `Bearer ${token.value}`,
        },
    });

    if (error.value) {
        err.value = `${error.value?.data}`;
        isLoading.value = false;
        return;
    }
    if (data.value) {
        datas.value = data.value
    }
    isLoading.value = false;
}

function isOnline(date: string): boolean {
    return (new Date(date).getTime() + (1000 * 60) - new Date().getTime()) > 0
}

</script>
