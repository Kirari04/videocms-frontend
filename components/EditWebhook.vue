<template>
    <label class="label">
        <span class="label-text">Name</span>
    </label>
    <input
        type="text"
        placeholder="api-xxxx"
        class="input input-bordered w-full"
        :disabled="props.loading"
        v-model="name"
        @change="$emit('name', name)"
        :autofocus="true"
        required
    />
    <label class="label">
        <span class="label-text">Url</span>
    </label>
    <input
        type="url"
        placeholder="https://xxx.xxx"
        class="input input-bordered w-full"
        :disabled="props.loading"
        v-model="url"
        @change="$emit('url', url)"
        required
    />
    <label class="label">
        <span class="label-text">Rpm (Requests per minute)</span>
    </label>
    <input
        type="number"
        placeholder="1"
        class="input input-bordered w-full"
        :disabled="props.loading"
        v-model="rpm"
        @change="$emit('rpm', rpm)"
        min="1"
        max="60"
        required
    />
    <label class="label">
        <span class="label-text">ReqQuery</span>
    </label>
    <input
        type="text"
        placeholder="info"
        class="input input-bordered w-full"
        :disabled="props.loading"
        v-model="reqQuery"
        @change="$emit('reqQuery', reqQuery)"
        required
    />
    <label class="label">
        <span class="label-text">ResField</span>
    </label>
    <input
        type="text"
        placeholder="info"
        class="input input-bordered w-full"
        :disabled="props.loading"
        v-model="resField"
        @change="$emit('resField', resField)"
        required
    />
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

const name = ref(props.name);
const url = ref(props.url);
const rpm = ref(props.rpm);
const reqQuery = ref(props.reqQuery);
const resField = ref(props.resField);
</script>
