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

export interface AccountData {
    CreatedAt: string;
    Username: string;
    Admin: boolean;
    Email: string;
    Balance: number;
    Storage: number;
    Files: number;
    Used: number;
}

export const useAccountData = () => ({
    data: useState<AccountData | null>("accountData", () => null),
    fetch: fetchAccountData,
});

async function fetchAccountData() {
    const accountData = useState<AccountData | null>("accountData", () => null)
    const token = useToken()
    const conf = useRuntimeConfig()
    if (token.value) {
        const {
            data,
            error,
        } = await useFetch<AccountData>(`${conf.public.apiUrl}/account`, {
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            retry: 5,
        });
        if (error.value) {
            accountData.value = null;
            return
        }
        accountData.value = data.value
    } else {
        accountData.value = null;
    }
}