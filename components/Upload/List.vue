<template>
    <div class="w-full sm:w-1/2">
        <h4 class="font-bold text-lg bg-base-300 px-6 py-2 rounded">Queue</h4>
        <ul class="flex flex-col">
            <li class="px-6 py-2 bg-base-200" v-if="list.length === 0">
                No Videos in queue
            </li>
            <li v-if="list.length > 0" class="mt-2"></li>
            <li
                :class="
                    item.deleted
                        ? `flex flex-col max-w-full border-b-2 border-base-300 py-2 transition opacity-70`
                        : `flex flex-col max-w-full border-b-2 border-base-300 py-2 transition`
                "
                v-for="item in list"
            >
                <div class="flex items-center max-w-full overflow-hidden">
                    <div class="flex flex-col max-w-full overflow-hidden">
                        <label
                            class="truncate max-w-full"
                            :title="`${item.name}`"
                        >
                            {{ item.name }}
                        </label>
                        <div
                            v-for="error in item.log.filter(
                                (e) => e.level === 'error'
                            )"
                            class="alert alert-error px-2 py-1 flex flex-col items-start max-w-fit"
                        >
                            <span>{{ error.title }}</span>
                            <span class="text-xs">{{ error.description }}</span>
                        </div>
                    </div>
                    <div class="btn-group ml-auto">
                        <!-- <button
                            :disabled="item.deleted"
                            class="btn btn-xs btn-square"
                        >
                            <IconVert
                                class="w-4 h-4stroke-current fill-current"
                            />
                        </button> -->
                        <button
                            @click="removeUploadQueueItem(item.uuid)"
                            :disabled="item.deleted"
                            class="btn btn-xs btn-square relative"
                        >
                            <IconDelete
                                v-if="!item.deleted"
                                class="w-4 h-4stroke-current fill-current"
                            />
                            <div
                                v-if="item.deleted"
                                class="loading loading-xs loading-spinner absolute"
                            ></div>
                        </button>
                    </div>
                </div>
                <progress
                    :class="
                        item.progress > 0
                            ? `progress progress-primary mt-1 h-1 transition-all`
                            : `progress progress-primary mt-0 opacity-0 h-1 transition-all`
                    "
                    :value="item.progress"
                    max="100"
                ></progress>
            </li>
        </ul>
    </div>
</template>

<script lang="ts" setup>
const list = getUploadQueue();
</script>
