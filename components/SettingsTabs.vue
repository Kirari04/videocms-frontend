<template>
    <div role="tablist" :aria-label="label" class="tabs tabs-box max-w-full flex-nowrap overflow-x-auto"
        @keydown="onKeydown">
        <button v-for="tab in tabs" :key="tab.id" type="button" role="tab"
            :id="`${idPrefix}-tab-${tab.id}`" :aria-controls="`${idPrefix}-panel-${tab.id}`"
            :aria-selected="modelValue === tab.id" :tabindex="modelValue === tab.id ? 0 : -1"
            class="tab gap-2 whitespace-nowrap px-4 focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2"
            :class="{ 'tab-active': modelValue === tab.id }" @click="emit('update:modelValue', tab.id)">
            <Icon v-if="tab.icon" :name="tab.icon" class="h-4 w-4" aria-hidden="true" />
            {{ tab.label }}
            <span v-if="tab.count" class="badge badge-sm border-none bg-primary/10 text-primary tabular-nums">{{ tab.count }}</span>
        </button>
    </div>
</template>

<script setup lang="ts">
const props = defineProps<{
    modelValue: string;
    idPrefix: string;
    label: string;
    tabs: { id: string; label: string; icon?: string; count?: number }[];
}>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

async function onKeydown(event: KeyboardEvent) {
    const index = props.tabs.findIndex(tab => tab.id === props.modelValue);
    let next: number;
    switch (event.key) {
        case 'ArrowRight': next = (index + 1) % props.tabs.length; break;
        case 'ArrowLeft': next = (index - 1 + props.tabs.length) % props.tabs.length; break;
        case 'Home': next = 0; break;
        case 'End': next = props.tabs.length - 1; break;
        default: return;
    }
    event.preventDefault();
    const tablist = event.currentTarget as HTMLElement;
    emit('update:modelValue', props.tabs[next]!.id);
    await nextTick();
    const button = tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next];
    button?.focus({ preventScroll: true });
    button?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
</script>
