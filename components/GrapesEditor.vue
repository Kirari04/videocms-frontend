<template>
    <div :class="{ 'gjs-dark-theme': theme === 'dark' }" class="gjs-custom-editor-wrap border border-base-300 rounded-lg overflow-hidden h-full min-h-[600px] w-full bg-base-100 flex flex-col text-left">
        <!-- Top Panel -->
        <div class="panel__top flex justify-between items-center p-2 border-b border-base-300 bg-base-200">
            <div class="panel__basic-actions"></div>
            <div class="panel__devices"></div>
            <div class="panel__switcher"></div>
        </div>

        <div class="editor-row flex grow overflow-hidden">
            <!-- Canvas -->
            <div class="editor-canvas grow relative">
                <div :id="containerId" class="h-full"></div>
            </div>

            <!-- Right Panel -->
            <div class="panel__right w-64 bg-base-200 border-l border-base-300 flex flex-col shrink-0 overflow-y-auto">
                <div class="layers-container"></div>
                <div class="styles-container"></div>
                <div class="traits-container"></div>
                <div class="blocks-container p-2"></div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import 'grapesjs/dist/css/grapes.min.css'
import grapesjs from 'grapesjs'
import { v4 as uuidv4 } from 'uuid'

const { theme } = useTheme()

const props = defineProps<{
    initHtml?: string
}>()

const emit = defineEmits<{
    (event: 'update', html: string): void
}>()

const containerId = `gjs-${uuidv4()}`
let editor: any = null

onMounted(async () => {
    await nextTick()

    editor = grapesjs.init({
        container: `#${containerId}`,
        height: '100%',
        width: 'auto',
        storageManager: false,
        // plugins: [grapesjsBlocksBasic], // Removed to use custom DaisyUI blocks
        canvas: {
            styles: [
                'https://cdn.jsdelivr.net/npm/daisyui@4.12.10/dist/full.min.css',
            ],
            scripts: [
                'https://cdn.tailwindcss.com'
            ]
        },
        blockManager: {
            appendTo: '.blocks-container',
            blocks: [
                {
                    id: 'hero',
                    label: 'Hero Section',
                    category: 'Layout',
                    content: `
                        <div class="hero min-h-[400px] bg-base-200 rounded-box p-8">
                          <div class="hero-content text-center">
                            <div class="max-w-md">
                              <h1 class="text-5xl font-bold mb-4">Hello there</h1>
                              <p class="py-6 mb-4">Provident cupiditate voluptatem et in. Quaerat fugiat ut assumenda excepturi exercitationem quasi.</p>
                              <button class="btn btn-primary">Get Started</button>
                            </div>
                          </div>
                        </div>
                    `,
                    attributes: { class: 'fa fa-window-maximize' }
                },
                {
                    id: 'card',
                    label: 'Card',
                    category: 'Components',
                    content: `
                        <div class="card w-96 bg-base-100 shadow-xl m-4">
                          <figure><img src="https://placehold.co/400x200" alt="Placeholder" /></figure>
                          <div class="card-body">
                            <h2 class="card-title">Card Title</h2>
                            <p>If a dog chews shoes whose shoes does he choose?</p>
                            <div class="card-actions justify-end mt-4">
                              <button class="btn btn-primary">Buy Now</button>
                            </div>
                          </div>
                        </div>
                    `,
                },
                {
                    id: 'alert-info',
                    label: 'Alert (Info)',
                    category: 'Components',
                    content: `
                        <div role="alert" class="alert alert-info shadow-md m-2">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          <span>New software update available.</span>
                        </div>
                    `,
                },
                {
                    id: 'stats',
                    label: 'Statistics',
                    category: 'Components',
                    content: `
                        <div class="stats shadow m-2 bg-base-100 w-full">
                          <div class="stat">
                            <div class="stat-figure text-primary">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-8 h-8 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                            </div>
                            <div class="stat-title">Total Likes</div>
                            <div class="stat-value text-primary">25.6K</div>
                            <div class="stat-desc">21% more than last month</div>
                          </div>
                          
                          <div class="stat">
                            <div class="stat-figure text-secondary">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-8 h-8 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            </div>
                            <div class="stat-title">Page Views</div>
                            <div class="stat-value text-secondary">2.6M</div>
                            <div class="stat-desc">21% more than last month</div>
                          </div>
                        </div>
                    `,
                },
                {
                    id: 'button',
                    label: 'Button',
                    category: 'Basic',
                    content: '<button class="btn btn-primary">Button</button>',
                },
                {
                    id: 'text',
                    label: 'Text',
                    category: 'Basic',
                    content: '<div class="prose"><p>Insert your text here. This is styled with Tailwind typography.</p></div>',
                },
                {
                    id: 'section',
                    label: 'Section',
                    category: 'Layout',
                    content: '<div class="container mx-auto p-4 min-h-[100px] border-2 border-dashed border-base-300 rounded-box"></div>',
                },
                {
                    id: 'grid-2',
                    label: 'Grid (2 Col)',
                    category: 'Layout',
                    content: `
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                            <div class="bg-base-200 p-4 rounded-box min-h-[100px]">Col 1</div>
                            <div class="bg-base-200 p-4 rounded-box min-h-[100px]">Col 2</div>
                        </div>
                    `
                },
                {
                    id: 'grid-3',
                    label: 'Grid (3 Col)',
                    category: 'Layout',
                    content: `
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                            <div class="bg-base-200 p-4 rounded-box min-h-[100px]">Col 1</div>
                            <div class="bg-base-200 p-4 rounded-box min-h-[100px]">Col 2</div>
                            <div class="bg-base-200 p-4 rounded-box min-h-[100px]">Col 3</div>
                        </div>
                    `
                }
            ]
        },
        layerManager: {
            appendTo: '.layers-container',
        },
        styleManager: {
            appendTo: '.styles-container',
            sectors: [{
                name: 'Dimension',
                open: false,
                buildProps: ['width', 'min-height', 'padding'],
                properties: [{
                    type: 'integer',
                    name: 'The width',
                    property: 'width',
                    units: ['px', '%'],
                    defaults: 'auto',
                    min: 0,
                }]
            },{
                name: 'Typography',
                open: false,
                buildProps: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color', 'line-height', 'text-align', 'text-shadow'],
            },{
                name: 'Decorations',
                open: false,
                buildProps: ['background-color', 'border-radius', 'border', 'box-shadow', 'background'],
            },{
                name: 'Extra',
                open: false,
                buildProps: ['opacity', 'transition', 'transform'],
            }],
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
                { name: 'Mobile Portrait', width: '320px', widthMedia: '575px' },
            ]
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
                            active: false,
                            label: 'Layers',
                            command: 'show-layers',
                            togglable: false,
                        },
                        {
                            id: 'show-style',
                            active: false,
                            label: 'Styles',
                            command: 'show-styles',
                            togglable: false,
                        },
                        {
                            id: 'show-traits',
                            active: false,
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
                            label: 'D',
                            command: 'set-device-desktop',
                            active: true,
                            togglable: false,
                        },
                        {
                            id: 'device-mobile',
                            label: 'M',
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
                            label: '<u>B</u>',
                            command: 'sw-visibility',
                        },
                        {
                            id: 'export',
                            className: 'btn-open-export',
                            label: 'Exp',
                            command: 'export-template',
                            context: 'export-template',
                        },
                        {
                            id: 'show-json',
                            className: 'btn-show-json',
                            label: 'JSON',
                            context: 'show-json',
                            command(editor: any) {
                                editor.Modal.setTitle('Components JSON')
                                    .setContent(
                                        `<textarea style="width:100%; height: 250px;">
                                            ${JSON.stringify(editor.getComponents())}
                                        </textarea>`
                                    )
                                    .open();
                            },
                        }
                    ],
                }
            ]
        }
    })

    // Commands for switching views
    editor.Commands.add('show-blocks', {
        run(editor: any) {
            const row = editor.getContainer().closest('.gjs-custom-editor-wrap');
            row.querySelector('.blocks-container').style.display = 'block';
            row.querySelector('.layers-container').style.display = 'none';
            row.querySelector('.styles-container').style.display = 'none';
            row.querySelector('.traits-container').style.display = 'none';
        }
    });
    editor.Commands.add('show-layers', {
        run(editor: any) {
            const row = editor.getContainer().closest('.gjs-custom-editor-wrap');
            row.querySelector('.blocks-container').style.display = 'none';
            row.querySelector('.layers-container').style.display = 'block';
            row.querySelector('.styles-container').style.display = 'none';
            row.querySelector('.traits-container').style.display = 'none';
        }
    });
    editor.Commands.add('show-styles', {
        run(editor: any) {
            const row = editor.getContainer().closest('.gjs-custom-editor-wrap');
            row.querySelector('.blocks-container').style.display = 'none';
            row.querySelector('.layers-container').style.display = 'none';
            row.querySelector('.styles-container').style.display = 'block';
            row.querySelector('.traits-container').style.display = 'none';
        }
    });
    editor.Commands.add('show-traits', {
        run(editor: any) {
            const row = editor.getContainer().closest('.gjs-custom-editor-wrap');
            row.querySelector('.blocks-container').style.display = 'none';
            row.querySelector('.layers-container').style.display = 'none';
            row.querySelector('.styles-container').style.display = 'none';
            row.querySelector('.traits-container').style.display = 'block';
        }
    });

    // Commands for devices
    editor.Commands.add('set-device-desktop', {
        run: (editor: any) => editor.setDevice('Desktop'),
    });
    editor.Commands.add('set-device-mobile', {
        run: (editor: any) => editor.setDevice('Mobile Portrait'),
    });

    if (props.initHtml) {
        editor.setComponents(props.initHtml)
    }

    editor.on('update', () => {
        const html = editor.getHtml()
        const css = editor.getCss()
        const fullContent = `<style>${css}</style>${html}`
        emit('update', fullContent)
    })
    
    // Initialize view state
    editor.runCommand('show-blocks');
})

onBeforeUnmount(() => {
    if (editor) {
        editor.destroy()
    }
})

watch(() => props.initHtml, (newVal) => {
    if (editor && !editor.getHtml() && newVal) {
         editor.setComponents(newVal)
    }
})
</script>

<style>
/* Reset */
.gjs-cv-canvas {
    top: 0;
    width: 100%;
    height: 100%;
}

/* Light Theme (Default) */
.gjs-one-bg {
    background-color: #f3f4f6;
}
.gjs-two-color {
    color: #4b5563;
}
.gjs-three-bg {
    background-color: #e5e7eb;
    color: #1f2937;
}
.gjs-four-color, .gjs-four-color-h:hover {
    color: #1f2937;
} 

/* Dark Theme */
.gjs-dark-theme .gjs-one-bg {
    background-color: #1f2937; 
}
.gjs-dark-theme .gjs-two-color {
    color: #9ca3af; 
}
.gjs-dark-theme .gjs-three-bg {
    background-color: #111827; 
    color: #f3f4f6;
}
.gjs-dark-theme .gjs-four-color,
.gjs-dark-theme .gjs-four-color-h:hover {
    color: #f3f4f6; 
}

/* Input Fields in Dark Mode */
.gjs-dark-theme .gjs-field {
    background-color: #374151;
    color: #e5e7eb;
    border-color: #4b5563;
}
.gjs-dark-theme .gjs-field input, 
.gjs-dark-theme .gjs-field select, 
.gjs-dark-theme .gjs-field textarea {
    color: #e5e7eb;
    background-color: transparent;
}

/* Panel Layout & Styling */
.panel__top {
    padding: 0.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    position: relative; /* Ensure it stays in flow */
}

/* Ensure sub-panels layout horizontally */
.panel__basic-actions,
.panel__devices,
.panel__switcher {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    position: static; /* GrapesJS sets absolute by default */
}

/* Panel Buttons Styling */
.gjs-pn-btn {
    margin: 0;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    border: 1px solid transparent;
    height: 32px; /* Fixed height for consistency */
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Override GrapesJS default button styles for better theme integration */
.gjs-pn-btn.gjs-pn-active {
    background-color: var(--gjs-secondary-color);
    color: white;
    font-weight: 500;
    box-shadow: none;
}

.gjs-dark-theme .gjs-pn-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
}

/* Block Manager Styling */
.gjs-block {
    width: 100%;
    min-height: auto;
    border: 1px solid rgba(0,0,0,0.1);
    border-radius: 6px;
    padding: 10px;
    margin-bottom: 8px;
    cursor: grab;
    background: white;
    color: #333;
    transition: all 0.2s ease;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.gjs-dark-theme .gjs-block {
    background: #374151;
    color: #e5e7eb;
    border-color: #4b5563;
    box-shadow: none;
}
.gjs-block:hover {
    border-color: var(--gjs-primary-color);
    color: var(--gjs-primary-color);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
</style>