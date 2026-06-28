export interface WebpageBuilderBlock {
    id: string
    label: string
    category: string
    content: string
    media?: string
}

const media = {
    layout: '<span class="vc-block-icon">Layout</span>',
    content: '<span class="vc-block-icon">Text</span>',
    component: '<span class="vc-block-icon">Part</span>',
    template: '<span class="vc-block-icon">Page</span>',
}

export const webpageBuilderBlocks: WebpageBuilderBlock[] = [
    {
        id: 'vc-page-container',
        label: 'Page Container',
        category: 'Layout',
        media: media.layout,
        content: `
<div class="vc-page" data-vc-page="true">
    <section class="vc-section">
        <div class="vc-container vc-stack-lg">
            <h1>Page title</h1>
            <p class="vc-lead">Use this container as the main root for a clean static page.</p>
        </div>
    </section>
</div>
        `.trim(),
    },
    {
        id: 'vc-section',
        label: 'Section',
        category: 'Layout',
        media: media.layout,
        content: `
<section class="vc-section">
    <div class="vc-container vc-stack-lg">
        <h2>Section heading</h2>
        <p>Add the section content here. Keep related information grouped so visitors can scan the page quickly.</p>
    </div>
</section>
        `.trim(),
    },
    {
        id: 'vc-two-column',
        label: 'Two Columns',
        category: 'Layout',
        media: media.layout,
        content: `
<section class="vc-section">
    <div class="vc-container vc-grid vc-grid-2">
        <div class="vc-card">
            <h3>First column</h3>
            <p>Add details, links, or policy text for this area.</p>
        </div>
        <div class="vc-card">
            <h3>Second column</h3>
            <p>Add related content that should sit next to the first column.</p>
        </div>
    </div>
</section>
        `.trim(),
    },
    {
        id: 'vc-three-card-grid',
        label: 'Three Card Grid',
        category: 'Layout',
        media: media.layout,
        content: `
<section class="vc-section">
    <div class="vc-container vc-stack-lg">
        <div class="vc-stack">
            <p class="vc-eyebrow">Overview</p>
            <h2>Grouped information</h2>
        </div>
        <div class="vc-grid vc-grid-3">
            <article class="vc-card">
                <h3>Item one</h3>
                <p>Short supporting text for the first item.</p>
            </article>
            <article class="vc-card">
                <h3>Item two</h3>
                <p>Short supporting text for the second item.</p>
            </article>
            <article class="vc-card">
                <h3>Item three</h3>
                <p>Short supporting text for the third item.</p>
            </article>
        </div>
    </div>
</section>
        `.trim(),
    },
    {
        id: 'vc-split-content',
        label: 'Text + Media',
        category: 'Layout',
        media: media.layout,
        content: `
<section class="vc-section">
    <div class="vc-container vc-split">
        <div class="vc-stack-lg">
            <p class="vc-eyebrow">About</p>
            <h2>Explain the page context</h2>
            <p>Use this layout for an about section, contact introduction, or an explanation with supporting media.</p>
            <div class="vc-button-row">
                <a class="vc-button" href="/p/contact/">Contact</a>
                <a class="vc-button vc-button-secondary" href="/">Back home</a>
            </div>
        </div>
        <div class="vc-image-placeholder">Image or media placeholder</div>
    </div>
</section>
        `.trim(),
    },
    {
        id: 'vc-sidebar-layout',
        label: 'Sidebar Layout',
        category: 'Layout',
        media: media.layout,
        content: `
<section class="vc-section">
    <div class="vc-container vc-sidebar-layout">
        <aside class="vc-card vc-stack">
            <h3>On this page</h3>
            <ul class="vc-link-list">
                <li><a href="#section-one">Section one</a></li>
                <li><a href="#section-two">Section two</a></li>
                <li><a href="#section-three">Section three</a></li>
            </ul>
        </aside>
        <div class="vc-stack-lg">
            <section id="section-one" class="vc-section-panel vc-stack">
                <h2>Section one</h2>
                <p>Add the main content for this section.</p>
            </section>
            <section id="section-two" class="vc-section-panel vc-stack">
                <h2>Section two</h2>
                <p>Add additional content for this section.</p>
            </section>
        </div>
    </div>
</section>
        `.trim(),
    },
    {
        id: 'vc-divider',
        label: 'Divider',
        category: 'Layout',
        media: media.layout,
        content: '<div class="vc-divider"></div>',
    },
    {
        id: 'vc-spacer',
        label: 'Spacer',
        category: 'Layout',
        media: media.layout,
        content: '<div class="vc-spacer"></div>',
    },
    {
        id: 'vc-heading-intro',
        label: 'Heading + Intro',
        category: 'Content',
        media: media.content,
        content: `
<section class="vc-section-compact">
    <div class="vc-container-narrow vc-stack">
        <p class="vc-eyebrow">Page section</p>
        <h2>Clear section heading</h2>
        <p class="vc-lead">Write a short introduction that explains what the visitor can expect in this section.</p>
    </div>
</section>
        `.trim(),
    },
    {
        id: 'vc-rich-text',
        label: 'Rich Text',
        category: 'Content',
        media: media.content,
        content: `
<section class="vc-section-compact">
    <div class="vc-container-narrow vc-stack">
        <h2>Text section</h2>
        <p>Replace this paragraph with your page content. Use concise paragraphs for readability.</p>
        <ul class="vc-list">
            <li>First important point.</li>
            <li>Second important point.</li>
            <li>Third important point.</li>
        </ul>
    </div>
</section>
        `.trim(),
    },
    {
        id: 'vc-legal-text',
        label: 'Legal Text',
        category: 'Content',
        media: media.content,
        content: `
<section class="vc-section-compact">
    <div class="vc-container-narrow vc-stack">
        <h2>Legal section heading</h2>
        <p>This section contains legal or policy information. Replace this placeholder with the exact wording that applies to your service.</p>
        <p>Keep each topic in a separate paragraph so the page stays readable.</p>
    </div>
</section>
        `.trim(),
    },
    {
        id: 'vc-faq-group',
        label: 'FAQ Group',
        category: 'Content',
        media: media.content,
        content: `
<section class="vc-section">
    <div class="vc-container-narrow vc-stack-lg">
        <div class="vc-stack">
            <p class="vc-eyebrow">FAQ</p>
            <h2>Frequently asked questions</h2>
        </div>
        <div class="vc-faq">
            <details class="vc-faq-item" open>
                <summary>What is this page for?</summary>
                <p>Use this answer to explain one common question clearly.</p>
            </details>
            <details class="vc-faq-item">
                <summary>How can visitors contact you?</summary>
                <p>Add the preferred contact route or link to your contact page.</p>
            </details>
            <details class="vc-faq-item">
                <summary>Where can visitors find more information?</summary>
                <p>Link to related pages or explain the next step.</p>
            </details>
        </div>
    </div>
</section>
        `.trim(),
    },
    {
        id: 'vc-contact-details',
        label: 'Contact Details',
        category: 'Content',
        media: media.content,
        content: `
<section class="vc-section">
    <div class="vc-container vc-grid vc-grid-2">
        <div class="vc-stack-lg">
            <p class="vc-eyebrow">Contact</p>
            <h2>Get in touch</h2>
            <p class="vc-lead">Use this section for support, legal contact details, or general enquiries.</p>
        </div>
        <div class="vc-card">
            <h3>Contact information</h3>
            <dl class="vc-meta-list">
                <dt>Email</dt>
                <dd><a href="mailto:hello@example.com">hello@example.com</a></dd>
                <dt>Response time</dt>
                <dd>Usually within a few business days.</dd>
                <dt>Location</dt>
                <dd>City, Country</dd>
            </dl>
        </div>
    </div>
</section>
        `.trim(),
    },
    {
        id: 'vc-address-imprint',
        label: 'Address / Imprint',
        category: 'Content',
        media: media.content,
        content: `
<section class="vc-section-compact">
    <div class="vc-container-narrow vc-card">
        <h2>Responsible person</h2>
        <dl class="vc-meta-list">
            <dt>Name</dt>
            <dd>Your name or organization</dd>
            <dt>Address</dt>
            <dd>Street and number<br>Postal code and city<br>Country</dd>
            <dt>Email</dt>
            <dd><a href="mailto:hello@example.com">hello@example.com</a></dd>
        </dl>
    </div>
</section>
        `.trim(),
    },
    {
        id: 'vc-definition-list',
        label: 'Definition List',
        category: 'Content',
        media: media.content,
        content: `
<dl class="vc-meta-list">
    <dt>Label</dt>
    <dd>Value or explanation</dd>
    <dt>Another label</dt>
    <dd>Another value or explanation</dd>
</dl>
        `.trim(),
    },
    {
        id: 'vc-table',
        label: 'Responsive Table',
        category: 'Content',
        media: media.content,
        content: `
<div class="vc-table-wrap">
    <table class="vc-table">
        <thead>
            <tr>
                <th>Topic</th>
                <th>Details</th>
                <th>Retention</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Account data</td>
                <td>Information needed to provide the service.</td>
                <td>Until deletion or legal expiry.</td>
            </tr>
            <tr>
                <td>Logs</td>
                <td>Operational records used for security and debugging.</td>
                <td>Limited operational period.</td>
            </tr>
        </tbody>
    </table>
</div>
        `.trim(),
    },
    {
        id: 'vc-card',
        label: 'Card',
        category: 'Components',
        media: media.component,
        content: `
<article class="vc-card">
    <h3>Card heading</h3>
    <p>Use cards for short, grouped pieces of content.</p>
</article>
        `.trim(),
    },
    {
        id: 'vc-info-callout',
        label: 'Info Callout',
        category: 'Components',
        media: media.component,
        content: `
<div class="vc-callout">
    <span class="vc-callout-icon">i</span>
    <div class="vc-stack">
        <h3>Helpful information</h3>
        <p>Add a short note that visitors should see while reading this page.</p>
    </div>
</div>
        `.trim(),
    },
    {
        id: 'vc-warning-callout',
        label: 'Warning Callout',
        category: 'Components',
        media: media.component,
        content: `
<div class="vc-callout vc-callout-warning">
    <span class="vc-callout-icon">!</span>
    <div class="vc-stack">
        <h3>Important notice</h3>
        <p>Add an important legal, policy, or operational notice here.</p>
    </div>
</div>
        `.trim(),
    },
    {
        id: 'vc-button-row',
        label: 'Button Row',
        category: 'Components',
        media: media.component,
        content: `
<div class="vc-button-row">
    <a class="vc-button" href="/">Primary link</a>
    <a class="vc-button vc-button-secondary" href="/p/contact/">Secondary link</a>
</div>
        `.trim(),
    },
    {
        id: 'vc-stat-row',
        label: 'Statistic Row',
        category: 'Components',
        media: media.component,
        content: `
<div class="vc-stat-row">
    <div class="vc-stat">
        <div class="vc-stat-value">24/7</div>
        <p class="vc-muted">Availability note</p>
    </div>
    <div class="vc-stat">
        <div class="vc-stat-value">3</div>
        <p class="vc-muted">Important categories</p>
    </div>
    <div class="vc-stat">
        <div class="vc-stat-value">1</div>
        <p class="vc-muted">Contact point</p>
    </div>
</div>
        `.trim(),
    },
    {
        id: 'vc-image-placeholder',
        label: 'Image Placeholder',
        category: 'Components',
        media: media.component,
        content: '<div class="vc-image-placeholder">Image or media placeholder</div>',
    },
    {
        id: 'vc-link-list',
        label: 'Link List',
        category: 'Components',
        media: media.component,
        content: `
<ul class="vc-link-list">
    <li><a href="/">Home</a></li>
    <li><a href="/p/contact/">Contact</a></li>
    <li><a href="/p/privacy/">Privacy policy</a></li>
</ul>
        `.trim(),
    },
    {
        id: 'vc-template-imprint',
        label: 'Imprint / Legal Notice',
        category: 'Templates',
        media: media.template,
        content: `
<div class="vc-page" data-vc-page="true">
    <section class="vc-section">
        <div class="vc-container-narrow vc-stack-lg">
            <div class="vc-stack">
                <p class="vc-eyebrow">Legal notice</p>
                <h1>Imprint</h1>
                <p class="vc-lead">Replace the placeholders below with the legally required information for your jurisdiction.</p>
            </div>
            <section class="vc-section-panel vc-stack">
                <h2>Responsible person</h2>
                <dl class="vc-meta-list">
                    <dt>Name</dt>
                    <dd>Your name or organization</dd>
                    <dt>Address</dt>
                    <dd>Street and number<br>Postal code and city<br>Country</dd>
                    <dt>Email</dt>
                    <dd><a href="mailto:hello@example.com">hello@example.com</a></dd>
                </dl>
            </section>
            <section class="vc-section-panel vc-stack">
                <h2>Liability for content</h2>
                <p>The content on this website is prepared with care. Replace this placeholder with the liability wording that applies to your site.</p>
            </section>
            <section class="vc-section-panel vc-stack">
                <h2>Liability for external links</h2>
                <p>This website may link to external pages. Replace this placeholder with your external-link liability statement.</p>
            </section>
            <section class="vc-section-panel vc-stack">
                <h2>Copyright</h2>
                <p>Replace this placeholder with your copyright and usage notice.</p>
            </section>
        </div>
    </section>
</div>
        `.trim(),
    },
    {
        id: 'vc-template-privacy',
        label: 'Privacy Policy',
        category: 'Templates',
        media: media.template,
        content: `
<div class="vc-page" data-vc-page="true">
    <section class="vc-section">
        <div class="vc-container-narrow vc-stack-lg">
            <div class="vc-stack">
                <p class="vc-eyebrow">Privacy</p>
                <h1>Privacy policy</h1>
                <p class="vc-lead">Explain what data is processed, why it is processed, and how visitors can exercise their rights.</p>
            </div>
            <section class="vc-section-panel vc-stack">
                <h2>Controller</h2>
                <p>Replace this placeholder with the person or organization responsible for this website.</p>
            </section>
            <section class="vc-section-panel vc-stack">
                <h2>Data processed by this website</h2>
                <div class="vc-table-wrap">
                    <table class="vc-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Purpose</th>
                                <th>Retention</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Account data</td>
                                <td>Provide user accounts and access to the service.</td>
                                <td>Until account deletion or legal expiry.</td>
                            </tr>
                            <tr>
                                <td>Log data</td>
                                <td>Maintain security, prevent abuse, and debug errors.</td>
                                <td>For a limited operational period.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
            <section class="vc-section-panel vc-stack">
                <h2>Your rights</h2>
                <p>Replace this placeholder with the rights available to visitors under the applicable law.</p>
            </section>
            <section class="vc-section-panel vc-stack">
                <h2>Contact</h2>
                <p>For privacy questions, contact <a href="mailto:privacy@example.com">privacy@example.com</a>.</p>
            </section>
        </div>
    </section>
</div>
        `.trim(),
    },
    {
        id: 'vc-template-terms',
        label: 'Terms / Rules',
        category: 'Templates',
        media: media.template,
        content: `
<div class="vc-page" data-vc-page="true">
    <section class="vc-section">
        <div class="vc-container-narrow vc-stack-lg">
            <div class="vc-stack">
                <p class="vc-eyebrow">Rules</p>
                <h1>Terms and community rules</h1>
                <p class="vc-lead">Set expectations for account usage, uploaded content, and moderation.</p>
            </div>
            <section class="vc-section-panel vc-stack">
                <h2>Accepted use</h2>
                <ul class="vc-list">
                    <li>Use the service only for content you are allowed to upload and share.</li>
                    <li>Respect other users and applicable laws.</li>
                    <li>Do not attempt to disrupt or abuse the service.</li>
                </ul>
            </section>
            <section class="vc-section-panel vc-stack">
                <h2>Content moderation</h2>
                <p>Explain how reports, removals, and account restrictions are handled.</p>
            </section>
            <section class="vc-section-panel vc-stack">
                <h2>Contact</h2>
                <p>For questions about these terms, contact <a href="mailto:hello@example.com">hello@example.com</a>.</p>
            </section>
        </div>
    </section>
</div>
        `.trim(),
    },
    {
        id: 'vc-template-about',
        label: 'About Page',
        category: 'Templates',
        media: media.template,
        content: `
<div class="vc-page" data-vc-page="true">
    <section class="vc-section">
        <div class="vc-container vc-split">
            <div class="vc-stack-lg">
                <p class="vc-eyebrow">About</p>
                <h1>About this VideoCMS site</h1>
                <p class="vc-lead">Explain what this site is for, who operates it, and what visitors can expect here.</p>
                <div class="vc-button-row">
                    <a class="vc-button" href="/p/contact/">Contact</a>
                    <a class="vc-button vc-button-secondary" href="/">Browse videos</a>
                </div>
            </div>
            <div class="vc-image-placeholder">Site image or screenshot</div>
        </div>
    </section>
    <section class="vc-section">
        <div class="vc-container vc-grid vc-grid-3">
            <article class="vc-card">
                <h3>Purpose</h3>
                <p>Describe the purpose of the site.</p>
            </article>
            <article class="vc-card">
                <h3>Content</h3>
                <p>Describe what kind of videos or pages are available.</p>
            </article>
            <article class="vc-card">
                <h3>Contact</h3>
                <p>Explain how visitors can reach the operator.</p>
            </article>
        </div>
    </section>
</div>
        `.trim(),
    },
    {
        id: 'vc-template-contact',
        label: 'Contact Page',
        category: 'Templates',
        media: media.template,
        content: `
<div class="vc-page" data-vc-page="true">
    <section class="vc-section">
        <div class="vc-container vc-grid vc-grid-2">
            <div class="vc-stack-lg">
                <p class="vc-eyebrow">Contact</p>
                <h1>Contact</h1>
                <p class="vc-lead">Use this page for support requests, legal notices, or general enquiries.</p>
                <div class="vc-callout">
                    <span class="vc-callout-icon">i</span>
                    <div class="vc-stack">
                        <h3>Before contacting</h3>
                        <p>Include useful details such as account name, page URL, or a short description of the issue.</p>
                    </div>
                </div>
            </div>
            <div class="vc-card">
                <h2>Contact details</h2>
                <dl class="vc-meta-list">
                    <dt>Email</dt>
                    <dd><a href="mailto:hello@example.com">hello@example.com</a></dd>
                    <dt>Response time</dt>
                    <dd>Usually within a few business days.</dd>
                    <dt>Operator</dt>
                    <dd>Your name or organization</dd>
                </dl>
            </div>
        </div>
    </section>
</div>
        `.trim(),
    },
    {
        id: 'vc-template-faq',
        label: 'FAQ Page',
        category: 'Templates',
        media: media.template,
        content: `
<div class="vc-page" data-vc-page="true">
    <section class="vc-section">
        <div class="vc-container-narrow vc-stack-lg">
            <div class="vc-stack">
                <p class="vc-eyebrow">Help</p>
                <h1>Frequently asked questions</h1>
                <p class="vc-lead">Answer common visitor questions in a compact format.</p>
            </div>
            <div class="vc-faq">
                <details class="vc-faq-item" open>
                    <summary>How do I use this site?</summary>
                    <p>Replace this answer with a short explanation of the main workflow.</p>
                </details>
                <details class="vc-faq-item">
                    <summary>How do I report a problem?</summary>
                    <p>Explain the contact route and what information visitors should include.</p>
                </details>
                <details class="vc-faq-item">
                    <summary>Where can I find legal information?</summary>
                    <p>Link to your imprint, privacy policy, or terms page.</p>
                </details>
            </div>
        </div>
    </section>
</div>
        `.trim(),
    },
]
