<template>
    <div class="flex flex-col">
        <table class="table table-cell table-zebra w-full border-base-100">
            <thead>
                <tr>
                    <th>
                        Name
                    </th>
                    <th>
                        Quality
                    </th>
                    <th>
                        Progress
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-if="datas.length === 0">
                    <td colspan="3">
                        No active encodings queued atm.
                    </td>
                </tr>
                <tr v-for="task in datas">
                    <td>
                        {{ task.Name }}
                    </td>
                    <td>
                        <span class=" badge badge-neutral">
                            {{ task.Quality }}
                        </span>
                    </td>
                    <td>
                        <div class="flex items-center">
                            <span :class="task.Progress === 0
                                ? 'loading loading-spinner text-primary loading-lg'
                                : 'radial-progress text-primary'
                                " :style="`
                                --value: ${task.Progress * 100};
                                --size: 2.5rem;
                                --thickness: 3px;
                            `">
                                <span class="text-xs whitespace-nowrap">
                                    {{ `${task.Progress * 100}`.substring(0, 3) }} %
                                </span>
                            </span>
                        </div>

                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: "panel",
    middleware: "auth",
});

const conf = useRuntimeConfig();
const token = useToken();
interface Encoding {
    ID: number;
    Name: string;
    Quality: string;
    Progress: number;
}
const datas = ref<Encoding[]>([])
const errors = ref<string | null>(null)

async function load() {
    const {
        data,
        error,
    } = await useFetch<Encoding[]>(`${conf.public.apiUrl}/encodings`, {
        headers: {
            Authorization: `Bearer ${token.value}`,
        },
    });
    if (error.value) {
        errors.value = `${error.value.data}`
        return
    }
    if (data.value) {
        datas.value = data.value
    }
}

let intv: NodeJS.Timeout | null = null;
onMounted(() => {
    load()
    intv = setInterval(() => {
        load()
    }, 5000)
})
onUnmounted(() => {
    if (intv) {
        clearInterval(intv)
    }
})
</script>
