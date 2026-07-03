<template>
    <div class="flex flex-col gap-5">
        <!-- Basic Info Section -->
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label class="flex w-full flex-col gap-1.5">
                <span class="text-sm font-medium">Name</span>
                <input
                    type="text"
                    placeholder="e.g. Analytics tracker"
                    class="input input-sm w-full"
                    :disabled="props.loading"
                    v-model="name"
                    @input="$emit('name', name)"
                    required
                />
            </label>

            <label class="flex w-full flex-col gap-1.5">
                <span class="text-sm font-medium">Requests per minute</span>
                <input
                    type="number"
                    placeholder="6"
                    class="input input-sm w-full tabular-nums"
                    :disabled="props.loading"
                    v-model="rpm"
                    @input="$emit('rpm', rpm)"
                    min="1"
                    max="60"
                    required
                />
                <span class="text-xs text-base-content/60">Tracking frequency, 1–60.</span>
            </label>
        </div>

        <!-- URL Section -->
        <label class="flex w-full flex-col gap-1.5">
            <span class="text-sm font-medium">Target URL</span>
            <div class="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <span class="badge badge-ghost shrink-0 font-mono">POST</span>
                <input
                    type="url"
                    placeholder="https://api.example.com/webhooks/video-tracking"
                    class="input input-sm w-full"
                    :disabled="props.loading"
                    v-model="url"
                    @input="$emit('url', url)"
                    required
                />
            </div>
            <span class="text-xs text-base-content/60">Data is sent as a JSON POST request.</span>
        </label>

        <!-- Parameters Section -->
        <fieldset class="rounded-field border border-base-300 p-4">
            <legend class="px-1.5 text-sm font-medium">Parameter mapping</legend>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label class="flex w-full flex-col gap-1.5">
                    <span class="flex items-center gap-1.5 text-sm font-medium">
                        Source query param
                        <span class="tooltip tooltip-right"
                            data-tip="The URL parameter to extract from the viewer's browser URL.">
                            <Icon name="lucide:help-circle" class="h-3.5 w-3.5 text-base-content/40" />
                        </span>
                    </span>
                    <input
                        type="text"
                        placeholder="e.g. userid"
                        class="input input-sm w-full font-mono text-sm"
                        :disabled="props.loading"
                        v-model="reqQuery"
                        @input="$emit('reqQuery', reqQuery)"
                        required
                    />
                    <span class="text-xs text-base-content/60">Reads from <code>?{{ reqQuery || 'param' }}=...</code></span>
                </label>

                <label class="flex w-full flex-col gap-1.5">
                    <span class="flex items-center gap-1.5 text-sm font-medium">
                        Payload JSON key
                        <span class="tooltip tooltip-left"
                            data-tip="The JSON key to use for the extracted value in the payload.">
                            <Icon name="lucide:help-circle" class="h-3.5 w-3.5 text-base-content/40" />
                        </span>
                    </span>
                    <input
                        type="text"
                        placeholder="e.g. user_id"
                        class="input input-sm w-full font-mono text-sm"
                        :disabled="props.loading"
                        v-model="resField"
                        @input="$emit('resField', resField)"
                        required
                    />
                    <span class="text-xs text-base-content/60">Sends <code>{ "{{ resField || 'key' }}": ... }</code></span>
                </label>
            </div>
        </fieldset>
    </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
    loading: boolean;
    name: string;
    url: string;
    rpm: number;
    reqQuery: string;
    resField: string;
}>();

const emit = defineEmits(['name', 'url', 'rpm', 'reqQuery', 'resField']);

const name = ref(props.name);
const url = ref(props.url);
const rpm = ref(props.rpm);
const reqQuery = ref(props.reqQuery);
const resField = ref(props.resField);

// Watch props to update local state if parent changes
watch(() => props.name, (val) => name.value = val);
watch(() => props.url, (val) => url.value = val);
watch(() => props.rpm, (val) => rpm.value = val);
watch(() => props.reqQuery, (val) => reqQuery.value = val);
watch(() => props.resField, (val) => resField.value = val);
</script>
