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


export interface WebPage {
    Path: string;
    Title: string;
    ListInFooter: boolean;
}

export const useWebPage = () => ({
    data: useState<WebPage[] | null>("WebPage", () => null),
    fetch: fetchWebPage,
});

async function fetchWebPage() {
    const WebPage = useState<WebPage[] | null>("WebPage", () => null)
    const token = useToken()
    const conf = useRuntimeConfig()
    if (token.value) {
        const {
            data,
            error,
        } = await useFetch<WebPage[]>(`${conf.public.apiUrl}/p/pages`, {
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            retry: 5,
        });
        if (error.value) {
            WebPage.value = null;
            return
        }
        WebPage.value = data.value
    } else {
        WebPage.value = null;
    }
}

let authCheckInterval: any = null;
export async function trackAuthState() {
    if (authCheckInterval || process.server) {
        return
    }
    const token = useToken();

    const conf = useRuntimeConfig();
    const tokenExpire = useTokenExpire();

    authCheckInterval = setInterval(async () => {
        if (token.value) {
            const { data, error } = await useFetch<{
                exp: string;
                username: string;
            }>(`${conf.public.apiUrl}/auth/check`, {
                headers: {
                    Authorization: `Bearer ${token.value}`,
                },
            });
            let leftSeconds = Math.round(
                (tokenExpire.value!.getTime() - new Date().getTime()) / 1000
            );
            if (error.value) {
                token.value = "";
                tokenExpire.value = null;
                return
            }
            if (leftSeconds < 30) {
                tokenExpire.value = new Date(`${data.value?.exp}`);
                authStateRefresh()
            }
        }
    }, 15 * 1000)
}

async function authStateRefresh() {
    const token = useToken();

    const conf = useRuntimeConfig();
    const tokenExpire = useTokenExpire();


    const { data: refreshData, error } = await useFetch<{
        exp: string;
        token: string;
    }>(`${conf.public.apiUrl}/auth/refresh`, {
        headers: {
            Authorization: `Bearer ${token.value}`,
        },
    });
    if (error.value) {
        console.log(
            "error",
            error.value.message,
            error.value.data
        );
        return;
    }
    tokenExpire.value = new Date(`${refreshData.value?.exp}`);
    token.value = refreshData.value?.token;

}