<template>
    <div
        v-if="
            serverConfig.CaptchaEnabled &&
            serverConfig.CaptchaType === 'hcaptcha'
        "
        class="h-[80px] flex justify-center items-center bg-base-200 rounded-box my-2"
    >
        <div
            v-if="captchaEnabled"
            class="h-captcha"
            id="h-captcha"
            :data-sitekey="serverConfig.Captcha_Hcaptcha_PublicKey"
        ></div>
        <button
            type="button"
            class="btn btn-primary"
            v-if="!captchaEnabled"
            @click="enableCaptcha()"
        >
            Solve Captcha
        </button>
    </div>
</template>

<script setup>
useHead({
    script: [
        {
            src: "https://js.hcaptcha.com/1/api.js?hl=en&render=explicit",
            async: true,
        },
    ],
});

const serverConfig = useServerConfig();
const captchaEnabled = useState("captchaEnabled", () => false);
let hcaptchaWidgetId = useState("hcaptchaWidgetId", () => "");
const setupHCaptcha = async () => {
    try {
        console.log("hcaptcha remove");
        hcaptcha.remove(hcaptchaWidgetId.value);
        console.log("hcaptcha remove fin");
    } catch (error) {
        console.log("hcaptcha remove error", error);
    }
    try {
        console.log("hcaptcha render");
        hcaptchaWidgetId.value = hcaptcha.render("h-captcha", {
            sitekey: serverConfig.value.Captcha_Hcaptcha_PublicKey,
            theme: "dark",
            "error-callback": (err) => {
                console.log("hcaptcha render callback error", err);
            },
        });
    } catch (error) {
        console.log("hcaptcha render catch error", error);
    }
};

const enableCaptcha = async () => {
    captchaEnabled.value = true;
    await awaitEl("#h-captcha");
    setupHCaptcha();
};
</script>
