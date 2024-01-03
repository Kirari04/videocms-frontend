<script lang="ts" setup>

import 'tinymce/tinymce'
import 'tinymce/icons/default/icons'
import 'tinymce/themes/silver/theme'
import 'tinymce/models/dom/model'
import 'tinymce/skins/ui/oxide/skin.css'
import contentUiCss from 'tinymce/skins/ui/oxide/content.css?inline';

import 'tinymce/plugins/lists/plugin'
import 'tinymce/plugins/link/plugin'
import 'tinymce/plugins/image/plugin'
import 'tinymce/plugins/table/plugin'
import 'tinymce/plugins/code/plugin'
import 'tinymce/plugins/help/plugin'
import 'tinymce/plugins/help/js/i18n/keynav/en'
import 'tinymce/plugins/wordcount/plugin'

import Editor from '@tinymce/tinymce-vue'

const init = {
    skin: false,
    plugins: 'lists link image table code help wordcount',
    content_css: false,
    content_style: contentUiCss,
}

const html = ref("")

const emit = defineEmits<{
    (event: 'update', html: string): void
}>()

watch(html, () => {
    emit('update', html.value)
})
</script>

<template>
    <ClientOnly>
        <Editor v-model="html" output-format="html" :init="init" />
        <p>
            {{ html }}
        </p>
    </ClientOnly>
</template>