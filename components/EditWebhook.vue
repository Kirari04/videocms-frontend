<template>
    <div class="flex flex-col gap-6">
        <!-- Basic Info Section -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="form-control w-full">
                <label class="label">
                    <span class="label-text font-bold flex items-center gap-2">
                        <Icon name="lucide:tag" class="w-4 h-4 opacity-70" />
                        Webhook Name
                    </span>
                </label>
                <input
                    type="text"
                    placeholder="e.g. Analytics Tracker"
                    class="input input-bordered w-full focus:input-primary transition-all"
                    :disabled="props.loading"
                    v-model="name"
                    @input="$emit('name', name)"
                    required
                />
            </div>
            
            <div class="form-control w-full">
                <label class="label">
                    <span class="label-text font-bold flex items-center gap-2">
                        <Icon name="lucide:timer" class="w-4 h-4 opacity-70" />
                        Requests Per Minute (RPM)
                    </span>
                </label>
                <input
                    type="number"
                    placeholder="6"
                    class="input input-bordered w-full focus:input-primary transition-all"
                    :disabled="props.loading"
                    v-model="rpm"
                    @input="$emit('rpm', rpm)"
                    min="1"
                    max="60"
                    required
                />
                <label class="label">
                    <span class="label-text-alt opacity-50 italic">Determines tracking frequency (1-60)</span>
                </label>
            </div>
        </div>

        <!-- URL Section -->
        <div class="form-control w-full">
            <label class="label">
                <span class="label-text font-bold flex items-center gap-2">
                    <Icon name="lucide:link" class="w-4 h-4 opacity-70" />
                    Target Destination URL
                </span>
            </label>
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div class="badge badge-neutral badge-lg h-12 px-4 shrink-0 font-mono font-bold tracking-wider border-none">
                    POST
                </div>
                <input
                    type="url"
                    placeholder="https://api.example.com/webhooks/video-tracking"
                    class="input input-bordered w-full focus:input-primary transition-all"
                    :disabled="props.loading"
                    v-model="url"
                    @input="$emit('url', url)"
                    required
                />
            </div>
            <label class="label">
                <span class="label-text-alt opacity-50">Data will be sent as a JSON POST request.</span>
            </label>
        </div>

        <div class="divider text-xs font-bold opacity-30 uppercase tracking-[0.2em]">Parameter Mapping</div>

        <!-- Parameters Section -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="form-control w-full">
                <label class="label">
                    <span class="label-text font-bold flex items-center gap-2">
                        <Icon name="lucide:search" class="w-4 h-4 opacity-70" />
                        Source Query Param
                    </span>
                    <div class="tooltip tooltip-right" data-tip="The URL parameter to extract from the viewer's browser URL.">
                        <Icon name="lucide:help-circle" class="w-4 h-4 opacity-40" />
                    </div>
                </label>
                <input
                    type="text"
                    placeholder="e.g. userid"
                    class="input input-bordered w-full font-mono text-sm bg-base-200/30"
                    :disabled="props.loading"
                    v-model="reqQuery"
                    @input="$emit('reqQuery', reqQuery)"
                    required
                />
                <label class="label">
                    <span class="label-text-alt opacity-60">Reads from <code>?{{ reqQuery || 'param' }}=...</code></span>
                </label>
            </div>

            <div class="form-control w-full">
                <label class="label">
                    <span class="label-text font-bold flex items-center gap-2">
                        <Icon name="lucide:code" class="w-4 h-4 opacity-70" />
                        Payload JSON Key
                    </span>
                    <div class="tooltip tooltip-left" data-tip="The JSON key to use for the extracted value in the payload.">
                        <Icon name="lucide:help-circle" class="w-4 h-4 opacity-40" />
                    </div>
                </label>
                <input
                    type="text"
                    placeholder="e.g. user_id"
                    class="input input-bordered w-full font-mono text-sm bg-base-200/30"
                    :disabled="props.loading"
                    v-model="resField"
                    @input="$emit('resField', resField)"
                    required
                />
                <label class="label">
                    <span class="label-text-alt opacity-60">Sends <code>{ "{{ resField || 'key' }}": ... }</code></span>
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

// Watch props to update local state if parent changes
watch(() => props.name, (val) => name.value = val);
watch(() => props.url, (val) => url.value = val);
watch(() => props.rpm, (val) => rpm.value = val);
watch(() => props.reqQuery, (val) => reqQuery.value = val);
watch(() => props.resField, (val) => resField.value = val);
</script>
