export const useToken = () => useCookie("token");
export const useTokenExpire = () =>
    useState<null | Date>("tokenExpire", () => null);

export interface ServerConfig {
    AppName: string;
    Project: string;
    EncodingEnabled: boolean;
    UploadEnabled: boolean;
    MaxUploadFilesize: number;
    MaxUploadSessions: number;
    CaptchaEnabled: boolean;
    CaptchaType: string;
    Captcha_Recaptcha_PublicKey: string;
    Captcha_Hcaptcha_PublicKey: string;
}
export const useServerConfig = () =>
    useState<ServerConfig>("serverConfig", () => ({
        AppName: "Video",
        Project: "/",
        EncodingEnabled: true,
        UploadEnabled: true,
        MaxUploadFilesize: 5368709120,
        MaxUploadSessions: 2,
        CaptchaEnabled: false,
        CaptchaType: "",
        Captcha_Recaptcha_PublicKey: "",
        Captcha_Hcaptcha_PublicKey: "",
    }));
