interface WebpageEditorLike {
    getHtml: () => string
    getCss: () => string
}

export const defaultWebpageHtml = `
<div class="vc-page" data-vc-page="true">
    <section class="vc-section">
        <div class="vc-container vc-stack-lg">
            <p class="vc-eyebrow">New page</p>
            <h1>Build your page</h1>
            <p class="vc-lead">Drag blocks from the sidebar to create an imprint, privacy policy, contact page, FAQ, or other static page.</p>
        </div>
    </section>
</div>
`.trim()

export function splitStoredWebpageHtml(input = '') {
    let rest = input.trim()
    const cssParts: string[] = []
    const styleTagPattern = /^<style\b[^>]*>([\s\S]*?)<\/style>\s*/i

    while (styleTagPattern.test(rest)) {
        const match = rest.match(styleTagPattern)
        if (!match) break

        cssParts.push(match[1].trim())
        rest = rest.slice(match[0].length).trim()
    }

    return {
        html: rest,
        css: cssParts.filter(Boolean).join('\n\n'),
    }
}

export function ensureWebpageRoot(html = '') {
    const trimmed = html.trim()

    if (!trimmed) {
        return defaultWebpageHtml
    }

    if (/\bdata-vc-page=["']true["']/i.test(trimmed) || /\bclass=["'][^"']*\bvc-page\b/i.test(trimmed)) {
        return trimmed
    }

    return `<div class="vc-page" data-vc-page="true">${trimmed}</div>`
}

export function serializeWebpageContent(editor: WebpageEditorLike) {
    const html = ensureWebpageRoot(editor.getHtml())
    const css = editor.getCss().trim()

    if (!css) {
        return html
    }

    const safeCss = css.replace(/<\/style/gi, '<\\/style')
    return `<style data-vc-editor-css>${safeCss}</style>${html}`
}
