<template>
    <div
        v-if="
            serverConfig.CaptchaEnabled &&
            serverConfig.CaptchaType === 'recaptcha'
        "
        class="h-[80px] flex justify-center items-center bg-base-200 rounded-box my-2"
    >
        <div
            v-if="captchaEnabled"
            class="g-recaptcha"
            id="g-recaptcha"
            :data-sitekey="serverConfig.Captcha_Recaptcha_PublicKey"
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
            src: "https://www.google.com/recaptcha/api.js?hl=en&render=explicit",
            async: true,
        },
    ],
});

const serverConfig = useServerConfig();
const captchaEnabled = useState("captchaEnabled", () => false);
let recaptchaWidgetId = useState("recaptchaWidgetId", () => "");
const setupRECaptcha = async () => {
    try {
        console.log("recaptcha remove");
        grecaptcha.remove(recaptchaWidgetId.value);
        console.log("recaptcha remove fin");
    } catch (error) {
        console.log("recaptcha remove error", error);
    }
    try {
        console.log("recaptcha render");
        recaptchaWidgetId.value = grecaptcha.render("g-recaptcha", {
            sitekey: serverConfig.value.Captcha_Recaptcha_PublicKey,
            theme: "dark",
            "error-callback": (err) => {
                console.log("recaptcha render callback error", err);
            },
        });
    } catch (error) {
        console.log("recaptcha render catch error", error);
    }
};

const enableCaptcha = async () => {
    captchaEnabled.value = true;
    await awaitEl("#g-recaptcha");
    setupRECaptcha();
};
</script>
