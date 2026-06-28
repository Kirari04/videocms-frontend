<template>
    <div :class="{ 'gjs-dark-theme': theme === 'dark' }" class="gjs-custom-editor-wrap border border-base-300 rounded-lg overflow-hidden h-full min-h-[600px] w-full bg-base-100 flex flex-col text-left">
        <div class="panel__top flex flex-wrap justify-between items-center gap-2 p-2 border-b border-base-300 bg-base-200">
            <div class="panel__basic-actions"></div>
            <div class="panel__devices"></div>
            <div class="panel__switcher"></div>
        </div>

        <div class="editor-row flex grow overflow-hidden">
            <div class="editor-canvas grow relative">
                <div :id="containerId" class="h-full"></div>
            </div>

            <div class="panel__right w-72 lg:w-80 bg-base-200 border-l border-base-300 flex flex-col shrink-0 overflow-y-auto">
                <div class="blocks-container p-3"></div>
                <div class="layers-container"></div>
                <div class="styles-container"></div>
                <div class="traits-container"></div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import 'grapesjs/dist/css/grapes.min.css'
import grapesjs from 'grapesjs'
import { v4 as uuidv4 } from 'uuid'
import webpageBuilderCss from '~/assets/css/webpage-builder.css?raw'
import { webpageBuilderBlocks } from '~/utils/webpageBuilderBlocks'
import { ensureWebpageRoot, serializeWebpageContent, splitStoredWebpageHtml } from '~/utils/webpageBuilderContent'

const { theme } = useTheme()

const props = defineProps<{
    initHtml?: string
}>()

const emit = defineEmits<{
    (event: 'update', html: string): void
}>()

const containerId = `gjs-${uuidv4()}`
let editor: any = null
let isApplyingContent = false
let lastAppliedInput = ''
let lastEmittedContent = ''

function getEditorWrap() {
    return editor?.getContainer()?.closest('.gjs-custom-editor-wrap') as HTMLElement | null
}

function setVisiblePanel(panel: 'blocks' | 'layers' | 'styles' | 'traits') {
    const wrap = getEditorWrap()
    if (!wrap) return

    const panels = {
        blocks: wrap.querySelector<HTMLElement>('.blocks-container'),
        layers: wrap.querySelector<HTMLElement>('.layers-container'),
        styles: wrap.querySelector<HTMLElement>('.styles-container'),
        traits: wrap.querySelector<HTMLElement>('.traits-container'),
    }

    Object.entries(panels).forEach(([key, element]) => {
        if (element) {
            element.style.display = key === panel ? 'block' : 'none'
        }
    })
}

function applyCanvasTheme() {
    if (!editor?.Canvas) return

    const frameDocument = editor.Canvas.getDocument?.()
    if (!frameDocument?.head || !frameDocument.body) return

    frameDocument.documentElement.setAttribute('data-theme', theme.value)
    frameDocument.body.classList.add('vc-builder-canvas-body')

    let styleElement = frameDocument.getElementById('vc-webpage-builder-css') as HTMLStyleElement | null
    if (!styleElement) {
        styleElement = frameDocument.createElement('style')
        styleElement.id = 'vc-webpage-builder-css'
        frameDocument.head.appendChild(styleElement)
    }

    styleElement.textContent = webpageBuilderCss
}

function emitCurrentContent() {
    if (!editor || isApplyingContent) return

    const serialized = serializeWebpageContent(editor)
    if (serialized === lastEmittedContent) return

    lastEmittedContent = serialized
    emit('update', serialized)
}

function applyStoredContent(input = '') {
    if (!editor) return

    isApplyingContent = true
    lastAppliedInput = input

    const { html, css } = splitStoredWebpageHtml(input)
    editor.setStyle(css || '')
    editor.setComponents(ensureWebpageRoot(html))

    window.setTimeout(() => {
        isApplyingContent = false
        emitCurrentContent()
    }, 0)
}

onMounted(async () => {
    await nextTick()

    editor = grapesjs.init({
        container: `#${containerId}`,
        height: '100%',
        width: 'auto',
        storageManager: false,
        canvas: {
            styles: [],
            scripts: [],
        },
        blockManager: {
            appendTo: '.blocks-container',
            blocks: webpageBuilderBlocks,
        },
        layerManager: {
            appendTo: '.layers-container',
        },
        styleManager: {
            appendTo: '.styles-container',
            sectors: [
                {
                    name: 'Layout',
                    open: true,
                    buildProps: ['display', 'width', 'max-width', 'min-height', 'margin', 'padding'],
                },
                {
                    name: 'Typography',
                    open: false,
                    buildProps: ['font-family', 'font-size', 'font-weight', 'color', 'line-height', 'text-align'],
                },
                {
                    name: 'Decoration',
                    open: false,
                    buildProps: ['background-color', 'border-radius', 'border', 'box-shadow', 'background'],
                },
                {
                    name: 'Advanced',
                    open: false,
                    buildProps: ['opacity', 'transition', 'transform'],
                },
            ],
        },
        traitManager: {
            appendTo: '.traits-container',
        },
        selectorManager: {
            appendTo: '.styles-container',
        },
        deviceManager: {
            devices: [
                { name: 'Desktop', width: '' },
                { name: 'Tablet', width: '768px', widthMedia: '992px' },
                { name: 'Mobile', width: '390px', widthMedia: '575px' },
            ],
        },
        panels: {
            defaults: [
                {
                    id: 'panel-switcher',
                    el: '.panel__switcher',
                    buttons: [
                        {
                            id: 'show-blocks',
                            active: true,
                            label: 'Blocks',
                            command: 'show-blocks',
                            togglable: false,
                        },
                        {
                            id: 'show-layers',
                            label: 'Layers',
                            command: 'show-layers',
                            togglable: false,
                        },
                        {
                            id: 'show-style',
                            label: 'Styles',
                            command: 'show-styles',
                            togglable: false,
                        },
                        {
                            id: 'show-traits',
                            label: 'Traits',
                            command: 'show-traits',
                            togglable: false,
                        },
                    ],
                },
                {
                    id: 'panel-devices',
                    el: '.panel__devices',
                    buttons: [
                        {
                            id: 'device-desktop',
                            label: 'Desktop',
                            command: 'set-device-desktop',
                            active: true,
                            togglable: false,
                        },
                        {
                            id: 'device-tablet',
                            label: 'Tablet',
                            command: 'set-device-tablet',
                            togglable: false,
                        },
                        {
                            id: 'device-mobile',
                            label: 'Mobile',
                            command: 'set-device-mobile',
                            togglable: false,
                        },
                    ],
                },
                {
                    id: 'basic-actions',
                    el: '.panel__basic-actions',
                    buttons: [
                        {
                            id: 'visibility',
                            active: true,
                            className: 'btn-toggle-borders',
                            label: 'Guides',
                            command: 'sw-visibility',
                        },
                        {
                            id: 'export',
                            className: 'btn-open-export',
                            label: 'HTML',
                            command: 'export-template',
                            context: 'export-template',
                        },
                        {
                            id: 'show-json',
                            className: 'btn-show-json',
                            label: 'JSON',
                            context: 'show-json',
                            command(currentEditor: any) {
                                currentEditor.Modal.setTitle('Components JSON')
                                    .setContent(
                                        `<textarea style="width:100%; height: 320px; color: #111827; background: #ffffff; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px;">${JSON.stringify(currentEditor.getComponents(), null, 2)}</textarea>`
                                    )
                                    .open()
                            },
                        },
                    ],
                },
            ],
        },
    })

    editor.Commands.add('show-blocks', {
        run() {
            setVisiblePanel('blocks')
        },
    })
    editor.Commands.add('show-layers', {
        run() {
            setVisiblePanel('layers')
        },
    })
    editor.Commands.add('show-styles', {
        run() {
            setVisiblePanel('styles')
        },
    })
    editor.Commands.add('show-traits', {
        run() {
            setVisiblePanel('traits')
        },
    })

    editor.Commands.add('set-device-desktop', {
        run: (currentEditor: any) => currentEditor.setDevice('Desktop'),
    })
    editor.Commands.add('set-device-tablet', {
        run: (currentEditor: any) => currentEditor.setDevice('Tablet'),
    })
    editor.Commands.add('set-device-mobile', {
        run: (currentEditor: any) => currentEditor.setDevice('Mobile'),
    })

    editor.on('load', applyCanvasTheme)
    editor.on('canvas:frame:load', applyCanvasTheme)
    editor.on('update', emitCurrentContent)

    applyCanvasTheme()
    applyStoredContent(props.initHtml ?? '')
    editor.runCommand('show-blocks')
})

onBeforeUnmount(() => {
    if (editor) {
        editor.destroy()
        editor = null
    }
})

watch(theme, () => {
    applyCanvasTheme()
})

watch(() => props.initHtml, (newValue) => {
    const nextInput = newValue ?? ''
    if (!editor || nextInput === lastAppliedInput || nextInput === lastEmittedContent) return

    applyStoredContent(nextInput)
})
</script>

<style>
.gjs-custom-editor-wrap {
    --gjs-primary-color: var(--color-primary);
    --gjs-secondary-color: var(--color-primary);
}

.gjs-cv-canvas {
    top: 0;
    width: 100%;
    height: 100%;
    background: var(--color-base-200);
}

.gjs-frame-wrapper {
    background: var(--color-base-200);
}

.gjs-one-bg {
    background-color: var(--color-base-100);
}

.gjs-two-color {
    color: color-mix(in srgb, var(--color-base-content) 72%, transparent);
}

.gjs-three-bg {
    background-color: var(--color-base-200);
    color: var(--color-base-content);
}

.gjs-four-color,
.gjs-four-color-h:hover {
    color: var(--color-base-content);
}

.gjs-dark-theme .gjs-one-bg {
    background-color: var(--color-base-100);
}

.gjs-dark-theme .gjs-two-color {
    color: color-mix(in srgb, var(--color-base-content) 72%, transparent);
}

.gjs-dark-theme .gjs-three-bg {
    background-color: var(--color-base-300);
    color: var(--color-base-content);
}

.gjs-dark-theme .gjs-four-color,
.gjs-dark-theme .gjs-four-color-h:hover {
    color: var(--color-base-content);
}

.gjs-field {
    background-color: var(--color-base-100);
    color: var(--color-base-content);
    border-color: var(--color-base-300);
}

.gjs-field input,
.gjs-field select,
.gjs-field textarea {
    color: var(--color-base-content);
    background-color: transparent;
}

.panel__basic-actions,
.panel__devices,
.panel__switcher {
    position: static;
    display: flex;
    align-items: center;
    gap: 0.35rem;
}

.gjs-pn-panel {
    position: static;
    padding: 0;
}

.gjs-pn-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
}

.gjs-pn-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    margin: 0;
    padding: 0 0.65rem;
    border: 1px solid var(--color-base-300);
    border-radius: 0.35rem;
    background: var(--color-base-100);
    color: var(--color-base-content);
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
    box-shadow: none;
}

.gjs-pn-btn:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
}

.gjs-pn-btn.gjs-pn-active {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: var(--color-primary-content);
    box-shadow: none;
}

.panel__right {
    color: var(--color-base-content);
}

.layers-container,
.styles-container,
.traits-container {
    display: none;
    padding: 0.75rem;
}

.gjs-block-category .gjs-title,
.gjs-layer-title,
.gjs-sm-sector .gjs-sm-title {
    background: color-mix(in srgb, var(--color-base-content) 7%, transparent);
    color: color-mix(in srgb, var(--color-base-content) 72%, transparent);
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
}

.gjs-blocks-c {
    display: grid;
    gap: 0.5rem;
}

.gjs-block {
    width: 100%;
    min-height: 0;
    margin: 0;
    padding: 0.75rem;
    border: 1px solid var(--color-base-300);
    border-radius: 0.45rem;
    background: var(--color-base-100);
    color: var(--color-base-content);
    cursor: grab;
    box-shadow: none;
    transition: border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

.gjs-block:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    transform: translateY(-1px);
}

.gjs-block__media {
    margin-bottom: 0.35rem;
}

.vc-block-icon {
    display: inline-flex;
    align-items: center;
    min-height: 1.4rem;
    padding: 0 0.4rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
    color: var(--color-primary);
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

.gjs-block-label {
    font-size: 0.82rem;
    font-weight: 650;
    line-height: 1.25;
}

.gjs-mdl-dialog {
    color: var(--color-base-content);
    background: var(--color-base-100);
}

.gjs-mdl-header {
    border-bottom-color: var(--color-base-300);
}

@media (max-width: 900px) {
    .editor-row {
        flex-direction: column;
    }

    .panel__right {
        width: 100%;
        max-height: 320px;
        border-left: 0;
        border-top: 1px solid var(--color-base-300);
    }
}
</style>
