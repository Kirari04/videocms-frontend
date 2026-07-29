<template>
    <div class="flex flex-col">
        <PageHeader
            :title="isEdit ? 'Edit static page' : 'New static page'"
            description="Publish supporting content without changing the site layout.">
            <NuxtLink to="/my/webpages" class="btn btn-ghost btn-sm gap-2">
                <Icon name="lucide:arrow-left" class="h-4 w-4" />
                Back
            </NuxtLink>
        </PageHeader>

        <div v-if="errorMessage" class="alert alert-error mb-6" role="alert">
            <Icon name="lucide:circle-alert" class="h-5 w-5 shrink-0" />
            <span>{{ errorMessage }}</span>
            <button
                type="button"
                class="btn btn-circle btn-ghost btn-sm ml-auto"
                aria-label="Dismiss error"
                @click="errorMessage = null">
                <Icon name="lucide:x" class="h-4 w-4" />
            </button>
        </div>

        <form class="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]" @submit.prevent="save">
            <div class="flex min-w-0 flex-col gap-6">
                <section class="rounded-box border border-base-300 bg-base-100">
                    <div class="border-b border-base-300 px-5 py-4">
                        <h2 class="text-sm font-medium">Page details</h2>
                    </div>
                    <div class="grid gap-4 p-5 md:grid-cols-2">
                        <label class="flex min-w-0 flex-col gap-2">
                            <span class="text-sm font-medium">Title</span>
                            <input
                                v-model.trim="form.Title"
                                type="text"
                                maxlength="128"
                                class="input w-full"
                                placeholder="Privacy policy"
                                required />
                        </label>

                        <label class="flex min-w-0 flex-col gap-2">
                            <span class="text-sm font-medium">Public path</span>
                            <span class="join flex w-full">
                                <span
                                    class="btn join-item no-animation shrink-0 border-base-300 bg-base-200 px-3 font-mono text-sm text-base-content/70">
                                    /p
                                </span>
                                <input
                                    v-model.trim="form.Path"
                                    type="text"
                                    maxlength="50"
                                    class="input join-item min-w-0 flex-1 font-mono"
                                    placeholder="/privacy/"
                                    required />
                            </span>
                            <span class="text-xs text-base-content/70">{{ publicPath }}</span>
                        </label>
                    </div>
                </section>

                <section class="overflow-hidden rounded-box border border-base-300 bg-base-100">
                    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 px-4 py-3">
                        <div class="join" role="group" aria-label="Content format">
                            <button
                                type="button"
                                class="btn btn-sm join-item"
                                :class="form.Format === 'markdown' ? 'btn-neutral' : 'btn-ghost'"
                                :aria-pressed="form.Format === 'markdown'"
                                @click="setFormat('markdown')">
                                Markdown
                            </button>
                            <button
                                type="button"
                                class="btn btn-sm join-item"
                                :class="form.Format === 'html' ? 'btn-neutral' : 'btn-ghost'"
                                :aria-pressed="form.Format === 'html'"
                                @click="setFormat('html')">
                                HTML
                            </button>
                        </div>

                        <div class="tabs tabs-box bg-base-200 p-1" role="tablist" aria-label="Editor view">
                            <button
                                type="button"
                                role="tab"
                                class="tab h-8 px-3"
                                :class="{ 'tab-active': activeTab === 'write' }"
                                :aria-selected="activeTab === 'write'"
                                @click="activeTab = 'write'">
                                Write
                            </button>
                            <button
                                type="button"
                                role="tab"
                                class="tab h-8 px-3"
                                :class="{ 'tab-active': activeTab === 'preview' }"
                                :aria-selected="activeTab === 'preview'"
                                @click="showPreview">
                                Preview
                            </button>
                        </div>
                    </div>

                    <div
                        v-if="form.Format === 'html'"
                        class="flex gap-2 border-b border-base-300 bg-warning/10 px-4 py-3 text-sm text-base-content">
                        <Icon name="lucide:shield-check" class="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                        <p>
                            Advanced HTML is sanitized. Scripts, embeds, inline styles, and unsafe attributes are removed.
                        </p>
                    </div>

                    <label v-if="activeTab === 'write'" class="block">
                        <span class="sr-only">Page content</span>
                        <textarea
                            v-model="form.Content"
                            class="textarea min-h-[32rem] w-full resize-y rounded-none border-0 bg-base-100 p-5 font-mono text-sm leading-6 focus:outline-none"
                            :placeholder="contentPlaceholder"
                            maxlength="50000"
                            required />
                    </label>

                    <div v-else class="min-h-[32rem] bg-base-200 p-4 sm:p-6">
                        <div v-if="previewLoading" class="space-y-4" aria-label="Loading preview">
                            <div class="skeleton h-8 w-2/5"></div>
                            <div class="skeleton h-4 w-full"></div>
                            <div class="skeleton h-4 w-4/5"></div>
                            <div class="skeleton h-28 w-full"></div>
                        </div>
                        <div
                            v-else-if="!form.Content.trim()"
                            class="flex min-h-[26rem] flex-col items-center justify-center gap-2 text-center">
                            <Icon name="lucide:file-text" class="h-6 w-6 text-base-content/30" />
                            <p class="text-sm font-medium">Nothing to preview</p>
                            <p class="text-sm text-base-content/70">Add some content in the Write tab first.</p>
                        </div>
                        <article v-else class="rounded-box border border-base-300 bg-base-100">
                            <header class="mx-auto max-w-[70rem] px-6 pt-8">
                                <h1 class="text-3xl font-semibold tracking-tight">{{ form.Title || "Untitled page" }}</h1>
                            </header>
                            <WebpageRenderer :html="previewHtml" compact />
                        </article>
                    </div>
                </section>
            </div>

            <aside class="rounded-box border border-base-300 bg-base-100 xl:sticky xl:top-6">
                <div class="border-b border-base-300 px-4 py-3">
                    <h2 class="text-sm font-medium">Publication</h2>
                </div>
                <div class="flex flex-col gap-5 p-4">
                    <label class="flex cursor-pointer items-start justify-between gap-4">
                        <span class="flex min-w-0 flex-col gap-1">
                            <span class="text-sm font-medium">Published</span>
                            <span class="text-xs leading-5 text-base-content/70">
                                Hidden pages return 404 but remain editable.
                            </span>
                        </span>
                        <input v-model="form.Published" type="checkbox" class="toggle toggle-primary mt-0.5" />
                    </label>

                    <div class="h-px bg-base-300"></div>

                    <label class="flex cursor-pointer items-start justify-between gap-4">
                        <span class="flex min-w-0 flex-col gap-1">
                            <span class="text-sm font-medium">Footer link</span>
                            <span class="text-xs leading-5 text-base-content/70">
                                Show this page in public footer navigation when published.
                            </span>
                        </span>
                        <input v-model="form.ListInFooter" type="checkbox" class="toggle toggle-primary mt-0.5" />
                    </label>

                    <button type="submit" class="btn btn-primary w-full gap-2" :disabled="!canSave || saving">
                        <span v-if="saving" class="loading loading-spinner loading-sm"></span>
                        <Icon v-else name="lucide:save" class="h-4 w-4" />
                        {{ isEdit ? "Save changes" : "Create page" }}
                    </button>

                    <button
                        v-if="isEdit"
                        type="button"
                        class="btn btn-ghost w-full gap-2 text-error"
                        :disabled="saving"
                        @click="deletePage">
                        <Icon name="lucide:trash-2" class="h-4 w-4" />
                        Delete page
                    </button>
                </div>
            </aside>
        </form>
    </div>
</template>

<script setup lang="ts">
import type { AdminWebPage, StaticPageDraft, WebPageFormat } from "~/types/webpage";

const props = withDefaults(defineProps<{
    page?: AdminWebPage | null;
}>(), {
    page: null,
});

const conf = useRuntimeConfig();
const token = useToken();

const form = reactive<StaticPageDraft>({
    Title: "",
    Path: "",
    Content: "",
    Format: "markdown",
    Published: true,
    ListInFooter: true,
});

const saving = ref(false);
const activeTab = ref<"write" | "preview">("write");
const previewHtml = ref("");
const previewLoading = ref(false);
const errorMessage = ref<string | null>(null);
let previewRequest = 0;

const isEdit = computed(() => Boolean(props.page?.ID));
const canSave = computed(() => Boolean(
    form.Title.trim() &&
    form.Path.trim() &&
    form.Content.trim(),
));
const publicPath = computed(() => {
    const path = form.Path.trim().replace(/^\/+|\/+$/g, "");
    return path ? `/p/${path}/` : "/p/…";
});
const contentPlaceholder = computed(() => (
    form.Format === "markdown"
        ? "Write your page content with Markdown…"
        : "<p>Write a safe HTML fragment…</p>"
));

watch(
    () => props.page,
    (page) => {
        if (!page) return;
        Object.assign(form, {
            Title: page.Title,
            Path: page.Path,
            Content: page.Content,
            Format: page.Format,
            Published: page.Published,
            ListInFooter: page.ListInFooter,
        });
    },
    { immediate: true },
);

function setFormat(format: WebPageFormat) {
    if (form.Format === format) return;
    form.Format = format;
    previewHtml.value = "";
    if (activeTab.value === "preview") {
        void refreshPreview();
    }
}

async function showPreview() {
    activeTab.value = "preview";
    await refreshPreview();
}

async function refreshPreview() {
    if (!form.Content.trim()) {
        previewHtml.value = "";
        previewLoading.value = false;
        return;
    }

    const request = ++previewRequest;
    previewLoading.value = true;
    try {
        const html = await $fetch<string>(`${conf.public.apiUrl}/page/preview`, {
            method: "post",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: {
                Content: form.Content,
                Format: form.Format,
            },
        });
        if (request === previewRequest) {
            previewHtml.value = html;
        }
    } catch (error: any) {
        if (request === previewRequest) {
            errorMessage.value = error.data || error.message;
            activeTab.value = "write";
        }
    } finally {
        if (request === previewRequest) {
            previewLoading.value = false;
        }
    }
}

async function save() {
    if (!canSave.value || saving.value) return;

    saving.value = true;
    errorMessage.value = null;
    try {
        await $fetch(`${conf.public.apiUrl}/page`, {
            method: isEdit.value ? "put" : "post",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: {
                ...(isEdit.value ? { WebPageID: props.page!.ID } : {}),
                ...form,
            },
        });
        await navigateTo("/my/webpages");
    } catch (error: any) {
        errorMessage.value = error.data || error.message;
    } finally {
        saving.value = false;
    }
}

async function deletePage() {
    if (!props.page || saving.value) return;
    if (!confirm(`Delete "${props.page.Title}"? This cannot be undone.`)) return;

    saving.value = true;
    errorMessage.value = null;
    try {
        await $fetch(`${conf.public.apiUrl}/page`, {
            method: "delete",
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            body: {
                WebPageID: props.page.ID,
            },
        });
        await navigateTo("/my/webpages");
    } catch (error: any) {
        errorMessage.value = error.data || error.message;
    } finally {
        saving.value = false;
    }
}
</script>
