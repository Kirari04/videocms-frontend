<template>
    <div>
        <div ref="container" class="min-h-[80px]"></div>
        <input type="hidden" :name="field" :value="token" />
        <p v-if="error" class="mt-2 text-sm text-error" role="alert">{{ error }}</p>
    </div>
</template>

<script setup lang="ts">
const config = useServerConfig();
const container = ref<HTMLElement | null>(null);
const token = ref('');
const error = ref('');
const provider = config.value.CaptchaType;
const providers: Record<string, { field: string; scriptURL: string; sitekey: string | undefined }> = {
    recaptcha: { field: 'g-recaptcha-response', scriptURL: 'https://www.google.com/recaptcha/api.js?render=explicit', sitekey: config.value.Captcha_Recaptcha_PublicKey },
    hcaptcha: { field: 'h-captcha-response', scriptURL: 'https://js.hcaptcha.com/1/api.js?render=explicit', sitekey: config.value.Captcha_Hcaptcha_PublicKey },
    turnstile: { field: 'cf-turnstile-response', scriptURL: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', sitekey: config.value.Captcha_Turnstile_PublicKey },
};
const field = providers[provider]?.field || '';
const scriptURL = providers[provider]?.scriptURL;
const sitekey = providers[provider]?.sitekey;
const api = () => (window as any)[provider === 'recaptcha' ? 'grecaptcha' : provider];
let widget: string | number | undefined;
let disposed = false;

async function loadScript() {
    if (api()?.render) return;
    await new Promise<void>((resolve, reject) => {
        let script = document.querySelector<HTMLScriptElement>(`script[data-share-captcha="${provider}"]`);
        if (!script) {
            script = document.createElement('script'); script.src = scriptURL!;
            script.dataset.shareCaptcha = provider; script.async = true;
            script.addEventListener('load', () => resolve(), { once: true });
            script.addEventListener('error', () => { script?.remove(); reject(new Error('CAPTCHA could not load. Refresh to try again.')); }, { once: true });
            document.head.appendChild(script);
        } else {
            script.addEventListener('load', () => resolve(), { once: true });
            script.addEventListener('error', () => reject(new Error('CAPTCHA could not load. Refresh to try again.')), { once: true });
        }
    });
}
onMounted(async () => {
    try {
        if (!scriptURL || !sitekey || !config.value.CaptchaEnabled) throw new Error('CAPTCHA is unavailable. Please contact the folder owner.');
        await loadScript();
        if (provider === 'recaptcha') await new Promise<void>(resolve => api().ready(resolve));
        if (disposed || !container.value) return;
        widget = api().render(container.value, {
            sitekey,
            callback: (value: string) => { token.value = value; error.value = ''; },
            'expired-callback': () => { token.value = ''; },
            'error-callback': () => { token.value = ''; error.value = 'CAPTCHA failed. Please try again.'; },
        });
    } catch (e: any) { error.value = e.message; }
});
onBeforeUnmount(() => {
    disposed = true;
    if (widget !== undefined) {
        if (provider === 'recaptcha') api()?.reset(widget);
        else api()?.remove(widget);
    }
});
</script>
