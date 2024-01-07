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
                <tr v-for="task in data">
                    <td>
                        {{ task.Name }}
                    </td>
                    <td>
                        {{ task.Quality }}
                    </td>
                    <td>
                        <span :class="task.Progress == 0
                            ? 'loading loading-spinner text-primary loading-lg'
                            : 'radial-progress text-primary'
                            " :style="`
                                --value: ${task.Progress};
                                --size: 2.5rem;
                                --thickness: 3px;
                            `">
                            <span class="text-xs whitespace-nowrap">{{ `${task.Progress * 100}`.substring(0, 3) }} %</span>
                        </span>
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
const {
    data,
    refresh,
} = useFetch<{
    ID: number;
    Name: string;
    Quality: string;
    Progress: number;
}[]>(`${conf.public.apiUrl}/encodings`, {
    headers: {
        Authorization: `Bearer ${token.value}`,
    },
});

let intv: NodeJS.Timeout | null = null;
onMounted(() => {
    intv = setInterval(() => {
        refresh()
    }, 5000)
})
onUnmounted(() => {
    if (intv) {
        clearInterval(intv)
    }
})
</script>
