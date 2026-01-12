<template>
    <div class="flex flex-col gap-4">
        <!-- Basic Info -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
                <label class="label">
                    <span class="label-text font-medium">Name</span>
                </label>
                <input
                    type="text"
                    placeholder="e.g. Analytics Tracker"
                    class="input input-bordered w-full"
                    :disabled="props.loading"
                    v-model="name"
                    @input="$emit('name', name)"
                    required
                />
            </div>
            <div class="form-control">
                <label class="label">
                    <span class="label-text font-medium">Requests Per Minute (RPM)</span>
                </label>
                <input
                    type="number"
                    placeholder="6"
                    class="input input-bordered w-full"
                    :disabled="props.loading"
                    v-model="rpm"
                    @input="$emit('rpm', rpm)"
                    min="1"
                    max="60"
                    required
                />
                <label class="label">
                    <span class="label-text-alt opacity-70">Limit: 1 - 60</span>
                </label>
            </div>
        </div>

        <div class="form-control">
            <label class="label">
                <span class="label-text font-medium">Target URL</span>
            </label>
            <div class="join">
                <span class="btn btn-neutral join-item no-animation">POST</span>
                <input
                    type="url"
                    placeholder="https://api.example.com/webhooks/video-tracking"
                    class="input input-bordered w-full join-item"
                    :disabled="props.loading"
                    v-model="url"
                    @input="$emit('url', url)"
                    required
                />
            </div>
        </div>

        <div class="divider text-xs font-bold opacity-50 uppercase tracking-widest">Parameter Mapping</div>

        <!-- Parameters -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
                <label class="label">
                    <span class="label-text font-medium">Request Query Param</span>
                    <div class="tooltip tooltip-right" data-tip="The URL parameter to extract from the viewer's browser URL.">
                        <Icon name="lucide:help-circle" class="w-4 h-4 opacity-50" />
                    </div>
                </label>
                <input
                    type="text"
                    placeholder="e.g. userid"
                    class="input input-bordered w-full font-mono text-sm"
                    :disabled="props.loading"
                    v-model="reqQuery"
                    @input="$emit('reqQuery', reqQuery)"
                    required
                />
                <label class="label">
                    <span class="label-text-alt opacity-70">Extracts <code>?userid=...</code></span>
                </label>
            </div>
            <div class="form-control">
                <label class="label">
                    <span class="label-text font-medium">Response JSON Field</span>
                    <div class="tooltip tooltip-left" data-tip="The JSON key to send the extracted value as in the webhook payload.">
                        <Icon name="lucide:help-circle" class="w-4 h-4 opacity-50" />
                    </div>
                </label>
                <input
                    type="text"
                    placeholder="e.g. user_id"
                    class="input input-bordered w-full font-mono text-sm"
                    :disabled="props.loading"
                    v-model="resField"
                    @input="$emit('resField', resField)"
                    required
                />
                <label class="label">
                    <span class="label-text-alt opacity-70">Sends <code>{ "user_id": ... }</code></span>
                </label>
            </div>
        </div>
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

// Watch props to update local state if parent changes (e.g. when opening different edit modals)
watch(() => props.name, (val) => name.value = val);
watch(() => props.url, (val) => url.value = val);
watch(() => props.rpm, (val) => rpm.value = val);
watch(() => props.reqQuery, (val) => reqQuery.value = val);
watch(() => props.resField, (val) => resField.value = val);
</script>