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

export const useServerVersion = () => ({
    data: useState<{
        latest: boolean;
        message: string;
    }>("serverVersion", () => {
        return {
            latest: true,
            message: "Unknown Status",
        };
    }),
    fetch: fetchServerVersion,
})

async function fetchServerVersion() {
    const serverVersion = useState<{
        latest: boolean;
        message: string;
    }>("serverVersion", () => {
        return {
            latest: true,
            message: "Unknown Status",
        };
    })
    const { data: accountData } = useAccountData()
    if(!accountData.value || !accountData.value.Admin) {
        serverVersion.value = {
            latest: true,
            message: "You are not an admin, cannot fetch server version.",
        };
        return
    }
    const token = useToken()
    const conf = useRuntimeConfig()
    if (token.value) {
        const {
            data,
            error,
        } = await useFetch<string>(`${conf.public.apiUrl}/versioncheck`, {
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
            retry: 5,
        });
        if (error.value && error.value.statusCode === 400) {
            serverVersion.value = {
                latest: false,
                message: error.value.data,
            };
            return
        }
        if (error.value) {
            serverVersion.value = {
                latest: false,
                message: `Error fetching server version: ${error.value.message}`,
            };
            return
        }
        serverVersion.value = {
            latest: true,
            message: data.value || "Unknown Version",
        }
    } else {
        serverVersion.value = {
            latest: true,
            message: "You are not logged in, cannot fetch server version.",
        };
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
        console.log("skipping check", "authCheckInterval", authCheckInterval, "process.server", process.server)
        return
    }

    authStateCheck()
    authCheckInterval = setInterval(async () => {
        authStateCheck()
    }, 15 * 1000)
}

async function authStateCheck() {
    const token = useToken();

    const conf = useRuntimeConfig();
    const tokenExpire = useTokenExpire();
    const route = useRoute()

    if (token.value) {
        const { data, error } = await useFetch<{
            exp: string;
            username: string;
        }>(`${conf.public.apiUrl}/auth/check`, {
            headers: {
                Authorization: `Bearer ${token.value}`,
            },
        });

        if (error.value) {
            if (error.value.statusCode && error.value.statusCode >= 400 && error.value.statusCode < 500) {
                token.value = "";
                tokenExpire.value = null;
                navigateTo("/login")
            }
            return
        }
        tokenExpire.value = new Date(`${data.value?.exp}`);
        let leftSeconds = tokenExpire.value == null ? 0 : Math.round(
            (tokenExpire.value!.getTime() - new Date().getTime()) / 1000
        );
        if (leftSeconds < 30) {
            authStateRefresh()
        }
    } else {
        if (route.fullPath.startsWith("/my")) {
            navigateTo("/login")
        }
    }
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