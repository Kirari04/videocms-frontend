<template>
    <div ref="container" class="min-h-[65px] min-w-[300px]"></div>
</template>

<script lang="ts" setup>
const serverConf = useServerConfig();

const container = ref<HTMLElement | null>(null);

onMounted(() => {
    if (serverConf.value.CaptchaType !== "turnstile") return;

    // Inject Cloudflare Turnstile script
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
        if ((window as any).turnstile) {
            (window as any).turnstile.render(container.value, {
                sitekey: serverConf.value.Captcha_Turnstile_PublicKey,
                callback: function(token: string) {
                    console.log(`Challenge Success ${token}`);
                    // Create hidden input to submit with form
                    const input = document.createElement("input");
                    input.type = "hidden";
                    input.name = "cf-turnstile-response";
                    input.value = token;
                    container.value?.appendChild(input);
                    
                    // Emit event for programmable access
                    const event = new CustomEvent("captcha-verified", { detail: token });
                    window.dispatchEvent(event);
                },
            });
        }
    };
});
</script>